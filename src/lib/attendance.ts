import { realtimeDb, storage } from "./firebase";
import {
  ref,
  set,
  get,
  update,
  onValue,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  off,
  DataSnapshot,
} from "firebase/database";
import {
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  LateStatus,
  EarlyDepartureStatus,
  AttendanceLocation,
  CheckInData,
  CheckOutData,
  MonthlyAttendanceSummary,
  AttendanceCalendarDay,
  DEFAULT_ATTENDANCE_SETTINGS,
} from "@/types/attendance";

// Realtime Database paths
const ATTENDANCE_PATH = "attendance";
const ATTENDANCE_SETTINGS_PATH = "attendanceSettings";

// ==================== UTILITY FUNCTIONS ====================

// Get today's date in YYYY-MM-DD format
export const getTodayDate = (): string => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// Get current time in HH:mm format
export const getCurrentTime = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

// Parse time string to minutes since midnight
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Calculate minutes difference
export const getMinutesDifference = (time1: string, time2: string): number => {
  return timeToMinutes(time1) - timeToMinutes(time2);
};

// Format minutes to hours and minutes string
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// Get device info
export const getDeviceInfo = (): string => {
  if (typeof window === "undefined") return "server";
  const userAgent = navigator.userAgent;
  let device = "Desktop";
  if (/Android/i.test(userAgent)) device = "Android";
  else if (/iPhone|iPad|iPod/i.test(userAgent)) device = "iOS";
  else if (/Mobile/i.test(userAgent)) device = "Mobile";
  return device;
};

// ==================== SETTINGS MANAGEMENT ====================

// Get attendance settings for a company
export const getAttendanceSettings = async (
  companyId: string
): Promise<AttendanceSettings> => {
  const settingsRef = ref(realtimeDb, `${ATTENDANCE_SETTINGS_PATH}/${companyId}`);
  const snapshot = await get(settingsRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as AttendanceSettings;
  }
  
  // Return default settings if none exist
  return {
    companyId,
    ...DEFAULT_ATTENDANCE_SETTINGS,
  };
};

// Update attendance settings
export const updateAttendanceSettings = async (
  companyId: string,
  settings: Partial<AttendanceSettings>
): Promise<void> => {
  const settingsRef = ref(realtimeDb, `${ATTENDANCE_SETTINGS_PATH}/${companyId}`);
  const currentSettings = await getAttendanceSettings(companyId);
  
  await set(settingsRef, {
    ...currentSettings,
    ...settings,
    companyId,
  });
};

// ==================== CHECK-IN / CHECK-OUT ====================

// Calculate late status based on check-in time and settings
const calculateLateStatus = (
  checkInTime: string,
  settings: AttendanceSettings
): { lateStatus: LateStatus; lateByMinutes: number } => {
  const checkInMinutes = timeToMinutes(checkInTime);
  const shiftStartMinutes = timeToMinutes(settings.shiftStartTime);
  const lateByMinutes = checkInMinutes - shiftStartMinutes;
  
  if (lateByMinutes <= 0) {
    return { lateStatus: "on_time", lateByMinutes: 0 };
  } else if (lateByMinutes <= settings.veryLateThresholdMinutes) {
    return { lateStatus: "late", lateByMinutes };
  } else {
    return { lateStatus: "very_late", lateByMinutes };
  }
};

// Calculate early departure status based on check-out time and settings
const calculateEarlyDepartureStatus = (
  checkOutTime: string,
  settings: AttendanceSettings
): { earlyDepartureStatus: EarlyDepartureStatus; earlyByMinutes: number } => {
  const checkOutMinutes = timeToMinutes(checkOutTime);
  const shiftEndMinutes = timeToMinutes(settings.shiftEndTime);
  const earlyByMinutes = shiftEndMinutes - checkOutMinutes;
  
  if (earlyByMinutes <= 0) {
    return { earlyDepartureStatus: "full_day", earlyByMinutes: 0 };
  } else if (earlyByMinutes <= settings.earlyDepartureThresholdMinutes) {
    return { earlyDepartureStatus: "early", earlyByMinutes };
  } else {
    return { earlyDepartureStatus: "very_early", earlyByMinutes };
  }
};

