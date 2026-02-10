package com.poverse.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poverse.app.data.model.*
import com.poverse.app.data.repository.TargetRepository
import com.poverse.app.data.repository.AuthRepository
import com.poverse.app.data.repository.LocationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TargetListUiState(
    val isLoading: Boolean = true,
    val assignments: List<TargetAssignment> = emptyList(),
    val targets: Map<String, AdminTarget> = emptyMap(),
    val visitHistory: List<TargetVisit> = emptyList(),
    val error: String? = null,
    val activeVisit: TargetVisit? = null
)

data class VisitUiState(
    val isLoading: Boolean = false,
    val isStarting: Boolean = false,
    val isCompleting: Boolean = false,
    val target: AdminTarget? = null,
    val assignment: TargetAssignment? = null,
    val currentVisit: TargetVisit? = null,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class TargetViewModel @Inject constructor(
    private val targetRepository: TargetRepository,
    private val authRepository: AuthRepository,
    private val locationRepository: LocationRepository
) : ViewModel() {

    private val _listState = MutableStateFlow(TargetListUiState())
    val listState: StateFlow<TargetListUiState> = _listState.asStateFlow()

    private val _visitState = MutableStateFlow(VisitUiState())
    val visitState: StateFlow<VisitUiState> = _visitState.asStateFlow()

    init {
        loadTargets()
    }

    private fun loadTargets() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            // Load visit history
            val history = targetRepository.getVisitHistory(userId)
            _listState.update { it.copy(visitHistory = history) }

            // Observe assigned targets
            targetRepository.observeAssignedTargets(userId).collect { assignments ->
                // Load target details for each assignment
                val targetMap = mutableMapOf<String, AdminTarget>()
                assignments.forEach { assignment ->
                    if (!targetMap.containsKey(assignment.targetId)) {
                        targetRepository.getTarget(assignment.targetId)?.let {
                            targetMap[assignment.targetId] = it
                        }
                    }
                }

                _listState.update {
                    it.copy(
                        isLoading = false,
                        assignments = assignments,
                        targets = targetMap
                    )
                }
            }
        }
    }

    fun loadTargetDetail(targetId: String, assignmentId: String) {
        viewModelScope.launch {
            _visitState.update { it.copy(isLoading = true) }

            val target = targetRepository.getTarget(targetId)
            val assignment = _listState.value.assignments.find { it.id == assignmentId }

            _visitState.update {
                it.copy(
                    isLoading = false,
                    target = target,
                    assignment = assignment
                )
            }
        }
    }

    fun startVisit(
        assignmentId: String,
        targetId: String,
        targetName: String,
        visitReason: String,
        location: LocationPoint
    ) {
        viewModelScope.launch {
            _visitState.update { it.copy(isStarting = true, error = null) }

            val userId = authRepository.getCurrentUserId() ?: return@launch
            val user = authRepository.currentUser.first()
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            val result = targetRepository.startVisit(
                assignmentId = assignmentId,
                targetId = targetId,
                targetName = targetName,
                userId = userId,
                userName = user?.name ?: "",
                companyId = companyId,
                visitReason = visitReason,
                location = location
            )

            result.fold(
                onSuccess = { visit ->
                    _visitState.update {
                        it.copy(
                            isStarting = false,
                            currentVisit = visit,
                            successMessage = "Visit started!"
                        )
                    }
                },
                onFailure = { error ->
                    _visitState.update {
                        it.copy(isStarting = false, error = error.message)
                    }
                }
            )
        }
    }

    fun completeVisit(
        visitId: String,
        assignmentId: String,
        targetId: String,
        location: LocationPoint,
        leadStatus: LeadStatus,
        conversationNotes: String,
        outcomeFlags: List<String>,
        offersDiscussed: String,
        nextFollowUpDate: String
    ) {
        viewModelScope.launch {
            _visitState.update { it.copy(isCompleting = true, error = null) }

            val startLocation = _visitState.value.currentVisit?.startLocation
            val distanceKm = if (startLocation != null) {
                locationRepository.calculateDistance(
                    startLocation.latitude, startLocation.longitude,
                    location.latitude, location.longitude
                )
            } else 0.0

            val result = targetRepository.completeVisit(
                visitId = visitId,
                assignmentId = assignmentId,
                targetId = targetId,
                location = location,
                leadStatus = leadStatus,
                conversationNotes = conversationNotes,
                outcomeFlags = outcomeFlags,
                offersDiscussed = offersDiscussed,
                nextFollowUpDate = nextFollowUpDate,
                distanceKm = distanceKm
            )

            result.fold(
                onSuccess = {
                    _visitState.update {
                        it.copy(
                            isCompleting = false,
                            currentVisit = null,
                            successMessage = "Visit completed successfully!"
                        )
                    }
                },
                onFailure = { error ->
                    _visitState.update {
                        it.copy(isCompleting = false, error = error.message)
                    }
                }
            )
        }
    }

    fun clearMessages() {
        _visitState.update { it.copy(error = null, successMessage = null) }
    }

    fun refresh() {
        _listState.update { it.copy(isLoading = true) }
        loadTargets()
    }
}
