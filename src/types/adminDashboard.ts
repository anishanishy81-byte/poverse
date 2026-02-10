// Admin Dashboard Types

// Agent Activity Feed
export type ActivityType =
  | "check_in"
  | "check_out"
  | "target_started"
  | "target_completed"
  | "target_skipped"
  | "location_update"
  | "lead_converted"
  | "break_started"
  | "break_ended";

export interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  companyId: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  targetId?: string;
  targetName?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, unknown>;
}

// Analytics Types
export interface DailyAnalytics {
  date: string;
  companyId: string;
  
  // Attendance
  totalAgents: number;
  presentAgents: number;
  absentAgents: number;
  lateAgents: number;
  avgCheckInTime: string;
  avgCheckOutTime: string;
  avgWorkHours: number;
  
  // Targets
  totalTargetsAssigned: number;
  targetsCompleted: number;
  targetsSkipped: number;
  targetsPending: number;
  completionRate: number;
  
  // Conversions
  totalVisits: number;
  conversions: number;
  conversionRate: number;
  newLeads: number;
  
  // Distance
  totalDistanceTraveled: number;
  avgDistancePerAgent: number;
}

export interface WeeklyAnalytics extends DailyAnalytics {
  weekNumber: number;
  startDate: string;
  endDate: string;
  dailyBreakdown: DailyAnalytics[];
}

export interface MonthlyAnalytics extends DailyAnalytics {
  month: number;
  year: number;
  weeklyBreakdown: WeeklyAnalytics[];
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  
  // Required for admin dashboard display
  totalVisits: number;
  uniqueTargets: number;
  score: number;
  
  // Optional detailed scores
  visitsCompleted?: number;
  completedVisits?: number;
  conversions?: number;
  conversionRate?: number;
  avgWorkHours?: number;
  punctualityScore?: number;
  distanceTraveled?: number;
  overallScore?: number;
  previousRank?: number;
  rankChange?: number;
  currentStreak?: number;
  avgTimePerVisit?: number;
  avgRating?: number;
}

export interface Leaderboard {
  companyId: string;
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  entries: LeaderboardEntry[];
  updatedAt: string;
}

// Agent Efficiency Metrics
export interface AgentEfficiency {
  agentId: string;
  agentName: string;
  companyId: string;
  period: "daily" | "weekly" | "monthly";
  
  // Admin dashboard display
  visitsPerDay: number;
  avgTimePerVisit: number;
  efficiencyScore: number; // 0-1
  
  // Time Efficiency
  avgVisitDuration: number; // minutes
  avgTravelTime: number; // minutes between visits
  idleTime: number; // minutes not on task
  productiveTimePercent: number;
  
  // Target Efficiency
  targetsPerHour: number;
  completionRate: number;
  firstAttemptSuccessRate: number;
  
  // Quality Metrics
  conversionRate: number;
  followUpRate: number;
  customerFeedbackScore?: number;
  
  // Attendance
  attendanceRate: number;
  punctualityRate: number;
  avgOvertimeMinutes: number;
}

// Heat Map Data
export interface HeatMapPoint {
  latitude: number;
  longitude: number;
  weight: number; // Intensity of activity
  agentCount?: number;
  visitCount?: number;
}

export interface HeatMapData {
  companyId: string;
  period: "today" | "week" | "month";
  points: HeatMapPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    latitude: number;
    longitude: number;
  };
}

// Target Completion Rates
export interface TargetCompletionStats {
  companyId: string;
  period: "daily" | "weekly" | "monthly";
  
  // Required for admin dashboard display
  totalTargets: number;
  totalVisits: number;
  completionRate: number;
  
  // Top targets
  topTargets: {
    targetId: string;
    targetName: string;
    visitCount: number;
    completionRate: number;
  }[];
  
  // By Agent
  byAgent: {
    agentId: string;
    agentName: string;
    total: number;
    completed: number;
    rate: number;
  }[];
  
  // By Day/Time
  byDayOfWeek: {
    day: string;
    total: number;
    completed: number;
    rate: number;
  }[];
  
  byTimeOfDay?: {
    hour: number;
    count: number;
  }[];
  
  avgTimeToComplete: number; // minutes
  firstAttemptRate: number;
}

// Real-time Agent Status
export interface AgentStatus {
  agentId: string;
  agentName: string;
  companyId: string;
  isOnline: boolean;
  lastSeen: string;
  
  // Status for admin dashboard display
  status: "online" | "busy" | "offline";
  currentActivity?: string;
  
  // Current Status
  currentStatus: "checked_in" | "checked_out" | "on_target" | "in_transit" | "idle" | "on_break" | "on_duty";
  currentTarget?: {
    targetId: string;
    targetName: string;
    startedAt: string;
  };
  
  // Location
  lastLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    updatedAt: string;
  };
  
  // Today's Stats
  todayStats?: {
    checkInTime?: string;
    visitsCompleted: number;
    conversions: number;
    distanceTraveled: number;
    hoursWorked: number;
  };
}

// Dashboard Summary
export interface AdminDashboardSummary {
  companyId: string;
  timestamp: string;
  
  // Real-time
  agentsOnline: number;
  agentsCheckedIn: number;
  agentsOnTarget: number;
  agentsIdle: number;
  
  // Today's Progress
  todayVisits: number;
  todayConversions: number;
  todayCompletionRate: number;
  
  // Trends (compared to yesterday/last week)
  visitsTrend: number; // percentage
  conversionsTrend: number;
  attendanceTrend: number;
  
  // Alerts
  alerts: {
    type: "warning" | "error" | "info";
    message: string;
    agentId?: string;
  }[];
}
