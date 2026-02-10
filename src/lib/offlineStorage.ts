// Offline Storage and Sync Library
// Uses IndexedDB for persistent offline storage

import {
  OfflineAction,
  AnyOfflineAction,
  OfflineActionType,
  SyncStatus,
  SyncResult,
  ConflictInfo,
  ConflictResolution,
  CachedTarget,
  CachedVisit,
  CachedAttendance,
  OfflineState,
  OfflineSettings,
  OFFLINE_STORES,
  DEFAULT_OFFLINE_SETTINGS,
  VisitStartAction,
  VisitCompleteAction,
  AttendanceCheckinAction,
  AttendanceCheckoutAction,
  MessageSendAction,
} from "@/types/offline";

// Re-export types for convenience
export type { CachedTarget, CachedVisit, CachedAttendance };

// IndexedDB database name and version
const DB_NAME = "poverse_offline";
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// ==================== DATABASE INITIALIZATION ====================

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open offline database:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains(OFFLINE_STORES.ACTIONS)) {
        const actionsStore = database.createObjectStore(OFFLINE_STORES.ACTIONS, { keyPath: "id" });
        actionsStore.createIndex("status", "status", { unique: false });
        actionsStore.createIndex("type", "type", { unique: false });
        actionsStore.createIndex("timestamp", "timestamp", { unique: false });
        actionsStore.createIndex("userId", "userId", { unique: false });
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORES.TARGETS)) {
        const targetsStore = database.createObjectStore(OFFLINE_STORES.TARGETS, { keyPath: "id" });
        targetsStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORES.VISITS)) {
        const visitsStore = database.createObjectStore(OFFLINE_STORES.VISITS, { keyPath: "id" });
        visitsStore.createIndex("targetId", "targetId", { unique: false });
        visitsStore.createIndex("cachedAt", "cachedAt", { unique: false });
        visitsStore.createIndex("isOfflineCreated", "isOfflineCreated", { unique: false });
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORES.ATTENDANCE)) {
        const attendanceStore = database.createObjectStore(OFFLINE_STORES.ATTENDANCE, { keyPath: "id" });
        attendanceStore.createIndex("date", "date", { unique: false });
        attendanceStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORES.USERS)) {
        database.createObjectStore(OFFLINE_STORES.USERS, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORES.SETTINGS)) {
        database.createObjectStore(OFFLINE_STORES.SETTINGS, { keyPath: "key" });
      }
    };
  });
};

// ==================== GENERIC DB OPERATIONS ====================

