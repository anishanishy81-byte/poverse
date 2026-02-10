// Offline Sync Service
// Handles syncing offline actions with the server

import { realtimeDb, db } from "./firebase";
import { ref, set, get, update } from "firebase/database";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  AnyOfflineAction,
  SyncResult,
  ConflictInfo,
  VisitStartAction,
  VisitCompleteAction,
  AttendanceCheckinAction,
  AttendanceCheckoutAction,
  MessageSendAction,
  LocationUpdateAction,
} from "@/types/offline";
import {
  getPendingActions,
  markActionSynced,
  markActionFailed,
  markActionConflict,
  updateLastSync,
  getOfflineSettings,
  getCachedTarget,
  getCachedVisit,
  cacheVisit,
  cacheAttendance,
  detectConflict,
} from "./offlineStorage";
import { assignTargetToUser, completeVisit, getVisit } from "./targetTracking";
import { checkIn, checkOut } from "./attendance";
import { sendMessage } from "./chat";
import { updateUserLocation } from "./locationTracking";
import { Target, VisitReason, LeadStatus, OutcomeFlag, TargetOffer } from "@/types/target";

// ==================== SYNC ENGINE ====================

let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;

export const syncOfflineActions = async (userId: string, companyId: string): Promise<SyncResult> => {
  if (isSyncing) {
    return { success: false, synced: 0, failed: 0, conflicts: 0, errors: [] };
  }

  if (!navigator.onLine) {
    return { success: false, synced: 0, failed: 0, conflicts: 0, errors: [{ actionId: "", error: "No internet connection" }] };
  }

  isSyncing = true;
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    const actions = await getPendingActions(userId);

    for (const action of actions) {
      try {
        await syncAction(action, companyId);
        await markActionSynced(action.id);
        result.synced++;
      } catch (error) {
        const errorMessage = String(error);
        
        // Check if it's a conflict
        if (errorMessage.includes("CONFLICT")) {
          result.conflicts++;
          // Conflict handling is done in syncAction
        } else {
          await markActionFailed(action.id, errorMessage);
          result.failed++;
          result.errors.push({ actionId: action.id, error: errorMessage });
        }
      }
    }

    await updateLastSync();
    result.success = result.failed === 0 && result.conflicts === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({ actionId: "", error: String(error) });
  } finally {
    isSyncing = false;
  }

  return result;
};

const syncAction = async (action: AnyOfflineAction, companyId: string): Promise<void> => {
  switch (action.type) {
    case "visit_start":
      await syncVisitStart(action as VisitStartAction, companyId);
      break;
    case "visit_complete":
      await syncVisitComplete(action as VisitCompleteAction, companyId);
      break;
    case "attendance_checkin":
      await syncAttendanceCheckin(action as AttendanceCheckinAction, companyId);
      break;
    case "attendance_checkout":
      await syncAttendanceCheckout(action as AttendanceCheckoutAction, companyId);
      break;
    case "message_send":
      await syncMessageSend(action as MessageSendAction);
      break;
    case "location_update":
      await syncLocationUpdate(action as LocationUpdateAction, companyId);
      break;
    default:
      console.warn("Unknown action type:", action.type);
  }
};

// ==================== SYNC HANDLERS ====================

