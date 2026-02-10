"use client";

import { useEffect, useRef, useCallback } from "react";
import { registerPlugin } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { useAppStore } from "@/store";
import { isNativeApp } from "@/lib/platform";
import { updateUserLocation, saveLastActiveLocation } from "@/lib/locationTracking";
import { updatePresence } from "@/lib/chat";
import NativeServices from "@/lib/nativeServices";
import { 
  initializeNetworkMonitoring, 
  subscribeToNetworkStatus, 
  isNetworkConnected,
  NetworkState 
} from "@/lib/networkStatus";

// Register BackgroundGeolocation plugin at module level (same as working APK)
// Wrapped in try-catch to prevent module-level crash that would kill entire React tree
let BackgroundGeolocation: import("@capacitor-community/background-geolocation").BackgroundGeolocationPlugin | null = null;
try {
  BackgroundGeolocation = registerPlugin<import("@capacitor-community/background-geolocation").BackgroundGeolocationPlugin>("BackgroundGeolocation");
} catch (e) {
  console.warn("[BackgroundTrackingProvider] Failed to register BackgroundGeolocation plugin:", e);
}

// Firebase Realtime Database URL
const FIREBASE_DATABASE_URL = "https://po-verse-default-rtdb.firebaseio.com";

// Configuration for background location tracking
// Real-time updates - very short throttle for live tracking
const LOCATION_UPDATE_INTERVAL_MS = 2000; // 2 seconds between updates for real-time
const FALLBACK_WATCHER_TIMEOUT_MS = 30000; // 30 seconds fallback timeout
const MIN_DISTANCE_METERS = 5; // 5 meters minimum distance for updates (more sensitive)
const PRESENCE_HEARTBEAT_MS = 10000; // 10 second heartbeat to keep user online

