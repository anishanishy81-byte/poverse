"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Dialog,
  Stack,
  LinearProgress,
  Fab,
  Tooltip,
  Menu,
  MenuItem,
  CircularProgress,
  TextField,
  Button,
  Paper,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  InputAdornment,
  Collapse,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SendIcon from "@mui/icons-material/Send";
import ReplyIcon from "@mui/icons-material/Reply";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Story, StoryGroup, CreateStoryInput, STORY_BACKGROUNDS, STORY_REACTIONS, StoryComment, StoryViewer } from "@/types/story";
import {
  subscribeToCompanyStories,
  createStory,
  markStoryAsViewed,
  addStoryReaction,
  formatStoryTime,
  getTimeUntilExpiry,
  uploadStoryMedia,
  getUserStories,
  likeStory,
  unlikeStory,
  addStoryComment,
  addStoryReply,
  subscribeToStoryComments,
  likeStoryComment,
  unlikeStoryComment,
  getStoryViewers,
} from "@/lib/stories";
import { getProfilePictureUrl, resolveStorageUrl } from "@/lib/storage";

interface StoriesBarProps {
  userId: string;
  userName: string;
  companyId: string;
  userProfilePicture?: string;
  companyUsers?: { id: string; name: string; profilePicture?: string }[];
}

const STORY_RING_GRADIENT =
  "conic-gradient(from 180deg at 50% 50%, #f9ce34 0deg, #ee2a7b 120deg, #6228d7 240deg, #f9ce34 360deg)";
