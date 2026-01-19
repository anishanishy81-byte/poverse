"use client";

import React, { useEffect, useRef } from "react";
import { updatePresence } from "@/lib/chat";
import { useAppStore } from "@/store";

export function usePresence() {
  const { isAuthenticated, user } = useAppStore();
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      initializedRef.current = false;
      return;
    }

    // Only initialize once per session
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Set user as online immediately
    updatePresence(user.id, true);

    // Update presence every 30 seconds to keep it alive
    presenceIntervalRef.current = setInterval(() => {
      updatePresence(user.id, true);
    }, 30000);

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence(user.id, true);
      }
    };

    // Handle before unload - set user as offline
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status update
      const data = JSON.stringify({ userId: user.id, isOnline: false });
      navigator.sendBeacon("/api/presence", data);
    };

    // Handle window focus
    const handleFocus = () => {
      updatePresence(user.id, true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
      
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      // Set offline when component unmounts (logout)
      updatePresence(user.id, false);
    };
  }, [isAuthenticated, user?.id]);
}

// Component version to use in layout or providers
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  usePresence();
  return <>{children}</>;
}
