"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Card,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import VideocamIcon from "@mui/icons-material/Videocam";
import CallIcon from "@mui/icons-material/Call";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from "@mui/icons-material/Image";
import MicIcon from "@mui/icons-material/Mic";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CloseIcon from "@mui/icons-material/Close";
import { useAppStore, useCompany } from "@/store";
import { ChatMessage, Conversation, ChatUser } from "@/types/chat";
import {
  getOrCreateConversation,
  sendMessage,
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
      return "#ef4444";
    case "admin":
      return "#f59e0b";
    default:
      return "#0095f6";
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
  const company = useCompany();
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

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth check and initial data load
  useEffect(() => {
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
  }, [isAuthenticated, user, router]);

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
                <path d="M25 0C11.2 0 0 11.2 0 25c0 17.5 25 35 25 35s25-17.5 25-35C50 11.2 38.8 0 25 0z" fill="#0095f6"/>
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

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedUser || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(
        selectedConversation.id,
        user.id,
        user.name,
        user.role,
        selectedUser.id,
        selectedUser.name,
        newMessage.trim()
      );
      setNewMessage("");
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

  // Handle back navigation
  const handleBack = () => {
    if (showMobileChat) {
      setShowMobileChat(false);
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
  const handleVideoCall = () => {
    alert("Video call feature coming soon!");
  };

  const handleVoiceCall = () => {
    alert("Voice call feature coming soon!");
  };

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
          bgcolor: "#fff",
        }}
      >
        <CircularProgress sx={{ color: "#0095f6" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", bgcolor: "#fff" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: { xs: showMobileChat ? 0 : "100%", md: 400 },
          display: { xs: showMobileChat ? "none" : "flex", md: "flex" },
          flexDirection: "column",
          borderRight: "1px solid #dbdbdb",
          overflow: "hidden",
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #dbdbdb",
            minHeight: 60,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, cursor: "pointer" }}
            >
              {user?.username || user?.name}
            </Typography>
          </Stack>
          <IconButton size="small">
            <EditIcon />
          </IconButton>
        </Box>

        {/* Search */}
        <Box sx={{ p: 2, pt: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#efefef",
                borderRadius: 2,
                "& fieldset": { border: "none" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#8e8e8e", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Messages Label */}
        <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 600, fontSize: 16 }}>Messages</Typography>
          <Typography sx={{ color: "#0095f6", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Requests
          </Typography>
        </Box>

        {/* Conversations List */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {/* Existing Conversations */}
          {conversations.map((conv) => {
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
                  cursor: "pointer",
                  bgcolor: isSelected ? "#efefef" : "transparent",
                  "&:hover": { bgcolor: "#f5f5f5" },
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
                          bgcolor: "#44b700",
                          border: "2px solid #fff",
                          borderRadius: "50%",
                        }}
                      />
                    ) : null
                  }
                >
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: getRoleColor(conv.participantRoles[otherUserId]),
                    }}
                  >
                    {getRoleIcon(conv.participantRoles[otherUserId])}
                  </Avatar>
                </Badge>
                <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: unread > 0 ? 600 : 400,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conv.participantNames[otherUserId]}
                  </Typography>
                  {userLocation?.address && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                      <LocationOnIcon sx={{ fontSize: 10, color: "#0095f6" }} />
                      <Typography
                        sx={{
                          color: "#0095f6",
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
                        color: isTyping ? "#0095f6" : unread > 0 ? "#262626" : "#8e8e8e",
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
                      <Typography sx={{ color: "#8e8e8e", fontSize: 14 }}>
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
                      bgcolor: "#0095f6",
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
                <Typography sx={{ px: 2, py: 1.5, color: "#8e8e8e", fontSize: 12, fontWeight: 600 }}>
                  SUGGESTED
                </Typography>
              )}
              {usersWithoutConversation.map((chatUser) => {
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
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#f5f5f5" },
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
                              bgcolor: "#44b700",
                              border: "2px solid #fff",
                              borderRadius: "50%",
                            }}
                          />
                        ) : null
                      }
                    >
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: getRoleColor(chatUser.role),
                        }}
                      >
                        {getRoleIcon(chatUser.role)}
                      </Avatar>
                    </Badge>
                    <Box sx={{ ml: 1.5, flex: 1 }}>
                      <Typography sx={{ fontWeight: 400, fontSize: 14 }}>
                        {chatUser.name}
                      </Typography>
                      {userLocation?.address && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                          <LocationOnIcon sx={{ fontSize: 10, color: "#0095f6" }} />
                          <Typography
                            sx={{
                              color: "#0095f6",
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
                          }}
                        />
                        {userPresence && !userPresence.isOnline && (
                          <Typography sx={{ color: "#8e8e8e", fontSize: 12 }}>
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
          bgcolor: "#fff",
        }}
      >
        {selectedUser && selectedConversation ? (
          <>
            {/* Chat Header */}
            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #dbdbdb",
                minHeight: 60,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconButton
                  onClick={() => setShowMobileChat(false)}
                  sx={{ display: { xs: "flex", md: "none" } }}
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
                          width: 12,
                          height: 12,
                          bgcolor: "#44b700",
                          border: "2px solid #fff",
                          borderRadius: "50%",
                        }}
                      />
                    ) : null
                  }
                >
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: getRoleColor(selectedUser.role),
                    }}
                  >
                    {getRoleIcon(selectedUser.role)}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>
                    {selectedUser.name}
                  </Typography>
                  {selectedUserLocation?.address ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <LocationOnIcon sx={{ fontSize: 12, color: "#0095f6" }} />
                      <Typography sx={{ color: "#0095f6", fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedUserLocation.address}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography sx={{ color: "#8e8e8e", fontSize: 12 }}>
                      {presence[selectedUser.id]?.isOnline
                        ? "Active now"
                        : presence[selectedUser.id]?.lastActive
                        ? formatLastActive(presence[selectedUser.id].lastActive)
                        : "Offline"}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Tooltip title="View Location">
                  <IconButton 
                    onClick={() => setShowLocationModal(true)}
                    disabled={!selectedUserLocation}
                    sx={{ 
                      color: selectedUserLocation ? "#0095f6" : "inherit",
                    }}
                  >
                    <LocationOnIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Voice call">
                  <IconButton onClick={handleVoiceCall}>
                    <CallIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Video call">
                  <IconButton onClick={handleVideoCall}>
                    <VideocamIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Conversation info">
                  <IconButton>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
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
                    pb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 96,
                      height: 96,
                      bgcolor: getRoleColor(selectedUser.role),
                      mb: 1,
                    }}
                  >
                    {getRoleIcon(selectedUser.role)}
                  </Avatar>
                  <Typography sx={{ fontWeight: 600, fontSize: 20 }}>
                    {selectedUser.name}
                  </Typography>
                  <Typography sx={{ color: "#8e8e8e", fontSize: 14 }}>
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

                    return (
                      <Box key={msg.id}>
                        {showTime && (
                          <Typography
                            sx={{
                              textAlign: "center",
                              color: "#8e8e8e",
                              fontSize: 12,
                              my: 2,
                            }}
                          >
                            {formatMessageTime(msg.timestamp)}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: isMe ? "flex-end" : "flex-start",
                            mb: 0.25,
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: "65%",
                              bgcolor: isMe ? "#3797f0" : "#efefef",
                              color: isMe ? "#fff" : "#262626",
                              py: 1,
                              px: 1.5,
                              borderRadius: 3,
                              position: "relative",
                            }}
                          >
                            <Typography sx={{ fontSize: 14, lineHeight: 1.4, wordBreak: "break-word" }}>
                              {msg.content}
                            </Typography>
                            {isMe && msg.read && (
                              <DoneAllIcon
                                sx={{
                                  fontSize: 14,
                                  color: "rgba(255,255,255,0.7)",
                                  position: "absolute",
                                  bottom: 2,
                                  right: 4,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isOtherUserTyping && (
                    <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 0.5 }}>
                      <Box
                        sx={{
                          bgcolor: "#efefef",
                          py: 1.5,
                          px: 2,
                          borderRadius: 3,
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
                              width: 8,
                              height: 8,
                              bgcolor: "#8e8e8e",
                              borderRadius: "50%",
                              animation: "typing 1.4s infinite",
                            },
                            "& span:nth-of-type(2)": { animationDelay: "0.2s" },
                            "& span:nth-of-type(3)": { animationDelay: "0.4s" },
                            "@keyframes typing": {
                              "0%, 60%, 100%": { opacity: 0.3, transform: "translateY(0)" },
                              "30%": { opacity: 1, transform: "translateY(-4px)" },
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
                p: 2,
                borderTop: "1px solid #dbdbdb",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #dbdbdb",
                  borderRadius: 6,
                  px: 1.5,
                  py: 0.5,
                }}
              >
                <IconButton size="small" sx={{ mr: 0.5 }}>
                  <ImageIcon sx={{ color: "#262626" }} />
                </IconButton>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  placeholder="Message..."
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
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { border: "none" },
                    },
                    "& .MuiInputBase-input": {
                      py: 1,
                      fontSize: 14,
                    },
                  }}
                  size="small"
                />
                {newMessage.trim() ? (
                  <Typography
                    onClick={handleSendMessage}
                    sx={{
                      color: "#0095f6",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      ml: 1,
                      "&:hover": { color: "#00376b" },
                    }}
                  >
                    Send
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small">
                      <MicIcon sx={{ color: "#262626", fontSize: 22 }} />
                    </IconButton>
                    <IconButton size="small">
                      <FavoriteIcon sx={{ color: "#262626", fontSize: 22 }} />
                    </IconButton>
                  </Stack>
                )}
              </Box>
            </Box>
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
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 96,
                height: 96,
                border: "2px solid #262626",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SendIcon sx={{ fontSize: 44, color: "#262626", transform: "rotate(-25deg)" }} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 300 }}>Your messages</Typography>
            <Typography sx={{ color: "#8e8e8e", fontSize: 14 }}>
              Send private messages to a friend or group
            </Typography>
            <Typography
              sx={{
                bgcolor: "#0095f6",
                color: "#fff",
                px: 2,
                py: 1,
                borderRadius: 2,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { bgcolor: "#1877f2" },
              }}
            >
              Send message
            </Typography>
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
          sx: { borderRadius: 3, overflow: "hidden" }
        }}
      >
        <DialogTitle sx={{ 
          background: "linear-gradient(135deg, #0095f6 0%, #667eea 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: getRoleColor(selectedUser?.role || "user"),
              }}
            >
              {getRoleIcon(selectedUser?.role || "user")}
            </Avatar>
            <Box>
              <Typography fontWeight={600}>{selectedUser?.name || "User"}&apos;s Location</Typography>
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
                  <CircularProgress />
                </Box>
              )}
              <Card sx={{ m: 2, p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0095f6 0%, #667eea 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
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
                    color="primary"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selectedUserLocation.latitude},${selectedUserLocation.longitude}`,
                        "_blank"
                      );
                    }}
                    sx={{ cursor: "pointer" }}
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
    </Box>
  );
}
