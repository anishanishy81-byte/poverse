"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGeolocation, GeolocationState } from "./useGeolocation";
import { updateUserLocation, LocationData, getTodayLocationStats, subscribeToLocationHistory, LocationHistoryEntry } from "@/lib/locationTracking";
import { useIsBackgroundTrackingActive } from "@/store";

interface UseTrackedLocationOptions {
  userId?: string;
  companyId?: string;
  userName?: string;
  enableTracking?: boolean;
  trackingInterval?: number; // in milliseconds, default 30000 (30 seconds)
  watchPosition?: boolean;
}

interface TrackedLocationState extends GeolocationState {
  lastSyncTime: string | null;
  isSyncing: boolean;
  syncError: string | null;
  todayStats: {
    totalUpdates: number;
    firstLocation: LocationHistoryEntry | null;
    lastLocation: LocationHistoryEntry | null;
    totalDistanceTraveled: number;
  } | null;
  locationHistory: LocationHistoryEntry[];
}

export function useTrackedLocation(options: UseTrackedLocationOptions = {}) {
  const {
    userId,
    companyId,
    userName,
    enableTracking = true,
    trackingInterval = 30000,
    watchPosition = true,
  } = options;

  const geolocation = useGeolocation({ watchPosition });
  const isBackgroundTrackingActive = useIsBackgroundTrackingActive();
  const shouldAutoSync = enableTracking && !isBackgroundTrackingActive;
  
  const [trackedState, setTrackedState] = useState<Omit<TrackedLocationState, keyof GeolocationState>>({
    lastSyncTime: null,
    isSyncing: false,
    syncError: null,
    todayStats: null,
    locationHistory: [],
  });

  const lastSyncedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync location to Firebase
  const syncLocation = useCallback(async () => {
    if (!userId || !geolocation.latitude || !geolocation.longitude) {
      return;
    }

    // Skip if location hasn't changed significantly (more than 10 meters)
    if (lastSyncedLocationRef.current) {
      const { lat, lng } = lastSyncedLocationRef.current;
      const latDiff = Math.abs(geolocation.latitude - lat);
      const lngDiff = Math.abs(geolocation.longitude - lng);
      
      // Approximately 10 meters threshold
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        return;
      }
    }

    setTrackedState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      // Get address using reverse geocoding (optional)
      let address: string | undefined;
      if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
        try {
          const geocoder = new (window as any).google.maps.Geocoder();
          const result = await new Promise<string>((resolve) => {
            geocoder.geocode(
              { location: { lat: geolocation.latitude, lng: geolocation.longitude } },
              (results: any, status: any) => {
                if (status === "OK" && results?.[0]) {
                  resolve(results[0].formatted_address);
                } else {
                  resolve("");
                }
              }
            );
          });
          address = result || undefined;
        } catch {
          // Ignore geocoding errors
        }
      }

      await updateUserLocation(
        userId,
        geolocation.latitude,
        geolocation.longitude,
        geolocation.accuracy,
        companyId,
        userName,
        address
      );

      lastSyncedLocationRef.current = {
        lat: geolocation.latitude,
        lng: geolocation.longitude,
      };

      setTrackedState(prev => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
        isSyncing: false,
      }));
    } catch (error) {
      console.error("Error syncing location:", error);
      setTrackedState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : "Failed to sync location",
      }));
    }
  }, [userId, companyId, userName, geolocation.latitude, geolocation.longitude, geolocation.accuracy]);

  // Sync on location change
  useEffect(() => {
    if (shouldAutoSync && userId && geolocation.latitude && geolocation.longitude) {
      syncLocation();
    }
  }, [shouldAutoSync, userId, geolocation.latitude, geolocation.longitude, syncLocation]);

  // Set up interval-based syncing
  useEffect(() => {
    if (!shouldAutoSync || !userId) {
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      if (geolocation.latitude && geolocation.longitude) {
        syncLocation();
      }
    }, trackingInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [shouldAutoSync, userId, trackingInterval, syncLocation, geolocation.latitude, geolocation.longitude]);

  // Load today's stats
  useEffect(() => {
    if (!userId) return;

    const loadStats = async () => {
      try {
        const stats = await getTodayLocationStats(userId);
        setTrackedState(prev => ({ ...prev, todayStats: stats }));
      } catch (error) {
        console.error("Error loading location stats:", error);
      }
    };

    loadStats();

    // Refresh stats every minute
    const statsInterval = setInterval(loadStats, 60000);

    return () => clearInterval(statsInterval);
  }, [userId]);

  // Subscribe to location history
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToLocationHistory(userId, 20, (history) => {
      setTrackedState(prev => ({ ...prev, locationHistory: history }));
    });

    return () => unsubscribe();
  }, [userId]);

  // Force sync location
  const forceSyncLocation = useCallback(async () => {
    lastSyncedLocationRef.current = null; // Reset to force sync
    await syncLocation();
  }, [syncLocation]);

  return {
    ...geolocation,
    ...trackedState,
    syncLocation: forceSyncLocation,
  };
}

export default useTrackedLocation;
