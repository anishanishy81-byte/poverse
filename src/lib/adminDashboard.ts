// Admin Dashboard Library
import { realtimeDb, db } from "./firebase";
import {
  ref,
  get,
  set,
  push,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  limitToLast,
} from "firebase/database";
import { collection, getDocs, where, query as firestoreQuery } from "firebase/firestore";
import {
  AgentActivity,
  ActivityType,
  DailyAnalytics,
  LeaderboardEntry,
  Leaderboard,
  AgentEfficiency,
  HeatMapData,
  HeatMapPoint,
  TargetCompletionStats,
  AgentStatus,
  AdminDashboardSummary,
} from "@/types/adminDashboard";
import { TargetVisit } from "@/types/target";
import { AttendanceRecord } from "@/types/attendance";

// Firebase Paths
const AGENT_ACTIVITY_PATH = "agentActivity";
const ANALYTICS_PATH = "analytics";
const LEADERBOARD_PATH = "leaderboard";

// ==================== AGENT ACTIVITY FEED ====================

export const logAgentActivity = async (
  activity: Omit<AgentActivity, "id" | "timestamp">
): Promise<string> => {
  const activityRef = ref(realtimeDb, `${AGENT_ACTIVITY_PATH}/${activity.companyId}`);
  const newActivityRef = push(activityRef);
  const activityId = newActivityRef.key!;
  
  const fullActivity: AgentActivity = {
    ...activity,
    id: activityId,
    timestamp: new Date().toISOString(),
  };
  
  await set(newActivityRef, fullActivity);
  return activityId;
};

export const subscribeToAgentActivityFeed = (
  companyId: string,
  callback: (activities: AgentActivity[]) => void,
  limit: number = 50
): (() => void) => {
  const activityRef = ref(realtimeDb, `${AGENT_ACTIVITY_PATH}/${companyId}`);
  const activityQuery = query(activityRef, limitToLast(limit));
  
  const unsubscribe = onValue(activityQuery, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const activities: AgentActivity[] = [];
    snapshot.forEach((child) => {
      activities.push(child.val() as AgentActivity);
    });
    
    // Sort by timestamp descending (newest first)
    callback(
      activities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  });
  
  return () => off(activityRef);
};

export const getActivityIcon = (type: ActivityType): string => {
  const iconMap: Record<ActivityType, string> = {
    check_in: "🟢",
    check_out: "🔴",
    target_started: "🎯",
    target_completed: "✅",
    target_skipped: "⏭️",
    location_update: "📍",
    lead_converted: "🏆",
    break_started: "☕",
    break_ended: "💼",
  };
  return iconMap[type] || "📌";
};

export const getActivityColor = (type: ActivityType): string => {
  const colorMap: Record<ActivityType, string> = {
    check_in: "#4caf50",
    check_out: "#f44336",
    target_started: "#2196f3",
    target_completed: "#4caf50",
    target_skipped: "#ff9800",
    location_update: "#9c27b0",
    lead_converted: "#ffc107",
    break_started: "#795548",
    break_ended: "#607d8b",
  };
  return colorMap[type] || "#9e9e9e";
};

// ==================== ANALYTICS ====================

// Simplified daily analytics for admin dashboard (today's stats)
export const calculateDailyAnalytics = async (
  companyId: string,
  agentIds: string[]
): Promise<{
  totalVisits: number;
  activeAgents: number;
  avgVisitsPerAgent: number;
  avgTimePerVisit: number;
}> => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Fetch visits for today
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  let totalVisits = 0;
  const activeAgentSet = new Set<string>();
  let totalDuration = 0;
  let durationCount = 0;
  
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      if (!visit.assignedAt?.startsWith(today)) return;
      if (visit.status !== "completed") return;
      
      totalVisits++;
      activeAgentSet.add(visit.userId);
      if (visit.durationMinutes) {
        totalDuration += visit.durationMinutes;
        durationCount++;
      }
    });
  }
  
  return {
    totalVisits,
    activeAgents: activeAgentSet.size,
    avgVisitsPerAgent: activeAgentSet.size > 0 ? totalVisits / activeAgentSet.size : 0,
    avgTimePerVisit: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
  };
};

