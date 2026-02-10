package com.poverse.app.plugins;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.poverse.app.services.LocationTrackingService;
import com.poverse.app.services.CallNotificationService;

/**
 * Capacitor Plugin to bridge native Android services with the web app
 * Provides methods for:
 * - Starting/stopping background location tracking
 * - Managing presence updates
 * - Triggering native call notifications
 * - Handling call actions
 */
@CapacitorPlugin(
    name = "NativeServices",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                Manifest.permission.POST_NOTIFICATIONS
            }
        )
    }
)
public class NativeServicesPlugin extends Plugin {
    private static final String TAG = "NativeServicesPlugin";
    
    // Permission request codes
    private static final int LOCATION_PERMISSION_CODE = 1001;
    private static final int BACKGROUND_LOCATION_CODE = 1002;
    
    // Store pending call for permission callbacks
    private PluginCall pendingLocationCall;
    
    @Override
    public void load() {
        super.load();
        Log.d(TAG, "NativeServicesPlugin loaded");

        // Handle any launch intent with call action
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        if (intent != null) {
            handleCallIntent(intent);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleCallIntent(intent);
    }
    
    /**
     * Start background location tracking service
     * Requires userId, companyId, and firebaseUrl
     */
    @PluginMethod
    public void startLocationTracking(PluginCall call) {
        String userId = call.getString("userId");
        String companyId = call.getString("companyId");
        String firebaseUrl = call.getString("firebaseUrl");
        String userName = call.getString("userName", "User");
        
        if (userId == null || userId.isEmpty()) {
            call.reject("userId is required");
            return;
        }
        
        if (companyId == null || companyId.isEmpty()) {
            call.reject("companyId is required");
            return;
        }
        
        if (firebaseUrl == null || firebaseUrl.isEmpty()) {
            call.reject("firebaseUrl is required");
            return;
        }

        if (!ensureActivity(call)) {
            return;
        }

        // Android 13+ requires notification permission for foreground services
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                call.reject("Notification permission is required to start background tracking");
                return;
            }
        }
        
        // Check location permissions
        if (!hasLocationPermission()) {
            pendingLocationCall = call;
            requestLocationPermission();
            return;
        }
        
