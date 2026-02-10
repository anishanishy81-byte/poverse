import { db, realtimeDb, storage } from "./firebase";
import {
  ref,
  set,
  push,
  get,
  update,
  onValue,
  query as rtdbQuery,
  orderByChild,
  onDisconnect,
  off,
  remove,
  DataSnapshot,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ChatMessage, Conversation, ChatUser, MessageType, MessageAttachment, MessageReply, CallRecord } from "@/types/chat";
import { notifyNewMessage } from "./notifications";

// Realtime Database paths
const CONVERSATIONS_PATH = "conversations";
const MESSAGES_PATH = "messages";
const PRESENCE_PATH = "presence";
const TYPING_PATH = "typing";

// Export presence data type
export interface PresenceData {
  userId: string;
  isOnline: boolean;
  lastActive: string;
}

// Generate conversation ID from two user IDs (sorted to ensure consistency)
export const getConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("_");
};

// Create or get existing conversation
export const getOrCreateConversation = async (
  user1: ChatUser,
  user2: ChatUser,
  companyId?: string
): Promise<Conversation> => {
  const conversationId = getConversationId(user1.id, user2.id);
  const conversationRef = ref(realtimeDb, `${CONVERSATIONS_PATH}/${conversationId}`);
  
  const snapshot = await get(conversationRef);
  
  if (snapshot.exists()) {
    return { id: conversationId, ...snapshot.val() } as Conversation;
  }

  const newConversation: Omit<Conversation, "id"> = {
    participants: [user1.id, user2.id],
    participantNames: {
      [user1.id]: user1.name,
      [user2.id]: user2.name,
    },
    participantRoles: {
      [user1.id]: user1.role,
      [user2.id]: user2.role,
    },
    companyId: companyId || user1.companyId || user2.companyId,
    unreadCount: {
      [user1.id]: 0,
      [user2.id]: 0,
    },
    typing: {
      [user1.id]: false,
      [user2.id]: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await set(conversationRef, newConversation);
  return { id: conversationId, ...newConversation };
};

// Upload file for chat
export const uploadChatFile = async (
  conversationId: string,
  file: File,
  type: "image" | "audio" | "video" | "document"
): Promise<{ url: string; name: string; size: number; mimeType: string }> => {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const filePath = `chat/${conversationId}/${type}/${fileName}`;
  const fileRef = storageRef(storage, filePath);
  
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  
  return {
    url,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
};

// Send a message with optional attachment and reply
export interface SendMessageOptions {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "superadmin" | "admin" | "user";
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  content: string;
  type?: MessageType;
  attachment?: MessageAttachment;
  replyTo?: MessageReply;
  callRecord?: CallRecord;
}

export const sendMessageAdvanced = async (options: SendMessageOptions): Promise<ChatMessage> => {
  const messagesRef = ref(realtimeDb, `${MESSAGES_PATH}/${options.conversationId}`);
  const newMessageRef = push(messagesRef);
  const timestamp = new Date().toISOString();

  // Build message data, only including defined values (Firebase doesn't accept undefined)
  const messageData: Record<string, unknown> = {
    senderId: options.senderId,
    senderName: options.senderName,
    senderRole: options.senderRole,
    receiverId: options.receiverId,
    receiverName: options.receiverName,
    conversationId: options.conversationId,
    content: options.content,
    type: options.type || "text",
    timestamp,
    read: false,
  };

  // Only add optional fields if they have values
  if (options.senderAvatar) messageData.senderAvatar = options.senderAvatar;
  if (options.attachment) {
    // Sanitize attachment to remove undefined values (Firebase doesn't accept them)
    const sanitizedAttachment: Record<string, unknown> = {
      type: options.attachment.type,
      url: options.attachment.url,
      name: options.attachment.name,
    };
    if (options.attachment.size !== undefined) sanitizedAttachment.size = options.attachment.size;
    if (options.attachment.mimeType) sanitizedAttachment.mimeType = options.attachment.mimeType;
    if (options.attachment.duration !== undefined) sanitizedAttachment.duration = options.attachment.duration;
    if (options.attachment.thumbnail) sanitizedAttachment.thumbnail = options.attachment.thumbnail;
    messageData.attachment = sanitizedAttachment;
  }
  if (options.replyTo) {
    // Sanitize replyTo to remove undefined values (Firebase doesn't accept them)
    const sanitizedReplyTo: Record<string, unknown> = {
      messageId: options.replyTo.messageId,
      senderId: options.replyTo.senderId,
      senderName: options.replyTo.senderName,
      content: options.replyTo.content,
    };
    if (options.replyTo.type) sanitizedReplyTo.type = options.replyTo.type;
    messageData.replyTo = sanitizedReplyTo;
  }
  if (options.callRecord) {
    // Sanitize callRecord to remove undefined values
    const sanitizedCallRecord: Record<string, unknown> = {
      type: options.callRecord.type,
      status: options.callRecord.status,
      callerId: options.callRecord.callerId,
      callerName: options.callRecord.callerName,
      receiverId: options.callRecord.receiverId,
      receiverName: options.callRecord.receiverName,
      startedAt: options.callRecord.startedAt,
    };
    if (options.callRecord.duration !== undefined) sanitizedCallRecord.duration = options.callRecord.duration;
    if (options.callRecord.endedAt) sanitizedCallRecord.endedAt = options.callRecord.endedAt;
    messageData.callRecord = sanitizedCallRecord;
  }

  await set(newMessageRef, messageData);

  // Update conversation with last message
  const conversationRef = ref(realtimeDb, `${CONVERSATIONS_PATH}/${options.conversationId}`);
  const conversationSnapshot = await get(conversationRef);
  
  if (conversationSnapshot.exists()) {
    const conversationData = conversationSnapshot.val();
    const currentUnread = conversationData.unreadCount || {};
    
    // Create display text for last message
    let lastMessageDisplay = options.content;
    if (options.type === "image") lastMessageDisplay = "📷 Photo";
    else if (options.type === "audio") lastMessageDisplay = "🎵 Voice message";
    else if (options.type === "video") lastMessageDisplay = "🎬 Video";
    else if (options.type === "document" || options.type === "file") lastMessageDisplay = "📎 " + (options.attachment?.name || "Document");
    else if (options.type === "call" && options.callRecord) {
      const callIcon = options.callRecord.type === "video" ? "📹" : "📞";
      const statusText = options.callRecord.status === "missed" ? "Missed" : 
                         options.callRecord.status === "declined" ? "Declined" :
                         options.callRecord.duration ? `${Math.floor(options.callRecord.duration / 60)}:${(options.callRecord.duration % 60).toString().padStart(2, "0")}` : "Ended";
      lastMessageDisplay = `${callIcon} ${options.callRecord.type === "video" ? "Video" : "Voice"} call - ${statusText}`;
    }
    
    await update(conversationRef, {
      lastMessage: lastMessageDisplay,
      lastMessageTime: timestamp,
      lastMessageSenderId: options.senderId,
      lastMessageType: options.type || "text",
      updatedAt: timestamp,
      [`unreadCount/${options.receiverId}`]: (currentUnread[options.receiverId] || 0) + 1,
    });
    
    // Send push notification
    try {
      const companyId = conversationData.companyId;
      if (companyId) {
        await notifyNewMessage(
          companyId,
          options.receiverId,
          options.senderId,
          options.senderName,
          options.senderAvatar,
          lastMessageDisplay,
          options.conversationId,
          conversationData.title
        );
      }
    } catch (error) {
      console.error("Failed to send message notification:", error);
    }
  }

  return { id: newMessageRef.key!, ...messageData } as ChatMessage;
};

// Save call record to chat
export const saveCallRecordToChat = async (
  callRecord: CallRecord,
  senderRole: "superadmin" | "admin" | "user" = "user"
): Promise<ChatMessage> => {
  const conversationId = getConversationId(callRecord.callerId, callRecord.receiverId);
  
  // Generate content based on call status
  let content = "";
  if (callRecord.status === "missed") {
    content = `Missed ${callRecord.type} call`;
  } else if (callRecord.status === "declined") {
    content = `${callRecord.type === "video" ? "Video" : "Voice"} call declined`;
  } else if (callRecord.status === "completed" && callRecord.duration) {
    const mins = Math.floor(callRecord.duration / 60);
    const secs = callRecord.duration % 60;
    content = `${callRecord.type === "video" ? "Video" : "Voice"} call - ${mins}:${secs.toString().padStart(2, "0")}`;
  } else {
    content = `${callRecord.type === "video" ? "Video" : "Voice"} call ended`;
  }

  return sendMessageAdvanced({
    conversationId,
    senderId: callRecord.callerId,
    senderName: callRecord.callerName,
    senderRole,
    receiverId: callRecord.receiverId,
    receiverName: callRecord.receiverName,
    content,
    type: "call",
    callRecord,
  });
};

// Legacy send message function (for backward compatibility)
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: "superadmin" | "admin" | "user",
  receiverId: string,
  receiverName: string,
  content: string
): Promise<ChatMessage> => {
  return sendMessageAdvanced({
    conversationId,
    senderId,
    senderName,
    senderRole,
    receiverId,
    receiverName,
    content,
    type: "text",
  });
};

// Delete a message
export const deleteMessage = async (
  conversationId: string,
  messageId: string
): Promise<void> => {
  const messageRef = ref(realtimeDb, `${MESSAGES_PATH}/${conversationId}/${messageId}`);
  const snapshot = await get(messageRef);
  
  if (snapshot.exists()) {
    await update(messageRef, {
      deleted: true,
      content: "This message was deleted",
      attachment: null,
    });
  }
};

// Add reaction to message
export const addReaction = async (
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  const messageRef = ref(realtimeDb, `${MESSAGES_PATH}/${conversationId}/${messageId}/reactions/${userId}`);
  await set(messageRef, emoji);
};

// Remove reaction from message
export const removeReaction = async (
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  const messageRef = ref(realtimeDb, `${MESSAGES_PATH}/${conversationId}/${messageId}/reactions/${userId}`);
  await remove(messageRef);
};

// Subscribe to messages in a conversation
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const messagesRef = ref(realtimeDb, `${MESSAGES_PATH}/${conversationId}`);
  const messagesQuery = rtdbQuery(messagesRef, orderByChild("timestamp"));

  const unsubscribe = onValue(messagesQuery, (snapshot: DataSnapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key!,
        ...childSnapshot.val(),
      } as ChatMessage);
    });
    callback(messages);
  });

  return () => off(messagesRef);
};

