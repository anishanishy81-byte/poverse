package com.poverse.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(
    val route: String,
    val title: String,
    val icon: ImageVector? = null,
    val selectedIcon: ImageVector? = null
) {
    // Auth
    data object Login : Screen("login", "Login")

    // Agent Bottom Nav
    data object Dashboard : Screen("dashboard", "Dashboard", Icons.Outlined.Dashboard, Icons.Filled.Dashboard)
    data object Attendance : Screen("attendance", "Attendance", Icons.Outlined.AccessTime, Icons.Filled.AccessTime)
    data object Targets : Screen("targets", "Targets", Icons.Outlined.LocationOn, Icons.Filled.LocationOn)
    data object Chat : Screen("chat", "Chat", Icons.Outlined.Chat, Icons.Filled.Chat)
    data object More : Screen("more", "More", Icons.Outlined.MoreHoriz, Icons.Filled.MoreHoriz)

    // Secondary screens
    data object Expenses : Screen("expenses", "Expenses", Icons.Outlined.Receipt, Icons.Filled.Receipt)
    data object Leave : Screen("leave", "Leave", Icons.Outlined.EventBusy, Icons.Filled.EventBusy)
    data object Documents : Screen("documents", "Documents", Icons.Outlined.Folder, Icons.Filled.Folder)
    data object Reports : Screen("reports", "Reports", Icons.Outlined.Assessment, Icons.Filled.Assessment)
    data object Profile : Screen("profile", "Profile", Icons.Outlined.Person, Icons.Filled.Person)
    data object Notifications : Screen("notifications", "Notifications", Icons.Outlined.Notifications, Icons.Filled.Notifications)
    data object CRM : Screen("crm", "CRM", Icons.Outlined.People, Icons.Filled.People)
    data object Routes : Screen("routes", "Routes", Icons.Outlined.Map, Icons.Filled.Map)

    // Chat detail
    data object ChatDetail : Screen("chat/{conversationId}", "Chat") {
        fun createRoute(conversationId: String) = "chat/$conversationId"
    }

    // Target detail / visit
    data object TargetDetail : Screen("target/{targetId}/{assignmentId}", "Target") {
        fun createRoute(targetId: String, assignmentId: String) = "target/$targetId/$assignmentId"
    }
    data object VisitForm : Screen("visit/{visitId}", "Visit") {
        fun createRoute(visitId: String) = "visit/$visitId"
    }

    // Expense form
    data object ExpenseForm : Screen("expense/new", "New Expense")

    // Leave form
    data object LeaveForm : Screen("leave/new", "New Leave Request")

    // Customer detail
    data object CustomerDetail : Screen("customer/{customerId}", "Customer") {
        fun createRoute(customerId: String) = "customer/$customerId"
    }

    // Admin screens
    data object AdminDashboard : Screen("admin", "Admin Dashboard", Icons.Outlined.AdminPanelSettings, Icons.Filled.AdminPanelSettings)
    data object AdminTargets : Screen("admin/targets", "Manage Targets", Icons.Outlined.LocationOn, Icons.Filled.LocationOn)
    data object AdminAttendance : Screen("admin/attendance", "Attendance Overview", Icons.Outlined.AccessTime, Icons.Filled.AccessTime)
    data object AdminExpenses : Screen("admin/expenses", "Expense Approvals", Icons.Outlined.Receipt, Icons.Filled.Receipt)
    data object AdminLeave : Screen("admin/leave", "Leave Approvals", Icons.Outlined.EventBusy, Icons.Filled.EventBusy)
    data object AdminMaps : Screen("admin/maps", "Agent Maps", Icons.Outlined.Map, Icons.Filled.Map)
    data object AdminDocuments : Screen("admin/documents", "Documents", Icons.Outlined.Folder, Icons.Filled.Folder)
    data object AdminReports : Screen("admin/reports", "Reports", Icons.Outlined.Assessment, Icons.Filled.Assessment)
    data object AdminCreateTarget : Screen("admin/targets/new", "Create Target")
    data object AdminAssignTarget : Screen("admin/targets/assign/{targetId}", "Assign Target") {
        fun createRoute(targetId: String) = "admin/targets/assign/$targetId"
    }

    // Superadmin
    data object SuperAdminDashboard : Screen("superadmin", "Super Admin")
    data object SuperAdminMaps : Screen("superadmin/maps", "Global Maps")
}

val agentBottomNavItems = listOf(
    Screen.Dashboard,
    Screen.Attendance,
    Screen.Targets,
    Screen.Chat,
    Screen.More
)

val adminBottomNavItems = listOf(
    Screen.AdminDashboard,
    Screen.AdminTargets,
    Screen.Chat,
    Screen.AdminMaps,
    Screen.More
)

val moreMenuItems = listOf(
    Screen.Expenses,
    Screen.Leave,
    Screen.Documents,
    Screen.Reports,
    Screen.CRM,
    Screen.Routes,
    Screen.Notifications,
    Screen.Profile
)

val adminMoreMenuItems = listOf(
    Screen.AdminAttendance,
    Screen.AdminExpenses,
    Screen.AdminLeave,
    Screen.AdminDocuments,
    Screen.AdminReports,
    Screen.Notifications,
    Screen.Profile
)
