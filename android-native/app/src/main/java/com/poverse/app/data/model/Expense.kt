package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Expense(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val companyId: String = "",
    val category: ExpenseCategory = ExpenseCategory.OTHER,
    val amount: Double = 0.0,
    val currency: String = "INR",
    val description: String = "",
    val receiptUrl: String = "",
    val date: String = "", // YYYY-MM-DD
    val status: ExpenseStatus = ExpenseStatus.PENDING,
    val paymentMethod: PaymentMethod = PaymentMethod.CASH,
    val approvedBy: String = "",
    val approvedAt: Long = 0,
    val rejectionReason: String = "",
    val targetVisitId: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
enum class ExpenseCategory {
    TRAVEL, FOOD, ACCOMMODATION, FUEL, PARKING, TOLL,
    COMMUNICATION, OFFICE_SUPPLIES, CLIENT_ENTERTAINMENT,
    MISCELLANEOUS, OTHER;

    companion object {
        fun fromString(value: String): ExpenseCategory = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            OTHER
        }
    }

    fun displayName(): String = name.lowercase().replace('_', ' ')
        .replaceFirstChar { it.uppercase() }
}

@Serializable
enum class ExpenseStatus {
    PENDING, APPROVED, REJECTED, REIMBURSED, CANCELLED;

    companion object {
        fun fromString(value: String): ExpenseStatus = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            PENDING
        }
    }

    fun displayName(): String = name.lowercase().replaceFirstChar { it.uppercase() }
}

@Serializable
enum class PaymentMethod {
    CASH, CARD, UPI, COMPANY_CARD, OTHER;

    companion object {
        fun fromString(value: String): PaymentMethod = try {
            valueOf(value.uppercase())
        } catch (e: Exception) {
            CASH
        }
    }

    fun displayName(): String = name.lowercase().replace('_', ' ')
        .replaceFirstChar { it.uppercase() }
}

@Serializable
data class ExpensePolicy(
    val companyId: String = "",
    val receiptRequiredAbove: Double = 500.0,
    val autoApproveBelow: Double = 200.0,
    val maxDailyLimit: Double = 5000.0,
    val maxMonthlyLimit: Double = 50000.0,
    val requireApproval: Boolean = true,
    val allowedCategories: List<String> = ExpenseCategory.values().map { it.name.lowercase() }
)
