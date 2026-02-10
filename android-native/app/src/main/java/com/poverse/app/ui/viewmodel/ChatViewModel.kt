package com.poverse.app.ui.viewmodel

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poverse.app.data.model.*
import com.poverse.app.data.repository.ChatRepository
import com.poverse.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatListUiState(
    val isLoading: Boolean = true,
    val conversations: List<Conversation> = emptyList(),
    val currentUserId: String = "",
    val error: String? = null
)

data class ChatDetailUiState(
    val isLoading: Boolean = true,
    val messages: List<ChatMessage> = emptyList(),
    val conversation: Conversation? = null,
    val currentUserId: String = "",
    val currentUserName: String = "",
    val otherUserName: String = "",
    val isOtherTyping: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _listState = MutableStateFlow(ChatListUiState())
    val listState: StateFlow<ChatListUiState> = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(ChatDetailUiState())
    val detailState: StateFlow<ChatDetailUiState> = _detailState.asStateFlow()

    init {
        loadConversations()
    }

    private fun loadConversations() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _listState.update { it.copy(currentUserId = userId) }

            chatRepository.observeConversations(userId).collect { conversations ->
                _listState.update {
                    it.copy(isLoading = false, conversations = conversations)
                }
            }
        }
    }

    fun openConversation(conversationId: String) {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val user = authRepository.currentUser.first()
            val userName = user?.name ?: ""

            _detailState.update {
                it.copy(
                    isLoading = true,
                    currentUserId = userId,
                    currentUserName = userName
                )
            }

            // Mark as read
            chatRepository.markAsRead(conversationId, userId)

            // Observe messages
            launch {
                chatRepository.observeMessages(conversationId).collect { messages ->
                    _detailState.update {
                        it.copy(isLoading = false, messages = messages)
                    }
                }
            }

            // Find other user for typing indicator
            val conversations = _listState.value.conversations
            val conv = conversations.find { it.id == conversationId }
            if (conv != null) {
                _detailState.update { it.copy(conversation = conv) }

                val otherUserId = conv.participants.find { it != userId }
                val otherName = if (conv.isGroup) conv.groupName
                else conv.participantNames[otherUserId] ?: "Unknown"
                _detailState.update { it.copy(otherUserName = otherName) }

                if (otherUserId != null && !conv.isGroup) {
                    launch {
                        chatRepository.observeTyping(conversationId, otherUserId).collect { isTyping ->
                            _detailState.update { it.copy(isOtherTyping = isTyping) }
                        }
                    }
                }
            }
        }
    }

    fun sendMessage(conversationId: String, content: String) {
        viewModelScope.launch {
            if (content.isBlank()) return@launch
            _detailState.update { it.copy(isSending = true) }

            val userId = _detailState.value.currentUserId
            val userName = _detailState.value.currentUserName

            chatRepository.sendMessage(
                conversationId = conversationId,
                senderId = userId,
                senderName = userName,
                content = content
            )

            _detailState.update { it.copy(isSending = false) }
            chatRepository.setTyping(conversationId, userId, false)
        }
    }

    fun sendMediaMessage(conversationId: String, uri: Uri, type: MessageType) {
        viewModelScope.launch {
            _detailState.update { it.copy(isSending = true) }

            val userId = _detailState.value.currentUserId
            val userName = _detailState.value.currentUserName

            val result = chatRepository.uploadMedia(conversationId, uri, type)
            result.fold(
                onSuccess = { attachment ->
                    chatRepository.sendMessage(
                        conversationId = conversationId,
                        senderId = userId,
                        senderName = userName,
                        content = "",
                        type = type,
                        attachment = attachment
                    )
                },
                onFailure = { error ->
                    _detailState.update { it.copy(error = error.message) }
                }
            )

            _detailState.update { it.copy(isSending = false) }
        }
    }

    fun setTyping(conversationId: String, isTyping: Boolean) {
        viewModelScope.launch {
            val userId = _detailState.value.currentUserId
            chatRepository.setTyping(conversationId, userId, isTyping)
        }
    }

    fun deleteMessage(conversationId: String, messageId: String) {
        viewModelScope.launch {
            chatRepository.deleteMessage(conversationId, messageId)
        }
    }

    fun addReaction(conversationId: String, messageId: String, emoji: String) {
        viewModelScope.launch {
            val userId = _detailState.value.currentUserId
            chatRepository.addReaction(conversationId, messageId, userId, emoji)
        }
    }

    suspend fun startConversation(
        otherUserId: String,
        otherUserName: String,
        otherUserRole: String
    ): String {
        val userId = authRepository.getCurrentUserId() ?: return ""
        val user = authRepository.currentUser.first()
        val companyId = authRepository.getCurrentCompanyId() ?: ""

        return chatRepository.getOrCreateConversation(
            currentUserId = userId,
            currentUserName = user?.name ?: "",
            currentUserRole = user?.role?.toString() ?: "user",
            otherUserId = otherUserId,
            otherUserName = otherUserName,
            otherUserRole = otherUserRole,
            companyId = companyId
        )
    }
}
