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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminTargetsScreen(
    targets: List<AdminTarget>,
    isLoading: Boolean,
    onAddTarget: () -> Unit,
    onTargetClick: (String) -> Unit,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manage Targets") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddTarget, containerColor = Primary) {
                Icon(Icons.Filled.Add, "Add Target", tint = OnPrimary)
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (targets.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.GpsFixed, null, modifier = Modifier.size(64.dp), tint = TextSecondary)
                    Text("No targets created", color = TextSecondary, modifier = Modifier.padding(top = 16.dp))
                    TextButton(onClick = onAddTarget) { Text("Create Target") }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                items(targets) { target ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        onClick = { onTargetClick(target.id) }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(target.name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                if (target.isActive) {
                                    Surface(shape = RoundedCornerShape(8.dp), color = Success.copy(alpha = 0.1f)) {
                                        Text("Active", style = MaterialTheme.typography.labelSmall, color = Success, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                                    }
                                }
                            }
                            if (target.address.isNotEmpty()) {
                                Row(modifier = Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(14.dp), tint = TextSecondary)
                                    Spacer(Modifier.width(4.dp))
                                    Text(target.address, style = MaterialTheme.typography.bodySmall, color = TextSecondary, maxLines = 1)
                                }
                            }
                            if (target.contactPerson.isNotEmpty()) {
                                Row(modifier = Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.Person, null, modifier = Modifier.size(14.dp), tint = TextSecondary)
                                    Spacer(Modifier.width(4.dp))
                                    Text("${target.contactPerson} • ${target.contactPhone}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                }
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminTargetFormScreen(
    onSave: (name: String, address: String, lat: Double, lng: Double, contactPerson: String, contactPhone: String, notes: String) -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean = false
) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var lat by remember { mutableStateOf("") }
    var lng by remember { mutableStateOf("") }
    var contactPerson by remember { mutableStateOf("") }
    var contactPhone by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Target") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.Close, "Close") }
                },
                actions = {
                    TextButton(
                        onClick = {
                            onSave(name, address, lat.toDoubleOrNull() ?: 0.0, lng.toDoubleOrNull() ?: 0.0, contactPerson, contactPhone, notes)
                        },
                        enabled = name.isNotBlank() && address.isNotBlank() && !isLoading
                    ) { Text("Save", fontWeight = FontWeight.Bold) }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(name, { name = it }, label = { Text("Name *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(address, { address = it }, label = { Text("Address *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(lat, { lat = it }, label = { Text("Latitude") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                OutlinedTextField(lng, { lng = it }, label = { Text("Longitude") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
            }
            OutlinedTextField(contactPerson, { contactPerson = it }, label = { Text("Contact Person") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(contactPhone, { contactPhone = it }, label = { Text("Contact Phone") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(notes, { notes = it }, label = { Text("Notes") }, modifier = Modifier.fillMaxWidth().height(100.dp), shape = RoundedCornerShape(12.dp))
        }
    }
}
