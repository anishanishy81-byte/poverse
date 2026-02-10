// Leave Management Library
// Handles leave requests, approvals, and balance tracking

import { realtimeDb, storage } from "./firebase";
import {
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  DataSnapshot,
} from "firebase/database";
import {
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import {
  LeaveRequest,
  LeaveBalance,
  LeaveBalanceDetail,
  LeavePolicy,
  LeaveType,
  LeaveStatus,
  LeaveDuration,
  LeaveRequestInput,
  LeaveApprovalInput,
  LeaveSummary,
  LeaveCalendarEvent,
  MonthlyLeaveStats,
  DEFAULT_LEAVE_POLICY,
  DEFAULT_LEAVE_BALANCE,
  calculateLeaveDays,
  getLeaveTypeInfo,
} from "@/types/leave";
import { createNotification } from "./notifications";

// Database paths
const LEAVE_REQUESTS_PATH = "leaveRequests";
const LEAVE_BALANCES_PATH = "leaveBalances";
const LEAVE_POLICIES_PATH = "leavePolicies";

// ==================== LEAVE POLICY ====================

// Get leave policy for a company
export const getLeavePolicy = async (companyId: string): Promise<LeavePolicy> => {
  const policyRef = ref(realtimeDb, `${LEAVE_POLICIES_PATH}/${companyId}`);
  const snapshot = await get(policyRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as LeavePolicy;
  }
  
  // Return default policy if none exists
  return {
    companyId,
    ...DEFAULT_LEAVE_POLICY,
    updatedAt: new Date().toISOString(),
  };
};

// Update leave policy
export const updateLeavePolicy = async (
  companyId: string,
  policy: Partial<LeavePolicy>
): Promise<void> => {
  const policyRef = ref(realtimeDb, `${LEAVE_POLICIES_PATH}/${companyId}`);
  const currentPolicy = await getLeavePolicy(companyId);
  
  await set(policyRef, {
    ...currentPolicy,
    ...policy,
    companyId,
    updatedAt: new Date().toISOString(),
  });
};

// ==================== LEAVE BALANCE ====================

// Get leave balance for a user
export const getLeaveBalance = async (
  userId: string,
  companyId: string,
  year?: number
): Promise<LeaveBalance> => {
  const currentYear = year || new Date().getFullYear();
  const balanceRef = ref(realtimeDb, `${LEAVE_BALANCES_PATH}/${userId}/${currentYear}`);
  const snapshot = await get(balanceRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as LeaveBalance;
  }
  
  // Initialize default balance if none exists
  const policy = await getLeavePolicy(companyId);
  const defaultBalance: LeaveBalance = {
    userId,
    companyId,
    year: currentYear,
    sick: { total: policy.sickLeavePerYear, used: 0, pending: 0, available: policy.sickLeavePerYear, carryForward: 0 },
    casual: { total: policy.casualLeavePerYear, used: 0, pending: 0, available: policy.casualLeavePerYear, carryForward: 0 },
    earned: { total: policy.earnedLeavePerYear, used: 0, pending: 0, available: policy.earnedLeavePerYear, carryForward: 0 },
    unpaid: { total: policy.unpaidLeavePerYear, used: 0, pending: 0, available: policy.unpaidLeavePerYear, carryForward: 0 },
    maternity: { total: policy.maternityLeavePerYear, used: 0, pending: 0, available: policy.maternityLeavePerYear, carryForward: 0 },
    paternity: { total: policy.paternityLeavePerYear, used: 0, pending: 0, available: policy.paternityLeavePerYear, carryForward: 0 },
    bereavement: { total: policy.bereavementLeavePerYear, used: 0, pending: 0, available: policy.bereavementLeavePerYear, carryForward: 0 },
    updatedAt: new Date().toISOString(),
  };
  
  await set(balanceRef, defaultBalance);
  return defaultBalance;
};

// Update leave balance
export const updateLeaveBalance = async (
  userId: string,
  year: number,
  leaveType: LeaveType,
  updates: Partial<LeaveBalanceDetail>
): Promise<void> => {
  const balanceRef = ref(realtimeDb, `${LEAVE_BALANCES_PATH}/${userId}/${year}/${leaveType}`);
  await update(balanceRef, updates);
  
  // Update timestamp
  const timestampRef = ref(realtimeDb, `${LEAVE_BALANCES_PATH}/${userId}/${year}/updatedAt`);
  await set(timestampRef, new Date().toISOString());
};

// Recalculate available balance
const recalculateAvailable = (detail: LeaveBalanceDetail): number => {
  return detail.total + detail.carryForward - detail.used - detail.pending;
};

// Subscribe to leave balance
export const subscribeToLeaveBalance = (
  userId: string,
  companyId: string,
  year: number,
  callback: (balance: LeaveBalance) => void
): (() => void) => {
  const balanceRef = ref(realtimeDb, `${LEAVE_BALANCES_PATH}/${userId}/${year}`);
  
  const unsubscribe = onValue(balanceRef, async (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as LeaveBalance);
    } else {
      // Initialize balance if it doesn't exist
      const balance = await getLeaveBalance(userId, companyId, year);
      callback(balance);
    }
  });
  
  return () => unsubscribe();
};

