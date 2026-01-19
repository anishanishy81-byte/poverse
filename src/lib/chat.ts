import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
  getDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { ChatMessage, Conversation, ChatUser } from "@/types/chat";

const CONVERSATIONS_COLLECTION = "conversations";
const MESSAGES_COLLECTION = "messages";
const PRESENCE_COLLECTION = "presence";

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
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (conversationSnap.exists()) {
    return { id: conversationSnap.id, ...conversationSnap.data() } as Conversation;
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

  await setDoc(conversationRef, newConversation);
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
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
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

  const docRef = await addDoc(messagesRef, messageData);

  // Update conversation with last message
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);
  
  if (conversationSnap.exists()) {
    const conversationData = conversationSnap.data();
    const currentUnread = conversationData.unreadCount || {};
    
    await updateDoc(conversationRef, {
      lastMessage: content,
      lastMessageTime: timestamp,
      lastMessageSenderId: senderId,
      updatedAt: timestamp,
      [`unreadCount.${receiverId}`]: (currentUnread[receiverId] || 0) + 1,
    });
  }

  return { id: docRef.id, ...messageData };
};

// Subscribe to messages in a conversation
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });
    callback(messages);
  });
};

// Subscribe to user's conversations
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
) => {
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(
    conversationsRef,
    where("participants", "array-contains", userId)
  );

  return onSnapshot(q, (snapshot) => {
    const conversations: Conversation[] = [];
    snapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() } as Conversation);
    });
    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessageTime || a.createdAt;
      const timeB = b.lastMessageTime || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
    callback(conversations);
  });
};

// Set typing status
export const setTypingStatus = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
) => {
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(conversationRef, {
    [`typing.${userId}`]: isTyping,
  });
};

// Mark messages as read
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
) => {
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(conversationRef, {
    [`unreadCount.${userId}`]: 0,
  });

  // Also mark individual messages as read
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
  const q = query(messagesRef, where("receiverId", "==", userId), where("read", "==", false));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });
  await batch.commit();
};

// Update user presence
export const updatePresence = async (userId: string, isOnline: boolean) => {
  const presenceRef = doc(db, PRESENCE_COLLECTION, userId);
  await setDoc(presenceRef, {
    userId,
    isOnline,
    lastActive: new Date().toISOString(),
  }, { merge: true });
};

// Subscribe to user presence
export const subscribeToPresence = (
  userIds: string[],
  callback: (presence: { [userId: string]: { isOnline: boolean; lastActive: string } }) => void
) => {
  if (userIds.length === 0) {
    callback({});
    return () => {};
  }

  const presenceRef = collection(db, PRESENCE_COLLECTION);
  const q = query(presenceRef, where("userId", "in", userIds.slice(0, 10))); // Firestore limit

  return onSnapshot(q, (snapshot) => {
    const presence: { [userId: string]: { isOnline: boolean; lastActive: string } } = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      presence[data.userId] = {
        isOnline: data.isOnline,
        lastActive: data.lastActive,
      };
    });
    callback(presence);
  });
};

// Get users that current user can chat with
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
