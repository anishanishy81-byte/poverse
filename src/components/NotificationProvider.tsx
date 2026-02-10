/**
 * Notification Provider Component
 * Handles push notifications for both web and native platforms
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store";
import { isNativeApp } from "@/lib/platform";
import { useNativePushNotifications } from "@/hooks/useNativePushNotifications";
import { useFCM } from "@/hooks/useFCM";
import { subscribeToNotifications } from "@/lib/notifications";
import { useInAppNotification } from "./InAppNotificationToast";

export default function NotificationProvider() {
  const { isAuthenticated, user } = useAppStore();
  const initRef = useRef(false);
  const lastShownNotifRef = useRef<string | null>(null);
  
  // In-app notification toast
  const { showNotification: showInAppNotification } = useInAppNotification();

  // Native push notifications (Android/iOS)
  const {
    token: nativeToken,
    isPermissionGranted: nativePermissionGranted,
    requestPermission: requestNativePermission,
    showLocalNotification,
  } = useNativePushNotifications();

  // Web push notifications (FCM)
  const {
    token: webToken,
    isPermissionGranted: webPermissionGranted,
    requestPermission: requestWebPermission,
  } = useFCM({
    onMessage: (payload) => {
      console.log("FCM message in foreground:", payload);
      
      // Prevent duplicate display - check if this notification was already shown
      const notifId = payload.data?.notificationId || payload.messageId;
      if (notifId && lastShownNotifRef.current === notifId) {
        console.log("Skipping duplicate notification:", notifId);
        return;
      }
      lastShownNotifRef.current = notifId || null;
      
      // Show in-app popup for foreground messages
      if (payload.notification) {
        showInAppNotification({
          id: notifId || `fcm_${Date.now()}`,
          title: payload.notification.title || "PO-VERSE",
          body: payload.notification.body || "",
          type: payload.data?.type,
          clickAction: payload.data?.clickAction,
          data: payload.data,
        });
      }
    },
  });

  // Request notification permissions on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.id || initRef.current) return;
    initRef.current = true;

    const requestPermissions = async () => {
      try {
        if (isNativeApp()) {
          // Request native permissions for Android
          if (!nativePermissionGranted) {
            const granted = await requestNativePermission();
            console.log("Native notification permission:", granted ? "granted" : "denied");
          }
        } else {
          // Request web permissions for PWA
          if (!webPermissionGranted) {
            const granted = await requestWebPermission();
            console.log("Web notification permission:", granted ? "granted" : "denied");
          }
        }
      } catch (error) {
        console.error("Error requesting notification permissions:", error);
      }
    };

    // Wait a moment before requesting to not overwhelm user on login
    const timer = setTimeout(requestPermissions, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isAuthenticated,
    user?.id,
    nativePermissionGranted,
    webPermissionGranted,
    requestNativePermission,
    requestWebPermission,
  ]);

  // Subscribe to in-app notifications from Firebase
  // This handles showing in-app popups for new notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.companyId || !user?.id) return;

    let lastNotifId: string | null = null;

    // Subscribe to realtime notifications
    const unsubscribe = subscribeToNotifications(
      user.companyId,
      user.id,
      (notifications) => {
        // Handle new notifications
        const unreadNotifications = notifications.filter((n) => n.status === "unread");
        
        // Show in-app popup for newly received items
        if (unreadNotifications.length > 0) {
          const latest = unreadNotifications[0];
          
          // Skip if we already showed this one
          if (latest.id === lastNotifId) return;
          
          // Only show if the notification is recent (within last 10 seconds)
          const notifTime = new Date(latest.createdAt).getTime();
          const now = Date.now();
          if (now - notifTime < 10000) {
            // Skip if FCM already showed this (check lastShownNotifRef)
            if (latest.id === lastShownNotifRef.current) {
              console.log("Skipping RTDB notification, already shown by FCM:", latest.id);
              return;
            }
            
            lastNotifId = latest.id;
            
            // Show in-app popup (not local notification to avoid duplicates)
            showInAppNotification({
              id: latest.id,
              title: latest.title,
              body: latest.body,
              type: latest.type,
              clickAction: latest.clickAction,
              data: {
                notificationId: latest.id,
                type: latest.type,
              },
            });
          }
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, user?.companyId, user?.id, showInAppNotification]);

  // Log token status for debugging
  useEffect(() => {
    if (nativeToken) {
      console.log("Native push token available:", nativeToken.substring(0, 20) + "...");
    }
    if (webToken) {
      console.log("Web push token available:", webToken.substring(0, 20) + "...");
    }
  }, [nativeToken, webToken]);

  return null;
}
