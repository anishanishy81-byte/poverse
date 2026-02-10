// Dashboard Library - Functions for Agent Dashboard
import { realtimeDb } from "./firebase";
import {
  ref,
  get,
  set,
  push,
  update,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
} from "firebase/database";
import { TargetVisit } from "@/types/target";
import { AttendanceRecord } from "@/types/attendance";
import {
  AgentGoals,
  AgentProgress,
  Notification,
  NotificationType,
  Incentive,
  IncentiveType,
  EarningsSummary,
  ScheduledTask,
  DashboardStats,
  ActivityLogEntry,
} from "@/types/dashboard";

// Firebase paths
const AGENT_GOALS_PATH = "agentGoals";
const NOTIFICATIONS_PATH = "notifications";
const INCENTIVES_PATH = "incentives";
const SCHEDULED_TASKS_PATH = "scheduledTasks";
const ACTIVITY_LOG_PATH = "activityLog";

// ==================== AGENT GOALS ====================

// Default goals if none are set
export const DEFAULT_AGENT_GOALS: Omit<AgentGoals, "userId" | "companyId" | "updatedAt" | "setBy"> = {
  daily: {
    targetVisits: 5,
    conversions: 1,
    workHours: 8,
    newLeads: 3,
  },
  weekly: {
    targetVisits: 25,
    conversions: 5,
    newLeads: 15,
  },
  monthly: {
    targetVisits: 100,
    conversions: 20,
    newLeads: 60,
  },
};

