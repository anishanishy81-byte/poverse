import { realtimeDb } from "./firebase";
import {
  ref,
  get,
  set,
  update,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  startAt,
  endAt,
  onValue,
  off,
} from "firebase/database";
import {
  DailyReport,
  DailyReportSummary,
  TeamDailyReport,
  TargetVisitSummary,
  DailyReportFilters,
} from "@/types/dailyReport";
import { AttendanceRecord } from "@/types/attendance";
import { TargetVisit } from "@/types/target";

// Realtime Database paths
const DAILY_REPORTS_PATH = "dailyReports";
const ATTENDANCE_PATH = "attendance";
const TARGET_VISITS_PATH = "targetVisits";
const LOCATION_HISTORY_PATH = "locationHistory";

// ==================== UTILITY FUNCTIONS ====================

// Get date string in YYYY-MM-DD format
export const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split("T")[0];
};

// Calculate distance between two coordinates in km (Haversine formula)
export const calculateDistance = (
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

// Format minutes to hours string
export const formatMinutesToHours = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// ==================== REPORT GENERATION ====================

// Generate daily report for a user
export const generateDailyReport = async (
  userId: string,
  userName: string,
  companyId: string,
  date: string = getDateString()
): Promise<DailyReport> => {
  const now = new Date().toISOString();
  
  // Fetch attendance data
  const attendanceRef = ref(realtimeDb, `${ATTENDANCE_PATH}/${userId}_${date}`);
  const attendanceSnapshot = await get(attendanceRef);
  const attendance = attendanceSnapshot.exists() 
    ? attendanceSnapshot.val() as AttendanceRecord 
    : null;
  
  // Fetch target visits for the user (current + legacy paths)
  const visitsQuery = rtdbQuery(
    ref(realtimeDb, TARGET_VISITS_PATH),
    orderByChild("userId"),
    equalTo(userId)
  );
  const visitsSnapshot = await get(visitsQuery);
  const visitsList = visitsSnapshot.exists()
    ? (Object.values(visitsSnapshot.val()) as TargetVisit[])
    : [];

  const legacyRef = ref(realtimeDb, `${TARGET_VISITS_PATH}/${companyId}/${userId}`);
  const legacySnapshot = await get(legacyRef);
  const legacyVisits = legacySnapshot.exists()
    ? (Object.values(legacySnapshot.val()) as TargetVisit[])
    : [];

  const mergedVisits = new Map<string, TargetVisit>();
  [...visitsList, ...legacyVisits].forEach((visit) => {
    if (visit?.id) mergedVisits.set(visit.id, visit);
  });

  const isVisitOnDate = (visit: TargetVisit) => {
    const dates = [
      (visit as any).createdAt,
      visit.assignedAt,
      visit.completedAt,
      visit.skippedAt,
    ];
    return dates.some((ts) => typeof ts === "string" && ts.startsWith(date));
  };

  // Filter visits for the specific date
  const todayVisits: TargetVisit[] = Array.from(mergedVisits.values()).filter(
    (visit) => visit.companyId === companyId && isVisitOnDate(visit)
  );
  
  // Fetch location history for the day
  const locationRef = ref(realtimeDb, `${LOCATION_HISTORY_PATH}/${userId}`);
  const locationSnapshot = await get(locationRef);
  const locationHistory = locationSnapshot.exists()
    ? (Object.values(locationSnapshot.val()) as any[])
    : [];
  const todayLocationHistory = locationHistory.filter(
    (entry) => entry?.timestamp && String(entry.timestamp).startsWith(date)
  );
  
  // Calculate travel distance
  let totalDistanceKm = 0;
  const sortedLocations = todayLocationHistory.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  for (let i = 1; i < sortedLocations.length; i++) {
    const prev = sortedLocations[i - 1];
    const curr = sortedLocations[i];
    if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
      totalDistanceKm += calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }
  }
  
  // Process target visits - filter out undefined values for Firebase
  const targetVisitSummaries: TargetVisitSummary[] = todayVisits.map((visit) => {
    const summary: TargetVisitSummary = {
      targetId: visit.targetId,
      targetName: visit.targetName,
      targetAddress: visit.location?.address || "",
      visitStatus: visit.status as any,
      wasConverted: visit.leadStatus === "converted",
    };
    
    // Only add optional fields if they have values
    if (visit.reachedAt) summary.arrivalTime = visit.reachedAt;
    if (visit.completedAt || visit.skippedAt) summary.departureTime = visit.completedAt || visit.skippedAt;
    if (visit.durationMinutes !== undefined) summary.timeSpentMinutes = visit.durationMinutes;
    if (visit.outcome) summary.outcome = visit.outcome;
    if (visit.conversationNotes) summary.notes = visit.conversationNotes;
    if (visit.leadStatus) summary.leadStatus = visit.leadStatus;
    
    return summary;
  });
  
  // Calculate targets summary
  const completedVisits = todayVisits.filter((v) => v.status === "completed");
  const skippedVisits = todayVisits.filter((v) => v.status === "skipped");
  const pendingVisits = todayVisits.filter(
    (v) => v.status === "pending" || v.status === "in_transit"
  );
  const inProgressVisits = todayVisits.filter((v) => v.status === "in_progress");
  
  // Calculate leads summary
  const conversions = todayVisits.filter((v) => v.leadStatus === "converted");
  const followUps = todayVisits.filter((v) => v.outcome === "follow_up_needed");
  const notInterested = todayVisits.filter((v) => v.outcome === "not_interested");
  
  // Calculate time distribution
  const totalAtTargetsMinutes = todayVisits.reduce(
    (sum, v) => sum + (v.durationMinutes || 0),
    0
  );
  
  const workDurationMinutes = attendance?.workDurationMinutes || 0;
  const travelTimeMinutes = Math.max(0, workDurationMinutes - totalAtTargetsMinutes);
  
  // Calculate performance metrics
  const targetCompletionRate = todayVisits.length > 0
    ? Math.round((completedVisits.length / todayVisits.length) * 100)
    : 0;
  
  const avgTimePerTarget = completedVisits.length > 0
    ? Math.round(totalAtTargetsMinutes / completedVisits.length)
    : 0;
  
  // Punctuality score based on late status
  let punctualityScore = 100;
  if (attendance?.lateByMinutes) {
    punctualityScore = Math.max(0, 100 - attendance.lateByMinutes * 2);
  }
  
  // Productivity score (weighted average)
  const productivityScore = Math.round(
    targetCompletionRate * 0.4 +
    punctualityScore * 0.3 +
    (todayVisits.length > 0 ? 30 : 0)
  );
  
  // Create the report
  const reportId = `${userId}_${date}`;
  const report: DailyReport = {
    id: reportId,
    date,
    userId,
    userName,
    companyId,
    
    attendance: {
      ...(attendance?.checkIn?.timestamp ? { checkInTime: attendance.checkIn.timestamp } : {}),
      ...(attendance?.checkOut?.timestamp ? { checkOutTime: attendance.checkOut.timestamp } : {}),
      ...(attendance?.workDurationMinutes !== undefined ? { workDurationMinutes: attendance.workDurationMinutes } : {}),
      ...(attendance?.lateByMinutes !== undefined ? { lateByMinutes: attendance.lateByMinutes } : {}),
      ...(attendance?.earlyByMinutes !== undefined ? { earlyDepartureMinutes: attendance.earlyByMinutes } : {}),
      status: attendance 
        ? (attendance.status === "checked_out" || attendance.status === "checked_in" 
          ? "present" 
          : "absent")
        : "absent",
    },
    
    targets: {
      total: todayVisits.length,
      visited: completedVisits.length + skippedVisits.length + inProgressVisits.length,
      completed: completedVisits.length,
      skipped: skippedVisits.length,
      pending: pendingVisits.length,
      conversionRate: todayVisits.length > 0
        ? Math.round((conversions.length / todayVisits.length) * 100)
        : 0,
      visits: targetVisitSummaries,
    },
    
    travel: {
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalLocationsVisited: new Set(todayVisits.map((v) => v.targetId)).size,
      locationUpdates: locationHistory.length,
      ...(sortedLocations[0] ? {
        firstLocation: {
          latitude: sortedLocations[0].latitude,
          longitude: sortedLocations[0].longitude,
          address: sortedLocations[0].address || "",
          timestamp: sortedLocations[0].timestamp,
        }
      } : {}),
      ...(sortedLocations[sortedLocations.length - 1] ? {
        lastLocation: {
          latitude: sortedLocations[sortedLocations.length - 1].latitude,
          longitude: sortedLocations[sortedLocations.length - 1].longitude,
          address: sortedLocations[sortedLocations.length - 1].address || "",
          timestamp: sortedLocations[sortedLocations.length - 1].timestamp,
        }
      } : {}),
    },
    
    timeDistribution: {
      travelTimeMinutes,
      atTargetsMinutes: totalAtTargetsMinutes,
      idleTimeMinutes: 0, // Can be calculated if break tracking is implemented
      breakTimeMinutes: 0,
    },
    
    leads: {
      totalInteractions: todayVisits.length,
      newLeads: todayVisits.filter((v) => v.leadStatus === "new").length,
      followUps: followUps.length,
      converted: conversions.length,
      notInterested: notInterested.length,
    },
    
    performance: {
      targetCompletionRate,
      avgTimePerTarget,
      punctualityScore,
      productivityScore,
    },
    
    generatedAt: now,
    lastUpdatedAt: now,
    isAutoGenerated: true,
  };
  
  // Save to Firebase
  const reportRef = ref(realtimeDb, `${DAILY_REPORTS_PATH}/${reportId}`);
  await set(reportRef, report);
  
  return report;
};