// ==================== LEAVE REQUESTS ====================

// Upload attachment
const uploadAttachment = async (
  userId: string,
  requestId: string,
  dataUrl: string
): Promise<{ url: string; path: string }> => {
  const path = `leave/${userId}/${requestId}/attachment.jpg`;
  const attachmentRef = storageRef(storage, path);
  
  await uploadString(attachmentRef, dataUrl, "data_url");
  const url = await getDownloadURL(attachmentRef);
  
  return { url, path };
};

// Create leave request
export const createLeaveRequest = async (
  userId: string,
  userName: string,
  companyId: string,
  input: LeaveRequestInput
): Promise<LeaveRequest> => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  const newRequestRef = push(requestsRef);
  const requestId = newRequestRef.key!;
  const now = new Date().toISOString();
  
  // Calculate total days
  const totalDays = calculateLeaveDays(input.startDate, input.endDate, input.duration);
  
  // Check balance
  const currentYear = new Date(input.startDate).getFullYear();
  const balance = await getLeaveBalance(userId, companyId, currentYear);
  const leaveTypeBalance = balance[input.leaveType];
  
  if (leaveTypeBalance.available < totalDays) {
    throw new Error(`Insufficient ${input.leaveType} leave balance. Available: ${leaveTypeBalance.available} days, Requested: ${totalDays} days`);
  }
  
  // Upload attachment if provided
  let attachmentUrl: string | undefined;
  let attachmentPath: string | undefined;
  
  if (input.attachmentDataUrl) {
    const result = await uploadAttachment(userId, requestId, input.attachmentDataUrl);
    attachmentUrl = result.url;
    attachmentPath = result.path;
  }
  
  // Create request
  const request: LeaveRequest = {
    id: requestId,
    userId,
    userName,
    companyId,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    duration: input.duration,
    totalDays,
    reason: input.reason,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  
  if (attachmentUrl) request.attachmentUrl = attachmentUrl;
  if (attachmentPath) request.attachmentPath = attachmentPath;
  
  await set(newRequestRef, request);
  
  // Update pending balance
  await updateLeaveBalance(userId, currentYear, input.leaveType, {
    pending: leaveTypeBalance.pending + totalDays,
    available: leaveTypeBalance.available - totalDays,
  });
  
  // Note: Admin notification would be sent via a separate admin notification system
  // For now, admins will see pending requests in their leave management dashboard
  
  return request;
};

// Get leave request by ID
export const getLeaveRequest = async (requestId: string): Promise<LeaveRequest | null> => {
  const requestRef = ref(realtimeDb, `${LEAVE_REQUESTS_PATH}/${requestId}`);
  const snapshot = await get(requestRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as LeaveRequest;
  }
  return null;
};

// Get user's leave requests
export const getUserLeaveRequests = async (
  userId: string,
  status?: LeaveStatus
): Promise<LeaveRequest[]> => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  const snapshot = await get(requestsRef);
  
  if (!snapshot.exists()) return [];
  
  const requests: LeaveRequest[] = [];
  snapshot.forEach((child) => {
    const request = child.val() as LeaveRequest;
    if (request.userId === userId) {
      if (!status || request.status === status) {
        requests.push(request);
      }
    }
  });
  
  // Sort by created date (newest first)
  return requests.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Get company's leave requests
export const getCompanyLeaveRequests = async (
  companyId: string,
  status?: LeaveStatus
): Promise<LeaveRequest[]> => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  const snapshot = await get(requestsRef);
  
  if (!snapshot.exists()) return [];
  
  const requests: LeaveRequest[] = [];
  snapshot.forEach((child) => {
    const request = child.val() as LeaveRequest;
    if (request.companyId === companyId) {
      if (!status || request.status === status) {
        requests.push(request);
      }
    }
  });
  
  // Sort by created date (newest first)
  return requests.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Subscribe to user's leave requests
