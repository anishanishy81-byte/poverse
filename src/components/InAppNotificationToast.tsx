/**
 * In-App Notification Toast Component
 * Shows push notifications as in-app popups when the app is in the foreground
 */
"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  IconButton,
  Avatar,
  Stack,
  Slide,
  Paper,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChatIcon from "@mui/icons-material/Chat";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useRouter } from "next/navigation";

interface InAppNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type?: string;
  clickAction?: string;
  data?: Record<string, any>;
}

interface InAppNotificationContextType {
  showNotification: (notification: InAppNotification) => void;
  hideNotification: (id: string) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | null>(null);

export const useInAppNotification = () => {
  const context = useContext(InAppNotificationContext);
  if (!context) {
    throw new Error("useInAppNotification must be used within InAppNotificationProvider");
  }
  return context;
};

// Get icon based on notification type
const getNotificationIcon = (type?: string) => {
  switch (type) {
    case "new_message":
    case "chat_mention":
      return <ChatIcon />;
    case "target_assigned":
    case "target_updated":
      return <AssignmentIcon />;
    case "target_deadline":
    case "checkin_reminder":
    case "checkout_reminder":
    case "daily_report_reminder":
      return <ScheduleIcon />;
    case "target_overdue":
      return <WarningIcon />;
    case "attendance_marked":
    case "visit_completed":
    case "approval_granted":
    case "leave_approved":
    case "expense_approved":
      return <CheckCircleIcon />;
    case "system_announcement":
      return <CampaignIcon />;
    default:
      return <NotificationsIcon />;
  }
};

// Get gradient based on notification type
const getNotificationGradient = (type?: string) => {
  switch (type) {
    case "new_message":
    case "chat_mention":
      return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    case "target_overdue":
    case "approval_rejected":
    case "leave_rejected":
    case "expense_rejected":
      return "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)";
    case "attendance_marked":
    case "visit_completed":
    case "approval_granted":
    case "leave_approved":
    case "expense_approved":
      return "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
    case "target_assigned":
    case "target_updated":
    case "target_deadline":
      return "linear-gradient(135deg, #3a7bd5 0%, #00d2ff 100%)";
    case "system_announcement":
      return "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
    default:
      return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  }
};

function SlideTransition(props: TransitionProps & { children: React.ReactElement }) {
  return <Slide {...props} direction="down" />;
}

interface NotificationToastProps {
  notification: InAppNotification;
  onClose: () => void;
  onClick: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose, onClick }) => {
  return (
    <Paper
      elevation={8}
      onClick={onClick}
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 400,
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "scale(1.02)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        },
      }}
    >
      {/* Top gradient bar */}
      <Box
        sx={{
          height: 4,
          background: getNotificationGradient(notification.type),
        }}
      />
      
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Icon */}
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: getNotificationGradient(notification.type),
              color: "white",
            }}
          >
            {getNotificationIcon(notification.type)}
          </Avatar>
          
          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {notification.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {notification.body}
            </Typography>
          </Box>
          
          {/* Close button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            sx={{ ml: "auto" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  );
};

interface InAppNotificationProviderProps {
  children: React.ReactNode;
}

export default function InAppNotificationProvider({ children }: InAppNotificationProviderProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3");
    audioRef.current.volume = 0.5;
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Fallback: Web Audio API beep
          try {
            const AudioContextClass = 
              window.AudioContext || (window as any).webkitAudioContext;
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
      }
    } catch {}
  }, []);

  // Show next notification in queue
  const showNext = useCallback(() => {
    if (notifications.length > 0) {
      const [next, ...rest] = notifications;
      setCurrentNotification(next);
      setNotifications(rest);
      setOpen(true);
      playSound();
      
      // Auto-hide after 5 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 5000);
    }
  }, [notifications, playSound]);

  // Process notification queue
  useEffect(() => {
    if (!open && notifications.length > 0) {
      // Small delay between notifications
      const timer = setTimeout(showNext, 300);
      return () => clearTimeout(timer);
    }
  }, [open, notifications.length, showNext]);

  // Show a new notification
  const showNotification = useCallback((notification: InAppNotification) => {
    // Generate ID if not provided
    const notificationWithId = {
      ...notification,
      id: notification.id || `inapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!currentNotification && !open) {
      // Show immediately if nothing is showing
      setCurrentNotification(notificationWithId);
      setOpen(true);
      playSound();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 5000);
    } else {
      // Add to queue
      setNotifications((prev) => [...prev, notificationWithId]);
    }
  }, [currentNotification, open, playSound]);

  // Hide a specific notification
  const hideNotification = useCallback((id: string) => {
    if (currentNotification?.id === id) {
      setOpen(false);
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, [currentNotification]);

  // Handle toast close
  const handleClose = useCallback(() => {
    setOpen(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Handle toast click
  const handleClick = useCallback(() => {
    if (currentNotification?.clickAction) {
      router.push(currentNotification.clickAction);
    }
    handleClose();
  }, [currentNotification, router, handleClose]);

  // Handle snackbar exit
  const handleExited = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <InAppNotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      
      <Snackbar
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
        TransitionProps={{
          onExited: handleExited,
        }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          top: { xs: 8, sm: 16 },
          "& .MuiSnackbarContent-root": {
            padding: 0,
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        <Box>
          {currentNotification && (
            <NotificationToast
              notification={currentNotification}
              onClose={handleClose}
              onClick={handleClick}
            />
          )}
        </Box>
      </Snackbar>
    </InAppNotificationContext.Provider>
  );
}
