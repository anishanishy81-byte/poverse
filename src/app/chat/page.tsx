"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  TextField,
  IconButton,
  Badge,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Menu,
  MenuItem,
  Paper,
  LinearProgress,
  Fab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import VideocamIcon from "@mui/icons-material/Videocam";
import CallIcon from "@mui/icons-material/Call";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from "@mui/icons-material/Image";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ReplyIcon from "@mui/icons-material/Reply";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { useVoiceCall } from "@/components";
import { ChatMessage, Conversation, ChatUser, MessageReply, MessageAttachment, CallRecord } from "@/types/chat";
import {
  getOrCreateConversation,
  sendMessage,
  sendMessageAdvanced,
  uploadChatFile,
  deleteMessage,
  addReaction,
  subscribeToMessages,
  subscribeToConversations,
  setTypingStatus,
  subscribeToTyping,
  markMessagesAsRead,
  subscribeToPresence,
  getChatableUsers,
  getConversationId,
} from "@/lib/chat";
import { subscribeToUserLocation, subscribeToAllLocations, LocationData } from "@/lib/locationTracking";
import { Document, getDocumentCategoryInfo, formatFileSize } from "@/types/document";
import { subscribeToCompanyDocuments, shareDocumentInChat, recordDocumentDownload } from "@/lib/document";
import { getProfilePictureUrl, resolveStorageUrl } from "@/lib/storage";
import { subscribeToCompanyStories, getUserStories, markStoryAsViewed, formatStoryTime, getTimeUntilExpiry, addStoryReaction, likeStory, unlikeStory } from "@/lib/stories";
import { Story, StoryGroup, STORY_REACTIONS } from "@/types/story";

const displayFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const chatPalette = {
  shell: "#f6f3ee",
  shellAlt: "#f1f7f5",
  surface: "#ffffff",
  surfaceSoft: "#f7f8f7",
  ink: "#1f2937",
  muted: "#6b7280",
  accent: "#1f9d8a",
  accentDark: "#157a68",
  accentSoft: "rgba(31, 157, 138, 0.12)",
  accentGlow: "rgba(31, 157, 138, 0.25)",
  highlight: "#f59f0b",
  line: "rgba(15, 23, 42, 0.08)",
  header: "linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)",
  headerShadow: "0 12px 30px rgba(15, 118, 110, 0.25)",
  bubbleMe: "linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)",
  bubbleOther: "rgba(255,255,255,0.9)",
  bubbleOtherBorder: "rgba(15, 23, 42, 0.08)",
  success: "#22c55e",
  warning: "#f97316",
  info: "#0ea5e9",
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case "superadmin":
      return <AdminPanelSettingsIcon sx={{ fontSize: 14 }} />;
    case "admin":
      return <SupervisorAccountIcon sx={{ fontSize: 14 }} />;
    default:
      return <PersonIcon sx={{ fontSize: 14 }} />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case "superadmin":
      return "#e11d48";
    case "admin":
      return chatPalette.warning;
    default:
      return chatPalette.accent;
  }
};

