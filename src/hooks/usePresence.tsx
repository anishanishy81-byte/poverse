"use client";

import React, { useEffect, useRef } from "react";
import { ref, set, onValue, onDisconnect, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAppStore } from "@/store";
import { isNativeApp } from "@/lib/platform";
import { saveLastActiveLocation } from "@/lib/locationTracking";
import { 
  initializeNetworkMonitoring, 
  subscribeToNetworkStatus, 
  isNetworkConnected,
  NetworkState 
} from "@/lib/networkStatus";

const PRESENCE_PATH = "presence";

export function usePresence() {
  const { isAuthenticated, user, isBackgroundTrackingActive } = useAppStore();
  const initializedRef = useRef(false);
  const connectedRef = useRef(false);
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);
  const lastKnownLocationRef = useRef<{ lat: number; lng: number; accuracy: number | null } | null>(null);

  // Track the last known location for offline save
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleLocationUpdate = () => {
      // Read from the locationTracking's last synced position if available
      // We'll use a simple approach - store coords when geolocation updates
    };

    // Watch position to track last known location
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        lastKnownLocationRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        };
      },
      () => {}, // ignore errors
      { enableHighAccuracy: false, maximumAge: 60000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      initializedRef.current = false;
      return;
    }

    // Only initialize once per session
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Initialize network monitoring
    initializeNetworkMonitoring();

    const presenceRef = ref(realtimeDb, `${PRESENCE_PATH}/${user.id}`);
    const connectedRefPath = ref(realtimeDb, ".info/connected");
    
    // Helper to save last active location when going offline
    const saveOfflineLocation = async () => {
      if (!user?.id || !lastKnownLocationRef.current) return;
      try {
        await saveLastActiveLocation(
          user.id,
          lastKnownLocationRef.current.lat,
          lastKnownLocationRef.current.lng,
          lastKnownLocationRef.current.accuracy,
          user.companyId,
          user.name
        );
      } catch (error) {
        console.warn("Failed to save last active location:", error);
      }
    };

    // Subscribe to network status changes
    networkUnsubscribeRef.current = subscribeToNetworkStatus(async (status: NetworkState) => {
      if (status.isConnected) {
        // Network connected - set user online
        try {
          await set(presenceRef, {
            isOnline: true,
            lastActive: new Date().toISOString(),
            name: user.name,
            companyId: user.companyId,
          });
        } catch (error) {
          console.warn("Failed to update presence on network change:", error);
        }
      } else {
        // Network disconnected - save last location and set offline
        await saveOfflineLocation();
        try {
          await set(presenceRef, {
            isOnline: false,
            lastActive: new Date().toISOString(),
          });
        } catch (error) {
          // Expected to fail when offline
        }
      }
    });
    
    // Listen to Firebase connection state
    firebaseUnsubscribeRef.current = onValue(connectedRefPath, async (snapshot) => {
        if (snapshot.val() === true) {
          connectedRef.current = true;
          
          // Set up onDisconnect to mark user as offline when they disconnect
          // Use serverTimestamp so the time is set at disconnect, not at registration
          const disconnectRef = onDisconnect(presenceRef);
          await disconnectRef.set({
            isOnline: false,
            lastActive: serverTimestamp(),
          });
          
          // Now set user as online (if network is connected)
          if (isNetworkConnected()) {
            await set(presenceRef, {
              isOnline: true,
              lastActive: new Date().toISOString(),
              name: user.name,
              companyId: user.companyId,
            });
          }
        } else {
          // Disconnected from Firebase - save last location
          await saveOfflineLocation();
        }
    });

    // Handle page visibility change - only for web
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && connectedRef.current && isNetworkConnected()) {
        set(presenceRef, {
          isOnline: true,
          lastActive: new Date().toISOString(),
          name: user.name,
          companyId: user.companyId,
        });
      } else if (document.visibilityState === "hidden") {
        // User is leaving - save last location
        await saveOfflineLocation();
      }
    };

    // Handle window focus - only for web
    const handleFocus = () => {
      if (connectedRef.current && isNetworkConnected()) {
        set(presenceRef, {
          isOnline: true,
          lastActive: new Date().toISOString(),
          name: user.name,
          companyId: user.companyId,
        });
      }
    };

    // Handle before unload - save last location
    const handleBeforeUnload = () => {
      saveOfflineLocation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      // Clean up network subscription
      if (networkUnsubscribeRef.current) {
        networkUnsubscribeRef.current();
        networkUnsubscribeRef.current = null;
      }
      
      // Clean up Firebase .info/connected listener
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
      
      // Set offline and save last location when component unmounts (logout)
      const shouldKeepOnline = isNativeApp() && isNetworkConnected() && isBackgroundTrackingActive;
      if (connectedRef.current && !shouldKeepOnline) {
        saveOfflineLocation();
        set(presenceRef, {
          isOnline: false,
          lastActive: new Date().toISOString(),
        });
      }
      
      initializedRef.current = false;
      connectedRef.current = false;
    };
  }, [isAuthenticated, user?.id, user?.name, user?.companyId, isBackgroundTrackingActive]);
}

// Component version to use in layout or providers
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  usePresence();
  return <>{children}</>;
}
