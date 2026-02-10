package com.poverse.app.data.repository

import android.net.Uri
import android.util.Log
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.google.firebase.storage.FirebaseStorage
import com.poverse.app.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AttendanceRepository @Inject constructor(
    private val rtdb: FirebaseDatabase,
    private val storage: FirebaseStorage,
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "AttendanceRepo"
    }

    private fun todayDate(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    fun observeTodayAttendance(userId: String): Flow<AttendanceRecord?> = callbackFlow {
        val date = todayDate()
        val ref = rtdb.reference.child("attendance").child(userId).child(date)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if (!snapshot.exists()) {
                    trySend(null)
                    return
                }
                val record = parseAttendanceRecord(snapshot, userId, date)
                trySend(record)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing attendance", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun checkIn(
        userId: String,
        companyId: String,
        location: LocationPoint,
        selfieUri: Uri?
    ): Result<AttendanceRecord> {
        return try {
            val date = todayDate()
            var selfieUrl = ""

            // Upload selfie if provided
            if (selfieUri != null) {
                val selfieRef = storage.reference
                    .child("attendance/$companyId/$userId/$date/checkin_selfie.jpg")
                selfieRef.putFile(selfieUri).await()
                selfieUrl = selfieRef.downloadUrl.await().toString()
            }

            val timestamp = System.currentTimeMillis()
            val checkInData = mapOf(
                "timestamp" to timestamp,
                "location" to mapOf(
                    "latitude" to location.latitude,
                    "longitude" to location.longitude,
                    "accuracy" to location.accuracy,
                    "address" to location.address
                ),
                "selfieUrl" to selfieUrl,
                "address" to location.address,
                "deviceInfo" to "Android Native"
            )

            val attendanceData = mapOf(
                "userId" to userId,
                "companyId" to companyId,
                "date" to date,
                "checkIn" to checkInData,
                "status" to "checked_in",
                "createdAt" to timestamp
            )

            // Calculate late status based on attendance settings
            val settingsSnapshot = rtdb.reference
                .child("attendanceSettings").child(companyId).get().await()
            val shiftStart = settingsSnapshot.child("shiftStartTime").getValue(String::class.java) ?: "09:00"
            val lateThreshold = settingsSnapshot.child("lateThresholdMinutes").getValue(Int::class.java) ?: 15
            val veryLateThreshold = settingsSnapshot.child("veryLateThresholdMinutes").getValue(Int::class.java) ?: 30

            val lateStatus = calculateLateStatus(timestamp, shiftStart, lateThreshold, veryLateThreshold)
            val fullData = attendanceData + ("lateStatus" to lateStatus.toString())

            rtdb.reference.child("attendance").child(userId).child(date)
                .updateChildren(fullData).await()

            val record = AttendanceRecord(
                userId = userId,
                companyId = companyId,
                date = date,
                checkIn = CheckInData(
                    timestamp = timestamp,
                    location = location,
                    selfieUrl = selfieUrl,
                    address = location.address,
                    deviceInfo = "Android Native"
                ),
                status = AttendanceStatus.CHECKED_IN,
                lateStatus = lateStatus
            )

            Result.success(record)
        } catch (e: Exception) {
            Log.e(TAG, "Check-in failed", e)
            Result.failure(e)
        }
    }

    suspend fun checkOut(
        userId: String,
        companyId: String,
        location: LocationPoint,
        selfieUri: Uri?
    ): Result<AttendanceRecord> {
        return try {
            val date = todayDate()
            var selfieUrl = ""

            if (selfieUri != null) {
                val selfieRef = storage.reference
                    .child("attendance/$companyId/$userId/$date/checkout_selfie.jpg")
                selfieRef.putFile(selfieUri).await()
                selfieUrl = selfieRef.downloadUrl.await().toString()
            }

            val timestamp = System.currentTimeMillis()
            val checkOutData = mapOf(
                "timestamp" to timestamp,
                "location" to mapOf(
                    "latitude" to location.latitude,
                    "longitude" to location.longitude,
                    "accuracy" to location.accuracy,
                    "address" to location.address
                ),
                "selfieUrl" to selfieUrl,
                "address" to location.address,
                "deviceInfo" to "Android Native"
            )

            // Calculate work duration
            val existingSnapshot = rtdb.reference.child("attendance").child(userId).child(date).get().await()
            val checkInTimestamp = existingSnapshot.child("checkIn").child("timestamp").getValue(Long::class.java) ?: 0L
            val workDurationMinutes = if (checkInTimestamp > 0) {
                ((timestamp - checkInTimestamp) / (1000 * 60)).toInt()
            } else 0

            val updateData = mapOf(
                "checkOut" to checkOutData,
                "status" to "checked_out",
                "workDurationMinutes" to workDurationMinutes
            )

            rtdb.reference.child("attendance").child(userId).child(date)
                .updateChildren(updateData).await()

            Result.success(AttendanceRecord(
                userId = userId,
                companyId = companyId,
                date = date,
                status = AttendanceStatus.CHECKED_OUT,
                workDurationMinutes = workDurationMinutes
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Check-out failed", e)
            Result.failure(e)
        }
    }

    suspend fun getAttendanceHistory(userId: String, limit: Int = 30): List<AttendanceRecord> {
        return try {
            val snapshot = rtdb.reference.child("attendance").child(userId)
                .orderByKey()
                .limitToLast(limit)
                .get().await()

            snapshot.children.mapNotNull { child ->
                val date = child.key ?: return@mapNotNull null
                parseAttendanceRecord(child, userId, date)
            }.sortedByDescending { it.date }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching attendance history", e)
            emptyList()
        }
    }

    suspend fun getCompanyAttendance(companyId: String, date: String): List<AttendanceRecord> {
        return try {
            val usersSnapshot = rtdb.reference.child("attendance")
                .get().await()

            val records = mutableListOf<AttendanceRecord>()
            usersSnapshot.children.forEach { userNode ->
                val userId = userNode.key ?: return@forEach
                val dateNode = userNode.child(date)
                if (dateNode.exists()) {
                    val company = dateNode.child("companyId").getValue(String::class.java) ?: ""
                    if (company == companyId) {
                        parseAttendanceRecord(dateNode, userId, date)?.let { records.add(it) }
                    }
                }
            }
            records
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching company attendance", e)
            emptyList()
        }
    }

    suspend fun getAttendanceSettings(companyId: String): AttendanceSettings {
        return try {
            val snapshot = rtdb.reference.child("attendanceSettings").child(companyId).get().await()
            AttendanceSettings(
                companyId = companyId,
                shiftStartTime = snapshot.child("shiftStartTime").getValue(String::class.java) ?: "09:00",
                shiftEndTime = snapshot.child("shiftEndTime").getValue(String::class.java) ?: "18:00",
                lateThresholdMinutes = snapshot.child("lateThresholdMinutes").getValue(Int::class.java) ?: 15,
                veryLateThresholdMinutes = snapshot.child("veryLateThresholdMinutes").getValue(Int::class.java) ?: 30,
                autoCheckoutEnabled = snapshot.child("autoCheckoutEnabled").getValue(Boolean::class.java) ?: true,
                selfieRequired = snapshot.child("selfieRequired").getValue(Boolean::class.java) ?: true,
                locationRequired = snapshot.child("locationRequired").getValue(Boolean::class.java) ?: true
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching attendance settings", e)
            AttendanceSettings(companyId = companyId)
        }
    }

    private fun calculateLateStatus(
        checkInTimestamp: Long,
        shiftStart: String,
        lateThreshold: Int,
        veryLateThreshold: Int
    ): LateStatus {
        val cal = Calendar.getInstance().apply { timeInMillis = checkInTimestamp }
        val parts = shiftStart.split(":")
        val shiftHour = parts[0].toIntOrNull() ?: 9
        val shiftMinute = parts.getOrNull(1)?.toIntOrNull() ?: 0

        val shiftCal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, shiftHour)
            set(Calendar.MINUTE, shiftMinute)
            set(Calendar.SECOND, 0)
        }

        val diffMinutes = ((cal.timeInMillis - shiftCal.timeInMillis) / (1000 * 60)).toInt()

        return when {
            diffMinutes <= 0 -> LateStatus.ON_TIME
            diffMinutes <= lateThreshold -> LateStatus.ON_TIME
            diffMinutes <= veryLateThreshold -> LateStatus.LATE
            else -> LateStatus.VERY_LATE
        }
    }

    private fun parseAttendanceRecord(snapshot: DataSnapshot, userId: String, date: String): AttendanceRecord? {
        return try {
            val checkInNode = snapshot.child("checkIn")
            val checkOutNode = snapshot.child("checkOut")

            val checkIn = if (checkInNode.exists()) {
                CheckInData(
                    timestamp = checkInNode.child("timestamp").getValue(Long::class.java) ?: 0,
                    location = LocationPoint(
                        latitude = checkInNode.child("location").child("latitude").getValue(Double::class.java) ?: 0.0,
                        longitude = checkInNode.child("location").child("longitude").getValue(Double::class.java) ?: 0.0,
                        accuracy = checkInNode.child("location").child("accuracy").getValue(Float::class.java) ?: 0f,
                        address = checkInNode.child("location").child("address").getValue(String::class.java) ?: ""
                    ),
                    selfieUrl = checkInNode.child("selfieUrl").getValue(String::class.java) ?: "",
                    address = checkInNode.child("address").getValue(String::class.java) ?: "",
                    deviceInfo = checkInNode.child("deviceInfo").getValue(String::class.java) ?: ""
                )
            } else null

            val checkOut = if (checkOutNode.exists()) {
                CheckOutData(
                    timestamp = checkOutNode.child("timestamp").getValue(Long::class.java) ?: 0,
                    location = LocationPoint(
                        latitude = checkOutNode.child("location").child("latitude").getValue(Double::class.java) ?: 0.0,
                        longitude = checkOutNode.child("location").child("longitude").getValue(Double::class.java) ?: 0.0,
                        accuracy = checkOutNode.child("location").child("accuracy").getValue(Float::class.java) ?: 0f,
                        address = checkOutNode.child("location").child("address").getValue(String::class.java) ?: ""
                    ),
                    selfieUrl = checkOutNode.child("selfieUrl").getValue(String::class.java) ?: "",
                    address = checkOutNode.child("address").getValue(String::class.java) ?: ""
                )
            } else null

            AttendanceRecord(
                userId = userId,
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                date = date,
                checkIn = checkIn,
                checkOut = checkOut,
                status = AttendanceStatus.fromString(snapshot.child("status").getValue(String::class.java) ?: "absent"),
                lateStatus = LateStatus.fromString(snapshot.child("lateStatus").getValue(String::class.java) ?: "on_time"),
                workDurationMinutes = snapshot.child("workDurationMinutes").getValue(Int::class.java) ?: 0
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing attendance record", e)
            null
        }
    }
}
