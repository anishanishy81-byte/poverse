package com.poverse.app.data.repository

import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import at.favre.lib.crypto.bcrypt.BCrypt
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.firestore.FirebaseFirestore
import com.poverse.app.data.model.SessionData
import com.poverse.app.data.model.User
import com.poverse.app.data.model.UserRole
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val rtdb: FirebaseDatabase,
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        private const val TAG = "AuthRepository"
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_USERNAME = stringPreferencesKey("username")
        private val KEY_ROLE = stringPreferencesKey("role")
        private val KEY_NAME = stringPreferencesKey("name")
        private val KEY_COMPANY_ID = stringPreferencesKey("company_id")
        private val KEY_SESSION_TOKEN = stringPreferencesKey("session_token")
        private val KEY_PROFILE_PICTURE = stringPreferencesKey("profile_picture")
    }

    val currentUser: Flow<User?> = dataStore.data.map { prefs ->
        val userId = prefs[KEY_USER_ID] ?: return@map null
        User(
            id = userId,
            username = prefs[KEY_USERNAME] ?: "",
            role = UserRole.fromString(prefs[KEY_ROLE] ?: "user"),
            name = prefs[KEY_NAME] ?: "",
            companyId = prefs[KEY_COMPANY_ID] ?: "",
            profilePicture = prefs[KEY_PROFILE_PICTURE] ?: ""
        )
    }

    val isLoggedIn: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[KEY_USER_ID] != null && prefs[KEY_SESSION_TOKEN] != null
    }

    suspend fun login(username: String, password: String): Result<User> {
        return try {
            val snapshot = firestore.collection("users")
                .whereEqualTo("username", username)
                .limit(1)
                .get()
                .await()

            if (snapshot.isEmpty) {
                return Result.failure(Exception("Invalid username or password"))
            }

            val doc = snapshot.documents.first()
            val storedHash = doc.getString("password") ?: ""
            val isActive = doc.getBoolean("isActive") ?: true

            if (!isActive) {
                return Result.failure(Exception("Account is deactivated"))
            }

            val result = BCrypt.verifyer().verify(password.toCharArray(), storedHash)
            if (!result.verified) {
                return Result.failure(Exception("Invalid username or password"))
            }

            val user = User(
                id = doc.id,
                username = doc.getString("username") ?: "",
                role = UserRole.fromString(doc.getString("role") ?: "user"),
                name = doc.getString("name") ?: "",
                email = doc.getString("email") ?: "",
                phone = doc.getString("phone") ?: "",
                city = doc.getString("city") ?: "",
                state = doc.getString("state") ?: "",
                country = doc.getString("country") ?: "",
                companyId = doc.getString("companyId") ?: "",
                companyName = doc.getString("companyName") ?: "",
                profilePicture = doc.getString("profilePicture") ?: "",
                isActive = isActive
            )

            // Create session
            val sessionToken = UUID.randomUUID().toString()
            val sessionData = mapOf(
                "userId" to user.id,
                "token" to sessionToken,
                "deviceInfo" to "Android Native",
                "createdAt" to System.currentTimeMillis(),
                "isActive" to true
            )

            // Invalidate old sessions & create new one
            rtdb.reference.child("sessions").child(user.id).setValue(sessionData).await()

            // Save to local storage
            dataStore.edit { prefs ->
                prefs[KEY_USER_ID] = user.id
                prefs[KEY_USERNAME] = user.username
                prefs[KEY_ROLE] = user.role.toString()
                prefs[KEY_NAME] = user.name
                prefs[KEY_COMPANY_ID] = user.companyId
                prefs[KEY_SESSION_TOKEN] = sessionToken
                prefs[KEY_PROFILE_PICTURE] = user.profilePicture
            }

            Log.d(TAG, "Login successful for ${user.username}")
            Result.success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Login failed", e)
            Result.failure(e)
        }
    }

    suspend fun logout() {
        try {
            val prefs = dataStore.data.first()
            val userId = prefs[KEY_USER_ID]
            if (userId != null) {
                rtdb.reference.child("sessions").child(userId).removeValue().await()
                rtdb.reference.child("presence").child(userId).setValue(
                    mapOf("isOnline" to false, "lastActive" to System.currentTimeMillis())
                ).await()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error during logout", e)
        }
        dataStore.edit { it.clear() }
    }

    suspend fun validateSession(): Boolean {
        return try {
            val prefs = dataStore.data.first()
            val userId = prefs[KEY_USER_ID] ?: return false
            val token = prefs[KEY_SESSION_TOKEN] ?: return false

            val snapshot = rtdb.reference.child("sessions").child(userId).get().await()
            val serverToken = snapshot.child("token").getValue(String::class.java)
            val isActive = snapshot.child("isActive").getValue(Boolean::class.java) ?: false

            if (serverToken == token && isActive) {
                true
            } else {
                // Session invalidated (e.g., logged in from another device)
                dataStore.edit { it.clear() }
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Session validation failed", e)
            // If we can't connect to server, we check if we have local credentials
            // For now, return false to force re-login if validation fails securely
            false
        }
    }

    suspend fun getCurrentUserId(): String? {
        return dataStore.data.first()[KEY_USER_ID]
    }

    suspend fun getCurrentCompanyId(): String? {
        return dataStore.data.first()[KEY_COMPANY_ID]
    }

    suspend fun getCurrentUserRole(): UserRole {
        val role = dataStore.data.first()[KEY_ROLE] ?: "user"
        return UserRole.fromString(role)
    }

    suspend fun updatePresence(isOnline: Boolean) {
        try {
            val userId = getCurrentUserId() ?: return
            val presenceData = mapOf(
                "isOnline" to isOnline,
                "lastActive" to System.currentTimeMillis()
            )
            rtdb.reference.child("presence").child(userId).setValue(presenceData).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating presence", e)
        }
    }

    suspend fun getUserById(userId: String): User? {
        return try {
            val doc = firestore.collection("users").document(userId).get().await()
            if (!doc.exists()) return null
            User(
                id = doc.id,
                username = doc.getString("username") ?: "",
                role = UserRole.fromString(doc.getString("role") ?: "user"),
                name = doc.getString("name") ?: "",
                email = doc.getString("email") ?: "",
                phone = doc.getString("phone") ?: "",
                companyId = doc.getString("companyId") ?: "",
                profilePicture = doc.getString("profilePicture") ?: "",
                isActive = doc.getBoolean("isActive") ?: true
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching user", e)
            null
        }
    }

    suspend fun getCompanyUsers(companyId: String): List<User> {
        return try {
            val snapshot = firestore.collection("users")
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isActive", true)
                .get()
                .await()

            snapshot.documents.map { doc ->
                User(
                    id = doc.id,
                    username = doc.getString("username") ?: "",
                    role = UserRole.fromString(doc.getString("role") ?: "user"),
                    name = doc.getString("name") ?: "",
                    email = doc.getString("email") ?: "",
                    phone = doc.getString("phone") ?: "",
                    companyId = doc.getString("companyId") ?: "",
                    profilePicture = doc.getString("profilePicture") ?: "",
                    isActive = true
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching company users", e)
            emptyList()
        }
    }
}