export const subscribeToUserLeaveRequests = (
  userId: string,
  callback: (requests: LeaveRequest[]) => void
): (() => void) => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  
  const unsubscribe = onValue(requestsRef, (snapshot: DataSnapshot) => {
    const requests: LeaveRequest[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const request = child.val() as LeaveRequest;
        if (request.userId === userId) {
          requests.push(request);
        }
      });
    }
    
    // Sort by created date (newest first)
    callback(requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  });
  
  return () => unsubscribe();
};

// Subscribe to company's pending leave requests
export const subscribeToPendingLeaveRequests = (
  companyId: string,
  callback: (requests: LeaveRequest[]) => void
): (() => void) => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  
  const unsubscribe = onValue(requestsRef, (snapshot: DataSnapshot) => {
    const requests: LeaveRequest[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const request = child.val() as LeaveRequest;
        if (request.companyId === companyId && request.status === "pending") {
          requests.push(request);
        }
      });
    }
    
    // Sort by created date (oldest first for approval queue)
    callback(requests.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));
  });
  
  return () => unsubscribe();
};

// Subscribe to all company leave requests
export const subscribeToCompanyLeaveRequests = (
  companyId: string,
  callback: (requests: LeaveRequest[]) => void
): (() => void) => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  
  const unsubscribe = onValue(requestsRef, (snapshot: DataSnapshot) => {
    const requests: LeaveRequest[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const request = child.val() as LeaveRequest;
        if (request.companyId === companyId) {
          requests.push(request);
        }
      });
    }
    
    // Sort by created date (newest first)
    callback(requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  });
  
  return () => unsubscribe();
};

// ==================== LEAVE APPROVAL ====================

// Approve leave request
export const approveLeaveRequest = async (
  requestId: string,
  approverId: string,
  approverName: string
): Promise<void> => {
  const request = await getLeaveRequest(requestId);
  if (!request) throw new Error("Leave request not found");
  if (request.status !== "pending") throw new Error("Leave request is not pending");
  
  const now = new Date().toISOString();
  const requestRef = ref(realtimeDb, `${LEAVE_REQUESTS_PATH}/${requestId}`);
  
  // Update request status
  await update(requestRef, {
    status: "approved",
    approvedBy: approverId,
    approverName,
    approvedAt: now,
    updatedAt: now,
  });
  
  // Update balance: move from pending to used
  const year = new Date(request.startDate).getFullYear();
  const balance = await getLeaveBalance(request.userId, request.companyId, year);
  const leaveTypeBalance = balance[request.leaveType];
  
  await updateLeaveBalance(request.userId, year, request.leaveType, {
    pending: Math.max(0, leaveTypeBalance.pending - request.totalDays),
    used: leaveTypeBalance.used + request.totalDays,
    available: recalculateAvailable({
      ...leaveTypeBalance,
      pending: Math.max(0, leaveTypeBalance.pending - request.totalDays),
      used: leaveTypeBalance.used + request.totalDays,
    }),
  });
  
  // Send notification to user
  try {
    const leaveTypeInfo = getLeaveTypeInfo(request.leaveType);
    await createNotification(request.companyId, {
      userId: request.userId,
      type: "approval_granted",
      title: "Leave Approved",
      body: `Your ${leaveTypeInfo.label} request has been approved`,
      senderId: approverId,
      senderName: approverName,
      clickAction: "/leave",
      relatedType: "attendance",
      relatedId: requestId,
    });
  } catch (error) {
    console.error("Failed to send leave approval notification:", error);
  }
};

