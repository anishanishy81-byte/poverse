// Notification System Library
import { db, realtimeDb } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { ref, set, get, update, push, onValue, off, query as rtdbQuery, orderByChild, equalTo, limitToLast } from "firebase/database";
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  CreateNotificationInput,
  BulkNotificationInput,
  FCMToken,
  NotificationPreferences,
  NotificationStats,
  NotificationFilter,
  PushNotificationPayload,
  NOTIFICATION_TYPE_INFO,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/types/notification";
import { isNativeApp } from "./platform";

// Firebase paths
const NOTIFICATIONS_PATH = "notifications";
const FCM_TOKENS_PATH = "fcmTokens";
const PREFERENCES_PATH = "notificationPreferences";

// Helper to remove undefined values
const removeUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const result = {} as T;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result[key] = removeUndefined(obj[key] as Record<string, unknown>) as T[typeof key];
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
};

// ==================== NOTIFICATIONS CRUD ====================

export const createNotification = async (
  companyId: string,
  input: CreateNotificationInput
): Promise<Notification> => {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const typeInfo = NOTIFICATION_TYPE_INFO[input.type];
  
  const notification: Notification = {
    id,
    companyId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    icon: input.icon || typeInfo.icon,
    image: input.image,
    priority: input.priority || typeInfo.defaultPriority,
    status: "unread",
    actions: input.actions,
    clickAction: input.clickAction,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    relatedName: input.relatedName,
    senderId: input.senderId,
    senderName: input.senderName,
    senderAvatar: input.senderAvatar,
    expiresAt: input.expiresAt,
    createdAt: now,
  };
  
  // Save to Firebase RTDB
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${input.userId}/${id}`);
  await set(notifRef, removeUndefined(notification as unknown as Record<string, unknown>));
  
  // Send push notification if requested
  if (input.sendPush !== false) {
    await sendPushNotification(companyId, input.userId, notification);
  }
  
  return notification;
};

export const createBulkNotifications = async (
  companyId: string,
  input: BulkNotificationInput
): Promise<Notification[]> => {
  const notifications: Notification[] = [];
  
  for (const userId of input.userIds) {
    const notification = await createNotification(companyId, {
      ...input,
      userId,
    });
    notifications.push(notification);
  }
  
  return notifications;
};

export const getNotifications = async (
  companyId: string,
  userId: string,
  filter?: NotificationFilter,
  maxResults: number = 50
): Promise<Notification[]> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(notifRef);
  
  if (!snapshot.exists()) return [];
  
  let notifications = Object.values(snapshot.val()) as Notification[];
  
  // Apply filters
  if (filter) {
    if (filter.status) {
      notifications = notifications.filter((n) => n.status === filter.status);
    }
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      notifications = notifications.filter((n) => types.includes(n.type));
    }
    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      notifications = notifications.filter((n) => priorities.includes(n.priority));
    }
    if (filter.startDate) {
      notifications = notifications.filter((n) => n.createdAt >= filter.startDate!);
    }
    if (filter.endDate) {
      notifications = notifications.filter((n) => n.createdAt <= filter.endDate!);
    }
    if (filter.relatedType) {
      notifications = notifications.filter((n) => n.relatedType === filter.relatedType);
    }
    if (filter.relatedId) {
      notifications = notifications.filter((n) => n.relatedId === filter.relatedId);
    }
    if (filter.senderId) {
      notifications = notifications.filter((n) => n.senderId === filter.senderId);
    }
  }
  
  // Sort by createdAt descending
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Limit results
  return notifications.slice(0, maxResults);
};

export const subscribeToNotifications = (
  companyId: string,
  userId: string,
  callback: (notifications: Notification[]) => void,
  filter?: NotificationFilter
): (() => void) => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  
  const unsubscribe = onValue(notifRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    let notifications = Object.values(snapshot.val()) as Notification[];
    
    // Apply filters
    if (filter) {
      if (filter.status) {
        notifications = notifications.filter((n) => n.status === filter.status);
      }
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        notifications = notifications.filter((n) => types.includes(n.type));
      }
    }
    
    // Sort by createdAt descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    callback(notifications);
  });
  
  return () => off(notifRef);
};

export const markAsRead = async (
  companyId: string,
  userId: string,
  notificationId: string
): Promise<void> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}/${notificationId}`);
  await update(notifRef, {
    status: "read",
    readAt: new Date().toISOString(),
  });
};

