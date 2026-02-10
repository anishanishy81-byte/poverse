package com.poverse.app.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.poverse.app.services.LocationTrackingService;

/**
 * Boot Receiver for PO-VERSE
 * Restarts location tracking service after device reboot
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "POVerseBootReceiver";
    private static final String PREFS_NAME = "POVerseLocationPrefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        Log.d(TAG, "Boot receiver triggered: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            Log.d(TAG, "Device boot completed, checking if location tracking was active");
            
            // Check if location tracking was previously active
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String userId = prefs.getString("userId", "");
            String companyId = prefs.getString("companyId", "");
            String firebaseUrl = prefs.getString("firebaseUrl", "");
            
            if (!userId.isEmpty() && !companyId.isEmpty() && !firebaseUrl.isEmpty()) {
                Log.d(TAG, "Restarting location tracking for user: " + userId);
                
                // Restart the location tracking service
                Intent serviceIntent = new Intent(context, LocationTrackingService.class);
                serviceIntent.setAction(LocationTrackingService.ACTION_START_TRACKING);
                serviceIntent.putExtra("userId", userId);
                serviceIntent.putExtra("companyId", companyId);
                serviceIntent.putExtra("firebaseUrl", firebaseUrl);
                serviceIntent.putExtra("userName", prefs.getString("userName", "User"));
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                    Log.d(TAG, "Location tracking service restarted after boot");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to restart location tracking: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "No previous location tracking session found");
            }
        }
    }
}
