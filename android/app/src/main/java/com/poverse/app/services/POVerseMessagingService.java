package com.poverse.app.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.poverse.app.MainActivity;
import com.poverse.app.R;

import java.util.Map;

/**
 * Firebase Cloud Messaging Service for PO-VERSE
 * Handles push notifications when app is in background or closed
 */
public class POVerseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "POVerseFCM";
    
    // Notification channel IDs
    private static final String CHANNEL_DEFAULT = "poverse_default";
    private static final String CHANNEL_CHAT = "poverse_chat";
    private static final String CHANNEL_TARGETS = "poverse_targets";
    private static final String CHANNEL_ATTENDANCE = "poverse_attendance";
    private static final String CHANNEL_ALERTS = "poverse_alerts";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM Message received from: " + remoteMessage.getFrom());

        // Check if message contains data payload
        Map<String, String> data = remoteMessage.getData();
        if (!data.isEmpty()) {
            Log.d(TAG, "Message data payload: " + data);
        }

        // Check if message contains notification payload
        RemoteMessage.Notification notification = remoteMessage.getNotification();
        
        String title = "PO-VERSE";
        String body = "";
        String clickAction = "/dashboard";
        String type = "default";
        String priority = "normal";

        // Extract notification data
        if (notification != null) {
            title = notification.getTitle() != null ? notification.getTitle() : title;
            body = notification.getBody() != null ? notification.getBody() : body;
        }

        // Override with data payload if present
        if (data.containsKey("title")) {
            title = data.get("title");
        }
        if (data.containsKey("body")) {
            body = data.get("body");
        }
        if (data.containsKey("clickAction")) {
            clickAction = data.get("clickAction");
        }
        if (data.containsKey("type")) {
            type = data.get("type");
        }
        if (data.containsKey("priority")) {
            priority = data.get("priority");
        }

        // Check if this is a call notification
        if ("incoming_call".equals(type) || data.containsKey("callId")) {
            handleIncomingCallNotification(data);
            return;
        }

        // Show notification
        sendNotification(title, body, clickAction, type, priority, data);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM Token: " + token);
        
        // The token will be saved to Firebase when the app is opened
        // and the user is authenticated through the JavaScript layer
    }

    /**
     * Create notification channels for Android 8.0+
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);

            // Default channel
            NotificationChannel defaultChannel = new NotificationChannel(
                CHANNEL_DEFAULT,
                "General Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("General app notifications");
            defaultChannel.enableVibration(true);
            notificationManager.createNotificationChannel(defaultChannel);

            // Chat channel
            NotificationChannel chatChannel = new NotificationChannel(
                CHANNEL_CHAT,
                "Chat Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            chatChannel.setDescription("New message notifications");
            chatChannel.enableVibration(true);
            notificationManager.createNotificationChannel(chatChannel);

            // Targets channel
            NotificationChannel targetsChannel = new NotificationChannel(
                CHANNEL_TARGETS,
                "Target Updates",
                NotificationManager.IMPORTANCE_HIGH
            );
            targetsChannel.setDescription("Target and lead notifications");
            targetsChannel.enableVibration(true);
            notificationManager.createNotificationChannel(targetsChannel);

            // Attendance channel
            NotificationChannel attendanceChannel = new NotificationChannel(
                CHANNEL_ATTENDANCE,
                "Attendance",
                NotificationManager.IMPORTANCE_HIGH
            );
            attendanceChannel.setDescription("Check-in and check-out reminders");
            attendanceChannel.enableVibration(true);
            notificationManager.createNotificationChannel(attendanceChannel);

            // Alerts channel (highest priority)
            NotificationChannel alertsChannel = new NotificationChannel(
                CHANNEL_ALERTS,
                "Urgent Alerts",
                NotificationManager.IMPORTANCE_MAX
            );
            alertsChannel.setDescription("High priority alerts");
            alertsChannel.enableVibration(true);
            notificationManager.createNotificationChannel(alertsChannel);

            Log.d(TAG, "Notification channels created");
        }
    }

    /**
     * Get appropriate channel for notification type
     */
    private String getChannelForType(String type, String priority) {
        if ("urgent".equals(priority) || "high".equals(priority)) {
            return CHANNEL_ALERTS;
        }
        
        if (type != null) {
            if (type.contains("chat") || type.contains("message")) {
                return CHANNEL_CHAT;
            }
            if (type.contains("target") || type.contains("lead") || type.contains("visit")) {
                return CHANNEL_TARGETS;
            }
            if (type.contains("attendance") || type.contains("checkin") || type.contains("checkout")) {
                return CHANNEL_ATTENDANCE;
            }
        }
        
        return CHANNEL_DEFAULT;
    }

    /**
     * Send notification to device notification center
     */
    private void sendNotification(String title, String body, String clickAction, 
                                  String type, String priority, Map<String, String> data) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        // Pass click action as extra
        intent.putExtra("clickAction", clickAction);
        intent.putExtra("notificationType", type);
        
        // Add all data to intent
        for (Map.Entry<String, String> entry : data.entrySet()) {
            intent.putExtra(entry.getKey(), entry.getValue());
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            (int) System.currentTimeMillis(), 
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        String channelId = getChannelForType(type, priority);
        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder notificationBuilder =
            new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setContentIntent(pendingIntent)
                .setPriority(getPriorityLevel(priority))
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        // Add big text style for longer messages
        if (body != null && body.length() > 50) {
            notificationBuilder.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
        }

        NotificationManager notificationManager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Use unique ID for each notification
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, notificationBuilder.build());

        Log.d(TAG, "Notification sent: " + title);
    }

    /**
     * Get notification priority level
     */
    private int getPriorityLevel(String priority) {
        switch (priority) {
            case "urgent":
                return NotificationCompat.PRIORITY_MAX;
            case "high":
                return NotificationCompat.PRIORITY_HIGH;
            case "low":
                return NotificationCompat.PRIORITY_LOW;
            default:
                return NotificationCompat.PRIORITY_DEFAULT;
        }
    }

    /**
     * Handle incoming call notifications - triggers native call UI
     */
    private void handleIncomingCallNotification(Map<String, String> data) {
        String callId = data.containsKey("callId") ? data.get("callId") : "";
        String callerId = data.containsKey("callerId") ? data.get("callerId") : "";
        String callerName = data.containsKey("callerName") ? data.get("callerName") : "Unknown";
        String callerPhoto = data.containsKey("callerPhoto") ? data.get("callerPhoto") : "";
        String callType = data.containsKey("callType") ? data.get("callType") : "audio";
        String chatId = data.containsKey("chatId") ? data.get("chatId") : "";

        if (callId.isEmpty()) {
            android.util.Log.e(TAG, "Incoming call notification missing callId");
            return;
        }

        android.util.Log.d(TAG, "Handling incoming call: " + callId + " from " + callerName);

        // Start the CallNotificationService with full-screen intent
        Intent callIntent = new Intent(this, CallNotificationService.class);
        callIntent.setAction(CallNotificationService.ACTION_INCOMING_CALL);
        callIntent.putExtra("callId", callId);
        callIntent.putExtra("callerId", callerId);
        callIntent.putExtra("callerName", callerName);
        callIntent.putExtra("callerPhoto", callerPhoto);
        callIntent.putExtra("callType", callType);
        callIntent.putExtra("chatId", chatId);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(callIntent);
        } else {
            startService(callIntent);
        }
    }
}
