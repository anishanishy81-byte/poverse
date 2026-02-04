"use client";

import React, { useEffect, useRef } from "react";
import { ref, set, onDisconnect, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAppStore } from "@/store";

const PRESENCE_PATH = "presence";

export function usePresence() {
  const { isAuthenticated, user } = useAppStore();
  const initializedRef = useRef(false);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      initializedRef.current = false;
      return;
    }

    // Only initialize once per session
    if (initializedRef.current) return;
    initializedRef.current = true;

    const presenceRef = ref(realtimeDb, `${PRESENCE_PATH}/${user.id}`);
    const connectedRefPath = ref(realtimeDb, ".info/connected");
    
    // Listen to connection state
    const unsubscribe = import("firebase/database").then(({ onValue }) => {
      return onValue(connectedRefPath, async (snapshot) => {
        if (snapshot.val() === true) {
          connectedRef.current = true;
          
          // Set up onDisconnect to mark user as offline when they disconnect
          const disconnectRef = onDisconnect(presenceRef);
          await disconnectRef.set({
            isOnline: false,
            lastActive: new Date().toISOString(),
          });
          
          // Now set user as online
          await set(presenceRef, {
            isOnline: true,
            lastActive: new Date().toISOString(),
            name: user.name,
            companyId: user.companyId,
          });
        }
      });
    });

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && connectedRef.current) {
        set(presenceRef, {
          isOnline: true,
          lastActive: new Date().toISOString(),
          name: user.name,
          companyId: user.companyId,
        });
      }
    };

    // Handle window focus
    const handleFocus = () => {
      if (connectedRef.current) {
        set(presenceRef, {
          isOnline: true,
          lastActive: new Date().toISOString(),
          name: user.name,
          companyId: user.companyId,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      
      // Set offline when component unmounts (logout)
      if (connectedRef.current) {
        set(presenceRef, {
          isOnline: false,
          lastActive: new Date().toISOString(),
        });
      }
      
      initializedRef.current = false;
      connectedRef.current = false;
    };
  }, [isAuthenticated, user?.id]);
}

// Component version to use in layout or providers
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  usePresence();
  return <>{children}</>;
}