export const getAgentGoals = async (userId: string): Promise<AgentGoals | null> => {
  const goalsRef = ref(realtimeDb, `${AGENT_GOALS_PATH}/${userId}`);
  const snapshot = await get(goalsRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const setAgentGoals = async (
  userId: string,
  companyId: string,
  goals: Partial<AgentGoals>,
  setBy: string
): Promise<void> => {
  const goalsRef = ref(realtimeDb, `${AGENT_GOALS_PATH}/${userId}`);
  const now = new Date().toISOString();
  
  const fullGoals: AgentGoals = {
    userId,
    companyId,
    daily: goals.daily || DEFAULT_AGENT_GOALS.daily,
    weekly: goals.weekly || DEFAULT_AGENT_GOALS.weekly,
    monthly: goals.monthly || DEFAULT_AGENT_GOALS.monthly,
    updatedAt: now,
    setBy,
  };
  
  await set(goalsRef, fullGoals);
};

export const subscribeToAgentGoals = (
  userId: string,
  callback: (goals: AgentGoals | null) => void
): (() => void) => {
  const goalsRef = ref(realtimeDb, `${AGENT_GOALS_PATH}/${userId}`);
  
  const unsubscribe = onValue(goalsRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  
  return () => unsubscribe();
};

// ==================== PROGRESS CALCULATION ====================

export const calculateAgentProgress = (
  visits: TargetVisit[],
  attendance: AttendanceRecord | null,
  goals: AgentGoals | null
): AgentProgress => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const startOfWeek = getStartOfWeek(now);
  
  // Filter visits for today and this week
  const todayVisits = visits.filter((v) => v.assignedAt?.startsWith(today));
  const weekVisits = visits.filter((v) => {
    const visitDate = new Date(v.assignedAt);
    return visitDate >= startOfWeek && visitDate <= now;
  });
  
  // Calculate daily stats
  const todayCompleted = todayVisits.filter((v) => v.status === "completed").length;
  const todayConversions = todayVisits.filter((v) => v.leadStatus === "converted").length;
  const todayNewLeads = todayVisits.filter((v) => v.leadStatus === "new" || v.leadStatus === "contacted").length;
  const hoursWorked = attendance?.workDurationMinutes ? attendance.workDurationMinutes / 60 : 0;
  
  // Calculate weekly stats
  const weekCompleted = weekVisits.filter((v) => v.status === "completed").length;
  const weekConversions = weekVisits.filter((v) => v.leadStatus === "converted").length;
  const weekNewLeads = weekVisits.filter((v) => v.leadStatus === "new" || v.leadStatus === "contacted").length;
  
  // Get targets from goals or defaults
  const dailyTargets = goals?.daily || DEFAULT_AGENT_GOALS.daily;
  const weeklyTargets = goals?.weekly || DEFAULT_AGENT_GOALS.weekly;
  
  // Calculate completion rates
  const dailyCompletion = calculateCompletionRate([
    { completed: todayCompleted, target: dailyTargets.targetVisits },
    { completed: todayConversions, target: dailyTargets.conversions },
    { completed: hoursWorked, target: dailyTargets.workHours },
    { completed: todayNewLeads, target: dailyTargets.newLeads },
  ]);
  
  const weeklyCompletion = calculateCompletionRate([
    { completed: weekCompleted, target: weeklyTargets.targetVisits },
    { completed: weekConversions, target: weeklyTargets.conversions },
    { completed: weekNewLeads, target: weeklyTargets.newLeads },
  ]);
  
  return {
    userId: attendance?.userId || "",
    date: today,
    daily: {
      visitsCompleted: todayCompleted,
      visitsTarget: dailyTargets.targetVisits,
      conversions: todayConversions,
      conversionsTarget: dailyTargets.conversions,
      hoursWorked: Math.round(hoursWorked * 10) / 10,
      hoursTarget: dailyTargets.workHours,
      newLeads: todayNewLeads,
      newLeadsTarget: dailyTargets.newLeads,
      completionRate: dailyCompletion,
    },
    weekly: {
      visitsCompleted: weekCompleted,
      visitsTarget: weeklyTargets.targetVisits,
      conversions: weekConversions,
      conversionsTarget: weeklyTargets.conversions,
      newLeads: weekNewLeads,
      newLeadsTarget: weeklyTargets.newLeads,
      completionRate: weeklyCompletion,
    },
    streak: {
      currentDays: 0, // Would need historical data to calculate
      longestDays: 0,
    },
  };
};

const calculateCompletionRate = (
  items: { completed: number; target: number }[]
): number => {
  if (items.length === 0) return 0;
  
  const totalCompletion = items.reduce((sum, item) => {
    if (item.target === 0) return sum + 100;
    return sum + Math.min(100, (item.completed / item.target) * 100);
  }, 0);
  
  return Math.round(totalCompletion / items.length);
};

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ==================== NOTIFICATIONS ====================

export const createNotification = async (
  userId: string,
  companyId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    data?: Record<string, unknown>;
    actionUrl?: string;
    priority?: "low" | "medium" | "high";
    expiresAt?: string;
  }
): Promise<string> => {
  const notificationsRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${userId}`);
  const newNotificationRef = push(notificationsRef);
  const notificationId = newNotificationRef.key!;
  const now = new Date().toISOString();
  
  const notification: Notification = {
    id: notificationId,
    userId,
    companyId,
    type,
    title,
    message,
    isRead: false,
    createdAt: now,
    priority: options?.priority || "medium",
    ...(options?.data && { data: options.data }),
    ...(options?.actionUrl && { actionUrl: options.actionUrl }),
    ...(options?.expiresAt && { expiresAt: options.expiresAt }),
  };
  
  await set(newNotificationRef, notification);
  return notificationId;
};

export const getUserNotifications = async (
  userId: string,
  limit: number = 50
): Promise<Notification[]> => {
  const notificationsRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${userId}`);
  const snapshot = await get(notificationsRef);
  
  if (!snapshot.exists()) return [];
  
  const notifications: Notification[] = [];
  snapshot.forEach((child) => {
    notifications.push(child.val());
  });
  
  return notifications
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  const notificationsRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${userId}`);
  
  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const notifications: Notification[] = [];
    snapshot.forEach((child) => {
      notifications.push(child.val());
    });
    
    callback(
      notifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  });
  
  return () => unsubscribe();
};

export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  const notificationRef = ref(
    realtimeDb,
    `${NOTIFICATIONS_PATH}/${userId}/${notificationId}`
  );
  await update(notificationRef, { isRead: true });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const notificationsRef = ref(realtimeDb, `${NOTIFICATIONS_PATH}/${userId}`);
  const snapshot = await get(notificationsRef);
  
  if (!snapshot.exists()) return;
  
  const updates: Record<string, boolean> = {};
  snapshot.forEach((child) => {
    updates[`${child.key}/isRead`] = true;
  });
  
  await update(notificationsRef, updates);
};

export const deleteNotification = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  const notificationRef = ref(
    realtimeDb,
    `${NOTIFICATIONS_PATH}/${userId}/${notificationId}`
  );
  await set(notificationRef, null);
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const notifications = await getUserNotifications(userId);
  return notifications.filter((n) => !n.isRead).length;
};

// ==================== INCENTIVES & EARNINGS ====================

export const addIncentive = async (
  userId: string,
  companyId: string,
  type: IncentiveType,
  name: string,
  amount: number,
  currency: string = "INR",
  options?: {
    description?: string;
    relatedTarget?: string;
  }
): Promise<string> => {
  const incentivesRef = ref(realtimeDb, `${INCENTIVES_PATH}/${userId}`);
  const newIncentiveRef = push(incentivesRef);
  const incentiveId = newIncentiveRef.key!;
  const now = new Date().toISOString();
  
  const incentive: Incentive = {
    id: incentiveId,
    userId,
    companyId,
    type,
    name,
    description: options?.description || "",
    amount,
    currency,
    earnedAt: now,
    status: "pending",
    ...(options?.relatedTarget && { relatedTarget: options.relatedTarget }),
  };
  
  await set(newIncentiveRef, incentive);
  return incentiveId;
};

export const getUserIncentives = async (
  userId: string,
  status?: Incentive["status"]
): Promise<Incentive[]> => {
  const incentivesRef = ref(realtimeDb, `${INCENTIVES_PATH}/${userId}`);
  const snapshot = await get(incentivesRef);
  
  if (!snapshot.exists()) return [];
  
  const incentives: Incentive[] = [];
  snapshot.forEach((child) => {
    const incentive = child.val() as Incentive;
    if (!status || incentive.status === status) {
      incentives.push(incentive);
    }
  });
  
  return incentives.sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
  );
};

export const subscribeToIncentives = (
  userId: string,
  callback: (incentives: Incentive[]) => void
): (() => void) => {
  const incentivesRef = ref(realtimeDb, `${INCENTIVES_PATH}/${userId}`);
  
  const unsubscribe = onValue(incentivesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const incentives: Incentive[] = [];
    snapshot.forEach((child) => {
      incentives.push(child.val());
    });
    
    callback(
      incentives.sort(
        (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
      )
    );
  });
  
  return () => unsubscribe();
};

export const calculateEarningsSummary = (
  incentives: Incentive[],
  period: "daily" | "weekly" | "monthly"
): EarningsSummary => {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case "daily":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      startDate = getStartOfWeek(now);
      break;
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  
  const filteredIncentives = incentives.filter((i) => {
    const earnedDate = new Date(i.earnedAt);
    return earnedDate >= startDate && earnedDate <= now;
  });
  
  const totalEarnings = filteredIncentives.reduce((sum, i) => sum + i.amount, 0);
  const pendingEarnings = filteredIncentives
    .filter((i) => i.status === "pending" || i.status === "approved")
    .reduce((sum, i) => sum + i.amount, 0);
  const paidEarnings = filteredIncentives
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  
  // Group by type
  const byTypeMap = new Map<IncentiveType, { count: number; total: number }>();
  filteredIncentives.forEach((i) => {
    const existing = byTypeMap.get(i.type) || { count: 0, total: 0 };
    byTypeMap.set(i.type, {
      count: existing.count + 1,
      total: existing.total + i.amount,
    });
  });
  
  const byType = Array.from(byTypeMap.entries()).map(([type, data]) => ({
    type,
    ...data,
  }));
  
  return {
    userId: incentives[0]?.userId || "",
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    totalEarnings,
    pendingEarnings,
    paidEarnings,
    byType,
    currency: incentives[0]?.currency || "INR",
  };
};

// ==================== SCHEDULED TASKS ====================

export const createScheduledTask = async (
  task: Omit<ScheduledTask, "id" | "assignedAt">
): Promise<string> => {
  const tasksRef = ref(realtimeDb, `${SCHEDULED_TASKS_PATH}/${task.userId}`);
  const newTaskRef = push(tasksRef);
  const taskId = newTaskRef.key!;
  const now = new Date().toISOString();
  
  const fullTask: ScheduledTask = {
    ...task,
    id: taskId,
    assignedAt: now,
  };
  
  await set(newTaskRef, fullTask);
  return taskId;
};

export const getUserScheduledTasks = async (
  userId: string,
  date?: string
): Promise<ScheduledTask[]> => {
  const tasksRef = ref(realtimeDb, `${SCHEDULED_TASKS_PATH}/${userId}`);
  const snapshot = await get(tasksRef);
  
  if (!snapshot.exists()) return [];
  
  const tasks: ScheduledTask[] = [];
  snapshot.forEach((child) => {
    const task = child.val() as ScheduledTask;
    if (!date || task.scheduledDate === date) {
      tasks.push(task);
    }
  });
  
  return tasks.sort((a, b) => {
    // Sort by time, then priority
    if (a.scheduledTime && b.scheduledTime) {
      return a.scheduledTime.localeCompare(b.scheduledTime);
    }
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export const subscribeToScheduledTasks = (
  userId: string,
  date: string,
  callback: (tasks: ScheduledTask[]) => void
): (() => void) => {
  const tasksRef = ref(realtimeDb, `${SCHEDULED_TASKS_PATH}/${userId}`);
  
  const unsubscribe = onValue(tasksRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const tasks: ScheduledTask[] = [];
    snapshot.forEach((child) => {
      const task = child.val() as ScheduledTask;
      if (task.scheduledDate === date) {
        tasks.push(task);
      }
    });
    
    callback(
      tasks.sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
    );
  });
  
  return () => unsubscribe();
};

export const updateScheduledTaskStatus = async (
  userId: string,
  taskId: string,
  status: ScheduledTask["status"]
): Promise<void> => {
  const taskRef = ref(
    realtimeDb,
    `${SCHEDULED_TASKS_PATH}/${userId}/${taskId}`
  );
  
  const updates: Record<string, unknown> = { status };
  if (status === "completed") {
    updates.completedAt = new Date().toISOString();
  }
  
  await update(taskRef, updates);
};

// ==================== ACTIVITY LOG ====================

export const logActivity = async (
  userId: string,
  type: ActivityLogEntry["type"],
  title: string,
  options?: {
    description?: string;
    location?: ActivityLogEntry["location"];
    metadata?: Record<string, unknown>;
  }
): Promise<string> => {
  const today = new Date().toISOString().split("T")[0];
  const logRef = ref(realtimeDb, `${ACTIVITY_LOG_PATH}/${userId}/${today}`);
  const newLogRef = push(logRef);
  const logId = newLogRef.key!;
  const now = new Date().toISOString();
  
  const entry: ActivityLogEntry = {
    id: logId,
    userId,
    type,
    title,
    timestamp: now,
    ...(options?.description && { description: options.description }),
    ...(options?.location && { location: options.location }),
    ...(options?.metadata && { metadata: options.metadata }),
  };
  
  await set(newLogRef, entry);
  return logId;
};

export const getTodayActivityLog = async (
  userId: string
): Promise<ActivityLogEntry[]> => {
  const today = new Date().toISOString().split("T")[0];
  const logRef = ref(realtimeDb, `${ACTIVITY_LOG_PATH}/${userId}/${today}`);
  const snapshot = await get(logRef);
  
  if (!snapshot.exists()) return [];
  
  const entries: ActivityLogEntry[] = [];
  snapshot.forEach((child) => {
    entries.push(child.val());
  });
  
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

export const subscribeToActivityLog = (
  userId: string,
  callback: (entries: ActivityLogEntry[]) => void
): (() => void) => {
  const today = new Date().toISOString().split("T")[0];
  const logRef = ref(realtimeDb, `${ACTIVITY_LOG_PATH}/${userId}/${today}`);
  
  const unsubscribe = onValue(logRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const entries: ActivityLogEntry[] = [];
    snapshot.forEach((child) => {
      entries.push(child.val());
    });
    
    callback(
      entries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  });
  
  return () => unsubscribe();
};

// ==================== DASHBOARD STATS ====================

export const calculateDashboardStats = (
  activeVisits: TargetVisit[],
  attendance: AttendanceRecord | null,
  locationHistory: Array<{ timestamp: string; latitude: number; longitude: number }>,
  allVisits?: TargetVisit[]
): DashboardStats => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const startOfWeek = getStartOfWeek(now);
  
  // Use allVisits for historical data (includes completed visits)
  const visitsToUse = allVisits && allVisits.length > 0 ? allVisits : activeVisits;
  
  // Filter for today - use allVisits to include completed visits
  const todayVisits = visitsToUse.filter((v) => v.assignedAt?.startsWith(today));
  const todayCompleted = todayVisits.filter((v) => v.status === "completed");
  const todayConversions = todayVisits.filter((v) => v.leadStatus === "converted");
  const todayNewLeads = todayVisits.filter(
    (v) => v.leadStatus === "new" || v.leadStatus === "contacted"
  );
  
  // Filter for this week
  const weekVisits = visitsToUse.filter((v) => {
    const visitDate = new Date(v.assignedAt);
    return visitDate >= startOfWeek && visitDate <= now;
  });
  const weekCompleted = weekVisits.filter((v) => v.status === "completed");
  const weekConversions = weekVisits.filter((v) => v.leadStatus === "converted");
  const weekNewLeads = weekVisits.filter(
    (v) => v.leadStatus === "new" || v.leadStatus === "contacted"
  );
  
  // Calculate distance traveled (simplified)
  let totalDistance = 0;
  if (locationHistory.length > 1) {
    for (let i = 1; i < locationHistory.length; i++) {
      const prev = locationHistory[i - 1];
      const curr = locationHistory[i];
      totalDistance += calculateHaversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }
  }
  
  // Hours worked
  const hoursWorked = attendance?.workDurationMinutes
    ? Math.round((attendance.workDurationMinutes / 60) * 10) / 10
    : 0;
  
  // Calculate average time per visit
  const completedWithDuration = todayCompleted.filter((v) => v.durationMinutes);
  const avgTimePerVisit =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((sum, v) => sum + (v.durationMinutes || 0), 0) /
            completedWithDuration.length
        )
      : 0;
  
  // Days since start of week for average calculation
  const daysInWeek = Math.min(
    7,
    Math.ceil((now.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24))
  );
  
  return {
    today: {
      visitsCompleted: todayCompleted.length,
      visitsTotal: todayVisits.length,
      leadsGenerated: todayNewLeads.length,
      conversions: todayConversions.length,
      hoursWorked,
      distanceTraveled: Math.round(totalDistance * 10) / 10,
      locationsVisited: new Set(todayVisits.map((v) => v.targetId)).size,
    },
    thisWeek: {
      visitsCompleted: weekCompleted.length,
      visitsTotal: weekVisits.length,
      leadsGenerated: weekNewLeads.length,
      conversions: weekConversions.length,
      hoursWorked: 0, // Would need historical attendance data
      avgVisitsPerDay:
        daysInWeek > 0 ? Math.round((weekCompleted.length / daysInWeek) * 10) / 10 : 0,
    },
    performance: {
      completionRate:
        todayVisits.length > 0
          ? Math.round((todayCompleted.length / todayVisits.length) * 100)
          : 0,
      punctualityScore: attendance?.lateByMinutes
        ? Math.max(0, 100 - attendance.lateByMinutes * 2)
        : 100,
      conversionRate:
        todayVisits.length > 0
          ? Math.round((todayConversions.length / todayVisits.length) * 100)
          : 0,
      avgTimePerVisit,
    },
  };
};

const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ==================== HELPER FUNCTIONS ====================

export const formatCurrency = (amount: number, currency: string = "INR"): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    target_assigned: "🎯",
    target_reminder: "⏰",
    check_in_reminder: "📍",
    check_out_reminder: "🏠",
    goal_achieved: "🏆",
    streak_milestone: "🔥",
    incentive_earned: "💰",
    message_received: "💬",
    admin_announcement: "📢",
    leave_approved: "✅",
    leave_rejected: "❌",
    performance_alert: "📊",
    system: "ℹ️",
  };
  return iconMap[type] || "📌";
};

export const getPriorityColor = (priority: "low" | "medium" | "high" | "urgent"): string => {
  const colorMap = {
    low: "#4caf50",
    medium: "#ff9800",
    high: "#f44336",
    urgent: "#9c27b0",
  };
  return colorMap[priority];
};

export const getIncentiveTypeLabel = (type: IncentiveType): string => {
  const labelMap: Record<IncentiveType, string> = {
    per_visit: "Per Visit",
    per_conversion: "Per Conversion",
    daily_bonus: "Daily Bonus",
    weekly_bonus: "Weekly Bonus",
    monthly_bonus: "Monthly Bonus",
    streak_bonus: "Streak Bonus",
    performance_bonus: "Performance Bonus",
    special_bonus: "Special Bonus",
  };
  return labelMap[type];
};