// Full daily analytics with detailed metrics
export const calculateFullDailyAnalytics = async (
  companyId: string,
  date: string,
  agents: { id: string; name: string }[]
): Promise<DailyAnalytics> => {
  // Fetch attendance records for the date
  const attendanceRef = ref(realtimeDb, "attendance");
  const attendanceSnapshot = await get(attendanceRef);
  
  const attendanceRecords: AttendanceRecord[] = [];
  if (attendanceSnapshot.exists()) {
    attendanceSnapshot.forEach((child) => {
      const record = child.val() as AttendanceRecord;
      if (record.companyId === companyId && record.date === date) {
        attendanceRecords.push(record);
      }
    });
  }
  
  // Fetch target visits for the date
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  const visits: TargetVisit[] = [];
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId === companyId && visit.assignedAt?.startsWith(date)) {
        visits.push(visit);
      }
    });
  }
  
  // Calculate attendance metrics
  const presentAgents = attendanceRecords.filter((r) => r.checkIn).length;
  const lateAgents = attendanceRecords.filter((r) => r.lateStatus === "late" || r.lateStatus === "very_late").length;
  
  // Calculate average check-in/out times
  const checkInTimes = attendanceRecords
    .filter((r) => r.checkIn?.timestamp)
    .map((r) => new Date(r.checkIn!.timestamp).getHours() * 60 + new Date(r.checkIn!.timestamp).getMinutes());
  const avgCheckInMinutes = checkInTimes.length > 0
    ? Math.round(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length)
    : 0;
  
  const checkOutTimes = attendanceRecords
    .filter((r) => r.checkOut?.timestamp)
    .map((r) => new Date(r.checkOut!.timestamp).getHours() * 60 + new Date(r.checkOut!.timestamp).getMinutes());
  const avgCheckOutMinutes = checkOutTimes.length > 0
    ? Math.round(checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length)
    : 0;
  
  // Calculate work hours
  const workHours = attendanceRecords
    .filter((r) => r.workDurationMinutes)
    .map((r) => r.workDurationMinutes! / 60);
  const avgWorkHours = workHours.length > 0
    ? Math.round((workHours.reduce((a, b) => a + b, 0) / workHours.length) * 10) / 10
    : 0;
  
  // Calculate target metrics
  const completedVisits = visits.filter((v) => v.status === "completed");
  const skippedVisits = visits.filter((v) => v.status === "skipped");
  const pendingVisits = visits.filter((v) => v.status === "in_transit" || v.status === "reached");
  const conversions = visits.filter((v) => v.leadStatus === "converted");
  const newLeads = visits.filter((v) => v.leadStatus === "new" || v.leadStatus === "contacted");
  
  return {
    date,
    companyId,
    totalAgents: agents.length,
    presentAgents,
    absentAgents: agents.length - presentAgents,
    lateAgents,
    avgCheckInTime: formatMinutesToTime(avgCheckInMinutes),
    avgCheckOutTime: formatMinutesToTime(avgCheckOutMinutes),
    avgWorkHours,
    totalTargetsAssigned: visits.length,
    targetsCompleted: completedVisits.length,
    targetsSkipped: skippedVisits.length,
    targetsPending: pendingVisits.length,
    completionRate: visits.length > 0 ? Math.round((completedVisits.length / visits.length) * 100) : 0,
    totalVisits: visits.length,
    conversions: conversions.length,
    conversionRate: visits.length > 0 ? Math.round((conversions.length / visits.length) * 100) : 0,
    newLeads: newLeads.length,
    totalDistanceTraveled: 0, // Would need location history to calculate
    avgDistancePerAgent: 0,
  };
};

