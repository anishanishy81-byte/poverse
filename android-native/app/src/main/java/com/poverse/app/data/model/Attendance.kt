package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AttendanceRecord(
    val id: String = "",
    val userId: String = "",
    val companyId: String = "",
    val date: String = "", // YYYY-MM-DD
    val checkIn: CheckInData? = null,
    val checkOut: CheckOutData? = null,
    val status: AttendanceStatus = AttendanceStatus.ABSENT,
    val lateStatus: LateStatus = LateStatus.ON_TIME,
    val earlyDepartureStatus: String = "",
    val workDurationMinutes: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class CheckInData(
    val timestamp: Long = 0,
    val location: LocationPoint? = null,
    val selfieUrl: String = "",
    val address: String = "",
    val deviceInfo: String = ""
)

@Serializable
data class CheckOutData(
    val timestamp: Long = 0,
    val location: LocationPoint? = null,
    val selfieUrl: String = "",
    val address: String = "",
    val deviceInfo: String = "",
    val autoCheckout: Boolean = false
)

@Serializable
data class LocationPoint(
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val accuracy: Float = 0f,
    val address: String = ""
)

@Serializable
enum class AttendanceStatus {
    CHECKED_IN, CHECKED_OUT, ABSENT, ON_LEAVE, HALF_DAY;

    companion object {
        fun fromString(value: String): AttendanceStatus = when (value.lowercase()) {
            "checked_in" -> CHECKED_IN
            "checked_out" -> CHECKED_OUT
            "on_leave" -> ON_LEAVE
            "half_day" -> HALF_DAY
            else -> ABSENT
        }
    }

    override fun toString(): String = when (this) {
        CHECKED_IN -> "checked_in"
        CHECKED_OUT -> "checked_out"
        ABSENT -> "absent"
        ON_LEAVE -> "on_leave"
        HALF_DAY -> "half_day"
    }
}

@Serializable
enum class LateStatus {
    ON_TIME, LATE, VERY_LATE;

    companion object {
        fun fromString(value: String): LateStatus = when (value.lowercase()) {
            "late" -> LATE
            "very_late" -> VERY_LATE
            else -> ON_TIME
        }
    }

    override fun toString(): String = when (this) {
        ON_TIME -> "on_time"
        LATE -> "late"
        VERY_LATE -> "very_late"
    }
}

@Serializable
data class AttendanceSettings(
    val companyId: String = "",
    val shiftStartTime: String = "09:00",
    val shiftEndTime: String = "18:00",
    val lateThresholdMinutes: Int = 15,
    val veryLateThresholdMinutes: Int = 30,
    val autoCheckoutEnabled: Boolean = true,
    val autoCheckoutTime: String = "20:00",
    val selfieRequired: Boolean = true,
    val locationRequired: Boolean = true,
    val workingDays: List<Int> = listOf(1, 2, 3, 4, 5) // Mon-Fri
)
