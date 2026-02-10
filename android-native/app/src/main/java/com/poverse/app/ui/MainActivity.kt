package com.poverse.app.ui

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.poverse.app.service.LocationTrackingService
import com.poverse.app.ui.navigation.Screen
import com.poverse.app.ui.navigation.agentBottomNavItems
import com.poverse.app.ui.screens.*
import com.poverse.app.ui.screens.admin.*
import com.poverse.app.ui.theme.POVerseTheme
import com.poverse.app.ui.viewmodel.*
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels()

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* granted or not — FCM will still work, just no heads-up */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        splash.setKeepOnScreenCondition { authViewModel.isCheckingSession.value }

        // Request notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            POVerseTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    POVerseApp(authViewModel = authViewModel)
                }
            }
        }
    }

    fun startLocationTracking(userId: String, companyId: String) {
        val intent = Intent(this, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START
            putExtra(LocationTrackingService.EXTRA_USER_ID, userId)
            putExtra(LocationTrackingService.EXTRA_COMPANY_ID, companyId)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    fun stopLocationTracking() {
        val intent = Intent(this, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_STOP
        }
        startService(intent)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POVerseApp(authViewModel: AuthViewModel) {
    val navController = rememberNavController()
    val authState by authViewModel.authState.collectAsState()
    val startDest by authViewModel.startDestination.collectAsState()

    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route

    // Determine which screens show the bottom nav
    val bottomNavRoutes = setOf(
        Screen.Dashboard.route,
        Screen.Attendance.route,
        Screen.Targets.route,
        Screen.Chat.route,
        Screen.More.route
    )
    val showBottomNav = currentRoute in bottomNavRoutes && authState.isLoggedIn

    val bottomNavItems = agentBottomNavItems

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar {
                    bottomNavItems.forEach { screen ->
                        NavigationBarItem(
                            icon = {
                                if (currentRoute == screen.route) {
                                    screen.selectedIcon?.let { Icon(it, screen.title) }
                                } else {
                                    screen.icon?.let { Icon(it, screen.title) }
                                }
                            },
                            label = { Text(screen.title) },
                            selected = currentRoute == screen.route,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(Screen.Dashboard.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDest,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Login
            composable(Screen.Login.route) {
                val loginUiState by authViewModel.uiState.collectAsState()

                LaunchedEffect(loginUiState.isLoggedIn) {
                    if (loginUiState.isLoggedIn) {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                }

                LoginScreen(
                    uiState = loginUiState,
                    onLogin = { username, password ->
                        authViewModel.login(username, password)
                    },
                    onClearError = { authViewModel.clearError() }
                )
            }

            // Dashboard
            composable(Screen.Dashboard.route) {
                val dashboardViewModel: DashboardViewModel = hiltViewModel()
                val uiState by dashboardViewModel.uiState.collectAsState()
                DashboardScreen(
                    uiState = uiState,
                    onNavigateToAttendance = { navController.navigate(Screen.Attendance.route) },
                    onNavigateToTargets = { navController.navigate(Screen.Targets.route) },
                    onNavigateToNotifications = { navController.navigate(Screen.Notifications.route) },
                    onRefresh = { dashboardViewModel.refresh() }
                )
            }

            // Attendance
            composable(Screen.Attendance.route) {
                val attendanceViewModel: AttendanceViewModel = hiltViewModel()
                val uiState by attendanceViewModel.uiState.collectAsState()
                AttendanceScreen(
                    uiState = uiState,
                    onCheckIn = { location, selfieUri -> attendanceViewModel.checkIn(location, selfieUri) },
                    onCheckOut = { location, selfieUri -> attendanceViewModel.checkOut(location, selfieUri) },
                    onRefresh = { attendanceViewModel.refresh() },
                    onClearMessages = { attendanceViewModel.clearMessages() }
                )
            }

            // Targets
            composable(Screen.Targets.route) {
                val targetViewModel: TargetViewModel = hiltViewModel()
                val uiState by targetViewModel.listState.collectAsState()
                TargetsScreen(
                    uiState = uiState,
                    onTargetClick = { targetId, assignmentId ->
                        navController.navigate("target_detail/$targetId/$assignmentId")
                    },
                    onRefresh = { targetViewModel.refresh() }
                )
            }

            // Target Detail
            composable(
                route = "target_detail/{targetId}/{assignmentId}",
                arguments = listOf(
                    navArgument("targetId") { type = NavType.StringType },
                    navArgument("assignmentId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val targetId = backStackEntry.arguments?.getString("targetId") ?: return@composable
                val assignmentId = backStackEntry.arguments?.getString("assignmentId") ?: return@composable
                val targetViewModel: TargetViewModel = hiltViewModel()
                TargetDetailScreen(
                    viewModel = targetViewModel,
                    targetId = targetId,
                    assignmentId = assignmentId,
                    onBack = { navController.popBackStack() }
                )
            }

            // Chat List
            composable(Screen.Chat.route) {
                val chatViewModel: ChatViewModel = hiltViewModel()
                ChatListScreen(
                    viewModel = chatViewModel,
                    onConversationClick = { id -> navController.navigate("chat_detail/$id") },
                    onNewChat = { /* TODO: Create new conversation */ }
                )
            }

            // Chat Detail
            composable(
                route = "chat_detail/{conversationId}",
                arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
            ) { backStackEntry ->
                val conversationId = backStackEntry.arguments?.getString("conversationId") ?: return@composable
                val chatViewModel: ChatViewModel = hiltViewModel()
                ChatDetailScreen(
                    viewModel = chatViewModel,
                    conversationId = conversationId,
                    onBack = { navController.popBackStack() }
                )
            }

            // More
            composable(Screen.More.route) {
                MoreScreen(
                    user = authState.user,
                    onNavigate = { route ->
                        when (route) {
                            "profile" -> navController.navigate(Screen.Profile.route)
                            "notifications" -> navController.navigate(Screen.Notifications.route)
                            "expenses" -> navController.navigate(Screen.Expenses.route)
                            "leave" -> navController.navigate(Screen.Leave.route)
                            "admin_dashboard" -> navController.navigate(Screen.AdminDashboard.route)
                            "admin_targets" -> navController.navigate(Screen.AdminTargets.route)
                            "admin_attendance" -> navController.navigate(Screen.AdminAttendance.route)
                            "admin_expenses" -> navController.navigate(Screen.AdminExpenses.route)
                            "admin_leave" -> navController.navigate(Screen.AdminLeave.route)
                            "admin_map" -> navController.navigate(Screen.AdminMaps.route)
                            "admin_crm" -> navController.navigate(Screen.CRM.route)
                        }
                    },
                    onLogout = {
                        authViewModel.logout()
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            // Profile
            composable(Screen.Profile.route) {
                ProfileScreen(
                    user = authState.user,
                    onEditProfile = { /* TODO */ },
                    onLogout = {
                        authViewModel.logout()
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            // Notifications
            composable(Screen.Notifications.route) {
                // TODO: Wire to NotificationRepository
                NotificationScreen(
                    notifications = emptyList(),
                    isLoading = false,
                    onMarkRead = {},
                    onMarkAllRead = {},
                    onBack = { navController.popBackStack() }
                )
            }

            // Expenses
            composable(Screen.Expenses.route) {
                val expenseViewModel: ExpenseViewModel = hiltViewModel()
                ExpenseScreen(
                    viewModel = expenseViewModel,
                    onAddExpense = { navController.navigate("expense_form") }
                )
            }

            composable("expense_form") {
                val expenseViewModel: ExpenseViewModel = hiltViewModel()
                ExpenseFormScreen(
                    viewModel = expenseViewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            // Leave
            composable(Screen.Leave.route) {
                val leaveViewModel: LeaveViewModel = hiltViewModel()
                LeaveScreen(
                    viewModel = leaveViewModel,
                    onApplyLeave = { navController.navigate("leave_form") }
                )
            }

            composable("leave_form") {
                val leaveViewModel: LeaveViewModel = hiltViewModel()
                LeaveFormScreen(
                    viewModel = leaveViewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            // ---- Admin Screens ----

            composable(Screen.AdminDashboard.route) {
                AdminDashboardScreen(
                    totalAgents = 0,
                    presentToday = 0,
                    pendingExpenses = 0,
                    pendingLeaves = 0,
                    activeTargets = 0,
                    onNavigate = { route ->
                        when (route) {
                            "admin_map" -> navController.navigate(Screen.AdminMaps.route)
                            "admin_targets" -> navController.navigate(Screen.AdminTargets.route)
                            "admin_attendance" -> navController.navigate(Screen.AdminAttendance.route)
                            "admin_expenses" -> navController.navigate(Screen.AdminExpenses.route)
                            "admin_leave" -> navController.navigate(Screen.AdminLeave.route)
                            "admin_crm" -> navController.navigate(Screen.CRM.route)
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.AdminTargets.route) {
                AdminTargetsScreen(
                    targets = emptyList(),
                    isLoading = false,
                    onAddTarget = { navController.navigate("admin_target_form") },
                    onTargetClick = {},
                    onBack = { navController.popBackStack() }
                )
            }

            composable("admin_target_form") {
                AdminTargetFormScreen(
                    onSave = { name, address, lat, lng, contact, phone, notes ->
                        // TODO: Save via TargetRepository
                        navController.popBackStack()
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.AdminAttendance.route) {
                AdminAttendanceScreen(
                    records = emptyList(),
                    isLoading = false,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.AdminExpenses.route) {
                AdminExpensesScreen(
                    expenses = emptyList(),
                    isLoading = false,
                    onApprove = {},
                    onReject = {},
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.AdminLeave.route) {
                AdminLeaveScreen(
                    leaveRequests = emptyList(),
                    isLoading = false,
                    onApprove = {},
                    onReject = {},
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.AdminMaps.route) {
                // Placeholder - Google Maps integration
                Box(modifier = Modifier.fillMaxSize()) {
                    Text(
                        "Live Map - Coming Soon",
                        modifier = Modifier.padding(24.dp),
                        style = MaterialTheme.typography.titleLarge
                    )
                }
            }

            composable(Screen.CRM.route) {
                // Placeholder - CRM screen
                Box(modifier = Modifier.fillMaxSize()) {
                    Text(
                        "CRM - Coming Soon",
                        modifier = Modifier.padding(24.dp),
                        style = MaterialTheme.typography.titleLarge
                    )
                }
            }
        }
    }
}