const formatLastActive = (lastActive: string) => {
  const now = new Date();
  const active = new Date(lastActive);
  const diffMs = now.getTime() - active.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Active now";
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  return active.toLocaleDateString();
};

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();
  const { startCall, startVideoCall, isInCall } = useVoiceCall();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [presence, setPresence] = useState<{ [userId: string]: { isOnline: boolean; lastActive: string } }>({});
  const [isSending, setIsSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const [selectedUserLocation, setSelectedUserLocation] = useState<LocationData | null>(null);
  const [allUserLocations, setAllUserLocations] = useState<Map<string, LocationData>>(new Map());
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationMapLoaded, setLocationMapLoaded] = useState(false);
  const locationMapRef = useRef<HTMLDivElement>(null);
  const locationMapInstanceRef = useRef<google.maps.Map | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);
  
  // Document sharing state
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [companyDocuments, setCompanyDocuments] = useState<Document[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Attachment menu state
  const [attachMenuAnchor, setAttachMenuAnchor] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Message menu state (for long press)
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<{ element: HTMLElement; message: ChatMessage } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Profile pictures and stories state
  const [profilePictures, setProfilePictures] = useState<Record<string, string>>({});
  const [userStories, setUserStories] = useState<Map<string, StoryGroup>>(new Map());
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [isStoryLiked, setIsStoryLiked] = useState(false);
  const storyProgressRef = useRef<NodeJS.Timeout | null>(null);

  // Common emojis for quick picker
  const QUICK_EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "😭", "🙏", "👍", "❤️", "🔥", "💯", "🎉", "👏", "💪", "🤔", "😅", "🥺", "😊", "🙌", "✨"];

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth check and initial data load
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    const loadInitialData = async () => {
      try {
        // Get users that can be chatted with
        const currentUser: ChatUser = {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          companyId: user.companyId,
        };
        const users = await getChatableUsers(currentUser);
        setChatUsers(users);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading chat data:", error);
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [hasHydrated, isAuthenticated, user, router]);

  // Subscribe to conversations
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToConversations(user.id, (convos) => {
      setConversations(convos);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to presence for chat users
  useEffect(() => {
    if (chatUsers.length === 0) return;

    const userIds = chatUsers.map((u) => u.id);
    const unsubscribe = subscribeToPresence(userIds, setPresence);

    return () => unsubscribe();
  }, [chatUsers]);

  // Subscribe to messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation?.id) return;

    console.log("Subscribing to messages for conversation:", selectedConversation.id);
    
    const unsubscribe = subscribeToMessages(selectedConversation.id, (msgs) => {
      console.log("Received messages:", msgs.length);
      setMessages(msgs);
    });

    // Mark messages as read
    if (user) {
      markMessagesAsRead(selectedConversation.id, user.id);
    }

    return () => {
      console.log("Unsubscribing from messages");
      unsubscribe();
    };
  }, [selectedConversation?.id, user]);

  // Subscribe to typing status for the selected conversation
  useEffect(() => {
    if (!selectedConversation?.id) {
      setTypingUsers({});
      return;
    }

    console.log("Subscribing to typing for conversation:", selectedConversation.id);
    
    const unsubscribe = subscribeToTyping(selectedConversation.id, (typing) => {
      console.log("Typing status update:", typing);
      setTypingUsers(typing);
    });

    return () => {
      console.log("Unsubscribing from typing");
      unsubscribe();
    };
  }, [selectedConversation?.id]);

  // Subscribe to selected user's location for Snapchat-like map preview
  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserLocation(null);
      return;
    }

    const unsubscribe = subscribeToUserLocation(selectedUser.id, (location) => {
      setSelectedUserLocation(location);
    });

    return () => unsubscribe();
  }, [selectedUser]);

  // Subscribe to all user locations for showing in conversation list
  useEffect(() => {
    if (!company?.id) return;

    const unsubscribe = subscribeToAllLocations(company.id, (locations) => {
      const locationMap = new Map<string, LocationData>();
      locations.forEach((loc) => {
        locationMap.set(loc.userId, loc);
      });
      setAllUserLocations(locationMap);
    });

    return () => unsubscribe();
  }, [company?.id]);

  // Subscribe to company documents for sharing
  useEffect(() => {
    if (!company?.id) return;

    setLoadingDocuments(true);
    const unsubscribe = subscribeToCompanyDocuments(company.id, (docs) => {
      // Filter to only active and accessible documents
      const accessibleDocs = docs.filter((doc) => {
        if (user?.role === "admin" || user?.role === "superadmin") return true;
        if (doc.visibility === "admin_only") return false;
        if (doc.visibility === "specific_users") {
          return doc.allowedUserIds?.includes(user?.id || "") || doc.uploadedBy === user?.id;
        }
        return true;
      });
      setCompanyDocuments(accessibleDocs);
      setLoadingDocuments(false);
    });

    return () => unsubscribe();
  }, [company?.id, user?.id, user?.role]);

  // Fetch profile pictures for chat users
  useEffect(() => {
    if (chatUsers.length === 0) return;

    const fetchProfilePictures = async () => {
      const pictures: Record<string, string> = {};
      
      for (const chatUser of chatUsers) {
        try {
          // First try to resolve from storage URL if they have a profile picture path
          if (chatUser.profilePicture) {
            const resolved = await resolveStorageUrl(chatUser.profilePicture);
            if (resolved) {
              pictures[chatUser.id] = resolved;
              continue;
            }
          }
          
          // Otherwise try to get from storage by user ID
          const storageUrl = await getProfilePictureUrl(chatUser.id);
          if (storageUrl) {
            pictures[chatUser.id] = storageUrl;
          }
        } catch (error) {
          console.error(`Error fetching profile picture for ${chatUser.id}:`, error);
        }
      }
      
      setProfilePictures((prev) => ({ ...prev, ...pictures }));
    };

    fetchProfilePictures();
  }, [chatUsers]);

  // Subscribe to company stories for showing story rings on avatars
  useEffect(() => {
    if (!company?.id || !user?.id) return;

    const unsubscribe = subscribeToCompanyStories(company.id, user.id, (storyGroups) => {
      const storyMap = new Map<string, StoryGroup>();
      storyGroups.forEach((group) => {
        storyMap.set(group.userId, group);
      });
      setUserStories(storyMap);
    });

    return () => unsubscribe();
  }, [company?.id, user?.id]);

  // Story progress timer
  useEffect(() => {
    if (!selectedStoryGroup || isStoryPaused) {
      if (storyProgressRef.current) {
        clearInterval(storyProgressRef.current);
        storyProgressRef.current = null;
      }
      return;
    }

    const story = selectedStoryGroup.stories[currentStoryIndex];
    if (!story) return;

    // Mark as viewed if not own story
    if (story.userId !== user?.id) {
      markStoryAsViewed(story.id, user?.id || "", user?.name || "", profilePictures[user?.id || ""]);
    }

    setStoryProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    const increment = (interval / duration) * 100;

    storyProgressRef.current = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Move to next story
          if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
            setCurrentStoryIndex((i) => i + 1);
            return 0;
          } else {
            // Close story viewer
            setSelectedStoryGroup(null);
            setCurrentStoryIndex(0);
            return 0;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (storyProgressRef.current) {
        clearInterval(storyProgressRef.current);
      }
    };
  }, [selectedStoryGroup, currentStoryIndex, isStoryPaused, user?.id, user?.name, profilePictures]);

  // Check if story is liked
  useEffect(() => {
    if (!selectedStoryGroup) return;
    const story = selectedStoryGroup.stories[currentStoryIndex];
    if (!story) return;
    const storyWithLikes = story as Story & { likes?: string[] };
    setIsStoryLiked((storyWithLikes.likes || []).includes(user?.id || ""));
  }, [selectedStoryGroup, currentStoryIndex, user?.id]);

  // Handle story avatar click
  const handleAvatarClick = (userId: string) => {
    const storyGroup = userStories.get(userId);
    if (storyGroup && storyGroup.stories.length > 0) {
      setSelectedStoryGroup(storyGroup);
      setCurrentStoryIndex(0);
      setStoryProgress(0);
    }
  };

  // Handle story like
  const handleStoryLike = async () => {
    if (!selectedStoryGroup) return;
    const story = selectedStoryGroup.stories[currentStoryIndex];
    if (!story) return;

    if (isStoryLiked) {
      await unlikeStory(story.id, user?.id || "");
      setIsStoryLiked(false);
    } else {
      await likeStory(story.id, user?.id || "");
      setIsStoryLiked(true);
    }
  };

  // Handle story navigation
  const handleNextStory = () => {
    if (!selectedStoryGroup) return;
    if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
      setCurrentStoryIndex((i) => i + 1);
      setStoryProgress(0);
    } else {
      setSelectedStoryGroup(null);
      setCurrentStoryIndex(0);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((i) => i - 1);
      setStoryProgress(0);
    }
  };

  // Initialize location map when modal opens
  useEffect(() => {
    if (!showLocationModal || !locationMapRef.current) return;
    
    // Reset map state when modal opens
    locationMapInstanceRef.current = null;
    locationMarkerRef.current = null;
    setLocationMapLoaded(false);

    const initMap = () => {
      if (typeof window === "undefined" || !(window as any).google?.maps) {
        return false;
      }
      
      if (!locationMapRef.current) return false;

      const center = selectedUserLocation
        ? { lat: selectedUserLocation.latitude, lng: selectedUserLocation.longitude }
        : { lat: 20.5937, lng: 78.9629 };

      locationMapInstanceRef.current = new (window as any).google.maps.Map(locationMapRef.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      
      // Add marker immediately if we have location
      if (selectedUserLocation && locationMapInstanceRef.current) {
        const position = { lat: selectedUserLocation.latitude, lng: selectedUserLocation.longitude };
        locationMarkerRef.current = new (window as any).google.maps.Marker({
          map: locationMapInstanceRef.current,
          position,
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="50" height="60" viewBox="0 0 50 60">
                <path d="M25 0C11.2 0 0 11.2 0 25c0 17.5 25 35 25 35s25-17.5 25-35C50 11.2 38.8 0 25 0z" fill="${chatPalette.accent}"/>
                <circle cx="25" cy="22" r="15" fill="white"/>
                <text x="25" y="28" text-anchor="middle" font-size="18">📍</text>
              </svg>
            `)}`,
            scaledSize: new (window as any).google.maps.Size(50, 60),
            anchor: new (window as any).google.maps.Point(25, 60),
          },
          title: selectedUser?.name,
        });
      }

      setLocationMapLoaded(true);
      return true;
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      if (!initMap()) {
        const interval = setInterval(() => {
          if (initMap()) {
            clearInterval(interval);
          }
        }, 500);

        // Clean up interval after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [showLocationModal, selectedUserLocation, selectedUser?.name]);

  // Update marker when location changes (only if map already exists)
  useEffect(() => {
    if (!locationMapInstanceRef.current || !selectedUserLocation || !showLocationModal) return;

    const position = { lat: selectedUserLocation.latitude, lng: selectedUserLocation.longitude };

    if (locationMarkerRef.current) {
      locationMarkerRef.current.setPosition(position);
    }

    locationMapInstanceRef.current.panTo(position);
  }, [selectedUserLocation, showLocationModal]);

  // Handle selecting a user to chat with
  const handleSelectUser = async (chatUser: ChatUser) => {
    if (!user) return;

    const currentUser: ChatUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
    };

    const conversation = await getOrCreateConversation(currentUser, chatUser, user.companyId);
    setSelectedUser(chatUser);
    setSelectedConversation(conversation);
    setShowMobileChat(true);
  };

  // Handle selecting an existing conversation
  const handleSelectConversation = (conversation: Conversation) => {
    if (!user) return;

    const otherUserId = conversation.participants.find((p) => p !== user.id);
    if (!otherUserId) return;

    const otherUser: ChatUser = {
      id: otherUserId,
      name: conversation.participantNames[otherUserId],
      username: "",
      role: conversation.participantRoles[otherUserId] as "superadmin" | "admin" | "user",
      companyId: conversation.companyId,
    };

    setSelectedUser(otherUser);
    setSelectedConversation(conversation);
    setShowMobileChat(true);
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedConversation || !user) return;

    setTypingStatus(selectedConversation.id, user.id, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        setTypingStatus(selectedConversation.id, user.id, false);
      }
    }, 2000);
  }, [selectedConversation, user]);

  // Handle sending message (with optional attachment and reply)
  const handleSendMessage = async (attachment?: MessageAttachment) => {
    const hasContent = newMessage.trim() || attachment;
    if (!hasContent || !selectedConversation || !selectedUser || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessageAdvanced({
        conversationId: selectedConversation.id,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        senderAvatar: user.profilePicture,
        receiverId: selectedUser.id,
        receiverName: selectedUser.name,
        content: newMessage.trim() || (attachment?.type === "audio" ? "🎵 Voice message" : ""),
        type: attachment?.type || "text",
        attachment,
        replyTo: replyingTo ? {
          messageId: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          ...(replyingTo.type && { type: replyingTo.type }),
        } : undefined,
      });
      setNewMessage("");
      setReplyingTo(null);
      if (selectedConversation) {
        setTypingStatus(selectedConversation.id, user.id, false);
      }
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File, type: "image" | "audio" | "video" | "document") => {
    if (!selectedConversation) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const uploadResult = await uploadChatFile(selectedConversation.id, file, type);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const attachment: MessageAttachment = {
        type,
        url: uploadResult.url,
        name: uploadResult.name,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
      };
      
      await handleSendMessage(attachment);
      setAttachMenuAnchor(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, "image");
    }
    e.target.value = "";
  };

  // Handle video selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, "video");
    }
    e.target.value = "";
  };

  // Handle document selection
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, "document");
    }
    e.target.value = "";
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Upload and send
        await handleFileUpload(audioFile, "audio");
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = []; // Clear chunks to prevent sending
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Message long press handlers
  const handleMessageLongPress = (e: React.TouchEvent | React.MouseEvent, message: ChatMessage) => {
    e.preventDefault();
    setMessageMenuAnchor({ element: e.currentTarget as HTMLElement, message });
  };

  const handleCopyMessage = () => {
    if (messageMenuAnchor?.message) {
      navigator.clipboard.writeText(messageMenuAnchor.message.content);
      setMessageMenuAnchor(null);
    }
  };

  const handleReplyToMessage = () => {
    if (messageMenuAnchor?.message) {
      setReplyingTo(messageMenuAnchor.message);
      setMessageMenuAnchor(null);
      inputRef.current?.focus();
    }
  };

  const handleDeleteMessage = async () => {
    if (messageMenuAnchor?.message && selectedConversation && messageMenuAnchor.message.senderId === user?.id) {
      await deleteMessage(selectedConversation.id, messageMenuAnchor.message.id);
      setMessageMenuAnchor(null);
    }
  };

  // Emoji picker handler
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Audio playback
  const handlePlayAudio = (messageId: string, url: string) => {
    if (playingAudioId === messageId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        setPlayingAudioId(messageId);
        audioPlayerRef.current.onended = () => setPlayingAudioId(null);
      }
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (showMobileChat) {
      setShowMobileChat(false);
      setReplyingTo(null);
      return;
    }
    if (user?.role === "superadmin") {
      router.push("/superadmin");
    } else if (user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  // Handle call
  const handleVideoCall = async () => {
    if (!selectedUser || isInCall) return;
    
    try {
      await startVideoCall(selectedUser.id, selectedUser.name, selectedUser.role);
    } catch (error) {
      console.error("Failed to start video call:", error);
      alert("Failed to start video call. Please check camera and microphone permissions.");
    }
  };

  const handleVoiceCall = async () => {
    if (!selectedUser || isInCall) return;
    
    try {
      await startCall(selectedUser.id, selectedUser.name, selectedUser.role);
    } catch (error) {
      console.error("Failed to start call:", error);
      alert("Failed to start call. Please check microphone permissions.");
    }
  };

  // Check if current user is admin (for location icon visibility)
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Handle document sharing
  const handleShareDocument = async (doc: Document) => {
    if (!selectedConversation || !selectedUser || !user || !company?.id) return;

    try {
      // Share document in chat
      await shareDocumentInChat(
        company.id,
        doc.id,
        selectedConversation.id,
        user.id,
        user.name
      );

      // Send a message with document info
      const docMessage = `📎 Shared document: ${doc.name}\n📁 ${getDocumentCategoryInfo(doc.category).label} • ${formatFileSize(doc.fileSize)}\n🔗 ${doc.fileUrl}`;
      
      await sendMessage(
        selectedConversation.id,
        user.id,
        user.name,
        user.role,
        selectedUser.id,
        selectedUser.name,
        docMessage
      );

      setShowDocumentPicker(false);
      setDocumentSearchQuery("");
    } catch (error) {
      console.error("Error sharing document:", error);
    }
  };

  // Handle document download from chat
  const handleDocumentDownload = async (doc: Document) => {
    if (!company?.id || !user?.id || !user?.name) return;
    
    await recordDocumentDownload(company.id, doc.id, user.id, user.name);
    window.open(doc.fileUrl, "_blank");
  };

  // Filter documents by search
  const filteredDocuments = companyDocuments.filter((doc) =>
    doc.name.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    getDocumentCategoryInfo(doc.category).label.toLowerCase().includes(documentSearchQuery.toLowerCase())
  );

  // Filter users by search query
  const filteredUsers = chatUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get other user's typing status from realtime subscription
  const isOtherUserTyping = selectedUser ? typingUsers[selectedUser.id] === true : false;

  // Get unread count for a conversation
  const getUnreadCount = (conversation: Conversation) => {
    if (!user) return 0;
    return conversation.unreadCount?.[user.id] || 0;
  };

  // Combined list of conversations and users
  const getDisplayList = () => {
    const conversationUserIds = new Set(
      conversations.flatMap((c) => c.participants.filter((p) => p !== user?.id))
    );

    const usersWithoutConversation = filteredUsers.filter(
      (u) => !conversationUserIds.has(u.id)
    );

    return { conversations, usersWithoutConversation };
  };

  const { usersWithoutConversation } = getDisplayList();

  if (!isAuthenticated || isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: chatPalette.shell,
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(31, 157, 138, 0.12), transparent 45%), radial-gradient(circle at 80% 10%, rgba(249, 115, 22, 0.12), transparent 40%), linear-gradient(180deg, ${chatPalette.shell} 0%, ${chatPalette.shellAlt} 100%)`,
        }}
      >
        <CircularProgress sx={{ color: chatPalette.accent }} />
      </Box>
    );
  }

  return (
    <Box
      className={bodyFont.className}
      sx={{
        height: "100vh",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        bgcolor: chatPalette.shell,
        backgroundImage: `radial-gradient(circle at 20% 12%, rgba(31, 157, 138, 0.18), transparent 45%), radial-gradient(circle at 85% 25%, rgba(249, 115, 22, 0.12), transparent 40%), linear-gradient(180deg, ${chatPalette.shell} 0%, ${chatPalette.shellAlt} 55%, #f7f4f0 100%)`,
        "& .MuiTypography-root": { fontFamily: bodyFont.style.fontFamily },
        "& .MuiButton-root": { fontFamily: bodyFont.style.fontFamily },
        "& .MuiChip-root": { fontFamily: bodyFont.style.fontFamily },
        "& .MuiInputBase-input": { fontFamily: bodyFont.style.fontFamily },
        "& .chat-display": { fontFamily: displayFont.style.fontFamily, letterSpacing: "-0.01em" },
        "@keyframes chatRise": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "@keyframes bubbleIn": {
          "0%": { opacity: 0, transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        "@keyframes fadeSlide": {
          "0%": { opacity: 0, transform: "translateX(-8px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
      }}
    >
      {/* Sidebar */}
      <Box
        sx={{
          width: { xs: showMobileChat ? 0 : "100%", md: 400 },
          display: { xs: showMobileChat ? "none" : "flex", md: "flex" },
          flexDirection: "column",
          borderRight: `1px solid ${chatPalette.line}`,
          overflow: "hidden",
          bgcolor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          position: "relative",
          zIndex: 2,
          animation: "chatRise 0.6s ease",
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: chatPalette.header,
            color: "white",
            minHeight: 70,
            boxShadow: chatPalette.headerShadow,
            position: "relative",
            overflow: "hidden",
            "& > *": { position: "relative", zIndex: 1 },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.12), transparent 40%)",
              opacity: 0.9,
              pointerEvents: "none",
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              onClick={handleBack}
              size="small"
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.12)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.4)",
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.2)",
              }}
            >
              {getRoleIcon(user?.role || "user")}
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                className="chat-display"
                sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}
              >
                Chats
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {user?.name}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            size="small"
            sx={{
              color: "white",
              zIndex: 1,
              bgcolor: "rgba(255,255,255,0.12)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
            }}
          >
            <EditIcon />
          </IconButton>
        </Box>

        {/* Search */}
        <Box sx={{ p: 1.5, bgcolor: "transparent" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(255,255,255,0.9)",
                borderRadius: 3,
                border: `1px solid ${chatPalette.line}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                "& fieldset": { border: "none" },
                "&:hover": { boxShadow: "0 12px 28px rgba(15, 23, 42, 0.1)" },
                "&.Mui-focused": {
                  bgcolor: "#fff",
                  border: `1px solid ${chatPalette.accent}`,
                  boxShadow: `0 0 0 3px ${chatPalette.accentSoft}`,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: chatPalette.muted, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Messages Label */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "transparent" }}>
          <Typography className="chat-display" sx={{ fontWeight: 700, fontSize: 15, color: chatPalette.ink }}>
            All Chats
          </Typography>
          <Chip
            size="small"
            label={`${Object.values(presence).filter(p => p?.isOnline).length} online`}
            sx={{ 
              height: 22,
              fontSize: 11,
              bgcolor: chatPalette.accentSoft,
              color: chatPalette.accentDark,
              fontWeight: 600,
            }}
          />
        </Box>

        {/* Conversations List */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(31, 157, 138, 0.25)",
              borderRadius: 8,
            },
            "&::-webkit-scrollbar-track": { background: "transparent" },
          }}
        >
          {/* Existing Conversations */}
          {conversations.map((conv, index) => {
            const otherUserId = conv.participants.find((p) => p !== user?.id);
            if (!otherUserId) return null;
            const unread = getUnreadCount(conv);
            const isSelected = selectedConversation?.id === conv.id;
            const userPresence = presence[otherUserId];
            // Use realtime typing state for selected conversation, fallback to conv.typing for others
            const isTyping = isSelected ? typingUsers[otherUserId] : conv.typing?.[otherUserId];
            const userLocation = allUserLocations.get(otherUserId);

            return (
              <Box
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  py: 1.5,
                  mx: 1,
                  my: 0.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  bgcolor: isSelected ? "rgba(31, 157, 138, 0.12)" : "transparent",
                  border: isSelected ? `1px solid ${chatPalette.accentSoft}` : "1px solid transparent",
                  boxShadow: isSelected ? "0 10px 24px rgba(15, 23, 42, 0.08)" : "none",
                  transition: "all 0.2s ease",
                  "&:hover": { bgcolor: "rgba(31, 157, 138, 0.08)", border: `1px solid ${chatPalette.line}` },
                  animation: "fadeSlide 0.4s ease both",
                  animationDelay: `${Math.min(index, 6) * 0.04}s`,
                }}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={
                    userPresence?.isOnline ? (
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          bgcolor: chatPalette.success,
                          border: "2px solid rgba(255,255,255,0.9)",
                          borderRadius: "50%",
                          boxShadow: "0 4px 10px rgba(34, 197, 94, 0.35)",
                        }}
                      />
                    ) : null
                  }
                >
                  {/* Story ring wrapper */}
                  <Box
                    onClick={(e) => {
                      const storyGroup = userStories.get(otherUserId);
                      if (storyGroup && storyGroup.stories.length > 0) {
                        e.stopPropagation();
                        handleAvatarClick(otherUserId);
                      }
                    }}
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      p: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: userStories.get(otherUserId)?.hasUnviewed
                        ? "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                        : userStories.get(otherUserId)
                        ? "linear-gradient(45deg, #d1d5db, #9ca3af)"
                        : "transparent",
                      cursor: userStories.get(otherUserId) ? "pointer" : "default",
                    }}
                  >
                    <Avatar
                      src={profilePictures[otherUserId]}
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: getRoleColor(conv.participantRoles[otherUserId]),
                        border: "2px solid white",
                      }}
                    >
                      {!profilePictures[otherUserId] && getRoleIcon(conv.participantRoles[otherUserId])}
                    </Avatar>
                  </Box>
                </Badge>
                <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: unread > 0 ? 600 : 400,
                      fontSize: 14,
                      color: chatPalette.ink,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conv.participantNames[otherUserId]}
                  </Typography>
                  {/* Location only visible to admins for regular users */}
                  {isAdmin && conv.participantRoles[otherUserId] === "user" && userLocation?.address && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                      <LocationOnIcon sx={{ fontSize: 10, color: chatPalette.accent }} />
                      <Typography
                        sx={{
                          color: chatPalette.accent,
                          fontSize: 11,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 180,
                        }}
                      >
                        {userLocation.address}
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography
                      sx={{
                        color: isTyping ? chatPalette.accent : unread > 0 ? chatPalette.ink : chatPalette.muted,
                        fontSize: 14,
                        fontWeight: unread > 0 ? 500 : 400,
                        fontStyle: isTyping ? "italic" : "normal",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 180,
                      }}
                    >
                      {isTyping ? "Typing..." : conv.lastMessage || "Start a conversation"}
                    </Typography>
                    {conv.lastMessageTime && !isTyping && (
                      <Typography sx={{ color: chatPalette.muted, fontSize: 14 }}>
                        · {formatMessageTime(conv.lastMessageTime)}
                      </Typography>
                    )}
                  </Stack>
                </Box>
                {unread > 0 && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      bgcolor: chatPalette.accent,
                      borderRadius: "50%",
                      ml: 1,
                    }}
                  />
                )}
              </Box>
            );
          })}

          {/* Users without conversations */}
          {usersWithoutConversation.length > 0 && (
            <>
              {conversations.length > 0 && (
                <Typography sx={{ px: 2, py: 1.5, color: chatPalette.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>
                  SUGGESTED
                </Typography>
              )}
              {usersWithoutConversation.map((chatUser, index) => {
                const userPresence = presence[chatUser.id];
                const userLocation = allUserLocations.get(chatUser.id);

                return (
                  <Box
                    key={chatUser.id}
                    onClick={() => handleSelectUser(chatUser)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      py: 1.5,
                      mx: 1,
                      my: 0.5,
                      borderRadius: 3,
                      cursor: "pointer",
                      border: "1px solid transparent",
                      transition: "all 0.2s ease",
                      "&:hover": { bgcolor: "rgba(31, 157, 138, 0.08)", border: `1px solid ${chatPalette.line}` },
                      animation: "fadeSlide 0.4s ease both",
                      animationDelay: `${Math.min(index, 6) * 0.04}s`,
                    }}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={
                        userPresence?.isOnline ? (
                          <Box
                            sx={{
                              width: 14,
                              height: 14,
                              bgcolor: chatPalette.success,
                              border: "2px solid rgba(255,255,255,0.9)",
                              borderRadius: "50%",
                              boxShadow: "0 4px 10px rgba(34, 197, 94, 0.35)",
                            }}
                          />
                        ) : null
                      }
                    >
                      {/* Story ring wrapper */}
                      <Box
                        onClick={(e) => {
                          const storyGroup = userStories.get(chatUser.id);
                          if (storyGroup && storyGroup.stories.length > 0) {
                            e.stopPropagation();
                            handleAvatarClick(chatUser.id);
                          }
                        }}
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          p: "3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: userStories.get(chatUser.id)?.hasUnviewed
                            ? "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                            : userStories.get(chatUser.id)
                            ? "linear-gradient(45deg, #d1d5db, #9ca3af)"
                            : "transparent",
                          cursor: userStories.get(chatUser.id) ? "pointer" : "default",
                        }}
                      >
                        <Avatar
                          src={profilePictures[chatUser.id]}
                          sx={{
                            width: 52,
                            height: 52,
                            bgcolor: getRoleColor(chatUser.role),
                            border: "2px solid white",
                          }}
                        >
                          {!profilePictures[chatUser.id] && getRoleIcon(chatUser.role)}
                        </Avatar>
                      </Box>
                    </Badge>
                    <Box sx={{ ml: 1.5, flex: 1 }}>
                      <Typography sx={{ fontWeight: 400, fontSize: 14, color: chatPalette.ink }}>
                        {chatUser.name}
                      </Typography>
                      {/* Location only visible to admins for regular users */}
                      {isAdmin && chatUser.role === "user" && userLocation?.address && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                          <LocationOnIcon sx={{ fontSize: 10, color: chatPalette.accent }} />
                          <Typography
                            sx={{
                              color: chatPalette.accent,
                              fontSize: 11,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 180,
                            }}
                          >
                            {userLocation.address}
                          </Typography>
                        </Stack>
                      )}
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          label={chatUser.role.toUpperCase()}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            fontWeight: 600,
                            bgcolor: getRoleColor(chatUser.role),
                            color: "#fff",
                            boxShadow: "0 6px 12px rgba(15, 23, 42, 0.12)",
                          }}
                        />
                        {userPresence && !userPresence.isOnline && (
                          <Typography sx={{ color: chatPalette.muted, fontSize: 12 }}>
                            · {formatLastActive(userPresence.lastActive)}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </>
          )}
        </Box>
      </Box>

      {/* Chat Area */}
      <Box
        sx={{
          flex: 1,
          display: { xs: showMobileChat ? "flex" : "none", md: "flex" },
          flexDirection: "column",
          bgcolor: chatPalette.shellAlt,
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(31, 157, 138, 0.12), transparent 42%), radial-gradient(circle at 90% 8%, rgba(14, 165, 233, 0.12), transparent 45%), linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(246,243,238,0.9) 100%)",
          position: "relative",
          overflow: "hidden",
          "& > *": { position: "relative", zIndex: 1 },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(15, 23, 42, 0.035) 0, rgba(15, 23, 42, 0.035) 1px, transparent 1px, transparent 12px)",
            opacity: 0.35,
            pointerEvents: "none",
          },
        }}
      >
        {selectedUser && selectedConversation ? (
          <>
            {/* Chat Header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: chatPalette.header,
                color: "white",
                minHeight: 65,
                boxShadow: chatPalette.headerShadow,
                position: "relative",
                overflow: "hidden",
                "& > *": { position: "relative", zIndex: 1 },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.2), transparent 35%), radial-gradient(circle at 85% 0%, rgba(255,255,255,0.14), transparent 40%)",
                  opacity: 0.9,
                  pointerEvents: "none",
                },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconButton
                  onClick={() => setShowMobileChat(false)}
                  sx={{
                    display: { xs: "flex", md: "none" },
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.12)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                  }}
                  size="small"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={
                    presence[selectedUser.id]?.isOnline ? (
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          bgcolor: chatPalette.success,
                          border: "2px solid rgba(255,255,255,0.8)",
                          borderRadius: "50%",
                          boxShadow: "0 4px 10px rgba(34, 197, 94, 0.35)",
                        }}
                      />
                    ) : null
                  }
                >
                  {/* Story ring wrapper */}
                  <Box
                    onClick={() => {
                      const storyGroup = userStories.get(selectedUser.id);
                      if (storyGroup && storyGroup.stories.length > 0) {
                        handleAvatarClick(selectedUser.id);
                      }
                    }}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      p: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: userStories.get(selectedUser.id)?.hasUnviewed
                        ? "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                        : userStories.get(selectedUser.id)
                        ? "linear-gradient(45deg, #d1d5db, #9ca3af)"
                        : "transparent",
                      cursor: userStories.get(selectedUser.id) ? "pointer" : "default",
                    }}
                  >
                    <Avatar
                      src={profilePictures[selectedUser.id]}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: "rgba(255,255,255,0.18)",
                        border: "2px solid white",
                      }}
                    >
                      {!profilePictures[selectedUser.id] && getRoleIcon(selectedUser.role)}
                    </Avatar>
                  </Box>
                </Badge>
                <Box>
                  <Typography className="chat-display" sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>
                    {selectedUser.name}
                  </Typography>
                  {isAdmin && selectedUser.role === "user" && selectedUserLocation?.address ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <LocationOnIcon sx={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedUserLocation.address}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
                      {presence[selectedUser.id]?.isOnline
                        ? "● Online"
                        : presence[selectedUser.id]?.lastActive
                        ? formatLastActive(presence[selectedUser.id].lastActive)
                        : "Offline"}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Voice Call">
                  <IconButton 
                    onClick={handleVoiceCall}
                    disabled={isInCall}
                    sx={{ 
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                    }}
                  >
                    <CallIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Video Call">
                  <IconButton 
                    onClick={handleVideoCall}
                    disabled={isInCall}
                    sx={{ 
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                    }}
                  >
                    <VideocamIcon />
                  </IconButton>
                </Tooltip>
                {/* Location icon - only visible to admins */}
                {isAdmin && selectedUser?.role === "user" && (
                  <Tooltip title="View Location">
                    <IconButton 
                      onClick={() => setShowLocationModal(true)}
                      disabled={!selectedUserLocation}
                      sx={{ 
                        color: selectedUserLocation ? "white" : "rgba(255,255,255,0.5)",
                        bgcolor: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                      }}
                    >
                      <LocationOnIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>

            {/* Messages Area */}
            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                p: 2,
                display: "flex",
                flexDirection: "column",
                animation: "chatRise 0.4s ease",
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": { width: 8 },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(15, 118, 110, 0.25)",
                  borderRadius: 8,
                },
                "&::-webkit-scrollbar-track": { background: "transparent" },
              }}
            >
              {/* User Info at top of chat */}
              {messages.length === 0 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: 4,
                    pb: 3,
                    px: 3,
                    mx: "auto",
                    maxWidth: 360,
                    bgcolor: "rgba(255,255,255,0.82)",
                    borderRadius: 4,
                    border: `1px solid ${chatPalette.line}`,
                    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Story ring wrapper */}
                  <Box
                    onClick={() => {
                      const storyGroup = userStories.get(selectedUser.id);
                      if (storyGroup && storyGroup.stories.length > 0) {
                        handleAvatarClick(selectedUser.id);
                      }
                    }}
                    sx={{
                      width: 104,
                      height: 104,
                      borderRadius: "50%",
                      p: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1,
                      background: userStories.get(selectedUser.id)?.hasUnviewed
                        ? "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                        : userStories.get(selectedUser.id)
                        ? "linear-gradient(45deg, #d1d5db, #9ca3af)"
                        : "transparent",
                      cursor: userStories.get(selectedUser.id) ? "pointer" : "default",
                    }}
                  >
                    <Avatar
                      src={profilePictures[selectedUser.id]}
                      sx={{
                        width: 96,
                        height: 96,
                        bgcolor: getRoleColor(selectedUser.role),
                        border: "3px solid white",
                        boxShadow: "0 14px 28px rgba(15, 23, 42, 0.2)",
                      }}
                    >
                      {!profilePictures[selectedUser.id] && getRoleIcon(selectedUser.role)}
                    </Avatar>
                  </Box>
                  <Typography className="chat-display" sx={{ fontWeight: 700, fontSize: 20 }}>
                    {selectedUser.name}
                  </Typography>
                  <Typography sx={{ color: chatPalette.muted, fontSize: 14 }}>
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)} · PO-VERSE
                  </Typography>
                </Box>
              )}

              {/* Messages */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <Stack spacing={0.5}>
                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.id;
                    const showTime = index === 0 || 
                      new Date(msg.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000;
                    const messageTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                    return (
                      <Box key={msg.id}>
                        {showTime && (
                          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                            <Chip
                              size="small"
                              label={formatMessageTime(msg.timestamp)}
                              sx={{
                                bgcolor: "rgba(255,255,255,0.7)",
                                border: `1px solid ${chatPalette.line}`,
                                fontSize: 11,
                                fontWeight: 500,
                                height: 24,
                                boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
                                backdropFilter: "blur(6px)",
                              }}
                            />
                          </Box>
                        )}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: isMe ? "flex-end" : "flex-start",
                            alignItems: "flex-end",
                            mb: 0.5,
                            px: 1,
                            gap: 0.5,
                          }}
                        >
                          {/* Avatar for received messages */}
                          {!isMe && (
                            <Avatar
                              src={profilePictures[msg.senderId] || msg.senderAvatar || selectedUser?.profilePicture}
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: getRoleColor(msg.senderRole),
                                opacity: showAvatar ? 1 : 0,
                                fontSize: 12,
                              }}
                            >
                              {msg.senderName?.charAt(0) || "?"}
                            </Avatar>
                          )}
                          
                          {/* Message bubble */}
                          <Box
                            onContextMenu={(e) => handleMessageLongPress(e, msg)}
                            onTouchStart={(e) => {
                              longPressTimerRef.current = setTimeout(() => {
                                handleMessageLongPress(e, msg);
                              }, 500);
                            }}
                            onTouchEnd={() => {
                              if (longPressTimerRef.current) {
                                clearTimeout(longPressTimerRef.current);
                              }
                            }}
                            sx={{
                              maxWidth: { xs: "78%", md: "68%" },
                              minWidth: 80,
                              background: msg.deleted ? "rgba(100,100,100,0.3)" : isMe ? chatPalette.bubbleMe : chatPalette.bubbleOther,
                              color: isMe ? "#fff" : chatPalette.ink,
                              py: 0.75,
                              px: 1.5,
                              borderRadius: isMe
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                              position: "relative",
                              border: isMe ? "1px solid rgba(255,255,255,0.18)" : `1px solid ${chatPalette.bubbleOtherBorder}`,
                              boxShadow: isMe
                                ? "0 10px 20px rgba(15, 23, 42, 0.15)"
                                : "0 8px 16px rgba(15, 23, 42, 0.08)",
                              backdropFilter: isMe ? "none" : "blur(6px)",
                              animation: "bubbleIn 0.2s ease both",
                              cursor: "pointer",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              "&:active": { transform: "scale(0.98)" },
                            }}
                          >
                            {/* Reply preview */}
                            {msg.replyTo && (
                              <Box
                                sx={{
                                  mb: 0.75,
                                  p: 0.75,
                                  bgcolor: isMe ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)",
                                  borderRadius: 2,
                                  borderLeft: `3px solid ${isMe ? "rgba(255,255,255,0.5)" : chatPalette.accent}`,
                                }}
                              >
                                <Typography sx={{ fontSize: 11, fontWeight: 600, color: isMe ? "rgba(255,255,255,0.9)" : chatPalette.accent }}>
                                  {msg.replyTo.senderName}
                                </Typography>
                                <Typography sx={{ fontSize: 11, opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {msg.replyTo.type === "audio" ? "🎵 Voice message" : msg.replyTo.type === "image" ? "📷 Photo" : msg.replyTo.content}
                                </Typography>
                              </Box>
                            )}

                            {/* Attachment rendering */}
                            {msg.attachment && (
                              <Box sx={{ mb: msg.content && msg.type !== "audio" ? 0.75 : 0 }}>
                                {/* Image attachment */}
                                {msg.attachment.type === "image" && (
                                  <Box
                                    component="img"
                                    src={msg.attachment.url}
                                    alt={msg.attachment.name}
                                    sx={{
                                      maxWidth: "100%",
                                      maxHeight: 250,
                                      borderRadius: 2,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => window.open(msg.attachment?.url, "_blank")}
                                  />
                                )}

                                {/* Video attachment */}
                                {msg.attachment.type === "video" && (
                                  <Box
                                    component="video"
                                    src={msg.attachment.url}
                                    controls
                                    sx={{
                                      maxWidth: "100%",
                                      maxHeight: 250,
                                      borderRadius: 2,
                                    }}
                                  />
                                )}

                                {/* Audio attachment */}
                                {msg.attachment.type === "audio" && (
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handlePlayAudio(msg.id, msg.attachment!.url)}
                                      sx={{
                                        bgcolor: isMe ? "rgba(255,255,255,0.2)" : chatPalette.accentSoft,
                                        "&:hover": { bgcolor: isMe ? "rgba(255,255,255,0.3)" : chatPalette.accentGlow },
                                      }}
                                    >
                                      {playingAudioId === msg.id ? (
                                        <PauseIcon sx={{ color: isMe ? "#fff" : chatPalette.accent, fontSize: 20 }} />
                                      ) : (
                                        <PlayArrowIcon sx={{ color: isMe ? "#fff" : chatPalette.accent, fontSize: 20 }} />
                                      )}
                                    </IconButton>
                                    <Box sx={{ flex: 1, height: 4, bgcolor: isMe ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)", borderRadius: 2 }}>
                                      <Box sx={{ width: playingAudioId === msg.id ? "100%" : "0%", height: "100%", bgcolor: isMe ? "#fff" : chatPalette.accent, borderRadius: 2, transition: "width 0.1s linear" }} />
                                    </Box>
                                    <AudioFileIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                                  </Stack>
                                )}

                                {/* Document attachment */}
                                {(msg.attachment.type === "document" || msg.attachment.type === "file") && (
                                  <Box
                                    onClick={() => window.open(msg.attachment?.url, "_blank")}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      p: 1,
                                      bgcolor: isMe ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)",
                                      borderRadius: 2,
                                      cursor: "pointer",
                                      "&:hover": { bgcolor: isMe ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)" },
                                    }}
                                  >
                                    {msg.attachment.mimeType?.includes("pdf") ? (
                                      <PictureAsPdfIcon sx={{ color: "#ef4444" }} />
                                    ) : (
                                      <InsertDriveFileIcon sx={{ color: isMe ? "#fff" : chatPalette.accent }} />
                                    )}
                                    <Box sx={{ flex: 1, overflow: "hidden" }}>
                                      <Typography sx={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {msg.attachment.name}
                                      </Typography>
                                      {msg.attachment.size && (
                                        <Typography sx={{ fontSize: 11, opacity: 0.7 }}>
                                          {formatFileSize(msg.attachment.size)}
                                        </Typography>
                                      )}
                                    </Box>
                                    <DownloadIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                                  </Box>
                                )}
                              </Box>
                            )}

                            {/* Call record rendering */}
                            {msg.type === "call" && msg.callRecord && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  py: 0.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: msg.callRecord.status === "missed" || msg.callRecord.status === "declined"
                                      ? "rgba(239, 68, 68, 0.2)"
                                      : "rgba(34, 197, 94, 0.2)",
                                  }}
                                >
                                  {msg.callRecord.status === "missed" ? (
                                    <PhoneMissedIcon sx={{ 
                                      color: "#ef4444", 
                                      fontSize: 20 
                                    }} />
                                  ) : msg.callRecord.status === "declined" ? (
                                    <CallIcon sx={{ 
                                      color: "#ef4444", 
                                      fontSize: 20,
                                      transform: "rotate(135deg)"
                                    }} />
                                  ) : isMe ? (
                                    <CallMadeIcon sx={{ 
                                      color: "#22c55e", 
                                      fontSize: 20 
                                    }} />
                                  ) : (
                                    <CallReceivedIcon sx={{ 
                                      color: "#22c55e", 
                                      fontSize: 20 
                                    }} />
                                  )}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ 
                                    fontSize: 13, 
                                    fontWeight: 500,
                                    color: isMe ? "#fff" : chatPalette.ink 
                                  }}>
                                    {msg.callRecord.type === "video" ? "Video call" : "Voice call"}
                                  </Typography>
                                  <Typography sx={{ 
                                    fontSize: 11, 
                                    opacity: 0.7,
                                    color: isMe ? "rgba(255,255,255,0.7)" : chatPalette.muted
                                  }}>
                                    {msg.callRecord.status === "missed" 
                                      ? "Missed" 
                                      : msg.callRecord.status === "declined"
                                      ? "Declined"
                                      : msg.callRecord.duration
                                      ? `${Math.floor(msg.callRecord.duration / 60)}:${(msg.callRecord.duration % 60).toString().padStart(2, "0")}`
                                      : "Ended"}
                                  </Typography>
                                </Box>
                                {msg.callRecord.type === "video" ? (
                                  <VideocamIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                                ) : (
                                  <CallIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                                )}
                              </Box>
                            )}

                            {/* Text content */}
                            {msg.content && msg.type !== "audio" && msg.type !== "call" && (
                              <Typography
                                sx={{
                                  fontSize: 14,
                                  lineHeight: 1.4,
                                  wordBreak: "break-word",
                                  whiteSpace: "pre-wrap",
                                  fontStyle: msg.deleted ? "italic" : "normal",
                                  opacity: msg.deleted ? 0.7 : 1,
                                }}
                              >
                                {msg.content}
                              </Typography>
                            )}

                            {/* Timestamp and read status */}
                            <Stack 
                              direction="row" 
                              spacing={0.5} 
                              alignItems="center"
                              justifyContent="flex-end"
                              sx={{ mt: 0.25 }}
                            >
                              <Typography sx={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.7)" : chatPalette.muted }}>
                                {messageTime}
                              </Typography>
                              {isMe && (
                                <DoneAllIcon
                                  sx={{
                                    fontSize: 14,
                                    color: msg.read ? chatPalette.success : "rgba(255,255,255,0.5)",
                                  }}
                                />
                              )}
                            </Stack>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isOtherUserTyping && (
                    <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "center", mb: 0.5, px: 1, gap: 0.5 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: getRoleColor(selectedUser?.role || "user"), fontSize: 12 }}>
                        {selectedUser?.name?.charAt(0) || "?"}
                      </Avatar>
                      <Box
                        sx={{
                          bgcolor: "rgba(255,255,255,0.85)",
                          border: `1px solid ${chatPalette.line}`,
                          boxShadow: "0 8px 16px rgba(15, 23, 42, 0.08)",
                          py: 1,
                          px: 1.5,
                          borderRadius: "16px 16px 16px 4px",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            "& span": {
                              width: 6,
                              height: 6,
                              bgcolor: chatPalette.muted,
                              borderRadius: "50%",
                              animation: "typing 1.4s infinite",
                            },
                            "& span:nth-of-type(2)": { animationDelay: "0.2s" },
                            "& span:nth-of-type(3)": { animationDelay: "0.4s" },
                            "@keyframes typing": {
                              "0%, 60%, 100%": { opacity: 0.3, transform: "translateY(0)" },
                              "30%": { opacity: 1, transform: "translateY(-3px)" },
                            },
                          }}
                        >
                          <span />
                          <span />
                          <span />
                        </Box>
                      </Box>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Stack>
              </Box>
            </Box>

            {/* Message Input */}
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.95)",
                borderTop: `1px solid ${chatPalette.line}`,
                boxShadow: "0 -12px 24px rgba(15, 23, 42, 0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              {/* Upload progress */}
              {isUploading && (
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ 
                    height: 3,
                    bgcolor: "rgba(31, 157, 138, 0.1)",
                    "& .MuiLinearProgress-bar": { bgcolor: chatPalette.accent },
                  }}
                />
              )}

              {/* Reply preview */}
              {replyingTo && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: "rgba(31, 157, 138, 0.08)",
                    borderLeft: `3px solid ${chatPalette.accent}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ flex: 1, overflow: "hidden" }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <ReplyIcon sx={{ fontSize: 14, color: chatPalette.accent }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: chatPalette.accent }}>
                        Replying to {replyingTo.senderName}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: chatPalette.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {replyingTo.type === "audio" ? "🎵 Voice message" : replyingTo.type === "image" ? "📷 Photo" : replyingTo.content}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )}

              {/* Recording UI */}
              {isRecording ? (
                <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
                  <IconButton onClick={cancelRecording} sx={{ color: "error.main" }}>
                    <CloseIcon />
                  </IconButton>
                  <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: "error.main",
                        borderRadius: "50%",
                        animation: "pulse 1s infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.5 },
                        },
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, color: chatPalette.ink }}>
                      Recording... {formatRecordingTime(recordingTime)}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={stopRecording}
                    sx={{
                      background: chatPalette.header,
                      color: "#fff",
                      width: 44,
                      height: 44,
                      "&:hover": { background: "linear-gradient(135deg, #0b6b62 0%, #0c91d2 100%)" },
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ p: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {/* Emoji picker */}
                    <Box sx={{ position: "relative" }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        sx={{ 
                          bgcolor: showEmojiPicker ? chatPalette.accentSoft : "rgba(255,255,255,0.9)",
                          border: `1px solid ${chatPalette.line}`,
                          "&:hover": { bgcolor: chatPalette.accentSoft },
                        }}
                      >
                        <EmojiEmotionsIcon sx={{ color: chatPalette.accent, fontSize: 20 }} />
                      </IconButton>
                      {/* Quick emoji picker */}
                      {showEmojiPicker && (
                        <Paper
                          ref={emojiPickerRef}
                          sx={{
                            position: "absolute",
                            bottom: 50,
                            left: 0,
                            p: 1,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            maxWidth: 280,
                            borderRadius: 3,
                            boxShadow: "0 16px 32px rgba(15, 23, 42, 0.15)",
                            zIndex: 1000,
                          }}
                        >
                          {QUICK_EMOJIS.map((emoji) => (
                            <IconButton
                              key={emoji}
                              size="small"
                              onClick={() => handleEmojiSelect(emoji)}
                              sx={{ fontSize: 20, width: 36, height: 36 }}
                            >
                              {emoji}
                            </IconButton>
                          ))}
                        </Paper>
                      )}
                    </Box>

                    {/* Attachment menu */}
                    <IconButton 
                      size="small" 
                      onClick={(e) => setAttachMenuAnchor(e.currentTarget)}
                      sx={{ 
                        bgcolor: "rgba(255,255,255,0.9)",
                        border: `1px solid ${chatPalette.line}`,
                        "&:hover": { bgcolor: chatPalette.accentSoft },
                      }}
                    >
                      <AttachFileIcon sx={{ color: chatPalette.accent, fontSize: 20 }} />
                    </IconButton>

                    {/* Hidden file inputs */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleImageSelect}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={handleVideoSelect}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      hidden
                      onChange={handleDocumentSelect}
                    />

                    {/* Text input */}
                    <Box
                      sx={{
                        flex: 1,
                        bgcolor: "rgba(255,255,255,0.95)",
                        borderRadius: 6,
                        border: `1px solid ${chatPalette.line}`,
                        overflow: "hidden",
                      }}
                    >
                      <TextField
                        inputRef={inputRef}
                        fullWidth
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        multiline
                        maxRows={4}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": { border: "none" },
                          },
                          "& .MuiInputBase-input": {
                            py: 1,
                            px: 1.5,
                            fontSize: 15,
                            color: chatPalette.ink,
                          },
                        }}
                        size="small"
                      />
                    </Box>

                    {/* Send or Mic button */}
                    {newMessage.trim() ? (
                      <IconButton
                        onClick={() => handleSendMessage()}
                        disabled={isSending}
                        sx={{
                          background: chatPalette.header,
                          color: "#fff",
                          width: 40,
                          height: 40,
                          boxShadow: "0 8px 20px rgba(14, 165, 233, 0.35)",
                          "&:hover": { background: "linear-gradient(135deg, #0b6b62 0%, #0c91d2 100%)" },
                          "&:disabled": { bgcolor: "#d1d5db" },
                        }}
                      >
                        <SendIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    ) : (
                      <IconButton 
                        onClick={startRecording}
                        sx={{ 
                          bgcolor: "rgba(255,255,255,0.9)",
                          border: `1px solid ${chatPalette.line}`,
                          width: 40,
                          height: 40,
                          "&:hover": { bgcolor: chatPalette.accentSoft },
                        }}
                      >
                        <MicIcon sx={{ color: chatPalette.accent, fontSize: 20 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Attachment menu popover */}
            <Menu
              anchorEl={attachMenuAnchor}
              open={Boolean(attachMenuAnchor)}
              onClose={() => setAttachMenuAnchor(null)}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              transformOrigin={{ vertical: "bottom", horizontal: "center" }}
              PaperProps={{
                sx: { borderRadius: 3, minWidth: 200, boxShadow: "0 16px 32px rgba(15, 23, 42, 0.15)" },
              }}
            >
              <MenuItem onClick={() => { imageInputRef.current?.click(); setAttachMenuAnchor(null); }}>
                <ListItemIcon><PhotoLibraryIcon sx={{ color: "#10b981" }} /></ListItemIcon>
                <ListItemText primary="Photo" secondary="Send an image" />
              </MenuItem>
              <MenuItem onClick={() => { videoInputRef.current?.click(); setAttachMenuAnchor(null); }}>
                <ListItemIcon><VideoFileIcon sx={{ color: "#8b5cf6" }} /></ListItemIcon>
                <ListItemText primary="Video" secondary="Send a video" />
              </MenuItem>
              <MenuItem onClick={() => { fileInputRef.current?.click(); setAttachMenuAnchor(null); }}>
                <ListItemIcon><InsertDriveFileIcon sx={{ color: "#f59e0b" }} /></ListItemIcon>
                <ListItemText primary="Document" secondary="PDF, Word, Excel" />
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setShowDocumentPicker(true); setAttachMenuAnchor(null); }}>
                <ListItemIcon><AttachFileIcon sx={{ color: chatPalette.accent }} /></ListItemIcon>
                <ListItemText primary="Company Document" secondary="Share from library" />
              </MenuItem>
            </Menu>

            {/* Audio player (hidden) */}
            <audio ref={audioPlayerRef} style={{ display: "none" }} />
          </>
        ) : (
          /* Empty State */
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 3,
              bgcolor: "transparent",
              animation: "chatRise 0.6s ease",
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                background: chatPalette.header,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 20px 40px rgba(14, 165, 233, 0.3)",
              }}
            >
              <SendIcon sx={{ fontSize: 50, color: "#fff", transform: "rotate(-25deg)" }} />
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography className="chat-display" sx={{ fontSize: 24, fontWeight: 700, color: chatPalette.ink }}>
                Your Messages
              </Typography>
              <Typography sx={{ color: chatPalette.muted, fontSize: 15, mt: 1 }}>
                Select a conversation or start a new chat
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{
                background: chatPalette.header,
                color: "#fff",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: 15,
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "0 16px 32px rgba(14, 165, 233, 0.3)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0b6b62 0%, #0c91d2 100%)",
                },
              }}
            >
              Start New Chat
            </Button>
          </Box>
        )}
      </Box>

      {/* Location Modal - Snapchat Style */}
      <Dialog
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, overflow: "hidden", boxShadow: "0 30px 60px rgba(15, 23, 42, 0.2)" }
        }}
      >
        <DialogTitle sx={{ 
          background: chatPalette.header,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          "& > *": { position: "relative", zIndex: 1 },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.12), transparent 40%)",
            opacity: 0.9,
            pointerEvents: "none",
          },
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: getRoleColor(selectedUser?.role || "user"),
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 10px 22px rgba(15, 23, 42, 0.25)",
              }}
            >
              {getRoleIcon(selectedUser?.role || "user")}
            </Avatar>
            <Box>
              <Typography className="chat-display" fontWeight={700}>
                {selectedUser?.name || "User"}&apos;s Location
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {selectedUserLocation 
                  ? `Last updated: ${new Date(selectedUserLocation.timestamp).toLocaleString()}`
                  : "Location not available"}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setShowLocationModal(false)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 400 }}>
          {selectedUserLocation ? (
            <>
              <Box
                ref={locationMapRef}
                sx={{
                  width: "100%",
                  height: 300,
                  bgcolor: "grey.200",
                }}
              />
              {!locationMapLoaded && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <CircularProgress sx={{ color: chatPalette.accent }} />
                </Box>
              )}
              <Card
                sx={{
                  m: 2,
                  p: 2,
                  bgcolor: "rgba(255,255,255,0.9)",
                  borderRadius: 3,
                  border: `1px solid ${chatPalette.line}`,
                  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: chatPalette.header,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 12px 24px rgba(14, 165, 233, 0.3)",
                    }}
                  >
                    <LocationOnIcon sx={{ color: "white" }} />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="body2" color="text.secondary">
                      Current Location
                    </Typography>
                    <Typography fontWeight={500}>
                      {selectedUserLocation.address || `${selectedUserLocation.latitude.toFixed(6)}, ${selectedUserLocation.longitude.toFixed(6)}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Accuracy: {selectedUserLocation.accuracy ? `±${Math.round(selectedUserLocation.accuracy)}m` : "Unknown"}
                    </Typography>
                  </Box>
                  <Chip
                    label="Get Directions"
                    size="small"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selectedUserLocation.latitude},${selectedUserLocation.longitude}`,
                        "_blank"
                      );
                    }}
                    sx={{
                      cursor: "pointer",
                      bgcolor: chatPalette.accent,
                      color: "#fff",
                      fontWeight: 600,
                      boxShadow: "0 10px 18px rgba(31, 157, 138, 0.3)",
                      "&:hover": { bgcolor: chatPalette.accentDark },
                    }}
                  />
                </Stack>
              </Card>
            </>
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
              }}
            >
              <LocationOnIcon sx={{ fontSize: 64, color: "grey.300", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Location not available
              </Typography>
              <Typography color="text.secondary" textAlign="center">
                This user hasn&apos;t shared their location yet
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Picker Dialog */}
      <Dialog
        open={showDocumentPicker}
        onClose={() => {
          setShowDocumentPicker(false);
          setDocumentSearchQuery("");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, boxShadow: "0 30px 60px rgba(15, 23, 42, 0.2)" }
        }}
      >
        <DialogTitle sx={{ 
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${chatPalette.line}`,
          bgcolor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AttachFileIcon sx={{ color: chatPalette.accent }} />
            <Typography className="chat-display" fontWeight={700}>
              Share Document
            </Typography>
          </Stack>
          <IconButton onClick={() => setShowDocumentPicker(false)} size="small" sx={{ color: chatPalette.muted }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* Search */}
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search documents..."
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: chatPalette.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgba(255,255,255,0.9)",
                  borderRadius: 2,
                  border: `1px solid ${chatPalette.line}`,
                  boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
                  "& fieldset": { border: "none" },
                  "&.Mui-focused": {
                    border: `1px solid ${chatPalette.accent}`,
                    boxShadow: `0 0 0 3px ${chatPalette.accentSoft}`,
                  },
                },
              }}
            />
          </Box>

          {/* Documents List */}
          <List
            sx={{
              maxHeight: 400,
              overflow: "auto",
              pt: 0,
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": { width: 8 },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(31, 157, 138, 0.25)",
                borderRadius: 8,
              },
              "&::-webkit-scrollbar-track": { background: "transparent" },
            }}
          >
            {loadingDocuments ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} sx={{ color: chatPalette.accent }} />
              </Box>
            ) : filteredDocuments.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <InsertDriveFileIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
                <Typography color="text.secondary">
                  {documentSearchQuery ? "No documents found" : "No documents available"}
                </Typography>
                <Button
                  href="/documents"
                  size="small"
                  sx={{
                    mt: 1,
                    color: chatPalette.accentDark,
                    "&:hover": { bgcolor: chatPalette.accentSoft },
                  }}
                >
                  Go to Documents
                </Button>
              </Box>
            ) : (
              filteredDocuments.map((doc, index) => (
                <div key={doc.id}>
                  {index > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => handleShareDocument(doc)}
                    sx={{ py: 1.5, px: 2, "&:hover": { bgcolor: "rgba(31, 157, 138, 0.08)" } }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: getDocumentCategoryInfo(doc.category).color }}>
                      {doc.type === "pdf" ? (
                        <PictureAsPdfIcon />
                      ) : doc.type === "image" ? (
                        <ImageIcon />
                      ) : doc.type === "document" ? (
                        <DescriptionIcon />
                      ) : (
                        <InsertDriveFileIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {doc.name}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={getDocumentCategoryInfo(doc.category).label}
                            sx={{ 
                              height: 18, 
                              fontSize: 10,
                              bgcolor: getDocumentCategoryInfo(doc.category).color + "20",
                              color: getDocumentCategoryInfo(doc.category).color,
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(doc.fileSize)}
                          </Typography>
                        </Stack>
                      }
                    />
                    <SendIcon sx={{ fontSize: 18, color: chatPalette.accent }} />
                  </ListItemButton>
                </div>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `1px solid ${chatPalette.line}`,
            p: 2,
            bgcolor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Button
            variant="outlined"
            size="small"
            href="/documents"
            sx={{
              borderColor: chatPalette.accent,
              color: chatPalette.accentDark,
              "&:hover": { borderColor: chatPalette.accentDark, bgcolor: chatPalette.accentSoft },
            }}
          >
            Manage Documents
          </Button>
          <Button onClick={() => setShowDocumentPicker(false)} sx={{ color: chatPalette.muted }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Context Menu */}
      <Menu
        anchorEl={messageMenuAnchor?.element}
        open={Boolean(messageMenuAnchor)}
        onClose={() => setMessageMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 160, boxShadow: "0 16px 32px rgba(15, 23, 42, 0.2)" },
        }}
      >
        <MenuItem onClick={handleCopyMessage}>
          <ListItemIcon><ContentCopyIcon sx={{ fontSize: 20 }} /></ListItemIcon>
          <ListItemText primary="Copy" />
        </MenuItem>
        <MenuItem onClick={handleReplyToMessage}>
          <ListItemIcon><ReplyIcon sx={{ fontSize: 20 }} /></ListItemIcon>
          <ListItemText primary="Reply" />
        </MenuItem>
        {messageMenuAnchor?.message.senderId === user?.id && !messageMenuAnchor?.message.deleted && (
          <MenuItem onClick={handleDeleteMessage} sx={{ color: "error.main" }}>
            <ListItemIcon><DeleteIcon sx={{ fontSize: 20, color: "error.main" }} /></ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        )}
      </Menu>

      {/* Story Viewer Dialog */}
      <Dialog
        open={selectedStoryGroup !== null}
        onClose={() => {
          setSelectedStoryGroup(null);
          setCurrentStoryIndex(0);
        }}
        fullScreen
        PaperProps={{
          sx: { bgcolor: "black" },
        }}
      >
        {selectedStoryGroup && selectedStoryGroup.stories[currentStoryIndex] && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Progress bars */}
            <Box sx={{ display: "flex", gap: 0.5, p: 1, pt: 2 }}>
              {selectedStoryGroup.stories.map((_, idx) => (
                <LinearProgress
                  key={idx}
                  variant="determinate"
                  value={idx < currentStoryIndex ? 100 : idx === currentStoryIndex ? storyProgress : 0}
                  sx={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.3)",
                    "& .MuiLinearProgress-bar": { bgcolor: "white" },
                  }}
                />
              ))}
            </Box>

            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  src={profilePictures[selectedStoryGroup.userId]}
                  sx={{ width: 40, height: 40, border: "2px solid white" }}
                >
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600} color="white">
                    {selectedStoryGroup.userName}
                  </Typography>
                  <Typography variant="caption" color="grey.400">
                    {formatStoryTime(selectedStoryGroup.stories[currentStoryIndex].createdAt)}
                  </Typography>
                </Box>
              </Stack>
              <IconButton
                onClick={() => {
                  setSelectedStoryGroup(null);
                  setCurrentStoryIndex(0);
                }}
                sx={{ color: "white" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Story Content */}
            <Box
              sx={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseDown={() => setIsStoryPaused(true)}
              onMouseUp={() => setIsStoryPaused(false)}
              onMouseLeave={() => setIsStoryPaused(false)}
              onTouchStart={() => setIsStoryPaused(true)}
              onTouchEnd={() => setIsStoryPaused(false)}
            >
              {/* Navigation areas */}
              <Box
                onClick={handlePrevStory}
                sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30%", cursor: "pointer", zIndex: 10 }}
              />
              <Box
                onClick={handleNextStory}
                sx={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "30%", cursor: "pointer", zIndex: 10 }}
              />

              {/* Story content */}
              {(() => {
                const story = selectedStoryGroup.stories[currentStoryIndex];
                if (story.type === "image" && story.mediaUrl) {
                  return (
                    <Box
                      component="img"
                      src={story.mediaUrl}
                      alt="Story"
                      sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  );
                }
                return (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      background: story.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 4,
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        color: story.textColor || "white",
                        textAlign: "center",
                        fontWeight: 600,
                        textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      {story.text || story.caption}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>

            {/* Footer with actions */}
            <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={2}>
                <IconButton onClick={handleStoryLike} sx={{ color: "white" }}>
                  {isStoryLiked ? (
                    <FavoriteIcon sx={{ color: "#ff4757" }} />
                  ) : (
                    <FavoriteIcon sx={{ opacity: 0.7 }} />
                  )}
                </IconButton>
                {/* Quick reactions */}
                <Stack direction="row" spacing={0.5}>
                  {STORY_REACTIONS.slice(0, 3).map((reaction) => (
                    <IconButton
                      key={reaction}
                      onClick={async () => {
                        const story = selectedStoryGroup.stories[currentStoryIndex];
                        await addStoryReaction(story.id, user?.id || "", reaction);
                      }}
                      size="small"
                      sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white", width: 32, height: 32 }}
                    >
                      <Typography fontSize={14}>{reaction}</Typography>
                    </IconButton>
                  ))}
                </Stack>
              </Stack>
              <Typography variant="caption" color="grey.400">
                {getTimeUntilExpiry(selectedStoryGroup.stories[currentStoryIndex].expiresAt)}
              </Typography>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