// Calculate weekly analytics
export const calculateWeeklyAnalytics = async (
  companyId: string,
  agentIds: string[]
): Promise<{
  totalVisits: number;
  activeAgents: number;
  avgVisitsPerAgent: number;
  avgTimePerVisit: number;
  previousVisits: number;
}> => {
  const now = new Date();
  const day = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  // Fetch visits
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  let totalVisits = 0;
  let previousVisits = 0;
  const activeAgentSet = new Set<string>();
  let totalDuration = 0;
  let durationCount = 0;
  
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      
      const visitDate = new Date(visit.assignedAt);
      
      // This week
      if (visitDate >= startOfWeek && visitDate <= now && visit.status === "completed") {
        totalVisits++;
        activeAgentSet.add(visit.userId);
        if (visit.durationMinutes) {
          totalDuration += visit.durationMinutes;
          durationCount++;
        }
      }
      
      // Last week
      if (visitDate >= startOfLastWeek && visitDate < startOfWeek && visit.status === "completed") {
        previousVisits++;
      }
    });
  }
  
  return {
    totalVisits,
    activeAgents: activeAgentSet.size,
    avgVisitsPerAgent: activeAgentSet.size > 0 ? totalVisits / activeAgentSet.size : 0,
    avgTimePerVisit: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    previousVisits,
  };
};

// Calculate monthly analytics
export const calculateMonthlyAnalytics = async (
  companyId: string,
  agentIds: string[]
): Promise<{
  totalVisits: number;
  activeAgents: number;
  avgVisitsPerAgent: number;
  avgTimePerVisit: number;
  previousVisits: number;
}> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  // Fetch visits
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  let totalVisits = 0;
  let previousVisits = 0;
  const activeAgentSet = new Set<string>();
  let totalDuration = 0;
  let durationCount = 0;
  
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      
      const visitDate = new Date(visit.assignedAt);
      
      // This month
      if (visitDate >= startOfMonth && visitDate <= now && visit.status === "completed") {
        totalVisits++;
        activeAgentSet.add(visit.userId);
        if (visit.durationMinutes) {
          totalDuration += visit.durationMinutes;
          durationCount++;
        }
      }
      
      // Last month
      if (visitDate >= startOfLastMonth && visitDate < startOfMonth && visit.status === "completed") {
        previousVisits++;
      }
    });
  }
  
  return {
    totalVisits,
    activeAgents: activeAgentSet.size,
    avgVisitsPerAgent: activeAgentSet.size > 0 ? totalVisits / activeAgentSet.size : 0,
    avgTimePerVisit: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    previousVisits,
  };
};

const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

// ==================== LEADERBOARD ====================