// Subscribe to user's conversations
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  const conversationsRef = ref(realtimeDb, CONVERSATIONS_PATH);

  const unsubscribe = onValue(conversationsRef, (snapshot: DataSnapshot) => {
    const conversations: Conversation[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      // Filter conversations that include this user
      if (data.participants && data.participants.includes(userId)) {
        conversations.push({
          id: childSnapshot.key!,
          ...data,
        } as Conversation);
      }
    });
    
    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessageTime || a.createdAt;
      const timeB = b.lastMessageTime || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
    
    callback(conversations);
  });

  return () => off(conversationsRef);
};

// Set typing status
export const setTypingStatus = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
) => {
  const typingRef = ref(realtimeDb, `${TYPING_PATH}/${conversationId}/${userId}`);
  await set(typingRef, {
    isTyping,
    timestamp: new Date().toISOString(),
  });
  
  // Auto-remove typing status after 5 seconds of inactivity
  if (isTyping) {
    setTimeout(async () => {
      await set(typingRef, {
        isTyping: false,
        timestamp: new Date().toISOString(),
      });
    }, 5000);
  }
};

// Subscribe to typing status
export const subscribeToTyping = (
  conversationId: string,
  callback: (typing: { [userId: string]: boolean }) => void
) => {
  const typingRef = ref(realtimeDb, `${TYPING_PATH}/${conversationId}`);

  const unsubscribe = onValue(typingRef, (snapshot: DataSnapshot) => {
    const typing: { [userId: string]: boolean } = {};
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      typing[childSnapshot.key!] = data.isTyping || false;
    });
    
    callback(typing);
  });

  return () => off(typingRef);
};