// Upload selfie to Firebase Storage
export const uploadSelfie = async (
  userId: string,
  date: string,
  selfieDataUrl: string
): Promise<{ url: string; path: string }> => {
  const path = `attendance/${userId}/${date}/selfie.jpg`;
  const selfieRef = storageRef(storage, path);
  
  // Upload base64 image
  await uploadString(selfieRef, selfieDataUrl, "data_url");
  
  // Get download URL
  const url = await getDownloadURL(selfieRef);
  
  return { url, path };
};

// Check in
export const checkIn = async (
  userId: string,
  userName: string,
  companyId: string,
  location: AttendanceLocation,
  selfieDataUrl: string
): Promise<AttendanceRecord> => {
  const date = getTodayDate();
  const now = new Date().toISOString();
  const currentTime = getCurrentTime();
  
  // Get company settings
  const settings = await getAttendanceSettings(companyId);
  
  // Upload selfie
  const { url: selfieUrl, path: selfieStoragePath } = await uploadSelfie(
    userId,
    date,
    selfieDataUrl
  );
  
  // Calculate late status
  const { lateStatus, lateByMinutes } = calculateLateStatus(currentTime, settings);
  
  // Create check-in data
  const checkInData: CheckInData = {
    location,
    selfieUrl,
    selfieStoragePath,
    timestamp: now,
    deviceInfo: getDeviceInfo(),
  };
  
  // Create attendance record
  const recordId = `${userId}_${date}`;
  const record: AttendanceRecord = {
    id: recordId,
    userId,
    userName,
    companyId,
    date,
    checkIn: checkInData,
    status: "checked_in",
    lateStatus,
    ...(lateByMinutes > 0 ? { lateByMinutes } : {}),
    createdAt: now,
    updatedAt: now,
  };
  
  // Save to Firebase
  const recordRef = ref(realtimeDb, `${ATTENDANCE_PATH}/${recordId}`);
  await set(recordRef, record);
  
  return record;
};

// Check out
export const checkOut = async (
  userId: string,
  location: AttendanceLocation,
  notes?: string
): Promise<AttendanceRecord | null> => {
  const date = getTodayDate();
  const now = new Date().toISOString();
  const currentTime = getCurrentTime();
  
  // Get existing attendance record
  const recordId = `${userId}_${date}`;
  const recordRef = ref(realtimeDb, `${ATTENDANCE_PATH}/${recordId}`);
  const snapshot = await get(recordRef);
  
  if (!snapshot.exists()) {
    throw new Error("No check-in record found for today");
  }
  
  const existingRecord = snapshot.val() as AttendanceRecord;
  
  if (existingRecord.checkOut) {
    throw new Error("Already checked out for today");
  }
  
  // Get company settings
  const settings = await getAttendanceSettings(existingRecord.companyId);
  
  // Calculate early departure status
  const { earlyDepartureStatus, earlyByMinutes } = calculateEarlyDepartureStatus(
    currentTime,
    settings
  );
  
  // Calculate work duration
  const checkInTime = new Date(existingRecord.checkIn!.timestamp);
  const checkOutTime = new Date(now);
  const workDurationMinutes = Math.round(
    (checkOutTime.getTime() - checkInTime.getTime()) / 60000
  );
  
  // Create check-out data
  const checkOutData: CheckOutData = {
    location,
    timestamp: now,
    deviceInfo: getDeviceInfo(),
    ...(notes ? { notes } : {}),
  };
  
  // Update record
  const updatedRecord: Partial<AttendanceRecord> = {
    checkOut: checkOutData,
    status: "checked_out",
    earlyDepartureStatus,
    ...(earlyByMinutes > 0 ? { earlyByMinutes } : {}),
    workDurationMinutes,
    updatedAt: now,
  };
  
  await update(recordRef, updatedRecord);
  
  return { ...existingRecord, ...updatedRecord } as AttendanceRecord;
};

