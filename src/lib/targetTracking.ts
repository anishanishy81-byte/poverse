import { realtimeDb } from "./firebase";
import {
  ref,
  set,
  push,
  get,
  update,
  onValue,
  off,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import {
  Target,
  TargetVisit,
  TargetStatus,
  LeadStatus,
  VisitReason,
  OutcomeFlag,
  CreateTargetInput,
  CompleteVisitInput,
  TargetLocation,
} from "@/types/target";

// Realtime Database paths
const TARGETS_PATH = "targets";
const TARGET_VISITS_PATH = "targetVisits";
const USER_ACTIVE_VISITS_PATH = "userActiveVisits";
const ASSIGNMENTS_PATH = "targetAssignments";

const updateAssignmentStatus = async (
  visitId: string,
  userId: string,
  status: TargetStatus,
  extra?: { skipReason?: string }
): Promise<void> => {
  try {
    const visitRef = ref(realtimeDb, `${TARGET_VISITS_PATH}/${visitId}`);
    const visitSnapshot = await get(visitRef);
    if (!visitSnapshot.exists()) return;

    const visit = visitSnapshot.val() as TargetVisit & { assignmentId?: string };
    if (!visit.assignmentId || !visit.companyId) return;

    const assignmentRef = ref(
      realtimeDb,
      `${ASSIGNMENTS_PATH}/${visit.companyId}/${userId}/${visit.assignmentId}`
    );
    const assignmentSnap = await get(assignmentRef);
    if (!assignmentSnap.exists()) return;

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (status === "completed") {
      updates.status = "completed";
      updates.completedAt = now;
    } else if (status === "skipped") {
      updates.status = "cancelled";
      updates.cancelledAt = now;
      updates.cancelReason = extra?.skipReason || "Visit skipped";
    } else if (status === "in_progress" || status === "in_transit" || status === "reached") {
      updates.status = "in_progress";
    } else if (status === "pending") {
      updates.status = "pending";
    }

    await update(assignmentRef, updates);
  } catch (error) {
    console.error("Error updating assignment status:", error);
  }
};

// ==================== DISTANCE CALCULATION ====================

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const isWithinRadius = (
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number = 100
): boolean => {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= radiusMeters;
};

// ==================== TARGET MANAGEMENT ====================

export const createTarget = async (
  companyId: string,
  createdBy: string,
  input: CreateTargetInput
): Promise<Target> => {
  const targetsRef = ref(realtimeDb, TARGETS_PATH);
  const newTargetRef = push(targetsRef);
  const targetId = newTargetRef.key!;
  const now = new Date().toISOString();

  // Build target object without undefined values
  const target: Record<string, unknown> = {
    id: targetId,
    companyId,
    name: input.name,
    location: input.location,
    leadStatus: "new",
    totalVisits: 0,
    createdAt: now,
    createdBy,
    updatedAt: now,
    isActive: true,
  };

  // Only add optional fields if they have values
  if (input.description) target.description = input.description;
  if (input.category) target.category = input.category;
  if (input.contactPerson) target.contactPerson = input.contactPerson;
  if (input.contactPhone) target.contactPhone = input.contactPhone;
  if (input.contactEmail) target.contactEmail = input.contactEmail;

  await set(newTargetRef, target);
  return target as unknown as Target;
};

export const getTarget = async (targetId: string): Promise<Target | null> => {
  const targetRef = ref(realtimeDb, `${TARGETS_PATH}/${targetId}`);
  const snapshot = await get(targetRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as Target;
  }
  return null;
};

export const getCompanyTargets = async (companyId: string): Promise<Target[]> => {
  const targetsRef = ref(realtimeDb, TARGETS_PATH);
  const snapshot = await get(targetsRef);
  
  if (!snapshot.exists()) return [];
  
  const targets: Target[] = [];
  snapshot.forEach((child) => {
    const target = child.val() as Target;
    if (target.companyId === companyId && target.isActive) {
      targets.push(target);
    }
  });
  
  return targets;
};

export const updateTarget = async (
  targetId: string,
  updates: Partial<Target>
): Promise<void> => {
  const targetRef = ref(realtimeDb, `${TARGETS_PATH}/${targetId}`);
  await update(targetRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const subscribeToCompanyTargets = (
  companyId: string,
  callback: (targets: Target[]) => void
): (() => void) => {
  const targetsRef = ref(realtimeDb, TARGETS_PATH);
  
  onValue(targetsRef, (snapshot) => {
    const targets: Target[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const target = child.val() as Target;
        if (target.companyId === companyId && target.isActive) {
          targets.push(target);
        }
      });
    }
    callback(targets);
  });

  return () => off(targetsRef);
};

// ==================== VISIT MANAGEMENT ====================

export const assignTargetToUser = async (
  target: Target,
  userId: string,
  userName: string,
  assignedBy: string,
  visitReason: VisitReason,
  visitReasonNote?: string
): Promise<TargetVisit> => {
  const visitsRef = ref(realtimeDb, TARGET_VISITS_PATH);
  const newVisitRef = push(visitsRef);
  const visitId = newVisitRef.key!;
  const now = new Date().toISOString();

  // Build visit object without undefined values
  const visit: Record<string, unknown> = {
    id: visitId,
    targetId: target.id,
    userId,
    userName,
    companyId: target.companyId,
    targetName: target.name,
    location: target.location,
    visitReason,
    status: "pending",
    leadStatus: target.leadStatus || "new",
    outcomeFlags: [],
    offersDiscussed: [],
    assignedAt: now,
    createdAt: now,
    createdBy: assignedBy,
    updatedAt: now,
  };

  // Only add optional fields if they have values
  if (target.contactPerson) visit.contactPerson = target.contactPerson;
  if (target.contactPhone) visit.contactPhone = target.contactPhone;
  if (target.contactEmail) visit.contactEmail = target.contactEmail;
  if (visitReasonNote) visit.visitReasonNote = visitReasonNote;

  await set(newVisitRef, visit);

  // Also set as user's active visit
  const activeVisitRef = ref(realtimeDb, `${USER_ACTIVE_VISITS_PATH}/${userId}/${visitId}`);
  await set(activeVisitRef, { visitId, targetId: target.id, status: "pending" });

  return visit as unknown as TargetVisit;
};

export const getVisit = async (visitId: string): Promise<TargetVisit | null> => {
  const visitRef = ref(realtimeDb, `${TARGET_VISITS_PATH}/${visitId}`);
  const snapshot = await get(visitRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as TargetVisit;
  }
  return null;
};

export const getUserActiveVisits = async (userId: string): Promise<TargetVisit[]> => {
  const userVisitsRef = ref(realtimeDb, `${USER_ACTIVE_VISITS_PATH}/${userId}`);
  const snapshot = await get(userVisitsRef);
  
  if (!snapshot.exists()) return [];
  
  const visits: TargetVisit[] = [];
  const visitIds: string[] = [];
  
  snapshot.forEach((child) => {
    visitIds.push(child.val().visitId);
  });

  for (const visitId of visitIds) {
    const visit = await getVisit(visitId);
    if (visit && visit.status !== "completed" && visit.status !== "skipped") {
      visits.push(visit);
    }
  }
  
  return visits;
};

export const subscribeToUserActiveVisits = (
  userId: string,
  callback: (visits: TargetVisit[]) => void
): (() => void) => {
  const userVisitsRef = ref(realtimeDb, `${USER_ACTIVE_VISITS_PATH}/${userId}`);
  
  onValue(userVisitsRef, async (snapshot) => {
    const visits: TargetVisit[] = [];
    
    if (snapshot.exists()) {
      const visitIds: string[] = [];
      snapshot.forEach((child) => {
        const data = child.val();
        if (data.status !== "completed" && data.status !== "skipped") {
          visitIds.push(data.visitId);
        }
      });

      for (const visitId of visitIds) {
        const visit = await getVisit(visitId);
        if (visit) {
          visits.push(visit);
        }
      }
    }
    
    callback(visits);
  });

  return () => off(userVisitsRef);
};

export const updateVisitStatus = async (
  visitId: string,
  userId: string,
  status: TargetStatus,
  additionalData?: Record<string, unknown>
): Promise<void> => {
  const visitRef = ref(realtimeDb, `${TARGET_VISITS_PATH}/${visitId}`);
  const activeVisitRef = ref(realtimeDb, `${USER_ACTIVE_VISITS_PATH}/${userId}/${visitId}`);
  const now = new Date().toISOString();

  // Filter out undefined values from additionalData
  const cleanData: Record<string, unknown> = { status, updatedAt: now };
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });
  }

  await update(visitRef, cleanData);
  await update(activeVisitRef, { status });

  const skipReason =
    status === "skipped" && additionalData && typeof additionalData.skipReason === "string"
      ? additionalData.skipReason
      : undefined;
  await updateAssignmentStatus(visitId, userId, status, { skipReason });
};

