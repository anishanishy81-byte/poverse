"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Button,
  Stack,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import SettingsIcon from "@mui/icons-material/Settings";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckIcon from "@mui/icons-material/Check";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import { useAppStore, useHasHydrated } from "@/store";
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationPreferences,
  NOTIFICATION_TYPE_INFO,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/types/notification";
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  clearAllNotifications,
  getNotificationStats,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications";
import { useFCM } from "@/hooks/useFCM";

// Icon mapping
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

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | "all">("all");
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; notification: Notification } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  
  // FCM Hook
  const {
    isSupported: fcmSupported,
    isPermissionGranted: fcmPermissionGranted,
    requestPermission: requestFCMPermission,
  } = useFCM();
  
  // Auth check
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
    }
  }, [hasHydrated, isAuthenticated, user, router]);
  
  // Load notifications
  useEffect(() => {
    if (!user?.companyId || !user?.id) return;
    
    setIsLoading(true);
    
    const unsub = subscribeToNotifications(
      user.companyId,
      user.id,
      (notifs) => {
        setNotifications(notifs);
        setIsLoading(false);
      }
    );
    
    // Load preferences
    getNotificationPreferences(user.companyId, user.id).then(setPreferences);
    
    return () => unsub();
  }, [user?.companyId, user?.id]);
  
  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    // Tab filter
    if (activeTab === 0 && n.status !== "unread") return false;
    if (activeTab === 2 && n.status !== "archived") return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !n.title.toLowerCase().includes(query) &&
        !n.body.toLowerCase().includes(query) &&
        !(n.senderName?.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    
    // Type filter
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    
    // Priority filter
    if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
    
    return true;
  });
  
  // Stats
  const unreadCount = notifications.filter((n) => n.status === "unread").length;
  const allCount = notifications.filter((n) => n.status !== "archived").length;
  const archivedCount = notifications.filter((n) => n.status === "archived").length;
  
  // Handlers
  const handleNotificationClick = async (notification: Notification) => {
    if (!user?.companyId || !user?.id) return;
    
    if (notification.status === "unread") {
      await markAsRead(user.companyId, user.id, notification.id);
    }
    
    if (notification.clickAction) {
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
  
  const handleSavePreferences = async () => {
    if (!user?.companyId || !user?.id || !preferences) return;
    
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences(user.companyId, user.id, preferences);
      setShowSettings(false);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSavingPrefs(false);
    }
  };
  
  const handleEnablePush = async () => {
    if (!fcmSupported) return;
    const granted = await requestFCMPermission();
    if (granted && preferences) {
      setPreferences({ ...preferences, pushEnabled: true });
    }
  };
  
  // Format time
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgent": return "#d32f2f";
      case "high": return "#f57c00";
      case "normal": return "#1976d2";
      case "low": return "#757575";
      default: return "#757575";
    }
  };
  
  if (!isAuthenticated || !user) return null;
  
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
          color: "white",
          py: 3,
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.back()} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={600}>
                Notifications
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Mark all as read">
                <IconButton
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  sx={{ color: "white" }}
                >
                  <DoneAllIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear all">
                <IconButton
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                  sx={{ color: "white" }}
                >
                  <DeleteSweepIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton onClick={() => setShowSettings(true)} sx={{ color: "white" }}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Container>
      </Box>
      
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value as NotificationType | "all")}
              >
                <MenuItem value="all">All Types</MenuItem>
                {Object.entries(NOTIFICATION_TYPE_INFO).map(([type, info]) => (
                  <MenuItem key={type} value={type}>
                    {info.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value as NotificationPriority | "all")}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>
        
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
          >
            <Tab label={`Unread (${unreadCount})`} />
            <Tab label={`All (${allCount})`} />
            <Tab label={`Archived (${archivedCount})`} />
          </Tabs>
        </Paper>
        
        {/* Notifications List */}
        <Paper>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <NotificationsOffIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No notifications found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery || typeFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters"
                  : activeTab === 0
                  ? "You're all caught up!"
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
                      py: 2,
                    }}
                    onClick={() => handleNotificationClick(notification)}
                    secondaryAction={
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAnchor({ element: e.currentTarget, notification });
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: NOTIFICATION_TYPE_INFO[notification.type]?.color || "#757575",
                          width: 48,
                          height: 48,
                        }}
                        src={notification.senderAvatar}
                      >
                        {NotificationIcons[notification.type]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: notification.status === "unread" ? 600 : 400 }}
                          >
                            {notification.title}
                          </Typography>
                          <Chip
                            label={NOTIFICATION_TYPE_INFO[notification.type]?.label || notification.type}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              bgcolor: NOTIFICATION_TYPE_INFO[notification.type]?.color || "#757575",
                              color: "white",
                            }}
                          />
                          {(notification.priority === "high" || notification.priority === "urgent") && (
                            <Chip
                              label={notification.priority.toUpperCase()}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                bgcolor: getPriorityColor(notification.priority),
                                color: "white",
                              }}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {notification.body}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.disabled">
                              {formatTime(notification.createdAt)}
                            </Typography>
                            {notification.senderName && (
                              <>
                                <Typography variant="caption" color="text.disabled">•</Typography>
                                <Typography variant="caption" color="text.disabled">
                                  From: {notification.senderName}
                                </Typography>
                              </>
                            )}
                            {notification.relatedName && (
                              <>
                                <Typography variant="caption" color="text.disabled">•</Typography>
                                <Typography variant="caption" color="text.disabled">
                                  {notification.relatedName}
                                </Typography>
                              </>
                            )}
                          </Stack>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Paper>
      </Container>
      
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
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Notification Settings</DialogTitle>
        <DialogContent>
          {preferences ? (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Push Notifications */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Push Notifications
                </Typography>
                {fcmSupported ? (
                  <>
                    {!fcmPermissionGranted ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Enable push notifications to receive alerts even when you&apos;re not on the app.
                        <Button size="small" onClick={handleEnablePush} sx={{ ml: 1 }}>
                          Enable
                        </Button>
                      </Alert>
                    ) : (
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.pushEnabled}
                              onChange={(e) =>
                                setPreferences({ ...preferences, pushEnabled: e.target.checked })
                              }
                            />
                          }
                          label="Enable push notifications"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.pushSound}
                              onChange={(e) =>
                                setPreferences({ ...preferences, pushSound: e.target.checked })
                              }
                              disabled={!preferences.pushEnabled}
                            />
                          }
                          label="Notification sound"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.pushVibrate}
                              onChange={(e) =>
                                setPreferences({ ...preferences, pushVibrate: e.target.checked })
                              }
                              disabled={!preferences.pushEnabled}
                            />
                          }
                          label="Vibration"
                        />
                      </FormGroup>
                    )}
                  </>
                ) : (
                  <Alert severity="warning">
                    Push notifications are not supported in this browser.
                  </Alert>
                )}
              </Box>
              
              <Divider />
              
              {/* In-App Notifications */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  In-App Notifications
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.inAppEnabled}
                        onChange={(e) =>
                          setPreferences({ ...preferences, inAppEnabled: e.target.checked })
                        }
                      />
                    }
                    label="Show in-app notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.inAppSound}
                        onChange={(e) =>
                          setPreferences({ ...preferences, inAppSound: e.target.checked })
                        }
                        disabled={!preferences.inAppEnabled}
                      />
                    }
                    label="Notification sound"
                  />
                </FormGroup>
              </Box>
              
              <Divider />
              
              {/* Quiet Hours */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Quiet Hours
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, quietHoursEnabled: e.target.checked })
                      }
                    />
                  }
                  label="Enable quiet hours (no push notifications)"
                />
                {preferences.quietHoursEnabled && (
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      type="time"
                      label="Start"
                      value={preferences.quietHoursStart || "22:00"}
                      onChange={(e) =>
                        setPreferences({ ...preferences, quietHoursStart: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                    <TextField
                      type="time"
                      label="End"
                      value={preferences.quietHoursEnd || "07:00"}
                      onChange={(e) =>
                        setPreferences({ ...preferences, quietHoursEnd: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Stack>
                )}
              </Box>
            </Stack>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSavePreferences}
            disabled={savingPrefs || !preferences}
          >
            {savingPrefs ? <CircularProgress size={20} /> : "Save Settings"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
