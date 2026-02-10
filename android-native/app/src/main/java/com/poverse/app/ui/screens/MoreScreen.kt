package com.poverse.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.User
import com.poverse.app.data.model.UserRole
import com.poverse.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    user: User?,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("More") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // User card
            user?.let {
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onNavigate("profile") },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            color = Primary
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    it.name.take(1).uppercase(),
                                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                                    color = Color.White
                                )
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(it.name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                            Text(
                                it.role.name.lowercase().replaceFirstChar { c -> c.uppercase() },
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                        Icon(Icons.AutoMirrored.Filled.ArrowForwardIos, null, modifier = Modifier.size(14.dp), tint = TextSecondary)
                    }
                }
            }

            // Agent Menu Items
            Text("General", style = MaterialTheme.typography.titleSmall, color = TextSecondary, modifier = Modifier.padding(top = 8.dp))
            MenuCard {
                MenuItem(Icons.Filled.Person, "Profile") { onNavigate("profile") }
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                MenuItem(Icons.Filled.Notifications, "Notifications") { onNavigate("notifications") }
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                MenuItem(Icons.Filled.Receipt, "Expenses") { onNavigate("expenses") }
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                MenuItem(Icons.Filled.CalendarMonth, "Leave") { onNavigate("leave") }
            }

            // Admin options
            if (user?.role == UserRole.ADMIN || user?.role == UserRole.SUPERADMIN) {
                Text("Administration", style = MaterialTheme.typography.titleSmall, color = TextSecondary, modifier = Modifier.padding(top = 8.dp))
                MenuCard {
                    MenuItem(Icons.Filled.Dashboard, "Admin Dashboard") { onNavigate("admin_dashboard") }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    MenuItem(Icons.Filled.GpsFixed, "Manage Targets") { onNavigate("admin_targets") }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    MenuItem(Icons.Filled.AccessTime, "Attendance Reports") { onNavigate("admin_attendance") }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    MenuItem(Icons.Filled.Receipt, "Expense Approvals") { onNavigate("admin_expenses") }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    MenuItem(Icons.Filled.EventAvailable, "Leave Approvals") { onNavigate("admin_leave") }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    MenuItem(Icons.Filled.Map, "Live Map") { onNavigate("admin_map") }
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    MenuItem(Icons.Filled.People, "CRM") { onNavigate("admin_crm") }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Logout
            OutlinedButton(
                onClick = { showLogoutDialog = true },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Error)
            ) {
                Icon(Icons.Filled.ExitToApp, null, tint = Error)
                Spacer(Modifier.width(8.dp))
                Text("Logout")
            }

            Spacer(Modifier.height(80.dp))
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                TextButton(onClick = { showLogoutDialog = false; onLogout() }) {
                    Text("Logout", color = Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun MenuCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(vertical = 4.dp), content = content)
    }
}

@Composable
private fun MenuItem(icon: ImageVector, title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, modifier = Modifier.size(22.dp), tint = Primary)
        Spacer(Modifier.width(14.dp))
        Text(title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Filled.ArrowForwardIos, null, modifier = Modifier.size(14.dp), tint = TextSecondary)
    }
}
