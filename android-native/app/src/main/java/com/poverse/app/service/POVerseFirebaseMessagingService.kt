package com.poverse.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.poverse.app.R
import com.poverse.app.ui.MainActivity

class POVerseFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "POVerseFCM"
        private const val CHANNEL_ID = "poverse_notifications"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: $token")
        // Save token to RTDB for the current user
        saveTokenToDatabase(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "Message received from: ${message.from}")

        val title = message.notification?.title ?: message.data["title"] ?: "PO-Verse"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val type = message.data["type"] ?: "general"
        val targetId = message.data["targetId"] ?: ""

        sendNotification(title, body, type, targetId)
    }

    private fun sendNotification(title: String, body: String, type: String, targetId: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("notification_type", type)
            putExtra("target_id", targetId)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = when (type) {
            "chat" -> "poverse_chat"
            "attendance" -> "poverse_attendance"
            "leave", "expense" -> "poverse_approvals"
            else -> CHANNEL_ID
        }

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        // Create channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                getChannelName(type),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "PO-Verse $type notifications"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val notificationId = System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, notificationBuilder.build())
    }

    private fun getChannelName(type: String): String = when (type) {
        "chat" -> "Chat Messages"
        "attendance" -> "Attendance"
        "leave" -> "Leave Updates"
        "expense" -> "Expense Updates"
        else -> "General Notifications"
    }

    private fun saveTokenToDatabase(token: String) {
        try {
            // Token will be saved by the AuthRepository when the user is logged in
            // This is a fallback to store token at device level
            val prefs = getSharedPreferences("poverse_prefs", MODE_PRIVATE)
            prefs.edit().putString("fcm_token", token).apply()

            val userId = prefs.getString("current_user_id", null)
            if (userId != null) {
                FirebaseDatabase.getInstance("https://po-verse-default-rtdb.asia-southeast1.firebasedatabase.app")
                    .getReference("users/$userId/fcmToken")
                    .setValue(token)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save FCM token", e)
        }
    }
}