export const startTransitToTarget = async (
  visitId: string,
  userId: string
): Promise<void> => {
  await updateVisitStatus(visitId, userId, "in_transit");
};

export const checkAndMarkReached = async (
  visitId: string,
  userId: string,
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number = 100
): Promise<{ success: boolean; distance: number; message: string }> => {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  
  if (distance > radiusMeters) {
    return {
      success: false,
      distance: Math.round(distance),
      message: `You are ${Math.round(distance)}m away. Please move closer (within ${radiusMeters}m) to mark as reached.`,
    };
  }

  await updateVisitStatus(visitId, userId, "reached", {
    reachedAt: new Date().toISOString(),
    reachedLocation: { latitude: userLat, longitude: userLon },
    distanceFromTarget: Math.round(distance),
  });

  return {
    success: true,
    distance: Math.round(distance),
    message: "Location reached! You can now start the timer.",
  };
};

export const startWorkTimer = async (
  visitId: string,
  userId: string
): Promise<void> => {
  await updateVisitStatus(visitId, userId, "in_progress", {
    timerStartedAt: new Date().toISOString(),
  });
};

export const completeVisit = async (
  visitId: string,
  userId: string,
  targetId: string,
  input: CompleteVisitInput
): Promise<void> => {
  const visit = await getVisit(visitId);
  if (!visit) throw new Error("Visit not found");

  const now = new Date().toISOString();
  
  let durationMinutes: number | null = null;
  if (visit.timerStartedAt) {
    const startTime = new Date(visit.timerStartedAt).getTime();
    const endTime = new Date().getTime();
    durationMinutes = Math.round((endTime - startTime) / 60000);
  }

  // Build update object without undefined
  const updateData: Record<string, unknown> = {
    conversationNotes: input.conversationNotes,
    outcome: input.outcome,
    leadStatus: input.leadStatus,
    outcomeFlags: input.outcomeFlags,
    offersDiscussed: input.offersDiscussed,
    timerEndedAt: now,
    completedAt: now,
  };
  
  if (durationMinutes !== null) updateData.durationMinutes = durationMinutes;
  if (input.nextFollowUpDate) updateData.nextFollowUpDate = input.nextFollowUpDate;

  await updateVisitStatus(visitId, userId, "completed", updateData);

  // Update the target
  const targetRef = ref(realtimeDb, `${TARGETS_PATH}/${targetId}`);
  const targetSnapshot = await get(targetRef);
  
  if (targetSnapshot.exists()) {
    const target = targetSnapshot.val() as Target;
    await update(targetRef, {
      leadStatus: input.leadStatus,
      lastVisitDate: now,
      lastVisitOutcome: input.outcome,
      lastOutcomeFlags: input.outcomeFlags,
      totalVisits: (target.totalVisits || 0) + 1,
      updatedAt: now,
    });
  }

  // Remove from active visits
  const activeVisitRef = ref(realtimeDb, `${USER_ACTIVE_VISITS_PATH}/${userId}/${visitId}`);
  await remove(activeVisitRef);
};