// Reject leave request
export const rejectLeaveRequest = async (
  requestId: string,
  approverId: string,
  approverName: string,
  rejectionReason: string
): Promise<void> => {
  const request = await getLeaveRequest(requestId);
  if (!request) throw new Error("Leave request not found");
  if (request.status !== "pending") throw new Error("Leave request is not pending");
  
  const now = new Date().toISOString();
  const requestRef = ref(realtimeDb, `${LEAVE_REQUESTS_PATH}/${requestId}`);
  
  // Update request status
  await update(requestRef, {
    status: "rejected",
    approvedBy: approverId,
    approverName,
    approvedAt: now,
    rejectionReason,
    updatedAt: now,
  });
  
  // Restore balance: remove from pending, add back to available
  const year = new Date(request.startDate).getFullYear();
  const balance = await getLeaveBalance(request.userId, request.companyId, year);
  const leaveTypeBalance = balance[request.leaveType];
  
  await updateLeaveBalance(request.userId, year, request.leaveType, {
    pending: Math.max(0, leaveTypeBalance.pending - request.totalDays),
    available: leaveTypeBalance.available + request.totalDays,
  });
  
  // Send notification to user
  try {
    const leaveTypeInfo = getLeaveTypeInfo(request.leaveType);
    await createNotification(request.companyId, {
      userId: request.userId,
      type: "approval_rejected",
      title: "Leave Rejected",
      body: `Your ${leaveTypeInfo.label} request has been rejected: ${rejectionReason}`,
      senderId: approverId,
      senderName: approverName,
      clickAction: "/leave",
      relatedType: "attendance",
      relatedId: requestId,
    });
  } catch (error) {
    console.error("Failed to send leave rejection notification:", error);
  }
};

// Cancel leave request (by user)
export const cancelLeaveRequest = async (requestId: string): Promise<void> => {
  const request = await getLeaveRequest(requestId);
  if (!request) throw new Error("Leave request not found");
  if (request.status !== "pending" && request.status !== "approved") {
    throw new Error("Cannot cancel this leave request");
  }
  
  const now = new Date().toISOString();
  const requestRef = ref(realtimeDb, `${LEAVE_REQUESTS_PATH}/${requestId}`);
  
  // Update request status
  await update(requestRef, {
    status: "cancelled",
    updatedAt: now,
  });
  
  // Restore balance
  const year = new Date(request.startDate).getFullYear();
  const balance = await getLeaveBalance(request.userId, request.companyId, year);
  const leaveTypeBalance = balance[request.leaveType];
  
  if (request.status === "pending") {
    // Was pending: remove from pending, add to available
    await updateLeaveBalance(request.userId, year, request.leaveType, {
      pending: Math.max(0, leaveTypeBalance.pending - request.totalDays),
      available: leaveTypeBalance.available + request.totalDays,
    });
  } else if (request.status === "approved") {
    // Was approved: remove from used, add to available
    await updateLeaveBalance(request.userId, year, request.leaveType, {
      used: Math.max(0, leaveTypeBalance.used - request.totalDays),
      available: leaveTypeBalance.available + request.totalDays,
    });
  }
};

// ==================== LEAVE CALENDAR ====================

// Get leave calendar events for a company
export const getLeaveCalendarEvents = async (
  companyId: string,
  startDate: string,
  endDate: string
): Promise<LeaveCalendarEvent[]> => {
  const requests = await getCompanyLeaveRequests(companyId);
  
  const events: LeaveCalendarEvent[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (const request of requests) {
    const requestStart = new Date(request.startDate);
    const requestEnd = new Date(request.endDate);
    
    // Check if request overlaps with the date range
    if (requestEnd >= start && requestStart <= end) {
      if (request.status === "approved" || request.status === "pending") {
        events.push({
          id: request.id,
          userId: request.userId,
          userName: request.userName,
          leaveType: request.leaveType,
          startDate: request.startDate,
          endDate: request.endDate,
          duration: request.duration,
          status: request.status,
          totalDays: request.totalDays,
        });
      }
    }
  }
  
  return events;
};

// Subscribe to leave calendar events
export const subscribeToLeaveCalendar = (
  companyId: string,
  callback: (events: LeaveCalendarEvent[]) => void
): (() => void) => {
  const requestsRef = ref(realtimeDb, LEAVE_REQUESTS_PATH);
  
  const unsubscribe = onValue(requestsRef, (snapshot: DataSnapshot) => {
    const events: LeaveCalendarEvent[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const request = child.val() as LeaveRequest;
        if (request.companyId === companyId && 
            (request.status === "approved" || request.status === "pending")) {
          events.push({
            id: request.id,
            userId: request.userId,
            userName: request.userName,
            leaveType: request.leaveType,
            startDate: request.startDate,
            endDate: request.endDate,
            duration: request.duration,
            status: request.status,
            totalDays: request.totalDays,
          });
        }
      });
    }
    
    callback(events);
  });
  
  return () => unsubscribe();
};

// ==================== LEAVE SUMMARY & STATS ====================

