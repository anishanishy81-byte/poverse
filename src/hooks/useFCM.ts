// Firebase Cloud Messaging Hook
"use client";

import { useEffect, useState, useCallback } from "react";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { app } from "@/lib/firebase";
import { saveFCMToken, removeFCMToken } from "@/lib/notifications";
import { useAppStore } from "@/store";

interface UseFCMOptions {
  vapidKey?: string;
  onMessage?: (payload: any) => void;
}

interface UseFCMReturn {
  token: string | null;
  isSupported: boolean;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

export const useFCM = (options: UseFCMOptions = {}): UseFCMReturn => {
  const { user } = useAppStore();
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);

  // Check if FCM is supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === "undefined") {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        // Check if service workers are supported
        if (!("serviceWorker" in navigator)) {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        // Check if push notifications are supported
        if (!("PushManager" in window)) {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        // Check if Notification API is supported
        if (!("Notification" in window)) {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        setIsSupported(true);

        // Check current permission status
        const permission = Notification.permission;
        setIsPermissionGranted(permission === "granted");

        // Initialize messaging if permission is granted
        if (permission === "granted") {
          await initializeMessaging();
        }
      } catch (err) {
        console.error("Error checking FCM support:", err);
        setError(String(err));
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Initialize Firebase Messaging
  const initializeMessaging = useCallback(async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("Service Worker registered:", registration);

      // Initialize messaging
      const messagingInstance = getMessaging(app);
      setMessaging(messagingInstance);

      // Get FCM token
      const vapidKey = options.vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      
      if (!vapidKey) {
        console.warn("VAPID key not set. Push notifications may not work.");
      }

      const currentToken = await getToken(messagingInstance, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        console.log("FCM Token:", currentToken);
        setToken(currentToken);

        // Save token to Firebase if user is logged in
        if (user?.companyId && user?.id) {
          await saveFCMToken(user.companyId, user.id, currentToken, "web");
        }
      } else {
        console.log("No FCM token available. Request permission.");
      }

      // Listen for foreground messages
      onMessage(messagingInstance, (payload) => {
        console.log("Foreground message received:", payload);

        // Call custom handler if provided - in-app popups should be handled by the callback
        // DO NOT create browser Notification here to avoid duplicates
        // The in-app notification toast will handle foreground notifications
        if (options.onMessage) {
          options.onMessage(payload);
        }
      });

      return currentToken;
    } catch (err) {
      console.error("Error initializing FCM:", err);
      setError(String(err));
      return null;
    }
  }, [options, user?.companyId, user?.id]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push notifications are not supported in this browser");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setIsPermissionGranted(true);
        await initializeMessaging();
        return true;
      } else if (permission === "denied") {
        setError("Notification permission was denied");
        setIsPermissionGranted(false);
        return false;
      } else {
        setError("Notification permission was dismissed");
        setIsPermissionGranted(false);
        return false;
      }
    } catch (err) {
      console.error("Error requesting permission:", err);
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, initializeMessaging]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      if (token && user?.companyId && user?.id) {
        await removeFCMToken(user.companyId, user.id, token);
      }

      // Unregister service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL.includes("firebase-messaging-sw.js")) {
          await registration.unregister();
        }
      }

      setToken(null);
      setIsPermissionGranted(false);
    } catch (err) {
      console.error("Error unsubscribing:", err);
      setError(String(err));
    }
  }, [token, user?.companyId, user?.id]);

  // Re-save token when user changes
  useEffect(() => {
    if (token && user?.companyId && user?.id) {
      saveFCMToken(user.companyId, user.id, token, "web").catch(console.error);
    }
  }, [token, user?.companyId, user?.id]);

  return {
    token,
    isSupported,
    isPermissionGranted,
    isLoading,
    error,
    requestPermission,
    unsubscribe,
  };
};

export default useFCM;
