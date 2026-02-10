package com.poverse.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.*
import com.poverse.app.ui.theme.*
import com.poverse.app.ui.viewmodel.TargetViewModel

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TargetDetailScreen(
    viewModel: TargetViewModel,
    targetId: String,
    assignmentId: String,
    onBack: () -> Unit
) {
    val listState by viewModel.listState.collectAsState()
    val visitState by viewModel.visitState.collectAsState()

    val assignment = listState.assignments.find { it.id == assignmentId }
    val target = listState.targets[targetId]
    val activeVisit = listState.activeVisit

    var showSkipDialog by remember { mutableStateOf(false) }
    var skipReason by remember { mutableStateOf("") }
    var selectedLeadStatus by remember { mutableStateOf(LeadStatus.NEW) }
    var notes by remember { mutableStateOf("") }
    var selectedOutcomes by remember { mutableStateOf(emptySet<String>()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(target?.name ?: "Target Detail") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (assignment == null || target == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Target Info Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(target.name, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))

                    if (target.address.isNotEmpty()) {
                        Row(modifier = Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(target.address, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    if (target.contactPerson.isNotEmpty()) {
                        Row(modifier = Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Person, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(target.contactPerson, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    if (target.contactPhone.isNotEmpty()) {
                        Row(modifier = Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Phone, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(target.contactPhone, style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("Visit Reason", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            Text(assignment.visitReason, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Progress", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            Text("${assignment.completedVisits}/${assignment.requiredVisits}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                        }
                    }
                }
            }

            // Active Visit Card
            if (activeVisit != null && activeVisit.targetId == targetId) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Warning.copy(alpha = 0.2f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Visit In Progress", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        val startTime = activeVisit.startTime
                        if (startTime != null && startTime > 0) {
                            Text(
                                "Started: ${java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date(startTime))}",
                                style = MaterialTheme.typography.bodyMedium, color = TextSecondary
                            )
                        }
                    }
                }
            }

            // Notes
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Visit Notes") },
                modifier = Modifier.fillMaxWidth().height(120.dp),
                shape = RoundedCornerShape(12.dp)
            )

            // Lead Status Selection
            Text("Lead Status", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                LeadStatus.entries.forEach { status ->
                    FilterChip(
                        selected = selectedLeadStatus == status,
                        onClick = { selectedLeadStatus = status },
                        label = { Text(status.displayName(), style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }

            // Outcome Flags
            Text("Outcomes", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                OUTCOME_FLAGS.forEach { flag ->
                    FilterChip(
                        selected = flag in selectedOutcomes,
                        onClick = {
                            selectedOutcomes = if (flag in selectedOutcomes) selectedOutcomes - flag else selectedOutcomes + flag
                        },
                        label = { Text(flag) }
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            // Action Buttons
            if (activeVisit == null || activeVisit.targetId != targetId) {
                Button(
                    onClick = {
                        val location = LocationPoint(0.0, 0.0, 0f, "Getting location...")
                        viewModel.startVisit(
                            assignmentId = assignmentId,
                            targetId = targetId,
                            targetName = target.name,
                            visitReason = assignment.visitReason,
                            location = location
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    enabled = !visitState.isStarting
                ) {
                    if (visitState.isStarting) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = OnPrimary, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Filled.PlayArrow, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Start Visit", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    }
                }
            } else {
                Button(
                    onClick = {
                        val location = LocationPoint(0.0, 0.0, 0f, "Getting location...")
                        viewModel.completeVisit(
                            visitId = activeVisit.id,
                            assignmentId = assignmentId,
                            targetId = targetId,
                            location = location,
                            leadStatus = selectedLeadStatus,
                            conversationNotes = notes,
                            outcomeFlags = selectedOutcomes.toList(),
                            offersDiscussed = "",
                            nextFollowUpDate = ""
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Success),
                    enabled = !visitState.isCompleting
                ) {
                    if (visitState.isCompleting) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = OnPrimary, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Filled.CheckCircle, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Complete Visit", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    }
                }
            }

            OutlinedButton(
                onClick = { showSkipDialog = true },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Filled.SkipNext, null)
                Spacer(Modifier.width(8.dp))
                Text("Skip Visit")
            }

            Spacer(Modifier.height(80.dp))
        }
    }

    if (showSkipDialog) {
        AlertDialog(
            onDismissRequest = { showSkipDialog = false },
            title = { Text("Skip Visit") },
            text = {
                OutlinedTextField(
                    value = skipReason,
                    onValueChange = { skipReason = it },
                    label = { Text("Reason for skipping") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showSkipDialog = false
                        onBack()
                    },
                    enabled = skipReason.isNotBlank()
                ) { Text("Skip") }
            },
            dismissButton = {
                TextButton(onClick = { showSkipDialog = false }) { Text("Cancel") }
            }
        )
    }

    visitState.error?.let { error ->
        LaunchedEffect(error) {
            // In production, show snackbar
        }
    }

    visitState.successMessage?.let {
        LaunchedEffect(it) {
            viewModel.clearMessages()
            onBack()
        }
    }
}
