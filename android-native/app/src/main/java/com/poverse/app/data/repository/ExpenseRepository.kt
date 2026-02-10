package com.poverse.app.data.repository

import android.net.Uri
import android.util.Log
import com.google.firebase.database.*
import com.google.firebase.storage.FirebaseStorage
import com.poverse.app.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExpenseRepository @Inject constructor(
    private val rtdb: FirebaseDatabase,
    private val storage: FirebaseStorage
) {
    companion object {
        private const val TAG = "ExpenseRepository"
    }

    fun observeExpenses(userId: String): Flow<List<Expense>> = callbackFlow {
        val ref = rtdb.reference.child("expenses")
            .orderByChild("userId").equalTo(userId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val expenses = snapshot.children.mapNotNull { parseExpense(it) }
                    .sortedByDescending { it.createdAt }
                trySend(expenses)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing expenses", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    fun observeCompanyExpenses(companyId: String): Flow<List<Expense>> = callbackFlow {
        val ref = rtdb.reference.child("expenses")
            .orderByChild("companyId").equalTo(companyId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val expenses = snapshot.children.mapNotNull { parseExpense(it) }
                    .sortedByDescending { it.createdAt }
                trySend(expenses)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing company expenses", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun submitExpense(
        userId: String,
        userName: String,
        companyId: String,
        category: ExpenseCategory,
        amount: Double,
        currency: String,
        description: String,
        date: String,
        paymentMethod: PaymentMethod,
        receiptUri: Uri?,
        targetVisitId: String = ""
    ): Result<Expense> {
        return try {
            val ref = rtdb.reference.child("expenses").push()
            val expenseId = ref.key ?: throw Exception("Failed to create expense ID")
            val timestamp = System.currentTimeMillis()

            var receiptUrl = ""
            if (receiptUri != null) {
                val receiptRef = storage.reference
                    .child("expenses/$companyId/$userId/$expenseId/receipt.jpg")
                receiptRef.putFile(receiptUri).await()
                receiptUrl = receiptRef.downloadUrl.await().toString()
            }

            // Check auto-approve policy
            val policySnapshot = rtdb.reference.child("expensePolicies").child(companyId).get().await()
            val autoApproveBelow = policySnapshot.child("autoApproveBelow").getValue(Double::class.java) ?: 200.0
            val status = if (amount <= autoApproveBelow) "approved" else "pending"

            val expenseData = mapOf(
                "id" to expenseId,
                "userId" to userId,
                "userName" to userName,
                "companyId" to companyId,
                "category" to category.name.lowercase(),
                "amount" to amount,
                "currency" to currency,
                "description" to description,
                "receiptUrl" to receiptUrl,
                "date" to date,
                "status" to status,
                "paymentMethod" to paymentMethod.name.lowercase(),
                "targetVisitId" to targetVisitId,
                "createdAt" to timestamp,
                "updatedAt" to timestamp
            )

            ref.setValue(expenseData).await()

            Result.success(Expense(
                id = expenseId,
                userId = userId,
                userName = userName,
                companyId = companyId,
                category = category,
                amount = amount,
                currency = currency,
                description = description,
                receiptUrl = receiptUrl,
                date = date,
                status = ExpenseStatus.fromString(status),
                paymentMethod = paymentMethod,
                createdAt = timestamp
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error submitting expense", e)
            Result.failure(e)
        }
    }

    suspend fun approveExpense(expenseId: String, approvedBy: String): Result<Unit> {
        return try {
            val updates = mapOf(
                "status" to "approved",
                "approvedBy" to approvedBy,
                "approvedAt" to System.currentTimeMillis(),
                "updatedAt" to System.currentTimeMillis()
            )
            rtdb.reference.child("expenses").child(expenseId)
                .updateChildren(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error approving expense", e)
            Result.failure(e)
        }
    }

    suspend fun rejectExpense(expenseId: String, approvedBy: String, reason: String): Result<Unit> {
        return try {
            val updates = mapOf(
                "status" to "rejected",
                "approvedBy" to approvedBy,
                "approvedAt" to System.currentTimeMillis(),
                "rejectionReason" to reason,
                "updatedAt" to System.currentTimeMillis()
            )
            rtdb.reference.child("expenses").child(expenseId)
                .updateChildren(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error rejecting expense", e)
            Result.failure(e)
        }
    }

    private fun parseExpense(snapshot: DataSnapshot): Expense? {
        return try {
            Expense(
                id = snapshot.key ?: "",
                userId = snapshot.child("userId").getValue(String::class.java) ?: "",
                userName = snapshot.child("userName").getValue(String::class.java) ?: "",
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                category = ExpenseCategory.fromString(snapshot.child("category").getValue(String::class.java) ?: "other"),
                amount = snapshot.child("amount").getValue(Double::class.java) ?: 0.0,
                currency = snapshot.child("currency").getValue(String::class.java) ?: "INR",
                description = snapshot.child("description").getValue(String::class.java) ?: "",
                receiptUrl = snapshot.child("receiptUrl").getValue(String::class.java) ?: "",
                date = snapshot.child("date").getValue(String::class.java) ?: "",
                status = ExpenseStatus.fromString(snapshot.child("status").getValue(String::class.java) ?: "pending"),
                paymentMethod = PaymentMethod.fromString(snapshot.child("paymentMethod").getValue(String::class.java) ?: "cash"),
                approvedBy = snapshot.child("approvedBy").getValue(String::class.java) ?: "",
                rejectionReason = snapshot.child("rejectionReason").getValue(String::class.java) ?: "",
                createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0,
                updatedAt = snapshot.child("updatedAt").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            null
        }
    }
}
