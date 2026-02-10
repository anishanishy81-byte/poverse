// Notification Center Component
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Button,
  Stack,
  Chip,
  Tab,
  Tabs,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import SettingsIcon from "@mui/icons-material/Settings";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckIcon from "@mui/icons-material/Check";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ChatIcon from "@mui/icons-material/Chat";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CampaignIcon from "@mui/icons-material/Campaign";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RouteIcon from "@mui/icons-material/Route";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import DescriptionIcon from "@mui/icons-material/Description";
import PlaceIcon from "@mui/icons-material/Place";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import UpdateIcon from "@mui/icons-material/Update";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CancelIcon from "@mui/icons-material/Cancel";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NOTIFICATION_TYPE_INFO,
} from "@/types/notification";
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications";
import { useFCM } from "@/hooks/useFCM";

// Icon mapping for notification types
const NotificationIcons: Record<NotificationType, React.ReactNode> = {
  target_assigned: <AssignmentIcon />,
  target_updated: <UpdateIcon />,
  target_deadline: <ScheduleIcon />,
  target_overdue: <WarningIcon />,
  checkin_reminder: <LoginIcon />,
  checkout_reminder: <LogoutIcon />,
  daily_report_reminder: <DescriptionIcon />,
  new_message: <ChatIcon />,
  chat_mention: <AlternateEmailIcon />,
  attendance_marked: <CheckCircleIcon />,
  visit_completed: <PlaceIcon />,
  system_announcement: <CampaignIcon />,
  achievement_unlocked: <EmojiEventsIcon />,
  route_assigned: <RouteIcon />,
  approval_required: <PendingActionsIcon />,
  approval_granted: <ThumbUpIcon />,
  approval_rejected: <ThumbDownIcon />,
  document_shared: <FolderSharedIcon />,
  expense_approved: <ReceiptIcon />,
  expense_rejected: <CancelIcon />,
  leave_approved: <EventAvailableIcon />,
  leave_rejected: <EventBusyIcon />,
};

interface NotificationCenterProps {
  iconColor?: string;
}