const STORY_RING_VIEWED = "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)";
const STORY_RING_SIZE = { xs: 58, sm: 70 };
const STORY_AVATAR_SIZE = { xs: 50, sm: 60 };
const isUsableImageSrc = (value?: string) =>
  Boolean(value && (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image")));

export function StoriesBar({ userId, userName, companyId, userProfilePicture, companyUsers = [] }: StoriesBarProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [profilePictureMap, setProfilePictureMap] = useState<Record<string, string>>({});
  const profilePictureCache = useRef<Record<string, string>>({});
  const pendingProfileFetch = useRef<Set<string>>(new Set());

  // Subscribe to stories
  useEffect(() => {
    if (!companyId || !userId) return;

    const unsubscribe = subscribeToCompanyStories(companyId, userId, (groups) => {
      setStoryGroups(groups);
    });

    // Get my stories
    getUserStories(userId).then(setMyStories);

    return () => unsubscribe();
  }, [companyId, userId]);

  // Resolve profile pictures (prefer provided URLs, fallback to storage)
  useEffect(() => {
    if (!userId) return;

    const baseUrls: Record<string, string> = {};
    const pathCandidates: Record<string, string> = {};

    const registerProfile = (id: string, picture?: string) => {
      if (!picture) return;
      if (picture.startsWith("http://") || picture.startsWith("https://") || picture.startsWith("data:image")) {
        baseUrls[id] = picture;
      } else {
        pathCandidates[id] = picture;
      }
    };

    registerProfile(userId, userProfilePicture);
    storyGroups.forEach((group) => registerProfile(group.userId, group.userProfilePicture));
    companyUsers.forEach((user) => registerProfile(user.id, user.profilePicture));

    if (Object.keys(baseUrls).length > 0) {
      profilePictureCache.current = { ...profilePictureCache.current, ...baseUrls };
      setProfilePictureMap(profilePictureCache.current);
    }

    const idsToResolve = new Set<string>();
    idsToResolve.add(userId);
    storyGroups.forEach((group) => idsToResolve.add(group.userId));

    const pendingIds: string[] = [];
    idsToResolve.forEach((id) => {
      if (profilePictureCache.current[id]) return;
      if (pendingProfileFetch.current.has(id)) return;
      pendingIds.push(id);
    });

    const pathResolveIds = Object.keys(pathCandidates).filter((id) => {
      if (profilePictureCache.current[id]) return false;
      if (pendingProfileFetch.current.has(id)) return false;
      return true;
    });

    const idsToFetch = Array.from(new Set([...pendingIds, ...pathResolveIds]));
    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => pendingProfileFetch.current.add(id));
    let cancelled = false;

    const fetchProfiles = async () => {
      const updates: Record<string, string> = {};

      for (const id of idsToFetch) {
        if (pathCandidates[id]) {
          const resolved = await resolveStorageUrl(pathCandidates[id]);
          if (resolved) {
            updates[id] = resolved;
            continue;
          }
        }

        const storageUrl = await getProfilePictureUrl(id);
        if (storageUrl) {
          updates[id] = storageUrl;
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        profilePictureCache.current = { ...profilePictureCache.current, ...updates };
        setProfilePictureMap(profilePictureCache.current);
      }

      idsToFetch.forEach((id) => pendingProfileFetch.current.delete(id));
    };

    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [userId, userProfilePicture, storyGroups, companyUsers]);

  const handleStoryGroupClick = (group: StoryGroup) => {
    setSelectedGroup(group);
    // Find first unviewed story
    const firstUnviewedIndex = group.stories.findIndex(
      (s) => !s.viewedBy?.includes(userId)
    );
    setCurrentStoryIndex(firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0);
  };

  const handleNextStory = useCallback(() => {
    if (!selectedGroup) return;

    if (currentStoryIndex < selectedGroup.stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      // Move to next story group
      const currentGroupIndex = storyGroups.findIndex(
        (g) => g.userId === selectedGroup.userId
      );
      if (currentGroupIndex < storyGroups.length - 1) {
        const nextGroup = storyGroups[currentGroupIndex + 1];
        setSelectedGroup(nextGroup);
        setCurrentStoryIndex(0);
      } else {
        setSelectedGroup(null);
      }
    }
  }, [selectedGroup, currentStoryIndex, storyGroups]);

  const handlePrevStory = () => {
    if (!selectedGroup) return;

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else {
      // Move to previous story group
      const currentGroupIndex = storyGroups.findIndex(
        (g) => g.userId === selectedGroup.userId
      );
      if (currentGroupIndex > 0) {
        const prevGroup = storyGroups[currentGroupIndex - 1];
        setSelectedGroup(prevGroup);
        setCurrentStoryIndex(prevGroup.stories.length - 1);
      }
    }
  };

  const hasMyStories = myStories.length > 0;
  const getAvatarSrc = (id: string, fallback?: string) =>
    profilePictureMap[id] || (isUsableImageSrc(fallback) ? fallback : undefined);
  const currentUserAvatar = getAvatarSrc(userId, userProfilePicture);

  return (
    <>
      {/* Stories Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          overflowX: "auto",
          py: { xs: 1, sm: 1.5 },
          px: { xs: 0.5, sm: 1 },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          scrollSnapType: "x mandatory",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)",
          "& > *": { scrollSnapAlign: "start" },
        }}
        ref={scrollRef}
      >
        {/* My Story / Add Story Button */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: { xs: 72, sm: 84 },
            cursor: "pointer",
          }}
          onClick={() => (hasMyStories ? handleStoryGroupClick({ 
            userId, 
            userName, 
            userProfilePicture: currentUserAvatar, 
            stories: myStories, 
            hasUnviewed: false,
            latestStoryTime: myStories[myStories.length - 1]?.createdAt || ""
          }) : setShowCreateDialog(true))}
        >
          <Box sx={{ position: "relative", width: STORY_RING_SIZE, height: STORY_RING_SIZE }}>
            <Box
              sx={{
                width: STORY_RING_SIZE,
                height: STORY_RING_SIZE,
                borderRadius: "50%",
                p: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: hasMyStories ? STORY_RING_GRADIENT : "transparent",
                border: hasMyStories ? "none" : "2px dashed #cbd5e1",
                boxShadow: hasMyStories ? "0 10px 20px rgba(0,0,0,0.12)" : "none",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: hasMyStories ? "0 14px 24px rgba(0,0,0,0.18)" : "none",
                },
              }}
            >
              <Avatar
                src={currentUserAvatar}
                sx={{
                  width: STORY_AVATAR_SIZE,
                  height: STORY_AVATAR_SIZE,
                  bgcolor: "#f1f5f9",
                  border: "2px solid #fff",
                }}
              >
                {!currentUserAvatar && <PersonIcon />}
              </Avatar>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateDialog(true);
              }}
              sx={{
                position: "absolute",
                bottom: -2,
                right: -2,
                bgcolor: "#1d9bf0",
                color: "white",
                width: { xs: 20, sm: 22 },
                height: { xs: 20, sm: 22 },
                border: "2px solid white",
                boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
                "&:hover": { bgcolor: "#1687d5" },
              }}
            >
              <AddIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
            </IconButton>
          </Box>
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              maxWidth: { xs: 64, sm: 80 },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {hasMyStories ? "Your Story" : "Add Story"}
          </Typography>
        </Box>

        {/* Other Users' Stories */}
        {storyGroups
          .filter((g) => g.userId !== userId)
          .map((group) => (
            <Box
              key={group.userId}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: { xs: 72, sm: 84 },
                cursor: "pointer",
              }}
              onClick={() => handleStoryGroupClick(group)}
            >
              <Box
                sx={{
                  width: STORY_RING_SIZE,
                  height: STORY_RING_SIZE,
                  borderRadius: "50%",
                  p: "3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: group.hasUnviewed ? STORY_RING_GRADIENT : STORY_RING_VIEWED,
                  boxShadow: group.hasUnviewed ? "0 10px 20px rgba(0,0,0,0.12)" : "none",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: group.hasUnviewed ? "0 14px 24px rgba(0,0,0,0.18)" : "none",
                  },
                }}
              >
                <Avatar
                  src={getAvatarSrc(group.userId, group.userProfilePicture)}
                  sx={{
                    width: STORY_AVATAR_SIZE,
                    height: STORY_AVATAR_SIZE,
                    bgcolor: "#f1f5f9",
                    border: "2px solid #fff",
                  }}
                >
                  {!getAvatarSrc(group.userId, group.userProfilePicture) && <PersonIcon />}
                </Avatar>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  maxWidth: { xs: 64, sm: 80 },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: group.hasUnviewed ? 700 : 500,
                  color: group.hasUnviewed ? "#0f172a" : "#334155",
                }}
              >
                {group.userName.split(" ")[0]}
              </Typography>
            </Box>
          ))}
      </Box>

      {/* Story Viewer Dialog */}
      <StoryViewerDialog
        open={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
        storyGroup={selectedGroup}
        currentIndex={currentStoryIndex}
        onNext={handleNextStory}
        onPrev={handlePrevStory}
        currentUserId={userId}
        currentUserName={userName}
        currentUserProfilePicture={currentUserAvatar}
        isOwnStory={selectedGroup?.userId === userId}
        companyUsers={companyUsers}
        profilePictureMap={profilePictureMap}
      />

      {/* Create Story Dialog */}
      <CreateStoryDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        userId={userId}
        userName={userName}
        companyId={companyId}
        userProfilePicture={currentUserAvatar}
      />
    </>
  );
}

