package com.poverse.app.ui.viewmodel

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poverse.app.data.model.*
import com.poverse.app.data.repository.ExpenseRepository
import com.poverse.app.data.repository.LeaveRepository
import com.poverse.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

// Expense ViewModel
data class ExpenseUiState(
    val isLoading: Boolean = true,
    val expenses: List<Expense> = emptyList(),
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val totalPending: Double = 0.0,
    val totalApproved: Double = 0.0,
    val totalRejected: Double = 0.0
)

@HiltViewModel
class ExpenseViewModel @Inject constructor(
    private val expenseRepository: ExpenseRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ExpenseUiState())
    val uiState: StateFlow<ExpenseUiState> = _uiState.asStateFlow()

    init {
        loadExpenses()
    }

    private fun loadExpenses() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val role = authRepository.getCurrentUserRole()
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            val flow = if (role == UserRole.ADMIN) {
                expenseRepository.observeCompanyExpenses(companyId)
            } else {
                expenseRepository.observeExpenses(userId)
            }

            flow.collect { expenses ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        expenses = expenses,
                        totalPending = expenses.filter { e -> e.status == ExpenseStatus.PENDING }.sumOf { e -> e.amount },
                        totalApproved = expenses.filter { e -> e.status == ExpenseStatus.APPROVED }.sumOf { e -> e.amount },
                        totalRejected = expenses.filter { e -> e.status == ExpenseStatus.REJECTED }.sumOf { e -> e.amount }
                    )
                }
            }
        }
    }

    fun submitExpense(
        category: ExpenseCategory,
        amount: Double,
        currency: String,
        description: String,
        date: String,
        paymentMethod: PaymentMethod,
        receiptUri: Uri?
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val userId = authRepository.getCurrentUserId() ?: return@launch
            val user = authRepository.currentUser.first()
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            val result = expenseRepository.submitExpense(
                userId = userId,
                userName = user?.name ?: "",
                companyId = companyId,
                category = category,
                amount = amount,
                currency = currency,
                description = description,
                date = date,
                paymentMethod = paymentMethod,
                receiptUri = receiptUri
            )

            result.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(isSubmitting = false, successMessage = "Expense submitted!")
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isSubmitting = false, error = error.message)
                    }
                }
            )
        }
    }

    fun approveExpense(expenseId: String) {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            expenseRepository.approveExpense(expenseId, userId)
        }
    }

    fun rejectExpense(expenseId: String, reason: String) {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            expenseRepository.rejectExpense(expenseId, userId, reason)
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }
}

// Leave ViewModel
data class LeaveUiState(
    val isLoading: Boolean = true,
    val leaveRequests: List<LeaveRequest> = emptyList(),
    val leaveBalance: LeaveBalance? = null,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class LeaveViewModel @Inject constructor(
    private val leaveRepository: LeaveRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LeaveUiState())
    val uiState: StateFlow<LeaveUiState> = _uiState.asStateFlow()

    init {
        loadLeaves()
    }

    private fun loadLeaves() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val role = authRepository.getCurrentUserRole()
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            // Load balance
            val balance = leaveRepository.getLeaveBalance(userId, companyId)
            _uiState.update { it.copy(leaveBalance = balance) }

            val flow = if (role == UserRole.ADMIN) {
                leaveRepository.observeCompanyLeaveRequests(companyId)
            } else {
                leaveRepository.observeLeaveRequests(userId)
            }

            flow.collect { requests ->
                _uiState.update {
                    it.copy(isLoading = false, leaveRequests = requests)
                }
            }
        }
    }

    fun submitLeaveRequest(
        leaveType: LeaveType,
        startDate: String,
        endDate: String,
        duration: LeaveDuration,
        reason: String,
        totalDays: Double
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val userId = authRepository.getCurrentUserId() ?: return@launch
            val user = authRepository.currentUser.first()
            val companyId = authRepository.getCurrentCompanyId() ?: ""

            val result = leaveRepository.submitLeaveRequest(
                userId = userId,
                userName = user?.name ?: "",
                companyId = companyId,
                leaveType = leaveType,
                startDate = startDate,
                endDate = endDate,
                duration = duration,
                reason = reason,
                totalDays = totalDays
            )

            result.fold(
                onSuccess = {
                    // Refresh balance
                    val balance = leaveRepository.getLeaveBalance(userId, companyId)
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            leaveBalance = balance,
                            successMessage = "Leave request submitted!"
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isSubmitting = false, error = error.message)
                    }
                }
            )
        }
    }

    fun approveLeave(requestId: String) {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            leaveRepository.approveLeave(requestId, userId)
        }
    }

    fun rejectLeave(requestId: String, reason: String) {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            leaveRepository.rejectLeave(requestId, userId, reason)
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }
}
