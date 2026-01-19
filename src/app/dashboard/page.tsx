"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid2 as Grid,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  IconButton,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChatIcon from "@mui/icons-material/Chat";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import RefreshIcon from "@mui/icons-material/Refresh";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { useAppStore, useCompany } from "@/store";
import { Company } from "@/types/auth";
import { useGeolocation } from "@/hooks";
import { LocationMap, LocationPermissionDialog } from "@/components";

// Sample stats for agent dashboard
const agentStats = [
  { title: "Tasks Today", value: "8", icon: <AssignmentIcon />, color: "#1976d2" },
  { title: "Completed", value: "5", icon: <CheckCircleIcon />, color: "#2e7d32" },
  { title: "Locations Visited", value: "12", icon: <LocationOnIcon />, color: "#ed6c02" },
  { title: "Hours Active", value: "6.5", icon: <AccessTimeIcon />, color: "#9c27b0" },
];

// Sample recent activities
const recentActivities = [
  { id: 1, action: "Completed task at Location A", time: "10 minutes ago", type: "success" },
  { id: 2, action: "Started new assignment", time: "1 hour ago", type: "info" },
  { id: 3, action: "Location check-in at Store B", time: "2 hours ago", type: "info" },
  { id: 4, action: "Submitted daily report", time: "3 hours ago", type: "success" },
  { id: 5, action: "Received new task assignment", time: "4 hours ago", type: "warning" },
];

// Sample upcoming tasks
const upcomingTasks = [
  { id: 1, title: "Visit Store C for inventory check", deadline: "Today, 3:00 PM", priority: "high" },
  { id: 2, title: "Complete customer survey", deadline: "Today, 5:00 PM", priority: "medium" },
  { id: 3, title: "Submit weekly report", deadline: "Tomorrow, 12:00 PM", priority: "low" },
];

