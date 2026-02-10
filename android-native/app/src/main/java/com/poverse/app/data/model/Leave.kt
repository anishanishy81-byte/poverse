package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LeaveRequest(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val companyId: String = "",
    val leaveType: LeaveType = LeaveType.CASUAL,
    val startDate: String = "", // YYYY-MM-DD
    val endDate: String = "",
    val duration: LeaveDuration = LeaveDuration.FULL_DAY,
    val reason: String = "",
    val attachmentUrl: String = "",
    val status: LeaveStatus = LeaveStatus.PENDING,
    val approvedBy: String = "",
    val approvedAt: Long = 0,
    val rejectionReason: String = "",
    val totalDays: Double = 1.0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
enum class LeaveType {
    SICK, CASUAL, EARNED, UNPAID, MATERNITY, PATERNITY, BEREAVEMENT;

    companion object {
        fun fromString(value: String): LeaveType = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            CASUAL
        }
    }

    fun displayName(): String = name.lowercase().replaceFirstChar { it.uppercase() }
}

@Serializable
enum class LeaveDuration {
    FULL_DAY, HALF_DAY_MORNING, HALF_DAY_AFTERNOON;

    companion object {
        fun fromString(value: String): LeaveDuration = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            FULL_DAY
        }
    }

    fun displayName(): String = when (this) {
        FULL_DAY -> "Full Day"
        HALF_DAY_MORNING -> "Half Day (Morning)"
        HALF_DAY_AFTERNOON -> "Half Day (Afternoon)"
    }
}

@Serializable
enum class LeaveStatus {
    PENDING, APPROVED, REJECTED, CANCELLED;

    companion object {
        fun fromString(value: String): LeaveStatus = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            PENDING
        }
    }
}

@Serializable
data class LeaveBalance(
    val userId: String = "",
    val companyId: String = "",
    val year: Int = 2026,
    val balances: Map<String, LeaveTypeBalance> = emptyMap()
)

@Serializable
data class LeaveTypeBalance(
    val total: Double = 0.0,
    val used: Double = 0.0,
    val pending: Double = 0.0,
    val available: Double = 0.0,
    val carryForward: Double = 0.0
)

@Serializable
data class LeavePolicy(
    val companyId: String = "",
    val allocations: Map<String, Double> = mapOf(
        "sick" to 12.0,
        "casual" to 12.0,
        "earned" to 15.0,
        "unpaid" to 365.0,
        "maternity" to 180.0,
        "paternity" to 15.0,
        "bereavement" to 5.0
    ),
    val allowHalfDay: Boolean = true,
    val requireAttachment: Boolean = false,
    val minAdvanceDays: Int = 1,
    val maxConsecutiveDays: Int = 30,
    val carryForwardEnabled: Boolean = true,
    val maxCarryForward: Double = 5.0
)
