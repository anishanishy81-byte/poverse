// useOffline Hook
// React hook for managing offline state and sync

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  OfflineState,
  SyncResult,
  AnyOfflineAction,
  OfflineActionType,
  ConflictInfo,
  ConflictResolution,
} from "@/types/offline";
import {
  initializeOfflineSupport,
  getOfflineState,
  queueOfflineAction,
  getPendingActions,
  getQueuedActions,
  resolveConflict,
  cacheTargets,
  getCachedTargets,
  CachedTarget,
  cacheAttendance,
  getTodayCachedAttendance,
  cacheVisit,
  getCachedVisits,
  cleanupExpiredCache,
} from "@/lib/offlineStorage";
import {
  syncOfflineActions,
  startAutoSync,
  stopAutoSync,
  triggerSync,
  isSyncInProgress,
} from "@/lib/offlineSync";
import {
  initializeNetworkMonitoring,
  subscribeToNetworkStatus,
  isNetworkConnected,
  NetworkState,
} from "@/lib/networkStatus";

interface UseOfflineOptions {
  userId: string;
  companyId: string;
  autoSync?: boolean;
  syncInterval?: number; // ms
}

interface UseOfflineReturn {
  // State
  isOnline: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  offlineState: OfflineState | null;
  pendingCount: number;
  hasConflicts: boolean;
  conflictCount: number;
  lastSyncTime: string | null;

  // Actions
  queueAction: (
    type: OfflineActionType,
    payload: Record<string, unknown>
  ) => Promise<string>;
  sync: () => Promise<SyncResult>;
  resolveConflictAction: (actionId: string, resolution: ConflictResolution, mergedData?: object) => Promise<void>;

  // Cache operations
  cacheTargetsOffline: (targets: CachedTarget[]) => Promise<void>;
  getOfflineTargets: () => Promise<CachedTarget[]>;
  
  // Refresh
  refreshState: () => Promise<void>;
}

export const useOffline = (options: UseOfflineOptions): UseOfflineReturn => {
  const { userId, companyId, autoSync = true, syncInterval = 30000 } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const hasInitialized = useRef(false);

  // Initialize offline support
  useEffect(() => {
    const init = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        await initializeOfflineSupport();
        setIsInitialized(true);
        await refreshState();
      } catch (error) {
        console.error("Failed to initialize offline support:", error);
      }
    };

    init();
  }, []);

  // Handle online/offline events using network status utility
  useEffect(() => {
    // Initialize network monitoring
    initializeNetworkMonitoring();
    
    // Subscribe to network status changes
    const unsubscribe = subscribeToNetworkStatus((status: NetworkState) => {
      setIsOnline(status.isConnected);
      
      if (status.isConnected && autoSync && userId && companyId) {
        triggerSync(userId, companyId).then((result) => {
          refreshState();
        });
      }
    });

    // Set initial state
    setIsOnline(isNetworkConnected());

    return () => {
      unsubscribe();
    };
  }, [autoSync, userId, companyId]);

  // Start auto sync
  useEffect(() => {
    if (autoSync && isInitialized && userId && companyId) {
      startAutoSync(userId, companyId, syncInterval);
      return () => stopAutoSync();
    }
  }, [autoSync, isInitialized, userId, companyId, syncInterval]);

  // Refresh offline state
  const refreshState = useCallback(async () => {
    if (!userId) return;

    try {
      const state = await getOfflineState(userId);
      setOfflineState(state);
      setPendingCount(state.pendingActions);
      setConflictCount(state.conflictCount);
      setLastSyncTime(state.lastSync);
    } catch (error) {
      console.error("Failed to refresh offline state:", error);
    }
  }, [userId]);

  // Queue an offline action - uses correct function signature
  const queueAction = useCallback(async (
    type: OfflineActionType,
    payload: Record<string, unknown>
  ): Promise<string> => {
    const actionId = await queueOfflineAction(type, userId, companyId, payload as any);
    await refreshState();
    return actionId;
  }, [userId, companyId, refreshState]);

  // Trigger sync
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: [{ actionId: "", error: "No internet connection" }],
      };
    }

    setIsSyncing(true);
    try {
      const result = await triggerSync(userId, companyId);
      await refreshState();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, userId, companyId, refreshState]);

  // Resolve conflict
  const resolveConflictAction = useCallback(async (
    actionId: string,
    resolution: ConflictResolution,
    mergedData?: object
  ): Promise<void> => {
    await resolveConflict(actionId, resolution, mergedData);
    await refreshState();
  }, [refreshState]);

  // Cache targets for offline use
  const cacheTargetsOffline = useCallback(async (targets: CachedTarget[]): Promise<void> => {
    await cacheTargets(targets);
  }, []);

  // Get cached targets
  const getOfflineTargets = useCallback(async (): Promise<CachedTarget[]> => {
    return getCachedTargets();
  }, []);

  return {
    isOnline,
    isInitialized,
    isSyncing,
    offlineState,
    pendingCount,
    hasConflicts: conflictCount > 0,
    conflictCount,
    lastSyncTime,
    queueAction,
    sync,
    resolveConflictAction,
    cacheTargetsOffline,
    getOfflineTargets,
    refreshState,
  };
};

export default useOffline;