export default function AgentDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, logout, setCompany: setStoreCompany } = useAppStore();
  const storedCompany = useCompany();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // Geolocation hook
  const {
    latitude,
    longitude,
    accuracy,
    timestamp,
    error: locationError,
    loading: locationLoading,
    permissionStatus,
    permissionChecked,
    requestLocation,
    refreshLocation,
    isSupported,
  } = useGeolocation({ watchPosition: true });

  // Use stored company first
  useEffect(() => {
    if (storedCompany) {
      setCompany(storedCompany);
    }
  }, [storedCompany]);

  // Track if we've already shown the dialog this session
  const [hasShownDialog, setHasShownDialog] = useState(false);

  // Show permission dialog if permission hasn't been granted yet
  useEffect(() => {
    // Wait for page to load and permission check to complete
    const shouldShowDialog = 
      !isLoading && 
      permissionChecked === true && 
      !hasShownDialog && 
      latitude === null && 
      permissionStatus !== "denied";
    
    if (shouldShowDialog) {
      // Show dialog after a short delay to let UI render
      const timer = setTimeout(() => {
        setShowPermissionDialog(true);
        setHasShownDialog(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, permissionChecked, permissionStatus, latitude, hasShownDialog]);

  // Handle permission request
  const handleRequestPermission = () => {
    // Don't close dialog immediately - let it show loading state
    requestLocation();
  };

  // Close dialog and don't request (user clicked "Not Now")
  const handleClosePermissionDialog = () => {
    setShowPermissionDialog(false);
  };

  // Close dialog when location is successfully obtained
  useEffect(() => {
    if (latitude && longitude && showPermissionDialog) {
      setShowPermissionDialog(false);
    }
  }, [latitude, longitude, showPermissionDialog]);

  // Fetch company info for agents
  const fetchCompany = async () => {
    if (!user?.companyId) return;
    try {
      const response = await fetch(`/api/companies?companyId=${user.companyId}`, {
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });
      const data = await response.json();
      if (data.success && data.company) {
        setCompany(data.company);
        setStoreCompany(data.company);
      }
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    // Redirect superadmin to superadmin dashboard
    if (user?.role === "superadmin") {
      router.push("/superadmin");
      return;
    }
    // Redirect admin to admin dashboard
    if (user?.role === "admin") {
      router.push("/admin");
      return;
    }
    // Fetch company for regular users
    if (user?.companyId && !storedCompany) {
      fetchCompany();
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, router, storedCompany]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!isAuthenticated || isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Only show for regular users (agents)
  if (user?.role !== "user") {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
          py: 2,
          px: 3,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              {company?.logoUrl ? (
                <Avatar
                  src={company.logoUrl}
                  alt={company.name}
                  sx={{ width: 48, height: 48, bgcolor: "white" }}
                />
              ) : (
                <Avatar sx={{ width: 48, height: 48, bgcolor: "rgba(255,255,255,0.2)" }}>
                  <BusinessIcon />
                </Avatar>
              )}
              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: "white" }}>
                  {company?.name || "Agent Dashboard"}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Field Marketing Agent Portal
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.2)" }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography fontWeight={500} sx={{ color: "white", fontSize: "0.9rem" }}>
                    {user?.name}
                  </Typography>
                  <Chip
                    label="AGENT"
                    size="small"
                    sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#3b82f6", color: "white" }}
                  />
                </Box>
              </Stack>
              <Button
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => router.push("/chat")}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                Chat
              </Button>
              <Button
                variant="contained"
                startIcon={<AccountCircleIcon />}
                onClick={() => router.push("/profile")}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                Profile
              </Button>
              <Button
                variant="contained"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
            color: "white",
            borderRadius: 3,
          }}
        >
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Welcome back, {user?.name}! 👋
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            {company?.name && (
              <span style={{ fontWeight: 600 }}>{company.name} • </span>
            )}
            Here&apos;s your activity summary for today. Keep up the great work!
          </Typography>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {agentStats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card
                sx={{
                  height: "100%",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Avatar
                      sx={{
                        bgcolor: `${stat.color}15`,
                        color: stat.color,
                        width: 56,
                        height: 56,
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Current Location Map */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MyLocationIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Your Current Location
              </Typography>
              {latitude && longitude && (
                <Chip
                  label="Live"
                  size="small"
                  color="success"
                  sx={{ 
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1 },
                      "50%": { opacity: 0.6 },
                      "100%": { opacity: 1 },
                    },
                  }}
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              {permissionStatus === "denied" && (
                <Chip
                  label="Location Disabled"
                  color="error"
                  size="small"
                  icon={<LocationOnIcon />}
                />
              )}
              <IconButton
                onClick={refreshLocation}
                disabled={locationLoading}
                size="small"
                color="primary"
                title="Refresh location"
              >
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {!isSupported && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Geolocation is not supported by your browser
            </Alert>
          )}

          {locationError && permissionStatus !== "denied" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {locationError}
            </Alert>
          )}

          {permissionStatus === "denied" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Location permission was denied. Please enable location access in your browser settings and refresh the page to use location features.
            </Alert>
          )}

          {locationLoading && !latitude && (
            <Box
              sx={{
                height: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.100",
                borderRadius: 2,
              }}
            >
              <CircularProgress sx={{ mb: 2 }} />
              <Typography color="text.secondary">Getting your location...</Typography>
            </Box>
          )}

          {latitude && longitude && (
            <LocationMap
              latitude={latitude}
              longitude={longitude}
              accuracy={accuracy}
              timestamp={timestamp}
              userName={user?.name}
              height={400}
              showInfoWindow
            />
          )}

          {!locationLoading && !latitude && permissionStatus !== "denied" && (
            <Box
              sx={{
                height: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.100",
                borderRadius: 2,
              }}
            >
              <LocationOnIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
              <Typography color="text.secondary" gutterBottom>
                Location not available
              </Typography>
              <Button
                variant="contained"
                startIcon={<MyLocationIcon />}
                onClick={() => setShowPermissionDialog(true)}
                sx={{
                  mt: 2,
                  background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                }}
              >
                Enable Location
              </Button>
            </Box>
          )}

          {latitude && longitude && (
            <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<LocationOnIcon />}
                label={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                variant="outlined"
              />
              {accuracy !== null && (
                <Chip
                  label={
                    accuracy < 10 
                      ? `Excellent accuracy (${Math.round(accuracy)}m)` 
                      : accuracy < 30 
                      ? `Good accuracy (${Math.round(accuracy)}m)`
                      : accuracy < 100 
                      ? `Moderate accuracy (±${Math.round(accuracy)}m)`
                      : `Low accuracy (±${Math.round(accuracy)}m) - Move to open area`
                  }
                  variant="outlined"
                  color={accuracy < 30 ? "success" : accuracy < 100 ? "warning" : "error"}
                />
              )}
              {timestamp && (
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`Updated: ${new Date(timestamp).toLocaleTimeString()}`}
                  variant="outlined"
                />
              )}
            </Stack>
          )}
        </Paper>

        {/* Two Column Layout */}
        <Grid container spacing={3}>
          {/* Upcoming Tasks */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <CalendarTodayIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Upcoming Tasks
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {upcomingTasks.map((task) => (
                  <Card
                    key={task.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderLeft: 4,
                      borderLeftColor:
                        task.priority === "high"
                          ? "error.main"
                          : task.priority === "medium"
                          ? "warning.main"
                          : "success.main",
                    }}
                  >
                    <Typography fontWeight={500} gutterBottom>
                      {task.title}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {task.deadline}
                      </Typography>
                      <Chip
                        label={task.priority.toUpperCase()}
                        size="small"
                        color={
                          task.priority === "high"
                            ? "error"
                            : task.priority === "medium"
                            ? "warning"
                            : "success"
                        }
                        sx={{ ml: "auto", height: 20, fontSize: "0.65rem" }}
                      />
                    </Stack>
                  </Card>
                ))}
              </Stack>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                startIcon={<AssignmentIcon />}
              >
                View All Tasks
              </Button>
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Recent Activity
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {recentActivities.map((activity, index) => (
                  <ListItem
                    key={activity.id}
                    sx={{
                      px: 0,
                      borderBottom:
                        index < recentActivities.length - 1 ? 1 : 0,
                      borderColor: "divider",
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            activity.type === "success"
                              ? "success.light"
                              : activity.type === "warning"
                              ? "warning.light"
                              : "info.light",
                        }}
                      >
                        {activity.type === "success" ? (
                          <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                        ) : (
                          <AssignmentIcon sx={{ fontSize: 18, color: "info.main" }} />
                        )}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.action}
                      secondary={activity.time}
                      primaryTypographyProps={{ fontSize: "0.9rem" }}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button variant="contained" startIcon={<LocationOnIcon />}>
              Check In
            </Button>
            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}>
              Complete Task
            </Button>
            <Button variant="contained" color="warning" startIcon={<AssignmentIcon />}>
              Submit Report
            </Button>
            <Button variant="outlined" startIcon={<AccountCircleIcon />} onClick={() => router.push("/profile")}>
              Update Profile
            </Button>
          </Stack>
        </Paper>
      </Container>

      {/* Location Permission Dialog */}
      <LocationPermissionDialog
        open={showPermissionDialog}
        onRequestPermission={handleRequestPermission}
        onClose={handleClosePermissionDialog}
        loading={locationLoading}
        error={locationError}
        permissionStatus={permissionStatus}
      />
    </Box>
  );
}
