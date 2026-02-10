package com.poverse.app.ui.viewmodel

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poverse.app.data.model.*
import com.poverse.app.data.repository.AttendanceRepository
import com.poverse.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AttendanceUiState(
    val isLoading: Boolean = true,
    val todayRecord: AttendanceRecord? = null,
    val history: List<AttendanceRecord> = emptyList(),
    val settings: AttendanceSettings = AttendanceSettings(),
    val isCheckingIn: Boolean = false,
    val isCheckingOut: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class AttendanceViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AttendanceUiState())
    val uiState: StateFlow<AttendanceUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val companyId = authRepository.getCurrentCompanyId() ?: return@launch

            // Load settings
            val settings = attendanceRepository.getAttendanceSettings(companyId)
            _uiState.update { it.copy(settings = settings) }

            // Load history
            val history = attendanceRepository.getAttendanceHistory(userId)
            _uiState.update { it.copy(history = history) }

            // Observe today's attendance
            attendanceRepository.observeTodayAttendance(userId).collect { record ->
                _uiState.update { it.copy(todayRecord = record, isLoading = false) }
            }
        }
    }

    fun checkIn(location: LocationPoint, selfieUri: Uri?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingIn = true, error = null) }

            val userId = authRepository.getCurrentUserId() ?: run {
                _uiState.update { it.copy(isCheckingIn = false, error = "Not authenticated") }
                return@launch
            }
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            val result = attendanceRepository.checkIn(userId, companyId, location, selfieUri)
            result.fold(
                onSuccess = { record ->
                    _uiState.update {
                        it.copy(
                            isCheckingIn = false,
                            todayRecord = record,
                            successMessage = "Checked in successfully!"
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isCheckingIn = false, error = error.message)
                    }
                }
            )
        }
    }

    fun checkOut(location: LocationPoint, selfieUri: Uri?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingOut = true, error = null) }

            val userId = authRepository.getCurrentUserId() ?: run {
                _uiState.update { it.copy(isCheckingOut = false, error = "Not authenticated") }
                return@launch
            }
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            val result = attendanceRepository.checkOut(userId, companyId, location, selfieUri)
            result.fold(
                onSuccess = { record ->
                    _uiState.update {
                        it.copy(
                            isCheckingOut = false,
                            successMessage = "Checked out successfully!"
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isCheckingOut = false, error = error.message)
                    }
                }
            )
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }

    fun refresh() {
        _uiState.update { it.copy(isLoading = true) }
        loadData()
    }
}
