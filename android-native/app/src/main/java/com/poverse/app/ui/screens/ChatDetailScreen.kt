package com.poverse.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.poverse.app.data.model.*
import com.poverse.app.ui.theme.*
import com.poverse.app.ui.viewmodel.ChatViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    viewModel: ChatViewModel,
    conversationId: String,
    onBack: () -> Unit
) {
    val uiState by viewModel.detailState.collectAsState()
    val listUiState by viewModel.listState.collectAsState()
    val messages = uiState.messages
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val conversation = uiState.conversation ?: listUiState.conversations.find { it.id == conversationId }

    val displayName = conversation?.let { convo ->
        if (convo.isGroup) convo.groupName ?: "Group"
        else convo.participantNames.entries.firstOrNull { it.key != uiState.currentUserId }?.value ?: "Chat"
    } ?: "Chat"

    LaunchedEffect(conversationId) {
        viewModel.openConversation(conversationId)
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                title = {
                    Column {
                        Text(displayName, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        if (uiState.isOtherTyping) {
                            Text(
                                "${uiState.otherUserName} typing...",
                                style = MaterialTheme.typography.bodySmall,
                                color = Primary
                            )
                        }
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
            // Messages
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(messages) { message ->
                    val isMe = message.senderId == uiState.currentUserId
                    MessageBubble(
                        message = message,
                        isMe = isMe,
                        senderName = conversation?.participantNames?.get(message.senderId) ?: "Unknown"
                    )
                }
            }

            // Input
            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 3.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = {
                            messageText = it
                            viewModel.setTyping(conversationId, it.isNotEmpty())
                        },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Type a message...") },
                        maxLines = 4,
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = Color.Transparent,
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    )

                    Spacer(Modifier.width(8.dp))

                    FilledIconButton(
                        onClick = {
                            if (messageText.isNotBlank()) {
                                viewModel.sendMessage(conversationId, messageText.trim())
                                messageText = ""
                                viewModel.setTyping(conversationId, false)
                            }
                        },
                        modifier = Modifier.size(48.dp),
                        shape = CircleShape,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = Primary),
                        enabled = messageText.isNotBlank()
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(
    message: ChatMessage,
    isMe: Boolean,
    senderName: String
) {
    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isMe) Alignment.End else Alignment.Start
    ) {
        if (!isMe) {
            Text(
                text = senderName,
                style = MaterialTheme.typography.labelSmall,
                color = Primary,
                modifier = Modifier.padding(start = 12.dp, bottom = 2.dp)
            )
        }

        // Reply reference
        message.replyTo?.let { reply ->
            Surface(
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .padding(horizontal = 4.dp),
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ) {
                Row(modifier = Modifier.padding(8.dp)) {
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(32.dp)
                            .background(Primary, RoundedCornerShape(2.dp))
                    )
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text(reply.senderName, style = MaterialTheme.typography.labelSmall, color = Primary)
                        Text(reply.content, style = MaterialTheme.typography.bodySmall, color = TextSecondary, maxLines = 1)
                    }
                }
            }
        }

        Surface(
            modifier = Modifier.widthIn(min = 60.dp, max = 280.dp),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isMe) 16.dp else 4.dp,
                bottomEnd = if (isMe) 4.dp else 16.dp
            ),
            color = if (isMe) Primary else MaterialTheme.colorScheme.surfaceVariant,
            tonalElevation = if (isMe) 0.dp else 1.dp
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                // Attachment indicator
                message.attachment?.let { attachment ->
                    Row(
                        modifier = Modifier.padding(bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val icon = when {
                            attachment.mimeType.startsWith("image") -> Icons.Filled.Image
                            attachment.mimeType.startsWith("video") -> Icons.Filled.VideoFile
                            attachment.mimeType.startsWith("audio") -> Icons.Filled.AudioFile
                            else -> Icons.Filled.AttachFile
                        }
                        Icon(
                            icon, null,
                            modifier = Modifier.size(16.dp),
                            tint = if (isMe) Color.White.copy(alpha = 0.7f) else TextSecondary
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            attachment.name,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isMe) Color.White.copy(alpha = 0.7f) else Primary
                        )
                    }
                }

                if (message.content.isNotEmpty()) {
                    Text(
                        text = message.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isMe) Color.White else MaterialTheme.colorScheme.onSurface
                    )
                }

                Row(
                    modifier = Modifier.align(Alignment.End).padding(top = 2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = timeFormat.format(Date(message.timestamp)),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        color = if (isMe) Color.White.copy(alpha = 0.7f) else TextSecondary
                    )
                    if (isMe) {
                        Spacer(Modifier.width(4.dp))
                        Icon(
                            imageVector = if (message.readBy.size > 1) Icons.Filled.DoneAll else Icons.Filled.Done,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = if (message.readBy.size > 1) Color(0xFF4FC3F7) else Color.White.copy(alpha = 0.7f)
                        )
                    }
                }

                // Reactions
                if (message.reactions.isNotEmpty()) {
                    val grouped = message.reactions.entries.groupBy { it.value }
                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        grouped.forEach { (emoji, entries) ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    "$emoji ${entries.size}",
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
