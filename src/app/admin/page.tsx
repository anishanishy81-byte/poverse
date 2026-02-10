"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  InputAdornment,
  LinearProgress,
  Autocomplete,
  Tabs,
  Tab,
  CircularProgress,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChatIcon from "@mui/icons-material/Chat";
import MapIcon from "@mui/icons-material/Map";
import FlagIcon from "@mui/icons-material/Flag";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SpeedIcon from "@mui/icons-material/Speed";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import TargetIcon from "@mui/icons-material/TrackChanges";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptIcon from "@mui/icons-material/Receipt";
import FolderIcon from "@mui/icons-material/Folder";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import GetAppIcon from "@mui/icons-material/GetApp";
import { useAppStore, useIsAdmin, useIsSuperAdmin, useCompany, useHasHydrated } from "@/store";
import { User, UserRole, Company } from "@/types/auth";
import { countries, getStatesForCountry, getCitiesForState } from "@/lib/locationData";
import { getAllUsers, createUser, updateUser, deleteUser, getUserById } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { getProfilePictureUrl, resolveStorageUrl } from "@/lib/storage";
import NotificationCenter from "@/components/NotificationCenter";
import { DownloadAppButton, StoriesBar } from "@/components";
import {
  AgentActivity,
  LeaderboardEntry,
  AgentEfficiency,
  TargetCompletionStats,
  AgentStatus,
} from "@/types/adminDashboard";
import {
  subscribeToAgentActivityFeed,
  getActivityIcon,
  getActivityColor,
  calculateDailyAnalytics,
  calculateWeeklyAnalytics,
  calculateMonthlyAnalytics,
  calculateLeaderboard,
  calculateAgentEfficiency,
  getTargetCompletionStats,
  subscribeToAgentStatuses,
  formatTimeAgo,
  getStatusColor,
  getStatusLabel,
} from "@/lib/adminDashboard";
import { isNativeApp } from "@/lib/platform";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout, setCompany: setStoreCompany } = useAppStore();
  const hasHydrated = useHasHydrated();
  const storedCompany = useCompany();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();
  const showDownload = !isNativeApp();
  const appDownloadUrl = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || "/downloads/po-verse.apk";

  const [company, setCompany] = useState<Company | null>(storedCompany);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  // Dashboard Analytics State - simplified analytics type for dashboard display
  type SimpleAnalytics = {
    totalVisits: number;
    activeAgents: number;
    avgVisitsPerAgent: number;
    avgTimePerVisit: number;
    previousVisits?: number;
  };
  
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dailyAnalytics, setDailyAnalytics] = useState<SimpleAnalytics | null>(null);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<SimpleAnalytics | null>(null);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<SimpleAnalytics | null>(null);
  const [activityFeed, setActivityFeed] = useState<AgentActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [agentEfficiencies, setAgentEfficiencies] = useState<AgentEfficiency[]>([]);
  const [targetStats, setTargetStats] = useState<TargetCompletionStats | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // User Dialog
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    role: "user" as UserRole, // Admin can only create users
  });

  // Location dropdown options
  const stateOptions = useMemo(() => getStatesForCountry(userFormData.country), [userFormData.country]);
  const cityOptions = useMemo(() => getCitiesForState(userFormData.state), [userFormData.state]);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    // Redirect superadmin to superadmin dashboard
    if (isSuperAdmin) {
      router.push("/superadmin");
      return;
    }
    // Only allow admin access
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [hasHydrated, isAuthenticated, user, isAdmin, isSuperAdmin, router]);

  // Use stored company if available, otherwise fetch
  useEffect(() => {
    if (storedCompany) {
      setCompany(storedCompany);
    }
  }, [storedCompany]);

  useEffect(() => {
    if (isAuthenticated && isAdmin && !isSuperAdmin && user?.companyId) {
      if (!storedCompany) {
        fetchCompany();
      }
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin, user?.companyId]);

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

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    if (!user?.companyId || !users.length) return;
    
    setAnalyticsLoading(true);
    try {
      const agentUsers = users.filter(u => u.role === 'user');
      const agentIds = agentUsers.map(u => u.id);
      
      // Load all analytics in parallel
      const [daily, weekly, monthly, leaderboardData, efficiencyData, targetData] = await Promise.all([
        calculateDailyAnalytics(user.companyId, agentIds),
        calculateWeeklyAnalytics(user.companyId, agentIds),
        calculateMonthlyAnalytics(user.companyId, agentIds),
        calculateLeaderboard(user.companyId, agentUsers, 'daily'),
        calculateAgentEfficiency(user.companyId, agentUsers),
        getTargetCompletionStats(user.companyId),
      ]);
      
      setDailyAnalytics(daily);
      setWeeklyAnalytics(weekly);
      setMonthlyAnalytics(monthly);
      setLeaderboard(leaderboardData);
      setAgentEfficiencies(efficiencyData);
      setTargetStats(targetData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user?.companyId, users]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.companyId || !isAuthenticated || !isAdmin) return;

    // Subscribe to activity feed
    const unsubscribeActivity = subscribeToAgentActivityFeed(
      user.companyId,
      (activities) => setActivityFeed(activities),
      50
    );

    // Subscribe to agent statuses
    const unsubscribeStatuses = subscribeToAgentStatuses(
      user.companyId,
      (statuses) => setAgentStatuses(statuses)
    );

    return () => {
      unsubscribeActivity();
      unsubscribeStatuses();
    };
  }, [user?.companyId, isAuthenticated, isAdmin]);

  // Load analytics when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      loadAnalyticsData();
    }
  }, [users, loadAnalyticsData]);

  const fetchCompany = async () => {
    if (!user?.companyId) return;
    setIsLoading(true);
    try {
      const companyData = await getCompanyById(user.companyId);
      if (companyData) {
        setCompany(companyData);
        setStoreCompany(companyData); // Update store
      }
    } catch (error) {
      console.error("Error fetching company:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user?.companyId) return;
    try {
      const usersData = await getAllUsers(user.companyId);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Get current analytics based on selected period
  const currentAnalytics = analyticsPeriod === 'daily' 
    ? dailyAnalytics 
    : analyticsPeriod === 'weekly' 
      ? weeklyAnalytics 
      : monthlyAnalytics;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // User handlers
  const handleOpenCreateUserDialog = () => {
    // Check user limit
    if (company && (company.adminCount + company.agentCount) >= company.userLimit) {
      setFormError(`User limit reached (${company.userLimit}). Please contact SuperAdmin to increase the limit.`);
      return;
    }

    setUserDialogMode("create");
    setSelectedUser(null);
    setUserFormData({
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      country: "",
      role: "user",
    });
    setFormError(null);
    setFormSuccess(null);
    setOpenUserDialog(true);
  };

  const handleOpenEditUserDialog = (userToEdit: User) => {
    setUserDialogMode("edit");
    setSelectedUser(userToEdit);
    setUserFormData({
      username: userToEdit.username,
      password: "",
      confirmPassword: "",
      name: userToEdit.name,
      email: userToEdit.email || "",
      phone: userToEdit.phone || "",
      city: userToEdit.city || "",
      state: userToEdit.state || "",
      country: userToEdit.country || "",
      role: userToEdit.role,
    });
    setFormError(null);
    setFormSuccess(null);
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setSelectedUser(null);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmitUser = async () => {
    if (!user || !user.companyId) return;
    setFormError(null);

    // Validate required fields
    if (!userFormData.username || !userFormData.name || !userFormData.email || !userFormData.phone) {
      setFormError("Username, name, email, and phone are required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormData.email)) {
      setFormError("Please enter a valid email address");
      return;
    }

    if (userDialogMode === "create") {
      if (!userFormData.password) {
        setFormError("Password is required for new users");
        return;
      }
      if (userFormData.password.length < 6) {
        setFormError("Password must be at least 6 characters");
        return;
      }
      if (userFormData.password !== userFormData.confirmPassword) {
        setFormError("Passwords do not match");
        return;
      }
    } else if (userFormData.password && userFormData.password !== userFormData.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    // Check user limit for new users
    if (userDialogMode === "create" && company) {
      if ((company.adminCount + company.agentCount) >= company.userLimit) {
        setFormError(`User limit reached (${company.userLimit}). Please contact SuperAdmin to increase the limit.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Force role to 'user' - admins can only create agents
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...dataWithoutConfirm } = userFormData;
      const { password, ...rest } = dataWithoutConfirm;
      const formDataToSubmit = {
        ...rest,
        role: "user" as const,
      };

      if (userDialogMode === "create") {
        const result = await createUser(
          {
            ...formDataToSubmit,
            password: password || "",
            companyId: user.companyId,
          },
          user.id
        );

        if (!result.success) {
          setFormError(result.error || "Operation failed");
          return;
        }
      } else if (selectedUser?.id) {
        const result = await updateUser(selectedUser.id, {
          ...formDataToSubmit,
          companyId: user.companyId,
          password: password || undefined,
        });

        if (!result.success) {
          setFormError(result.error || "Operation failed");
          return;
        }
      }

      setFormSuccess(
        userDialogMode === "create"
          ? "User created successfully!"
          : "User updated successfully!"
      );
      fetchUsers();
      fetchCompany(); // Refresh to update user counts
      setTimeout(() => {
        handleCloseUserDialog();
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setFormError("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user || !confirm("Are you sure you want to deactivate this user?")) return;

    try {
      const result = await deleteUser(userId);

      if (result.success) {
        fetchUsers();
        fetchCompany();
      } else {
        alert(result.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("An error occurred");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.id !== user?.id && // Don't show self
      (u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalUsers = company ? company.adminCount + company.agentCount : 0;
  const userLimitPercentage = company ? (totalUsers / company.userLimit) * 100 : 0;

  // Admin navigation menu items
  const adminNavItems = [
    { label: "Live Map", icon: <MapIcon />, path: "/admin/maps" },
    { label: "Attendance", icon: <CalendarMonthIcon />, path: "/admin/attendance" },
    { label: "Reports", icon: <AssessmentIcon />, path: "/admin/reports" },
    { label: "Targets", icon: <FlagIcon />, path: "/targets" },
    { label: "Assign Targets", icon: <TargetIcon />, path: "/admin/targets" },
    { label: "Leave", icon: <CalendarMonthIcon />, path: "/admin/leave" },
    { label: "Expenses", icon: <ReceiptIcon />, path: "/admin/expenses" },
    { label: "Documents", icon: <FolderIcon />, path: "/admin/documents" },
    { label: "Customers", icon: <PeopleAltIcon />, path: "/crm" },
    { label: "Chat", icon: <ChatIcon />, path: "/chat" },
    { label: "Profile", icon: <AccountCircleIcon />, path: "/profile" },
  ];

  if (!isAuthenticated || !isAdmin || isSuperAdmin) {
    return null;
  }

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
            background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
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
                  {user?.name?.charAt(0)?.toUpperCase() || <SupervisorAccountIcon />}
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "white" }}>
                  {user?.name}
                </Typography>
                <Chip
                  label="ADMIN"
                  size="small"
                  sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#92400e", color: "white" }}
                />
              </Box>
            </Stack>
            <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1 }} />
        </Box>
        <List sx={{ px: 1 }}>
          {adminNavItems.map((item) => (
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
              color: "#ffcdd2",
              "&:hover": {
                bgcolor: "rgba(255,205,210,0.15)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#ffcdd2", minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          py: 1.5,
          px: { xs: 2, md: 3 },
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {/* Left: Menu + Logo */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Mobile Menu Button */}
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: "white", display: { xs: "flex", lg: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              
              {company?.logo ? (
                <Avatar
                  src={company.logo}
                  alt={company.name}
                  sx={{ width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 }, borderRadius: 1 }}
                  variant="rounded"
                />
              ) : (
                <Avatar sx={{ width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 }, bgcolor: "rgba(255,255,255,0.2)", borderRadius: 1 }} variant="rounded">
                  <BusinessIcon />
                </Avatar>
              )}
              <Typography 
                variant="h6" 
                fontWeight={700} 
                sx={{ color: "white", display: { xs: "none", sm: "block" } }}
              >
                {company?.name || "Admin Dashboard"}
              </Typography>
            </Stack>

            {/* Desktop Navigation */}
            <Stack 
              direction="row" 
              spacing={0.5} 
              alignItems="center"
              sx={{ display: { xs: "none", lg: "flex" } }}
            >
              {adminNavItems.slice(0, 8).map((item) => (
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

            {/* Right: User Info + Actions */}
            <Stack direction="row" spacing={1} alignItems="center">
              {/* User info - desktop only */}
              <Stack 
                direction="row" 
                spacing={1} 
                alignItems="center" 
                sx={{ 
                  display: { xs: "none", md: "flex" },
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                }}
              >
                {userProfilePicture ? (
                  <Avatar 
                    src={userProfilePicture}
                    alt={user?.name}
                    sx={{ width: 28, height: 28 }}
                  />
                ) : (
                  <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(255,255,255,0.2)" }}>
                    <SupervisorAccountIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                <Box>
                  <Typography fontWeight={500} sx={{ color: "white", fontSize: "0.8rem", lineHeight: 1.2 }}>
                    {user?.name}
                  </Typography>
                  <Chip
                    label="ADMIN"
                    size="small"
                    sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#92400e", color: "white" }}
                  />
                </Box>
              </Stack>
              
              <DownloadAppButton
                variant="outlined"
                size="small"
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  color: "white",
                  borderColor: "rgba(255,255,255,0.45)",
                  "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                }}
              />

              <NotificationCenter iconColor="white" />
              
              {/* Quick Actions - tablet only */}
              <Stack 
                direction="row" 
                spacing={0.5} 
                sx={{ display: { xs: "none", sm: "flex", lg: "none" } }}
              >
                <Tooltip title="Live Map">
                  <IconButton
                    onClick={() => router.push("/admin/maps")}
                    size="small"
                    sx={{ color: "white" }}
                  >
                    <MapIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reports">
                  <IconButton
                    onClick={() => router.push("/admin/reports")}
                    size="small"
                    sx={{ color: "white" }}
                  >
                    <AssessmentIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
              
              {/* Profile Button */}
              <Tooltip title="Profile">
                <IconButton
                  onClick={() => router.push("/profile")}
                  sx={{ color: "white", p: 0.5 }}
                  size="small"
                >
                  {userProfilePicture ? (
                    <Avatar 
                      src={userProfilePicture}
                      alt={user?.name}
                      sx={{ width: 28, height: 28 }}
                    />
                  ) : (
                    <AccountCircleIcon />
                  )}
                </IconButton>
              </Tooltip>

              {/* Logout */}
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Company Info Card */}
        {company && (
          <Card sx={{ mb: 4, background: "white" }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center">
                {company.logo ? (
                  <Avatar
                    src={company.logo}
                    alt={company.name}
                    sx={{ width: 80, height: 80, borderRadius: 2 }}
                    variant="rounded"
                  />
                ) : (
                  <Avatar
                    sx={{ width: 80, height: 80, bgcolor: "#f59e0b", borderRadius: 2 }}
                    variant="rounded"
                  >
                    <BusinessIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {company.name}
                  </Typography>
                  {company.city && (
                    <Typography color="text.secondary">
                      📍 {company.city}, {company.state}, {company.country}
                    </Typography>
                  )}
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />
                <Box sx={{ textAlign: "center", minWidth: 200 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    User Capacity
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={userLimitPercentage >= 100 ? "error.main" : "primary.main"}>
                    {totalUsers} / {company.userLimit}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(userLimitPercentage, 100)}
                    color={userLimitPercentage >= 100 ? "error" : userLimitPercentage >= 80 ? "warning" : "primary"}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Stories Bar */}
        {user && (user.companyId || company) && (
          <Paper sx={{ mb: 4, p: 2, background: "white" }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Team Stories
            </Typography>
            <StoriesBar
              userId={user.id}
              userName={user.name || user.email || "Admin"}
              companyId={user.companyId || company?.id || ""}
              userProfilePicture={userProfilePicture || user.profilePicture}
              companyUsers={users.map((u) => ({
                id: u.id,
                name: u.name || u.email || "User",
                profilePicture: u.profilePicture,
              }))}
            />
          </Paper>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ background: "white" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Admins
                    </Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ color: "#f59e0b" }}>
                      {company?.adminCount || 0}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#f59e0b", width: 56, height: 56 }}>
                    <SupervisorAccountIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ background: "white" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Agents
                    </Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ color: "#10b981" }}>
                      {company?.agentCount || 0}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#10b981", width: 56, height: 56 }}>
                    <PersonIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ background: "white" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      User Limit
                    </Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ color: "#667eea" }}>
                      {company?.userLimit || 0}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#667eea", width: 56, height: 56 }}>
                    <PeopleIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Analytics Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <AssessmentIcon sx={{ color: "#f59e0b" }} />
              <Typography variant="h6" fontWeight={600}>
                Performance Analytics
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Tabs
                value={analyticsPeriod}
                onChange={(_, v) => setAnalyticsPeriod(v)}
                sx={{ minHeight: 36 }}
              >
                <Tab value="daily" label="Daily" sx={{ minHeight: 36, py: 0 }} />
                <Tab value="weekly" label="Weekly" sx={{ minHeight: 36, py: 0 }} />
                <Tab value="monthly" label="Monthly" sx={{ minHeight: 36, py: 0 }} />
              </Tabs>
              <IconButton size="small" onClick={loadAnalyticsData} disabled={analyticsLoading}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Stack>

          {analyticsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Visits Completed */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Visits Completed
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                          {currentAnalytics?.totalVisits || 0}
                        </Typography>
                        {currentAnalytics && currentAnalytics.previousVisits && currentAnalytics.previousVisits > 0 && (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                            {currentAnalytics.totalVisits >= currentAnalytics.previousVisits ? (
                              <TrendingUpIcon fontSize="small" />
                            ) : (
                              <TrendingDownIcon fontSize="small" />
                            )}
                            <Typography variant="caption">
                              vs previous: {currentAnalytics.previousVisits}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                        <CheckCircleIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Active Agents */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white" }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Active Agents
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                          {currentAnalytics?.activeAgents || 0}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          of {company?.agentCount || 0} total
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                        <DirectionsWalkIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Avg Visits per Agent */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", color: "white" }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Avg per Agent
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                          {currentAnalytics?.avgVisitsPerAgent?.toFixed(1) || '0'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          visits/agent
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                        <SpeedIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Avg Time per Visit */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Avg Visit Time
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                          {currentAnalytics?.avgTimePerVisit || 0}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          minutes
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                        <AccessTimeIcon />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Paper>

        {/* Activity Feed & Leaderboard Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Real-time Activity Feed */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Badge badgeContent={activityFeed.length} color="error" max={99}>
                    <AccessTimeIcon sx={{ color: "#f59e0b" }} />
                  </Badge>
                  <Typography variant="h6" fontWeight={600}>
                    Live Activity Feed
                  </Typography>
                </Stack>
              </Stack>
              
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {activityFeed.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <AccessTimeIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                    <Typography color="text.secondary">No recent activity</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {activityFeed.slice(0, 20).map((activity) => (
                      <Paper
                        key={activity.id}
                        variant="outlined"
                        sx={{ p: 1.5, bgcolor: '#f9fafb' }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: getActivityColor(activity.type),
                              fontSize: '0.9rem'
                            }}
                          >
                            {getActivityIcon(activity.type)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} noWrap>
                              {activity.agentName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {activity.description}
                            </Typography>
                            {activity.targetName && (
                              <Chip
                                size="small"
                                icon={<LocationOnIcon sx={{ fontSize: '0.75rem !important' }} />}
                                label={activity.targetName}
                                sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {formatTimeAgo(activity.timestamp)}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Performance Leaderboard */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmojiEventsIcon sx={{ color: "#f59e0b" }} />
                  <Typography variant="h6" fontWeight={600}>
                    Agent Leaderboard
                  </Typography>
                </Stack>
                <Chip label={`${analyticsPeriod} ranking`} size="small" />
              </Stack>

              <TableContainer sx={{ flex: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Agent</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Visits</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Targets</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaderboard.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No data available</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaderboard.map((entry, index) => (
                        <TableRow key={entry.agentId} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {index < 3 ? (
                                <Avatar
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    bgcolor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {index + 1}
                                </Avatar>
                              ) : (
                                <Typography variant="body2" sx={{ ml: 0.5 }}>#{index + 1}</Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: '#10b981', fontSize: '0.75rem' }}>
                                {entry.agentName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>{entry.agentName}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={entry.totalVisits}
                              sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="center">{entry.uniqueTargets}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={600} color="primary">
                              {entry.score.toFixed(0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Agent Efficiency & Target Stats Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Agent Efficiency Metrics */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SpeedIcon sx={{ color: "#f59e0b" }} />
                  <Typography variant="h6" fontWeight={600}>
                    Agent Efficiency
                  </Typography>
                </Stack>
              </Stack>

              {agentEfficiencies.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <SpeedIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                  <Typography color="text.secondary">No efficiency data available</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {agentEfficiencies.slice(0, 5).map((agent) => (
                    <Box key={agent.agentId}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#10b981', fontSize: '0.7rem' }}>
                            {agent.agentName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>{agent.agentName}</Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={600}>
                          {(agent.efficiencyScore * 100).toFixed(0)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={agent.efficiencyScore * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#e5e7eb',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: agent.efficiencyScore >= 0.8 ? '#10b981' : agent.efficiencyScore >= 0.5 ? '#f59e0b' : '#ef4444',
                            borderRadius: 4,
                          }
                        }}
                      />
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {agent.visitsPerDay.toFixed(1)} visits/day
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.avgTimePerVisit} min/visit
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Target Completion Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TargetIcon sx={{ color: "#f59e0b" }} />
                  <Typography variant="h6" fontWeight={600}>
                    Target Completion
                  </Typography>
                </Stack>
              </Stack>

              {!targetStats ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <TargetIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                  <Typography color="text.secondary">No target data available</Typography>
                </Box>
              ) : (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f0fdf4', borderRadius: 2 }}>
                        <Typography variant="h4" fontWeight={700} color="#166534">
                          {targetStats.totalTargets}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Total Targets</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#eff6ff', borderRadius: 2 }}>
                        <Typography variant="h4" fontWeight={700} color="#1e40af">
                          {targetStats.totalVisits}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Total Visits</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2">Overall Completion Rate</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {(targetStats.completionRate * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={targetStats.completionRate * 100}
                      sx={{
                        height: 12,
                        borderRadius: 6,
                        bgcolor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          borderRadius: 6,
                        }
                      }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Top Visited Targets</Typography>
                  <Stack spacing={1}>
                    {targetStats.topTargets.slice(0, 5).map((target, index) => (
                      <Stack key={target.targetId} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" color="text.secondary">#{index + 1}</Typography>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{target.targetName}</Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label={`${target.visitCount} visits`}
                          sx={{ bgcolor: '#dcfce7', color: '#166534' }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Agent Status Overview */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonIcon sx={{ color: "#f59e0b" }} />
              <Typography variant="h6" fontWeight={600}>
                Agent Status Overview
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                label={`Online: ${agentStatuses.filter(s => s.status === 'online').length}`}
                sx={{ bgcolor: '#dcfce7', color: '#166534' }}
              />
              <Chip
                size="small"
                label={`Busy: ${agentStatuses.filter(s => s.status === 'busy').length}`}
                sx={{ bgcolor: '#fef3c7', color: '#92400e' }}
              />
              <Chip
                size="small"
                label={`Offline: ${agentStatuses.filter(s => s.status === 'offline').length}`}
                sx={{ bgcolor: '#fee2e2', color: '#991b1b' }}
              />
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            {agentStatuses.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <PersonIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                  <Typography color="text.secondary">No agents found</Typography>
                </Box>
              </Grid>
            ) : (
              agentStatuses.map((agent) => (
                <Grid key={agent.agentId} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: getStatusColor(agent.status),
                              border: '2px solid white',
                            }}
                          />
                        }
                      >
                        <Avatar sx={{ bgcolor: '#10b981' }}>
                          {agent.agentName.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {agent.agentName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {getStatusLabel(agent.status)}
                          </Typography>
                          {agent.currentActivity && (
                            <>
                              <Typography variant="caption" color="text.secondary">•</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {agent.currentActivity}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Paper>

        {/* Users Section */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Manage Users
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                placeholder="Search users..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 250 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateUserDialog}
                disabled={company ? (company.adminCount + company.agentCount) >= company.userLimit : false}
                sx={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
              >
                Add User
              </Button>
            </Stack>
          </Stack>

          {formError && !openUserDialog && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          {isLoading ? (
            <Typography>Loading users...</Typography>
          ) : filteredUsers.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f9fafb" }}>
              <PeopleIcon sx={{ fontSize: 64, color: "#d1d5db", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No users yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Create your first user to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateUserDialog}
                disabled={company ? (company.adminCount + company.agentCount) >= company.userLimit : false}
              >
                Create User
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f9fafb" }}>
                    <TableCell>User</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: u.role === "admin" ? "#f59e0b" : "#10b981",
                              width: 32,
                              height: 32,
                            }}
                          >
                            {u.role === "admin" ? (
                              <SupervisorAccountIcon fontSize="small" />
                            ) : (
                              <PersonIcon fontSize="small" />
                            )}
                          </Avatar>
                          <Typography fontWeight={500}>{u.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.role.toUpperCase()}
                          size="small"
                          color={u.role === "admin" ? "warning" : "info"}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{u.email || "-"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.phone || ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={u.isActive ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEditUserDialog(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* User Dialog */}
      <Dialog open={openUserDialog} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {userDialogMode === "create" ? "Create New User" : "Edit User"}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {formError}
            </Alert>
          )}
          {formSuccess && (
            <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
              {formSuccess}
            </Alert>
          )}
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Username"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              fullWidth
              required
              disabled={userDialogMode === "edit"}
              helperText="Required"
            />
            <TextField
              label={
                userDialogMode === "create"
                  ? "Password"
                  : "New Password (leave blank to keep current)"
              }
              type="password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              fullWidth
              required={userDialogMode === "create"}
              helperText={userDialogMode === "create" ? "Required - Min 6 characters" : "Leave blank to keep current"}
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={userFormData.confirmPassword}
              onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
              fullWidth
              required={userDialogMode === "create" || !!userFormData.password}
              error={!!userFormData.password && userFormData.password !== userFormData.confirmPassword}
              helperText={
                userFormData.password && userFormData.password !== userFormData.confirmPassword
                  ? "Passwords do not match"
                  : userDialogMode === "create" ? "Required" : "Required if changing password"
              }
            />
            <Divider />
            <TextField
              label="Full Name"
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              fullWidth
              required
              helperText="Required"
            />
            <TextField
              label="Email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              fullWidth
              required
              helperText="Required"
            />
            <TextField
              label="Phone"
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              fullWidth
              required
              helperText="Required"
            />
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">
              Location (Optional)
            </Typography>
            <Autocomplete
              options={countries}
              value={userFormData.country || null}
              onChange={(_, newValue) => {
                setUserFormData({ 
                  ...userFormData, 
                  country: newValue || "", 
                  state: "", 
                  city: "" 
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Country" placeholder="Select or type to search" />
              )}
              freeSolo
              autoHighlight
            />
            <Autocomplete
              options={stateOptions}
              value={userFormData.state || null}
              onChange={(_, newValue) => {
                setUserFormData({ 
                  ...userFormData, 
                  state: newValue || "", 
                  city: "" 
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="State" placeholder="Select or type to search" />
              )}
              freeSolo
              autoHighlight
              disabled={!userFormData.country}
            />
            <Autocomplete
              options={cityOptions}
              value={userFormData.city || null}
              onChange={(_, newValue) => {
                setUserFormData({ ...userFormData, city: newValue || "" });
              }}
              renderInput={(params) => (
                <TextField {...params} label="City" placeholder="Select or type to search" />
              )}
              freeSolo
              autoHighlight
              disabled={!userFormData.state}
            />
            <Divider />
            {/* Admin can only create agents/users, not other admins */}
            <TextField
              label="Role"
              value="Agent (User)"
              fullWidth
              disabled
              helperText="Admins can only create agents"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseUserDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitUser}
            variant="contained"
            disabled={isSubmitting}
            sx={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
          >
            {isSubmitting ? "Saving..." : userDialogMode === "create" ? "Create User" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