const syncVisitStart = async (action: VisitStartAction, companyId: string): Promise<void> => {
  const { payload } = action;
  
  // Check if visit already exists (in case of duplicate sync)
  const existingVisit = await getCachedVisit(action.id);
  if (existingVisit && !existingVisit.isOfflineCreated) {
    return; // Already synced
  }

  // Get user info
  const userRef = doc(db, "users", action.userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  const userData = userSnap.data();

  // Get target info
  const cachedTarget = await getCachedTarget(payload.targetId);
  if (!cachedTarget) {
    throw new Error("Target not found in cache");
  }

  // Build a minimal Target object for assignTargetToUser
  const now = new Date().toISOString();
  const target = {
    id: cachedTarget.id,
    name: cachedTarget.name,
    location: cachedTarget.location,
    companyId: action.companyId,
    leadStatus: "new" as LeadStatus,
    contactPerson: cachedTarget.contactPerson,
    contactPhone: cachedTarget.contactPhone,
    contactEmail: cachedTarget.contactEmail,
    totalVisits: 0,
    createdAt: now,
    createdBy: action.userId,
    updatedAt: now,
    isActive: true,
  } as Target;

  // Start visit on server using assignTargetToUser
  const visit = await assignTargetToUser(
    target,
    action.userId,
    userData.name,
    action.userId, // assignedBy
    payload.visitReason as VisitReason,
    payload.visitReasonNote
  );

  // Update local cache with server ID
  await cacheVisit({
    id: visit.id,
    targetId: payload.targetId,
    targetName: payload.targetName,
    status: "pending",
    startTime: payload.startTime,
    location: cachedTarget.location,
    visitReason: payload.visitReason,
    cachedAt: new Date().toISOString(),
    isOfflineCreated: false,
  });
};

const syncVisitComplete = async (action: VisitCompleteAction, companyId: string): Promise<void> => {
  const { payload } = action;

  // Check for conflicts - get server state
  const visit = await getVisit(payload.visitId);
  
  if (visit) {
    // If visit is already completed on server, check for conflict
    if (visit.status === "completed" && visit.completedAt !== payload.endTime) {
      const conflict = detectConflict(
        payload as unknown as Record<string, unknown>,
        visit as unknown as Record<string, unknown>,
        action.timestamp,
        visit.updatedAt || ""
      );
      
      if (conflict) {
        await markActionConflict(action.id, payload, visit);
        throw new Error("CONFLICT: Visit already completed on server");
      }
    }
  }

  // Complete visit using the proper function
  await completeVisit(
    payload.visitId,
    action.userId,
    payload.targetId,
    {
      conversationNotes: payload.outcomeNote || "",
      outcome: payload.outcome,
      leadStatus: (payload.leadStatus as LeadStatus) || "contacted",
      outcomeFlags: (payload.outcomeFlags || []) as unknown as OutcomeFlag[],
      offersDiscussed: [] as TargetOffer[],
      nextFollowUpDate: payload.followUpDate,
    }
  );

  // Update local cache
  const cachedVisit = await getCachedVisit(payload.visitId);
  if (cachedVisit) {
    await cacheVisit({
      ...cachedVisit,
      status: "completed",
      endTime: payload.endTime,
      outcome: payload.outcome,
      isOfflineCreated: false,
    });
  }
};

const syncAttendanceCheckin = async (action: AttendanceCheckinAction, companyId: string): Promise<void> => {
  const { payload } = action;

  // Get user info
  const userRef = doc(db, "users", action.userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  const userData = userSnap.data();

  // Check if already checked in today
  const today = new Date().toISOString().split("T")[0];
  const attendanceRef = ref(realtimeDb, `attendance/${action.userId}_${today}`);
  const serverSnapshot = await get(attendanceRef);
  
  if (serverSnapshot.exists()) {
    const serverData = serverSnapshot.val();
    if (serverData.checkIn) {
      // Already checked in - detect conflict
      if (serverData.checkIn.timestamp !== payload.checkinTime) {
        await markActionConflict(action.id, payload, serverData);
        throw new Error("CONFLICT: Already checked in on server");
      }
      return; // Same check-in, no need to sync
    }
  }

  // Note: checkIn requires a selfie, which may not be available offline
  // For offline check-in, we store the selfie data URL in the payload
  await checkIn(action.userId, userData.name, companyId, {
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    accuracy: payload.location.accuracy || null,
    address: payload.location.address,
  }, payload.selfiePhoto || "");

  // Update local cache
  await cacheAttendance({
    id: `${action.userId}_${today}`,
    date: today,
    checkinTime: payload.checkinTime,
    status: "checked_in",
    location: payload.location,
    cachedAt: new Date().toISOString(),
    isOfflineCreated: false,
  });
};

const syncAttendanceCheckout = async (action: AttendanceCheckoutAction, companyId: string): Promise<void> => {
  const { payload } = action;

  // Check server state
  const today = new Date().toISOString().split("T")[0];
  const attendanceRef = ref(realtimeDb, `attendance/${action.userId}_${today}`);
  const serverSnapshot = await get(attendanceRef);
  
  if (serverSnapshot.exists()) {
    const serverData = serverSnapshot.val();
    if (serverData.checkOut && serverData.checkOut.timestamp !== payload.checkoutTime) {
      await markActionConflict(action.id, payload, serverData);
      throw new Error("CONFLICT: Already checked out on server");
    }
  }

  await checkOut(action.userId, {
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    accuracy: payload.location.accuracy || null,
    address: payload.location.address,
  }, payload.workSummary);

  // Update local cache
  await cacheAttendance({
    id: `${action.userId}_${today}`,
    date: today,
    checkoutTime: payload.checkoutTime,
    status: "checked_out",
    location: payload.location,
    cachedAt: new Date().toISOString(),
    isOfflineCreated: false,
  });
};

const syncMessageSend = async (action: MessageSendAction): Promise<void> => {
  const { payload } = action;

  // Get user info
  const userRef = doc(db, "users", action.userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  const userData = userSnap.data();

  await sendMessage(
    payload.conversationId,
    action.userId,
    userData.name,
    userData.role,
    payload.receiverId,
    payload.receiverName,
    payload.content
  );
};

const syncLocationUpdate = async (action: LocationUpdateAction, companyId: string): Promise<void> => {
  const { payload } = action;

  // Get user info for name
  const userRef = doc(db, "users", action.userId);
  const userSnap = await getDoc(userRef);
  const userName = userSnap.exists() ? userSnap.data().name : undefined;

  await updateUserLocation(
    action.userId,
    payload.latitude,
    payload.longitude,
    payload.accuracy || null,
    companyId,
    userName
  );
};

// ==================== AUTO SYNC ====================

export const startAutoSync = (userId: string, companyId: string, intervalMs?: number): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  const interval = intervalMs || 30000; // Default 30 seconds

  syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      await syncOfflineActions(userId, companyId);
    }
  }, interval);

  // Also sync immediately when coming online
  window.addEventListener("online", async () => {
    await syncOfflineActions(userId, companyId);
  });
};

export const stopAutoSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};

// ==================== MANUAL SYNC TRIGGER ====================

export const triggerSync = async (userId: string, companyId: string): Promise<SyncResult> => {
  if (!navigator.onLine) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: [{ actionId: "", error: "No internet connection" }],
    };
  }

  return syncOfflineActions(userId, companyId);
};

// ==================== SYNC STATUS ====================

export const isSyncInProgress = (): boolean => {
  return isSyncing;
};
