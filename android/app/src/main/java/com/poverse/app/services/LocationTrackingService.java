package com.poverse.app.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.poverse.app.MainActivity;
import com.poverse.app.R;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Timer;
import java.util.TimerTask;

/**
 * Foreground Service for continuous location tracking
 * Runs even when app is closed or killed
 */
public class LocationTrackingService extends Service {
    private static final String TAG = "LocationTrackingService";
    private static final String CHANNEL_ID = "poverse_location_tracking";
    private static final int NOTIFICATION_ID = 1001;
    private static final int LOCATION_INTERVAL_MS = 10000; // 10 seconds
    private static final int PRESENCE_INTERVAL_MS = 15000; // 15 seconds
    
    // Static variable to track if service is running
    private static boolean isRunning = false;
    
    // Public actions for starting/stopping
    public static final String ACTION_START_TRACKING = "com.poverse.app.START_LOCATION_TRACKING";
    public static final String ACTION_STOP_TRACKING = "com.poverse.app.STOP_LOCATION_TRACKING";
    
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private PowerManager.WakeLock wakeLock;
    private Timer presenceTimer;
    
    private String userId;
    private String userName;
    private String companyId;
    private String firebaseUrl;
    
    private double lastLatitude = 0;
    private double lastLongitude = 0;
    private float lastAccuracy = 0;

    private boolean stopRequested = false;
    
