package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String = "",
    val username: String = "",
    val password: String = "",
    val role: UserRole = UserRole.USER,
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val city: String = "",
    val state: String = "",
    val country: String = "",
    val companyId: String = "",
    val companyName: String = "",
    val profilePicture: String = "",
    val designation: String = "",
    val employeeId: String = "",
    val department: String = "",
    val region: String = "",
    val joiningDate: Long = 0L,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
enum class UserRole {
    USER, ADMIN, SUPERADMIN;

    companion object {
        fun fromString(value: String): UserRole = when (value.lowercase()) {
            "admin" -> ADMIN
            "superadmin" -> SUPERADMIN
            else -> USER
        }
    }

    override fun toString(): String = when (this) {
        USER -> "user"
        ADMIN -> "admin"
        SUPERADMIN -> "superadmin"
    }
}

@Serializable
data class Company(
    val id: String = "",
    val name: String = "",
    val logo: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val country: String = "",
    val phone: String = "",
    val email: String = "",
    val website: String = "",
    val description: String = "",
    val userLimit: Int = 50,
    val adminLimit: Int = 5,
    val agentLimit: Int = 45,
    val adminCount: Int = 0,
    val agentCount: Int = 0,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class SessionData(
    val userId: String = "",
    val token: String = "",
    val deviceInfo: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val isActive: Boolean = true
)
