"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  CircularProgress,
  IconButton,
  Badge,
  Drawer,
  Paper,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChatIcon from "@mui/icons-material/Chat";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DirectionsIcon from "@mui/icons-material/Directions";
import AssessmentIcon from "@mui/icons-material/Assessment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ScheduleIcon from "@mui/icons-material/Schedule";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import HomeIcon from "@mui/icons-material/Home";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { Company } from "@/types/auth";
import { getCompanyById } from "@/lib/company";

export default function AgentDashboard() {
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    logout,
    setCompany: setStoreCompany,
  } = useAppStore();
  const hasHydrated = useHasHydrated();
  const storedCompany = useCompany();

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Current time for greeting
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Use stored company first
  useEffect(() => {
    if (storedCompany) setCompany(storedCompany);
  }, [storedCompany]);

  // Auth check & company fetch
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
    const loadCompany = async () => {
      if (user?.companyId && !storedCompany) {
        try {
          const data = await getCompanyById(user.companyId);
          if (data) {
            setCompany(data);
            setStoreCompany(data);
          }
        } catch (e) {
          console.error("Error fetching company:", e);
        }
      }
      setIsLoading(false);
    };
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, user, router, storedCompany]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!hasHydrated || isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  if (!isAuthenticated || !user || user?.role !== "user") {
    return null;
  }

  // All navigation items
  const navItems = [
    {
      label: "Attendance",
      icon: <AccessTimeIcon />,
      path: "/attendance",
      color: "#4CAF50",
      desc: "Check in & out",
    },
    {
      label: "Targets",
      icon: <LocationOnIcon />,
      path: "/targets",
      color: "#FF9800",
      desc: "Visit targets",
    },
    {
      label: "Chat",
      icon: <ChatIcon />,
      path: "/chat",
      color: "#2196F3",
      desc: "Team messages",
    },
    {
      label: "Routes",
      icon: <DirectionsIcon />,
      path: "/routes",
      color: "#9C27B0",
      desc: "Plan routes",
    },
    {
      label: "Leave",
      icon: <EventNoteIcon />,
      path: "/leave",
      color: "#00BCD4",
      desc: "Apply for leave",
    },
    {
      label: "Expenses",
      icon: <ReceiptIcon />,
      path: "/expenses",
      color: "#F44336",
      desc: "Track expenses",
    },
    {
      label: "Reports",
      icon: <AssessmentIcon />,
      path: "/reports",
      color: "#3F51B5",
      desc: "View reports",
    },
    {
      label: "Customers",
      icon: <PeopleAltIcon />,
      path: "/crm",
      color: "#E91E63",
      desc: "Manage CRM",
    },
    {
      label: "Documents",
      icon: <AssignmentIcon />,
      path: "/documents",
      color: "#795548",
      desc: "Company docs",
    },
    {
      label: "Notifications",
      icon: <NotificationsIcon />,
      path: "/notifications",
      color: "#FF5722",
      desc: "All alerts",
    },
    {
      label: "Profile",
      icon: <AccountCircleIcon />,
      path: "/profile",
      color: "#607D8B",
      desc: "Your profile",
    },
  ];

  // Quick action cards
  const quickActions = [
    {
      label: "Mark Attendance",
      icon: <CheckCircleIcon sx={{ fontSize: 28 }} />,
      path: "/attendance",
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    },
    {
      label: "Start Visit",
      icon: <MyLocationIcon sx={{ fontSize: 28 }} />,
      path: "/targets",
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    },
    {
      label: "Team Chat",
      icon: <ChatIcon sx={{ fontSize: 28 }} />,
      path: "/chat",
      gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    },
    {
      label: "My Routes",
      icon: <DirectionsIcon sx={{ fontSize: 28 }} />,
      path: "/routes",
      gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f2f5", pb: 2 }}>
      {/* ── Header ─── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "0 0 24px 24px",
          px: 2,
          pt: 1.5,
          pb: 3,
          position: "relative",
        }}
      >
        {/* Top bar */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <IconButton
            onClick={() => setMobileMenuOpen(true)}
            sx={{ color: "#fff" }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: 1,
            }}
          >
            {company?.name || "PO-VERSE"}
          </Typography>

          <Stack direction="row" spacing={0.5}>
            <IconButton
              onClick={() => router.push("/notifications")}
              sx={{ color: "#fff" }}
            >
              <NotificationsIcon />
            </IconButton>
            <IconButton onClick={handleLogout} sx={{ color: "#fff" }}>
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Stack>

        {/* Greeting */}
        <Box sx={{ px: 0.5 }}>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}
          >
            {formatDate()}
          </Typography>
          <Typography
            variant="h5"
            sx={{ color: "#fff", fontWeight: 700, mt: 0.3 }}
          >
            {getGreeting()}, {user.name?.split(" ")[0] || "Agent"} 👋
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.7)", mt: 0.3, fontSize: "0.85rem" }}
          >
            {user.companyName || company?.name || ""}
            {user.city ? ` • ${user.city}` : ""}
          </Typography>
        </Box>

        {/* User avatar - floating */}
        <Avatar
          src={user.profilePicture || undefined}
          sx={{
            position: "absolute",
            right: 20,
            bottom: -24,
            width: 52,
            height: 52,
            border: "3px solid #fff",
            bgcolor: "#764ba2",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            cursor: "pointer",
          }}
          onClick={() => router.push("/profile")}
        >
          {user.name?.[0]?.toUpperCase() || "U"}
        </Avatar>
      </Box>

      {/* ── Quick Actions ─── */}
      <Box sx={{ px: 2, mt: 4.5 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: "#333", fontSize: "0.95rem" }}
        >
          ⚡ Quick Actions
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1.5,
          }}
        >
          {quickActions.map((action) => (
            <Paper
              key={action.label}
              onClick={() => router.push(action.path)}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                background: action.gradient,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.8,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                },
                "&:active": {
                  transform: "scale(0.96)",
                },
              }}
            >
              <Box sx={{ color: "#fff" }}>{action.icon}</Box>
              <Typography
                variant="caption"
                sx={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.65rem",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {action.label}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* ── Today's Summary Cards ─── */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: "#333", fontSize: "0.95rem" }}
        >
          📊 Today&apos;s Overview
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1.5,
          }}
        >
          <SummaryCard
            icon={<CheckCircleIcon sx={{ color: "#4CAF50" }} />}
            label="Attendance"
            value="Tap to check"
            onClick={() => router.push("/attendance")}
            bgColor="#E8F5E9"
          />
          <SummaryCard
            icon={<LocationOnIcon sx={{ color: "#FF9800" }} />}
            label="Targets"
            value="View assigned"
            onClick={() => router.push("/targets")}
            bgColor="#FFF3E0"
          />
          <SummaryCard
            icon={<ScheduleIcon sx={{ color: "#9C27B0" }} />}
            label="Schedule"
            value="Plan your day"
            onClick={() => router.push("/routes")}
            bgColor="#F3E5F5"
          />
          <SummaryCard
            icon={<TrendingUpIcon sx={{ color: "#2196F3" }} />}
            label="Reports"
            value="View progress"
            onClick={() => router.push("/reports")}
            bgColor="#E3F2FD"
          />
        </Box>
      </Box>

      {/* ── All Modules ─── */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, fontWeight: 700, color: "#333", fontSize: "0.95rem" }}
        >
          📱 All Modules
        </Typography>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {navItems.map((item, index) => (
            <Box key={item.label}>
              <Box
                onClick={() => router.push(item.path)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1.8,
                  cursor: "pointer",
                  transition: "background 0.15s",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
                  "&:active": { bgcolor: "rgba(0,0,0,0.05)" },
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${item.color}15`,
                    color: item.color,
                    mr: 2,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#222" }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#888", fontSize: "0.75rem" }}
                  >
                    {item.desc}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: "#ccc", fontSize: 20 }} />
              </Box>
              {index < navItems.length - 1 && (
                <Box sx={{ mx: 2, height: "1px", bgcolor: "#f0f0f0" }} />
              )}
            </Box>
          ))}
        </Paper>
      </Box>

      {/* ── Footer ─── */}
      <Box sx={{ textAlign: "center", mt: 3, mb: 2 }}>
        <Typography variant="caption" sx={{ color: "#aaa" }}>
          PO-VERSE Field Force Management
        </Typography>
      </Box>

      {/* ── Mobile Drawer ─── */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 300,
            background: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
          },
        }}
      >
        <Box sx={{ p: 2.5 }}>
          {/* Drawer header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={user.profilePicture || undefined}
                sx={{
                  width: 44,
                  height: 44,
                  border: "2px solid rgba(255,255,255,0.5)",
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                {user.name?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#fff", fontWeight: 600 }}
                >
                  {user.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {user.companyName || company?.name || "Agent"}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={() => setMobileMenuOpen(false)}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Drawer nav items */}
          <Box
            onClick={() => {
              router.push("/dashboard");
              setMobileMenuOpen(false);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              py: 1.3,
              px: 1,
              borderRadius: 2,
              cursor: "pointer",
              mb: 0.5,
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <HomeIcon sx={{ color: "#fff", fontSize: 22 }} />
            <Typography
              variant="body2"
              sx={{ color: "#fff", fontWeight: 600 }}
            >
              Dashboard
            </Typography>
          </Box>

          {navItems.map((item) => (
            <Box
              key={item.label}
              onClick={() => {
                router.push(item.path);
                setMobileMenuOpen(false);
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                py: 1.3,
                px: 1,
                borderRadius: 2,
                cursor: "pointer",
                mb: 0.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <Box sx={{ color: "rgba(255,255,255,0.9)", display: "flex" }}>
                {item.icon}
              </Box>
              <Typography
                variant="body2"
                sx={{ color: "#fff", fontWeight: 500 }}
              >
                {item.label}
              </Typography>
            </Box>
          ))}

          {/* Logout */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Box
              onClick={handleLogout}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                py: 1.3,
                px: 1,
                borderRadius: 2,
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <LogoutIcon sx={{ color: "rgba(255,255,255,0.9)" }} />
              <Typography
                variant="body2"
                sx={{ color: "#fff", fontWeight: 500 }}
              >
                Logout
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

/* ── Summary Card Component ─── */
function SummaryCard({
  icon,
  label,
  value,
  onClick,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  bgColor: string;
}) {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        },
        "&:active": {
          transform: "scale(0.98)",
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: "#333" }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: "#888" }}>
        {value}
      </Typography>
    </Paper>
  );
}
