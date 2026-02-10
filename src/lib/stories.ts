// Stories Library - Instagram-like stories that disappear after 24 hours
import { realtimeDb, storage } from "./firebase";
import {
  ref,
  set,
  push,
  get,
  update,
  onValue,
  off,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  remove,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  Story,
  StoryGroup,
  StoryViewer,
  CreateStoryInput,
  StoryComment,
  StoryReply,
} from "@/types/story";

// Firebase paths
const STORIES_PATH = "stories";
const STORY_VIEWS_PATH = "storyViews";
const STORY_COMMENTS_PATH = "storyComments";

// Default story duration (24 hours)
const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

// ==================== CREATE & MANAGE STORIES ====================

export const createStory = async (
  userId: string,
  userName: string,
  companyId: string,
  input: CreateStoryInput,
  userProfilePicture?: string
): Promise<Story> => {
  console.log(`[Stories] Creating story for user ${userId} in company ${companyId}`);
  
  const storiesRef = ref(realtimeDb, STORIES_PATH);
  const newStoryRef = push(storiesRef);
  const storyId = newStoryRef.key!;
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + STORY_DURATION_MS).toISOString();

  // Build story object without undefined values
  const story: Record<string, unknown> = {
    id: storyId,
    userId,
    userName,
    companyId,
    type: input.type,
    isPublic: input.isPublic !== false, // Default to public
    viewCount: 0,
    viewedBy: [],
    createdAt,
    expiresAt,
    isActive: true,
  };

  // Add optional fields
  if (userProfilePicture) story.userProfilePicture = userProfilePicture;
  if (input.mediaUrl) story.mediaUrl = input.mediaUrl;
  if (input.thumbnailUrl) story.thumbnailUrl = input.thumbnailUrl;
  if (input.text) story.text = input.text;
  if (input.textColor) story.textColor = input.textColor;
  if (input.backgroundColor) story.backgroundColor = input.backgroundColor;
  if (input.fontSize) story.fontSize = input.fontSize;
  if (input.textPosition) story.textPosition = input.textPosition;
  if (input.caption) story.caption = input.caption;
  if (input.location) story.location = input.location;
  if (input.targetId) story.targetId = input.targetId;
  if (input.targetName) story.targetName = input.targetName;
  if (input.visitId) story.visitId = input.visitId;
  if (input.visibleTo && input.visibleTo.length > 0) story.visibleTo = input.visibleTo;

  await set(newStoryRef, story);
  return story as unknown as Story;
};

export const uploadStoryMedia = async (
  userId: string,
  file: File
): Promise<{ url: string; thumbnailUrl?: string }> => {
  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `stories/${userId}/${timestamp}.${fileExt}`;
  const fileRef = storageRef(storage, fileName);

  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  return { url };
};

export const deleteStory = async (storyId: string): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (snapshot.exists()) {
    const story = snapshot.val() as Story;

    // Delete media if exists
    if (story.mediaUrl && story.mediaUrl.includes("firebasestorage")) {
      try {
        const mediaRef = storageRef(storage, story.mediaUrl);
        await deleteObject(mediaRef);
      } catch (error) {
        console.error("Error deleting story media:", error);
      }
    }

    await remove(storyRef);
  }
};

export const getStory = async (storyId: string): Promise<Story | null> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);
  return snapshot.exists() ? (snapshot.val() as Story) : null;
};

// ==================== VIEWING STORIES ====================

export const markStoryAsViewed = async (
  storyId: string,
  userId: string,
  userName: string,
  userProfilePicture?: string
): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (!snapshot.exists()) return;

  const story = snapshot.val() as Story;
  const viewedBy = story.viewedBy || [];

  // Only add view if not already viewed
  if (!viewedBy.includes(userId)) {
    viewedBy.push(userId);

    await update(storyRef, {
      viewedBy,
      viewCount: (story.viewCount || 0) + 1,
    });

    // Store detailed view info
    const viewRef = ref(realtimeDb, `${STORY_VIEWS_PATH}/${storyId}/${userId}`);
    const viewData: Record<string, unknown> = {
      userId,
      userName,
      viewedAt: new Date().toISOString(),
    };
    if (userProfilePicture) viewData.userProfilePicture = userProfilePicture;
    await set(viewRef, viewData);
  }
};

export const addStoryReaction = async (
  storyId: string,
  userId: string,
  reaction: string
): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (!snapshot.exists()) return;

  const story = snapshot.val() as Story;
  const reactions = story.reactions || {};

  // Remove user from all reactions first
  Object.keys(reactions).forEach((emoji) => {
    reactions[emoji] = reactions[emoji].filter((uid: string) => uid !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  });

  // Add new reaction
  if (!reactions[reaction]) {
    reactions[reaction] = [];
  }
  reactions[reaction].push(userId);

  await update(storyRef, { reactions });
};