// ==================== REPORT QUERIES ====================

// Get daily report for a user
export const getDailyReport = async (
  userId: string,
  date: string = getDateString()
): Promise<DailyReport | null> => {
  const reportId = `${userId}_${date}`;
  const reportRef = ref(realtimeDb, `${DAILY_REPORTS_PATH}/${reportId}`);
  const snapshot = await get(reportRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as DailyReport;
  }
  
  return null;
};

// Get or generate daily report
export const getOrGenerateDailyReport = async (
  userId: string,
  userName: string,
  companyId: string,
  date: string = getDateString()
): Promise<DailyReport> => {
  const existing = await getDailyReport(userId, date);
  
  if (existing) {
    return existing;
  }
  
  return generateDailyReport(userId, userName, companyId, date);
};

// Subscribe to daily report
export const subscribeToDailyReport = (
  userId: string,
  date: string,
  callback: (report: DailyReport | null) => void
): (() => void) => {
  const reportId = `${userId}_${date}`;
  const reportRef = ref(realtimeDb, `${DAILY_REPORTS_PATH}/${reportId}`);
  
  const unsubscribe = onValue(reportRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as DailyReport);
    } else {
      callback(null);
    }
  });
  
  return () => off(reportRef);
};

// Get reports for date range
export const getUserReportsForRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyReport[]> => {
  const reportsRef = ref(realtimeDb, DAILY_REPORTS_PATH);
  const snapshot = await get(reportsRef);
  
  if (!snapshot.exists()) return [];
  
  const allReports = snapshot.val();
  const reports: DailyReport[] = [];
  
  Object.values(allReports).forEach((report: any) => {
    if (
      report.userId === userId &&
      report.date >= startDate &&
      report.date <= endDate
    ) {
      reports.push(report as DailyReport);
    }
  });
  
  return reports.sort((a, b) => b.date.localeCompare(a.date));
};

