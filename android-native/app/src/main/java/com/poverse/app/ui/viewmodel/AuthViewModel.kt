package com.poverse.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poverse.app.data.model.User
import com.poverse.app.data.model.UserRole
import com.poverse.app.data.repository.AuthRepository
import com.poverse.app.ui.navigation.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = true,
    val isLoggedIn: Boolean = false,
    val user: User? = null,
    val loginError: String? = null,
    val isLoggingIn: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    /** Alias so MainActivity can use authViewModel.authState */
    val authState: StateFlow<AuthUiState> get() = uiState

    /** True while the splash screen should stay visible */
    val isCheckingSession: StateFlow<Boolean> = _uiState.map { it.isLoading }
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    /** Reactive start destination based on the current user role */
    val startDestination: StateFlow<String> = _uiState.map { state ->
        when (state.user?.role) {
            UserRole.SUPERADMIN -> "superadmin"
            UserRole.ADMIN -> Screen.Dashboard.route
            else -> Screen.Dashboard.route
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, Screen.Login.route)

    init {
        viewModelScope.launch {
            // Check if user is already logged in
            authRepository.isLoggedIn.collect { loggedIn ->
                if (loggedIn) {
                    val sessionValid = authRepository.validateSession()
                    if (sessionValid) {
                        authRepository.currentUser.first()?.let { user ->
                            _uiState.value = AuthUiState(
                                isLoading = false,
                                isLoggedIn = true,
                                user = user
                            )
                            // Update presence
                            authRepository.updatePresence(true)
                        } ?: run {
                            _uiState.value = AuthUiState(isLoading = false, isLoggedIn = false)
                        }
                    } else {
                        _uiState.value = AuthUiState(isLoading = false, isLoggedIn = false)
                    }
                } else {
                    _uiState.value = AuthUiState(isLoading = false, isLoggedIn = false)
                }
            }
        }
    }

    fun login(username: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoggingIn = true, loginError = null) }

            val result = authRepository.login(username, password)
            result.fold(
                onSuccess = { user ->
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        isLoggedIn = true,
                        user = user,
                        isLoggingIn = false
                    )
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoggingIn = false,
                            loginError = error.message ?: "Login failed"
                        )
                    }
                }
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.updatePresence(false)
            authRepository.logout()
            _uiState.value = AuthUiState(isLoading = false, isLoggedIn = false)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(loginError = null) }
    }
}