export const removeStoryReaction = async (
  storyId: string,
  userId: string
): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (!snapshot.exists()) return;

  const story = snapshot.val() as Story;
  const reactions = story.reactions || {};

  // Remove user from all reactions
  Object.keys(reactions).forEach((emoji) => {
    reactions[emoji] = reactions[emoji].filter((uid: string) => uid !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  });

  await update(storyRef, { reactions });
};

export const getStoryViewers = async (storyId: string): Promise<StoryViewer[]> => {
  const viewsRef = ref(realtimeDb, `${STORY_VIEWS_PATH}/${storyId}`);
  const snapshot = await get(viewsRef);

  if (!snapshot.exists()) return [];

  const viewers: StoryViewer[] = [];
  snapshot.forEach((child) => {
    viewers.push(child.val() as StoryViewer);
  });

  return viewers.sort(
    (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
  );
};

// ==================== FETCHING STORIES ====================

export const getActiveCompanyStories = async (
  companyId: string,
  currentUserId: string
): Promise<StoryGroup[]> => {
  const storiesRef = ref(realtimeDb, STORIES_PATH);
  const snapshot = await get(storiesRef);

  if (!snapshot.exists()) return [];

  const now = new Date();
  const storyMap = new Map<string, Story[]>();

  snapshot.forEach((child) => {
    const story = child.val() as Story;

    // Filter: same company, active, not expired
    if (
      story.companyId === companyId &&
      story.isActive &&
      new Date(story.expiresAt) > now
    ) {
      // Check visibility
      if (
        story.isPublic ||
        story.userId === currentUserId ||
        (story.visibleTo && story.visibleTo.includes(currentUserId))
      ) {
        const existing = storyMap.get(story.userId) || [];
        existing.push(story);
        storyMap.set(story.userId, existing);
      }
    }
  });

  // Convert to story groups
  const groups: StoryGroup[] = [];
  storyMap.forEach((stories, userId) => {
    // Sort stories by creation time
    stories.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const latestStory = stories[stories.length - 1];
    const hasUnviewed = stories.some(
      (s) => !s.viewedBy?.includes(currentUserId)
    );

    groups.push({
      userId,
      userName: stories[0].userName,
      userProfilePicture: stories[0].userProfilePicture,
      stories,
      hasUnviewed,
      latestStoryTime: latestStory.createdAt,
    });
  });

  // Sort groups: unviewed first, then by latest story time
  groups.sort((a, b) => {
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return (
      new Date(b.latestStoryTime).getTime() -
      new Date(a.latestStoryTime).getTime()
    );
  });

  return groups;
};

export const getUserStories = async (
  userId: string
): Promise<Story[]> => {
  const storiesRef = ref(realtimeDb, STORIES_PATH);
  const snapshot = await get(storiesRef);

  if (!snapshot.exists()) return [];

  const now = new Date();
  const stories: Story[] = [];

  snapshot.forEach((child) => {
    const story = child.val() as Story;
    if (
      story.userId === userId &&
      story.isActive &&
      new Date(story.expiresAt) > now
    ) {
      stories.push(story);
    }
  });

  return stories.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

// Subscribe to company stories in real-time
export const subscribeToCompanyStories = (
  companyId: string,
  currentUserId: string,
  callback: (groups: StoryGroup[]) => void
): (() => void) => {
  const storiesRef = ref(realtimeDb, STORIES_PATH);

  const unsubscribe = onValue(storiesRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.log("[Stories] No stories found in database");
      callback([]);
      return;
    }

    const now = new Date();
    const storyMap = new Map<string, Story[]>();
    let totalStories = 0;
    let matchingStories = 0;

    snapshot.forEach((child) => {
      const story = child.val() as Story;
      totalStories++;

      // Debug: log each story's companyId
      const companyMatch = story.companyId === companyId;
      const isActive = story.isActive;
      const notExpired = new Date(story.expiresAt) > now;

      if (companyMatch && isActive && notExpired) {
        if (
          story.isPublic ||
          story.userId === currentUserId ||
          (story.visibleTo && story.visibleTo.includes(currentUserId))
        ) {
          matchingStories++;
          const existing = storyMap.get(story.userId) || [];
          existing.push(story);
          storyMap.set(story.userId, existing);
        }
      }
    });

    console.log(`[Stories] Found ${totalStories} total, ${matchingStories} matching for company ${companyId}`);

    const groups: StoryGroup[] = [];
    storyMap.forEach((stories, userId) => {
      stories.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const latestStory = stories[stories.length - 1];
      const hasUnviewed = stories.some(
        (s) => !s.viewedBy?.includes(currentUserId)
      );

      groups.push({
        userId,
        userName: stories[0].userName,
        userProfilePicture: stories[0].userProfilePicture,
        stories,
        hasUnviewed,
        latestStoryTime: latestStory.createdAt,
      });
    });

    groups.sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return (
        new Date(b.latestStoryTime).getTime() -
        new Date(a.latestStoryTime).getTime()
      );
    });

    callback(groups);
  });

  return () => off(storiesRef);
};

