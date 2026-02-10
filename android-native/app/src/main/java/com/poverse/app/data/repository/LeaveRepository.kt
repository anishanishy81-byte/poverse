package com.poverse.app.data.repository

import android.util.Log
import com.google.firebase.database.*
import com.poverse.app.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LeaveRepository @Inject constructor(
    private val rtdb: FirebaseDatabase
) {
    companion object {
        private const val TAG = "LeaveRepository"
    }

    fun observeLeaveRequests(userId: String): Flow<List<LeaveRequest>> = callbackFlow {
        val ref = rtdb.reference.child("leaveRequests")
            .orderByChild("userId").equalTo(userId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val requests = snapshot.children.mapNotNull { parseLeaveRequest(it) }
                    .sortedByDescending { it.createdAt }
                trySend(requests)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing leave requests", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    fun observeCompanyLeaveRequests(companyId: String): Flow<List<LeaveRequest>> = callbackFlow {
        val ref = rtdb.reference.child("leaveRequests")
            .orderByChild("companyId").equalTo(companyId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val requests = snapshot.children.mapNotNull { parseLeaveRequest(it) }
                    .sortedByDescending { it.createdAt }
                trySend(requests)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing company leave requests", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun submitLeaveRequest(
        userId: String,
        userName: String,
        companyId: String,
        leaveType: LeaveType,
        startDate: String,
        endDate: String,
        duration: LeaveDuration,
        reason: String,
        totalDays: Double
    ): Result<LeaveRequest> {
        return try {
            // Check balance
            val balance = getLeaveBalance(userId, companyId)
            val typeBalance = balance.balances[leaveType.name.lowercase()]
            if (typeBalance != null && typeBalance.available < totalDays) {
                return Result.failure(Exception("Insufficient ${leaveType.displayName()} leave balance. Available: ${typeBalance.available}"))
            }

            val ref = rtdb.reference.child("leaveRequests").push()
            val requestId = ref.key ?: throw Exception("Failed to create leave request ID")
            val timestamp = System.currentTimeMillis()

            val requestData = mapOf(
                "id" to requestId,
                "userId" to userId,
                "userName" to userName,
                "companyId" to companyId,
                "leaveType" to leaveType.name.lowercase(),
                "startDate" to startDate,
                "endDate" to endDate,
                "duration" to duration.name.lowercase(),
                "reason" to reason,
                "status" to "pending",
                "totalDays" to totalDays,
                "createdAt" to timestamp,
                "updatedAt" to timestamp
            )

            ref.setValue(requestData).await()

            // Update pending balance
            val leaveTypeKey = leaveType.name.lowercase()
            val currentPending = typeBalance?.pending ?: 0.0
            rtdb.reference.child("leaveBalances").child(userId)
                .child("balances").child(leaveTypeKey).child("pending")
                .setValue(currentPending + totalDays).await()

            val newAvailable = (typeBalance?.available ?: 0.0) - totalDays
            rtdb.reference.child("leaveBalances").child(userId)
                .child("balances").child(leaveTypeKey).child("available")
                .setValue(newAvailable).await()

            Result.success(LeaveRequest(
                id = requestId,
                userId = userId,
                userName = userName,
                companyId = companyId,
                leaveType = leaveType,
                startDate = startDate,
                endDate = endDate,
                duration = duration,
                reason = reason,
                status = LeaveStatus.PENDING,
                totalDays = totalDays,
                createdAt = timestamp
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error submitting leave request", e)
            Result.failure(e)
        }
    }

    suspend fun approveLeave(requestId: String, approvedBy: String): Result<Unit> {
        return try {
            val snapshot = rtdb.reference.child("leaveRequests").child(requestId).get().await()
            val userId = snapshot.child("userId").getValue(String::class.java) ?: ""
            val leaveType = snapshot.child("leaveType").getValue(String::class.java) ?: ""
            val totalDays = snapshot.child("totalDays").getValue(Double::class.java) ?: 0.0

            val updates = mapOf(
                "status" to "approved",
                "approvedBy" to approvedBy,
                "approvedAt" to System.currentTimeMillis(),
                "updatedAt" to System.currentTimeMillis()
            )
            rtdb.reference.child("leaveRequests").child(requestId)
                .updateChildren(updates).await()

            // Update balances: move from pending to used
            val balanceRef = rtdb.reference.child("leaveBalances").child(userId)
                .child("balances").child(leaveType)
            val balanceSnapshot = balanceRef.get().await()
            val currentPending = balanceSnapshot.child("pending").getValue(Double::class.java) ?: 0.0
            val currentUsed = balanceSnapshot.child("used").getValue(Double::class.java) ?: 0.0

            balanceRef.updateChildren(mapOf(
                "pending" to (currentPending - totalDays).coerceAtLeast(0.0),
                "used" to currentUsed + totalDays
            )).await()

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error approving leave", e)
            Result.failure(e)
        }
    }

    suspend fun rejectLeave(requestId: String, approvedBy: String, reason: String): Result<Unit> {
        return try {
            val snapshot = rtdb.reference.child("leaveRequests").child(requestId).get().await()
            val userId = snapshot.child("userId").getValue(String::class.java) ?: ""
            val leaveType = snapshot.child("leaveType").getValue(String::class.java) ?: ""
            val totalDays = snapshot.child("totalDays").getValue(Double::class.java) ?: 0.0

            val updates = mapOf(
                "status" to "rejected",
                "approvedBy" to approvedBy,
                "approvedAt" to System.currentTimeMillis(),
                "rejectionReason" to reason,
                "updatedAt" to System.currentTimeMillis()
            )
            rtdb.reference.child("leaveRequests").child(requestId)
                .updateChildren(updates).await()

            // Restore balance
            val balanceRef = rtdb.reference.child("leaveBalances").child(userId)
                .child("balances").child(leaveType)
            val balanceSnapshot = balanceRef.get().await()
            val currentPending = balanceSnapshot.child("pending").getValue(Double::class.java) ?: 0.0
            val currentAvailable = balanceSnapshot.child("available").getValue(Double::class.java) ?: 0.0

            balanceRef.updateChildren(mapOf(
                "pending" to (currentPending - totalDays).coerceAtLeast(0.0),
                "available" to currentAvailable + totalDays
            )).await()

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error rejecting leave", e)
            Result.failure(e)
        }
    }

    suspend fun getLeaveBalance(userId: String, companyId: String): LeaveBalance {
        return try {
            val snapshot = rtdb.reference.child("leaveBalances").child(userId).get().await()
            if (!snapshot.exists()) {
                // Initialize default balances from policy
                val policySnapshot = rtdb.reference.child("leavePolicies").child(companyId).get().await()
                val allocations = mutableMapOf<String, LeaveTypeBalance>()

                LeaveType.values().forEach { type ->
                    val key = type.name.lowercase()
                    val total = policySnapshot.child("allocations").child(key)
                        .getValue(Double::class.java) ?: when (type) {
                        LeaveType.SICK -> 12.0
                        LeaveType.CASUAL -> 12.0
                        LeaveType.EARNED -> 15.0
                        LeaveType.UNPAID -> 365.0
                        LeaveType.MATERNITY -> 180.0
                        LeaveType.PATERNITY -> 15.0
                        LeaveType.BEREAVEMENT -> 5.0
                    }
                    allocations[key] = LeaveTypeBalance(
                        total = total,
                        used = 0.0,
                        pending = 0.0,
                        available = total
                    )
                }

                val balance = LeaveBalance(userId = userId, companyId = companyId, balances = allocations)

                // Save initial balances
                val balanceData = mapOf(
                    "userId" to userId,
                    "companyId" to companyId,
                    "year" to 2026,
                    "balances" to allocations.mapValues { (_, v) ->
                        mapOf("total" to v.total, "used" to v.used, "pending" to v.pending, "available" to v.available)
                    }
                )
                rtdb.reference.child("leaveBalances").child(userId).setValue(balanceData).await()

                balance
            } else {
                val balances = mutableMapOf<String, LeaveTypeBalance>()
                snapshot.child("balances").children.forEach { child ->
                    val key = child.key ?: return@forEach
                    balances[key] = LeaveTypeBalance(
                        total = child.child("total").getValue(Double::class.java) ?: 0.0,
                        used = child.child("used").getValue(Double::class.java) ?: 0.0,
                        pending = child.child("pending").getValue(Double::class.java) ?: 0.0,
                        available = child.child("available").getValue(Double::class.java) ?: 0.0,
                        carryForward = child.child("carryForward").getValue(Double::class.java) ?: 0.0
                    )
                }
                LeaveBalance(userId = userId, companyId = companyId, balances = balances)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching leave balance", e)
            LeaveBalance(userId = userId, companyId = companyId)
        }
    }

    private fun parseLeaveRequest(snapshot: DataSnapshot): LeaveRequest? {
        return try {
            LeaveRequest(
                id = snapshot.key ?: "",
                userId = snapshot.child("userId").getValue(String::class.java) ?: "",
                userName = snapshot.child("userName").getValue(String::class.java) ?: "",
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                leaveType = LeaveType.fromString(snapshot.child("leaveType").getValue(String::class.java) ?: "casual"),
                startDate = snapshot.child("startDate").getValue(String::class.java) ?: "",
                endDate = snapshot.child("endDate").getValue(String::class.java) ?: "",
                duration = LeaveDuration.fromString(snapshot.child("duration").getValue(String::class.java) ?: "full_day"),
                reason = snapshot.child("reason").getValue(String::class.java) ?: "",
                status = LeaveStatus.fromString(snapshot.child("status").getValue(String::class.java) ?: "pending"),
                approvedBy = snapshot.child("approvedBy").getValue(String::class.java) ?: "",
                rejectionReason = snapshot.child("rejectionReason").getValue(String::class.java) ?: "",
                totalDays = snapshot.child("totalDays").getValue(Double::class.java) ?: 1.0,
                createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0,
                updatedAt = snapshot.child("updatedAt").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            null
        }
    }
}
