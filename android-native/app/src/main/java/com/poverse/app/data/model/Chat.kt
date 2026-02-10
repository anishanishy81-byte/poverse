package com.poverse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Conversation(
    val id: String = "",
    val participants: List<String> = emptyList(),
    val participantNames: Map<String, String> = emptyMap(),
    val participantRoles: Map<String, String> = emptyMap(),
    val participantPhotos: Map<String, String> = emptyMap(),
    val lastMessage: String = "",
    val lastMessageTime: Long = 0,
    val lastMessageSenderId: String = "",
    val unreadCount: Map<String, Int> = emptyMap(),
    val companyId: String = "",
    val isGroup: Boolean = false,
    val groupName: String = "",
    val groupPhoto: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
data class ChatMessage(
    val id: String = "",
    val conversationId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val content: String = "",
    val type: MessageType = MessageType.TEXT,
    val attachment: MessageAttachment? = null,
    val replyTo: ReplyInfo? = null,
    val reactions: Map<String, String> = emptyMap(),
    val readBy: Map<String, Long> = emptyMap(),
    val isDeleted: Boolean = false,
    val isEdited: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class MessageAttachment(
    val url: String = "",
    val name: String = "",
    val size: Long = 0,
    val mimeType: String = "",
    val thumbnailUrl: String = "",
    val width: Int = 0,
    val height: Int = 0,
    val duration: Int = 0 // for audio/video in seconds
)

@Serializable
data class ReplyInfo(
    val messageId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val content: String = "",
    val type: MessageType = MessageType.TEXT
)

@Serializable
enum class MessageType {
    TEXT, IMAGE, FILE, AUDIO, VIDEO, DOCUMENT, CALL;

    companion object {
        fun fromString(value: String): MessageType = when (value.lowercase()) {
            "image" -> IMAGE
            "file" -> FILE
            "audio" -> AUDIO
            "video" -> VIDEO
            "document" -> DOCUMENT
            "call" -> CALL
            else -> TEXT
        }
    }

    override fun toString(): String = name.lowercase()
}

@Serializable
data class CallRecord(
    val id: String = "",
    val callerId: String = "",
    val callerName: String = "",
    val receiverId: String = "",
    val receiverName: String = "",
    val type: CallType = CallType.VOICE,
    val status: CallStatus = CallStatus.RINGING,
    val startTime: Long = 0,
    val endTime: Long = 0,
    val duration: Int = 0,
    val conversationId: String = ""
)

@Serializable
enum class CallType {
    VOICE, VIDEO;
    override fun toString(): String = name.lowercase()
}

@Serializable
enum class CallStatus {
    RINGING, ANSWERED, ENDED, MISSED, DECLINED, BUSY;
    override fun toString(): String = name.lowercase()
}