export const calculateLeaderboard = async (
  companyId: string,
  agents: { id: string; name: string }[],
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<LeaderboardEntry[]> => {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case "daily":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); // Monday
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  
  // Fetch all visits for the period
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  const visitsByAgent = new Map<string, TargetVisit[]>();
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      
      const visitDate = new Date(visit.assignedAt);
      if (visitDate < startDate || visitDate > now) return;
      
      const existing = visitsByAgent.get(visit.userId) || [];
      existing.push(visit);
      visitsByAgent.set(visit.userId, existing);
    });
  }
  
  // Fetch attendance for the period
  const attendanceRef = ref(realtimeDb, "attendance");
  const attendanceSnapshot = await get(attendanceRef);
  
  const attendanceByAgent = new Map<string, AttendanceRecord[]>();
  if (attendanceSnapshot.exists()) {
    attendanceSnapshot.forEach((child) => {
      const record = child.val() as AttendanceRecord;
      if (record.companyId !== companyId) return;
      
      const recordDate = new Date(record.date);
      if (recordDate < startDate || recordDate > now) return;
      
      const existing = attendanceByAgent.get(record.userId) || [];
      existing.push(record);
      attendanceByAgent.set(record.userId, existing);
    });
  }
  
  // Calculate scores for each agent
  const entries: LeaderboardEntry[] = agents.map((agent) => {
    const visits = visitsByAgent.get(agent.id) || [];
    const attendance = attendanceByAgent.get(agent.id) || [];
    
    const completed = visits.filter((v) => v.status === "completed").length;
    const conversions = visits.filter((v) => v.leadStatus === "converted").length;
    const conversionRate = visits.length > 0 ? (conversions / visits.length) * 100 : 0;
    
    // Calculate work hours
    const totalWorkMinutes = attendance.reduce((sum, a) => sum + (a.workDurationMinutes || 0), 0);
    const avgWorkHours = attendance.length > 0 ? totalWorkMinutes / attendance.length / 60 : 0;
    
    // Punctuality score (100 - penalty for late arrivals)
    const lateCount = attendance.filter((a) => a.lateStatus === "late" || a.lateStatus === "very_late").length;
    const punctualityScore = attendance.length > 0
      ? Math.max(0, 100 - (lateCount / attendance.length) * 50)
      : 0;
    
    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (completed * 2) + // 2 points per completed visit
      (conversions * 5) + // 5 points per conversion
      (avgWorkHours * 5) + // 5 points per avg work hour
      punctualityScore * 0.5 // 0.5x punctuality score
    );
    
    // Count unique targets
    const uniqueTargetIds = new Set(visits.map(v => v.targetId));
    
    return {
      rank: 0, // Will be set after sorting
      agentId: agent.id,
      agentName: agent.name,
      totalVisits: completed,
      uniqueTargets: uniqueTargetIds.size,
      score: overallScore,
      visitsCompleted: completed,
      conversions,
      conversionRate: Math.round(conversionRate),
      avgWorkHours: Math.round(avgWorkHours * 10) / 10,
      punctualityScore: Math.round(punctualityScore),
      distanceTraveled: 0,
      overallScore,
      currentStreak: 0,
    };
  });
  
  // Sort by score and assign ranks
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return entries;
};

// ==================== AGENT EFFICIENCY ====================

export const calculateAgentEfficiency = async (
  companyId: string,
  agents: { id: string; name: string }[]
): Promise<AgentEfficiency[]> => {
  const now = new Date();
  // Use last 7 days for efficiency calculation
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);
  
  // Fetch all visits
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  const visitsByAgent = new Map<string, TargetVisit[]>();
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      
      const visitDate = new Date(visit.assignedAt);
      if (visitDate >= startDate && visitDate <= now) {
        const existing = visitsByAgent.get(visit.userId) || [];
        existing.push(visit);
        visitsByAgent.set(visit.userId, existing);
      }
    });
  }
  
  // Fetch all attendance
  const attendanceRef = ref(realtimeDb, "attendance");
  const attendanceSnapshot = await get(attendanceRef);
  
  const attendanceByAgent = new Map<string, AttendanceRecord[]>();
  if (attendanceSnapshot.exists()) {
    attendanceSnapshot.forEach((child) => {
      const record = child.val() as AttendanceRecord;
      if (record.companyId !== companyId) return;
      
      const recordDate = new Date(record.date);
      if (recordDate >= startDate && recordDate <= now) {
        const existing = attendanceByAgent.get(record.userId) || [];
        existing.push(record);
        attendanceByAgent.set(record.userId, existing);
      }
    });
  }
  
  // Calculate efficiency for each agent
  const efficiencies: AgentEfficiency[] = agents.map((agent) => {
    const visits = visitsByAgent.get(agent.id) || [];
    const attendance = attendanceByAgent.get(agent.id) || [];
    
    const completedVisits = visits.filter((v) => v.status === "completed");
    const daysWorked = attendance.length || 1;
    const visitsPerDay = completedVisits.length / daysWorked;
    
    const durations = completedVisits
      .filter((v) => v.durationMinutes)
      .map((v) => v.durationMinutes!);
    const avgTimePerVisit = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    
    const completionRate = visits.length > 0
      ? completedVisits.length / visits.length
      : 0;
    
    const conversions = visits.filter((v) => v.leadStatus === "converted").length;
    const conversionRate = visits.length > 0 ? conversions / visits.length : 0;
    
    const punctualDays = attendance.filter((a) => a.lateStatus === "on_time").length;
    const punctualityRate = attendance.length > 0 ? punctualDays / attendance.length : 0;
    
    // Calculate efficiency score (0-1)
    const efficiencyScore = (
      completionRate * 0.4 +
      (conversionRate > 0 ? conversionRate * 0.3 : completionRate * 0.3) +
      punctualityRate * 0.2 +
      Math.min(visitsPerDay / 10, 1) * 0.1 // Normalize visits per day
    );
    
    return {
      agentId: agent.id,
      agentName: agent.name,
      companyId,
      period: "weekly",
      visitsPerDay: Math.round(visitsPerDay * 10) / 10,
      avgTimePerVisit,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100,
      completionRate: Math.round(completionRate * 100),
      conversionRate: Math.round(conversionRate * 100),
      punctualityRate: Math.round(punctualityRate * 100),
      avgVisitDuration: avgTimePerVisit,
      avgTravelTime: 15,
      idleTime: 0,
      productiveTimePercent: Math.round(completionRate * 100),
      targetsPerHour: visitsPerDay / 8,
      firstAttemptSuccessRate: Math.round(completionRate * 100),
      followUpRate: 0,
      attendanceRate: Math.min(Math.round((attendance.length / 7) * 100), 100),
      avgOvertimeMinutes: 0,
    };
  });
  
  // Sort by efficiency score
  efficiencies.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  
  return efficiencies;
};