// Story Viewer Dialog Component
interface StoryViewerDialogProps {
  open: boolean;
  onClose: () => void;
  storyGroup: StoryGroup | null;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserProfilePicture?: string;
  isOwnStory?: boolean;
  companyUsers?: { id: string; name: string; profilePicture?: string }[];
  profilePictureMap?: Record<string, string>;
}

function StoryViewerDialog({
  open,
  onClose,
  storyGroup,
  currentIndex,
  onNext,
  onPrev,
  currentUserId,
  currentUserName,
  currentUserProfilePicture,
  isOwnStory,
  companyUsers = [],
  profilePictureMap = {},
}: StoryViewerDialogProps) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const story = storyGroup?.stories[currentIndex];
  const getAvatarSrc = (id: string, fallback?: string) =>
    profilePictureMap[id] || (isUsableImageSrc(fallback) ? fallback : undefined);
  const currentUserAvatar = getAvatarSrc(currentUserId, currentUserProfilePicture);
  const pressStartRef = useRef<number | null>(null);

  const handlePressStart = () => {
    pressStartRef.current = Date.now();
    setIsPaused(true);
  };
  const handlePressEnd = () => {
    if (!showComments && !showViewers) {
      setIsPaused(false);
    }
  };

  // Fetch viewers for own stories
  useEffect(() => {
    if (!showViewers || !story?.id || !isOwnStory) return;
    
    const fetchViewers = async () => {
      setLoadingViewers(true);
      try {
        const storyViewers = await getStoryViewers(story.id);
        setViewers(storyViewers);
      } catch (error) {
        console.error("Error fetching viewers:", error);
      } finally {
        setLoadingViewers(false);
      }
    };
    
    fetchViewers();
  }, [showViewers, story?.id, isOwnStory]);

  // Pause progress when showing viewers
  useEffect(() => {
    setIsPaused(showComments || showViewers);
  }, [showComments, showViewers]);

  // Subscribe to comments
  useEffect(() => {
    if (!story?.id) return;

    const unsubscribe = subscribeToStoryComments(story.id, (nextComments) => {
      setComments(nextComments);
    });
    return () => unsubscribe();
  }, [story?.id]);

  // Check if story is liked
  useEffect(() => {
    if (!story) return;
    const storyWithLikes = story as Story & { likes?: string[] };
    setIsLiked((storyWithLikes.likes || []).includes(currentUserId));
  }, [story, currentUserId]);

  // Auto-advance timer
  useEffect(() => {
    if (!open || !story || isPaused) return;

    // Mark as viewed
    if (!isOwnStory) {
      markStoryAsViewed(story.id, currentUserId, currentUserName, currentUserAvatar);
    }

    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [open, story?.id, currentIndex, onNext, currentUserId, currentUserName, isOwnStory, isPaused]);

  // Prefetch next image story for smoother playback
  useEffect(() => {
    if (!storyGroup) return;
    const nextStory = storyGroup.stories[currentIndex + 1];
    if (nextStory?.type === "image" && nextStory.mediaUrl) {
      const img = new Image();
      img.src = nextStory.mediaUrl;
    }
  }, [storyGroup, currentIndex]);

  if (!storyGroup || !story) return null;

  const handleReaction = async (reaction: string) => {
    await addStoryReaction(story.id, currentUserId, reaction);
  };

  const handleLike = async () => {
    if (isLiked) {
      await unlikeStory(story.id, currentUserId);
      setIsLiked(false);
    } else {
      await likeStory(story.id, currentUserId);
      setIsLiked(true);
    }
  };

  const handleComment = async () => {
    console.log("[StoriesBar] handleComment called:", { 
      commentText: commentText.trim(), 
      storyId: story?.id, 
      isSubmittingComment 
    });
    
    if (!commentText.trim() || !story?.id || isSubmittingComment) {
      console.log("[StoriesBar] handleComment early return - validation failed");
      return;
    }

    const text = commentText.trim();
    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      if (replyingTo) {
        console.log("[StoriesBar] Adding reply to comment:", replyingTo);
        const reply = await addStoryReply(
          story.id,
          replyingTo,
          currentUserId,
          currentUserName,
          text,
          currentUserAvatar
        );

        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyingTo
              ? { ...comment, replies: [...(comment.replies || []), reply] }
              : comment
          )
        );
      } else {
        console.log("[StoriesBar] Adding new comment");
        const newComment = await addStoryComment(
          story.id,
          currentUserId,
          currentUserName,
          text,
          currentUserAvatar
        );
        console.log("[StoriesBar] Comment added successfully:", newComment);
        setComments((prev) => [newComment, ...prev]);
      }

      setCommentText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("[StoriesBar] Failed to send comment:", error);
      setCommentError("Failed to send comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikeStoryComment(story.id, commentId, currentUserId);
    } else {
      await likeStoryComment(story.id, commentId, currentUserId);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const storyWithLikes = story as Story & { likes?: string[]; likeCount?: number; commentCount?: number };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: "#000",
          backgroundImage: "radial-gradient(circle at top, rgba(255,255,255,0.08), rgba(0,0,0,0.9) 45%)",
        },
      }}
    >
      <Box
        sx={{
          width: "100dvw",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Lighting Overlays */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 180,
            background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* Progress Bars */}
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            px: 1,
            pt: "calc(env(safe-area-inset-top, 0px) + 6px)",
            pb: 1,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          {storyGroup.stories.map((_, idx) => (
            <LinearProgress
              key={idx}
              variant="determinate"
              value={idx < currentIndex ? 100 : idx === currentIndex ? progress : 0}
              sx={{
                flex: 1,
                height: 2.5,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.28)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "white",
                  borderRadius: 999,
                },
              }}
            />
          ))}
        </Box>

        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            pt: "calc(env(safe-area-inset-top, 0px) + 18px)",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={getAvatarSrc(storyGroup.userId, storyGroup.userProfilePicture)}
              sx={{
                width: 40,
                height: 40,
                border: "2px solid white",
                boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
              }}
            >
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} color="white">
                {storyGroup.userName}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                {formatStoryTime(story.createdAt)} • {getTimeUntilExpiry(story.expiresAt)}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            sx={{
              color: "white",
              bgcolor: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(6px)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Story Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            bgcolor: "#000",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            touchAction: "manipulation",
          }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          onContextMenu={(e) => e.preventDefault()}
          onDoubleClick={(e) => {
            e.preventDefault();
            handleLike();
          }}
          onClick={(e) => {
            const pressDuration = pressStartRef.current ? Date.now() - pressStartRef.current : 0;
            pressStartRef.current = null;
            if (pressDuration > 200) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX < rect.width / 2) {
              onPrev();
            } else {
              onNext();
            }
          }}
        >
          {story.type === "text" && (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: story.backgroundColor || STORY_BACKGROUNDS[0],
                p: 4,
              }}
            >
              <Typography
                variant={story.fontSize === "large" ? "h3" : story.fontSize === "small" ? "h6" : "h5"}
                color={story.textColor || "white"}
                textAlign="center"
                fontWeight={600}
                sx={{ textShadow: "0 10px 24px rgba(0,0,0,0.35)" }}
              >
                {story.text}
              </Typography>
            </Box>
          )}
          
          {story.type === "image" && story.mediaUrl && (
            <Box
              component="img"
              src={story.mediaUrl}
              sx={{
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
              alt="Story"
            />
          )}

          {/* Caption */}
          {story.caption && (
            <Box
              sx={{
                position: "absolute",
                bottom: 80,
                left: 16,
                right: 16,
                bgcolor: "rgba(0,0,0,0.55)",
                borderRadius: 3,
                p: 2,
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Typography color="white">{story.caption}</Typography>
            </Box>
          )}

          {/* Location */}
          {story.location?.address && (
            <Box
              sx={{
                position: "absolute",
                top: 80,
                left: 16,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "rgba(0,0,0,0.5)",
                borderRadius: 999,
                px: 1.5,
                py: 0.5,
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <LocationOnIcon sx={{ fontSize: 16, color: "white" }} />
              <Typography variant="caption" color="white">
                {story.location.placeName || story.location.address.substring(0, 30)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer - Like, Comment, Reactions */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            pb: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 10,
            background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Like Button */}
            <IconButton onClick={handleLike} sx={{ color: "white" }}>
              {isLiked ? (
                <FavoriteIcon sx={{ color: "#ff4757" }} />
              ) : (
                <FavoriteBorderIcon />
              )}
            </IconButton>
            <Typography variant="caption" color="white">
              {storyWithLikes.likeCount || 0}
            </Typography>

            {/* Comment Button */}
            <IconButton onClick={() => setShowComments(true)} sx={{ color: "white" }}>
              <Badge badgeContent={storyWithLikes.commentCount || comments.length} color="primary" max={99}>
                <ChatBubbleOutlineIcon />
              </Badge>
            </IconButton>

            {/* Reactions */}
            {!isOwnStory && (
              <Stack direction="row" spacing={0.5}>
                {STORY_REACTIONS.slice(0, 3).map((reaction) => (
                  <IconButton
                    key={reaction}
                    onClick={() => handleReaction(reaction)}
                    size="small"
                    sx={{
                      bgcolor: story.reactions?.[reaction]?.includes(currentUserId)
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(255,255,255,0.1)",
                      color: "white",
                      width: 32,
                      height: 32,
                    }}
                  >
                    <Typography fontSize={16}>{reaction}</Typography>
                  </IconButton>
                ))}
              </Stack>
            )}
          </Stack>

          {/* View Count (for own stories) - Clickable to show viewers */}
          {isOwnStory && (
            <IconButton
              onClick={() => setShowViewers(true)}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                px: 1.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              <VisibilityIcon sx={{ fontSize: 20, mr: 0.5 }} />
              <Typography variant="body2" color="white">
                {story.viewCount || 0} views
              </Typography>
            </IconButton>
          )}
        </Box>

        {/* Viewers Drawer (for own stories) */}
        <Drawer
          anchor="bottom"
          open={showViewers}
          onClose={() => setShowViewers(false)}
          PaperProps={{
            sx: {
              bgcolor: "rgba(20,20,20,0.98)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "70vh",
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            {/* Handle */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box sx={{ width: 40, height: 4, bgcolor: "grey.600", borderRadius: 2 }} />
            </Box>

            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" color="white" fontWeight={600}>
                Viewed by ({story.viewCount || 0})
              </Typography>
              <IconButton onClick={() => setShowViewers(false)} sx={{ color: "white" }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Viewers List */}
            {loadingViewers ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} sx={{ color: "white" }} />
              </Box>
            ) : viewers.length === 0 ? (
              <Typography variant="body2" color="grey.500" textAlign="center" py={4}>
                No one has viewed this story yet
              </Typography>
            ) : (
              <List sx={{ maxHeight: "50vh", overflow: "auto" }}>
                {viewers.map((viewer) => (
                  <ListItem key={viewer.userId} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar
                        src={getAvatarSrc(viewer.userId, viewer.userProfilePicture)}
                        sx={{ width: 44, height: 44 }}
                      >
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600} color="white">
                          {viewer.userName}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="grey.500">
                            {formatStoryTime(viewer.viewedAt)}
                          </Typography>
                          {viewer.reaction && (
                            <Typography fontSize={16}>{viewer.reaction}</Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Drawer>

        {/* Comments Drawer */}
        <Drawer
          anchor="bottom"
          open={showComments}
          onClose={() => setShowComments(false)}
          PaperProps={{
            sx: {
              bgcolor: "rgba(20,20,20,0.98)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "70vh",
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            {/* Handle */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box sx={{ width: 40, height: 4, bgcolor: "grey.600", borderRadius: 2 }} />
            </Box>

            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" color="white" fontWeight={600}>
                Comments ({comments.length})
              </Typography>
              <IconButton onClick={() => setShowComments(false)} sx={{ color: "white" }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Comment Input */}
            <Stack direction="row" spacing={1} mb={2}>
              <Avatar src={currentUserAvatar} sx={{ width: 36, height: 36 }}>
                <PersonIcon />
              </Avatar>
              <TextField
                fullWidth
                size="small"
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  if (commentError) setCommentError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                InputProps={{
                  sx: {
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "white",
                    borderRadius: 3,
                    "& input::placeholder": { color: "rgba(255,255,255,0.5)" },
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleComment}
                        disabled={!commentText.trim() || isSubmittingComment}
                        sx={{ color: "white" }}
                      >
                        <SendIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            {commentError && (
              <Typography variant="caption" color="#fca5a5" sx={{ mb: 1, display: "block" }}>
                {commentError}
              </Typography>
            )}

            {replyingTo && (
              <Chip
                label="Replying to comment"
                size="small"
                onDelete={() => setReplyingTo(null)}
                sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
              />
            )}

            {/* Comments List */}
            <List sx={{ maxHeight: "45vh", overflow: "auto" }}>
              {comments.map((comment) => (
                <Box key={comment.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar src={getAvatarSrc(comment.userId, comment.userProfilePicture)} sx={{ width: 36, height: 36 }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600} color="white">
                            {comment.userName}
                          </Typography>
                          <Typography variant="caption" color="grey.500">
                            {formatStoryTime(comment.createdAt)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ mt: 0.5 }}>
                          {comment.text}
                        </Typography>
                      }
                    />
                    <Stack direction="row" alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => handleLikeComment(comment.id, (comment.likes || []).includes(currentUserId))}
                        sx={{ color: (comment.likes || []).includes(currentUserId) ? "#ff4757" : "grey.500" }}
                      >
                        {(comment.likes || []).includes(currentUserId) ? (
                          <FavoriteIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <FavoriteBorderIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                      <Typography variant="caption" color="grey.500">
                        {(comment.likes || []).length}
                      </Typography>
                    </Stack>
                  </ListItem>

                  {/* Reply and View Replies Buttons */}
                  <Stack direction="row" spacing={2} sx={{ pl: 7, mb: 1 }}>
                    <Button
                      size="small"
                      startIcon={<ReplyIcon sx={{ fontSize: 14 }} />}
                      onClick={() => setReplyingTo(comment.id)}
                      sx={{ color: "grey.400", fontSize: 12, textTransform: "none" }}
                    >
                      Reply
                    </Button>
                    {comment.replies && comment.replies.length > 0 && (
                      <Button
                        size="small"
                        endIcon={expandedReplies.has(comment.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => toggleReplies(comment.id)}
                        sx={{ color: "grey.400", fontSize: 12, textTransform: "none" }}
                      >
                        {expandedReplies.has(comment.id) ? "Hide" : `View ${comment.replies.length}`} replies
                      </Button>
                    )}
                  </Stack>

                  {/* Nested Replies */}
                  <Collapse in={expandedReplies.has(comment.id)}>
                    <List sx={{ pl: 5 }}>
                      {(comment.replies || []).map((reply) => (
                        <ListItem key={reply.id} alignItems="flex-start" sx={{ py: 0.5 }}>
                          <ListItemAvatar>
                            <Avatar src={getAvatarSrc(reply.userId, reply.userProfilePicture)} sx={{ width: 28, height: 28 }}>
                              <PersonIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" fontWeight={600} color="white">
                                  {reply.userName}
                                </Typography>
                                <Typography variant="caption" color="grey.600">
                                  {formatStoryTime(reply.createdAt)}
                                </Typography>
                              </Stack>
                            }
                            secondary={
                              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                                {reply.text}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 1 }} />
                </Box>
              ))}

              {comments.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: "grey.600", mb: 1 }} />
                  <Typography color="grey.500">No comments yet. Be the first!</Typography>
                </Box>
              )}
            </List>
          </Box>
        </Drawer>

        {/* Navigation Buttons */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          sx={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: "white",
            bgcolor: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          sx={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: "white",
            bgcolor: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
            display: { xs: "none", sm: "flex" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </Dialog>
  );
}

// Create Story Dialog
interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  companyId: string;
  userProfilePicture?: string;
}

function CreateStoryDialog({
  open,
  onClose,
  userId,
  userName,
  companyId,
  userProfilePicture,
}: CreateStoryDialogProps) {
  const [storyType, setStoryType] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedBg, setSelectedBg] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStoryType("image");
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const input: CreateStoryInput = {
        type: storyType,
        isPublic: true,
      };

      if (storyType === "text") {
        input.text = text;
        input.backgroundColor = STORY_BACKGROUNDS[selectedBg];
        input.textColor = "white";
      } else if (storyType === "image" && imageFile) {
        const { url } = await uploadStoryMedia(userId, imageFile);
        input.mediaUrl = url;
      }

      if (caption) {
        input.caption = caption;
      }

      let resolvedProfilePicture: string | undefined = userProfilePicture ?? undefined;
      if (!isUsableImageSrc(resolvedProfilePicture)) {
        resolvedProfilePicture = await getProfilePictureUrl(userId) || undefined;
      }

      await createStory(userId, userName, companyId, input, resolvedProfilePicture);
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error creating story:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setText("");
    setCaption("");
    setSelectedBg(0);
    setImageFile(null);
    setImagePreview(null);
    setStoryType("text");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: storyType === "text" ? "transparent" : "black",
          backgroundImage: storyType === "text" ? STORY_BACKGROUNDS[selectedBg] : "none",
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ p: 2 }}
        >
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => setStoryType("text")}
              sx={{
                bgcolor: storyType === "text" ? "white" : "rgba(255,255,255,0.2)",
                color: storyType === "text" ? "black" : "white",
              }}
            >
              <TextFieldsIcon />
            </IconButton>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              sx={{
                bgcolor: storyType === "image" ? "white" : "rgba(255,255,255,0.2)",
                color: storyType === "image" ? "black" : "white",
              }}
            >
              <CameraAltIcon />
            </IconButton>
          </Stack>
        </Stack>

        {/* Content */}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          {storyType === "text" ? (
            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your story..."
              multiline
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  textAlign: "center",
                  "& textarea": { textAlign: "center" },
                },
              }}
              sx={{ width: "100%" }}
              autoFocus
            />
          ) : imagePreview ? (
            <Box
              component="img"
              src={imagePreview}
              sx={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
              alt="Preview"
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "white",
              }}
            >
              <CameraAltIcon sx={{ fontSize: 64, mb: 2 }} />
              <Typography>Tap to add a photo</Typography>
            </Box>
          )}
        </Box>

        {/* Background Colors (for text) */}
        {storyType === "text" && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              p: 2,
              overflowX: "auto",
              justifyContent: "center",
            }}
          >
            {STORY_BACKGROUNDS.map((bg, idx) => (
              <Box
                key={idx}
                onClick={() => setSelectedBg(idx)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: bg,
                  cursor: "pointer",
                  border: idx === selectedBg ? "3px solid white" : "2px solid rgba(255,255,255,0.3)",
                  flexShrink: 0,
                }}
              />
            ))}
          </Box>
        )}

        {/* Caption Input */}
        <Box sx={{ p: 2 }}>
          <TextField
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            size="small"
            fullWidth
            InputProps={{
              sx: {
                bgcolor: "rgba(255,255,255,0.1)",
                color: "white",
                borderRadius: 2,
                "& input::placeholder": { color: "rgba(255,255,255,0.5)" },
              },
            }}
          />
        </Box>

        {/* Submit Button */}
        <Box sx={{ p: 2, pb: 4 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoading || (storyType === "text" && !text) || (storyType === "image" && !imageFile)}
            sx={{
              py: 1.5,
              bgcolor: "white",
              color: "black",
              fontWeight: 600,
              "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
            }}
          >
            {isLoading ? <CircularProgress size={24} /> : "Share Story"}
          </Button>
        </Box>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          style={{ display: "none" }}
        />
      </Box>
    </Dialog>
  );
}

export default StoriesBar;
