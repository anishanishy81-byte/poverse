package com.poverse.app.data.repository

import android.util.Log
import com.google.firebase.database.FirebaseDatabase
import com.poverse.app.data.model.LocationData
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepository @Inject constructor(
    private val rtdb: FirebaseDatabase
) {
    companion object {
        private const val TAG = "LocationRepository"
    }

    suspend fun updateLocation(
        userId: String,
        companyId: String,
        latitude: Double,
        longitude: Double,
        accuracy: Float,
        address: String = ""
    ) {
        try {
            val locationData = mapOf(
                "userId" to userId,
                "latitude" to latitude,
                "longitude" to longitude,
                "accuracy" to accuracy,
                "timestamp" to System.currentTimeMillis(),
                "address" to address,
                "companyId" to companyId,
                "isOnline" to true
            )

            rtdb.reference.child("locations").child(userId)
                .setValue(locationData).await()

            // Also store in location history
            rtdb.reference.child("locationHistory").child(userId)
                .push().setValue(locationData).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating location", e)
        }
    }

    suspend fun getAgentLocations(companyId: String): List<LocationData> {
        return try {
            val snapshot = rtdb.reference.child("locations").get().await()
            snapshot.children.mapNotNull { child ->
                val company = child.child("companyId").getValue(String::class.java) ?: ""
                if (company != companyId) return@mapNotNull null

                LocationData(
                    userId = child.key ?: "",
                    latitude = child.child("latitude").getValue(Double::class.java) ?: 0.0,
                    longitude = child.child("longitude").getValue(Double::class.java) ?: 0.0,
                    accuracy = child.child("accuracy").getValue(Float::class.java) ?: 0f,
                    timestamp = child.child("timestamp").getValue(Long::class.java) ?: 0,
                    address = child.child("address").getValue(String::class.java) ?: "",
                    companyId = company,
                    isOnline = child.child("isOnline").getValue(Boolean::class.java) ?: false
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching agent locations", e)
            emptyList()
        }
    }

    fun calculateDistance(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Double {
        val r = 6371.0 // Earth radius in km
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return r * c
    }
}
