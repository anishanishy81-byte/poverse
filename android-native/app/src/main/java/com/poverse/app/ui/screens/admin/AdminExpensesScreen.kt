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
fun AdminExpensesScreen(
    expenses: List<Expense>,
    isLoading: Boolean,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onBack: () -> Unit
) {
    val pendingExpenses = expenses.filter { it.status == ExpenseStatus.PENDING }
    val processedExpenses = expenses.filter { it.status != ExpenseStatus.PENDING }
    var showPending by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Expense Approvals") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = if (showPending) 0 else 1) {
                Tab(showPending, { showPending = true }) {
                    Text("Pending (${pendingExpenses.size})", modifier = Modifier.padding(12.dp))
                }
                Tab(!showPending, { showPending = false }) {
                    Text("Processed", modifier = Modifier.padding(12.dp))
                }
            }

            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                val itemsToShow = if (showPending) pendingExpenses else processedExpenses
                if (itemsToShow.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No ${if (showPending) "pending" else "processed"} expenses", color = TextSecondary)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        items(itemsToShow) { expense ->
                            AdminExpenseCard(
                                expense = expense,
                                showActions = showPending,
                                onApprove = { onApprove(expense.id) },
                                onReject = { onReject(expense.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminExpenseCard(
    expense: Expense,
    showActions: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(expense.userName, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
                    Text(expense.description, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Text("${expense.category.displayName()} • ${dateFormat.format(Date(expense.createdAt))}", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                }
                Text("₹${String.format("%,.0f", expense.amount)}", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = Primary)
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
            }
        }
    }
}
