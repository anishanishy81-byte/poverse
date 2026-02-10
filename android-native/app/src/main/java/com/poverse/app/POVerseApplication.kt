package com.poverse.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class POVerseApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        createNotificationChannels()
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            val channels = listOf(
                NotificationChannel(
                    "poverse_default",
                    getString(R.string.notification_channel_default),
                    NotificationManager.IMPORTANCE_DEFAULT
                ),
                NotificationChannel(
                    "poverse_chat",
                    getString(R.string.notification_channel_chat),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    "poverse_attendance",
                    getString(R.string.notification_channel_attendance),
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    "poverse_targets",
                    getString(R.string.notification_channel_targets),
                    NotificationManager.IMPORTANCE_DEFAULT
                ),
                NotificationChannel(
                    "poverse_location",
                    getString(R.string.notification_channel_location),
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    setShowBadge(false)
                }
            )

            channels.forEach { manager.createNotificationChannel(it) }
        }
    }
}
