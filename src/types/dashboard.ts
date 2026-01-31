// Dashboard Types for Agent Dashboard Improvements

// Agent Goals & Targets
export interface AgentGoals {
  userId: string;
  companyId: string;
  
  // Daily Goals
  daily: {
    targetVisits: number;       // Number of targets to visit per day
    conversions: number;        // Number of conversions expected
    workHours: number;          // Hours to work per day
    newLeads: number;           // New leads to generate
  };
  
  // Weekly Goals
  weekly: {
    targetVisits: number;
    conversions: number;
    newLeads: number;
    revenue?: number;           // Optional revenue target
  };
  
  // Monthly Goals
  monthly: {
    targetVisits: number;
    conversions: number;
    newLeads: number;
    revenue?: number;
  };
  
  updatedAt: string;
  setBy: string;                // Admin who set the goals
}

// Agent Progress Tracking
export interface AgentProgress {
  userId: string;
  date: string;                 // YYYY-MM-DD
  
  // Today's Progress
  daily: {
    visitsCompleted: number;
    visitsTarget: number;
    conversions: number;
    conversionsTarget: number;
    hoursWorked: number;
    hoursTarget: number;
    newLeads: number;
    newLeadsTarget: number;
    completionRate: number;     // Overall daily completion percentage
  };
  
  // This Week's Progress
  weekly: {
    visitsCompleted: number;
    visitsTarget: number;
    conversions: number;
    conversionsTarget: number;
    newLeads: number;
    newLeadsTarget: number;
    completionRate: number;
  };
  
  // Streak tracking
  streak: {
    currentDays: number;        // Consecutive days meeting goals
    longestDays: number;        // Longest streak
    lastGoalMetDate?: string;
  };
}

// Notifications
export type NotificationType = 
  | "target_assigned"
  | "target_reminder"
  | "check_in_reminder"
  | "check_out_reminder"
  | "goal_achieved"
  | "streak_milestone"
  | "incentive_earned"
  | "message_received"
  | "admin_announcement"
  | "leave_approved"
  | "leave_rejected"
  | "performance_alert"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;  // Additional context data
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;              // Optional expiry
  actionUrl?: string;              // URL to navigate to
  priority: "low" | "medium" | "high";
}

// Earnings & Incentives
export type IncentiveType = 
  | "per_visit"
  | "per_conversion"
  | "daily_bonus"
  | "weekly_bonus"
  | "monthly_bonus"
  | "streak_bonus"
  | "performance_bonus"
  | "special_bonus";

export interface Incentive {
  id: string;
  userId: string;
  companyId: string;
  type: IncentiveType;
  name: string;
  description: string;
  amount: number;
  currency: string;
  earnedAt: string;
  status: "pending" | "approved" | "paid" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  relatedTarget?: string;          // Target that triggered this incentive
}

export interface EarningsSummary {
  userId: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate: string;
  
  // Breakdown
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  
  // By type
  byType: {
    type: IncentiveType;
    count: number;
    total: number;
  }[];
  
  currency: string;
}

// Schedule / Today's Tasks
export interface ScheduledTask {
  id: string;
  userId: string;
  companyId: string;
  
  // Task details
  title: string;
  description?: string;
  type: "target_visit" | "meeting" | "follow_up" | "report" | "training" | "other";
  
  // Timing
  scheduledDate: string;           // YYYY-MM-DD
  scheduledTime?: string;          // HH:mm
  estimatedDuration?: number;      // Minutes
  deadline?: string;               // ISO timestamp
  
  // Priority
  priority: "low" | "medium" | "high" | "urgent";
  
  // Status
  status: "pending" | "in_progress" | "completed" | "cancelled" | "postponed";
  completedAt?: string;
  
  // Related entities
  targetId?: string;
  targetName?: string;
  targetLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  
  // Assignment
  assignedBy?: string;
  assignedAt: string;
  notes?: string;
}

// Quick Stats for Dashboard
export interface DashboardStats {
  // Today's stats
  today: {
    visitsCompleted: number;
    visitsTotal: number;
    leadsGenerated: number;
    conversions: number;
    hoursWorked: number;
    distanceTraveled: number;       // km
    locationsVisited: number;
  };
  
  // This week's stats
  thisWeek: {
    visitsCompleted: number;
    visitsTotal: number;
    leadsGenerated: number;
    conversions: number;
    hoursWorked: number;
    avgVisitsPerDay: number;
    bestDay?: string;               // Day with most visits
  };
  
  // Performance indicators
  performance: {
    completionRate: number;         // Percentage
    punctualityScore: number;       // 0-100
    conversionRate: number;         // Percentage
    avgTimePerVisit: number;        // Minutes
    ranking?: number;               // Among team members
    totalTeamMembers?: number;
  };
}

// Activity Log Entry
export interface ActivityLogEntry {
  id: string;
  userId: string;
  type: "check_in" | "check_out" | "target_start" | "target_complete" | "target_skip" | "break" | "location_update" | "report_submit";
  title: string;
  description?: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, unknown>;
}