export const markAllAsRead = async (
  companyId: string,
  userId: string
): Promise<void> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(notifRef);
  
  if (!snapshot.exists()) return;
  
  const updates: Record<string, unknown> = {};
  const now = new Date().toISOString();
  
  Object.keys(snapshot.val()).forEach((id) => {
    const notif = snapshot.val()[id] as Notification;
    if (notif.status === "unread") {
      updates[`${id}/status`] = "read";
      updates[`${id}/readAt`] = now;
    }
  });
  
  if (Object.keys(updates).length > 0) {
    await update(notifRef, updates);
  }
};

export const archiveNotification = async (
  companyId: string,
  userId: string,
  notificationId: string
): Promise<void> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}/${notificationId}`);
  await update(notifRef, {
    status: "archived",
    archivedAt: new Date().toISOString(),
  });
};

export const deleteNotification = async (
  companyId: string,
  userId: string,
  notificationId: string
): Promise<void> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}/${notificationId}`);
  await set(notifRef, null);
};

export const clearAllNotifications = async (
  companyId: string,
  userId: string,
  status?: NotificationStatus
): Promise<void> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  
  if (!status) {
    // Clear all
    await set(notifRef, null);
    return;
  }
  
  // Clear only specific status
  const snapshot = await get(notifRef);
  if (!snapshot.exists()) return;
  
  const updates: Record<string, null> = {};
  Object.keys(snapshot.val()).forEach((id) => {
    const notif = snapshot.val()[id] as Notification;
    if (notif.status === status) {
      updates[id] = null;
    }
  });
  
  if (Object.keys(updates).length > 0) {
    await update(notifRef, updates);
  }
};

export const getNotificationStats = async (
  companyId: string,
  userId: string
): Promise<NotificationStats> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(notifRef);
  
  const stats: NotificationStats = {
    total: 0,
    unread: 0,
    read: 0,
    archived: 0,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as Record<NotificationPriority, number>,
  };
  
  if (!snapshot.exists()) return stats;
  
  const notifications = Object.values(snapshot.val()) as Notification[];
  
  notifications.forEach((notif) => {
    stats.total++;
    
    if (notif.status === "unread") stats.unread++;
    else if (notif.status === "read") stats.read++;
    else if (notif.status === "archived") stats.archived++;
    
    stats.byType[notif.type] = (stats.byType[notif.type] || 0) + 1;
    stats.byPriority[notif.priority] = (stats.byPriority[notif.priority] || 0) + 1;
  });
  
  return stats;
};

// ==================== FCM TOKENS ====================

