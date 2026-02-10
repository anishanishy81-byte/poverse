package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AppNotification(
    val id: String = "",
    val userId: String = "",
    val companyId: String = "",
    val title: String = "",
    val body: String = "",
    val type: String = "general",
    val priority: String = "normal",
    val data: Map<String, String> = emptyMap(),
    val actionUrl: String = "",
    val isRead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class DailyReport(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val companyId: String = "",
    val date: String = "",
    val attendance: ReportAttendance? = null,
    val targetsVisited: Int = 0,
    val targetsCompleted: Int = 0,
    val totalDistanceKm: Double = 0.0,
    val totalWorkMinutes: Int = 0,
    val newLeads: Int = 0,
    val conversions: Int = 0,
    val expenses: Double = 0.0,
    val performanceScore: Double = 0.0,
    val summary: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class ReportAttendance(
    val checkInTime: Long = 0,
    val checkOutTime: Long = 0,
    val lateStatus: String = "on_time",
    val workDuration: Int = 0
)

@Serializable
data class LocationData(
    val userId: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val accuracy: Float = 0f,
    val timestamp: Long = 0,
    val address: String = "",
    val companyId: String = "",
    val isOnline: Boolean = true
)

@Serializable
data class Document(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val category: String = "other",
    val fileUrl: String = "",
    val fileType: String = "",
    val fileSize: Long = 0,
    val thumbnailUrl: String = "",
    val visibility: String = "company",
    val folderId: String = "",
    val companyId: String = "",
    val uploadedBy: String = "",
    val uploadedByName: String = "",
    val version: Int = 1,
    val viewCount: Int = 0,
    val downloadCount: Int = 0,
    val tags: List<String> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class Story(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val userPhoto: String = "",
    val companyId: String = "",
    val type: String = "image", // image, video, text
    val mediaUrl: String = "",
    val text: String = "",
    val backgroundColor: String = "",
    val textColor: String = "",
    val viewCount: Int = 0,
    val isPinned: Boolean = false,
    val expiresAt: Long = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class AgentGoals(
    val userId: String = "",
    val companyId: String = "",
    val daily: GoalMetrics = GoalMetrics(),
    val weekly: GoalMetrics = GoalMetrics(),
    val monthly: GoalMetrics = GoalMetrics()
)

@Serializable
data class GoalMetrics(
    val visits: Int = 0,
    val conversions: Int = 0,
    val workHours: Double = 0.0,
    val newLeads: Int = 0
)

@Serializable
data class Incentive(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val companyId: String = "",
    val type: String = "per_visit",
    val amount: Double = 0.0,
    val description: String = "",
    val status: String = "pending", // pending, approved, paid
    val referenceId: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class ScheduledTask(
    val id: String = "",
    val userId: String = "",
    val companyId: String = "",
    val type: String = "visit", // visit, meeting, follow_up, call, other
    val title: String = "",
    val description: String = "",
    val targetId: String = "",
    val targetName: String = "",
    val scheduledTime: Long = 0,
    val isCompleted: Boolean = false,
    val priority: String = "medium",
    val createdAt: Long = System.currentTimeMillis()
)
