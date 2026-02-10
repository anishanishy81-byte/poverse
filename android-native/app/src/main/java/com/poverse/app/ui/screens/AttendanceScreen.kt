package com.poverse.app.ui.screens

import android.Manifest
import android.net.Uri
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
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.poverse.app.data.model.*
import com.poverse.app.ui.theme.*
import com.poverse.app.ui.viewmodel.AttendanceUiState
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun AttendanceScreen(
    uiState: AttendanceUiState,
    onCheckIn: (LocationPoint, Uri?) -> Unit,
    onCheckOut: (LocationPoint, Uri?) -> Unit,
    onRefresh: () -> Unit,
    onClearMessages: () -> Unit
) {
    val permissionState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.CAMERA
        )
    )

    var showHistoryTab by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.error, uiState.successMessage) {
        // Auto-clear messages after showing
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Attendance") },
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
            // Tabs
            TabRow(
                selectedTabIndex = if (showHistoryTab) 1 else 0
            ) {
                Tab(
                    selected = !showHistoryTab,
                    onClick = { showHistoryTab = false },
                    text = { Text("Today") }
                )
                Tab(
                    selected = showHistoryTab,
                    onClick = { showHistoryTab = true },
                    text = { Text("History") }
                )
            }

            if (!showHistoryTab) {
                // Today's attendance
                TodayAttendanceContent(
                    uiState = uiState,
                    permissionsGranted = permissionState.allPermissionsGranted,
                    onRequestPermissions = { permissionState.launchMultiplePermissionRequest() },
                    onCheckIn = onCheckIn,
                    onCheckOut = onCheckOut
                )
            } else {
                // History
                AttendanceHistoryContent(history = uiState.history)
            }

            // Snackbar messages
            uiState.error?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    containerColor = Error,
                    dismissAction = {
                        IconButton(onClick = onClearMessages) {
                            Icon(Icons.Filled.Close, "Dismiss", tint = OnPrimary)
                        }
                    }
                ) {
                    Text(error, color = OnPrimary)
                }
            }

            uiState.successMessage?.let { msg ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    containerColor = Success,
                    dismissAction = {
                        IconButton(onClick = onClearMessages) {
                            Icon(Icons.Filled.Close, "Dismiss", tint = OnPrimary)
                        }
                    }
                ) {
                    Text(msg, color = OnPrimary)
                }
            }
        }
    }
}

@Composable
private fun TodayAttendanceContent(
    uiState: AttendanceUiState,
    permissionsGranted: Boolean,
    onRequestPermissions: () -> Unit,
    onCheckIn: (LocationPoint, Uri?) -> Unit,
    onCheckOut: (LocationPoint, Uri?) -> Unit
) {
    val record = uiState.todayRecord
    val isCheckedIn = record?.status == AttendanceStatus.CHECKED_IN
    val isCheckedOut = record?.status == AttendanceStatus.CHECKED_OUT

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Status indicator
        val statusColor = when {
            isCheckedIn -> CheckedInColor
            isCheckedOut -> CheckedOutColor
            else -> AbsentColor
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.1f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = when {
                        isCheckedIn -> Icons.Filled.CheckCircle
                        isCheckedOut -> Icons.Filled.ExitToApp
                        else -> Icons.Filled.AccessTime
                    },
                    contentDescription = null,
                    tint = statusColor,
                    modifier = Modifier.size(64.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = when {
                        isCheckedIn -> "You are checked in"
                        isCheckedOut -> "Day completed"
                        else -> "Not checked in yet"
                    },
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = statusColor
                )

                // Show check-in time
                if (record?.checkIn != null) {
                    Text(
                        text = "Check-in: ${formatTime(record.checkIn.timestamp)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    if (record.lateStatus != LateStatus.ON_TIME) {
                        AssistChip(
                            onClick = {},
                            label = { Text(record.lateStatus.toString().replace("_", " ").uppercase()) },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = if (record.lateStatus == LateStatus.LATE) LateColor.copy(alpha = 0.1f)
                                else VeryLateColor.copy(alpha = 0.1f),
                                labelColor = if (record.lateStatus == LateStatus.LATE) LateColor else VeryLateColor
                            ),
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }

                // Show check-out time
                if (record?.checkOut != null) {
                    Text(
                        text = "Check-out: ${formatTime(record.checkOut.timestamp)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.padding(top = 4.dp)
                    )

                    val hours = record.workDurationMinutes / 60
                    val mins = record.workDurationMinutes % 60
                    Text(
                        text = "Duration: ${hours}h ${mins}m",
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = Primary,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Action button
        if (!permissionsGranted) {
            Button(
                onClick = onRequestPermissions,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Filled.LocationOn, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Grant Permissions")
            }
        } else if (!isCheckedIn && !isCheckedOut) {
            Button(
                onClick = {
                    // In a real app, get actual location from GPS
                    val location = LocationPoint(0.0, 0.0, 0f, "Getting location...")
                    onCheckIn(location, null)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = !uiState.isCheckingIn,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CheckedInColor)
            ) {
                if (uiState.isCheckingIn) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = OnPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Filled.Login, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Check In", style = MaterialTheme.typography.titleMedium)
                }
            }
        } else if (isCheckedIn) {
            Button(
                onClick = {
                    val location = LocationPoint(0.0, 0.0, 0f, "Getting location...")
                    onCheckOut(location, null)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = !uiState.isCheckingOut,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Secondary)
            ) {
                if (uiState.isCheckingOut) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = OnPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Filled.Logout, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Check Out", style = MaterialTheme.typography.titleMedium)
                }
            }
        }

        // Shift info
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "Shift: ${uiState.settings.shiftStartTime} - ${uiState.settings.shiftEndTime}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
        )
    }
}