export const saveFCMToken = async (
  companyId: string,
  userId: string,
  token: string,
  deviceType: FCMToken["deviceType"] = "web",
  deviceId?: string,
  deviceName?: string
): Promise<void> => {
  const tokenId = `token_${Date.now()}`;
  const now = new Date().toISOString();
  
  const fcmToken: FCMToken = {
    token,
    userId,
    companyId,
    deviceType,
    deviceId,
    deviceName,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
  
  // Check if token already exists
  const tokensRef = ref(realtimeDb, `${FCM_TOKENS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(tokensRef);
  
  if (snapshot.exists()) {
    const existingTokens = Object.entries(snapshot.val()) as [string, FCMToken][];
    const existing = existingTokens.find(([, t]) => t.token === token);
    
    if (existing) {
      // Update existing token
      await update(ref(realtimeDb, `${FCM_TOKENS_PATH}/${companyId}/${userId}/${existing[0]}`), {
        updatedAt: now,
        isActive: true,
      });
      return;
    }
  }
  
  // Save new token
  const tokenRef = ref(realtimeDb, `${FCM_TOKENS_PATH}/${companyId}/${userId}/${tokenId}`);
  await set(tokenRef, removeUndefined(fcmToken as unknown as Record<string, unknown>));
};

export const removeFCMToken = async (
  companyId: string,
  userId: string,
  token: string
): Promise<void> => {
  const tokensRef = ref(realtimeDb, `${FCM_TOKENS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(tokensRef);
  
  if (!snapshot.exists()) return;
  
  const tokens = Object.entries(snapshot.val()) as [string, FCMToken][];
  const existing = tokens.find(([, t]) => t.token === token);
  
  if (existing) {
    await update(ref(realtimeDb, `${FCM_TOKENS_PATH}/${companyId}/${userId}/${existing[0]}`), {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  }
};

export const getUserFCMTokens = async (
  companyId: string,
  userId: string
): Promise<FCMToken[]> => {
  const tokensRef = ref(realtimeDb, `${FCM_TOKENS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(tokensRef);
  
  if (!snapshot.exists()) return [];
  
  return Object.values(snapshot.val()).filter((t: any) => t.isActive) as FCMToken[];
};

// ==================== NOTIFICATION PREFERENCES ====================

export const getNotificationPreferences = async (
  companyId: string,
  userId: string
): Promise<NotificationPreferences> => {
  const prefRef = ref(realtimeDb, `${PREFERENCES_PATH}/${companyId}/${userId}`);
  const snapshot = await get(prefRef);
  
  if (!snapshot.exists()) {
    // Return default preferences
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      userId,
      companyId,
      updatedAt: new Date().toISOString(),
    };
  }
  
  return snapshot.val() as NotificationPreferences;
};

export const updateNotificationPreferences = async (
  companyId: string,
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<void> => {
  const prefRef = ref(realtimeDb, `${PREFERENCES_PATH}/${companyId}/${userId}`);
  const snapshot = await get(prefRef);
  
  const currentPrefs = snapshot.exists()
    ? snapshot.val()
    : { ...DEFAULT_NOTIFICATION_PREFERENCES, userId, companyId };
  
  await set(prefRef, removeUndefined({
    ...currentPrefs,
    ...updates,
    updatedAt: new Date().toISOString(),
  } as unknown as Record<string, unknown>));
};

// ==================== PUSH NOTIFICATIONS ====================

export const sendPushNotification = async (
  companyId: string,
  userId: string,
  notification: Notification
): Promise<boolean> => {
  try {
    // Check user preferences
    const prefs = await getNotificationPreferences(companyId, userId);
    
    if (!prefs.pushEnabled) return false;
    
    const typePrefs = prefs.typePreferences[notification.type];
    if (typePrefs && !typePrefs.push) return false;
    
    // Check quiet hours
    if (prefs.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const isInQuietHours = prefs.quietHoursStart <= prefs.quietHoursEnd
        ? currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd
        : currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd;
      
      if (isInQuietHours) return false;
    }
    
    // Get user's FCM tokens
    const tokens = await getUserFCMTokens(companyId, userId);
    if (tokens.length === 0) return false;
    
    // Prepare push payload
    const payload: PushNotificationPayload = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/icons/icon-192x192.png",
        image: notification.image,
        click_action: notification.clickAction,
        tag: notification.id,
      },
      data: {
        notificationId: notification.id,
        type: notification.type,
        clickAction: notification.clickAction,
        relatedType: notification.relatedType,
        relatedId: notification.relatedId,
      },
      webpush: {
        fcm_options: {
          link: notification.clickAction,
        },
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
          vibrate: prefs.pushVibrate ? [200, 100, 200] : undefined,
          requireInteraction: notification.priority === "high" || notification.priority === "urgent",
        },
      },
    };

    // Push via API route is unavailable in static Android builds/native app
    if (isNativeApp() || process.env.NEXT_PUBLIC_BUILD_TARGET === "android") {
      return false;
    }
    
    // Send to FCM via API route
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: tokens.map((t) => t.token),
        payload,
      }),
    });
    
    if (!response.ok) {
      console.error("Failed to send push notification:", await response.text());
      return false;
    }
    
    // Update notification with push status
    const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}/${notification.id}`);
    await update(notifRef, {
      pushSent: true,
      pushSentAt: new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    
    // Update notification with error
    const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}/${notification.id}`);
    await update(notifRef, {
      pushSent: false,
      pushError: String(error),
    });
    
    return false;
  }
};

// ==================== NOTIFICATION TRIGGERS ====================

// Target assignment notification
export const notifyTargetAssigned = async (
  companyId: string,
  userId: string,
  userName: string,
  targetName: string,
  targetId: string,
  assignedBy: string,
  assignedByName: string,
  deadline?: string
): Promise<Notification> => {
  const deadlineText = deadline
    ? ` - Due by ${new Date(deadline).toLocaleDateString()}`
    : "";
  
  return createNotification(companyId, {
    userId,
    type: "target_assigned",
    title: "New Target Assigned",
    body: `${assignedByName} assigned you a new target: ${targetName}${deadlineText}`,
    priority: deadline ? "high" : "normal",
    clickAction: `/targets?id=${targetId}`,
    relatedType: "target",
    relatedId: targetId,
    relatedName: targetName,
    senderId: assignedBy,
    senderName: assignedByName,
  });
};

// Target deadline notification
export const notifyTargetDeadline = async (
  companyId: string,
  userId: string,
  targetName: string,
  targetId: string,
  deadline: string,
  hoursRemaining: number
): Promise<Notification> => {
  const urgency = hoursRemaining <= 2 ? "urgent" : hoursRemaining <= 24 ? "high" : "normal";
  const timeText = hoursRemaining <= 1
    ? "less than an hour"
    : hoursRemaining <= 24
    ? `${Math.round(hoursRemaining)} hours`
    : `${Math.round(hoursRemaining / 24)} days`;
  
  return createNotification(companyId, {
    userId,
    type: "target_deadline",
    title: "Target Deadline Approaching",
    body: `Target "${targetName}" is due in ${timeText}`,
    priority: urgency,
    clickAction: `/targets?id=${targetId}`,
    relatedType: "target",
    relatedId: targetId,
    relatedName: targetName,
  });
};

// Target overdue notification
export const notifyTargetOverdue = async (
  companyId: string,
  userId: string,
  targetName: string,
  targetId: string
): Promise<Notification> => {
  return createNotification(companyId, {
    userId,
    type: "target_overdue",
    title: "Target Overdue!",
    body: `Target "${targetName}" has passed its deadline`,
    priority: "urgent",
    clickAction: `/targets?id=${targetId}`,
    relatedType: "target",
    relatedId: targetId,
    relatedName: targetName,
  });
};

// Check-in reminder
export const notifyCheckinReminder = async (
  companyId: string,
  userId: string,
  userName: string
): Promise<Notification> => {
  return createNotification(companyId, {
    userId,
    type: "checkin_reminder",
    title: "Check-in Reminder",
    body: `Good morning ${userName}! Don't forget to check in for today.`,
    priority: "high",
    clickAction: "/dashboard",
  });
};

// Check-out reminder
export const notifyCheckoutReminder = async (
  companyId: string,
  userId: string,
  userName: string
): Promise<Notification> => {
  return createNotification(companyId, {
    userId,
    type: "checkout_reminder",
    title: "Check-out Reminder",
    body: `Hi ${userName}! It's time to check out and complete your day.`,
    priority: "normal",
    clickAction: "/dashboard",
  });
};

// Daily report reminder
export const notifyDailyReportReminder = async (
  companyId: string,
  userId: string,
  userName: string,
  visitsToday: number
): Promise<Notification> => {
  return createNotification(companyId, {
    userId,
    type: "daily_report_reminder",
    title: "Daily Report Reminder",
    body: `Hi ${userName}! You had ${visitsToday} visits today. Please submit your daily report.`,
    priority: "high",
    clickAction: "/reports",
  });
};

// New message notification
export const notifyNewMessage = async (
  companyId: string,
  userId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  messagePreview: string,
  chatId: string,
  chatName?: string
): Promise<Notification> => {
  const preview = messagePreview.length > 50
    ? messagePreview.substring(0, 47) + "..."
    : messagePreview;
  
  return createNotification(companyId, {
    userId,
    type: "new_message",
    title: chatName ? `${senderName} in ${chatName}` : senderName,
    body: preview,
    priority: "normal",
    clickAction: `/chat?id=${chatId}`,
    relatedType: "chat",
    relatedId: chatId,
    relatedName: chatName || senderName,
    senderId,
    senderName,
    senderAvatar,
  });
};

// Chat mention notification
export const notifyChatMention = async (
  companyId: string,
  userId: string,
  senderId: string,
  senderName: string,
  messagePreview: string,
  chatId: string,
  chatName?: string
): Promise<Notification> => {
  return createNotification(companyId, {
    userId,
    type: "chat_mention",
    title: "You were mentioned",
    body: `${senderName} mentioned you: "${messagePreview}"`,
    priority: "high",
    clickAction: `/chat?id=${chatId}`,
    relatedType: "chat",
    relatedId: chatId,
    relatedName: chatName || senderName,
    senderId,
    senderName,
  });
};

// Visit completed notification (for admins)
export const notifyVisitCompleted = async (
  companyId: string,
  adminUserId: string,
  agentName: string,
  agentId: string,
  targetName: string,
  targetId: string,
  outcome: string
): Promise<Notification> => {
  return createNotification(companyId, {
    userId: adminUserId,
    type: "visit_completed",
    title: "Visit Completed",
    body: `${agentName} completed a visit to ${targetName}. Outcome: ${outcome}`,
    priority: "normal",
    clickAction: `/admin?tab=activity`,
    relatedType: "target",
    relatedId: targetId,
    relatedName: targetName,
    senderId: agentId,
    senderName: agentName,
  });
};

// Route assigned notification
export const notifyRouteAssigned = async (
  companyId: string,
  userId: string,
  routeName: string,
  routeId: string,
  totalStops: number,
  assignedBy: string,
  assignedByName: string
): Promise<Notification> => {
  return createNotification(companyId, {
    userId,
    type: "route_assigned",
    title: "New Route Assigned",
    body: `${assignedByName} assigned you a route: ${routeName} (${totalStops} stops)`,
    priority: "high",
    clickAction: `/routes?id=${routeId}`,
    relatedType: "route",
    relatedId: routeId,
    relatedName: routeName,
    senderId: assignedBy,
    senderName: assignedByName,
  });
};

// System announcement
export const notifySystemAnnouncement = async (
  companyId: string,
  userIds: string[],
  title: string,
  message: string,
  clickAction?: string
): Promise<Notification[]> => {
  return createBulkNotifications(companyId, {
    userIds,
    type: "system_announcement",
    title,
    body: message,
    priority: "normal",
    clickAction,
  });
};

// ==================== SCHEDULED NOTIFICATIONS ====================

// This would typically be called by a Cloud Function
export const processScheduledReminders = async (companyId: string): Promise<void> => {
  // Get all users in company
  const usersRef = collection(db, "users");
  const usersQuery = query(usersRef, where("companyId", "==", companyId));
  const usersSnapshot = await getDocs(usersQuery);
  
  const now = new Date();
  const currentHour = now.getHours();
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    // Get user preferences
    const prefs = await getNotificationPreferences(companyId, userId);
    
    // Check-in reminder (typically 8-9 AM)
    if (currentHour === 8) {
      const typePrefs = prefs.typePreferences.checkin_reminder;
      if (!typePrefs || typePrefs.inApp || typePrefs.push) {
        await notifyCheckinReminder(companyId, userId, userData.name);
      }
    }
    
    // Check-out reminder (typically 5-6 PM)
    if (currentHour === 17) {
      const typePrefs = prefs.typePreferences.checkout_reminder;
      if (!typePrefs || typePrefs.inApp || typePrefs.push) {
        await notifyCheckoutReminder(companyId, userId, userData.name);
      }
    }
    
    // Daily report reminder (typically 6-7 PM)
    if (currentHour === 18) {
      const typePrefs = prefs.typePreferences.daily_report_reminder;
      if (!typePrefs || typePrefs.inApp || typePrefs.push) {
        // Get today's visits count (current + legacy paths)
        const today = now.toISOString().split("T")[0];
        const visitsQuery = rtdbQuery(
          ref(realtimeDb, "targetVisits"),
          orderByChild("userId"),
          equalTo(userId)
        );
        const visitsSnapshot = await get(visitsQuery);
        const visitsList = visitsSnapshot.exists()
          ? (Object.values(visitsSnapshot.val()) as any[])
          : [];

        const legacyRef = ref(realtimeDb, `targetVisits/${companyId}/${userId}`);
        const legacySnapshot = await get(legacyRef);
        const legacyVisits = legacySnapshot.exists()
          ? (Object.values(legacySnapshot.val()) as any[])
          : [];

        const isVisitOnDate = (visit: any) => {
          const dates = [visit.createdAt, visit.assignedAt, visit.completedAt, visit.skippedAt];
          return dates.some((ts) => typeof ts === "string" && ts.startsWith(today));
        };

        const visitsToday = [...visitsList, ...legacyVisits].filter(
          (v) => v?.companyId === companyId && isVisitOnDate(v)
        ).length;
        
        if (visitsToday > 0) {
          await notifyDailyReportReminder(companyId, userId, userData.name, visitsToday);
        }
      }
    }
  }
};

// Process deadline notifications
export const processDeadlineNotifications = async (companyId: string): Promise<void> => {
  const now = new Date();
  
  // Get all admin targets with deadlines
  const targetsRef = ref(realtimeDb, `adminTargets/${companyId}`);
  const snapshot = await get(targetsRef);
  
  if (!snapshot.exists()) return;
  
  const targets = Object.values(snapshot.val()) as any[];
  
  for (const target of targets) {
    if (!target.assignedTo || !target.deadline || !target.isActive) continue;
    
    const deadline = new Date(target.deadline);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Already overdue
    if (hoursRemaining < 0 && hoursRemaining > -24) {
      // Only send once (check if notification already sent today)
      await notifyTargetOverdue(companyId, target.assignedTo, target.name, target.id);
    }
    // Due within 24 hours
    else if (hoursRemaining > 0 && hoursRemaining <= 24) {
      await notifyTargetDeadline(companyId, target.assignedTo, target.name, target.id, target.deadline, hoursRemaining);
    }
    // Due within 2 hours
    else if (hoursRemaining > 0 && hoursRemaining <= 2) {
      await notifyTargetDeadline(companyId, target.assignedTo, target.name, target.id, target.deadline, hoursRemaining);
    }
  }
};

// Get unread count for badge
export const getUnreadCount = async (
  companyId: string,
  userId: string
): Promise<number> => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(notifRef);
  
  if (!snapshot.exists()) return 0;
  
  const notifications = Object.values(snapshot.val()) as Notification[];
  return notifications.filter((n) => n.status === "unread").length;
};

// Subscribe to unread count
export const subscribeToUnreadCount = (
  companyId: string,
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const notifRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${companyId}/${userId}`);
  
  const unsubscribe = onValue(notifRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(0);
      return;
    }
    
    const notifications = Object.values(snapshot.val()) as Notification[];
    const unreadCount = notifications.filter((n) => n.status === "unread").length;
    callback(unreadCount);
  });
  
  return () => off(notifRef);
};
