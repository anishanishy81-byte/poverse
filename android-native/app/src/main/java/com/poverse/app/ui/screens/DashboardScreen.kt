package com.poverse.app.ui.screens

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.AttendanceStatus
import com.poverse.app.ui.theme.*
import com.poverse.app.ui.viewmodel.DashboardUiState
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    uiState: DashboardUiState,
    onNavigateToAttendance: () -> Unit,
    onNavigateToTargets: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onRefresh: () -> Unit
) {
    val pullRefreshState = remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Good ${getGreeting()}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Text(
                            text = uiState.userName.ifEmpty { "Agent" },
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                    }
                },
                actions = {
                    BadgedBox(
                        badge = {
                            if (uiState.unreadNotifications > 0) {
                                Badge { Text(uiState.unreadNotifications.toString()) }
                            }
                        }
                    ) {
                        IconButton(onClick = onNavigateToNotifications) {
                            Icon(Icons.Filled.Notifications, "Notifications")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // Attendance Status Card
                item {
                    AttendanceStatusCard(
                        attendance = uiState.todayAttendance,
                        onTap = onNavigateToAttendance
                    )
                }

                // Quick Stats Row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Filled.LocationOn,
                            title = "Targets",
                            value = "${uiState.todayCompletedVisits}/${uiState.todayVisits}",
                            color = Primary,
                            onClick = onNavigateToTargets
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Filled.CheckCircle,
                            title = "Completed",
                            value = uiState.todayCompletedVisits.toString(),
                            color = Success
                        )
                    }
                }

                // Goals Progress
                if (uiState.goals != null) {
                    item {
                        GoalsCard(goals = uiState.goals)
                    }
                }

                // Today's Tasks
                if (uiState.scheduledTasks.isNotEmpty()) {
                    item {
                        Text(
                            text = "Today's Tasks",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    items(uiState.scheduledTasks.take(5)) { task ->
                        TaskCard(task = task)
                    }
                }

                // Assigned Targets Preview
                if (uiState.assignedTargets.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Pending Targets",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                            TextButton(onClick = onNavigateToTargets) {
                                Text("View All")
                            }
                        }
                    }

                    items(uiState.assignedTargets.take(3)) { assignment ->
                        AssignmentPreviewCard(assignment = assignment, onClick = onNavigateToTargets)
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun AttendanceStatusCard(
    attendance: com.poverse.app.data.model.AttendanceRecord?,
    onTap: () -> Unit
) {
    val status = attendance?.status
    val statusColor = when (status) {
        AttendanceStatus.CHECKED_IN -> CheckedInColor
        AttendanceStatus.CHECKED_OUT -> CheckedOutColor
        else -> AbsentColor
    }
    val statusText = when (status) {
        AttendanceStatus.CHECKED_IN -> "Checked In"
        AttendanceStatus.CHECKED_OUT -> "Checked Out"
        else -> "Not Checked In"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onTap,
        colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = when (status) {
                    AttendanceStatus.CHECKED_IN -> Icons.Filled.CheckCircle
                    AttendanceStatus.CHECKED_OUT -> Icons.Filled.Logout
                    else -> Icons.Filled.Login
                },
                contentDescription = null,
                tint = statusColor,
                modifier = Modifier.size(40.dp)
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = statusColor
                )
                if (attendance?.checkIn != null) {
                    val time = SimpleDateFormat("hh:mm a", Locale.getDefault())
                        .format(Date(attendance.checkIn.timestamp))
                    Text(
                        text = "Checked in at $time",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
                if (attendance?.workDurationMinutes ?: 0 > 0) {
                    val hours = attendance!!.workDurationMinutes / 60
                    val mins = attendance.workDurationMinutes % 60
                    Text(
                        text = "Work: ${hours}h ${mins}m",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
            )
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    value: String,
    color: Color,
    onClick: (() -> Unit)? = null
) {
    Card(
        modifier = modifier,
        onClick = { onClick?.invoke() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                color = color
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
private fun GoalsCard(goals: com.poverse.app.data.model.AgentGoals) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = "Daily Goals",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
            )
            Spacer(modifier = Modifier.height(16.dp))

            GoalProgressRow("Visits", 0, goals.daily.visits)
            GoalProgressRow("Conversions", 0, goals.daily.conversions)
            GoalProgressRow("New Leads", 0, goals.daily.newLeads)
        }
    }
}

@Composable
private fun GoalProgressRow(label: String, current: Int, target: Int) {
    val progress = if (target > 0) current.toFloat() / target else 0f

    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = label, style = MaterialTheme.typography.bodySmall)
            Text(text = "$current/$target", style = MaterialTheme.typography.bodySmall)
        }
        LinearProgressIndicator(
            progress = { progress.coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp)
                .height(6.dp),
            color = if (progress >= 1f) Success else Primary,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}

@Composable
private fun TaskCard(task: com.poverse.app.data.model.ScheduledTask) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = when (task.type) {
                    "visit" -> Icons.Filled.LocationOn
                    "meeting" -> Icons.Filled.Groups
                    "call" -> Icons.Filled.Phone
                    else -> Icons.Filled.Assignment
                },
                contentDescription = null,
                tint = Primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                )
                if (task.targetName.isNotEmpty()) {
                    Text(
                        text = task.targetName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
            if (task.scheduledTime > 0) {
                Text(
                    text = SimpleDateFormat("hh:mm a", Locale.getDefault())
                        .format(Date(task.scheduledTime)),
                    style = MaterialTheme.typography.bodySmall,
                    color = Primary
                )
            }
        }
    }
}

@Composable
private fun AssignmentPreviewCard(
    assignment: com.poverse.app.data.model.TargetAssignment,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val priorityColor = when (assignment.priority) {
                com.poverse.app.data.model.TargetPriority.URGENT -> UrgentPriorityColor
                com.poverse.app.data.model.TargetPriority.HIGH -> HighPriorityColor
                com.poverse.app.data.model.TargetPriority.LOW -> LowPriorityColor
                else -> MediumPriorityColor
            }

            Surface(
                modifier = Modifier.size(8.dp),
                shape = RoundedCornerShape(4.dp),
                color = priorityColor
            ) {}

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = assignment.visitReason.ifEmpty { "Visit" },
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                )
                Text(
                    text = "${assignment.completedVisits}/${assignment.requiredVisits} visits",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }

            AssistChip(
                onClick = {},
                label = {
                    Text(
                        text = assignment.priority.displayName(),
                        style = MaterialTheme.typography.labelSmall
                    )
                },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = priorityColor.copy(alpha = 0.1f),
                    labelColor = priorityColor
                )
            )
        }
    }
}

private fun getGreeting(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
        hour < 12 -> "Morning"
        hour < 17 -> "Afternoon"
        else -> "Evening"
    }
}
