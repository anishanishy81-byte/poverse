package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Target(
    val id: String = "",
    val name: String = "",
    val location: LocationPoint? = null,
    val address: String = "",
    val contactPerson: String = "",
    val contactPhone: String = "",
    val contactEmail: String = "",
    val leadStatus: LeadStatus = LeadStatus.NEW,
    val totalVisits: Int = 0,
    val companyId: String = "",
    val createdBy: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class AdminTarget(
    val id: String = "",
    val name: String = "",
    val businessName: String = "",
    val location: LocationPoint? = null,
    val address: String = "",
    val contactPerson: String = "",
    val contactPhone: String = "",
    val contactEmail: String = "",
    val description: String = "",
    val category: String = "",
    val tags: List<String> = emptyList(),
    val priority: TargetPriority = TargetPriority.MEDIUM,
    val deadline: Long? = null,
    val recurrence: String = "none",
    val leadStatus: LeadStatus = LeadStatus.NEW,
    val totalVisits: Int = 0,
    val companyId: String = "",
    val createdBy: String = "",
    val isActive: Boolean = true,
    val customFields: Map<String, String> = emptyMap(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class TargetAssignment(
    val id: String = "",
    val targetId: String = "",
    val userId: String = "",
    val userName: String = "",
    val assignedBy: String = "",
    val visitReason: String = "",
    val priority: TargetPriority = TargetPriority.MEDIUM,
    val requiredVisits: Int = 1,
    val completedVisits: Int = 0,
    val deadline: Long? = null,
    val notes: String = "",
    val status: String = "pending",
    val companyId: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class TargetVisit(
    val id: String = "",
    val targetId: String = "",
    val targetName: String = "",
    val userId: String = "",
    val userName: String = "",
    val companyId: String = "",
    val assignmentId: String = "",
    val visitReason: String = "",
    val status: VisitStatus = VisitStatus.PENDING,
    val leadStatus: LeadStatus = LeadStatus.NEW,
    val startTime: Long? = null,
    val endTime: Long? = null,
    val durationMinutes: Int = 0,
    val startLocation: LocationPoint? = null,
    val endLocation: LocationPoint? = null,
    val targetLocation: LocationPoint? = null,
    val distanceKm: Double = 0.0,
    val isWithinGeofence: Boolean = false,
    val conversationNotes: String = "",
    val outcomeFlags: List<String> = emptyList(),
    val offersDiscussed: String = "",
    val nextFollowUpDate: String = "",
    val photos: List<String> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
enum class VisitStatus {
    PENDING, IN_TRANSIT, REACHED, IN_PROGRESS, COMPLETED, SKIPPED;

    companion object {
        fun fromString(value: String): VisitStatus = when (value.lowercase()) {
            "in_transit" -> IN_TRANSIT
            "reached" -> REACHED
            "in_progress" -> IN_PROGRESS
            "completed" -> COMPLETED
            "skipped" -> SKIPPED
            else -> PENDING
        }
    }

    override fun toString(): String = name.lowercase()
}

@Serializable
enum class LeadStatus {
    NEW, CONTACTED, INTERESTED, NOT_INTERESTED, FOLLOW_UP, CONVERTED, LOST;

    companion object {
        fun fromString(value: String): LeadStatus = when (value.lowercase()) {
            "contacted" -> CONTACTED
            "interested" -> INTERESTED
            "not_interested" -> NOT_INTERESTED
            "follow_up" -> FOLLOW_UP
            "converted" -> CONVERTED
            "lost" -> LOST
            else -> NEW
        }
    }

    override fun toString(): String = name.lowercase()

    fun displayName(): String = when (this) {
        NEW -> "New"
        CONTACTED -> "Contacted"
        INTERESTED -> "Interested"
        NOT_INTERESTED -> "Not Interested"
        FOLLOW_UP -> "Follow Up"
        CONVERTED -> "Converted"
        LOST -> "Lost"
    }
}

@Serializable
enum class TargetPriority {
    LOW, MEDIUM, HIGH, URGENT;

    companion object {
        fun fromString(value: String): TargetPriority = when (value.lowercase()) {
            "low" -> LOW
            "high" -> HIGH
            "urgent" -> URGENT
            else -> MEDIUM
        }
    }

    override fun toString(): String = name.lowercase()

    fun displayName(): String = when (this) {
        LOW -> "Low"
        MEDIUM -> "Medium"
        HIGH -> "High"
        URGENT -> "Urgent"
    }
}

val VISIT_REASONS = listOf(
    "Sales Visit", "Follow Up", "Product Demo", "Collection",
    "Delivery", "Complaint Resolution", "New Lead", "Relationship Building",
    "Survey", "Installation", "Training", "Maintenance",
    "Negotiation", "Contract Signing", "Market Research",
    "Brand Promotion", "Stock Check", "Order Taking",
    "Price Revision", "Feedback Collection", "Other"
)

val OUTCOME_FLAGS = listOf(
    "Order Placed", "Payment Collected", "Sample Given",
    "Quotation Shared", "Demo Scheduled", "Follow Up Required",
    "Complaint Registered", "Contract Signed", "Feedback Received",
    "Not Available", "Needs Escalation", "Lost to Competitor",
    "Successfully Converted"
)