export const skipVisit = async (
  visitId: string,
  userId: string,
  reason: string
): Promise<void> => {
  await updateVisitStatus(visitId, userId, "skipped", {
    skippedAt: new Date().toISOString(),
    skipReason: reason,
  });

  const activeVisitRef = ref(realtimeDb, `${USER_ACTIVE_VISITS_PATH}/${userId}/${visitId}`);
  await remove(activeVisitRef);
};

export const getTargetVisitHistory = async (targetId: string): Promise<TargetVisit[]> => {
  const visitsRef = ref(realtimeDb, TARGET_VISITS_PATH);
  const snapshot = await get(visitsRef);
  
  if (!snapshot.exists()) return [];
  
  const visits: TargetVisit[] = [];
  snapshot.forEach((child) => {
    const visit = child.val() as TargetVisit;
    if (visit.targetId === targetId) {
      visits.push(visit);
    }
  });
  
  return visits.sort((a, b) => 
    new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
  );
};

export const getUserVisitHistory = async (
  userId: string,
  limit: number = 50
): Promise<TargetVisit[]> => {
  try {
    // Query visits by userId using Firebase query
    const visitsRef = ref(realtimeDb, TARGET_VISITS_PATH);
    const userVisitsQuery = query(
      visitsRef,
      orderByChild("userId"),
      equalTo(userId)
    );
    const snapshot = await get(userVisitsQuery);
    
    if (!snapshot.exists()) return [];
    
    const visits: TargetVisit[] = [];
    snapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      visits.push(visit);
    });
    
    return visits
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching user visit history:", error);
    // Fallback to fetching all and filtering
    const visitsRef = ref(realtimeDb, TARGET_VISITS_PATH);
    const snapshot = await get(visitsRef);
    
    if (!snapshot.exists()) return [];
    
    const visits: TargetVisit[] = [];
    snapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.userId === userId) {
        visits.push(visit);
      }
    });
    
    return visits
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
      .slice(0, limit);
  }
};

