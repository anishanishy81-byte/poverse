package com.poverse.app.data.repository

import android.util.Log
import com.google.firebase.database.*
import com.poverse.app.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    private val rtdb: FirebaseDatabase
) {
    companion object {
        private const val TAG = "NotificationRepo"
    }

    fun observeNotifications(userId: String): Flow<List<AppNotification>> = callbackFlow {
        val ref = rtdb.reference.child("notifications").child(userId)
            .orderByChild("createdAt")
            .limitToLast(50)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val notifications = snapshot.children.mapNotNull { child ->
                    try {
                        val data = mutableMapOf<String, String>()
                        child.child("data").children.forEach {
                            data[it.key ?: ""] = it.getValue(String::class.java) ?: ""
                        }

                        AppNotification(
                            id = child.key ?: "",
                            userId = child.child("userId").getValue(String::class.java) ?: userId,
                            companyId = child.child("companyId").getValue(String::class.java) ?: "",
                            title = child.child("title").getValue(String::class.java) ?: "",
                            body = child.child("body").getValue(String::class.java) ?: "",
                            type = child.child("type").getValue(String::class.java) ?: "general",
                            priority = child.child("priority").getValue(String::class.java) ?: "normal",
                            data = data,
                            isRead = child.child("isRead").getValue(Boolean::class.java) ?: false,
                            createdAt = child.child("createdAt").getValue(Long::class.java) ?: 0
                        )
                    } catch (e: Exception) {
                        null
                    }
                }.sortedByDescending { it.createdAt }
                trySend(notifications)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing notifications", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun markAsRead(userId: String, notificationId: String) {
        try {
            rtdb.reference.child("notifications").child(userId).child(notificationId)
                .child("isRead").setValue(true).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error marking notification as read", e)
        }
    }

    suspend fun markAllAsRead(userId: String) {
        try {
            val snapshot = rtdb.reference.child("notifications").child(userId).get().await()
            val updates = mutableMapOf<String, Any>()
            snapshot.children.forEach { child ->
                val isRead = child.child("isRead").getValue(Boolean::class.java) ?: false
                if (!isRead) {
                    updates["${child.key}/isRead"] = true
                }
            }
            if (updates.isNotEmpty()) {
                rtdb.reference.child("notifications").child(userId)
                    .updateChildren(updates).await()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error marking all notifications as read", e)
        }
    }

    suspend fun getUnreadCount(userId: String): Int {
        return try {
            val snapshot = rtdb.reference.child("notifications").child(userId).get().await()
            snapshot.children.count { child ->
                !(child.child("isRead").getValue(Boolean::class.java) ?: false)
            }
        } catch (e: Exception) {
            0
        }
    }
}
