package com.poverse.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poverse.app.data.model.*
import com.poverse.app.data.repository.AuthRepository
import com.poverse.app.data.repository.AttendanceRepository
import com.poverse.app.data.repository.TargetRepository
import com.poverse.app.data.repository.NotificationRepository
import com.google.firebase.database.FirebaseDatabase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val userName: String = "",
    val todayAttendance: AttendanceRecord? = null,
    val assignedTargets: List<TargetAssignment> = emptyList(),
    val todayVisits: Int = 0,
    val todayCompletedVisits: Int = 0,
    val unreadNotifications: Int = 0,
    val scheduledTasks: List<ScheduledTask> = emptyList(),
    val goals: AgentGoals? = null,
    val recentActivity: List<String> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val attendanceRepository: AttendanceRepository,
    private val targetRepository: TargetRepository,
    private val notificationRepository: NotificationRepository,
    private val rtdb: FirebaseDatabase
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    private fun loadDashboard() {
        viewModelScope.launch {
            try {
                val userId = authRepository.getCurrentUserId() ?: return@launch
                val companyId = authRepository.getCurrentCompanyId() ?: return@launch

                // Get user name
                val user = authRepository.currentUser.first()
                _uiState.update { it.copy(userName = user?.name ?: "") }

                // Load notifications count
                val unread = notificationRepository.getUnreadCount(userId)
                _uiState.update { it.copy(unreadNotifications = unread) }

                // Load goals
                loadGoals(userId, companyId)

                // Load scheduled tasks
                loadScheduledTasks(userId)

                // Observe today's attendance
                launch {
                    attendanceRepository.observeTodayAttendance(userId).collect { record ->
                        _uiState.update { it.copy(todayAttendance = record) }
                    }
                }

                // Observe assigned targets
                launch {
                    targetRepository.observeAssignedTargets(userId).collect { assignments ->
                        _uiState.update {
                            it.copy(
                                assignedTargets = assignments,
                                todayVisits = assignments.size,
                                todayCompletedVisits = assignments.count { a -> a.status == "completed" },
                                isLoading = false
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    private suspend fun loadGoals(userId: String, companyId: String) {
        try {
            val snapshot = rtdb.reference.child("agentGoals").child(userId).get().await()
            if (snapshot.exists()) {
                val daily = snapshot.child("daily")
                val weekly = snapshot.child("weekly")
                val monthly = snapshot.child("monthly")

                val goals = AgentGoals(
                    userId = userId,
                    companyId = companyId,
                    daily = GoalMetrics(
                        visits = daily.child("visits").getValue(Int::class.java) ?: 5,
                        conversions = daily.child("conversions").getValue(Int::class.java) ?: 1,
                        workHours = daily.child("workHours").getValue(Double::class.java) ?: 8.0,
                        newLeads = daily.child("newLeads").getValue(Int::class.java) ?: 3
                    ),
                    weekly = GoalMetrics(
                        visits = weekly.child("visits").getValue(Int::class.java) ?: 25,
                        conversions = weekly.child("conversions").getValue(Int::class.java) ?: 5,
                        workHours = weekly.child("workHours").getValue(Double::class.java) ?: 40.0,
                        newLeads = weekly.child("newLeads").getValue(Int::class.java) ?: 15
                    ),
                    monthly = GoalMetrics(
                        visits = monthly.child("visits").getValue(Int::class.java) ?: 100,
                        conversions = monthly.child("conversions").getValue(Int::class.java) ?: 20,
                        workHours = monthly.child("workHours").getValue(Double::class.java) ?: 160.0,
                        newLeads = monthly.child("newLeads").getValue(Int::class.java) ?: 60
                    )
                )
                _uiState.update { it.copy(goals = goals) }
            }
        } catch (e: Exception) {
            // Goals are optional
        }
    }

    private suspend fun loadScheduledTasks(userId: String) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val snapshot = rtdb.reference.child("scheduledTasks")
                .orderByChild("userId").equalTo(userId)
                .get().await()

            val tasks = snapshot.children.mapNotNull { child ->
                try {
                    ScheduledTask(
                        id = child.key ?: "",
                        userId = child.child("userId").getValue(String::class.java) ?: "",
                        type = child.child("type").getValue(String::class.java) ?: "visit",
                        title = child.child("title").getValue(String::class.java) ?: "",
                        description = child.child("description").getValue(String::class.java) ?: "",
                        targetId = child.child("targetId").getValue(String::class.java) ?: "",
                        targetName = child.child("targetName").getValue(String::class.java) ?: "",
                        scheduledTime = child.child("scheduledTime").getValue(Long::class.java) ?: 0,
                        isCompleted = child.child("isCompleted").getValue(Boolean::class.java) ?: false,
                        priority = child.child("priority").getValue(String::class.java) ?: "medium"
                    )
                } catch (e: Exception) {
                    null
                }
            }.filter { !it.isCompleted }
                .sortedBy { it.scheduledTime }

            _uiState.update { it.copy(scheduledTasks = tasks) }
        } catch (e: Exception) {
            // Tasks are optional
        }
    }

    fun refresh() {
        _uiState.update { it.copy(isLoading = true) }
        loadDashboard()
    }
}
