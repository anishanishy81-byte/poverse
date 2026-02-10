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
  ListItemButton,
  Divider,
  IconButton,
  LinearProgress,
  Badge,
  Drawer,
  Tooltip,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChatIcon from "@mui/icons-material/Chat";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import RefreshIcon from "@mui/icons-material/Refresh";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SyncIcon from "@mui/icons-material/Sync";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import DirectionsIcon from "@mui/icons-material/Directions";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FlagIcon from "@mui/icons-material/Flag";
import LoginIcon from "@mui/icons-material/Login";
import WorkIcon from "@mui/icons-material/Work";
import AssessmentIcon from "@mui/icons-material/Assessment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SpeedIcon from "@mui/icons-material/Speed";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ReceiptIcon from "@mui/icons-material/Receipt";
import StarIcon from "@mui/icons-material/Star";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CloseIcon from "@mui/icons-material/Close";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GetAppIcon from "@mui/icons-material/GetApp";
import NavigationIcon from "@mui/icons-material/Navigation";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { Company } from "@/types/auth";
import { useTrackedLocation } from "@/hooks";
import { DownloadAppButton, LocationMap, LocationPermissionDialog, StoriesBar, TargetsMap } from "@/components";
import NotificationCenter from "@/components/NotificationCenter";
import { OfflineIndicator, OfflineBanner } from "@/components/OfflineIndicator";
import { TargetVisit } from "@/types/target";
import { AttendanceRecord } from "@/types/attendance";
import {
  AgentGoals,
  Notification,
  Incentive,
  ScheduledTask,
  ActivityLogEntry,
} from "@/types/dashboard";
import {
  subscribeToUserActiveVisits,
  subscribeToUserAllVisits,
  getTargetStatusInfo,
  calculateDistance,
  getTodayNavigationDistance,
  subscribeToRecentlyCompletedVisits,
} from "@/lib/targetTracking";
import {
  subscribeToTodayAttendance,
  formatDuration,
} from "@/lib/attendance";
import {
  subscribeToAgentGoals,
  subscribeToNotifications,
  subscribeToIncentives,
  subscribeToScheduledTasks,
  subscribeToActivityLog,
  calculateAgentProgress,
  calculateDashboardStats,
  calculateEarningsSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationIcon,
  getPriorityColor,
  formatCurrency,
  DEFAULT_AGENT_GOALS,
} from "@/lib/dashboard";
import { isNativeApp } from "@/lib/platform";
import { getUserById } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { getProfilePictureUrl, resolveStorageUrl } from "@/lib/storage";

