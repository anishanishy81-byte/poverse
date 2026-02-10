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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.*
import com.poverse.app.ui.theme.*
import com.poverse.app.ui.viewmodel.LeaveViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaveScreen(
    viewModel: LeaveViewModel,
    onApplyLeave: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Leave") },
                actions = {
                    IconButton(onClick = { viewModel.clearMessages() }) {
                        Icon(Icons.Filled.Refresh, "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onApplyLeave, containerColor = Primary) {
                Icon(Icons.Filled.Add, "Apply Leave", tint = OnPrimary)
            }
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                // Balance Card
                uiState.leaveBalance?.let { balance ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Leave Balance", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                Spacer(Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceAround
                                ) {
                                    balance.balances.forEach { (type, typeBalance) ->
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                "${typeBalance.available}",
                                                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                                                color = Primary
                                            )
                                            Text(
                                                type.replace("_", " ").replaceFirstChar { it.uppercase() },
                                                style = MaterialTheme.typography.labelSmall,
                                                color = TextSecondary
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }

                if (uiState.leaveRequests.isEmpty()) {
                    item {
                        Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Filled.EventAvailable, null, modifier = Modifier.size(48.dp), tint = TextSecondary)
                                Spacer(Modifier.height(8.dp))
                                Text("No leave requests", color = TextSecondary)
                            }
                        }
                    }
                } else {
                    items(uiState.leaveRequests.sortedByDescending { it.createdAt }) { leave ->
                        LeaveRequestCard(leave = leave)
                    }
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun LeaveRequestCard(leave: LeaveRequest) {
    val statusColor = when (leave.status) {
        LeaveStatus.APPROVED -> Success
        LeaveStatus.REJECTED -> Error
        else -> Warning
    }
    val dateFormat = SimpleDateFormat("MMM dd", Locale.getDefault())

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val icon = when (leave.leaveType) {
                LeaveType.SICK -> Icons.Filled.LocalHospital
                LeaveType.CASUAL -> Icons.Filled.Weekend
                LeaveType.EARNED -> Icons.Filled.Star
                else -> Icons.Filled.CalendarMonth
            }

            Surface(
                modifier = Modifier.size(44.dp),
                shape = RoundedCornerShape(12.dp),
                color = Primary.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = Primary, modifier = Modifier.size(22.dp))
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    leave.leaveType.displayName(),
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                )
                Text(
                    "${leave.startDate} - ${leave.endDate}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                if (leave.reason.isNotEmpty()) {
                    Text(
                        leave.reason,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 1
                    )
                }
            }

            Spacer(Modifier.width(8.dp))

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "${leave.totalDays} ${if (leave.totalDays > 1) "days" else "day"}",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold)
                )
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = statusColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        leave.status.name.lowercase().replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaveFormScreen(
    viewModel: LeaveViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var reason by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf(LeaveType.CASUAL) }
    var selectedDuration by remember { mutableStateOf(LeaveDuration.FULL_DAY) }
    var typeExpanded by remember { mutableStateOf(false) }
    var durationExpanded by remember { mutableStateOf(false) }
    // For simplicity, using same date for start/end (single day)
    var startDate by remember { mutableStateOf(System.currentTimeMillis()) }
    var endDate by remember { mutableStateOf(System.currentTimeMillis()) }
    var totalDays by remember { mutableStateOf(1.0) }

    LaunchedEffect(selectedDuration) {
        totalDays = when (selectedDuration) {
            LeaveDuration.HALF_DAY_MORNING, LeaveDuration.HALF_DAY_AFTERNOON -> 0.5
            else -> {
                val diff = (endDate - startDate) / (24 * 60 * 60 * 1000.0)
                maxOf(1.0, diff + 1)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Apply Leave") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.Close, "Close")
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
                            viewModel.submitLeaveRequest(
                                leaveType = selectedType,
                                startDate = sdf.format(java.util.Date(startDate)),
                                endDate = sdf.format(java.util.Date(endDate)),
                                duration = selectedDuration,
                                totalDays = totalDays,
                                reason = reason
                            )
                            onBack()
                        },
                        enabled = reason.isNotBlank() && !uiState.isLoading
                    ) {
                        Text("Submit", fontWeight = FontWeight.Bold)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Leave Type
            ExposedDropdownMenuBox(expanded = typeExpanded, onExpandedChange = { typeExpanded = it }) {
                OutlinedTextField(
                    value = selectedType.displayName(),
                    onValueChange = {},
                    label = { Text("Leave Type") },
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
                    LeaveType.entries.forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.displayName()) },
                            onClick = { selectedType = type; typeExpanded = false }
                        )
                    }
                }
            }

            // Duration
            ExposedDropdownMenuBox(expanded = durationExpanded, onExpandedChange = { durationExpanded = it }) {
                OutlinedTextField(
                    value = selectedDuration.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() },
                    onValueChange = {},
                    label = { Text("Duration") },
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = durationExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(expanded = durationExpanded, onDismissRequest = { durationExpanded = false }) {
                    LeaveDuration.entries.forEach { dur ->
                        DropdownMenuItem(
                            text = { Text(dur.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }) },
                            onClick = { selectedDuration = dur; durationExpanded = false }
                        )
                    }
                }
            }

            // Total days info
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total Days", style = MaterialTheme.typography.bodyMedium)
                    Text("$totalDays", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold), color = Primary)
                }
            }

            // Reason
            OutlinedTextField(
                value = reason,
                onValueChange = { reason = it },
                label = { Text("Reason") },
                modifier = Modifier.fillMaxWidth().height(120.dp),
                shape = RoundedCornerShape(12.dp)
            )

            if (uiState.error != null) {
                Text(uiState.error!!, color = Error, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