// ==================== HEAT MAP ====================

export const getHeatMapData = async (
  companyId: string,
  period: "today" | "week" | "month"
): Promise<HeatMapData> => {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  
  // Fetch completed visits for heat map
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  const points: HeatMapPoint[] = [];
  const locationMap = new Map<string, { lat: number; lng: number; count: number }>();
  
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      
      const visitDate = new Date(visit.assignedAt);
      if (visitDate < startDate || visitDate > now) return;
      
      if (visit.location?.latitude && visit.location?.longitude) {
        // Round to 3 decimal places to group nearby locations
        const key = `${visit.location.latitude.toFixed(3)},${visit.location.longitude.toFixed(3)}`;
        const existing = locationMap.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          locationMap.set(key, {
            lat: visit.location.latitude,
            lng: visit.location.longitude,
            count: 1,
          });
        }
      }
    });
  }
  
  // Convert to heat map points
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let totalLat = 0, totalLng = 0;
  
  locationMap.forEach((loc) => {
    points.push({
      latitude: loc.lat,
      longitude: loc.lng,
      weight: Math.min(loc.count * 0.3, 1), // Normalize weight
      visitCount: loc.count,
    });
    
    minLat = Math.min(minLat, loc.lat);
    maxLat = Math.max(maxLat, loc.lat);
    minLng = Math.min(minLng, loc.lng);
    maxLng = Math.max(maxLng, loc.lng);
    totalLat += loc.lat;
    totalLng += loc.lng;
  });
  
  // Default bounds if no data
  if (points.length === 0) {
    return {
      companyId,
      period,
      points: [],
      bounds: { north: 28.7, south: 28.5, east: 77.3, west: 77.1 }, // Default Delhi bounds
      center: { latitude: 28.6, longitude: 77.2 },
    };
  }
  
  return {
    companyId,
    period,
    points,
    bounds: {
      north: maxLat + 0.01,
      south: minLat - 0.01,
      east: maxLng + 0.01,
      west: minLng - 0.01,
    },
    center: {
      latitude: totalLat / points.length,
      longitude: totalLng / points.length,
    },
  };
};

// ==================== TARGET COMPLETION STATS ====================