// Auto check-out (called by scheduled job or admin)
export const autoCheckOut = async (
  userId: string,
  reason: string = "Auto checkout at end of day"
): Promise<void> => {
  const date = getTodayDate();
  const now = new Date().toISOString();
  
  const recordId = `${userId}_${date}`;
  const recordRef = ref(realtimeDb, `${ATTENDANCE_PATH}/${recordId}`);
  const snapshot = await get(recordRef);
  
  if (!snapshot.exists()) return;
  
  const record = snapshot.val() as AttendanceRecord;
  
  if (record.checkOut) return; // Already checked out
  
  // Get company settings for location placeholder
  const settings = await getAttendanceSettings(record.companyId);
  
  // Calculate work duration
  const checkInTime = new Date(record.checkIn!.timestamp);
  const checkOutTime = new Date(now);
  const workDurationMinutes = Math.round(
    (checkOutTime.getTime() - checkInTime.getTime()) / 60000
  );
  
  // Auto checkout with last known location or placeholder
  const checkOutData: CheckOutData = {
    location: record.checkIn!.location, // Use check-in location as fallback
    timestamp: now,
    deviceInfo: "system",
    notes: reason,
  };
  
  await update(recordRef, {
    checkOut: checkOutData,
    status: "checked_out",
    workDurationMinutes,
    isAutoCheckedOut: true,
    autoCheckoutReason: reason,
    updatedAt: now,
  });
};

// ==================== ATTENDANCE QUERIES ====================

// Get today's attendance for a user
export const getTodayAttendance = async (
  userId: string
): Promise<AttendanceRecord | null> => {
  const date = getTodayDate();
  const recordId = `${userId}_${date}`;
  const recordRef = ref(realtimeDb, `${ATTENDANCE_PATH}/${recordId}`);
  const snapshot = await get(recordRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as AttendanceRecord;
  }
  
  return null;
};

// Subscribe to today's attendance
export const subscribeToTodayAttendance = (
  userId: string,
  callback: (record: AttendanceRecord | null) => void
) => {
  const date = getTodayDate();
  const recordId = `${userId}_${date}`;
  const recordRef = ref(realtimeDb, `${ATTENDANCE_PATH}/${recordId}`);
  
  const unsubscribe = onValue(recordRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as AttendanceRecord);
    } else {
      callback(null);
    }
  });
  
  return () => off(recordRef);
};

// Get attendance history for a user (by month)
export const getUserAttendanceByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
  
  const attendanceRef = ref(realtimeDb, ATTENDANCE_PATH);
  const snapshot = await get(attendanceRef);
  
  const records: AttendanceRecord[] = [];
  
  snapshot.forEach((childSnapshot) => {
    const record = childSnapshot.val() as AttendanceRecord;
    if (
      record.userId === userId &&
      record.date >= startDate &&
      record.date <= endDate
    ) {
      records.push(record);
    }
  });
  
  return records.sort((a, b) => a.date.localeCompare(b.date));
};

// Get all attendance for a company on a specific date
export const getCompanyAttendanceByDate = async (
  companyId: string,
  date: string
): Promise<AttendanceRecord[]> => {
  const attendanceRef = ref(realtimeDb, ATTENDANCE_PATH);
  const snapshot = await get(attendanceRef);
  
  const records: AttendanceRecord[] = [];
  
  snapshot.forEach((childSnapshot) => {
    const record = childSnapshot.val() as AttendanceRecord;
    if (record.companyId === companyId && record.date === date) {
      records.push(record);
    }
  });
  
  return records;
};

// Subscribe to company attendance for a date (real-time)
export const subscribeToCompanyAttendance = (
  companyId: string,
  date: string,
  callback: (records: AttendanceRecord[]) => void
) => {
  const attendanceRef = ref(realtimeDb, ATTENDANCE_PATH);
  
  const unsubscribe = onValue(attendanceRef, (snapshot: DataSnapshot) => {
    const records: AttendanceRecord[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const record = childSnapshot.val() as AttendanceRecord;
      if (record.companyId === companyId && record.date === date) {
        records.push(record);
      }
    });
    
    callback(records);
  });
  
  return () => off(attendanceRef);
};

// ==================== REPORTS & SUMMARIES ====================

