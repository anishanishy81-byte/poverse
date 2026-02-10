package com.poverse.app.ui.screens.admin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.ui.theme.*

data class AdminStat(
    val label: String,
    val value: String,
    val icon: ImageVector,
    val color: androidx.compose.ui.graphics.Color = Primary
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    totalAgents: Int,
    presentToday: Int,
    pendingExpenses: Int,
    pendingLeaves: Int,
    activeTargets: Int,
    onNavigate: (String) -> Unit,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Admin Dashboard") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Stats Grid
            val stats = listOf(
                AdminStat("Total Agents", "$totalAgents", Icons.Filled.People, Primary),
                AdminStat("Present Today", "$presentToday", Icons.Filled.CheckCircle, Success),
                AdminStat("Pending Expenses", "$pendingExpenses", Icons.Filled.Receipt, Warning),
                AdminStat("Pending Leaves", "$pendingLeaves", Icons.Filled.CalendarMonth, Warning),
                AdminStat("Active Targets", "$activeTargets", Icons.Filled.GpsFixed, Primary)
            )

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    stats.chunked(2).forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            row.forEach { stat ->
                                StatCard(
                                    stat = stat,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            if (row.size == 1) {
                                Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }

            // Quick Actions
            item {
                Text(
                    "Quick Actions",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            val actions = listOf(
                Triple(Icons.Filled.Map, "Live Map", "admin_map"),
                Triple(Icons.Filled.GpsFixed, "Manage Targets", "admin_targets"),
                Triple(Icons.Filled.AccessTime, "Attendance", "admin_attendance"),
                Triple(Icons.Filled.Receipt, "Expenses", "admin_expenses"),
                Triple(Icons.Filled.EventAvailable, "Leave", "admin_leave"),
                Triple(Icons.Filled.People, "CRM", "admin_crm")
            )

            items(actions) { (icon, label, route) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    onClick = { onNavigate(route) }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(icon, null, tint = Primary, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(16.dp))
                        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                        Icon(Icons.Filled.ArrowForward, null, modifier = Modifier.size(18.dp), tint = TextSecondary)
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun StatCard(stat: AdminStat, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Icon(stat.icon, null, tint = stat.color, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(8.dp))
            Text(
                stat.value,
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                color = stat.color
            )
            Text(stat.label, style = MaterialTheme.typography.labelMedium, color = TextSecondary)
        }
    }
}