export const getTargetCompletionStats = async (
  companyId: string
): Promise<TargetCompletionStats> => {
  const now = new Date();
  // Use last 30 days
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);
  
  // Fetch visits
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  const visits: TargetVisit[] = [];
  const targetMap = new Map<string, { name: string; visitCount: number }>();
  
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      
      const visitDate = new Date(visit.assignedAt);
      if (visitDate >= startDate && visitDate <= now) {
        visits.push(visit);
        
        // Track target visits
        const existing = targetMap.get(visit.targetId) || { 
          name: visit.targetName || visit.targetId, 
          visitCount: 0 
        };
        if (visit.status === "completed") {
          existing.visitCount++;
        }
        targetMap.set(visit.targetId, existing);
      }
    });
  }
  
  const completed = visits.filter((v) => v.status === "completed");
  const totalTargets = targetMap.size;
  const totalVisits = completed.length;
  const completionRate = visits.length > 0 ? completed.length / visits.length : 0;
  
  // Get top targets
  const topTargets = Array.from(targetMap.entries())
    .map(([id, data]) => ({
      targetId: id,
      targetName: data.name,
      visitCount: data.visitCount,
      completionRate: 0,
    }))
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 10);
  
  return {
    companyId,
    period: "monthly",
    totalTargets,
    totalVisits,
    completionRate,
    topTargets,
    byAgent: [],
    byDayOfWeek: [],
    byTimeOfDay: [],
    avgTimeToComplete: 0,
    firstAttemptRate: 0,
  };
};

// ==================== REAL-TIME AGENT STATUS ====================

export const subscribeToAgentStatuses = (
  companyId: string,
  callback: (statuses: AgentStatus[]) => void
): (() => void) => {
  const statusMap = new Map<string, AgentStatus>();
  const unsubscribes: (() => void)[] = [];
  let isInitialized = false;
  
  // Fetch all users for this company and initialize status map
  const initializeAllUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const usersQuery = firestoreQuery(usersRef, where("companyId", "==", companyId));
      
      // Initial fetch of all company users
      const usersSnapshot = await getDocs(usersQuery);
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;
        
        // Create initial status for each user (default to offline)
        statusMap.set(userId, {
          agentId: userId,
          agentName: userData.name || userData.username || userId,
          companyId,
          isOnline: false,
          lastSeen: "",
          currentStatus: "checked_out" as const,
          status: "offline" as const,
        });
      });
      
      isInitialized = true;
      // Trigger callback after all users are loaded
      updateCallback();
    } catch (error) {
      console.error("Error fetching company users:", error);
      isInitialized = true;
    }
  };
  
  // Start by loading all users
  initializeAllUsers();
  
  // Subscribe to presence to update online/offline status
  const presenceRef = ref(realtimeDb, "presence");
  const presenceUnsub = onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const userId = child.key!;
        const presence = child.val();
        
        // Update presence for users in our company
        const existing = statusMap.get(userId);
        if (existing && presence.companyId === companyId) {
          // Update with presence data
          statusMap.set(userId, {
            ...existing,
            isOnline: presence.isOnline || false,
            lastSeen: presence.lastActive || "",
            agentName: presence.name || existing.agentName,
            status: presence.isOnline ? "online" : "offline",
            currentStatus: presence.isOnline ? "on_duty" : "checked_out",
          });
        }
      });
    }
    
    if (isInitialized) {
      updateCallback();
    }
  });
  unsubscribes.push(() => off(presenceRef));
  
  // Subscribe to attendance for today
  const today = new Date().toISOString().split('T')[0];
  const attendanceRef = ref(realtimeDb, "attendance");
  const attendanceUnsub = onValue(attendanceRef, (snapshot) => {
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const record = child.val() as AttendanceRecord;
        // Only process records for this company
        if (record.companyId === companyId && record.date === today) {
          const existing = statusMap.get(record.userId);
          if (existing) {
            statusMap.set(record.userId, {
              ...existing,
              currentStatus: record.checkOut ? "checked_out" : "on_duty",
              currentActivity: record.checkOut ? "Checked out" : "On duty",
            });
          }
        }
      });
    }
    if (isInitialized) {
      updateCallback();
    }
  });
  unsubscribes.push(() => off(attendanceRef));
  
  // Update callback function
  const updateCallback = () => {
    const statuses: AgentStatus[] = Array.from(statusMap.values());
    callback(statuses);
  };
  
  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
};