export default function BackgroundTrackingProvider() {
  const { isAuthenticated, user, setBackgroundTrackingActive } = useAppStore();
  const watcherIdRef = useRef<string | null>(null);
  const foregroundWatcherIdRef = useRef<string | null>(null);
  const lastSentRef = useRef<number>(0);
  const lastBackgroundUpdateRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownLocationRef = useRef<{ lat: number; lng: number; accuracy: number | null } | null>(null);

  // Handle presence updates based on network and tracking status
  const updatePresenceStatus = useCallback(async (forceOnline?: boolean) => {
    if (!user?.id) return;
    
    const hasNetwork = isNetworkConnected();
    const isTracking = watcherIdRef.current !== null || foregroundWatcherIdRef.current !== null;
    
    // User is online if: has network AND (is tracking OR forceOnline)
    const shouldBeOnline = hasNetwork && (isTracking || forceOnline === true);
    
    try {
      await updatePresence(user.id, shouldBeOnline);
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }, [user?.id]);

  // Initialize network monitoring
  useEffect(() => {
    initializeNetworkMonitoring();
    
    if (user?.id) {
      // Subscribe to network status changes
      networkUnsubscribeRef.current = subscribeToNetworkStatus(async (status: NetworkState) => {
        if (status.isConnected) {
          // Network connected - update presence to online if tracking
          await updatePresenceStatus();
        } else {
          // Network disconnected - save last known location and set offline
          if (lastKnownLocationRef.current && user.id) {
            try {
              await saveLastActiveLocation(
                user.id,
                lastKnownLocationRef.current.lat,
                lastKnownLocationRef.current.lng,
                lastKnownLocationRef.current.accuracy,
                user.companyId,
                user.name
              );
            } catch (e) {
              // Expected to fail when offline
            }
          }
          try {
            await updatePresence(user.id, false);
          } catch (e) {
            // Expected to fail when offline
          }
        }
      });

      // Set up periodic presence heartbeat to keep user online continuously
      // This runs every 10 seconds to ensure user stays online even when app is in background/closed
      presenceIntervalRef.current = setInterval(async () => {
        const hasNetwork = isNetworkConnected();
        
        // Always keep user online if network is connected and authenticated
        // This ensures user stays online even when app is closed
        if (hasNetwork && user?.id) {
          try {
            await updatePresence(user.id, true);
          } catch (error) {
            // Silently fail on heartbeat errors
          }
        }
      }, PRESENCE_HEARTBEAT_MS);
    }
    
    return () => {
      if (networkUnsubscribeRef.current) {
        networkUnsubscribeRef.current();
        networkUnsubscribeRef.current = null;
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
    };
  }, [user?.id, updatePresenceStatus]);

  useEffect(() => {
    let cancelled = false;

    const clearFallbackTimer = () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const stopForegroundWatcher = async () => {
      const watcherId = foregroundWatcherIdRef.current;
      if (!watcherId) return;

      foregroundWatcherIdRef.current = null;
      try {
        await Geolocation.clearWatch({ id: watcherId });
      } catch (error) {
        console.warn("Foreground geolocation stop failed:", error);
      }
    };

    const startForegroundWatcher = async () => {
      if (foregroundWatcherIdRef.current || !isAuthenticated || !user?.id) return;

      try {
        const status = await Geolocation.checkPermissions();
        const hasPermission =
          status.location === "granted" || status.coarseLocation === "granted";

        if (!hasPermission) {
          const request = await Geolocation.requestPermissions();
          const granted =
            request.location === "granted" || request.coarseLocation === "granted";
          if (!granted) {
            setBackgroundTrackingActive(false);
            return;
          }
        }

        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          },
          async (position, error) => {
            if (cancelled) return;

            if (error) {
              console.error("Foreground geolocation error:", error);
              return;
            }

            if (!position) return;

            const coords = position.coords;
            if (!coords) return;

            const { latitude, longitude, accuracy } = coords;
            if (typeof latitude !== "number" || typeof longitude !== "number") return;

            const now = Date.now();
            if (now - lastSentRef.current < LOCATION_UPDATE_INTERVAL_MS) return;
            lastSentRef.current = now;

            try {
              // Only update location and presence if network is connected
              if (!isNetworkConnected()) {
                console.log("Network disconnected, skipping location sync");
                return;
              }
              
              // Store last known location for offline save
              lastKnownLocationRef.current = { lat: latitude, lng: longitude, accuracy: accuracy ?? null };
              
              await updateUserLocation(
                user.id,
                latitude,
                longitude,
                accuracy ?? null,
                user.companyId,
                user.name
              );
              // Update presence to online whenever location is updated
              // This keeps user online even when app is in background
              await updatePresence(user.id, true);
              setBackgroundTrackingActive(true);
            } catch (err) {
              console.error("Failed to sync foreground location:", err);
            }
          }
        );

        if (id) {
          foregroundWatcherIdRef.current = id;
        }
      } catch (error) {
        console.error("Foreground geolocation start failed:", error);
        setBackgroundTrackingActive(false);
      }
    };

    const scheduleFallbackWatcher = () => {
      clearFallbackTimer();
      fallbackTimerRef.current = setTimeout(() => {
        const lastUpdate = lastBackgroundUpdateRef.current;
        if (!lastUpdate || Date.now() - lastUpdate > FALLBACK_WATCHER_TIMEOUT_MS) {
          startForegroundWatcher();
        }
      }, FALLBACK_WATCHER_TIMEOUT_MS);
    };

    const stopWatcher = async (stopNative = true, keepStatus = false) => {
      const watcherId = watcherIdRef.current;
      
      // Stop native location tracking service (optional)
      if (stopNative) {
        try {
          await NativeServices.stopLocationTracking();
          console.log("Native location tracking service stopped");
        } catch (nativeErr) {
          console.warn("Failed to stop native location service:", nativeErr);
        }
      }
      
      if (!watcherId) {
        if (!keepStatus) {
          setBackgroundTrackingActive(false);
        }
        clearFallbackTimer();
        await stopForegroundWatcher();
        return;
      }

      watcherIdRef.current = null;
      try {
        if (BackgroundGeolocation) {
          await BackgroundGeolocation.removeWatcher({ id: watcherId });
        }
      } catch (error) {
        console.warn("Background geolocation stop failed:", error);
      } finally {
        if (!keepStatus) {
          setBackgroundTrackingActive(false);
        }
        clearFallbackTimer();
        await stopForegroundWatcher();
      }
    };

    const startWatcher = async () => {
      if (!isNativeApp() || !isAuthenticated || !user?.id) {
        await stopWatcher();
        return;
      }

      if (watcherIdRef.current || startingRef.current) return;

      startingRef.current = true;
      lastBackgroundUpdateRef.current = null;
      
      // Start native location tracking service (runs independently of WebView)
      // This ensures location and presence updates continue even when app is killed
      try {
        await NativeServices.startLocationTracking({
          userId: user.id,
          companyId: user.companyId || '',
          firebaseUrl: FIREBASE_DATABASE_URL,
          userName: user.name || 'User'
        });
        console.log("Native location tracking service started");
      } catch (nativeErr) {
        console.warn("Native location service not available, using web-based tracking:", nativeErr);
      }
      
      if (!BackgroundGeolocation) {
        console.warn("BackgroundGeolocation plugin not available, using fallback watcher only");
        startingRef.current = false;
        scheduleFallbackWatcher();
        return;
      }

      try {
        const id = await BackgroundGeolocation.addWatcher(
          {
            // Request location permissions on start
            requestPermissions: true,
            
            // Foreground notification settings (required for Android)
            backgroundTitle: "PO-VERSE Location Active",
            backgroundMessage: "Tracking your location for work updates",
            
            // Use stale locations to get immediate position
            stale: false,
            
            // Accuracy and distance settings
            distanceFilter: MIN_DISTANCE_METERS,
          },
          async (location, error) => {
            if (cancelled) return;

            if (error) {
              console.error("Background geolocation error:", error);
              scheduleFallbackWatcher();
              return;
            }

            if (!location) return;

            const lat = (location as { latitude?: number; coords?: { latitude?: number } }).latitude ??
              (location as { coords?: { latitude?: number } }).coords?.latitude;
            const lng = (location as { longitude?: number; coords?: { longitude?: number } }).longitude ??
              (location as { coords?: { longitude?: number } }).coords?.longitude;
            const accuracy =
              (location as { accuracy?: number; coords?: { accuracy?: number } }).accuracy ??
              (location as { coords?: { accuracy?: number } }).coords?.accuracy ??
              null;

            if (typeof lat !== "number" || typeof lng !== "number") return;

            const now = Date.now();
            if (now - lastSentRef.current < LOCATION_UPDATE_INTERVAL_MS) return;
            lastSentRef.current = now;
            lastBackgroundUpdateRef.current = now;
            clearFallbackTimer();
            await stopForegroundWatcher();

            try {
              // Only update location and presence if network is connected
              if (!isNetworkConnected()) {
                console.log("Network disconnected, skipping background location sync");
                // Still store the location for offline save
                lastKnownLocationRef.current = { lat, lng, accuracy };
                scheduleFallbackWatcher();
                return;
              }
              
              // Store last known location for offline save
              lastKnownLocationRef.current = { lat, lng, accuracy };
              
              await updateUserLocation(
                user.id,
                lat,
                lng,
                accuracy,
                user.companyId,
                user.name
              );
              // Update presence to online whenever location is updated
              // This keeps user online even when app is in background/closed
              await updatePresence(user.id, true);
              setBackgroundTrackingActive(true);
            } catch (err) {
              console.error("Failed to sync background location:", err);
            }

            scheduleFallbackWatcher();
          }
        );

        if (id) {
          watcherIdRef.current = id;
        }
        scheduleFallbackWatcher();
      } catch (error) {
        console.error("Background geolocation start failed:", error);
        setBackgroundTrackingActive(false);
        await startForegroundWatcher();
      } finally {
        startingRef.current = false;
      }
    };

    startWatcher();

    return () => {
      cancelled = true;
      // Keep native service running when app is closed and user is authenticated
      if (isNativeApp() && isAuthenticated) {
        stopWatcher(false, true);
      } else {
        stopWatcher();
      }
    };
  }, [isAuthenticated, user?.id, user?.companyId, user?.name, setBackgroundTrackingActive]);

  return null;
}