// Mark messages as read
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
) => {
  // Reset unread count for this user
  const conversationRef = ref(realtimeDb, `${CONVERSATIONS_PATH}/${conversationId}`);
  await update(conversationRef, {
    [`unreadCount/${userId}`]: 0,
  });

  // Mark individual messages as read
  const messagesRef = ref(realtimeDb, `${MESSAGES_PATH}/${conversationId}`);
  const snapshot = await get(messagesRef);
  
  if (snapshot.exists()) {
    const updates: { [key: string]: boolean } = {};
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.receiverId === userId && !message.read) {
        updates[`${MESSAGES_PATH}/${conversationId}/${childSnapshot.key}/read`] = true;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await update(ref(realtimeDb), updates);
    }
  }
};

// Update user presence (using Realtime Database for better real-time capabilities)
export const updatePresence = async (userId: string, isOnline: boolean) => {
  const presenceRef = ref(realtimeDb, `${PRESENCE_PATH}/${userId}`);
  
  await set(presenceRef, {
    userId,
    isOnline,
    lastActive: new Date().toISOString(),
  });

  // Set up disconnect handler to mark user as offline when they disconnect
  if (isOnline) {
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      userId,
      isOnline: false,
      lastActive: new Date().toISOString(),
    });
  }
};

// Subscribe to user presence
export const subscribeToPresence = (
  userIds: string | string[],
  callback: (presence: { [userId: string]: { isOnline: boolean; lastActive: string } }) => void
) => {
  // Handle single user ID or array
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  
  if (ids.length === 0) {
    callback({});
    return () => {};
  }

  const presenceRef = ref(realtimeDb, PRESENCE_PATH);
  
  const unsubscribe = onValue(presenceRef, (snapshot: DataSnapshot) => {
    const presence: { [userId: string]: { isOnline: boolean; lastActive: string } } = {};
    
    snapshot.forEach((childSnapshot) => {
      const oderId = childSnapshot.key!;
      if (ids.includes(oderId)) {
        const data = childSnapshot.val();
        presence[oderId] = {
          isOnline: data.isOnline || false,
          lastActive: data.lastActive || new Date().toISOString(),
        };
      }
    });
    
    callback(presence);
  });

  return () => off(presenceRef);
};

