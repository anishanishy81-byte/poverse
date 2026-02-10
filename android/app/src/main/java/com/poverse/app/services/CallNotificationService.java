package com.poverse.app.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.poverse.app.MainActivity;
import com.poverse.app.R;
import com.poverse.app.activities.IncomingCallActivity;

/**
 * Foreground Service for handling calls
 * Manages incoming call notifications and ongoing call status
 */
public class CallNotificationService extends Service {
    private static final String TAG = "CallNotificationService";
    private static final String CHANNEL_INCOMING_CALL = "poverse_incoming_call";
    private static final String CHANNEL_ONGOING_CALL = "poverse_ongoing_call";
    private static final int INCOMING_CALL_NOTIFICATION_ID = 2001;
    private static final int ONGOING_CALL_NOTIFICATION_ID = 2002;
    private static final int CALL_TIMEOUT_MS = 30000; // 30 seconds
    
    public static final String ACTION_INCOMING_CALL = "com.poverse.app.INCOMING_CALL";
    public static final String ACTION_ACCEPT_CALL = "com.poverse.app.ACCEPT_CALL";
    public static final String ACTION_DECLINE_CALL = "com.poverse.app.DECLINE_CALL";
    public static final String ACTION_END_CALL = "com.poverse.app.END_CALL";
    public static final String ACTION_CALL_CONNECTED = "com.poverse.app.CALL_CONNECTED";
    public static final String ACTION_STOP_SERVICE = "com.poverse.app.STOP_CALL_SERVICE";
    
    public static final String EXTRA_CALL_ID = "callId";
    public static final String EXTRA_CALLER_ID = "callerId";
    public static final String EXTRA_CALLER_NAME = "callerName";
    public static final String EXTRA_CALL_TYPE = "callType";
    
    private PowerManager.WakeLock wakeLock;
    private Vibrator vibrator;
    private Handler timeoutHandler;
    private Runnable timeoutRunnable;
    