// ==================== DASHBOARD SUMMARY ====================

export const calculateDashboardSummary = async (
  companyId: string,
  agents: { id: string; name: string }[]
): Promise<AdminDashboardSummary> => {
  const today = new Date().toISOString().split("T")[0];
  
  // Fetch today's attendance
  const attendanceRef = ref(realtimeDb, "attendance");
  const attendanceSnapshot = await get(attendanceRef);
  
  let checkedInCount = 0;
  if (attendanceSnapshot.exists()) {
    attendanceSnapshot.forEach((child) => {
      const record = child.val() as AttendanceRecord;
      if (record.companyId === companyId && record.date === today && record.checkIn) {
        checkedInCount++;
      }
    });
  }
  
  // Fetch today's visits
  const visitsRef = ref(realtimeDb, "targetVisits");
  const visitsSnapshot = await get(visitsRef);
  
  let todayVisits = 0;
  let todayConversions = 0;
  let todayCompleted = 0;
  let onTargetCount = 0;
  
  if (visitsSnapshot.exists()) {
    visitsSnapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.companyId !== companyId) return;
      if (!visit.assignedAt?.startsWith(today)) return;
      
      todayVisits++;
      if (visit.status === "completed") todayCompleted++;
      if (visit.leadStatus === "converted") todayConversions++;
      if (visit.status === "in_progress") onTargetCount++;
    });
  }
  
  // Fetch online agents
  const presenceRef = ref(realtimeDb, "presence");
  const presenceSnapshot = await get(presenceRef);
  
  let onlineCount = 0;
  if (presenceSnapshot.exists()) {
    presenceSnapshot.forEach((child) => {
      const userId = child.key;
      const presence = child.val();
      if (agents.some((a) => a.id === userId) && presence.isOnline) {
        onlineCount++;
      }
    });
  }
  
  return {
    companyId,
    timestamp: new Date().toISOString(),
    agentsOnline: onlineCount,
    agentsCheckedIn: checkedInCount,
    agentsOnTarget: onTargetCount,
    agentsIdle: Math.max(0, checkedInCount - onTargetCount),
    todayVisits,
    todayConversions,
    todayCompletionRate: todayVisits > 0 ? Math.round((todayCompleted / todayVisits) * 100) : 0,
    visitsTrend: 0, // Would need historical data
    conversionsTrend: 0,
    attendanceTrend: 0,
    alerts: [],
  };
};

// ==================== HELPER FUNCTIONS ====================

export const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const getStatusColor = (status: AgentStatus["currentStatus"] | AgentStatus["status"]): string => {
  const colorMap: Record<string, string> = {
    checked_in: "#4caf50",
    checked_out: "#9e9e9e",
    on_target: "#2196f3",
    in_transit: "#ff9800",
    idle: "#f44336",
    on_break: "#795548",
    on_duty: "#4caf50",
    online: "#4caf50",
    busy: "#ff9800",
    offline: "#9e9e9e",
  };
  return colorMap[status] || "#9e9e9e";
};

export const getStatusLabel = (status: AgentStatus["currentStatus"] | AgentStatus["status"]): string => {
  const labelMap: Record<string, string> = {
    checked_in: "Available",
    checked_out: "Offline",
    on_target: "On Target",
    in_transit: "In Transit",
    idle: "Idle",
    on_break: "On Break",
    on_duty: "On Duty",
    online: "Online",
    busy: "Busy",
    offline: "Offline",  };
  return labelMap[status] || "Unknown";
};