// Subscribe to single user presence (for admin maps)
export const subscribeToSingleUserPresence = (
  userId: string,
  callback: (presence: PresenceData) => void
): (() => void) => {
  const presenceRef = ref(realtimeDb, `${PRESENCE_PATH}/${userId}`);
  
  onValue(presenceRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as PresenceData);
    } else {
      callback({
        userId,
        isOnline: false,
        lastActive: new Date().toISOString(),
      });
    }
  });

  return () => off(presenceRef);
};

// Get users that current user can chat with (still uses Firestore for user data)
export const getChatableUsers = async (
  currentUser: ChatUser
): Promise<ChatUser[]> => {
  const usersRef = collection(db, "users");
  let users: ChatUser[] = [];

  if (currentUser.role === "superadmin") {
    // SuperAdmin can chat with everyone
    const snapshot = await getDocs(usersRef);
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (doc.id !== currentUser.id && data.isActive) {
        users.push({
          id: doc.id,
          name: data.name,
          username: data.username,
          role: data.role,
          companyId: data.companyId,
        });
      }
    });
  } else if (currentUser.role === "admin") {
    // Admin can chat with users in their company + superadmin
    const companyQuery = query(usersRef, where("companyId", "==", currentUser.companyId));
    const companySnapshot = await getDocs(companyQuery);
    companySnapshot.forEach((doc) => {
      const data = doc.data();
      if (doc.id !== currentUser.id && data.isActive) {
        users.push({
          id: doc.id,
          name: data.name,
          username: data.username,
          role: data.role,
          companyId: data.companyId,
        });
      }
    });

    // Add superadmin
    const superadminQuery = query(usersRef, where("role", "==", "superadmin"));
    const superadminSnapshot = await getDocs(superadminQuery);
    superadminSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isActive) {
        users.push({
          id: doc.id,
          name: data.name,
          username: data.username,
          role: data.role,
        });
      }
    });
  } else {
    // User can chat with admin and other users in their company
    const companyQuery = query(usersRef, where("companyId", "==", currentUser.companyId));
    const companySnapshot = await getDocs(companyQuery);
    companySnapshot.forEach((doc) => {
      const data = doc.data();
      if (doc.id !== currentUser.id && data.isActive) {
        users.push({
          id: doc.id,
          name: data.name,
          username: data.username,
          role: data.role,
          companyId: data.companyId,
        });
      }
    });
  }

  return users;
};