// Get leave summary for a user
export const getLeaveSummary = async (
  userId: string,
  companyId: string
): Promise<LeaveSummary> => {
  const currentYear = new Date().getFullYear();
  const balance = await getLeaveBalance(userId, companyId, currentYear);
  const requests = await getUserLeaveRequests(userId);
  
  const today = new Date().toISOString().split("T")[0];
  
  // Calculate totals
  let totalLeavesTaken = 0;
  let totalLeavesRemaining = 0;
  
  for (const leaveType of ["sick", "casual", "earned", "unpaid", "maternity", "paternity", "bereavement"] as LeaveType[]) {
    totalLeavesTaken += balance[leaveType].used;
    totalLeavesRemaining += balance[leaveType].available;
  }
  
  // Get upcoming and recent leaves
  const upcomingLeaves = requests.filter(
    (r) => r.status === "approved" && r.startDate > today
  ).slice(0, 5);
  
  const recentLeaves = requests.filter(
    (r) => r.status === "approved" && r.endDate <= today
  ).slice(0, 5);
  
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  
  return {
    totalLeavesTaken,
    totalLeavesRemaining,
    pendingRequests,
    upcomingLeaves,
    recentLeaves,
  };
};

// Get monthly leave stats for a company
export const getMonthlyLeaveStats = async (
  companyId: string,
  year: number,
  month: number
): Promise<MonthlyLeaveStats> => {
  const requests = await getCompanyLeaveRequests(companyId);
  
  const stats: MonthlyLeaveStats = {
    month,
    year,
    totalRequests: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    byType: {
      sick: 0,
      casual: 0,
      earned: 0,
      unpaid: 0,
      maternity: 0,
      paternity: 0,
      bereavement: 0,
    },
  };
  
  for (const request of requests) {
    const requestDate = new Date(request.startDate);
    if (requestDate.getFullYear() === year && requestDate.getMonth() + 1 === month) {
      stats.totalRequests++;
      stats.byType[request.leaveType]++;
      
      if (request.status === "approved") stats.approved++;
      else if (request.status === "rejected") stats.rejected++;
      else if (request.status === "pending") stats.pending++;
    }
  }
  
  return stats;
};

// Initialize leave balance for new year
export const initializeYearlyBalance = async (
  userId: string,
  companyId: string,
  year: number
): Promise<void> => {
  const policy = await getLeavePolicy(companyId);
  const previousYear = year - 1;
  
  // Get previous year balance for carry forward
  let carryForward: Record<LeaveType, number> = {
    sick: 0,
    casual: 0,
    earned: 0,
    unpaid: 0,
    maternity: 0,
    paternity: 0,
    bereavement: 0,
  };
  
  if (policy.carryForwardEnabled) {
    try {
      const previousBalance = await getLeaveBalance(userId, companyId, previousYear);
      const maxCarry = policy.maxCarryForwardDays;
      
      for (const leaveType of ["earned"] as LeaveType[]) { // Usually only earned leaves are carried forward
        const available = previousBalance[leaveType].available;
        carryForward[leaveType] = Math.min(available, maxCarry);
      }
    } catch {
      // No previous balance, that's okay
    }
  }
  
  const newBalance: LeaveBalance = {
    userId,
    companyId,
    year,
    sick: { total: policy.sickLeavePerYear, used: 0, pending: 0, available: policy.sickLeavePerYear + carryForward.sick, carryForward: carryForward.sick },
    casual: { total: policy.casualLeavePerYear, used: 0, pending: 0, available: policy.casualLeavePerYear + carryForward.casual, carryForward: carryForward.casual },
    earned: { total: policy.earnedLeavePerYear, used: 0, pending: 0, available: policy.earnedLeavePerYear + carryForward.earned, carryForward: carryForward.earned },
    unpaid: { total: policy.unpaidLeavePerYear, used: 0, pending: 0, available: policy.unpaidLeavePerYear, carryForward: 0 },
    maternity: { total: policy.maternityLeavePerYear, used: 0, pending: 0, available: policy.maternityLeavePerYear, carryForward: 0 },
    paternity: { total: policy.paternityLeavePerYear, used: 0, pending: 0, available: policy.paternityLeavePerYear, carryForward: 0 },
    bereavement: { total: policy.bereavementLeavePerYear, used: 0, pending: 0, available: policy.bereavementLeavePerYear, carryForward: 0 },
    updatedAt: new Date().toISOString(),
  };
  
  const balanceRef = ref(realtimeDb, `${LEAVE_BALANCES_PATH}/${userId}/${year}`);
  await set(balanceRef, newBalance);
};