    /**
     * Check if the service is currently running
     */
    public static boolean isServiceRunning() {
        return isRunning;
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "LocationTrackingService created");
        isRunning = true;
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
        acquireWakeLock();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "LocationTrackingService started");
        
        // CRITICAL: On Android 12+, startForeground() MUST be called within 5 seconds
        // of startForegroundService(). Call it IMMEDIATELY before any other logic to
        // prevent ForegroundServiceDidNotStartInTimeException.
        // Ensure notification channel exists (in case onCreate was skipped on restart)
        createNotificationChannel();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ requires specifying the foreground service type
                startForeground(NOTIFICATION_ID, createNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, createNotification());
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service: " + e.getMessage());
            stopSelf();
            return START_NOT_STICKY;
        }
        
        if (intent != null) {
            String action = intent.getAction();
            
            // Handle stop action
            if (ACTION_STOP_TRACKING.equals(action)) {
                Log.d(TAG, "Stop tracking action received");
                stopRequested = true;
                stopForeground(STOP_FOREGROUND_REMOVE);
                stopSelf();
                return START_NOT_STICKY;
            }
            
            // Handle start action or default
            userId = intent.getStringExtra("userId");
            userName = intent.getStringExtra("userName");
            companyId = intent.getStringExtra("companyId");
            firebaseUrl = intent.getStringExtra("firebaseUrl");
            
            // Save to preferences for service restarts
            saveUserData();
        } else {
            // Restore from preferences
            loadUserData();
        }
        
        if (userId == null || userId.isEmpty()) {
            Log.e(TAG, "No userId provided, stopping service");
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        // Start location updates
        startLocationUpdates();
        
        // Start presence heartbeat
        startPresenceHeartbeat();
        
        // Service will be restarted if killed
        return START_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Tracks your location for work purposes");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PO-VERSE Active")
            .setContentText("Location tracking is running")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "POVerse::LocationWakeLock"
            );
            wakeLock.acquire(24 * 60 * 60 * 1000L); // 24 hours max
            Log.d(TAG, "WakeLock acquired");
        }
    }
    
    private void startLocationUpdates() {
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL_MS)
            .setMinUpdateIntervalMillis(LOCATION_INTERVAL_MS / 2)
            .setMinUpdateDistanceMeters(5)
            .build();
        
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    lastLatitude = location.getLatitude();
                    lastLongitude = location.getLongitude();
                    lastAccuracy = location.getAccuracy();
                    
                    Log.d(TAG, String.format("Location update: %.6f, %.6f (accuracy: %.1fm)", 
                        lastLatitude, lastLongitude, lastAccuracy));
                    
                    // Send location to Firebase
                    sendLocationToFirebase();
                }
            }
        };
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            );
            Log.d(TAG, "Location updates started");
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission denied: " + e.getMessage());
        }
    }
    
    private void startPresenceHeartbeat() {
        presenceTimer = new Timer();
        presenceTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                sendPresenceToFirebase();
            }
        }, 0, PRESENCE_INTERVAL_MS);
        Log.d(TAG, "Presence heartbeat started");
    }
    
    private void sendLocationToFirebase() {
        if (firebaseUrl == null || userId == null) return;
        
        new Thread(() -> {
            try {
                String url = firebaseUrl + "/userLocations/" + userId + ".json";
                
                JSONObject locationData = new JSONObject();
                locationData.put("latitude", lastLatitude);
                locationData.put("longitude", lastLongitude);
                locationData.put("accuracy", lastAccuracy);
                locationData.put("timestamp", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));
                locationData.put("source", "native_service");
                
                sendToFirebase(url, locationData.toString());
                Log.d(TAG, "Location sent to Firebase");
            } catch (Exception e) {
                Log.e(TAG, "Failed to send location: " + e.getMessage());
            }
        }).start();
    }
    
    private void sendPresenceToFirebase() {
        if (firebaseUrl == null || userId == null) return;
        
        new Thread(() -> {
            try {
                String url = firebaseUrl + "/presence/" + userId + ".json";
                
                JSONObject presenceData = new JSONObject();
                presenceData.put("isOnline", true);
                presenceData.put("lastActive", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));
                presenceData.put("source", "native_service");
                
                sendToFirebase(url, presenceData.toString());
                Log.d(TAG, "Presence sent to Firebase");
            } catch (Exception e) {
                Log.e(TAG, "Failed to send presence: " + e.getMessage());
            }
        }).start();
    }
    
    private void sendToFirebase(String urlString, String jsonData) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("PUT");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            OutputStream os = connection.getOutputStream();
            os.write(jsonData.getBytes("UTF-8"));
            os.close();
            
            int responseCode = connection.getResponseCode();
            if (responseCode != 200) {
                Log.w(TAG, "Firebase response: " + responseCode);
            }
        } catch (Exception e) {
            Log.e(TAG, "Firebase request failed: " + e.getMessage());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
    
    private void saveUserData() {
        SharedPreferences prefs = getSharedPreferences("poverse_tracking", Context.MODE_PRIVATE);
        prefs.edit()
            .putString("userId", userId)
            .putString("userName", userName)
            .putString("companyId", companyId)
            .putString("firebaseUrl", firebaseUrl)
            .apply();
    }
    
    private void loadUserData() {
        SharedPreferences prefs = getSharedPreferences("poverse_tracking", Context.MODE_PRIVATE);
        userId = prefs.getString("userId", null);
        userName = prefs.getString("userName", null);
        companyId = prefs.getString("companyId", null);
        firebaseUrl = prefs.getString("firebaseUrl", null);
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "LocationTrackingService destroyed");
        isRunning = false;
        
        // Stop location updates
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        
        // Stop presence timer
        if (presenceTimer != null) {
            presenceTimer.cancel();
            presenceTimer = null;
        }
        
        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        // Set user offline only when explicitly stopped
        if (stopRequested) {
            setUserOffline();
        }
        
        super.onDestroy();
    }
    
    private void setUserOffline() {
        if (firebaseUrl == null || userId == null) return;
        
        new Thread(() -> {
            try {
                String url = firebaseUrl + "/presence/" + userId + ".json";
                JSONObject presenceData = new JSONObject();
                presenceData.put("isOnline", false);
                presenceData.put("lastActive", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));
                sendToFirebase(url, presenceData.toString());
            } catch (Exception e) {
                Log.e(TAG, "Failed to set user offline: " + e.getMessage());
            }
        }).start();
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
