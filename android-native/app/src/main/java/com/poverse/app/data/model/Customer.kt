package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Customer(
    val id: String = "",
    val name: String = "",
    val businessName: String = "",
    val type: CustomerType = CustomerType.INDIVIDUAL,
    val category: String = "",
    val email: String = "",
    val phone: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val country: String = "",
    val location: LocationPoint? = null,
    val tags: List<String> = emptyList(),
    val sourceType: String = "manual",
    val sourceId: String = "",
    val status: CustomerStatus = CustomerStatus.ACTIVE,
    val priority: TargetPriority = TargetPriority.MEDIUM,
    val totalInteractions: Int = 0,
    val totalPurchases: Double = 0.0,
    val lastInteractionDate: Long = 0,
    val companyId: String = "",
    val assignedTo: String = "",
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
enum class CustomerType {
    INDIVIDUAL, BUSINESS;

    companion object {
        fun fromString(value: String): CustomerType = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            INDIVIDUAL
        }
    }
}

@Serializable
enum class CustomerStatus {
    ACTIVE, INACTIVE, PROSPECT, LEAD;

    companion object {
        fun fromString(value: String): CustomerStatus = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            ACTIVE
        }
    }

    fun displayName(): String = name.lowercase().replaceFirstChar { it.uppercase() }
}

@Serializable
data class CustomerInteraction(
    val id: String = "",
    val customerId: String = "",
    val userId: String = "",
    val userName: String = "",
    val type: InteractionType = InteractionType.VISIT,
    val description: String = "",
    val outcome: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
enum class InteractionType {
    VISIT, CALL, EMAIL, MEETING, FOLLOW_UP, OTHER;

    companion object {
        fun fromString(value: String): InteractionType = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            OTHER
        }
    }

    fun displayName(): String = name.lowercase().replace('_', ' ')
        .replaceFirstChar { it.uppercase() }
}

@Serializable
data class CustomerNote(
    val id: String = "",
    val customerId: String = "",
    val userId: String = "",
    val userName: String = "",
    val content: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class CustomerPurchase(
    val id: String = "",
    val customerId: String = "",
    val userId: String = "",
    val productName: String = "",
    val quantity: Int = 0,
    val amount: Double = 0.0,
    val date: String = "",
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