    private String currentCallId;
    private String callerId;
    private String callerName;
    private String callType;
    private long callStartTime;
    private boolean isCallActive = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "CallNotificationService created");
        createNotificationChannels();
        timeoutHandler = new Handler(Looper.getMainLooper());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // CRITICAL: On Android 12+, startForeground() MUST be called within 5 seconds
        // of startForegroundService(). Call it IMMEDIATELY with a placeholder notification
        // before any other logic to prevent ForegroundServiceDidNotStartInTimeException.
        // Specific handlers will replace this notification with the real one.
        // Ensure notification channels exist (in case onCreate was skipped on restart)
        createNotificationChannels();
        try {
            Notification placeholder = new NotificationCompat.Builder(this, CHANNEL_ONGOING_CALL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("PO-VERSE")
                .setContentText("Initializing...")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ requires specifying the foreground service type
                startForeground(INCOMING_CALL_NOTIFICATION_ID, placeholder,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
            } else {
                startForeground(INCOMING_CALL_NOTIFICATION_ID, placeholder);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service: " + e.getMessage());
            stopSelf();
            return START_NOT_STICKY;
        }
        
        if (intent == null) {
            Log.w(TAG, "Null intent, stopping service");
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        String action = intent.getAction();
        Log.d(TAG, "CallNotificationService action: " + action);
        
        if (action == null) {
            Log.w(TAG, "Null action, stopping service");
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        switch (action) {
            case ACTION_INCOMING_CALL:
                handleIncomingCall(intent);
                break;
            case ACTION_ACCEPT_CALL:
                handleAcceptCall();
                break;
            case ACTION_DECLINE_CALL:
                handleDeclineCall();
                break;
            case ACTION_END_CALL:
                handleEndCall();
                break;
            case ACTION_CALL_CONNECTED:
                handleCallConnected(intent);
                break;
            case ACTION_STOP_SERVICE:
                stopCallService();
                break;
            default:
                stopForeground(STOP_FOREGROUND_REMOVE);
                stopSelf();
                break;
        }
        
        return START_STICKY;
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;
            
            // Incoming call channel - HIGH priority with sound and vibration
            NotificationChannel incomingChannel = new NotificationChannel(
                CHANNEL_INCOMING_CALL,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            incomingChannel.setDescription("Incoming call notifications");
            incomingChannel.enableLights(true);
            incomingChannel.setLightColor(Color.GREEN);
            incomingChannel.enableVibration(true);
            incomingChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
            incomingChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            incomingChannel.setBypassDnd(true);
            
            // Set ringtone sound
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            incomingChannel.setSound(ringtoneUri, audioAttributes);
            
            manager.createNotificationChannel(incomingChannel);
            
            // Ongoing call channel - LOW priority, no sound
            NotificationChannel ongoingChannel = new NotificationChannel(
                CHANNEL_ONGOING_CALL,
                "Ongoing Calls",
                NotificationManager.IMPORTANCE_LOW
            );
            ongoingChannel.setDescription("Ongoing call status");
            ongoingChannel.setSound(null, null);
            ongoingChannel.setShowBadge(false);
            
            manager.createNotificationChannel(ongoingChannel);
        }
    }
    
    private void handleIncomingCall(Intent intent) {
        currentCallId = intent.getStringExtra(EXTRA_CALL_ID);
        callerId = intent.getStringExtra(EXTRA_CALLER_ID);
        callerName = intent.getStringExtra(EXTRA_CALLER_NAME);
        callType = intent.getStringExtra(EXTRA_CALL_TYPE);
        
        if (currentCallId == null || callerName == null) {
            Log.e(TAG, "Missing call data");
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return;
        }
        
        Log.d(TAG, "Incoming call from: " + callerName + " (type: " + callType + ")");
        
        // Acquire wake lock
        acquireWakeLock();
        
        // Start vibration
        startVibration();
        
        // Show full-screen incoming call notification
        showIncomingCallNotification();
        
        // Set call timeout
        startCallTimeout();
    }
    
    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK | 
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "POVerse::CallWakeLock"
            );
            wakeLock.acquire(60 * 1000L); // 60 seconds max
            Log.d(TAG, "Call WakeLock acquired");
        }
    }
    
    private void startVibration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vibratorManager != null) {
                vibrator = vibratorManager.getDefaultVibrator();
            }
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }
        
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 500, 200, 500, 200, 500, 1000};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
            Log.d(TAG, "Vibration started");
        }
    }
    
    private void stopVibration() {
        if (vibrator != null) {
            vibrator.cancel();
            Log.d(TAG, "Vibration stopped");
        }
    }
    
    private void showIncomingCallNotification() {
        // Intent to open full-screen call activity
        Intent fullScreenIntent = new Intent(this, IncomingCallActivity.class);
        fullScreenIntent.putExtra(EXTRA_CALL_ID, currentCallId);
        fullScreenIntent.putExtra(EXTRA_CALLER_ID, callerId);
        fullScreenIntent.putExtra(EXTRA_CALLER_NAME, callerName);
        fullScreenIntent.putExtra(EXTRA_CALL_TYPE, callType);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Accept call action
        Intent acceptIntent = new Intent(this, CallNotificationService.class);
        acceptIntent.setAction(ACTION_ACCEPT_CALL);
        PendingIntent acceptPendingIntent = PendingIntent.getService(
            this, 1, acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Decline call action
        Intent declineIntent = new Intent(this, CallNotificationService.class);
        declineIntent.setAction(ACTION_DECLINE_CALL);
        PendingIntent declinePendingIntent = PendingIntent.getService(
            this, 2, declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_INCOMING_CALL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callerName)
            .setContentText("video".equals(callType) ? "Incoming video call" : "Incoming voice call")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .addAction(android.R.drawable.ic_menu_call, "Accept", acceptPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
            .setTimeoutAfter(CALL_TIMEOUT_MS)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
        
        // Use BigTextStyle for better visibility
        builder.setStyle(new NotificationCompat.BigTextStyle()
            .bigText("video".equals(callType) ? "Incoming video call from " + callerName : "Incoming voice call from " + callerName));
        
        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_INSISTENT;
        
        startForeground(INCOMING_CALL_NOTIFICATION_ID, notification);
        Log.d(TAG, "Incoming call notification shown");
    }
    
    private void startCallTimeout() {
        timeoutRunnable = () -> {
            Log.d(TAG, "Call timeout - marking as missed");
            handleMissedCall();
        };
        timeoutHandler.postDelayed(timeoutRunnable, CALL_TIMEOUT_MS);
    }
    
    private void cancelCallTimeout() {
        if (timeoutHandler != null && timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
        }
    }
    
    private void handleAcceptCall() {
        Log.d(TAG, "Call accepted");
        cancelCallTimeout();
        stopVibration();
        
        // Launch main activity with call data
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("action", "acceptCall");
        intent.putExtra(EXTRA_CALL_ID, currentCallId);
        intent.putExtra(EXTRA_CALLER_ID, callerId);
        intent.putExtra(EXTRA_CALLER_NAME, callerName);
        intent.putExtra(EXTRA_CALL_TYPE, callType);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        
        // Will be replaced by ongoing call notification when connected
    }
    
    private void handleDeclineCall() {
        Log.d(TAG, "Call declined");
        cancelCallTimeout();
        stopVibration();
        releaseWakeLock();
        
        // Notify the web app
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("action", "declineCall");
        intent.putExtra(EXTRA_CALL_ID, currentCallId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        
        stopCallService();
    }
    
    private void handleMissedCall() {
        Log.d(TAG, "Missed call from: " + callerName);
        cancelCallTimeout();
        stopVibration();
        releaseWakeLock();
        
        // Show missed call notification
        showMissedCallNotification();
        
        // Notify web app
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("action", "missedCall");
        intent.putExtra(EXTRA_CALL_ID, currentCallId);
        intent.putExtra(EXTRA_CALLER_NAME, callerName);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        
        stopCallService();
    }
    
    private void showMissedCallNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("action", "openChat");
        intent.putExtra(EXTRA_CALLER_ID, callerId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "poverse_default")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Missed Call")
            .setContentText("Missed " + ("video".equals(callType) ? "video" : "voice") + " call from " + callerName)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(3001, builder.build());
        }
    }
    
    private void handleCallConnected(Intent intent) {
        Log.d(TAG, "Call connected");
        isCallActive = true;
        callStartTime = System.currentTimeMillis();
        cancelCallTimeout();
        stopVibration();
        
        // Show ongoing call notification
        showOngoingCallNotification();
    }
    
    private void showOngoingCallNotification() {
        Intent endCallIntent = new Intent(this, CallNotificationService.class);
        endCallIntent.setAction(ACTION_END_CALL);
        PendingIntent endCallPendingIntent = PendingIntent.getService(
            this, 3, endCallIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String callTypeText = "video".equals(callType) ? "Video call" : "Voice call";
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ONGOING_CALL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callerName)
            .setContentText(callTypeText + " in progress")
            .setUsesChronometer(true)
            .setWhen(callStartTime)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openAppPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Call", endCallPendingIntent);
        
        startForeground(ONGOING_CALL_NOTIFICATION_ID, builder.build());
        Log.d(TAG, "Ongoing call notification shown");
    }
    
    private void handleEndCall() {
        Log.d(TAG, "Call ended");
        isCallActive = false;
        
        // Notify web app
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("action", "endCall");
        intent.putExtra(EXTRA_CALL_ID, currentCallId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        
        stopCallService();
    }
    
    private void stopCallService() {
        cancelCallTimeout();
        stopVibration();
        releaseWakeLock();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        Log.d(TAG, "Call service stopped");
    }
    
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "Call WakeLock released");
        }
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "CallNotificationService destroyed");
        cancelCallTimeout();
        stopVibration();
        releaseWakeLock();
        super.onDestroy();
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