@Composable
private fun AttendanceHistoryContent(history: List<AttendanceRecord>) {
    if (history.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text("No attendance history", color = TextSecondary)
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(history) { record ->
                AttendanceHistoryCard(record = record)
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun AttendanceHistoryCard(record: AttendanceRecord) {
    val statusColor = when (record.status) {
        AttendanceStatus.CHECKED_IN -> CheckedInColor
        AttendanceStatus.CHECKED_OUT -> CheckedOutColor
        AttendanceStatus.ON_LEAVE -> Warning
        AttendanceStatus.HALF_DAY -> Info
        else -> AbsentColor
    }

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
            // Date
            Column(
                modifier = Modifier.width(60.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val parts = record.date.split("-")
                Text(
                    text = parts.getOrElse(2) { "" },
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    color = Primary
                )
                Text(
                    text = getMonthAbbrev(parts.getOrElse(1) { "" }),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Divider(
                modifier = Modifier
                    .height(40.dp)
                    .width(1.dp)
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(8.dp),
                        shape = RoundedCornerShape(4.dp),
                        color = statusColor
                    ) {}
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = record.status.toString().replace("_", " ").uppercase(),
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                        color = statusColor
                    )
                }

                if (record.checkIn != null) {
                    Text(
                        text = "In: ${formatTime(record.checkIn.timestamp)}" +
                                if (record.checkOut != null) " | Out: ${formatTime(record.checkOut.timestamp)}" else "",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                if (record.workDurationMinutes > 0) {
                    val h = record.workDurationMinutes / 60
                    val m = record.workDurationMinutes % 60
                    Text(
                        text = "${h}h ${m}m",
                        style = MaterialTheme.typography.bodySmall,
                        color = Primary,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }

            if (record.lateStatus != LateStatus.ON_TIME) {
                val lateColor = if (record.lateStatus == LateStatus.LATE) LateColor else VeryLateColor
                AssistChip(
                    onClick = {},
                    label = { Text(if (record.lateStatus == LateStatus.LATE) "Late" else "Very Late") },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = lateColor.copy(alpha = 0.1f),
                        labelColor = lateColor
                    )
                )
            }
        }
    }
}

private fun formatTime(timestamp: Long): String {
    if (timestamp == 0L) return ""
    return SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(timestamp))
}

private fun getMonthAbbrev(month: String): String {
    return when (month) {
        "01" -> "Jan"; "02" -> "Feb"; "03" -> "Mar"; "04" -> "Apr"
        "05" -> "May"; "06" -> "Jun"; "07" -> "Jul"; "08" -> "Aug"
        "09" -> "Sep"; "10" -> "Oct"; "11" -> "Nov"; "12" -> "Dec"
        else -> month
    }
}
