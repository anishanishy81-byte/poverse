// Chat types for real-time messaging

export type MessageType = "text" | "image" | "file" | "audio" | "video" | "document" | "call";

// Call record for chat messages
export interface CallRecord {
  type: "voice" | "video";
  status: "missed" | "declined" | "completed";
  duration?: number; // in seconds
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  startedAt: string;
  endedAt?: string;
}

export interface MessageReply {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  type?: MessageType;
}

export interface MessageAttachment {
  type: "image" | "file" | "audio" | "video" | "document";
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  duration?: number; // For audio/video in seconds
  thumbnail?: string; // For video
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "superadmin" | "admin" | "user";
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  conversationId: string;
  content: string;
  type?: MessageType;
  attachment?: MessageAttachment;
  replyTo?: MessageReply;
  callRecord?: CallRecord;
  timestamp: string;
  read: boolean;
  reactions?: { [userId: string]: string }; // emoji reactions
  deleted?: boolean;
  edited?: boolean;
  editedAt?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantRoles: { [userId: string]: string };
  participantAvatars?: { [userId: string]: string };
  companyId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: string;
  lastMessageType?: MessageType;
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
  profilePicture?: string;
  isOnline?: boolean;
  lastActive?: string;
}