export default function AgentDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, logout, setCompany: setStoreCompany } = useAppStore();
  const hasHydrated = useHasHydrated();
  const storedCompany = useCompany();
  const showDownload = !isNativeApp();
  const appDownloadUrl = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || "/downloads/po-verse.apk";
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [activeTargets, setActiveTargets] = useState<TargetVisit[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [allVisits, setAllVisits] = useState<TargetVisit[]>([]);
  
  // New state for dashboard improvements
  const [agentGoals, setAgentGoals] = useState<AgentGoals | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  
  // Navigation KM tracking
  const [navigationKm, setNavigationKm] = useState<{ totalKm: number; navigationCount: number }>({ totalKm: 0, navigationCount: 0 });
  const [completedTargets, setCompletedTargets] = useState<TargetVisit[]>([]);

  // Tracked Location hook
  const {
    latitude,
    longitude,
    accuracy,
    timestamp,
    loading: locationLoading,
    permissionStatus,
    permissionChecked,
    requestLocation,
    refreshLocation,
    lastSyncTime,
    isSyncing,
    todayStats,
    locationHistory,
  } = useTrackedLocation({ 
    userId: user?.id,
    companyId: user?.companyId,
    userName: user?.name,
    enableTracking: true,
    trackingInterval: 30000,
    watchPosition: true,
  });

  // Calculate progress and stats
  const progress = calculateAgentProgress(activeTargets, todayAttendance, agentGoals);
  const dashboardStats = calculateDashboardStats(activeTargets, todayAttendance, locationHistory || [], allVisits);
  const earningsSummary = calculateEarningsSummary(incentives, "monthly");
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  // Fetch user profile picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      try {
        const result = await getUserById(user.id);
        const storedProfile = result.user?.profilePicture;
        const resolvedProfile = await resolveStorageUrl(storedProfile);
        if (resolvedProfile) {
          setUserProfilePicture(resolvedProfile);
          return;
        }
        const storageProfile = await getProfilePictureUrl(user.id);
        if (storageProfile) {
          setUserProfilePicture(storageProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    fetchUserProfile();
  }, [user?.id]);

  // Subscribe to active targets
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToUserActiveVisits(user.id, (visits) => {
      setActiveTargets(visits);
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to today's attendance
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToTodayAttendance(user.id, (record) => {
      setTodayAttendance(record);
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to all visits for stats (real-time updates)
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToUserAllVisits(user.id, setAllVisits, 100);
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to agent goals
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToAgentGoals(user.id, setAgentGoals);
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToNotifications(user.id, setNotifications);
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to incentives
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToIncentives(user.id, setIncentives);
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to scheduled tasks
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];
    const unsubscribe = subscribeToScheduledTasks(user.id, today, setScheduledTasks);
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to activity log
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToActivityLog(user.id, setActivityLog);
    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to navigation KM tracking
  useEffect(() => {
    if (!user?.id) return;
    // Fetch navigation distance initially and refresh every 30 seconds
    const fetchNavDistance = async () => {
      const navData = await getTodayNavigationDistance(user.id);
      setNavigationKm(navData);
    };
    fetchNavDistance();
    const interval = setInterval(fetchNavDistance, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Subscribe to completed targets in last 24 hours (for map flags)
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToRecentlyCompletedVisits(user.id, setCompletedTargets, 24);
    return () => unsubscribe();
  }, [user?.id]);

  // Helper to get distance to target
  const getDistanceToTarget = (visit: TargetVisit): string => {
    if (!latitude || !longitude) return "Unknown";
    const distance = calculateDistance(
      latitude,
      longitude,
      visit.location.latitude,
      visit.location.longitude
    );
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  // Use stored company first
  useEffect(() => {
    if (storedCompany) {
      setCompany(storedCompany);
    }
  }, [storedCompany]);

  // Track if we've already shown the dialog this session
  const [hasShownDialog, setHasShownDialog] = useState(false);

  // Show permission dialog only if permission needs to be requested
  useEffect(() => {
    const shouldShowDialog = 
      !isLoading && 
      permissionChecked === true && 
      !hasShownDialog && 
      permissionStatus === "prompt";
    
    if (shouldShowDialog) {
      const timer = setTimeout(() => {
        setShowPermissionDialog(true);
        setHasShownDialog(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, permissionChecked, permissionStatus, hasShownDialog]);

  // Handle permission request
  const handleRequestPermission = () => {
    requestLocation();
  };

  // Close dialog
  const handleClosePermissionDialog = () => {
    setShowPermissionDialog(false);
  };

  // Close dialog when location is obtained
  useEffect(() => {
    if (latitude && longitude && showPermissionDialog) {
      setShowPermissionDialog(false);
    }
  }, [latitude, longitude, showPermissionDialog]);

  // Fetch company info
  const fetchCompany = async () => {
    if (!user?.companyId) return;
    try {
      const companyData = await getCompanyById(user.companyId);
      if (companyData) {
        setCompany(companyData);
        setStoreCompany(companyData);
      }
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (user?.role === "superadmin") {
      router.push("/superadmin");
      return;
    }
    if (user?.role === "admin") {
      router.push("/admin");
      return;
    }
    if (user?.companyId && !storedCompany) {
      fetchCompany();
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, user, router, storedCompany]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleMarkAllRead = async () => {
    if (user?.id) {
      await markAllNotificationsAsRead(user.id);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (user?.id && !notification.isRead) {
      await markNotificationAsRead(user.id, notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setNotificationDrawerOpen(false);
    }
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

  if (user?.role !== "user") {
    return null;
  }

  // Navigation menu items
  const navItems = [
    { label: "Chat", icon: <ChatIcon />, path: "/chat" },
    { label: "Attendance", icon: <AccessTimeIcon />, path: "/attendance" },
    { label: "Leave", icon: <EventNoteIcon />, path: "/leave" },
    { label: "Expenses", icon: <ReceiptIcon />, path: "/expenses" },
    { label: "Documents", icon: <AssignmentIcon />, path: "/documents" },
    { label: "Reports", icon: <AssessmentIcon />, path: "/reports" },
    { label: "Targets", icon: <LocationOnIcon />, path: "/targets" },
    { label: "Routes", icon: <DirectionsIcon />, path: "/routes" },
    { label: "Customers", icon: <PeopleAltIcon />, path: "/crm" },
    { label: "Profile", icon: <AccountCircleIcon />, path: "/profile" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 280,
            background: "linear-gradient(180deg, #667eea 0%, #a855f7 100%)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {userProfilePicture ? (
                <Avatar
                  src={userProfilePicture}
                  alt={user?.name}
                  sx={{ width: 40, height: 40 }}
                />
              ) : (
                <Avatar sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.2)" }}>
                  {user?.name?.charAt(0)?.toUpperCase() || <PersonIcon />}
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "white" }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  {company?.name}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1 }} />
        </Box>
        <List sx={{ px: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => {
                router.push(item.path);
                setMobileMenuOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: "white",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
          {showDownload && (
            <ListItemButton
              component="a"
              href={appDownloadUrl}
              download
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: "white",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                <GetAppIcon />
              </ListItemIcon>
              <ListItemText primary="Download App" />
            </ListItemButton>
          )}
          <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: "#ff8a80",
              "&:hover": {
                bgcolor: "rgba(255,138,128,0.15)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#ff8a80", minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
          py: 1.5,
          px: { xs: 2, md: 3 },
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {/* Left: Menu + Logo */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Mobile Menu Button */}
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: "white", display: { xs: "flex", md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              
              {company?.logoUrl ? (
                <Avatar
                  src={company.logoUrl}
                  alt={company.name}
                  sx={{ width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 }, bgcolor: "white" }}
                />
              ) : (
                <Avatar sx={{ width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 }, bgcolor: "rgba(255,255,255,0.2)" }}>
                  <BusinessIcon />
                </Avatar>
              )}
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: "white", lineHeight: 1.2 }}>
                  {company?.name || "Agent Dashboard"}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Field Marketing Agent Portal
                </Typography>
              </Box>
            </Stack>

            {/* Desktop Navigation */}
            <Stack 
              direction="row" 
              spacing={0.5} 
              alignItems="center"
              sx={{ display: { xs: "none", md: "flex" } }}
            >
              {navItems.slice(0, 6).map((item) => (
                <Tooltip key={item.path} title={item.label}>
                  <IconButton
                    onClick={() => router.push(item.path)}
                    size="small"
                    sx={{
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                    }}
                  >
                    {item.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>

            {/* Right: User Actions */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              {/* User info - desktop only */}
              <Stack 
                direction="row" 
                spacing={1} 
                alignItems="center" 
                sx={{ 
                  mr: 1,
                  display: { xs: "none", lg: "flex" },
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                }}
              >
                {userProfilePicture ? (
                  <Avatar src={userProfilePicture} sx={{ width: 28, height: 28 }} />
                ) : (
                  <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }}>
                    {user?.name?.charAt(0)?.toUpperCase() || <PersonIcon sx={{ fontSize: 18 }} />}
                  </Avatar>
                )}
                <Typography fontWeight={500} sx={{ color: "white", fontSize: "0.85rem" }}>
                  {user?.name}
                </Typography>
              </Stack>

              <DownloadAppButton
                variant="outlined"
                size="small"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "white",
                  borderColor: "rgba(255,255,255,0.45)",
                  "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                }}
              />

              {/* Notification Bell */}
              <IconButton
                onClick={() => setNotificationDrawerOpen(true)}
                sx={{ color: "white" }}
                size="small"
              >
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              
              <NotificationCenter iconColor="white" />
              
              {user?.id && user?.companyId && (
                <OfflineIndicator userId={user.id} companyId={user.companyId} />
              )}

              {/* Quick Actions - visible on tablet+ */}
              <Stack 
                direction="row" 
                spacing={0.5} 
                sx={{ display: { xs: "none", sm: "flex", md: "none" } }}
              >
                <Tooltip title="Targets">
                  <IconButton
                    onClick={() => router.push("/targets")}
                    size="small"
                    sx={{ color: "white" }}
                  >
                    <LocationOnIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Chat">
                  <IconButton
                    onClick={() => router.push("/chat")}
                    size="small"
                    sx={{ color: "white" }}
                  >
                    <ChatIcon />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Profile Button */}
              <Tooltip title="Profile">
                <IconButton
                  onClick={() => router.push("/profile")}
                  sx={{ color: "white" }}
                  size="small"
                >
                  <AccountCircleIcon />
                </IconButton>
              </Tooltip>
              
              {/* Logout - always visible */}
              <Tooltip title="Logout">
                <IconButton
                  onClick={handleLogout}
                  sx={{ color: "white" }}
                  size="small"
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        {/* Stories Section */}
        {user?.id && user?.companyId && (
          <Paper sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
            <StoriesBar
              userId={user.id}
              userName={user.name || "User"}
              companyId={user.companyId}
              userProfilePicture={userProfilePicture || undefined}
            />
          </Paper>
        )}
        
        {/* Quick Stats Cards - Row 1 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Visits Today */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card sx={{ height: "100%", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              <CardContent sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                    <FlagIcon sx={{ color: "white" }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="white">
                    {dashboardStats.today.visitsCompleted}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    Visits Today
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Conversions */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card sx={{ height: "100%", background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" }}>
              <CardContent sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                    <EmojiEventsIcon sx={{ color: "white" }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="white">
                    {dashboardStats.today.conversions}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    Conversions
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* New Leads */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card sx={{ height: "100%", background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
              <CardContent sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                    <StarIcon sx={{ color: "white" }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="white">
                    {dashboardStats.today.leadsGenerated}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    New Leads
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Hours Worked */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card sx={{ height: "100%", background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
              <CardContent sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                    <AccessTimeIcon sx={{ color: "white" }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="white">
                    {dashboardStats.today.hoursWorked}h
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    Hours Worked
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Distance - Navigation KM */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card sx={{ height: "100%", background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }}>
              <CardContent sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                    <NavigationIcon sx={{ color: "white" }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="white">
                    {navigationKm.totalKm.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    km Navigated
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Completion Rate */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card sx={{ height: "100%", background: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" }}>
              <CardContent sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                    <SpeedIcon sx={{ color: "white" }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="white">
                    {dashboardStats.performance.completionRate}%
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    Completion
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Attendance & Progress Row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Attendance Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              sx={{
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                background: todayAttendance?.status === "checked_in"
                  ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
                  : todayAttendance?.status === "checked_out"
                  ? "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"
                  : "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                border: "2px solid",
                borderColor: todayAttendance?.status === "checked_in"
                  ? "#4caf50"
                  : todayAttendance?.status === "checked_out"
                  ? "#2196f3"
                  : "#ff9800",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: todayAttendance?.status === "checked_in"
                        ? "#4caf50"
                        : todayAttendance?.status === "checked_out"
                        ? "#2196f3"
                        : "#ff9800",
                      width: 48,
                      height: 48,
                    }}
                  >
                    {todayAttendance?.status === "checked_in" ? (
                      <WorkIcon />
                    ) : todayAttendance?.status === "checked_out" ? (
                      <CheckCircleIcon />
                    ) : (
                      <LoginIcon />
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {todayAttendance?.status === "checked_in"
                        ? "Currently Working"
                        : todayAttendance?.status === "checked_out"
                        ? "Day Complete"
                        : "Not Checked In"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {todayAttendance?.checkIn ? (
                        <>
                          {new Date(todayAttendance.checkIn.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {todayAttendance.workDurationMinutes && (
                            <> • {formatDuration(todayAttendance.workDurationMinutes)}</>
                          )}
                        </>
                      ) : (
                        "Check in to start"
                      )}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push("/attendance")}
                  disabled={todayAttendance?.status === "checked_out"}
                  sx={{
                    bgcolor: todayAttendance?.status === "checked_in"
                      ? "#2196f3"
                      : todayAttendance?.status === "checked_out"
                      ? "#9e9e9e"
                      : "#4caf50",
                  }}
                >
                  {todayAttendance?.status === "checked_in"
                    ? "Check Out"
                    : todayAttendance?.status === "checked_out"
                    ? "Done"
                    : "Check In"}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Daily Progress */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2.5, height: "100%", borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimelineIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Daily Progress
                  </Typography>
                </Stack>
                <Chip
                  label={`${progress.daily.completionRate}% Complete`}
                  color={progress.daily.completionRate >= 80 ? "success" : progress.daily.completionRate >= 50 ? "warning" : "error"}
                  size="small"
                />
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Visits</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {progress.daily.visitsCompleted}/{progress.daily.visitsTarget}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (progress.daily.visitsCompleted / progress.daily.visitsTarget) * 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="primary"
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Conversions</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {progress.daily.conversions}/{progress.daily.conversionsTarget}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (progress.daily.conversions / progress.daily.conversionsTarget) * 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="success"
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Hours</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {progress.daily.hoursWorked}/{progress.daily.hoursTarget}h
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (progress.daily.hoursWorked / progress.daily.hoursTarget) * 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="info"
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">New Leads</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {progress.daily.newLeads}/{progress.daily.newLeadsTarget}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (progress.daily.newLeads / progress.daily.newLeadsTarget) * 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="secondary"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Main Content Row */}
        <Grid container spacing={3}>
          {/* Left Column - Targets & Schedule */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Pending Targets */}
            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FlagIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Pending Targets
                  </Typography>
                  {activeTargets.length > 0 && (
                    <Chip label={activeTargets.length} size="small" color="primary" />
                  )}
                </Stack>
                <Stack direction="row" spacing={1}>
                  {activeTargets.length > 1 && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<DirectionsIcon />}
                      onClick={() => router.push("/routes")}
                    >
                      Plan Route
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<AddLocationIcon />}
                    onClick={() => router.push("/targets")}
                  >
                    Add New
                  </Button>
                </Stack>
              </Stack>
              
              {activeTargets.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 3, bgcolor: "grey.50", borderRadius: 2 }}>
                  <AddLocationIcon sx={{ fontSize: 40, color: "grey.400", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No pending targets. Add your first target!
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {activeTargets.slice(0, 5).map((visit) => {
                    const statusInfo = getTargetStatusInfo(visit.status) || { label: "Unknown", color: "#9e9e9e" };
                    const isInProgress = visit.status === "in_progress";
                    
                    return (
                      <ListItemButton
                        key={visit.id}
                        onClick={() => router.push("/targets")}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: isInProgress ? "primary.50" : "grey.50",
                          border: isInProgress ? "2px solid" : "1px solid",
                          borderColor: isInProgress ? "primary.main" : "grey.200",
                        }}
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{ bgcolor: statusInfo?.color || "#9e9e9e", width: 36, height: 36 }}
                          >
                            {visit.status === "in_transit" ? (
                              <DirectionsIcon fontSize="small" />
                            ) : visit.status === "in_progress" ? (
                              <PlayArrowIcon fontSize="small" />
                            ) : (
                              <LocationOnIcon fontSize="small" />
                            )}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={600}>
                                {visit.targetName}
                              </Typography>
                              {isInProgress && (
                                <Chip label="In Progress" size="small" color="primary" sx={{ height: 20 }} />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {visit.location.address?.substring(0, 35)}...
                            </Typography>
                          }
                        />
                        <Stack alignItems="flex-end" spacing={0.5}>
                          <Chip
                            label={getDistanceToTarget(visit)}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{ bgcolor: statusInfo.color, color: "white", height: 20, fontSize: "0.65rem" }}
                          />
                        </Stack>
                      </ListItemButton>
                    );
                  })}
                  {activeTargets.length > 5 && (
                    <Button fullWidth size="small" onClick={() => router.push("/targets")}>
                      View All {activeTargets.length} Targets →
                    </Button>
                  )}
                </List>
              )}
            </Paper>

            {/* Today's Schedule */}
            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ScheduleIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Today&apos;s Schedule
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </Typography>
              </Stack>
              
              {scheduledTasks.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 3, bgcolor: "grey.50", borderRadius: 2 }}>
                  <CalendarTodayIcon sx={{ fontSize: 40, color: "grey.400", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No scheduled tasks for today
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {scheduledTasks.map((task) => (
                    <ListItem
                      key={task.id}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: "grey.50",
                        borderLeft: 4,
                        borderLeftColor: getPriorityColor(task.priority),
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {task.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                          {task.scheduledTime && (
                            <Chip
                              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                              label={task.scheduledTime}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          )}
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              bgcolor: getPriorityColor(task.priority),
                              color: "white",
                            }}
                          />
                        </Stack>
                      </Box>
                      <Chip
                        label={task.status}
                        size="small"
                        color={task.status === "completed" ? "success" : task.status === "in_progress" ? "primary" : "default"}
                        sx={{ height: 24 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Targets Map with Flags */}
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MyLocationIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Targets Map
                  </Typography>
                  {latitude && longitude && (
                    <Chip label="Live" size="small" color="success" sx={{ height: 20 }} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  {navigationKm.navigationCount > 0 && (
                    <Chip
                      icon={<NavigationIcon sx={{ fontSize: 14 }} />}
                      label={`${navigationKm.navigationCount} trips`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  <IconButton onClick={refreshLocation} disabled={locationLoading} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Stack>
              </Stack>
              
              {latitude && longitude ? (
                <>
                  <TargetsMap
                    userLatitude={latitude}
                    userLongitude={longitude}
                    activeTargets={activeTargets}
                    completedTargets={completedTargets}
                    onTargetClick={() => router.push("/targets")}
                    height={280}
                    showLegend
                  />
                  <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={<LocationOnIcon />}
                      label={`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                      size="small"
                      variant="outlined"
                    />
                    {todayStats && (
                      <Chip
                        icon={<TrendingUpIcon />}
                        label={`${todayStats.totalUpdates} updates`}
                        size="small"
                        variant="outlined"
                        color="info"
                      />
                    )}
                    <Chip
                      icon={isSyncing ? <SyncIcon /> : <SyncIcon />}
                      label={lastSyncTime ? `Synced ${new Date(lastSyncTime).toLocaleTimeString()}` : "Not synced"}
                      size="small"
                      variant="outlined"
                      color={lastSyncTime ? "success" : "default"}
                    />
                  </Stack>
                </>
              ) : (
                <Box sx={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100", borderRadius: 2 }}>
                  {locationLoading ? (
                    <CircularProgress />
                  ) : (
                    <Stack alignItems="center">
                      <LocationOnIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {permissionStatus === "denied" ? "Location disabled" : "Enable location"}
                      </Typography>
                      {permissionStatus !== "denied" && (
                        <Button size="small" onClick={() => setShowPermissionDialog(true)} sx={{ mt: 1 }}>
                          Enable
                        </Button>
                      )}
                    </Stack>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Right Column - Activity, Earnings, Weekly Progress */}
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Weekly Progress */}
            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WhatshotIcon color="warning" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Weekly Progress
                  </Typography>
                </Stack>
                <Chip
                  label={`${progress.weekly.completionRate}%`}
                  size="small"
                  color={progress.weekly.completionRate >= 80 ? "success" : "warning"}
                />
              </Stack>
              
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption">Visits</Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {progress.weekly.visitsCompleted}/{progress.weekly.visitsTarget}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (progress.weekly.visitsCompleted / progress.weekly.visitsTarget) * 100)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption">Conversions</Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {progress.weekly.conversions}/{progress.weekly.conversionsTarget}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (progress.weekly.conversions / progress.weekly.conversionsTarget) * 100)}
                    color="success"
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption">New Leads</Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {progress.weekly.newLeads}/{progress.weekly.newLeadsTarget}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (progress.weekly.newLeads / progress.weekly.newLeadsTarget) * 100)}
                    color="secondary"
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />
              
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <Typography variant="caption" color="text.secondary">
                  Avg {dashboardStats.thisWeek.avgVisitsPerDay} visits/day
                </Typography>
                <Typography variant="caption" color="text.secondary">•</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dashboardStats.thisWeek.conversions} conversions
                </Typography>
              </Stack>
            </Paper>

            {/* Earnings & Incentives */}
            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalAtmIcon color="success" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Earnings
                  </Typography>
                </Stack>
                <Chip label="This Month" size="small" variant="outlined" />
              </Stack>
              
              <Box sx={{ textAlign: "center", py: 2, bgcolor: "success.50", borderRadius: 2, mb: 2 }}>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {formatCurrency(earningsSummary.totalEarnings)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Earned
                </Typography>
              </Box>
              
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Pending</Typography>
                  <Typography variant="body2" fontWeight={500} color="warning.main">
                    {formatCurrency(earningsSummary.pendingEarnings)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Paid</Typography>
                  <Typography variant="body2" fontWeight={500} color="success.main">
                    {formatCurrency(earningsSummary.paidEarnings)}
                  </Typography>
                </Stack>
              </Stack>
              
              {incentives.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Recent Incentives
                  </Typography>
                  <Stack spacing={1}>
                    {incentives.slice(0, 3).map((incentive) => (
                      <Stack key={incentive.id} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 24, height: 24, bgcolor: "success.100" }}>
                            <LocalAtmIcon sx={{ fontSize: 14, color: "success.main" }} />
                          </Avatar>
                          <Typography variant="caption">{incentive.name}</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={600} color="success.main">
                          +{formatCurrency(incentive.amount)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}
            </Paper>

            {/* Recent Activity */}
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Recent Activity
                </Typography>
              </Stack>
              
              {activityLog.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 3, bgcolor: "grey.50", borderRadius: 2 }}>
                  <AssignmentIcon sx={{ fontSize: 40, color: "grey.400", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No activity yet today
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {activityLog.slice(0, 5).map((entry) => (
                    <ListItem key={entry.id} sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: entry.type === "check_in" || entry.type === "target_complete"
                              ? "success.100"
                              : "info.100",
                          }}
                        >
                          {entry.type === "check_in" ? (
                            <LoginIcon sx={{ fontSize: 14, color: "success.main" }} />
                          ) : entry.type === "check_out" ? (
                            <LogoutIcon sx={{ fontSize: 14, color: "info.main" }} />
                          ) : entry.type === "target_complete" ? (
                            <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                          ) : (
                            <AssignmentIcon sx={{ fontSize: 14, color: "info.main" }} />
                          )}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                            {entry.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      >
        <Box sx={{ width: 350, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
            <Stack direction="row" spacing={1}>
              {unreadNotifications > 0 && (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={handleMarkAllRead}>
                    <MarkEmailReadIcon />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setNotificationDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
          
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <NotificationsIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
              <Typography color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification) => (
                <ListItemButton
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: notification.isRead ? "transparent" : "primary.50",
                    border: "1px solid",
                    borderColor: notification.isRead ? "grey.200" : "primary.200",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Typography fontSize={24}>
                      {getNotificationIcon(notification.type)}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={notification.isRead ? 400 : 600}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="text.secondary" component="span" display="block">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  {!notification.isRead && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                      }}
                    />
                  )}
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      {/* Location Permission Dialog */}
      <LocationPermissionDialog
        open={showPermissionDialog}
        onRequestPermission={handleRequestPermission}
        onClose={handleClosePermissionDialog}
        loading={locationLoading}
        error={null}
        permissionStatus={permissionStatus}
      />
    </Box>
  );
}