export default function NotificationCenter({ iconColor = "inherit" }: NotificationCenterProps) {
  const router = useRouter();
  const { user } = useAppStore();
  
  // State
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; notification: Notification } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  // FCM Hook
  const {
    isSupported: fcmSupported,
    isPermissionGranted: fcmPermissionGranted,
    requestPermission: requestFCMPermission,
    unsubscribe: unsubscribeFCM,
  } = useFCM({
    onMessage: (payload) => {
      // Play notification sound for foreground messages (with safe fallback)
      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.play().catch(() => {
          try {
            const AudioContextClass =
              typeof window !== "undefined"
                ? (window.AudioContext || (window as any).webkitAudioContext)
                : null;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 880;
            gain.gain.value = 0.05;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            osc.onended = () => ctx.close();
          } catch {}
        });
      } catch {}
    },
  });
  
  const open = Boolean(anchorEl);
  
  // Subscribe to notifications
  useEffect(() => {
    if (!user?.companyId || !user?.id) return;
    
    setIsLoading(true);
    
    // Subscribe to notifications
    const unsubNotifications = subscribeToNotifications(
      user.companyId,
      user.id,
      (notifs) => {
        setNotifications(notifs);
        setIsLoading(false);
      }
    );
    
    // Subscribe to unread count
    const unsubUnread = subscribeToUnreadCount(
      user.companyId,
      user.id,
      setUnreadCount
    );
    
    // Load preferences
    getNotificationPreferences(user.companyId, user.id).then((prefs) => {
      setPushEnabled(prefs.pushEnabled);
    });
    
    return () => {
      unsubNotifications();
      unsubUnread();
    };
  }, [user?.companyId, user?.id]);
  
  // Filtered notifications based on tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 0) return n.status === "unread";
    if (activeTab === 1) return n.status === "read" || n.status === "unread";
    if (activeTab === 2) return n.status === "archived";
    return true;
  });
  
  // Handlers
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
    setShowSettings(false);
  };
  
  const handleNotificationClick = async (notification: Notification) => {
    if (!user?.companyId || !user?.id) return;
    
    // Mark as read
    if (notification.status === "unread") {
      await markAsRead(user.companyId, user.id, notification.id);
    }
    
    // Navigate if click action is set
    if (notification.clickAction) {
      handleClose();
      router.push(notification.clickAction);
    }
  };
  
  const handleMarkAllRead = async () => {
    if (!user?.companyId || !user?.id) return;
    await markAllAsRead(user.companyId, user.id);
  };
  
  const handleClearAll = async () => {
    if (!user?.companyId || !user?.id) return;
    if (confirm("Are you sure you want to clear all notifications?")) {
      await clearAllNotifications(user.companyId, user.id);
    }
  };
  
  const handleArchive = async (notification: Notification) => {
    if (!user?.companyId || !user?.id) return;
    await archiveNotification(user.companyId, user.id, notification.id);
    setMenuAnchor(null);
  };
  
  const handleDelete = async (notification: Notification) => {
    if (!user?.companyId || !user?.id) return;
    await deleteNotification(user.companyId, user.id, notification.id);
    setMenuAnchor(null);
  };
  
  const handleTogglePush = async () => {
    if (!user?.companyId || !user?.id) return;
    
    if (!pushEnabled && !fcmPermissionGranted) {
      // Request permission
      const granted = await requestFCMPermission();
      if (granted) {
        setPushEnabled(true);
        await updateNotificationPreferences(user.companyId, user.id, { pushEnabled: true });
      }
    } else {
      const newValue = !pushEnabled;
      setPushEnabled(newValue);
      await updateNotificationPreferences(user.companyId, user.id, { pushEnabled: newValue });
      
      if (!newValue) {
        await unsubscribeFCM();
      }
    }
  };
  
  // Format time ago
  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  
  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgent": return "#d32f2f";
      case "high": return "#f57c00";
      case "normal": return "#1976d2";
      case "low": return "#757575";
      default: return "#757575";
    }
  };
  
  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} sx={{ color: iconColor }}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            {unreadCount > 0 ? (
              <NotificationsActiveIcon />
            ) : (
              <NotificationsIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear all">
                <IconButton size="small" onClick={handleClearAll} disabled={notifications.length === 0}>
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton size="small" onClick={() => setShowSettings(!showSettings)}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          
          {/* Settings Panel */}
          {showSettings && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Push Notifications
              </Typography>
              {fcmSupported ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={pushEnabled && fcmPermissionGranted}
                      onChange={handleTogglePush}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {pushEnabled && fcmPermissionGranted
                        ? "Enabled"
                        : fcmPermissionGranted
                        ? "Disabled"
                        : "Click to enable"}
                    </Typography>
                  }
                />
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Push notifications are not supported in this browser.
                </Alert>
              )}
            </Box>
          )}
        </Box>
        
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label={
              <Badge badgeContent={unreadCount} color="error" max={99}>
                Unread
              </Badge>
            }
          />
          <Tab label="All" />
          <Tab label="Archived" />
        </Tabs>
        
        {/* Notifications List */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <NotificationsOffIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
              <Typography color="text.secondary">
                {activeTab === 0
                  ? "No unread notifications"
                  : activeTab === 2
                  ? "No archived notifications"
                  : "No notifications yet"}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredNotifications.map((notification, index) => (
                <Box key={notification.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      cursor: notification.clickAction ? "pointer" : "default",
                      bgcolor: notification.status === "unread" ? "action.hover" : "transparent",
                      "&:hover": { bgcolor: "action.selected" },
                      pr: 1,
                    }}
                    onClick={() => handleNotificationClick(notification)}
                    secondaryAction={
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAnchor({ element: e.currentTarget, notification });
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: NOTIFICATION_TYPE_INFO[notification.type]?.color || "#757575",
                          width: 40,
                          height: 40,
                        }}
                        src={notification.senderAvatar}
                      >
                        {NotificationIcons[notification.type]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: notification.status === "unread" ? 600 : 400,
                              flex: 1,
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {(notification.priority === "high" || notification.priority === "urgent") && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: getPriorityColor(notification.priority),
                              }}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Box component="span">
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {notification.body}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.disabled" sx={{ display: "block" }}>
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider variant="inset" component="li" />}
                </Box>
              ))}
            </List>
          )}
        </Box>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: 1, borderColor: "divider", textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => {
                handleClose();
                router.push("/notifications");
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Popover>
      
      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {menuAnchor?.notification.status === "unread" && (
          <MenuItem
            onClick={() => {
              handleNotificationClick(menuAnchor.notification);
              setMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            Mark as read
          </MenuItem>
        )}
        {menuAnchor?.notification.status !== "archived" && (
          <MenuItem onClick={() => menuAnchor && handleArchive(menuAnchor.notification)}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            Archive
          </MenuItem>
        )}
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.notification)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </>
  );
}
