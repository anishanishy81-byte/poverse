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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.*
import com.poverse.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminLeaveScreen(
    leaveRequests: List<LeaveRequest>,
    isLoading: Boolean,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onBack: () -> Unit
) {
    val pending = leaveRequests.filter { it.status == LeaveStatus.PENDING }
    val processed = leaveRequests.filter { it.status != LeaveStatus.PENDING }
    var showPending by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Leave Approvals") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = if (showPending) 0 else 1) {
                Tab(showPending, { showPending = true }) { Text("Pending (${pending.size})", modifier = Modifier.padding(12.dp)) }
                Tab(!showPending, { showPending = false }) { Text("Processed", modifier = Modifier.padding(12.dp)) }
            }

            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                val items = if (showPending) pending else processed
                if (items.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No ${if (showPending) "pending" else "processed"} requests", color = TextSecondary)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        items(items) { leave ->
                            AdminLeaveCard(leave, showPending, { onApprove(leave.id) }, { onReject(leave.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminLeaveCard(
    leave: LeaveRequest,
    showActions: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val dateFormat = SimpleDateFormat("MMM dd", Locale.getDefault())

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(leave.userName, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                    Text(leave.leaveType.displayName(), style = MaterialTheme.typography.bodySmall, color = Primary)
                    Text("${leave.startDate} - ${leave.endDate}", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    if (leave.reason.isNotEmpty()) {
                        Text(leave.reason, style = MaterialTheme.typography.bodySmall, color = TextSecondary, maxLines = 2, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("${leave.totalDays}", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold), color = Primary)
                    Text("days", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                }
            }
            if (showActions) {
                Spacer(Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onReject, modifier = Modifier.weight(1f), colors = ButtonDefaults.outlinedButtonColors(contentColor = Error)) {
                        Icon(Icons.Filled.Close, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Reject")
                    }
                    Button(onClick = onApprove, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Success)) {
                        Icon(Icons.Filled.Check, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Approve")
                    }
                }
            } else {
                val statusColor = when (leave.status) {
                    LeaveStatus.APPROVED -> Success
                    LeaveStatus.REJECTED -> Error
                    else -> Warning
                }
                Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.1f), modifier = Modifier.padding(top = 8.dp)) {
                    Text(leave.status.name.lowercase().replaceFirstChar { it.uppercase() }, color = statusColor, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                }
            }
        }
    }
}
