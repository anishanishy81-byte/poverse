package com.poverse.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.*
import com.poverse.app.ui.theme.*
import com.poverse.app.ui.viewmodel.TargetListUiState
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TargetsScreen(
    uiState: TargetListUiState,
    onTargetClick: (String, String) -> Unit,
    onRefresh: () -> Unit
) {
    var showHistory by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Targets") },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Filled.Refresh, "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = if (showHistory) 1 else 0) {
                Tab(!showHistory, { showHistory = false }) { Text("Assigned", modifier = Modifier.padding(12.dp)) }
                Tab(showHistory, { showHistory = true }) { Text("History", modifier = Modifier.padding(12.dp)) }
            }

            if (uiState.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (!showHistory) {
                if (uiState.assignments.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.LocationOff, null, modifier = Modifier.size(64.dp), tint = TextSecondary)
                            Text("No assigned targets", color = TextSecondary, modifier = Modifier.padding(top = 16.dp))
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.assignments) { assignment ->
                            val target = uiState.targets[assignment.targetId]
                            TargetAssignmentCard(
                                assignment = assignment,
                                target = target,
                                onClick = { onTargetClick(assignment.targetId, assignment.id) }
                            )
                        }
                        item { Spacer(Modifier.height(80.dp)) }
                    }
                }
            } else {
                // Visit History
                if (uiState.visitHistory.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No visit history", color = TextSecondary)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(uiState.visitHistory) { visit ->
                            VisitHistoryCard(visit = visit)
                        }
                        item { Spacer(Modifier.height(80.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun TargetAssignmentCard(
    assignment: TargetAssignment,
    target: AdminTarget?,
    onClick: () -> Unit
) {
    val priorityColor = when (assignment.priority) {
        TargetPriority.URGENT -> UrgentPriorityColor
        TargetPriority.HIGH -> HighPriorityColor
        TargetPriority.LOW -> LowPriorityColor
        else -> MediumPriorityColor
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(10.dp),
                        shape = CircleShape,
                        color = priorityColor
                    ) {}
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = target?.name ?: "Target",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                AssistChip(
                    onClick = {},
                    label = { Text(assignment.priority.displayName()) },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = priorityColor.copy(alpha = 0.1f),
                        labelColor = priorityColor
                    )
                )
            }

            if (target?.address?.isNotEmpty() == true) {
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(16.dp), tint = TextSecondary)
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = target.address,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (target?.contactPerson?.isNotEmpty() == true) {
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.Person, null, modifier = Modifier.size(16.dp), tint = TextSecondary)
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = target.contactPerson,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    if (target.contactPhone.isNotEmpty()) {
                        Text(
                            text = " | ${target.contactPhone}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Visit reason chip
                if (assignment.visitReason.isNotEmpty()) {
                    SuggestionChip(
                        onClick = {},
                        label = { Text(assignment.visitReason, style = MaterialTheme.typography.labelSmall) }
                    )
                }

                // Progress
                Text(
                    text = "${assignment.completedVisits}/${assignment.requiredVisits} visits",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    color = Primary
                )
            }

            // Progress bar
            LinearProgressIndicator(
                progress = {
                    if (assignment.requiredVisits > 0)
                        (assignment.completedVisits.toFloat() / assignment.requiredVisits).coerceIn(0f, 1f)
                    else 0f
                },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(4.dp),
                color = if (assignment.completedVisits >= assignment.requiredVisits) Success else Primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
        }
    }
}

@Composable
private fun VisitHistoryCard(visit: TargetVisit) {
    val statusColor = when (visit.status) {
        VisitStatus.COMPLETED -> Success
        VisitStatus.IN_PROGRESS -> Warning
        VisitStatus.SKIPPED -> Error
        else -> TextSecondary
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = when (visit.status) {
                    VisitStatus.COMPLETED -> Icons.Filled.CheckCircle
                    VisitStatus.SKIPPED -> Icons.Filled.Cancel
                    VisitStatus.IN_PROGRESS -> Icons.Filled.HourglassTop
                    else -> Icons.Filled.Circle
                },
                contentDescription = null,
                tint = statusColor,
                modifier = Modifier.size(24.dp)
            )

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = visit.targetName,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                )
                Text(
                    text = visit.visitReason,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                if (visit.durationMinutes > 0) {
                    Text(
                        text = "${visit.durationMinutes}min • ${String.format("%.1f", visit.distanceKm)}km",
                        style = MaterialTheme.typography.bodySmall,
                        color = Primary
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                AssistChip(
                    onClick = {},
                    label = { Text(visit.leadStatus.displayName(), style = MaterialTheme.typography.labelSmall) }
                )
                if (visit.createdAt > 0) {
                    Text(
                        text = SimpleDateFormat("MMM dd", Locale.getDefault()).format(Date(visit.createdAt)),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}
