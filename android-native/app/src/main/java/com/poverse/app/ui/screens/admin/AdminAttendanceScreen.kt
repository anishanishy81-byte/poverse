package com.poverse.app.ui.screens.admin

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.poverse.app.data.model.AttendanceRecord
import com.poverse.app.data.model.AttendanceStatus
import com.poverse.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminAttendanceScreen(
    records: List<Pair<String, AttendanceRecord>>, // (userName, record) pairs
    isLoading: Boolean,
    onBack: () -> Unit
) {
    val dateFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
    val present = records.filter { it.second.status == AttendanceStatus.CHECKED_IN }
    val absent = records.filter { it.second.status == AttendanceStatus.ABSENT }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Attendance Today") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                }
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                // Summary
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceAround) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("${records.size}", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
                                Text("Total", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("${present.size}", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold), color = Success)
                                Text("Present", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("${absent.size}", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold), color = Error)
                                Text("Absent", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                        }
                    }
                }

                if (present.isNotEmpty()) {
                    item {
                        Text("Present", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = Success, modifier = Modifier.padding(top = 8.dp))
                    }
                    items(present) { (name, record) ->
                        AttendanceAgentCard(name, record, dateFormat, true)
                    }
                }

                if (absent.isNotEmpty()) {
                    item {
                        Text("Absent / Not Checked In", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = Error, modifier = Modifier.padding(top = 8.dp))
                    }
                    items(absent) { (name, record) ->
                        AttendanceAgentCard(name, record, dateFormat, false)
                    }
                }
            }
        }
    }
}

@Composable
private fun AttendanceAgentCard(name: String, record: AttendanceRecord, dateFormat: SimpleDateFormat, isPresent: Boolean) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(40.dp).clip(CircleShape).background(if (isPresent) Success.copy(alpha = 0.1f) else Error.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text(name.take(1).uppercase(), fontWeight = FontWeight.Bold, color = if (isPresent) Success else Error)
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
                val checkInTimestamp = record.checkIn?.timestamp ?: 0L
                if (checkInTimestamp > 0) {
                    Text("In: ${dateFormat.format(Date(checkInTimestamp))}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                }
            }
            if (record.lateStatus != com.poverse.app.data.model.LateStatus.ON_TIME) {
                Surface(shape = RoundedCornerShape(8.dp), color = Warning.copy(alpha = 0.1f)) {
                    Text("Late", style = MaterialTheme.typography.labelSmall, color = Warning, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }
        }
    }
}