// ==================== ADMIN FUNCTIONS ====================

export const pinStory = async (
  storyId: string,
  hours: number = 48
): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const now = new Date();
  const pinnedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

  await update(storyRef, {
    isPinned: true,
    pinnedUntil,
    expiresAt: pinnedUntil,
  });
};

export const unpinStory = async (storyId: string): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  await update(storyRef, {
    isPinned: false,
    pinnedUntil: null,
  });
};

// ==================== CLEANUP ====================

export const cleanupExpiredStories = async (): Promise<number> => {
  const storiesRef = ref(realtimeDb, STORIES_PATH);
  const snapshot = await get(storiesRef);

  if (!snapshot.exists()) return 0;

  const now = new Date();
  let deletedCount = 0;

  const deletePromises: Promise<void>[] = [];

  snapshot.forEach((child) => {
    const story = child.val() as Story;
    if (new Date(story.expiresAt) < now && !story.isPinned) {
      deletePromises.push(deleteStory(story.id));
      deletedCount++;
    }
  });

  await Promise.all(deletePromises);
  return deletedCount;
};

// ==================== HELPER FUNCTIONS ====================

export const formatStoryTime = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return created.toLocaleDateString();
};

export const getTimeUntilExpiry = (expiresAt: string): string => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);

  if (diffHours > 0) return `${diffHours}h ${diffMins}m left`;
  return `${diffMins}m left`;
};

// ==================== COMMENTS & REPLIES ====================

// Add a comment to a story
export const addStoryComment = async (
  storyId: string,
  userId: string,
  userName: string,
  text: string,
  userProfilePicture?: string,
  mentions?: string[]
): Promise<StoryComment> => {
  console.log("[Stories] addStoryComment called:", { storyId, userId, userName, text });
  
  const commentsRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}`);
  const newCommentRef = push(commentsRef);
  const commentId = newCommentRef.key!;
  const now = new Date().toISOString();

  const comment: Record<string, unknown> = {
    id: commentId,
    storyId,
    userId,
    userName,
    text,
    createdAt: now,
    likes: [],
    replies: [],
  };

  if (userProfilePicture) comment.userProfilePicture = userProfilePicture;
  if (mentions && mentions.length > 0) comment.mentions = mentions;

  console.log("[Stories] Saving comment to path:", `${STORY_COMMENTS_PATH}/${storyId}/${commentId}`);
  
  try {
    await set(newCommentRef, comment);
    console.log("[Stories] Comment saved successfully");
  } catch (error) {
    console.error("[Stories] Failed to save comment:", error);
    throw error;
  }
  
  // Update comment count on story
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const storySnapshot = await get(storyRef);
  if (storySnapshot.exists()) {
    const story = storySnapshot.val() as Story & { commentCount?: number };
    await update(storyRef, { commentCount: (story.commentCount || 0) + 1 });
  }

  return comment as unknown as StoryComment;
};

// Add a reply to a comment
export const addStoryReply = async (
  storyId: string,
  commentId: string,
  userId: string,
  userName: string,
  text: string,
  userProfilePicture?: string,
  mentions?: string[]
): Promise<StoryReply> => {
  const commentRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}/${commentId}`);
  const commentSnapshot = await get(commentRef);

  if (!commentSnapshot.exists()) {
    throw new Error("Comment not found");
  }

  const comment = commentSnapshot.val() as StoryComment;
  const replies = comment.replies || [];
  const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const reply: Record<string, unknown> = {
    id: replyId,
    commentId,
    userId,
    userName,
    text,
    createdAt: now,
    likes: [],
  };

  if (userProfilePicture) reply.userProfilePicture = userProfilePicture;
  if (mentions && mentions.length > 0) reply.mentions = mentions;

  replies.push(reply as unknown as StoryReply);
  await update(commentRef, { replies });

  return reply as unknown as StoryReply;
};