// Get monthly summary for a user
export const getUserMonthlySummary = async (
  userId: string,
  userName: string,
  year: number,
  month: number,
  companyId: string
): Promise<MonthlyAttendanceSummary> => {
  const records = await getUserAttendanceByMonth(userId, year, month);
  const settings = await getAttendanceSettings(companyId);
  
  // Calculate working days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  let totalWorkingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (settings.workingDays.includes(dayOfWeek)) {
      totalWorkingDays++;
    }
  }
  
  // Calculate summary
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let lateDays = 0;
  let earlyDepartureDays = 0;
  let totalWorkMinutes = 0;
  
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // Skip future dates
    if (year > currentYear || 
        (year === currentYear && month > currentMonth) ||
        (year === currentYear && month === currentMonth && day > currentDay)) {
      continue;
    }
    
    // Skip non-working days
    if (!settings.workingDays.includes(dayOfWeek)) {
      continue;
    }
    
    const record = records.find((r) => r.date === dateStr);
    
    if (record) {
      if (record.status === "on_leave") {
        leaveDays++;
      } else {
        presentDays++;
        if (record.lateStatus === "late" || record.lateStatus === "very_late") {
          lateDays++;
        }
        if (record.earlyDepartureStatus === "early" || record.earlyDepartureStatus === "very_early") {
          earlyDepartureDays++;
        }
        if (record.workDurationMinutes) {
          totalWorkMinutes += record.workDurationMinutes;
        }
      }
    } else {
      absentDays++;
    }
  }
  
  const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
  const averageWorkHours = presentDays > 0 ? Math.round((totalWorkHours / presentDays) * 10) / 10 : 0;
  const attendancePercentage = totalWorkingDays > 0 
    ? Math.round((presentDays / totalWorkingDays) * 100) 
    : 0;
  
  return {
    userId,
    userName,
    month: `${year}-${String(month).padStart(2, "0")}`,
    totalWorkingDays,
    presentDays,
    absentDays,
    leaveDays,
    lateDays,
    earlyDepartureDays,
    totalWorkHours,
    averageWorkHours,
    attendancePercentage,
  };
};

// Get calendar view data for a user
export const getUserAttendanceCalendar = async (
  userId: string,
  year: number,
  month: number,
  companyId: string
): Promise<AttendanceCalendarDay[]> => {
  const records = await getUserAttendanceByMonth(userId, year, month);
  const settings = await getAttendanceSettings(companyId);
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar: AttendanceCalendarDay[] = [];
  const today = new Date();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // Check if future date
    if (date > today) {
      calendar.push({
        date: dateStr,
        status: "future",
      });
      continue;
    }
    
    // Check if weekend/non-working day
    if (!settings.workingDays.includes(dayOfWeek)) {
      calendar.push({
        date: dateStr,
        status: "weekend",
      });
      continue;
    }
    
    const record = records.find((r) => r.date === dateStr);
    
    if (record) {
      const checkInTime = record.checkIn 
        ? new Date(record.checkIn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : undefined;
      const checkOutTime = record.checkOut
        ? new Date(record.checkOut.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : undefined;
      const workHours = record.workDurationMinutes 
        ? Math.round((record.workDurationMinutes / 60) * 10) / 10
        : undefined;
      
      calendar.push({
        date: dateStr,
        status: record.status,
        checkInTime,
        checkOutTime,
        workHours,
        isLate: record.lateStatus === "late" || record.lateStatus === "very_late",
        isEarlyDeparture: record.earlyDepartureStatus === "early" || record.earlyDepartureStatus === "very_early",
      });
    } else {
      calendar.push({
        date: dateStr,
        status: "absent",
      });
    }
  }
  
  return calendar;
};

// ==================== STATUS HELPERS ====================

export const getAttendanceStatusInfo = (status: AttendanceStatus) => {
  const statusMap: Record<AttendanceStatus, { label: string; color: string }> = {
    checked_in: { label: "Checked In", color: "#4caf50" },
    checked_out: { label: "Checked Out", color: "#2196f3" },
    absent: { label: "Absent", color: "#f44336" },
    on_leave: { label: "On Leave", color: "#ff9800" },
    half_day: { label: "Half Day", color: "#9c27b0" },
  };
  return statusMap[status];
};

export const getLateStatusInfo = (status: LateStatus) => {
  const statusMap: Record<LateStatus, { label: string; color: string }> = {
    on_time: { label: "On Time", color: "#4caf50" },
    late: { label: "Late", color: "#ff9800" },
    very_late: { label: "Very Late", color: "#f44336" },
  };
  return statusMap[status];
};

export const getEarlyDepartureStatusInfo = (status: EarlyDepartureStatus) => {
  const statusMap: Record<EarlyDepartureStatus, { label: string; color: string }> = {
    full_day: { label: "Full Day", color: "#4caf50" },
    early: { label: "Left Early", color: "#ff9800" },
    very_early: { label: "Left Very Early", color: "#f44336" },
  };
  return statusMap[status];
};
