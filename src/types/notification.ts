// Notification System Types

// Notification types
export type NotificationType =
  | "target_assigned"
  | "target_updated"
  | "target_deadline"
  | "target_overdue"
  | "checkin_reminder"
  | "checkout_reminder"
  | "daily_report_reminder"
  | "new_message"
  | "chat_mention"
  | "attendance_marked"
  | "visit_completed"
  | "system_announcement"
  | "achievement_unlocked"
  | "route_assigned"
  | "approval_required"
  | "approval_granted"
  | "approval_rejected"
  | "document_shared"
  | "expense_approved"
  | "expense_rejected"
  | "leave_approved"
  | "leave_rejected";

// Notification priority
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// Notification status
export type NotificationStatus = "unread" | "read" | "archived" | "deleted";

// Notification action type
export type NotificationActionType = 
  | "navigate"
  | "open_dialog"
  | "external_link"
  | "dismiss"
  | "mark_complete";

// Notification action
export interface NotificationAction {
  type: NotificationActionType;
  label: string;
  url?: string;
  data?: Record<string, unknown>;
}

// Base notification interface
export interface Notification {
  id: string;
  companyId: string;
  userId: string; // Recipient
  
  // Content
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  
  // Metadata
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Actions
  actions?: NotificationAction[];
  clickAction?: string; // URL to navigate on click
  
  // Related entity
  relatedType?: "target" | "chat" | "user" | "report" | "attendance" | "route" | "document" | "expense" | "leave";
  relatedId?: string;
  relatedName?: string;
  
  // Sender info (for user-generated notifications)
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  
  // Push notification specific
  fcmMessageId?: string;
  pushSent?: boolean;
  pushSentAt?: string;
  pushError?: string;
  
  // Timestamps
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  expiresAt?: string;
}

// Create notification input
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  priority?: NotificationPriority;
  actions?: NotificationAction[];
  clickAction?: string;
  relatedType?: Notification["relatedType"];
  relatedId?: string;
  relatedName?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  expiresAt?: string;
  sendPush?: boolean;
}

// Bulk notification input (same notification to multiple users)
export interface BulkNotificationInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  priority?: NotificationPriority;
  actions?: NotificationAction[];
  clickAction?: string;
  relatedType?: Notification["relatedType"];
  relatedId?: string;
  relatedName?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  expiresAt?: string;
  sendPush?: boolean;
}

// FCM Token
export interface FCMToken {
  token: string;
  userId: string;
  companyId: string;
  deviceType: "web" | "android" | "ios";
  deviceId?: string;
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Notification preferences
export interface NotificationPreferences {
  userId: string;
  companyId: string;
  
  // Push notification settings
  pushEnabled: boolean;
  pushSound: boolean;
  pushVibrate: boolean;
  
  // Email notification settings
  emailEnabled: boolean;
  emailDigest: "none" | "daily" | "weekly";
  
  // In-app notification settings
  inAppEnabled: boolean;
  inAppSound: boolean;
  
  // Notification type preferences (which types to receive)
  typePreferences: {
    [K in NotificationType]?: {
      push: boolean;
      email: boolean;
      inApp: boolean;
    };
  };
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "07:00"
  
  // Timestamps
  updatedAt: string;
}

// Notification stats
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Notification filter
export interface NotificationFilter {
  status?: NotificationStatus;
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority | NotificationPriority[];
  startDate?: string;
  endDate?: string;
  relatedType?: Notification["relatedType"];
  relatedId?: string;
  senderId?: string;
}

// Push notification payload (for FCM)
export interface PushNotificationPayload {
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    click_action?: string;
    tag?: string;
  };
  data: {
    notificationId: string;
    type: NotificationType;
    clickAction?: string;
    relatedType?: string;
    relatedId?: string;
    [key: string]: string | undefined;
  };
  webpush?: {
    fcm_options?: {
      link?: string;
    };
    notification?: {
      icon?: string;
      badge?: string;
      vibrate?: number[];
      requireInteraction?: boolean;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    };
  };
}

// Notification type info (for UI display)
export const NOTIFICATION_TYPE_INFO: Record<
  NotificationType,
  { label: string; icon: string; color: string; defaultPriority: NotificationPriority }