// Get all company reports for a date
export const getCompanyDailyReports = async (
  companyId: string,
  date: string = getDateString()
): Promise<DailyReport[]> => {
  const reportsRef = ref(realtimeDb, DAILY_REPORTS_PATH);
  const snapshot = await get(reportsRef);
  
  if (!snapshot.exists()) return [];
  
  const allReports = snapshot.val();
  const reports: DailyReport[] = [];
  
  Object.values(allReports).forEach((report: any) => {
    if (report.companyId === companyId && report.date === date) {
      reports.push(report as DailyReport);
    }
  });
  
  return reports;
};

// Generate team daily report
export const generateTeamDailyReport = async (
  companyId: string,
  date: string = getDateString(),
  agentList: { id: string; name: string }[]
): Promise<TeamDailyReport> => {
  // Generate reports for all agents
  const reportPromises = agentList.map((agent) =>
    getOrGenerateDailyReport(agent.id, agent.name, companyId, date)
  );
  
  const reports = await Promise.all(reportPromises);
  
  // Calculate team totals
  const presentAgents = reports.filter((r) => r.attendance.status === "present");
  const absentAgents = reports.filter((r) => r.attendance.status === "absent");
  
  const totalTargetsVisited = reports.reduce((sum, r) => sum + r.targets.visited, 0);
  const totalTargetsCompleted = reports.reduce((sum, r) => sum + r.targets.completed, 0);
  const totalDistanceKm = reports.reduce((sum, r) => sum + r.travel.totalDistanceKm, 0);
  
  const avgProductivityScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.performance.productivityScore, 0) / reports.length)
    : 0;
  
  const avgWorkHours = presentAgents.length > 0
    ? Math.round(
        presentAgents.reduce((sum, r) => sum + (r.attendance.workDurationMinutes || 0), 0) /
        presentAgents.length / 60 * 10
      ) / 10
    : 0;
  
  // Get top performers
  const topPerformers = reports
    .filter((r) => r.attendance.status === "present")
    .sort((a, b) => b.performance.productivityScore - a.performance.productivityScore)
    .slice(0, 5)
    .map((r) => ({
      userId: r.userId,
      userName: r.userName,
      score: r.performance.productivityScore,
    }));
  
  // Create summaries
  const agentReports: DailyReportSummary[] = reports.map((r) => ({
    date: r.date,
    userId: r.userId,
    userName: r.userName,
    status: r.attendance.status,
    targetsVisited: r.targets.visited,
    targetsCompleted: r.targets.completed,
    distanceKm: r.travel.totalDistanceKm,
    workHours: Math.round((r.attendance.workDurationMinutes || 0) / 60 * 10) / 10,
    productivityScore: r.performance.productivityScore,
  }));
  
  return {
    date,
    companyId,
    totalAgents: agentList.length,
    presentAgents: presentAgents.length,
    absentAgents: absentAgents.length,
    totalTargetsVisited,
    totalTargetsCompleted,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    avgProductivityScore,
    avgWorkHours,
    topPerformers,
    agentReports,
  };
};

