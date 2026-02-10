// Story Types - Instagram-like stories that disappear after 24 hours

export type StoryType = "image" | "video" | "text";

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  companyId: string;
  type: StoryType;
  
  // Media content
  mediaUrl?: string;      // URL for image/video
  thumbnailUrl?: string;  // Thumbnail for video
  
  // Text content (for text type or overlay)
  text?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: "small" | "medium" | "large";
  textPosition?: "top" | "center" | "bottom";
  
  // Caption (can be used with all types)
  caption?: string;
  
  // Location (optional)
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    placeName?: string;
  };
  
  // Target related (if story is about a target visit)
  targetId?: string;
  targetName?: string;
  visitId?: string;
  
  // Visibility
  isPublic: boolean;      // Visible to all company members
  visibleTo?: string[];   // Specific user IDs (if not public)
  
  // Engagement
  viewCount: number;
  viewedBy: string[];     // Array of user IDs who viewed
  reactions?: {
    [key: string]: string[]; // emoji: [userId1, userId2, ...]
  };
  
  // Metadata
  createdAt: string;
  expiresAt: string;      // 24 hours from createdAt
  isActive: boolean;
  
  // For admins
  isPinned?: boolean;     // Pinned stories stay longer
  pinnedUntil?: string;   // Extended expiry for pinned
}

// Group of stories by user
export interface StoryGroup {
  userId: string;
  userName: string;
  userProfilePicture?: string;
  stories: Story[];
  hasUnviewed: boolean;   // Has stories not viewed by current user
  latestStoryTime: string;
}

// Story viewer info
export interface StoryViewer {
  userId: string;
  userName: string;
  userProfilePicture?: string;
  viewedAt: string;
  reaction?: string;
}

// Create story input
export interface CreateStoryInput {
  type: StoryType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: "small" | "medium" | "large";
  textPosition?: "top" | "center" | "bottom";
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    placeName?: string;
  };
  targetId?: string;
  targetName?: string;
  visitId?: string;
  isPublic?: boolean;
  visibleTo?: string[];
}

// Story Comment
export interface StoryComment {
  id: string;
  storyId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  text: string;
  mentions?: string[]; // Array of mentioned user IDs
  createdAt: string;
  likes?: string[]; // User IDs who liked the comment
  replies?: StoryReply[];
}

// Story Reply (nested under comments)
export interface StoryReply {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  text: string;
  mentions?: string[]; // Array of mentioned user IDs
  createdAt: string;
  likes?: string[]; // User IDs who liked the reply
}

// Mention tag for user tagging
export interface StoryMention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

// Story reactions available
export const STORY_REACTIONS = ["👍", "❤️", "🔥", "👏", "😮", "🎉"];

// Story backgrounds for text stories
export const STORY_BACKGROUNDS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)",
  "#1a1a1a",
  "#2196f3",
  "#4caf50",
  "#f44336",
];