> = {
  target_assigned: {
    label: "Target Assigned",
    icon: "assignment",
    color: "#2196f3",
    defaultPriority: "high",
  },
  target_updated: {
    label: "Target Updated",
    icon: "update",
    color: "#ff9800",
    defaultPriority: "normal",
  },
  target_deadline: {
    label: "Target Deadline",
    icon: "schedule",
    color: "#f44336",
    defaultPriority: "high",
  },
  target_overdue: {
    label: "Target Overdue",
    icon: "warning",
    color: "#d32f2f",
    defaultPriority: "urgent",
  },
  checkin_reminder: {
    label: "Check-in Reminder",
    icon: "login",
    color: "#4caf50",
    defaultPriority: "high",
  },
  checkout_reminder: {
    label: "Check-out Reminder",
    icon: "logout",
    color: "#ff5722",
    defaultPriority: "normal",
  },
  daily_report_reminder: {
    label: "Daily Report Reminder",
    icon: "description",
    color: "#9c27b0",
    defaultPriority: "high",
  },
  new_message: {
    label: "New Message",
    icon: "chat",
    color: "#00bcd4",
    defaultPriority: "normal",
  },
  chat_mention: {
    label: "You were mentioned",
    icon: "alternate_email",
    color: "#3f51b5",
    defaultPriority: "high",
  },
  attendance_marked: {
    label: "Attendance Marked",
    icon: "check_circle",
    color: "#4caf50",
    defaultPriority: "low",
  },
  visit_completed: {
    label: "Visit Completed",
    icon: "place",
    color: "#8bc34a",
    defaultPriority: "normal",
  },
  system_announcement: {
    label: "System Announcement",
    icon: "campaign",
    color: "#607d8b",
    defaultPriority: "normal",
  },
  achievement_unlocked: {
    label: "Achievement Unlocked",
    icon: "emoji_events",
    color: "#ffc107",
    defaultPriority: "normal",
  },
  route_assigned: {
    label: "Route Assigned",
    icon: "route",
    color: "#009688",
    defaultPriority: "high",
  },
  approval_required: {
    label: "Approval Required",
    icon: "pending_actions",
    color: "#ff9800",
    defaultPriority: "high",
  },
  approval_granted: {
    label: "Approval Granted",
    icon: "thumb_up",
    color: "#4caf50",
    defaultPriority: "normal",
  },
  approval_rejected: {
    label: "Approval Rejected",
    icon: "thumb_down",
    color: "#f44336",
    defaultPriority: "normal",
  },
  document_shared: {
    label: "Document Shared",
    icon: "folder_shared",
    color: "#673ab7",
    defaultPriority: "normal",
  },
  expense_approved: {
    label: "Expense Approved",
    icon: "check_circle",
    color: "#4caf50",
    defaultPriority: "normal",
  },
  expense_rejected: {
    label: "Expense Rejected",
    icon: "cancel",
    color: "#f44336",
    defaultPriority: "normal",
  },
  leave_approved: {
    label: "Leave Approved",
    icon: "event_available",
    color: "#4caf50",
    defaultPriority: "normal",
  },
  leave_rejected: {
    label: "Leave Rejected",
    icon: "event_busy",
    color: "#f44336",
    defaultPriority: "normal",
  },
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, "userId" | "companyId" | "updatedAt"> = {
  pushEnabled: true,
  pushSound: true,
  pushVibrate: true,
  emailEnabled: false,
  emailDigest: "none",
  inAppEnabled: true,
  inAppSound: true,
  typePreferences: {
    target_assigned: { push: true, email: true, inApp: true },
    target_updated: { push: false, email: false, inApp: true },
    target_deadline: { push: true, email: true, inApp: true },
    target_overdue: { push: true, email: true, inApp: true },
    checkin_reminder: { push: true, email: false, inApp: true },
    checkout_reminder: { push: true, email: false, inApp: true },
    daily_report_reminder: { push: true, email: false, inApp: true },
    new_message: { push: true, email: false, inApp: true },
    chat_mention: { push: true, email: false, inApp: true },
    attendance_marked: { push: false, email: false, inApp: true },
    visit_completed: { push: false, email: false, inApp: true },
    system_announcement: { push: true, email: true, inApp: true },
    achievement_unlocked: { push: true, email: false, inApp: true },
    route_assigned: { push: true, email: false, inApp: true },
    approval_required: { push: true, email: true, inApp: true },
    approval_granted: { push: true, email: false, inApp: true },
    approval_rejected: { push: true, email: false, inApp: true },
    document_shared: { push: true, email: false, inApp: true },
    expense_approved: { push: true, email: true, inApp: true },
    expense_rejected: { push: true, email: true, inApp: true },
    leave_approved: { push: true, email: true, inApp: true },
    leave_rejected: { push: true, email: true, inApp: true },
  },
  quietHoursEnabled: false,
};
