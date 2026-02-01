// Leave Management Types

// Leave types available
export type LeaveType = "sick" | "casual" | "earned" | "unpaid" | "maternity" | "paternity" | "bereavement";

// Leave status
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

// Leave duration type
export type LeaveDuration = "full_day" | "half_day_morning" | "half_day_afternoon";

// Leave request
export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  
  // Leave details
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: LeaveDuration;
  totalDays: number;
  
  // Reason and notes
  reason: string;
  attachmentUrl?: string;
  attachmentPath?: string;
  
  // Status
  status: LeaveStatus;
  
  // Approval info
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Leave balance for a user
export interface LeaveBalance {
  userId: string;
  companyId: string;
  year: number;
  
  // Balances by type
  sick: LeaveBalanceDetail;
  casual: LeaveBalanceDetail;
  earned: LeaveBalanceDetail;
  unpaid: LeaveBalanceDetail;
  maternity: LeaveBalanceDetail;
  paternity: LeaveBalanceDetail;
  bereavement: LeaveBalanceDetail;
  
  // Metadata
  updatedAt: string;
}

// Detail for each leave type
export interface LeaveBalanceDetail {
  total: number;       // Total allocated for the year
  used: number;        // Used so far
  pending: number;     // Pending approval
  available: number;   // Available = total - used - pending
  carryForward: number; // Carried from previous year
}

// Leave policy for a company
export interface LeavePolicy {
  companyId: string;
  
  // Default allocations per year
  sickLeavePerYear: number;
  casualLeavePerYear: number;
  earnedLeavePerYear: number;
  unpaidLeavePerYear: number;
  maternityLeavePerYear: number;
  paternityLeavePerYear: number;
  bereavementLeavePerYear: number;
  
  // Policy settings
  allowHalfDay: boolean;
  requireAttachment: boolean;
  minDaysBeforeRequest: number; // Minimum days before leave start to request
  maxConsecutiveDays: number;   // Maximum consecutive leave days
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number;
  
  // Approval settings
  autoApproveEnabled: boolean;
  autoApproveDays: number; // Auto approve if within this many days
  
  // Metadata
  updatedAt: string;
}

// Leave calendar event
export interface LeaveCalendarEvent {
  id: string;
  userId: string;
  userName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: LeaveDuration;
  status: LeaveStatus;
  totalDays: number;
}

// Leave request input
export interface LeaveRequestInput {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: LeaveDuration;
  reason: string;
  attachmentDataUrl?: string;
}

// Leave approval input
export interface LeaveApprovalInput {
  approved: boolean;
  rejectionReason?: string;
}

// Leave summary for dashboard
export interface LeaveSummary {
  totalLeavesTaken: number;
  totalLeavesRemaining: number;
  pendingRequests: number;
  upcomingLeaves: LeaveRequest[];
  recentLeaves: LeaveRequest[];
}

// Monthly leave stats
export interface MonthlyLeaveStats {
  month: number;
  year: number;
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  byType: Record<LeaveType, number>;
}

// Leave type info for display
export interface LeaveTypeInfo {
  type: LeaveType;
  label: string;
  description: string;
  color: string;
  icon: string;
  requiresAttachment: boolean;
}