// ==================== EXPORT FUNCTIONS ====================

// Format report data for export
export const formatReportForExport = (report: DailyReport): Record<string, any> => {
  return {
    "Date": report.date,
    "Agent Name": report.userName,
    "Status": report.attendance.status,
    "Check In": report.attendance.checkInTime 
      ? new Date(report.attendance.checkInTime).toLocaleTimeString() 
      : "N/A",
    "Check Out": report.attendance.checkOutTime 
      ? new Date(report.attendance.checkOutTime).toLocaleTimeString() 
      : "N/A",
    "Work Duration (hrs)": report.attendance.workDurationMinutes 
      ? (report.attendance.workDurationMinutes / 60).toFixed(1) 
      : "0",
    "Late By (mins)": report.attendance.lateByMinutes || 0,
    "Targets Assigned": report.targets.total,
    "Targets Visited": report.targets.visited,
    "Targets Completed": report.targets.completed,
    "Targets Skipped": report.targets.skipped,
    "Completion Rate (%)": report.performance.targetCompletionRate,
    "Distance Traveled (km)": report.travel.totalDistanceKm,
    "Location Updates": report.travel.locationUpdates,
    "Leads Converted": report.leads.converted,
    "Follow-ups": report.leads.followUps,
    "Not Interested": report.leads.notInterested,
    "Productivity Score": report.performance.productivityScore,
    "Punctuality Score": report.performance.punctualityScore,
  };
};

// Format team report for export
export const formatTeamReportForExport = (
  teamReport: TeamDailyReport
): Record<string, any>[] => {
  return teamReport.agentReports.map((agent) => ({
    "Date": agent.date,
    "Agent Name": agent.userName,
    "Status": agent.status,
    "Targets Visited": agent.targetsVisited,
    "Targets Completed": agent.targetsCompleted,
    "Distance (km)": agent.distanceKm,
    "Work Hours": agent.workHours,
    "Productivity Score": agent.productivityScore,
  }));
};

// Generate CSV string
export const generateCSV = (data: Record<string, any>[]): string => {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? "");
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(",")
    ),
  ];
  
  return csvRows.join("\n");
};

// Download file utility
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export report to CSV
export const exportReportToCSV = (report: DailyReport, filename?: string) => {
  const data = [formatReportForExport(report)];
  const csv = generateCSV(data);
  downloadFile(
    csv,
    filename || `daily-report-${report.userName}-${report.date}.csv`,
    "text/csv"
  );
};

// Export team report to CSV
export const exportTeamReportToCSV = (teamReport: TeamDailyReport, filename?: string) => {
  const data = formatTeamReportForExport(teamReport);
  const csv = generateCSV(data);
  downloadFile(
    csv,
    filename || `team-report-${teamReport.date}.csv`,
    "text/csv"
  );
};

// Export multiple reports to CSV
export const exportReportsToCSV = (reports: DailyReport[], filename?: string) => {
  const data = reports.map(formatReportForExport);
  const csv = generateCSV(data);
  downloadFile(
    csv,
    filename || `reports-export-${getDateString()}.csv`,
    "text/csv"
  );
};