const getStore = async (storeName: string, mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> => {
  const database = await initOfflineDB();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

const dbGet = async <T>(storeName: string, key: string): Promise<T | null> => {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const dbGetByIndex = async <T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> => {
  const store = await getStore(storeName);
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const dbPut = async <T>(storeName: string, data: T): Promise<void> => {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const dbDelete = async (storeName: string, key: string): Promise<void> => {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const dbClear = async (storeName: string): Promise<void> => {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ==================== OFFLINE ACTION QUEUE ====================

export const generateOfflineId = (): string => {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const queueOfflineAction = async <T extends AnyOfflineAction>(
  type: OfflineActionType,
  userId: string,
  companyId: string,
  payload: T["payload"]
): Promise<string> => {
  const id = generateOfflineId();
  const action: OfflineAction = {
    id,
    type,
    timestamp: new Date().toISOString(),
    userId,
    companyId,
    status: "pending",
    retryCount: 0,
    maxRetries: DEFAULT_OFFLINE_SETTINGS.maxRetries,
    payload,
  };

  await dbPut(OFFLINE_STORES.ACTIONS, action);
  return id;
};

export const getQueuedActions = async (
  userId?: string,
  status?: SyncStatus
): Promise<AnyOfflineAction[]> => {
  let actions = await dbGetAll<AnyOfflineAction>(OFFLINE_STORES.ACTIONS);

  if (userId) {
    actions = actions.filter((a) => a.userId === userId);
  }

  if (status) {
    actions = actions.filter((a) => a.status === status);
  }

  // Sort by timestamp
  actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return actions;
};

export const getPendingActions = async (userId?: string): Promise<AnyOfflineAction[]> => {
  return getQueuedActions(userId, "pending");
};

export const getFailedActions = async (userId?: string): Promise<AnyOfflineAction[]> => {
  return getQueuedActions(userId, "failed");
};

export const getConflictActions = async (userId?: string): Promise<AnyOfflineAction[]> => {
  return getQueuedActions(userId, "conflict");
};

export const updateActionStatus = async (
  actionId: string,
  status: SyncStatus,
  error?: string
): Promise<void> => {
  const action = await dbGet<AnyOfflineAction>(OFFLINE_STORES.ACTIONS, actionId);
  if (!action) return;

  action.status = status;
  if (error) {
    action.lastError = error;
    action.retryCount = (action.retryCount || 0) + 1;
  }

  await dbPut(OFFLINE_STORES.ACTIONS, action);
};

export const markActionSynced = async (actionId: string): Promise<void> => {
  await dbDelete(OFFLINE_STORES.ACTIONS, actionId);
};

export const markActionFailed = async (actionId: string, error: string): Promise<void> => {
  const action = await dbGet<AnyOfflineAction>(OFFLINE_STORES.ACTIONS, actionId);
  if (!action) return;

  action.status = action.retryCount >= action.maxRetries ? "failed" : "pending";
  action.lastError = error;
  action.retryCount = (action.retryCount || 0) + 1;

  await dbPut(OFFLINE_STORES.ACTIONS, action);
};

export const markActionConflict = async (
  actionId: string,
  localData: unknown,
  serverData: unknown
): Promise<void> => {
  const action = await dbGet<AnyOfflineAction>(OFFLINE_STORES.ACTIONS, actionId);
  if (!action) return;

  action.status = "conflict";
  action.conflictData = { localData, serverData };

  await dbPut(OFFLINE_STORES.ACTIONS, action);
};

export const resolveConflict = async (
  actionId: string,
  resolution: ConflictResolution,
  mergedData?: unknown
): Promise<void> => {
  const action = await dbGet<AnyOfflineAction>(OFFLINE_STORES.ACTIONS, actionId);
  if (!action || !action.conflictData) return;

  if (resolution === "server_wins") {
    // Discard local changes
    await dbDelete(OFFLINE_STORES.ACTIONS, actionId);
  } else if (resolution === "local_wins" || resolution === "merge") {
    // Retry with original or merged data
    action.status = "pending";
    action.retryCount = 0;
    if (resolution === "merge" && mergedData) {
      (action as any).payload = mergedData;
    }
    action.conflictData.resolution = resolution;
    await dbPut(OFFLINE_STORES.ACTIONS, action);
  }
};

export const clearQueue = async (userId?: string): Promise<void> => {
  if (userId) {
    const actions = await getQueuedActions(userId);
    for (const action of actions) {
      await dbDelete(OFFLINE_STORES.ACTIONS, action.id);
    }
  } else {
    await dbClear(OFFLINE_STORES.ACTIONS);
  }
};

// ==================== CACHE OPERATIONS ====================

// Targets cache
export const cacheTarget = async (target: CachedTarget): Promise<void> => {
  target.cachedAt = new Date().toISOString();
  await dbPut(OFFLINE_STORES.TARGETS, target);
};

export const cacheTargets = async (targets: CachedTarget[]): Promise<void> => {
  const now = new Date().toISOString();
  for (const target of targets) {
    target.cachedAt = now;
    await dbPut(OFFLINE_STORES.TARGETS, target);
  }
};

export const getCachedTarget = async (targetId: string): Promise<CachedTarget | null> => {
  return dbGet<CachedTarget>(OFFLINE_STORES.TARGETS, targetId);
};

export const getCachedTargets = async (): Promise<CachedTarget[]> => {
  return dbGetAll<CachedTarget>(OFFLINE_STORES.TARGETS);
};

export const clearTargetsCache = async (): Promise<void> => {
  await dbClear(OFFLINE_STORES.TARGETS);
};

// Visits cache
export const cacheVisit = async (visit: CachedVisit): Promise<void> => {
  visit.cachedAt = new Date().toISOString();
  await dbPut(OFFLINE_STORES.VISITS, visit);
};

export const cacheVisits = async (visits: CachedVisit[]): Promise<void> => {
  const now = new Date().toISOString();
  for (const visit of visits) {
    visit.cachedAt = now;
    await dbPut(OFFLINE_STORES.VISITS, visit);
  }
};

export const getCachedVisit = async (visitId: string): Promise<CachedVisit | null> => {
  return dbGet<CachedVisit>(OFFLINE_STORES.VISITS, visitId);
};

export const getCachedVisits = async (): Promise<CachedVisit[]> => {
  return dbGetAll<CachedVisit>(OFFLINE_STORES.VISITS);
};

export const getCachedVisitsByTarget = async (targetId: string): Promise<CachedVisit[]> => {
  return dbGetByIndex<CachedVisit>(OFFLINE_STORES.VISITS, "targetId", targetId);
};

export const getOfflineCreatedVisits = async (): Promise<CachedVisit[]> => {
  return dbGetByIndex<CachedVisit>(OFFLINE_STORES.VISITS, "isOfflineCreated", 1);
};

export const clearVisitsCache = async (): Promise<void> => {
  await dbClear(OFFLINE_STORES.VISITS);
};

// Attendance cache
export const cacheAttendance = async (attendance: CachedAttendance): Promise<void> => {
  attendance.cachedAt = new Date().toISOString();
  await dbPut(OFFLINE_STORES.ATTENDANCE, attendance);
};

export const getCachedAttendance = async (attendanceId: string): Promise<CachedAttendance | null> => {
  return dbGet<CachedAttendance>(OFFLINE_STORES.ATTENDANCE, attendanceId);
};

export const getCachedAttendanceByDate = async (date: string): Promise<CachedAttendance[]> => {
  return dbGetByIndex<CachedAttendance>(OFFLINE_STORES.ATTENDANCE, "date", date);
};

export const getTodayCachedAttendance = async (): Promise<CachedAttendance | null> => {
  const today = new Date().toISOString().split("T")[0];
  const records = await getCachedAttendanceByDate(today);
  return records.length > 0 ? records[0] : null;
};

export const clearAttendanceCache = async (): Promise<void> => {
  await dbClear(OFFLINE_STORES.ATTENDANCE);
};

// ==================== SETTINGS ====================

export const getOfflineSettings = async (): Promise<OfflineSettings> => {
  const settings = await dbGet<{ key: string; value: OfflineSettings }>(OFFLINE_STORES.SETTINGS, "settings");
  return settings?.value || DEFAULT_OFFLINE_SETTINGS;
};

export const updateOfflineSettings = async (updates: Partial<OfflineSettings>): Promise<void> => {
  const current = await getOfflineSettings();
  const newSettings = { ...current, ...updates };
  await dbPut(OFFLINE_STORES.SETTINGS, { key: "settings", value: newSettings });
};

// ==================== OFFLINE STATE ====================

export const getOfflineState = async (userId?: string): Promise<OfflineState> => {
  const actions = await getQueuedActions(userId);
  const pendingActions = actions.filter((a) => a.status === "pending").length;
  const failedActions = actions.filter((a) => a.status === "failed").length;
  const conflictCount = actions.filter((a) => a.status === "conflict").length;

  // Calculate approximate cache size
  const targets = await getCachedTargets();
  const visits = await getCachedVisits();
  const cacheSize = JSON.stringify(targets).length + JSON.stringify(visits).length;

  const lastSyncData = await dbGet<{ key: string; value: string }>(OFFLINE_STORES.SETTINGS, "lastSync");
  const lastOnlineData = await dbGet<{ key: string; value: string }>(OFFLINE_STORES.SETTINGS, "lastOnline");

  return {
    isOnline: navigator.onLine,
    lastOnline: lastOnlineData?.value || new Date().toISOString(),
    lastSync: lastSyncData?.value || "never",
    pendingActions,
    failedActions,
    conflictCount,
    cacheSize,
  };
};

export const updateLastSync = async (): Promise<void> => {
  await dbPut(OFFLINE_STORES.SETTINGS, { key: "lastSync", value: new Date().toISOString() });
};

export const updateLastOnline = async (): Promise<void> => {
  await dbPut(OFFLINE_STORES.SETTINGS, { key: "lastOnline", value: new Date().toISOString() });
};

// ==================== CACHE CLEANUP ====================

export const cleanupExpiredCache = async (maxAge?: number): Promise<void> => {
  const settings = await getOfflineSettings();
  const age = maxAge || settings.maxCacheAge;
  const cutoff = new Date(Date.now() - age).toISOString();

  // Clean targets
  const targets = await getCachedTargets();
  for (const target of targets) {
    if (target.cachedAt < cutoff) {
      await dbDelete(OFFLINE_STORES.TARGETS, target.id);
    }
  }

  // Clean visits (but keep offline-created ones)
  const visits = await getCachedVisits();
  for (const visit of visits) {
    if (visit.cachedAt < cutoff && !visit.isOfflineCreated) {
      await dbDelete(OFFLINE_STORES.VISITS, visit.id);
    }
  }

  // Clean attendance
  const allAttendance = await dbGetAll<CachedAttendance>(OFFLINE_STORES.ATTENDANCE);
  for (const attendance of allAttendance) {
    if (attendance.cachedAt < cutoff && !attendance.isOfflineCreated) {
      await dbDelete(OFFLINE_STORES.ATTENDANCE, attendance.id);
    }
  }
};

// ==================== CONFLICT DETECTION ====================

export const detectConflict = (
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  localTimestamp: string,
  serverTimestamp: string
): ConflictInfo | null => {
  // If server data is newer, there might be a conflict
  if (new Date(serverTimestamp) > new Date(localTimestamp)) {
    // Check for actual differences
    const differences: string[] = [];
    
    for (const key of Object.keys(localData)) {
      if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
        differences.push(key);
      }
    }

    if (differences.length > 0) {
      return {
        actionId: "",
        actionType: "visit_update",
        localTimestamp,
        serverTimestamp,
        localData,
        serverData,
        field: differences.join(", "),
        description: `Conflict detected in fields: ${differences.join(", ")}. Server data is newer.`,
      };
    }
  }

  return null;
};

export const mergeData = (
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  preferLocal: string[] = []
): Record<string, unknown> => {
  const merged = { ...serverData };

  for (const key of preferLocal) {
    if (localData[key] !== undefined) {
      merged[key] = localData[key];
    }
  }

  return merged;
};

// ==================== EXPORT DATABASE ====================

export const exportOfflineData = async (): Promise<string> => {
  const data = {
    actions: await getQueuedActions(),
    targets: await getCachedTargets(),
    visits: await getCachedVisits(),
    attendance: await dbGetAll<CachedAttendance>(OFFLINE_STORES.ATTENDANCE),
    settings: await getOfflineSettings(),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
};

export const importOfflineData = async (jsonData: string): Promise<void> => {
  const data = JSON.parse(jsonData);

  if (data.actions) {
    for (const action of data.actions) {
      await dbPut(OFFLINE_STORES.ACTIONS, action);
    }
  }

  if (data.targets) {
    await cacheTargets(data.targets);
  }

  if (data.visits) {
    await cacheVisits(data.visits);
  }

  if (data.attendance) {
    for (const attendance of data.attendance) {
      await cacheAttendance(attendance);
    }
  }
};

// ==================== INITIALIZE ====================

export const initializeOfflineSupport = async (): Promise<void> => {
  await initOfflineDB();
  
  // Listen for online/offline events
  window.addEventListener("online", async () => {
    await updateLastOnline();
    console.log("Device is online");
  });

  window.addEventListener("offline", () => {
    console.log("Device is offline");
  });

  // Initial state
  if (navigator.onLine) {
    await updateLastOnline();
  }
};