// Get comments for a story
export const getStoryComments = async (storyId: string): Promise<StoryComment[]> => {
  const commentsRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}`);
  const snapshot = await get(commentsRef);

  if (!snapshot.exists()) return [];

  const comments: StoryComment[] = [];
  snapshot.forEach((child) => {
    comments.push(child.val() as StoryComment);
  });

  return comments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Subscribe to story comments in real-time
export const subscribeToStoryComments = (
  storyId: string,
  callback: (comments: StoryComment[]) => void
): (() => void) => {
  console.log("[Stories] Subscribing to comments for story:", storyId);
  const commentsRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}`);

  const unsubscribe = onValue(commentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.log("[Stories] No comments found for story:", storyId);
      callback([]);
      return;
    }

    const comments: StoryComment[] = [];
    snapshot.forEach((child) => {
      comments.push(child.val() as StoryComment);
    });

    console.log("[Stories] Found", comments.length, "comments for story:", storyId);

    comments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    callback(comments);
  }, (error) => {
    console.error("[Stories] Error subscribing to comments:", error);
  });

  return () => off(commentsRef);
};

// Like a comment
export const likeStoryComment = async (
  storyId: string,
  commentId: string,
  userId: string
): Promise<void> => {
  const commentRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}/${commentId}`);
  const snapshot = await get(commentRef);

  if (!snapshot.exists()) return;

  const comment = snapshot.val() as StoryComment;
  const likes = comment.likes || [];

  if (!likes.includes(userId)) {
    likes.push(userId);
    await update(commentRef, { likes });
  }
};

// Unlike a comment
export const unlikeStoryComment = async (
  storyId: string,
  commentId: string,
  userId: string
): Promise<void> => {
  const commentRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}/${commentId}`);
  const snapshot = await get(commentRef);

  if (!snapshot.exists()) return;

  const comment = snapshot.val() as StoryComment;
  const likes = (comment.likes || []).filter((id) => id !== userId);
  await update(commentRef, { likes });
};

// Like a reply
export const likeStoryReply = async (
  storyId: string,
  commentId: string,
  replyId: string,
  userId: string
): Promise<void> => {
  const commentRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}/${commentId}`);
  const snapshot = await get(commentRef);

  if (!snapshot.exists()) return;

  const comment = snapshot.val() as StoryComment;
  const replies = comment.replies || [];
  const replyIndex = replies.findIndex((r) => r.id === replyId);

  if (replyIndex >= 0) {
    const reply = replies[replyIndex];
    const likes = reply.likes || [];
    if (!likes.includes(userId)) {
      likes.push(userId);
      replies[replyIndex] = { ...reply, likes };
      await update(commentRef, { replies });
    }
  }
};

// Delete a comment
export const deleteStoryComment = async (
  storyId: string,
  commentId: string
): Promise<void> => {
  const commentRef = ref(realtimeDb, `${STORY_COMMENTS_PATH}/${storyId}/${commentId}`);
  await remove(commentRef);

  // Update comment count on story
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const storySnapshot = await get(storyRef);
  if (storySnapshot.exists()) {
    const story = storySnapshot.val() as Story & { commentCount?: number };
    await update(storyRef, { commentCount: Math.max((story.commentCount || 1) - 1, 0) });
  }
};

// Parse mentions from text (format: @username)
export const parseMentions = (
  text: string,
  users: { id: string; name: string }[]
): { mentions: string[]; formattedText: string } => {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const mentions: string[] = [];
  let formattedText = text;

  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionedName = match[1].toLowerCase();
    const user = users.find(
      (u) => u.name.toLowerCase().includes(mentionedName) ||
             u.name.split(" ")[0].toLowerCase() === mentionedName
    );
    if (user && !mentions.includes(user.id)) {
      mentions.push(user.id);
    }
  }

  return { mentions, formattedText };
};

// ==================== STORY LIKES (Direct story likes) ====================

export const likeStory = async (
  storyId: string,
  userId: string
): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (!snapshot.exists()) return;

  const story = snapshot.val() as Story & { likes?: string[] };
  const likes = story.likes || [];

  if (!likes.includes(userId)) {
    likes.push(userId);
    await update(storyRef, { likes, likeCount: likes.length });
  }
};

export const unlikeStory = async (
  storyId: string,
  userId: string
): Promise<void> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (!snapshot.exists()) return;

  const story = snapshot.val() as Story & { likes?: string[] };
  const likes = (story.likes || []).filter((id) => id !== userId);
  await update(storyRef, { likes, likeCount: likes.length });
};

// Check if user liked a story
export const hasUserLikedStory = async (
  storyId: string,
  userId: string
): Promise<boolean> => {
  const storyRef = ref(realtimeDb, `${STORIES_PATH}/${storyId}`);
  const snapshot = await get(storyRef);

  if (!snapshot.exists()) return false;

  const story = snapshot.val() as Story & { likes?: string[] };
  return (story.likes || []).includes(userId);
};
