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
class TargetRepository @Inject constructor(
    private val rtdb: FirebaseDatabase,
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "TargetRepository"
    }

    fun observeAssignedTargets(userId: String): Flow<List<TargetAssignment>> = callbackFlow {
        val ref = rtdb.reference.child("targetAssignments")
            .orderByChild("userId").equalTo(userId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val assignments = snapshot.children.mapNotNull { child ->
                    parseAssignment(child)
                }.filter { it.status != "completed" }
                    .sortedBy { it.priority.ordinal }
                trySend(assignments)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing assignments", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun getTarget(targetId: String): AdminTarget? {
        return try {
            val snapshot = rtdb.reference.child("adminTargets").child(targetId).get().await()
            if (!snapshot.exists()) return null
            parseAdminTarget(snapshot)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching target", e)
            null
        }
    }

    suspend fun startVisit(
        assignmentId: String,
        targetId: String,
        targetName: String,
        userId: String,
        userName: String,
        companyId: String,
        visitReason: String,
        location: LocationPoint
    ): Result<TargetVisit> {
        return try {
            val visitRef = rtdb.reference.child("targetVisits").push()
            val visitId = visitRef.key ?: throw Exception("Failed to create visit ID")
            val timestamp = System.currentTimeMillis()

            val visitData = mapOf(
                "id" to visitId,
                "targetId" to targetId,
                "targetName" to targetName,
                "userId" to userId,
                "userName" to userName,
                "companyId" to companyId,
                "assignmentId" to assignmentId,
                "visitReason" to visitReason,
                "status" to "in_progress",
                "startTime" to timestamp,
                "startLocation" to mapOf(
                    "latitude" to location.latitude,
                    "longitude" to location.longitude,
                    "accuracy" to location.accuracy,
                    "address" to location.address
                ),
                "createdAt" to timestamp,
                "updatedAt" to timestamp
            )

            visitRef.setValue(visitData).await()

            // Update assignment status
            rtdb.reference.child("targetAssignments").child(assignmentId)
                .child("status").setValue("in_progress").await()

            Result.success(TargetVisit(
                id = visitId,
                targetId = targetId,
                targetName = targetName,
                userId = userId,
                userName = userName,
                companyId = companyId,
                assignmentId = assignmentId,
                visitReason = visitReason,
                status = VisitStatus.IN_PROGRESS,
                startTime = timestamp,
                startLocation = location
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error starting visit", e)
            Result.failure(e)
        }
    }

    suspend fun completeVisit(
        visitId: String,
        assignmentId: String,
        targetId: String,
        location: LocationPoint,
        leadStatus: LeadStatus,
        conversationNotes: String,
        outcomeFlags: List<String>,
        offersDiscussed: String,
        nextFollowUpDate: String,
        distanceKm: Double
    ): Result<Unit> {
        return try {
            val timestamp = System.currentTimeMillis()

            // Get start time for duration
            val visitSnapshot = rtdb.reference.child("targetVisits").child(visitId).get().await()
            val startTime = visitSnapshot.child("startTime").getValue(Long::class.java) ?: timestamp
            val durationMinutes = ((timestamp - startTime) / (1000 * 60)).toInt()

            val updates = mapOf(
                "status" to "completed",
                "endTime" to timestamp,
                "durationMinutes" to durationMinutes,
                "endLocation" to mapOf(
                    "latitude" to location.latitude,
                    "longitude" to location.longitude,
                    "accuracy" to location.accuracy,
                    "address" to location.address
                ),
                "leadStatus" to leadStatus.toString(),
                "conversationNotes" to conversationNotes,
                "outcomeFlags" to outcomeFlags,
                "offersDiscussed" to offersDiscussed,
                "nextFollowUpDate" to nextFollowUpDate,
                "distanceKm" to distanceKm,
                "updatedAt" to timestamp
            )

            rtdb.reference.child("targetVisits").child(visitId)
                .updateChildren(updates).await()

            // Update assignment completed visits
            val assignSnapshot = rtdb.reference.child("targetAssignments")
                .child(assignmentId).get().await()
            val completedVisits = (assignSnapshot.child("completedVisits").getValue(Int::class.java) ?: 0) + 1
            val requiredVisits = assignSnapshot.child("requiredVisits").getValue(Int::class.java) ?: 1

            val assignUpdates = mutableMapOf<String, Any>(
                "completedVisits" to completedVisits
            )
            if (completedVisits >= requiredVisits) {
                assignUpdates["status"] = "completed"
            }
            rtdb.reference.child("targetAssignments").child(assignmentId)
                .updateChildren(assignUpdates).await()

            // Update target total visits  
            val target = rtdb.reference.child("adminTargets").child(targetId).get().await()
            val totalVisits = (target.child("totalVisits").getValue(Int::class.java) ?: 0) + 1
            rtdb.reference.child("adminTargets").child(targetId)
                .child("totalVisits").setValue(totalVisits).await()
            rtdb.reference.child("adminTargets").child(targetId)
                .child("leadStatus").setValue(leadStatus.toString()).await()

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error completing visit", e)
            Result.failure(e)
        }
    }

    suspend fun skipVisit(visitId: String, assignmentId: String, reason: String): Result<Unit> {
        return try {
            rtdb.reference.child("targetVisits").child(visitId)
                .updateChildren(mapOf(
                    "status" to "skipped",
                    "conversationNotes" to reason,
                    "updatedAt" to System.currentTimeMillis()
                )).await()

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Error skipping visit", e)
            Result.failure(e)
        }
    }

    suspend fun getVisitHistory(userId: String, limit: Int = 50): List<TargetVisit> {
        return try {
            val snapshot = rtdb.reference.child("targetVisits")
                .orderByChild("userId").equalTo(userId)
                .limitToLast(limit)
                .get().await()

            snapshot.children.mapNotNull { parseVisit(it) }
                .sortedByDescending { it.createdAt }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching visit history", e)
            emptyList()
        }
    }

    // --- Admin functions ---

    suspend fun createTarget(target: AdminTarget): Result<String> {
        return try {
            val ref = rtdb.reference.child("adminTargets").push()
            val targetId = ref.key ?: throw Exception("Failed to create target ID")

            val targetData = mapOf(
                "id" to targetId,
                "name" to target.name,
                "businessName" to target.businessName,
                "address" to target.address,
                "contactPerson" to target.contactPerson,
                "contactPhone" to target.contactPhone,
                "contactEmail" to target.contactEmail,
                "description" to target.description,
                "category" to target.category,
                "tags" to target.tags,
                "priority" to target.priority.toString(),
                "leadStatus" to target.leadStatus.toString(),
                "companyId" to target.companyId,
                "createdBy" to target.createdBy,
                "isActive" to true,
                "totalVisits" to 0,
                "createdAt" to System.currentTimeMillis(),
                "updatedAt" to System.currentTimeMillis()
            )

            if (target.location != null) {
                val locationData = mapOf(
                    "latitude" to target.location.latitude,
                    "longitude" to target.location.longitude,
                    "accuracy" to target.location.accuracy,
                    "address" to target.location.address
                )
                ref.setValue(targetData + ("location" to locationData)).await()
            } else {
                ref.setValue(targetData).await()
            }

            Result.success(targetId)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating target", e)
            Result.failure(e)
        }
    }

    suspend fun assignTarget(assignment: TargetAssignment): Result<String> {
        return try {
            val ref = rtdb.reference.child("targetAssignments").push()
            val assignId = ref.key ?: throw Exception("Failed to create assignment ID")

            val data = mapOf(
                "id" to assignId,
                "targetId" to assignment.targetId,
                "userId" to assignment.userId,
                "userName" to assignment.userName,
                "assignedBy" to assignment.assignedBy,
                "visitReason" to assignment.visitReason,
                "priority" to assignment.priority.toString(),
                "requiredVisits" to assignment.requiredVisits,
                "completedVisits" to 0,
                "notes" to assignment.notes,
                "status" to "pending",
                "companyId" to assignment.companyId,
                "createdAt" to System.currentTimeMillis()
            )

            ref.setValue(data).await()
            Result.success(assignId)
        } catch (e: Exception) {
            Log.e(TAG, "Error assigning target", e)
            Result.failure(e)
        }
    }

    fun observeCompanyTargets(companyId: String): Flow<List<AdminTarget>> = callbackFlow {
        val ref = rtdb.reference.child("adminTargets")
            .orderByChild("companyId").equalTo(companyId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val targets = snapshot.children.mapNotNull { parseAdminTarget(it) }
                    .filter { it.isActive }
                    .sortedByDescending { it.createdAt }
                trySend(targets)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing company targets", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    private fun parseAssignment(snapshot: DataSnapshot): TargetAssignment? {
        return try {
            TargetAssignment(
                id = snapshot.key ?: "",
                targetId = snapshot.child("targetId").getValue(String::class.java) ?: "",
                userId = snapshot.child("userId").getValue(String::class.java) ?: "",
                userName = snapshot.child("userName").getValue(String::class.java) ?: "",
                assignedBy = snapshot.child("assignedBy").getValue(String::class.java) ?: "",
                visitReason = snapshot.child("visitReason").getValue(String::class.java) ?: "",
                priority = TargetPriority.fromString(snapshot.child("priority").getValue(String::class.java) ?: "medium"),
                requiredVisits = snapshot.child("requiredVisits").getValue(Int::class.java) ?: 1,
                completedVisits = snapshot.child("completedVisits").getValue(Int::class.java) ?: 0,
                notes = snapshot.child("notes").getValue(String::class.java) ?: "",
                status = snapshot.child("status").getValue(String::class.java) ?: "pending",
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun parseAdminTarget(snapshot: DataSnapshot): AdminTarget? {
        return try {
            val locationNode = snapshot.child("location")
            val location = if (locationNode.exists()) {
                LocationPoint(
                    latitude = locationNode.child("latitude").getValue(Double::class.java) ?: 0.0,
                    longitude = locationNode.child("longitude").getValue(Double::class.java) ?: 0.0,
                    accuracy = locationNode.child("accuracy").getValue(Float::class.java) ?: 0f,
                    address = locationNode.child("address").getValue(String::class.java) ?: ""
                )
            } else null

            val tags = snapshot.child("tags").children.mapNotNull { it.getValue(String::class.java) }

            AdminTarget(
                id = snapshot.key ?: "",
                name = snapshot.child("name").getValue(String::class.java) ?: "",
                businessName = snapshot.child("businessName").getValue(String::class.java) ?: "",
                location = location,
                address = snapshot.child("address").getValue(String::class.java) ?: "",
                contactPerson = snapshot.child("contactPerson").getValue(String::class.java) ?: "",
                contactPhone = snapshot.child("contactPhone").getValue(String::class.java) ?: "",
                contactEmail = snapshot.child("contactEmail").getValue(String::class.java) ?: "",
                description = snapshot.child("description").getValue(String::class.java) ?: "",
                category = snapshot.child("category").getValue(String::class.java) ?: "",
                tags = tags,
                priority = TargetPriority.fromString(snapshot.child("priority").getValue(String::class.java) ?: "medium"),
                leadStatus = LeadStatus.fromString(snapshot.child("leadStatus").getValue(String::class.java) ?: "new"),
                totalVisits = snapshot.child("totalVisits").getValue(Int::class.java) ?: 0,
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                createdBy = snapshot.child("createdBy").getValue(String::class.java) ?: "",
                isActive = snapshot.child("isActive").getValue(Boolean::class.java) ?: true,
                createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0,
                updatedAt = snapshot.child("updatedAt").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun parseVisit(snapshot: DataSnapshot): TargetVisit? {
        return try {
            val outcomes = snapshot.child("outcomeFlags").children
                .mapNotNull { it.getValue(String::class.java) }

            TargetVisit(
                id = snapshot.key ?: "",
                targetId = snapshot.child("targetId").getValue(String::class.java) ?: "",
                targetName = snapshot.child("targetName").getValue(String::class.java) ?: "",
                userId = snapshot.child("userId").getValue(String::class.java) ?: "",
                userName = snapshot.child("userName").getValue(String::class.java) ?: "",
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                assignmentId = snapshot.child("assignmentId").getValue(String::class.java) ?: "",
                visitReason = snapshot.child("visitReason").getValue(String::class.java) ?: "",
                status = VisitStatus.fromString(snapshot.child("status").getValue(String::class.java) ?: "pending"),
                leadStatus = LeadStatus.fromString(snapshot.child("leadStatus").getValue(String::class.java) ?: "new"),
                startTime = snapshot.child("startTime").getValue(Long::class.java),
                endTime = snapshot.child("endTime").getValue(Long::class.java),
                durationMinutes = snapshot.child("durationMinutes").getValue(Int::class.java) ?: 0,
                distanceKm = snapshot.child("distanceKm").getValue(Double::class.java) ?: 0.0,
                conversationNotes = snapshot.child("conversationNotes").getValue(String::class.java) ?: "",
                outcomeFlags = outcomes,
                offersDiscussed = snapshot.child("offersDiscussed").getValue(String::class.java) ?: "",
                nextFollowUpDate = snapshot.child("nextFollowUpDate").getValue(String::class.java) ?: "",
                createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0,
                updatedAt = snapshot.child("updatedAt").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            null
        }
    }
}
