package com.poverse.app.data.repository

import android.net.Uri
import android.util.Log
import com.google.firebase.database.*
import com.google.firebase.storage.FirebaseStorage
import com.poverse.app.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val rtdb: FirebaseDatabase,
    private val storage: FirebaseStorage,
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "ChatRepository"
    }

    fun observeConversations(userId: String): Flow<List<Conversation>> = callbackFlow {
        val ref = rtdb.reference.child("conversations")
            .orderByChild("participants/$userId").equalTo(true)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val conversations = snapshot.children.mapNotNull { child ->
                    parseConversation(child)
                }.sortedByDescending { it.lastMessageTime }
                trySend(conversations)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing conversations", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    fun observeMessages(conversationId: String, limit: Int = 50): Flow<List<ChatMessage>> = callbackFlow {
        val ref = rtdb.reference.child("messages").child(conversationId)
            .orderByChild("timestamp")
            .limitToLast(limit)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val messages = snapshot.children.mapNotNull { child ->
                    parseMessage(child, conversationId)
                }
                trySend(messages)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e(TAG, "Error observing messages", error.toException())
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    fun observeTyping(conversationId: String, otherUserId: String): Flow<Boolean> = callbackFlow {
        val ref = rtdb.reference.child("typing").child(conversationId).child(otherUserId)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val isTyping = snapshot.getValue(Boolean::class.java) ?: false
                trySend(isTyping)
            }

            override fun onCancelled(error: DatabaseError) {
                trySend(false)
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    suspend fun sendMessage(
        conversationId: String,
        senderId: String,
        senderName: String,
        content: String,
        type: MessageType = MessageType.TEXT,
        attachment: MessageAttachment? = null,
        replyTo: ReplyInfo? = null
    ): Result<ChatMessage> {
        return try {
            val messageRef = rtdb.reference.child("messages").child(conversationId).push()
            val messageId = messageRef.key ?: throw Exception("Failed to create message ID")
            val timestamp = System.currentTimeMillis()

            val messageData = mutableMapOf<String, Any?>(
                "id" to messageId,
                "conversationId" to conversationId,
                "senderId" to senderId,
                "senderName" to senderName,
                "content" to content,
                "type" to type.toString(),
                "timestamp" to timestamp,
                "isDeleted" to false,
                "isEdited" to false
            )

            if (attachment != null) {
                messageData["attachment"] = mapOf(
                    "url" to attachment.url,
                    "name" to attachment.name,
                    "size" to attachment.size,
                    "mimeType" to attachment.mimeType,
                    "thumbnailUrl" to attachment.thumbnailUrl,
                    "width" to attachment.width,
                    "height" to attachment.height,
                    "duration" to attachment.duration
                )
            }

            if (replyTo != null) {
                messageData["replyTo"] = mapOf(
                    "messageId" to replyTo.messageId,
                    "senderId" to replyTo.senderId,
                    "senderName" to replyTo.senderName,
                    "content" to replyTo.content,
                    "type" to replyTo.type.toString()
                )
            }

            messageRef.setValue(messageData).await()

            // Update conversation
            val displayContent = when (type) {
                MessageType.IMAGE -> "📷 Image"
                MessageType.FILE, MessageType.DOCUMENT -> "📎 ${attachment?.name ?: "File"}"
                MessageType.AUDIO -> "🎵 Audio"
                MessageType.VIDEO -> "🎥 Video"
                MessageType.CALL -> "📞 Call"
                else -> content
            }

            val convUpdate = mapOf(
                "lastMessage" to displayContent,
                "lastMessageTime" to timestamp,
                "lastMessageSenderId" to senderId,
                "updatedAt" to timestamp
            )
            rtdb.reference.child("conversations").child(conversationId)
                .updateChildren(convUpdate).await()

            // Increment unread count for other participants
            val convSnapshot = rtdb.reference.child("conversations").child(conversationId).get().await()
            val participants = convSnapshot.child("participants").children
                .mapNotNull { it.key }
                .filter { it != senderId }

            participants.forEach { participantId ->
                val currentUnread = convSnapshot.child("unreadCount").child(participantId)
                    .getValue(Int::class.java) ?: 0
                rtdb.reference.child("conversations").child(conversationId)
                    .child("unreadCount").child(participantId)
                    .setValue(currentUnread + 1).await()
            }

            Result.success(ChatMessage(
                id = messageId,
                conversationId = conversationId,
                senderId = senderId,
                senderName = senderName,
                content = content,
                type = type,
                attachment = attachment,
                replyTo = replyTo,
                timestamp = timestamp
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message", e)
            Result.failure(e)
        }
    }

    suspend fun uploadMedia(
        conversationId: String,
        uri: Uri,
        type: MessageType
    ): Result<MessageAttachment> {
        return try {
            val extension = when (type) {
                MessageType.IMAGE -> "jpg"
                MessageType.VIDEO -> "mp4"
                MessageType.AUDIO -> "m4a"
                else -> "file"
            }
            val fileName = "${System.currentTimeMillis()}.$extension"
            val ref = storage.reference
                .child("chat/$conversationId/$fileName")

            ref.putFile(uri).await()
            val url = ref.downloadUrl.await().toString()

            val metadata = ref.metadata.await()
            Result.success(MessageAttachment(
                url = url,
                name = fileName,
                size = metadata.sizeBytes,
                mimeType = metadata.contentType ?: ""
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error uploading media", e)
            Result.failure(e)
        }
    }

    suspend fun setTyping(conversationId: String, userId: String, isTyping: Boolean) {
        try {
            rtdb.reference.child("typing").child(conversationId).child(userId)
                .setValue(isTyping).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error setting typing", e)
        }
    }

    suspend fun markAsRead(conversationId: String, userId: String) {
        try {
            rtdb.reference.child("conversations").child(conversationId)
                .child("unreadCount").child(userId).setValue(0).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error marking as read", e)
        }
    }

    suspend fun deleteMessage(conversationId: String, messageId: String) {
        try {
            rtdb.reference.child("messages").child(conversationId).child(messageId)
                .child("isDeleted").setValue(true).await()
            rtdb.reference.child("messages").child(conversationId).child(messageId)
                .child("content").setValue("This message was deleted").await()
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting message", e)
        }
    }

    suspend fun addReaction(conversationId: String, messageId: String, userId: String, emoji: String) {
        try {
            rtdb.reference.child("messages").child(conversationId).child(messageId)
                .child("reactions").child(userId).setValue(emoji).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error adding reaction", e)
        }
    }

    suspend fun getOrCreateConversation(
        currentUserId: String,
        currentUserName: String,
        currentUserRole: String,
        otherUserId: String,
        otherUserName: String,
        otherUserRole: String,
        companyId: String
    ): String {
        // Check if conversation already exists
        val snapshot = rtdb.reference.child("conversations")
            .orderByChild("participants/$currentUserId").equalTo(true)
            .get().await()

        snapshot.children.forEach { child ->
            val hasOther = child.child("participants").child(otherUserId)
                .getValue(Boolean::class.java) ?: false
            val isGroup = child.child("isGroup").getValue(Boolean::class.java) ?: false
            if (hasOther && !isGroup) {
                return child.key ?: ""
            }
        }

        // Create new conversation
        val convRef = rtdb.reference.child("conversations").push()
        val convId = convRef.key ?: throw Exception("Failed to create conversation")
        val timestamp = System.currentTimeMillis()

        val convData = mapOf(
            "id" to convId,
            "participants" to mapOf(currentUserId to true, otherUserId to true),
            "participantNames" to mapOf(currentUserId to currentUserName, otherUserId to otherUserName),
            "participantRoles" to mapOf(currentUserId to currentUserRole, otherUserId to otherUserRole),
            "lastMessage" to "",
            "lastMessageTime" to timestamp,
            "unreadCount" to mapOf(currentUserId to 0, otherUserId to 0),
            "companyId" to companyId,
            "isGroup" to false,
            "createdAt" to timestamp,
            "updatedAt" to timestamp
        )

        convRef.setValue(convData).await()
        return convId
    }

    private fun parseConversation(snapshot: DataSnapshot): Conversation? {
        return try {
            val id = snapshot.key ?: return null
            val participants = snapshot.child("participants").children
                .mapNotNull { it.key }

            val participantNames = mutableMapOf<String, String>()
            snapshot.child("participantNames").children.forEach {
                participantNames[it.key ?: ""] = it.getValue(String::class.java) ?: ""
            }

            val participantRoles = mutableMapOf<String, String>()
            snapshot.child("participantRoles").children.forEach {
                participantRoles[it.key ?: ""] = it.getValue(String::class.java) ?: ""
            }

            val unreadCount = mutableMapOf<String, Int>()
            snapshot.child("unreadCount").children.forEach {
                unreadCount[it.key ?: ""] = it.getValue(Int::class.java) ?: 0
            }

            Conversation(
                id = id,
                participants = participants,
                participantNames = participantNames,
                participantRoles = participantRoles,
                lastMessage = snapshot.child("lastMessage").getValue(String::class.java) ?: "",
                lastMessageTime = snapshot.child("lastMessageTime").getValue(Long::class.java) ?: 0,
                lastMessageSenderId = snapshot.child("lastMessageSenderId").getValue(String::class.java) ?: "",
                unreadCount = unreadCount,
                companyId = snapshot.child("companyId").getValue(String::class.java) ?: "",
                isGroup = snapshot.child("isGroup").getValue(Boolean::class.java) ?: false,
                groupName = snapshot.child("groupName").getValue(String::class.java) ?: "",
                createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0,
                updatedAt = snapshot.child("updatedAt").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing conversation", e)
            null
        }
    }

    private fun parseMessage(snapshot: DataSnapshot, conversationId: String): ChatMessage? {
        return try {
            val id = snapshot.key ?: return null

            val attachmentNode = snapshot.child("attachment")
            val attachment = if (attachmentNode.exists()) {
                MessageAttachment(
                    url = attachmentNode.child("url").getValue(String::class.java) ?: "",
                    name = attachmentNode.child("name").getValue(String::class.java) ?: "",
                    size = attachmentNode.child("size").getValue(Long::class.java) ?: 0,
                    mimeType = attachmentNode.child("mimeType").getValue(String::class.java) ?: ""
                )
            } else null

            val replyNode = snapshot.child("replyTo")
            val replyTo = if (replyNode.exists()) {
                ReplyInfo(
                    messageId = replyNode.child("messageId").getValue(String::class.java) ?: "",
                    senderId = replyNode.child("senderId").getValue(String::class.java) ?: "",
                    senderName = replyNode.child("senderName").getValue(String::class.java) ?: "",
                    content = replyNode.child("content").getValue(String::class.java) ?: "",
                    type = MessageType.fromString(replyNode.child("type").getValue(String::class.java) ?: "text")
                )
            } else null

            val reactions = mutableMapOf<String, String>()
            snapshot.child("reactions").children.forEach {
                reactions[it.key ?: ""] = it.getValue(String::class.java) ?: ""
            }

            ChatMessage(
                id = id,
                conversationId = conversationId,
                senderId = snapshot.child("senderId").getValue(String::class.java) ?: "",
                senderName = snapshot.child("senderName").getValue(String::class.java) ?: "",
                content = snapshot.child("content").getValue(String::class.java) ?: "",
                type = MessageType.fromString(snapshot.child("type").getValue(String::class.java) ?: "text"),
                attachment = attachment,
                replyTo = replyTo,
                reactions = reactions,
                isDeleted = snapshot.child("isDeleted").getValue(Boolean::class.java) ?: false,
                isEdited = snapshot.child("isEdited").getValue(Boolean::class.java) ?: false,
                timestamp = snapshot.child("timestamp").getValue(Long::class.java) ?: 0
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing message", e)
            null
        }
    }
}