// Subscribe to all user visits (including completed) for real-time updates
export const subscribeToUserAllVisits = (
  userId: string,
  callback: (visits: TargetVisit[]) => void,
  limit: number = 100
): (() => void) => {
  const visitsRef = ref(realtimeDb, TARGET_VISITS_PATH);
  
  const unsubscribe = onValue(visitsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const visits: TargetVisit[] = [];
    snapshot.forEach((child) => {
      const visit = child.val() as TargetVisit;
      if (visit.userId === userId) {
        visits.push(visit);
      }
    });
    
    callback(
      visits
        .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
        .slice(0, limit)
    );
  });
  
  return () => off(visitsRef);
};

// ==================== DISPLAY INFO ====================

export const getLeadStatusInfo = (status: LeadStatus): { label: string; color: string } => {
  const statusMap: Record<LeadStatus, { label: string; color: string }> = {
    new: { label: "New", color: "#2196f3" },
    contacted: { label: "Contacted", color: "#9c27b0" },
    interested: { label: "Interested", color: "#4caf50" },
    not_interested: { label: "Not Interested", color: "#f44336" },
    follow_up: { label: "Follow Up", color: "#ff9800" },
    converted: { label: "Converted", color: "#00c853" },
    lost: { label: "Lost", color: "#757575" },
  };
  return statusMap[status];
};

export const getTargetStatusInfo = (status: TargetStatus): { label: string; color: string } => {
  const statusMap: Record<TargetStatus, { label: string; color: string }> = {
    pending: { label: "Pending", color: "#9e9e9e" },
    in_transit: { label: "In Transit", color: "#2196f3" },
    reached: { label: "Reached", color: "#ff9800" },
    in_progress: { label: "In Progress", color: "#9c27b0" },
    completed: { label: "Completed", color: "#4caf50" },
    skipped: { label: "Skipped", color: "#f44336" },
  };
  return statusMap[status];
};

