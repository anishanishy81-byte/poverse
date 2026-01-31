// Attendance system types

export type AttendanceStatus = 
  | "checked_in"      // User has checked in
  | "checked_out"     // User has checked out
  | "absent"          // User didn't check in
  | "on_leave"        // User is on approved leave
  | "half_day";       // User worked half day

export type LateStatus = 
  | "on_time"         // Checked in before shift start
  | "late"            // Checked in after shift start
  | "very_late";      // Checked in significantly late (>30 mins)

export type EarlyDepartureStatus = 
  | "full_day"        // Checked out after shift end
  | "early"           // Checked out before shift end
  | "very_early";     // Checked out significantly early (>1 hour)

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
}

export interface CheckInData {
  location: AttendanceLocation;
  selfieUrl: string;
  selfieStoragePath: string;
  timestamp: string;
  deviceInfo?: string;
}

export interface CheckOutData {
  location: AttendanceLocation;
  timestamp: string;
  deviceInfo?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  date: string; // YYYY-MM-DD format
  
  // Check-in details
  checkIn?: CheckInData;
  
  // Check-out details
  checkOut?: CheckOutData;
  
  // Status tracking
  status: AttendanceStatus;
  lateStatus?: LateStatus;
  earlyDepartureStatus?: EarlyDepartureStatus;
  
  // Time calculations
  workDurationMinutes?: number;
  lateByMinutes?: number;
  earlyByMinutes?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Auto checkout flag
  isAutoCheckedOut?: boolean;
  autoCheckoutReason?: string;
}

export interface AttendanceSettings {
  companyId: string;
  shiftStartTime: string;  // HH:mm format (e.g., "09:00")
  shiftEndTime: string;    // HH:mm format (e.g., "18:00")
  lateThresholdMinutes: number;     // Minutes after shift start to be marked late
  veryLateThresholdMinutes: number; // Minutes after shift start to be marked very late
  earlyDepartureThresholdMinutes: number;  // Minutes before shift end for early departure
  autoCheckoutTime: string; // HH:mm format (e.g., "23:59")
  autoCheckoutEnabled: boolean;
  selfieRequired: boolean;
  locationRequired: boolean;
  workingDays: number[];   // 0 = Sunday, 1 = Monday, etc.
}

export interface DailyAttendanceSummary {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  earlyDeparture: number;
  averageWorkHours: number;
}

export interface MonthlyAttendanceSummary {
  userId: string;
  userName: string;
  month: string; // YYYY-MM format
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateDays: number;
  earlyDepartureDays: number;
  totalWorkHours: number;
  averageWorkHours: number;
  attendancePercentage: number;
}

export interface AttendanceCalendarDay {
  date: string;
  status: AttendanceStatus | "weekend" | "holiday" | "future";
  checkInTime?: string;
  checkOutTime?: string;
  workHours?: number;
  isLate?: boolean;
  isEarlyDeparture?: boolean;
}

// Default attendance settings
export const DEFAULT_ATTENDANCE_SETTINGS: Omit<AttendanceSettings, "companyId"> = {
  shiftStartTime: "09:00",
  shiftEndTime: "18:00",
  lateThresholdMinutes: 15,
  veryLateThresholdMinutes: 30,
  earlyDepartureThresholdMinutes: 60,
  autoCheckoutTime: "23:59",
  autoCheckoutEnabled: true,
  selfieRequired: true,
  locationRequired: true,
  workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
};
