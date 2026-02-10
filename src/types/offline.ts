// Offline Mode Types

// Action types that can be performed offline
export type OfflineActionType =
  | "visit_start"
  | "visit_complete"
  | "visit_update"
  | "attendance_checkin"
  | "attendance_checkout"
  | "location_update"
  | "target_note"
  | "report_submit"
  | "message_send";

// Sync status
export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

// Conflict resolution strategy
export type ConflictResolution = "local_wins" | "server_wins" | "merge" | "manual";

// Offline action base
export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  timestamp: string;
  userId: string;
  companyId: string;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  conflictData?: {
    localData: unknown;
    serverData: unknown;
    resolution?: ConflictResolution;
  };
  payload: unknown;
}

// Visit start action
export interface VisitStartAction extends OfflineAction {
  type: "visit_start";
  payload: {
    targetId: string;
    targetName: string;
    visitReason: string;
    visitReasonNote?: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
    };
    startTime: string;
  };
}

// Visit complete action
export interface VisitCompleteAction extends OfflineAction {
  type: "visit_complete";
  payload: {
    visitId: string;
    targetId: string;
    outcome: string;
    outcomeNote?: string;
    outcomeFlags?: string[];
    offersDiscussed?: string[];
    followUpDate?: string;
    leadStatus?: string;
    endTime: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    duration: number;
    distance?: number;
    photos?: string[]; // Base64 encoded
  };
}

// Visit update action
export interface VisitUpdateAction extends OfflineAction {
  type: "visit_update";
  payload: {
    visitId: string;
    updates: Record<string, unknown>;
  };
}

// Attendance check-in action
export interface AttendanceCheckinAction extends OfflineAction {
  type: "attendance_checkin";
  payload: {
    checkinTime: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
    };
    selfiePhoto?: string; // Base64 encoded
    deviceInfo?: {
      platform: string;
      userAgent: string;
    };
  };
}

// Attendance check-out action
export interface AttendanceCheckoutAction extends OfflineAction {
  type: "attendance_checkout";
  payload: {
    attendanceId: string;
    checkoutTime: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
    };
    selfiePhoto?: string;
    workSummary?: string;
    totalDistance?: number;
  };
}

// Location update action
export interface LocationUpdateAction extends OfflineAction {
  type: "location_update";
  payload: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  };
}

// Target note action
export interface TargetNoteAction extends OfflineAction {
  type: "target_note";
  payload: {
    targetId: string;
    visitId?: string;
    note: string;
    photos?: string[];
  };
}

// Report submit action
export interface ReportSubmitAction extends OfflineAction {
  type: "report_submit";
  payload: {
    date: string;
    summary: string;
    achievements: string[];
    challenges: string[];
    plannedVisits: number;
    completedVisits: number;
    totalDistance?: number;
  };
}

// Message send action
export interface MessageSendAction extends OfflineAction {
  type: "message_send";
  payload: {
    conversationId: string;
    receiverId: string;
    receiverName: string;
    content: string;
  };
}

// Union type for all actions
export type AnyOfflineAction =
  | VisitStartAction
  | VisitCompleteAction
  | VisitUpdateAction
  | AttendanceCheckinAction
  | AttendanceCheckoutAction
  | LocationUpdateAction
  | TargetNoteAction
  | ReportSubmitAction
  | MessageSendAction;

// Cached data types
export interface CachedTarget {
  id: string;
  name: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  visitReason: string;
  visitReasonNote?: string;
  priority?: string;
  deadline?: string;
  status: string;
  lastVisit?: string;
  cachedAt: string;
}

export interface CachedVisit {
  id: string;
  targetId: string;
  targetName: string;
  status: string;
  startTime?: string;
  endTime?: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  visitReason: string;
  outcome?: string;
  cachedAt: string;
  isOfflineCreated?: boolean;
}

export interface CachedAttendance {
  id: string;
  date: string;
  checkinTime?: string;
  checkoutTime?: string;
  status: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  cachedAt: string;
  isOfflineCreated?: boolean;
}

export interface CachedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  cachedAt: string;
}

// Offline storage state
export interface OfflineState {
  isOnline: boolean;
  lastOnline: string;
  lastSync: string;
  pendingActions: number;
  failedActions: number;
  conflictCount: number;
  cacheSize: number;
}

// Sync result
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: Array<{
    actionId: string;
    error: string;
  }>;
}

// Conflict info
export interface ConflictInfo {
  actionId: string;
  actionType: OfflineActionType;
  localTimestamp: string;
  serverTimestamp: string;
  localData: unknown;
  serverData: unknown;
  field?: string;
  description: string;
}

// IndexedDB store names
export const OFFLINE_STORES = {
  ACTIONS: "offlineActions",
  TARGETS: "cachedTargets",
  VISITS: "cachedVisits",
  ATTENDANCE: "cachedAttendance",
  USERS: "cachedUsers",
  SETTINGS: "offlineSettings",
} as const;

// Default settings
export const DEFAULT_OFFLINE_SETTINGS = {
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxQueueSize: 1000,
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  conflictResolution: "local_wins" as ConflictResolution,
  cacheTargets: true,
  cacheVisits: true,
  cacheAttendance: true,
};

export type OfflineSettings = typeof DEFAULT_OFFLINE_SETTINGS;
