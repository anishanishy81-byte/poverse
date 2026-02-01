import { db, realtimeDb } from "./firebase";
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
  DataSnapshot,
} from "firebase/database";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ChatMessage, Conversation, ChatUser } from "@/types/chat";
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

// Send a message
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: "superadmin" | "admin" | "user",
  receiverId: string,
  receiverName: string,
  content: string
): Promise<ChatMessage> => {
  const messagesRef = ref(realtimeDb, `${MESSAGES_PATH}/${conversationId}`);
  const newMessageRef = push(messagesRef);
  const timestamp = new Date().toISOString();

  const messageData = {
    senderId,
    senderName,
    senderRole,
    receiverId,
    receiverName,
    conversationId,
    content,
    timestamp,
    read: false,
  };

  await set(newMessageRef, messageData);

  // Update conversation with last message
  const conversationRef = ref(realtimeDb, `${CONVERSATIONS_PATH}/${conversationId}`);
  const conversationSnapshot = await get(conversationRef);
  
  if (conversationSnapshot.exists()) {
    const conversationData = conversationSnapshot.val();
    const currentUnread = conversationData.unreadCount || {};
    
    await update(conversationRef, {
      lastMessage: content,
      lastMessageTime: timestamp,
      lastMessageSenderId: senderId,
      updatedAt: timestamp,
      [`unreadCount/${receiverId}`]: (currentUnread[receiverId] || 0) + 1,
    });
    
    // Send push notification to receiver
    try {
      const companyId = conversationData.companyId;
      if (companyId) {
        await notifyNewMessage(
          companyId,
          receiverId,
          senderId,
          senderName,
          undefined, // senderAvatar
          content,
          conversationId,
          conversationData.title
        );
      }
    } catch (error) {
      console.error("Failed to send message notification:", error);
    }
  }

  return { id: newMessageRef.key!, ...messageData };
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
