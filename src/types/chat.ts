// Chat types for real-time messaging

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "superadmin" | "admin" | "user";
  receiverId: string;
  receiverName: string;
  conversationId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantRoles: { [userId: string]: string };
  companyId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: string;
  unreadCount?: { [userId: string]: number };
  typing?: { [userId: string]: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  oduserId: string;
  isOnline: boolean;
  lastActive: string;
  typing?: {
    conversationId: string;
    isTyping: boolean;
  };
}

export interface ChatUser {
  id: string;
  name: string;
  username: string;
  role: "superadmin" | "admin" | "user";
  companyId?: string;
  companyName?: string;
  isOnline?: boolean;
  lastActive?: string;
}
