/**
 * Native Push Notifications Hook for Capacitor Android
 * Handles push notifications that show in the device notification center
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store";
import { isNativeApp } from "@/lib/platform";
import { saveFCMToken, removeFCMToken } from "@/lib/notifications";

// Import types - actual plugins will be loaded dynamically
interface PushNotificationToken {
  value: string;
}

interface PushNotificationActionPerformed {
  actionId: string;
  notification: {
    id?: number;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };
}

interface PushNotificationReceived {
  id?: number;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface LocalNotificationSchema {
  id: number;
  title: string;
  body: string;
  largeBody?: string;
  summaryText?: string;
  smallIcon?: string;
  largeIcon?: string;
  iconColor?: string;
  channelId?: string;
  schedule?: {
    at?: Date;
    repeats?: boolean;
    every?: "year" | "month" | "two-weeks" | "week" | "day" | "hour" | "minute" | "second";
    on?: {
      year?: number;
      month?: number;
      day?: number;
      weekday?: number;
      hour?: number;
      minute?: number;
      second?: number;
    };
  };
  extra?: Record<string, unknown>;
  ongoing?: boolean;
  autoCancel?: boolean;
  inboxList?: string[];
  group?: string;
  groupSummary?: boolean;
  sound?: string;
}

interface UseNativePushReturn {
  token: string | null;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  showLocalNotification: (options: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channelId?: string;
  }) => Promise<void>;
}

// Notification channel IDs
const NOTIFICATION_CHANNELS = {
  DEFAULT: "poverse_default",
  LOCATION: "poverse_location",
  CHAT: "poverse_chat",
  TARGETS: "poverse_targets",
  ATTENDANCE: "poverse_attendance",
  ALERTS: "poverse_alerts",
};

export const useNativePushNotifications = (): UseNativePushReturn => {
  const { user } = useAppStore();
  const [token, setToken] = useState<string | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const pushNotificationsRef = useRef<any>(null);
  const localNotificationsRef = useRef<any>(null);

  // Initialize notification channels (Android only)
  const createNotificationChannels = useCallback(async (LocalNotifications: any) => {
    try {
      // Check if we need to create channels
      const channels = await LocalNotifications.listChannels();
      const existingIds = channels.channels.map((c: any) => c.id);

      const channelsToCreate = [
        {
          id: NOTIFICATION_CHANNELS.DEFAULT,
          name: "General Notifications",
          description: "General app notifications",
          importance: 4, // HIGH
          sound: "default",
          vibration: true,
        },
        {
          id: NOTIFICATION_CHANNELS.LOCATION,
          name: "Location Tracking",
          description: "Background location tracking status",
          importance: 3, // DEFAULT
          sound: undefined,
          vibration: false,
        },
        {
          id: NOTIFICATION_CHANNELS.CHAT,
          name: "Chat Messages",
          description: "New message notifications",
          importance: 4, // HIGH
          sound: "default",
          vibration: true,
        },
        {
          id: NOTIFICATION_CHANNELS.TARGETS,
          name: "Target Updates",
          description: "Target and lead notifications",
          importance: 4, // HIGH
          sound: "default",
          vibration: true,
        },
        {
          id: NOTIFICATION_CHANNELS.ATTENDANCE,
          name: "Attendance",
          description: "Check-in and check-out reminders",
          importance: 4, // HIGH
          sound: "default",
          vibration: true,
        },
        {
          id: NOTIFICATION_CHANNELS.ALERTS,
          name: "Urgent Alerts",
          description: "High priority alerts",
          importance: 5, // MAX
          sound: "default",
          vibration: true,
        },
      ];

      for (const channel of channelsToCreate) {
        if (!existingIds.includes(channel.id)) {
          await LocalNotifications.createChannel(channel);
          console.log(`Created notification channel: ${channel.id}`);
        }
      }
    } catch (err) {
      console.error("Error creating notification channels:", err);
    }
  }, []);

  // Initialize push notifications
  useEffect(() => {
    if (!isNativeApp() || initializedRef.current) {
      setIsLoading(false);
      return;
    }

    const initializeNotifications = async () => {
      try {
        // Dynamically import Capacitor plugins
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        pushNotificationsRef.current = PushNotifications;
        localNotificationsRef.current = LocalNotifications;

        // Create notification channels for Android
        await createNotificationChannels(LocalNotifications);

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        console.log("Push permission status:", permStatus);

        if (permStatus.receive === "granted") {
          setIsPermissionGranted(true);
          await registerForPush(PushNotifications);
        } else if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
          // Will request permission when needed
          console.log("Push permission needs to be requested");
        }

        // Check local notification permissions
        const localPermStatus = await LocalNotifications.checkPermissions();
        console.log("Local notification permission status:", localPermStatus);

        if (localPermStatus.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }

        // Set up listeners for push notifications
        await PushNotifications.addListener("registration", async (token: PushNotificationToken) => {
          console.log("Push registration success, token:", token.value);
          setToken(token.value);

          // Save token to Firebase
          if (user?.companyId && user?.id) {
            await saveFCMToken(user.companyId, user.id, token.value, "android");
          }
        });

        await PushNotifications.addListener("registrationError", (err: any) => {
          console.error("Push registration error:", err);
          setError(String(err.error || err));
        });

        // Use type assertion to handle Capacitor's internal types
        (PushNotifications as any).addListener(
          "pushNotificationReceived",
          async (notification: any) => {
            console.log("Push notification received:", notification);

            // Show as local notification so it appears in notification center
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now(),
                  title: notification.title || "PO-VERSE",
                  body: notification.body || "",
                  largeBody: notification.body,
                  channelId: getChannelForNotification(notification.data),
                  extra: notification.data,
                  autoCancel: true,
                  sound: "default",
                },
              ],
            });
          }
        );

        (PushNotifications as any).addListener(
          "pushNotificationActionPerformed",
          (action: any) => {
            console.log("Push notification action performed:", action);
            handleNotificationAction(action);
          }
        );

        // Set up listeners for local notifications
        await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (action: any) => {
            console.log("Local notification action performed:", action);
            handleLocalNotificationAction(action);
          }
        );

        initializedRef.current = true;
      } catch (err) {
        console.error("Error initializing push notifications:", err);
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();

    return () => {
      // Cleanup listeners on unmount
      if (pushNotificationsRef.current) {
        pushNotificationsRef.current.removeAllListeners().catch(console.error);
      }
      if (localNotificationsRef.current) {
        localNotificationsRef.current.removeAllListeners().catch(console.error);
      }
    };
  }, [createNotificationChannels, user?.companyId, user?.id]);

  // Register for push notifications
  const registerForPush = async (PushNotifications: any) => {
    try {
      await PushNotifications.register();
      console.log("Push notification registration initiated");
    } catch (err) {
      console.error("Error registering for push:", err);
      setError(String(err));
    }
  };

  // Get appropriate channel for notification type
  const getChannelForNotification = (data?: Record<string, unknown>): string => {
    const type = data?.type as string;

    if (type?.includes("chat") || type?.includes("message")) {
      return NOTIFICATION_CHANNELS.CHAT;
    }
    if (type?.includes("target") || type?.includes("lead") || type?.includes("visit")) {
      return NOTIFICATION_CHANNELS.TARGETS;
    }
    if (type?.includes("attendance") || type?.includes("checkin") || type?.includes("checkout")) {
      return NOTIFICATION_CHANNELS.ATTENDANCE;
    }
    if (type?.includes("location")) {
      return NOTIFICATION_CHANNELS.LOCATION;
    }
    if (data?.priority === "high" || data?.priority === "urgent") {
      return NOTIFICATION_CHANNELS.ALERTS;
    }

    return NOTIFICATION_CHANNELS.DEFAULT;
  };

  // Handle push notification action
  const handleNotificationAction = (action: PushNotificationActionPerformed) => {
    const { notification } = action;
    const clickAction = notification.data?.clickAction as string;

    if (clickAction && typeof window !== "undefined") {
      // Navigate to the specified route
      window.location.href = clickAction;
    }
  };

  // Handle local notification action
  const handleLocalNotificationAction = (action: any) => {
    const { notification } = action;
    const clickAction = notification.extra?.clickAction as string;

    if (clickAction && typeof window !== "undefined") {
      window.location.href = clickAction;
    }
  };

  // Request push notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp()) {
      setError("Push notifications only work on native apps");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const PushNotifications = pushNotificationsRef.current;
      if (!PushNotifications) {
        const { PushNotifications: PN } = await import("@capacitor/push-notifications");
        pushNotificationsRef.current = PN;
      }

      const result = await pushNotificationsRef.current.requestPermissions();

      if (result.receive === "granted") {
        setIsPermissionGranted(true);
        await registerForPush(pushNotificationsRef.current);
        return true;
      } else {
        setIsPermissionGranted(false);
        setError("Push notification permission denied");
        return false;
      }
    } catch (err) {
      console.error("Error requesting push permission:", err);
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Show a local notification (can be called from anywhere in the app)
  const showLocalNotification = useCallback(
    async (options: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId?: string;
    }): Promise<void> => {
      if (!isNativeApp()) {
        // Fallback to web notification
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(options.title, {
              body: options.body,
              icon: "/icons/icon-192x192.png",
              data: options.data,
            });
          }
        }
        return;
      }

      try {
        let LocalNotifications = localNotificationsRef.current;
        if (!LocalNotifications) {
          const { LocalNotifications: LN } = await import("@capacitor/local-notifications");
          localNotificationsRef.current = LN;
          LocalNotifications = LN;
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: options.title,
              body: options.body,
              largeBody: options.body,
              channelId: options.channelId || getChannelForNotification(options.data),
              extra: options.data,
              autoCancel: true,
              sound: "default",
            },
          ],
        });

        console.log("Local notification scheduled:", options.title);
      } catch (err) {
        console.error("Error showing local notification:", err);
      }
    },
    []
  );

  // Re-save token when user changes
  useEffect(() => {
    if (token && user?.companyId && user?.id) {
      saveFCMToken(user.companyId, user.id, token, "android").catch(console.error);
    }
  }, [token, user?.companyId, user?.id]);

  return {
    token,
    isPermissionGranted,
    isLoading,
    error,
    requestPermission,
    showLocalNotification,
  };
};

export default useNativePushNotifications;