// Leave type configurations
export const LEAVE_TYPES: LeaveTypeInfo[] = [
  {
    type: "sick",
    label: "Sick Leave",
    description: "Leave for illness or medical appointments",
    color: "#f44336",
    icon: "LocalHospital",
    requiresAttachment: true,
  },
  {
    type: "casual",
    label: "Casual Leave",
    description: "Leave for personal matters or emergencies",
    color: "#2196f3",
    icon: "EventNote",
    requiresAttachment: false,
  },
  {
    type: "earned",
    label: "Earned Leave",
    description: "Planned leave earned through service",
    color: "#4caf50",
    icon: "Stars",
    requiresAttachment: false,
  },
  {
    type: "unpaid",
    label: "Unpaid Leave",
    description: "Leave without pay",
    color: "#9e9e9e",
    icon: "MoneyOff",
    requiresAttachment: false,
  },
  {
    type: "maternity",
    label: "Maternity Leave",
    description: "Leave for pregnancy and childbirth",
    color: "#e91e63",
    icon: "ChildCare",
    requiresAttachment: true,
  },
  {
    type: "paternity",
    label: "Paternity Leave",
    description: "Leave for new fathers",
    color: "#3f51b5",
    icon: "Face",
    requiresAttachment: true,
  },
  {
    type: "bereavement",
    label: "Bereavement Leave",
    description: "Leave for family loss",
    color: "#607d8b",
    icon: "Favorite",
    requiresAttachment: false,
  },
];

// Default leave policy
export const DEFAULT_LEAVE_POLICY: Omit<LeavePolicy, "companyId" | "updatedAt"> = {
  sickLeavePerYear: 12,
  casualLeavePerYear: 12,
  earnedLeavePerYear: 15,
  unpaidLeavePerYear: 30,
  maternityLeavePerYear: 180,
  paternityLeavePerYear: 15,
  bereavementLeavePerYear: 5,
  allowHalfDay: true,
  requireAttachment: false,
  minDaysBeforeRequest: 1,
  maxConsecutiveDays: 30,
  carryForwardEnabled: true,
  maxCarryForwardDays: 5,
  autoApproveEnabled: false,
  autoApproveDays: 1,
};

// Default leave balance
export const DEFAULT_LEAVE_BALANCE: Omit<LeaveBalance, "userId" | "companyId" | "year" | "updatedAt"> = {
  sick: { total: 12, used: 0, pending: 0, available: 12, carryForward: 0 },
  casual: { total: 12, used: 0, pending: 0, available: 12, carryForward: 0 },
  earned: { total: 15, used: 0, pending: 0, available: 15, carryForward: 0 },
  unpaid: { total: 30, used: 0, pending: 0, available: 30, carryForward: 0 },
  maternity: { total: 180, used: 0, pending: 0, available: 180, carryForward: 0 },
  paternity: { total: 15, used: 0, pending: 0, available: 15, carryForward: 0 },
  bereavement: { total: 5, used: 0, pending: 0, available: 5, carryForward: 0 },
};

// Get leave type info
export const getLeaveTypeInfo = (type: LeaveType): LeaveTypeInfo => {
  return LEAVE_TYPES.find((t) => t.type === type) || LEAVE_TYPES[0];
};

// Get status color
export const getLeaveStatusColor = (status: LeaveStatus): string => {
  switch (status) {
    case "pending":
      return "#ff9800";
    case "approved":
      return "#4caf50";
    case "rejected":
      return "#f44336";
    case "cancelled":
      return "#9e9e9e";
    default:
      return "#9e9e9e";
  }
};

// Get status label
export const getLeaveStatusLabel = (status: LeaveStatus): string => {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

// Calculate business days between two dates
export const calculateBusinessDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Calculate leave days based on duration
export const calculateLeaveDays = (
  startDate: string,
  endDate: string,
  duration: LeaveDuration
): number => {
  const businessDays = calculateBusinessDays(startDate, endDate);
  
  if (duration === "half_day_morning" || duration === "half_day_afternoon") {
    return businessDays * 0.5;
  }
  
  return businessDays;
};

// Format date range
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    month: "short", 
    day: "numeric",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined
  };
  
  if (startDate === endDate) {
    return start.toLocaleDateString("en-US", { ...options, year: "numeric" });
  }
  
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
};

// Get duration label
export const getDurationLabel = (duration: LeaveDuration): string => {
  switch (duration) {
    case "full_day":
      return "Full Day";
    case "half_day_morning":
      return "Half Day (Morning)";
    case "half_day_afternoon":
      return "Half Day (Afternoon)";
    default:
      return duration;
  }
};