export const getVisitReasonInfo = (reason: VisitReason): { label: string; color: string; icon: string } => {
  const reasonMap: Record<VisitReason, { label: string; color: string; icon: string }> = {
    sales_pitch: { label: "Sales Pitch", color: "#4caf50", icon: "💼" },
    follow_up_visit: { label: "Follow-up Visit", color: "#ff9800", icon: "🔄" },
    product_demo: { label: "Product Demo", color: "#2196f3", icon: "📱" },
    payment_collection: { label: "Payment Collection", color: "#f44336", icon: "💰" },
    customer_support: { label: "Customer Support", color: "#9c27b0", icon: "🛠️" },
    survey: { label: "Survey", color: "#00bcd4", icon: "📋" },
    delivery: { label: "Delivery", color: "#795548", icon: "📦" },
    maintenance: { label: "Maintenance", color: "#607d8b", icon: "🔧" },
    new_lead: { label: "New Lead", color: "#e91e63", icon: "🆕" },
    relationship_building: { label: "Relationship Building", color: "#673ab7", icon: "🤝" },
    complaint_resolution: { label: "Complaint Resolution", color: "#ff5722", icon: "⚠️" },
    contract_renewal: { label: "Contract Renewal", color: "#009688", icon: "📄" },
    other: { label: "Other", color: "#9e9e9e", icon: "📌" },
  };
  return reasonMap[reason];
};

export const getOutcomeFlagInfo = (flag: OutcomeFlag): { label: string; color: string; icon: string } => {
  const flagMap: Record<OutcomeFlag, { label: string; color: string; icon: string }> = {
    needs_follow_up: { label: "Needs Follow-up", color: "#ff9800", icon: "📞" },
    interested: { label: "Interested", color: "#4caf50", icon: "👍" },
    not_interested: { label: "Not Interested", color: "#f44336", icon: "👎" },
    deal_closed: { label: "Deal Closed", color: "#00c853", icon: "🎉" },
    callback_requested: { label: "Callback Requested", color: "#2196f3", icon: "📱" },
    send_quotation: { label: "Send Quotation", color: "#9c27b0", icon: "📧" },
    schedule_demo: { label: "Schedule Demo", color: "#673ab7", icon: "📅" },
    escalate_to_manager: { label: "Escalate to Manager", color: "#ff5722", icon: "⬆️" },
    competitor_using: { label: "Using Competitor", color: "#795548", icon: "🏢" },
    budget_constraint: { label: "Budget Constraint", color: "#607d8b", icon: "💸" },
    decision_pending: { label: "Decision Pending", color: "#00bcd4", icon: "⏳" },
    wrong_contact: { label: "Wrong Contact", color: "#9e9e9e", icon: "❌" },
    not_available: { label: "Not Available", color: "#757575", icon: "🚫" },
  };
  return flagMap[flag];
};

// Lists for UI
export const VISIT_REASONS: VisitReason[] = [
  "sales_pitch",
  "follow_up_visit",
  "product_demo",
  "payment_collection",
  "customer_support",
  "survey",
  "delivery",
  "maintenance",
  "new_lead",
  "relationship_building",
  "complaint_resolution",
  "contract_renewal",
  "other",
];

export const OUTCOME_FLAGS: OutcomeFlag[] = [
  "needs_follow_up",
  "interested",
  "not_interested",
  "deal_closed",
  "callback_requested",
  "send_quotation",
  "schedule_demo",
  "escalate_to_manager",
  "competitor_using",
  "budget_constraint",
  "decision_pending",
  "wrong_contact",
  "not_available",
];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "follow_up",
  "converted",
  "lost",
];