        startLocationService(userId, companyId, firebaseUrl, userName);
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "Location tracking started");
        call.resolve(result);
    }
    
    /**
     * Stop background location tracking service
     */
    @PluginMethod
    public void stopLocationTracking(PluginCall call) {
        try {
            if (getContext() == null) {
                call.reject("Context not available");
                return;
            }
            // If service isn't running, don't start it just to stop (avoids FGS crash)
            if (!LocationTrackingService.isServiceRunning()) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Location tracking already stopped");
                call.resolve(result);
                return;
            }
            Intent intent = new Intent(getContext(), LocationTrackingService.class);
            intent.setAction(LocationTrackingService.ACTION_STOP_TRACKING);
            getContext().startService(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Location tracking stopped");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to stop location tracking: " + e.getMessage());
        }
    }
    
    /**
     * Check if location tracking is active
     */
    @PluginMethod
    public void isLocationTrackingActive(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", LocationTrackingService.isServiceRunning());
        call.resolve(result);
    }
    
    /**
     * Show incoming call notification with full-screen UI
     */
    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        String callId = call.getString("callId");
        String callerId = call.getString("callerId");
        String callerName = call.getString("callerName", "Unknown");
        String callerPhoto = call.getString("callerPhoto", "");
        String callType = call.getString("callType", "audio");
        String chatId = call.getString("chatId", "");
        
        if (callId == null || callId.isEmpty()) {
            call.reject("callId is required");
            return;
        }
        
        Log.d(TAG, "Showing incoming call from " + callerName);
        
        Intent callIntent = new Intent(getContext(), CallNotificationService.class);
        callIntent.setAction(CallNotificationService.ACTION_INCOMING_CALL);
        callIntent.putExtra("callId", callId);
        callIntent.putExtra("callerId", callerId);
        callIntent.putExtra("callerName", callerName);
        callIntent.putExtra("callerPhoto", callerPhoto);
        callIntent.putExtra("callType", callType);
        callIntent.putExtra("chatId", chatId);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(callIntent);
        } else {
            getContext().startService(callIntent);
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * Show ongoing call notification
     */
    @PluginMethod
    public void showOngoingCall(PluginCall call) {
        String callId = call.getString("callId");
        String callerId = call.getString("callerId");
        String callerName = call.getString("callerName", "Unknown");
        String callType = call.getString("callType", "audio");
        
        if (callId == null || callId.isEmpty()) {
            call.reject("callId is required");
            return;
        }
        
        Log.d(TAG, "Showing ongoing call with " + callerName);
        
        Intent callIntent = new Intent(getContext(), CallNotificationService.class);
        callIntent.setAction(CallNotificationService.ACTION_CALL_CONNECTED);
        callIntent.putExtra("callId", callId);
        callIntent.putExtra("callerId", callerId);
        callIntent.putExtra("callerName", callerName);
        callIntent.putExtra("callType", callType);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(callIntent);
        } else {
            getContext().startService(callIntent);
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * End call and dismiss notifications
     */
    @PluginMethod
    public void endCall(PluginCall call) {
        String callId = call.getString("callId");
        
        Log.d(TAG, "Ending call: " + callId);
        
        Intent callIntent = new Intent(getContext(), CallNotificationService.class);
        callIntent.setAction(CallNotificationService.ACTION_END_CALL);
        if (callId != null) {
            callIntent.putExtra("callId", callId);
        }
        getContext().startService(callIntent);
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * Cancel incoming call (call was answered elsewhere or cancelled)
     */
    @PluginMethod
    public void cancelIncomingCall(PluginCall call) {
        String callId = call.getString("callId");
        
        Log.d(TAG, "Cancelling incoming call: " + callId);
        
        Intent callIntent = new Intent(getContext(), CallNotificationService.class);
        callIntent.setAction(CallNotificationService.ACTION_END_CALL);
        if (callId != null) {
            callIntent.putExtra("callId", callId);
        }
        getContext().startService(callIntent);
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * Check if we have location permissions
     */
    @PluginMethod
    public void checkLocationPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasLocationPermission());
        result.put("backgroundGranted", hasBackgroundLocationPermission());
        call.resolve(result);
    }
    
    /**
     * Request location permissions
     */
    @PluginMethod
    public void requestLocationPermission(PluginCall call) {
        if (hasLocationPermission()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        
        if (!ensureActivity(call)) {
            return;
        }

        pendingLocationCall = call;
        requestLocationPermission();
    }
    
    // ==================== Helper Methods ====================
    
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), 
            Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    
    private boolean hasBackgroundLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ContextCompat.checkSelfPermission(getContext(),
                Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
        return true; // Not needed for older versions
    }
    
    private void requestLocationPermission() {
        if (getActivity() == null) {
            if (pendingLocationCall != null) {
                pendingLocationCall.reject("Activity not available to request permissions");
                pendingLocationCall = null;
            }
            return;
        }
        String[] permissions;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            permissions = new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            };
        } else {
            permissions = new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            };
        }
        
        ActivityCompat.requestPermissions(getActivity(), permissions, LOCATION_PERMISSION_CODE);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getStringExtra("action");
        String callId = intent.getStringExtra(CallNotificationService.EXTRA_CALL_ID);

        if (action == null || action.isEmpty()) return;

        JSObject payload = new JSObject();
        payload.put("action", action);
        if (callId != null) {
            payload.put("callId", callId);
        }

        Log.d(TAG, "Dispatching call action to web: " + action + " callId=" + callId);
        notifyListeners("callAction", payload, true);
    }
    
    private void startLocationService(String userId, String companyId, String firebaseUrl, String userName) {
        if (getContext() == null) {
            Log.e(TAG, "Context not available, cannot start location service");
            return;
        }
        Intent intent = new Intent(getContext(), LocationTrackingService.class);
        intent.setAction(LocationTrackingService.ACTION_START_TRACKING);
        intent.putExtra("userId", userId);
        intent.putExtra("companyId", companyId);
        intent.putExtra("firebaseUrl", firebaseUrl);
        intent.putExtra("userName", userName);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            Log.d(TAG, "Location tracking service started for user: " + userId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start location service: " + e.getMessage());
        }
    }

    private boolean ensureActivity(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity not available");
            return false;
        }
        return true;
    }
    
    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == LOCATION_PERMISSION_CODE) {
            boolean granted = grantResults.length > 0 && 
                grantResults[0] == PackageManager.PERMISSION_GRANTED;
            
            if (pendingLocationCall != null) {
                if (granted) {
                    // Check if background location is needed (Android 10+)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasBackgroundLocationPermission()) {
                        // Request background location separately
                        ActivityCompat.requestPermissions(getActivity(),
                            new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                            BACKGROUND_LOCATION_CODE);
                        return;
                    }
                    
                    // Start location service
                    String userId = pendingLocationCall.getString("userId");
                    String companyId = pendingLocationCall.getString("companyId");
                    String firebaseUrl = pendingLocationCall.getString("firebaseUrl");
                    String userName = pendingLocationCall.getString("userName", "User");
                    
                    startLocationService(userId, companyId, firebaseUrl, userName);
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Location tracking started");
                    pendingLocationCall.resolve(result);
                } else {
                    pendingLocationCall.reject("Location permission denied");
                }
                pendingLocationCall = null;
            }
        } else if (requestCode == BACKGROUND_LOCATION_CODE) {
            // Background location result - proceed regardless
            if (pendingLocationCall != null) {
                String userId = pendingLocationCall.getString("userId");
                String companyId = pendingLocationCall.getString("companyId");
                String firebaseUrl = pendingLocationCall.getString("firebaseUrl");
                String userName = pendingLocationCall.getString("userName", "User");
                
                startLocationService(userId, companyId, firebaseUrl, userName);
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Location tracking started");
                result.put("backgroundPermission", grantResults.length > 0 && 
                    grantResults[0] == PackageManager.PERMISSION_GRANTED);
                pendingLocationCall.resolve(result);
                pendingLocationCall = null;
            }
        }
    }
}
