// Offline Status Indicator Component
// Shows offline status and sync information

"use client";

import React, { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Sync as SyncIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CloudOff as CloudOffIcon,
  CloudDone as CloudDoneIcon,
  CloudSync as CloudSyncIcon,
} from "@mui/icons-material";
import { useOffline } from "@/hooks/useOffline";

interface OfflineIndicatorProps {
  userId: string;
  companyId: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  userId,
  companyId,
  showDetails = true,
}) => {
  const {
    isOnline,
    isInitialized,
    isSyncing,
    pendingCount,
    hasConflicts,
    conflictCount,
    lastSyncTime,
    sync,
  } = useOffline({ userId, companyId });

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSync = async () => {
    await sync();
  };

  const open = Boolean(anchorEl);
  const id = open ? "offline-popover" : undefined;

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = () => {
    if (!isInitialized) {
      return <CloudOffIcon />;
    }
    if (isSyncing) {
      return <CloudSyncIcon />;
    }
    if (!isOnline) {
      return <WifiOffIcon />;
    }
    if (hasConflicts) {
      return <WarningIcon />;
    }
    if (pendingCount > 0) {
      return <SyncIcon />;
    }
    return <CloudDoneIcon />;
  };

  const getStatusColor = (): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    if (!isOnline) return "error";
    if (hasConflicts) return "warning";
    if (pendingCount > 0) return "info";
    return "success";
  };

  const getStatusText = () => {
    if (!isInitialized) return "Initializing...";
    if (isSyncing) return "Syncing...";
    if (!isOnline) return "Offline";
    if (hasConflicts) return `${conflictCount} conflicts`;
    if (pendingCount > 0) return `${pendingCount} pending`;
    return "Synced";
  };

  if (!showDetails) {
    // Simple indicator
    return (
      <Tooltip title={getStatusText()}>
        <Chip
          size="small"
          icon={getStatusIcon()}
          label={!isOnline ? "Offline" : pendingCount > 0 ? pendingCount : "✓"}
          color={getStatusColor()}
          variant={isOnline ? "outlined" : "filled"}
        />
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip title={getStatusText()}>
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          size="small"
          sx={{ ml: 1 }}
        >
          <Badge
            badgeContent={pendingCount + conflictCount}
            color={hasConflicts ? "warning" : "info"}
            invisible={pendingCount + conflictCount === 0}
          >
            {getStatusIcon()}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sync Status
          </Typography>

          {isSyncing && <LinearProgress sx={{ mb: 2 }} />}

          <List dense>
            <ListItem>
              <ListItemIcon>
                {isOnline ? (
                  <WifiIcon color="success" />
                ) : (
                  <WifiOffIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Connection"
                secondary={isOnline ? "Online" : "Offline"}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                {pendingCount > 0 ? (
                  <SyncIcon color="info" />
                ) : (
                  <CheckCircleIcon color="success" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Pending Actions"
                secondary={`${pendingCount} action${pendingCount !== 1 ? "s" : ""}`}
              />
            </ListItem>

            {hasConflicts && (
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Conflicts"
                  secondary={`${conflictCount} conflict${conflictCount !== 1 ? "s" : ""} need resolution`}
                />
              </ListItem>
            )}

            <ListItem>
              <ListItemIcon>
                <CloudSyncIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Last Sync"
                secondary={formatLastSync(lastSyncTime)}
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          {!isOnline && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You are offline. Changes will be synced when you reconnect.
            </Alert>
          )}

          {hasConflicts && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Some changes conflict with server data. Please resolve them.
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

// Simple offline banner for pages
export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  React.useEffect(() => {
    // Use dynamic import to avoid SSR issues
    import("@/lib/networkStatus").then(({ initializeNetworkMonitoring, subscribeToNetworkStatus, isNetworkConnected }) => {
      initializeNetworkMonitoring();
      setIsOnline(isNetworkConnected());
      
      const unsubscribe = subscribeToNetworkStatus((status) => {
        setIsOnline(status.isConnected);
      });
      
      return () => unsubscribe();
    });
  }, []);

  if (isOnline) return null;

  return (
    <Alert
      severity="warning"
      icon={<WifiOffIcon />}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1050, // Below sticky header (1100) to not block navigation
        borderRadius: 0,
      }}
    >
      You are currently offline. Your changes will be saved and synced when you reconnect.
    </Alert>
  );
};

export default OfflineIndicator;
