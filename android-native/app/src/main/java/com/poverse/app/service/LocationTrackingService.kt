package com.poverse.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.database.FirebaseDatabase
import com.poverse.app.R
import com.poverse.app.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class LocationTrackingService : Service() {

    companion object {
        private const val TAG = "LocationTracking"
        private const val CHANNEL_ID = "poverse_location_tracking"
        private const val NOTIFICATION_ID = 1001
        private const val LOCATION_INTERVAL = 30_000L // 30 seconds
        private const val FASTEST_INTERVAL = 15_000L // 15 seconds
        const val ACTION_START = "com.poverse.app.START_TRACKING"
        const val ACTION_STOP = "com.poverse.app.STOP_TRACKING"
        const val EXTRA_USER_ID = "user_id"
        const val EXTRA_COMPANY_ID = "company_id"
    }

    @Inject
    lateinit var rtdb: FirebaseDatabase

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    private var userId: String = ""
    private var companyId: String = ""

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                userId = intent.getStringExtra(EXTRA_USER_ID) ?: ""
                companyId = intent.getStringExtra(EXTRA_COMPANY_ID) ?: ""
                if (userId.isNotEmpty()) {
                    startForeground(NOTIFICATION_ID, createNotification())
                    startLocationUpdates()
                }
            }
            ACTION_STOP -> {
                stopLocationUpdates()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL)
            .setWaitForAccurateLocation(false)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    updateLocationInDatabase(location.latitude, location.longitude, location.accuracy)
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )
            Log.d(TAG, "Location updates started for user: $userId")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing", e)
            stopSelf()
        }
    }

    private fun stopLocationUpdates() {
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
            locationCallback = null
        }
        // Update user status to offline
        if (userId.isNotEmpty()) {
            rtdb.getReference("users/$userId/isTracking").setValue(false)
        }
        Log.d(TAG, "Location updates stopped")
    }

    private fun updateLocationInDatabase(lat: Double, lng: Double, accuracy: Float) {
        if (userId.isEmpty()) return

        val timestamp = System.currentTimeMillis()
        val locationData = mapOf(
            "latitude" to lat,
            "longitude" to lng,
            "accuracy" to accuracy.toDouble(),
            "timestamp" to timestamp
        )

        // Update real-time location
        rtdb.getReference("locations/$companyId/$userId/current").setValue(locationData)

        // Add to location trail
        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
        rtdb.getReference("locations/$companyId/$userId/trail/$today")
            .push()
            .setValue(locationData)

        // Update user's last known location
        rtdb.getReference("users/$userId").updateChildren(
            mapOf(
                "lastLocation" to locationData,
                "isTracking" to true,
                "lastSeen" to timestamp
            )
        )

        Log.d(TAG, "Location updated: $lat, $lng (accuracy: ${accuracy}m)")
    }

    private fun createNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when PO-Verse is tracking your location"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pi = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, LocationTrackingService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPi = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("PO-Verse")
            .setContentText("Tracking your location...")
            .setOngoing(true)
            .setContentIntent(pi)
            .addAction(R.drawable.ic_notification, "Stop", stopPi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    override fun onDestroy() {
        stopLocationUpdates()
        super.onDestroy()
    }
}
