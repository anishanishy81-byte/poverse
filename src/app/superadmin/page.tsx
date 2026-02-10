"use client";

import { useEffect, useState, useRef } from "react";
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
  CardMedia,
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
  Tabs,
  Tab,
  Fab,
  InputAdornment,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChatIcon from "@mui/icons-material/Chat";
import SearchIcon from "@mui/icons-material/Search";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MapIcon from "@mui/icons-material/Map";
import GetAppIcon from "@mui/icons-material/GetApp";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FlagIcon from "@mui/icons-material/Flag";
import StorageIcon from "@mui/icons-material/Storage";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FilterListIcon from "@mui/icons-material/FilterList";
import Image from "next/image";
import { useAppStore, useIsSuperAdmin, useHasHydrated } from "@/store";
import { User, UserRole, Company } from "@/types/auth";
import { Target } from "@/types/target";
import { isNativeApp } from "@/lib/platform";
import { DownloadAppButton } from "@/components";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "@/lib/auth";
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from "@/lib/company";
import {
  subscribeToAllCompanyTargets,
} from "@/lib/targetTracking";
import { fullDeleteUser, getUserDataSummary } from "@/lib/userDeletion";
import { realtimeDb } from "@/lib/firebase";
import { ref, get } from "firebase/database";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, user, logout } = useAppStore();
  const isSuperAdmin = useIsSuperAdmin();
  const showDownload = !isNativeApp();
  const appDownloadUrl = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || "/downloads/po-verse.apk";
  
  const [tabValue, setTabValue] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  
  // Company Dialog
  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [companyDialogMode, setCompanyDialogMode] = useState<"create" | "edit">("create");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    logo: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    phone: "",
    email: "",
    website: "",
    description: "",
    industry: "",
    adminLimit: 5,
    agentLimit: 50,
  });
  
  // User Dialog
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    role: "user" as UserRole,
    companyId: "",
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // Targets state
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedCompanyForTargets, setSelectedCompanyForTargets] = useState<string>("");
  
  // Database viewer state
  const [dbData, setDbData] = useState<Record<string, unknown>>({});
  const [dbLoading, setDbLoading] = useState(false);
  const [dbFilter, setDbFilter] = useState("");
  const [dbSelectedPath, setDbSelectedPath] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Delete confirmation dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(false);
  const [deleteDetails, setDeleteDetails] = useState<string[]>([]);
  const [userDataSummary, setUserDataSummary] = useState<Record<string, number>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) return;
    
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [hasHydrated, isAuthenticated, isSuperAdmin, router]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && isSuperAdmin) {
      fetchCompanies();
      fetchUsers();
    }
  }, [hasHydrated, isAuthenticated, isSuperAdmin]);

  // Fetch user profile picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const result = await getUserById(user.id);
        if (result.user?.profilePicture) {
          setUserProfilePicture(result.user.profilePicture);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Subscribe to targets for selected company
  useEffect(() => {
    if (!selectedCompanyForTargets) {
      setTargets([]);
      return;
    }
    
    const unsubscribe = subscribeToAllCompanyTargets(selectedCompanyForTargets, (companyTargets) => {
      setTargets(companyTargets);
    });
    
    return () => unsubscribe();
  }, [selectedCompanyForTargets]);

  // Set default company for targets when companies load
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyForTargets) {
      setSelectedCompanyForTargets(companies[0].id);
    }
  }, [companies, selectedCompanyForTargets]);

  const fetchCompanies = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const companiesData = await getAllCompanies();
      setCompanies(companiesData);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user) return;
    try {
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Company handlers
  const handleOpenCreateCompanyDialog = () => {
    setCompanyDialogMode("create");
    setSelectedCompany(null);
    setCompanyFormData({
      name: "",
      logo: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      phone: "",
      email: "",
      website: "",
      description: "",
      industry: "",
      adminLimit: 5,
      agentLimit: 50,
    });
    setFormError(null);
    setFormSuccess(null);
    setOpenCompanyDialog(true);
  };

  const handleOpenEditCompanyDialog = (company: Company) => {
    setCompanyDialogMode("edit");
    setSelectedCompany(company);
    setCompanyFormData({
      name: company.name,
      logo: company.logo || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      country: company.country || "India",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      description: company.description || "",
      industry: company.industry || "",
      adminLimit: company.adminLimit || 5,
      agentLimit: company.agentLimit || 50,
    });
    setFormError(null);
    setFormSuccess(null);
    setOpenCompanyDialog(true);
  };

  const handleCloseCompanyDialog = () => {
    setOpenCompanyDialog(false);
    setSelectedCompany(null);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyFormData({ ...companyFormData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitCompany = async () => {
    if (!user) return;
    setFormError(null);

    if (!companyFormData.name) {
      setFormError("Company name is required");
      return;
    }

    try {
      if (companyDialogMode === "create") {
        const result = await createCompany(companyFormData, user.id);
        if (!result.success) {
          setFormError(result.error || "Operation failed");
          return;
        }
      } else if (selectedCompany?.id) {
        const result = await updateCompany(selectedCompany.id, companyFormData);
        if (!result.success) {
          setFormError(result.error || "Operation failed");
          return;
        }
      }

      setFormSuccess(
        companyDialogMode === "create"
          ? "Company created successfully!"
          : "Company updated successfully!"
      );
      fetchCompanies();
      setTimeout(() => {
        handleCloseCompanyDialog();
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setFormError("An error occurred");
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!user || !confirm("Are you sure you want to delete this company?")) return;

    try {
      const result = await deleteCompany(companyId);

      if (result.success) {
        fetchCompanies();
      } else {
        alert(result.error || "Failed to delete company");
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("An error occurred");
    }
  };

  // User handlers
  const handleOpenCreateUserDialog = (preselectedCompanyId?: string) => {
    setUserDialogMode("create");
    setSelectedUser(null);
    setUserFormData({
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      role: "user",
      companyId: preselectedCompanyId || "",
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
      name: userToEdit.name,
      email: userToEdit.email || "",
      phone: userToEdit.phone || "",
      role: userToEdit.role,
      companyId: userToEdit.companyId || "",
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
    if (!user) return;
    setFormError(null);

    if (!userFormData.username || !userFormData.name) {
      setFormError("Username and name are required");
      return;
    }

    if (userDialogMode === "create" && !userFormData.password) {
      setFormError("Password is required for new users");
      return;
    }

    if (userFormData.role !== "superadmin" && !userFormData.companyId) {
      setFormError("Please select a company for this user");
      return;
    }

    if (userFormData.role === "superadmin") {
      setFormError("Cannot create another superadmin");
      return;
    }

    // Check user limit for the company when creating
    if (userDialogMode === "create" && userFormData.companyId) {
      const company = await getCompanyById(userFormData.companyId);
      if (company) {
        const currentUserCount = company.adminCount + company.agentCount;
        if (currentUserCount >= company.userLimit) {
          setFormError(
            `User limit reached (${company.userLimit}). Cannot create more users for this company.`
          );
          return;
        }
      }
    }

    try {
      if (userDialogMode === "create") {
        const result = await createUser(
          {
            username: userFormData.username,
            password: userFormData.password,
            name: userFormData.name,
            role: userFormData.role,
            email: userFormData.email,
            phone: userFormData.phone,
            companyId: userFormData.companyId || undefined,
          },
          user.id
        );

        if (!result.success) {
          setFormError(result.error || "Operation failed");
          return;
        }
      } else if (selectedUser?.id) {
        const { password, ...updates } = userFormData;
        const result = await updateUser(selectedUser.id, {
          ...updates,
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
      fetchCompanies(); // Refresh to update user counts
      setTimeout(() => {
        handleCloseUserDialog();
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setFormError("An error occurred");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user) return;
    if (userId === user.id) {
      alert("Cannot delete yourself");
      return;
    }
    
    // Find the user to show details
    const userToRemove = users.find(u => u.id === userId);
    if (!userToRemove) return;
    
    setUserToDelete(userToRemove);
    setDeleteDetails([]);
    setDeleteProgress(false);
    
    // Get data summary
    try {
      const summary = await getUserDataSummary(userId);
      setUserDataSummary(summary);
    } catch {
      setUserDataSummary({});
    }
    
    setDeleteConfirmDialog(true);
  };

  const handleConfirmFullDelete = async () => {
    if (!userToDelete) return;
    setDeleteProgress(true);
    setDeleteDetails(["Starting full deletion..."]);
    
    try {
      const result = await fullDeleteUser(userToDelete.id);
      
      if (result.details) {
        setDeleteDetails(result.details);
      }
      
      if (result.success) {
        setDeleteDetails(prev => [...prev, "", "✅ User completely deleted!"]);
        // Refresh data
        fetchUsers();
        fetchCompanies();
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          setDeleteConfirmDialog(false);
          setUserToDelete(null);
        }, 3000);
      } else {
        setDeleteDetails(prev => [...prev, "", `❌ ${result.error}`]);
      }
    } catch (error) {
      setDeleteDetails(prev => [...prev, `❌ Error: ${(error as Error).message}`]);
    } finally {
      setDeleteProgress(false);
    }
  };

  // Database viewer functions
  const loadDatabaseData = async (path: string = "") => {
    setDbLoading(true);
    try {
      const dbRef = ref(realtimeDb, path || "/");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        setDbData(snapshot.val());
      } else {
        setDbData({});
      }
      setDbSelectedPath(path);
    } catch (error) {
      console.error("Error loading database:", error);
      setDbData({ error: "Failed to load data" });
    } finally {
      setDbLoading(false);
    }
  };

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getCompanyName = (companyId: string | undefined) => {
    if (!companyId) return "-";
    const company = companies.find((c) => c.id === companyId);
    return company?.name || "-";
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCompanyName(u.companyId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !isSuperAdmin) {
    return null;
  }

  const stats = [
    { title: "Total Companies", value: companies.length, icon: <BusinessIcon />, color: "#667eea" },
    { title: "Total Admins", value: users.filter((u) => u.role === "admin").length, icon: <SupervisorAccountIcon />, color: "#f59e0b" },
    { title: "Total Agents", value: users.filter((u) => u.role === "user").length, icon: <PeopleIcon />, color: "#10b981" },
  ];

  // SuperAdmin navigation items
  const superadminNavItems = [
    { label: "Live Maps", icon: <MapIcon />, path: "/superadmin/maps" },
    { label: "Chat", icon: <ChatIcon />, path: "/chat" },
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
            background: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
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
                  <AdminPanelSettingsIcon />
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "white" }}>
                  {user?.name}
                </Typography>
                <Chip
                  label="SUPERADMIN"
                  size="small"
                  sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#ef4444", color: "white" }}
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
          {superadminNavItems.map((item) => (
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                sx={{ color: "white", display: { xs: "flex", sm: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              
              <Image src="/logo.png" alt="Logo" width={36} height={36} style={{ borderRadius: 8 }} />
              <Typography 
                variant="h6" 
                fontWeight={700} 
                sx={{ color: "white", display: { xs: "none", sm: "block" } }}
              >
                PO-VERSE SuperAdmin
              </Typography>
            </Stack>

            {/* Right: User + Actions */}
            <Stack direction="row" spacing={1} alignItems="center">
              {/* User info - tablet+ */}
              <Stack 
                direction="row" 
                spacing={1} 
                alignItems="center" 
                sx={{ 
                  display: { xs: "none", sm: "flex" },
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
                    <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                <Box>
                  <Typography fontWeight={500} sx={{ color: "white", fontSize: "0.8rem", lineHeight: 1.2 }}>
                    {user?.name}
                  </Typography>
                  <Chip
                    label="SUPERADMIN"
                    size="small"
                    sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#ef4444", color: "white" }}
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

              {/* Quick Actions - tablet+ */}
              <Stack 
                direction="row" 
                spacing={0.5} 
                sx={{ display: { xs: "none", sm: "flex" } }}
              >
                <Tooltip title="Live Maps">
                  <IconButton
                    onClick={() => router.push("/superadmin/maps")}
                    size="small"
                    sx={{
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                    }}
                  >
                    <MapIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Chat">
                  <IconButton
                    onClick={() => router.push("/chat")}
                    size="small"
                    sx={{
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                    }}
                  >
                    <ChatIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Profile">
                  <IconButton
                    onClick={() => router.push("/profile")}
                    size="small"
                    sx={{
                      color: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                      p: userProfilePicture ? 0.5 : 1,
                    }}
                  >
                    {userProfilePicture ? (
                      <Avatar 
                        src={userProfilePicture}
                        alt={user?.name}
                        sx={{ width: 24, height: 24 }}
                      />
                    ) : (
                      <AccountCircleIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
              
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
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card sx={{ background: "white" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {stat.title}
                      </Typography>
                      <Typography variant="h3" fontWeight={700} sx={{ color: stat.color }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                      {stat.icon}
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => {
              setTabValue(newValue);
              // Load database data when switching to DB tab
              if (newValue === 3 && Object.keys(dbData).length === 0) {
                loadDatabaseData();
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { fontWeight: 600 },
            }}
          >
            <Tab icon={<BusinessIcon />} label="Companies" iconPosition="start" />
            <Tab icon={<PeopleIcon />} label="All Users" iconPosition="start" />
            <Tab icon={<FlagIcon />} label="All Targets" iconPosition="start" />
            <Tab icon={<StorageIcon />} label="Database" iconPosition="start" />
          </Tabs>

          {/* Search Bar */}
          <Box sx={{ p: 2 }}>
            <TextField
              placeholder="Search..."
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
              sx={{ width: 300 }}
            />
          </Box>

          {/* Companies Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Manage Companies
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateCompanyDialog}
                  sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                >
                  Add Company
                </Button>
              </Stack>

              {isLoading ? (
                <Typography>Loading companies...</Typography>
              ) : filteredCompanies.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f9fafb" }}>
                  <BusinessIcon sx={{ fontSize: 64, color: "#d1d5db", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No companies yet
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Create your first company to get started
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateCompanyDialog}>
                    Create Company
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {filteredCompanies.map((company) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={company.id}>
                      <Card
                        sx={{
                          height: "100%",
                          transition: "all 0.3s",
                          "&:hover": { boxShadow: 6, transform: "translateY(-4px)" },
                        }}
                      >
                        {company.logo ? (
                          <CardMedia
                            component="img"
                            height="120"
                            image={company.logo}
                            alt={company.name}
                            sx={{ objectFit: "contain", bgcolor: "#f9fafb", p: 2 }}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: 120,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "#f3f4f6",
                            }}
                          >
                            <BusinessIcon sx={{ fontSize: 48, color: "#9ca3af" }} />
                          </Box>
                        )}
                        <CardContent>
                          <Typography variant="h6" fontWeight={600} gutterBottom>
                            {company.name}
                          </Typography>
                          {company.city && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              📍 {company.city}, {company.state}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                            <Chip
                              icon={<SupervisorAccountIcon />}
                              label={`${company.adminCount} Admins`}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              icon={<PersonIcon />}
                              label={`${company.agentCount} Agents`}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              icon={<PeopleIcon />}
                              label={`Limit: ${company.userLimit}`}
                              size="small"
                              color={(company.adminCount + company.agentCount) >= company.userLimit ? "error" : "success"}
                            />
                          </Stack>
                          <Divider sx={{ my: 2 }} />
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenCreateUserDialog(company.id)}
                            >
                              Add User
                            </Button>
                            <IconButton size="small" onClick={() => handleOpenEditCompanyDialog(company)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCompany(company.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </TabPanel>

          {/* Users Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  All Users
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenCreateUserDialog()}
                  sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                  disabled={companies.length === 0}
                >
                  Add User
                </Button>
              </Stack>

              {companies.length === 0 ? (
                <Alert severity="info">Please create a company first before adding users.</Alert>
              ) : filteredUsers.length === 0 ? (
                <Typography color="text.secondary">No users found.</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f9fafb" }}>
                        <TableCell>User</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers
                        .filter((u) => u.role !== "superadmin")
                        .map((u) => (
                          <TableRow key={u.id} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: u.role === "admin" ? "#f59e0b" : "#10b981", width: 32, height: 32 }}>
                                  {u.role === "admin" ? <SupervisorAccountIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
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
                            <TableCell>{getCompanyName(u.companyId)}</TableCell>
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
                              <Tooltip title="Full Delete (removes all data)">
                                <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id)}>
                                  <DeleteForeverIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>

          {/* All Targets Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ px: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  All Targets
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Company</InputLabel>
                  <Select
                    value={selectedCompanyForTargets}
                    label="Filter by Company"
                    onChange={(e) => setSelectedCompanyForTargets(e.target.value)}
                  >
                    <MenuItem value="">All Companies</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {targets.length === 0 ? (
                <Alert severity="info">No targets found. Select a company to view targets.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f9fafb" }}>
                        <TableCell>Target Name</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Lead Status</TableCell>
                        <TableCell>Created At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {targets
                        .filter((t) => !selectedCompanyForTargets || t.companyId === selectedCompanyForTargets)
                        .map((target) => (
                          <TableRow key={target.id} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: target.createdBy ? "#10b981" : "#667eea", width: 32, height: 32 }}>
                                  <FlagIcon fontSize="small" />
                                </Avatar>
                                <Box>
                                  <Typography fontWeight={500} fontSize="0.875rem">{target.name}</Typography>
                                  {target.createdBy && (
                                    <Typography variant="caption" color="success.main">
                                      User Created
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <LocationOnIcon fontSize="small" color="action" />
                                <Typography variant="body2" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {target.location?.address || `${target.location?.latitude?.toFixed(4)}, ${target.location?.longitude?.toFixed(4)}` || "-"}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {target.createdBy || "Admin"}
                              </Typography>
                            </TableCell>
                            <TableCell>{getCompanyName(target.companyId)}</TableCell>
                            <TableCell>
                              <Chip
                                label={(target.leadStatus || "new").replace("_", " ")}
                                size="small"
                                variant="outlined"
                                color={
                                  target.leadStatus === "converted"
                                    ? "success"
                                    : target.leadStatus === "follow_up"
                                    ? "info"
                                    : target.leadStatus === "not_interested"
                                    ? "error"
                                    : "default"
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {target.createdAt
                                  ? new Date(target.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>

          {/* Database Viewer Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ px: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Realtime Database Viewer
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    placeholder="Filter keys..."
                    size="small"
                    value={dbFilter}
                    onChange={(e) => setDbFilter(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterListIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ width: 250 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => loadDatabaseData(dbSelectedPath)}
                    disabled={dbLoading}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Stack>
              </Stack>

              {/* Breadcrumb path navigation */}
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
                <Chip
                  label="/ (root)"
                  size="small"
                  onClick={() => loadDatabaseData("")}
                  color={dbSelectedPath === "" ? "primary" : "default"}
                  variant={dbSelectedPath === "" ? "filled" : "outlined"}
                  sx={{ cursor: "pointer" }}
                />
                {dbSelectedPath && dbSelectedPath.split("/").filter(Boolean).map((segment, index, arr) => {
                  const path = arr.slice(0, index + 1).join("/");
                  return (
                    <Chip
                      key={path}
                      label={segment}
                      size="small"
                      onClick={() => loadDatabaseData(path)}
                      color={dbSelectedPath === path ? "primary" : "default"}
                      variant={dbSelectedPath === path ? "filled" : "outlined"}
                      sx={{ cursor: "pointer" }}
                    />
                  );
                })}
              </Stack>

              {dbLoading ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }} color="text.secondary">Loading database...</Typography>
                </Box>
              ) : Object.keys(dbData).length === 0 ? (
                <Alert severity="info">No data at this path.</Alert>
              ) : (
                <Paper variant="outlined" sx={{ maxHeight: "60vh", overflow: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", width: "30%" }}>Key</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", width: "15%" }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5" }}>Value / Preview</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "#f5f5f5", width: "10%" }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(dbData)
                        .filter(([key]) => !dbFilter || key.toLowerCase().includes(dbFilter.toLowerCase()))
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => {
                          const isObject = typeof value === "object" && value !== null;
                          const childCount = isObject ? Object.keys(value as object).length : 0;
                          const isExpanded = expandedNodes.has(key);
                          const valueType = Array.isArray(value) ? "array" : typeof value;
                          
                          return [
                            <TableRow key={key} hover sx={{ cursor: isObject ? "pointer" : "default" }}>
                              <TableCell onClick={() => isObject && toggleNode(key)}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {isObject && (
                                    <ExpandMoreIcon 
                                      fontSize="small" 
                                      sx={{ 
                                        transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                                        transition: "transform 0.2s",
                                        color: "action.active"
                                      }} 
                                    />
                                  )}
                                  <Typography fontWeight={isObject ? 600 : 400} fontSize="0.85rem" fontFamily="monospace">
                                    {key}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={isObject ? `object (${childCount})` : valueType}
                                  size="small"
                                  color={
                                    valueType === "string" ? "info" :
                                    valueType === "number" ? "success" :
                                    valueType === "boolean" ? "warning" :
                                    isObject ? "secondary" : "default"
                                  }
                                  variant="outlined"
                                  sx={{ fontSize: "0.7rem" }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  fontSize="0.8rem" 
                                  fontFamily="monospace"
                                  sx={{ 
                                    maxWidth: 400, 
                                    overflow: "hidden", 
                                    textOverflow: "ellipsis", 
                                    whiteSpace: "nowrap",
                                    color: isObject ? "text.secondary" : "text.primary",
                                  }}
                                >
                                  {isObject 
                                    ? `{ ${Object.keys(value as object).slice(0, 5).join(", ")}${childCount > 5 ? ", ..." : ""} }` 
                                    : String(value)
                                  }
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {isObject && (
                                  <Tooltip title="Drill into">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => {
                                        const newPath = dbSelectedPath ? `${dbSelectedPath}/${key}` : key;
                                        loadDatabaseData(newPath);
                                      }}
                                    >
                                      <SearchIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>,
                            isExpanded && isObject && (
                              <TableRow key={`${key}-expanded`}>
                                <TableCell colSpan={4} sx={{ p: 0, pl: 4, bgcolor: "#fafafa" }}>
                                  <Table size="small">
                                    <TableBody>
                                      {Object.entries(value as Record<string, unknown>).slice(0, 50).map(([childKey, childValue]) => {
                                        const childIsObject = typeof childValue === "object" && childValue !== null;
                                        const childChildCount = childIsObject ? Object.keys(childValue as object).length : 0;
                                        return (
                                          <TableRow key={childKey} hover>
                                            <TableCell sx={{ width: "30%" }}>
                                              <Typography fontSize="0.8rem" fontFamily="monospace" color="text.secondary">
                                                {childKey}
                                              </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: "15%" }}>
                                              <Chip
                                                label={childIsObject ? `object (${childChildCount})` : typeof childValue}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: "0.65rem" }}
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Typography 
                                                fontSize="0.75rem" 
                                                fontFamily="monospace"
                                                sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                              >
                                                {childIsObject
                                                  ? JSON.stringify(childValue).substring(0, 200)
                                                  : String(childValue)
                                                }
                                              </Typography>
                                            </TableCell>
                                            <TableCell sx={{ width: "10%" }}>
                                              {childIsObject && (
                                                <Tooltip title="Drill into">
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                      const newPath = dbSelectedPath ? `${dbSelectedPath}/${key}/${childKey}` : `${key}/${childKey}`;
                                                      loadDatabaseData(newPath);
                                                    }}
                                                  >
                                                    <SearchIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                      {Object.keys(value as object).length > 50 && (
                                        <TableRow>
                                          <TableCell colSpan={4}>
                                            <Typography variant="caption" color="text.secondary">
                                              Showing 50 of {Object.keys(value as object).length} entries. Click drill-in to see all.
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableCell>
                              </TableRow>
                            )
                          ];
                        })}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {/* Quick access to top-level RTDB nodes */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
                Quick Access
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {["locations", "presence", "attendance", "conversations", "messages", "notifications",
                  "targets", "targetVisits", "expenses", "leaveRequests", "sessions",
                  "documents", "stories", "fcmTokens", "agentActivity",
                ].map((node) => (
                  <Chip
                    key={node}
                    label={node}
                    size="small"
                    onClick={() => loadDatabaseData(node)}
                    variant={dbSelectedPath === node ? "filled" : "outlined"}
                    color={dbSelectedPath === node ? "primary" : "default"}
                    sx={{ cursor: "pointer", mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          </TabPanel>
        </Paper>
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
        onClick={tabValue === 0 ? handleOpenCreateCompanyDialog : () => handleOpenCreateUserDialog()}
      >
        <AddIcon />
      </Fab>

      {/* Company Dialog */}
      <Dialog open={openCompanyDialog} onClose={handleCloseCompanyDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1
        }}>
          <BusinessIcon />
          {companyDialogMode === "create" ? "Create New Company" : "Edit Company"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          {formSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {formSuccess}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Logo Upload */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 2 }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                />
                {companyFormData.logo ? (
                  <Box sx={{ position: "relative", display: "inline-block" }}>
                    <img
                      src={companyFormData.logo}
                      alt="Company Logo"
                      style={{ maxHeight: 100, maxWidth: 200, objectFit: "contain", borderRadius: 8 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setCompanyFormData({ ...companyFormData, logo: "" })}
                      sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "white", "&:hover": { bgcolor: "error.dark" } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ py: 2, px: 4 }}
                  >
                    Upload Company Logo
                  </Button>
                )}
              </Paper>
            </Grid>

            {/* Basic Information Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1 }}>
                📋 Basic Information
              </Typography>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Company Name"
                value={companyFormData.name}
                onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                fullWidth
                required
                placeholder="Enter company name"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={companyFormData.industry}
                  label="Industry"
                  onChange={(e) => setCompanyFormData({ ...companyFormData, industry: e.target.value })}
                >
                  <MenuItem value="">Select Industry</MenuItem>
                  <MenuItem value="Technology">Technology</MenuItem>
                  <MenuItem value="Healthcare">Healthcare</MenuItem>
                  <MenuItem value="Finance">Finance & Banking</MenuItem>
                  <MenuItem value="Retail">Retail & E-commerce</MenuItem>
                  <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="Real Estate">Real Estate</MenuItem>
                  <MenuItem value="Education">Education</MenuItem>
                  <MenuItem value="FMCG">FMCG</MenuItem>
                  <MenuItem value="Pharma">Pharmaceutical</MenuItem>
                  <MenuItem value="Logistics">Logistics & Transportation</MenuItem>
                  <MenuItem value="Agriculture">Agriculture</MenuItem>
                  <MenuItem value="Telecom">Telecom</MenuItem>
                  <MenuItem value="Insurance">Insurance</MenuItem>
                  <MenuItem value="Construction">Construction</MenuItem>
                  <MenuItem value="Media">Media & Entertainment</MenuItem>
                  <MenuItem value="Hospitality">Hospitality</MenuItem>
                  <MenuItem value="Automobile">Automobile</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={companyFormData.description}
                onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Brief description about the company"
              />
            </Grid>

            {/* Contact Information Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1, mt: 1 }}>
                📞 Contact Information
              </Typography>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Email"
                type="email"
                value={companyFormData.email}
                onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                fullWidth
                placeholder="company@example.com"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Phone"
                value={companyFormData.phone}
                onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                fullWidth
                placeholder="+91 XXXXX XXXXX"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Website"
                value={companyFormData.website}
                onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                fullWidth
                placeholder="https://www.example.com"
              />
            </Grid>

            {/* Address Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1, mt: 1 }}>
                📍 Address
              </Typography>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Street Address"
                value={companyFormData.address}
                onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                fullWidth
                placeholder="Building/Street name"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={companyFormData.country}
                  label="Country"
                  onChange={(e) => setCompanyFormData({ ...companyFormData, country: e.target.value, state: "", city: "" })}
                >
                  <MenuItem value="India">🇮🇳 India</MenuItem>
                  <MenuItem value="USA">🇺🇸 United States</MenuItem>
                  <MenuItem value="UK">🇬🇧 United Kingdom</MenuItem>
                  <MenuItem value="UAE">🇦🇪 UAE</MenuItem>
                  <MenuItem value="Singapore">🇸🇬 Singapore</MenuItem>
                  <MenuItem value="Australia">🇦🇺 Australia</MenuItem>
                  <MenuItem value="Canada">🇨🇦 Canada</MenuItem>
                  <MenuItem value="Germany">🇩🇪 Germany</MenuItem>
                  <MenuItem value="Other">🌍 Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={companyFormData.state}
                  label="State"
                  onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value, city: "" })}
                  disabled={!companyFormData.country}
                >
                  <MenuItem value="">Select State</MenuItem>
                  {companyFormData.country === "India" && [
                    <MenuItem key="AP" value="Andhra Pradesh">Andhra Pradesh</MenuItem>,
                    <MenuItem key="AR" value="Arunachal Pradesh">Arunachal Pradesh</MenuItem>,
                    <MenuItem key="AS" value="Assam">Assam</MenuItem>,
                    <MenuItem key="BR" value="Bihar">Bihar</MenuItem>,
                    <MenuItem key="CG" value="Chhattisgarh">Chhattisgarh</MenuItem>,
                    <MenuItem key="GA" value="Goa">Goa</MenuItem>,
                    <MenuItem key="GJ" value="Gujarat">Gujarat</MenuItem>,
                    <MenuItem key="HR" value="Haryana">Haryana</MenuItem>,
                    <MenuItem key="HP" value="Himachal Pradesh">Himachal Pradesh</MenuItem>,
                    <MenuItem key="JH" value="Jharkhand">Jharkhand</MenuItem>,
                    <MenuItem key="KA" value="Karnataka">Karnataka</MenuItem>,
                    <MenuItem key="KL" value="Kerala">Kerala</MenuItem>,
                    <MenuItem key="MP" value="Madhya Pradesh">Madhya Pradesh</MenuItem>,
                    <MenuItem key="MH" value="Maharashtra">Maharashtra</MenuItem>,
                    <MenuItem key="MN" value="Manipur">Manipur</MenuItem>,
                    <MenuItem key="ML" value="Meghalaya">Meghalaya</MenuItem>,
                    <MenuItem key="MZ" value="Mizoram">Mizoram</MenuItem>,
                    <MenuItem key="NL" value="Nagaland">Nagaland</MenuItem>,
                    <MenuItem key="OD" value="Odisha">Odisha</MenuItem>,
                    <MenuItem key="PB" value="Punjab">Punjab</MenuItem>,
                    <MenuItem key="RJ" value="Rajasthan">Rajasthan</MenuItem>,
                    <MenuItem key="SK" value="Sikkim">Sikkim</MenuItem>,
                    <MenuItem key="TN" value="Tamil Nadu">Tamil Nadu</MenuItem>,
                    <MenuItem key="TS" value="Telangana">Telangana</MenuItem>,
                    <MenuItem key="TR" value="Tripura">Tripura</MenuItem>,
                    <MenuItem key="UP" value="Uttar Pradesh">Uttar Pradesh</MenuItem>,
                    <MenuItem key="UK" value="Uttarakhand">Uttarakhand</MenuItem>,
                    <MenuItem key="WB" value="West Bengal">West Bengal</MenuItem>,
                    <MenuItem key="DL" value="Delhi">Delhi</MenuItem>,
                    <MenuItem key="JK" value="Jammu & Kashmir">Jammu & Kashmir</MenuItem>,
                    <MenuItem key="LA" value="Ladakh">Ladakh</MenuItem>,
                  ]}
                  {companyFormData.country === "USA" && [
                    <MenuItem key="CA" value="California">California</MenuItem>,
                    <MenuItem key="TX" value="Texas">Texas</MenuItem>,
                    <MenuItem key="NY" value="New York">New York</MenuItem>,
                    <MenuItem key="FL" value="Florida">Florida</MenuItem>,
                    <MenuItem key="IL" value="Illinois">Illinois</MenuItem>,
                    <MenuItem key="WA" value="Washington">Washington</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.country && !["India", "USA"].includes(companyFormData.country) && (
                    <MenuItem value="Other">Other</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>City</InputLabel>
                <Select
                  value={companyFormData.city}
                  label="City"
                  onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                  disabled={!companyFormData.state}
                >
                  <MenuItem value="">Select City</MenuItem>
                  {companyFormData.state === "Maharashtra" && [
                    <MenuItem key="Mumbai" value="Mumbai">Mumbai</MenuItem>,
                    <MenuItem key="Pune" value="Pune">Pune</MenuItem>,
                    <MenuItem key="Nagpur" value="Nagpur">Nagpur</MenuItem>,
                    <MenuItem key="Thane" value="Thane">Thane</MenuItem>,
                    <MenuItem key="Nashik" value="Nashik">Nashik</MenuItem>,
                    <MenuItem key="Aurangabad" value="Aurangabad">Aurangabad</MenuItem>,
                    <MenuItem key="Solapur" value="Solapur">Solapur</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Karnataka" && [
                    <MenuItem key="Bangalore" value="Bangalore">Bangalore</MenuItem>,
                    <MenuItem key="Mysore" value="Mysore">Mysore</MenuItem>,
                    <MenuItem key="Hubli" value="Hubli">Hubli</MenuItem>,
                    <MenuItem key="Mangalore" value="Mangalore">Mangalore</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Tamil Nadu" && [
                    <MenuItem key="Chennai" value="Chennai">Chennai</MenuItem>,
                    <MenuItem key="Coimbatore" value="Coimbatore">Coimbatore</MenuItem>,
                    <MenuItem key="Madurai" value="Madurai">Madurai</MenuItem>,
                    <MenuItem key="Salem" value="Salem">Salem</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Telangana" && [
                    <MenuItem key="Hyderabad" value="Hyderabad">Hyderabad</MenuItem>,
                    <MenuItem key="Warangal" value="Warangal">Warangal</MenuItem>,
                    <MenuItem key="Nizamabad" value="Nizamabad">Nizamabad</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Delhi" && [
                    <MenuItem key="New Delhi" value="New Delhi">New Delhi</MenuItem>,
                    <MenuItem key="North Delhi" value="North Delhi">North Delhi</MenuItem>,
                    <MenuItem key="South Delhi" value="South Delhi">South Delhi</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Gujarat" && [
                    <MenuItem key="Ahmedabad" value="Ahmedabad">Ahmedabad</MenuItem>,
                    <MenuItem key="Surat" value="Surat">Surat</MenuItem>,
                    <MenuItem key="Vadodara" value="Vadodara">Vadodara</MenuItem>,
                    <MenuItem key="Rajkot" value="Rajkot">Rajkot</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Uttar Pradesh" && [
                    <MenuItem key="Lucknow" value="Lucknow">Lucknow</MenuItem>,
                    <MenuItem key="Noida" value="Noida">Noida</MenuItem>,
                    <MenuItem key="Ghaziabad" value="Ghaziabad">Ghaziabad</MenuItem>,
                    <MenuItem key="Kanpur" value="Kanpur">Kanpur</MenuItem>,
                    <MenuItem key="Agra" value="Agra">Agra</MenuItem>,
                    <MenuItem key="Varanasi" value="Varanasi">Varanasi</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "West Bengal" && [
                    <MenuItem key="Kolkata" value="Kolkata">Kolkata</MenuItem>,
                    <MenuItem key="Howrah" value="Howrah">Howrah</MenuItem>,
                    <MenuItem key="Durgapur" value="Durgapur">Durgapur</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Rajasthan" && [
                    <MenuItem key="Jaipur" value="Jaipur">Jaipur</MenuItem>,
                    <MenuItem key="Jodhpur" value="Jodhpur">Jodhpur</MenuItem>,
                    <MenuItem key="Udaipur" value="Udaipur">Udaipur</MenuItem>,
                    <MenuItem key="Kota" value="Kota">Kota</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Kerala" && [
                    <MenuItem key="Thiruvananthapuram" value="Thiruvananthapuram">Thiruvananthapuram</MenuItem>,
                    <MenuItem key="Kochi" value="Kochi">Kochi</MenuItem>,
                    <MenuItem key="Kozhikode" value="Kozhikode">Kozhikode</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Punjab" && [
                    <MenuItem key="Chandigarh" value="Chandigarh">Chandigarh</MenuItem>,
                    <MenuItem key="Ludhiana" value="Ludhiana">Ludhiana</MenuItem>,
                    <MenuItem key="Amritsar" value="Amritsar">Amritsar</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state === "Haryana" && [
                    <MenuItem key="Gurgaon" value="Gurgaon">Gurgaon</MenuItem>,
                    <MenuItem key="Faridabad" value="Faridabad">Faridabad</MenuItem>,
                    <MenuItem key="Panipat" value="Panipat">Panipat</MenuItem>,
                    <MenuItem key="Other" value="Other">Other</MenuItem>,
                  ]}
                  {companyFormData.state && !["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Delhi", "Gujarat", "Uttar Pradesh", "West Bengal", "Rajasthan", "Kerala", "Punjab", "Haryana"].includes(companyFormData.state) && (
                    <MenuItem value="Other">Other</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* User Limits Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1, mt: 1 }}>
                👥 User Limits
              </Typography>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: "#fff3e0", borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "#f59e0b" }}>
                    <SupervisorAccountIcon />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={600}>Admin Limit</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maximum admins allowed
                    </Typography>
                  </Box>
                  <TextField
                    type="number"
                    value={companyFormData.adminLimit}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, adminLimit: Math.max(1, parseInt(e.target.value) || 1) })}
                    sx={{ width: 100 }}
                    size="small"
                    InputProps={{ inputProps: { min: 1, max: 100 } }}
                  />
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: "#e8f5e9", borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "#10b981" }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={600}>Agent Limit</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maximum agents allowed
                    </Typography>
                  </Box>
                  <TextField
                    type="number"
                    value={companyFormData.agentLimit}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, agentLimit: Math.max(1, parseInt(e.target.value) || 1) })}
                    sx={{ width: 100 }}
                    size="small"
                    InputProps={{ inputProps: { min: 1, max: 10000 } }}
                  />
                </Stack>
              </Paper>
            </Grid>

            {/* Summary */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
                <Stack direction="row" spacing={4} justifyContent="center">
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={700} color="primary">
                      {companyFormData.adminLimit + companyFormData.agentLimit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Users</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={700} color="#f59e0b">
                      {companyFormData.adminLimit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Admins</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={700} color="#10b981">
                      {companyFormData.agentLimit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Agents</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "grey.50" }}>
          <Button onClick={handleCloseCompanyDialog} variant="outlined">Cancel</Button>
          <Button
            onClick={handleSubmitCompany}
            variant="contained"
            startIcon={companyDialogMode === "create" ? <AddIcon /> : <EditIcon />}
            sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          >
            {companyDialogMode === "create" ? "Create Company" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

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
            <FormControl fullWidth required>
              <InputLabel>Company</InputLabel>
              <Select
                value={userFormData.companyId}
                label="Company"
                onChange={(e) => setUserFormData({ ...userFormData, companyId: e.target.value })}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Username"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              fullWidth
              required
              disabled={userDialogMode === "edit"}
            />
            <TextField
              label={userDialogMode === "create" ? "Password" : "New Password (leave blank to keep current)"}
              type="password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              fullWidth
              required={userDialogMode === "create"}
            />
            <TextField
              label="Full Name"
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={userFormData.role}
                label="Role"
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="user">Agent (User)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseUserDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitUser}
            variant="contained"
            sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          >
            {userDialogMode === "create" ? "Create User" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmDialog} 
        onClose={() => !deleteProgress && setDeleteConfirmDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: deleteDetails.some(d => d.includes("✅")) ? "#10b981" : "#ef4444",
              mx: "auto",
              mb: 2,
            }}
          >
            {deleteDetails.some(d => d.includes("✅")) ? (
              <ExpandMoreIcon sx={{ fontSize: 36 }} />
            ) : (
              <WarningAmberIcon sx={{ fontSize: 36 }} />
            )}
          </Avatar>
          <Typography variant="h5" component="span" fontWeight={700}>
            {deleteDetails.some(d => d.includes("✅")) ? "User Deleted" : "Permanently Delete User?"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {userToDelete && !deleteDetails.some(d => d.includes("✅")) && (
            <>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  This will <strong>permanently delete</strong> all data for:
                </Typography>
                <Chip
                  label={`${userToDelete.name} (${userToDelete.username})`}
                  color="error"
                  variant="outlined"
                  sx={{ mt: 1, fontSize: "1rem", py: 0.5 }}
                />
              </Box>

              {Object.keys(userDataSummary).length > 0 && (
                <Paper sx={{ p: 2, bgcolor: "#fff3e0", borderRadius: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Data that will be deleted:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(userDataSummary).map(([key, count]) => (
                      <Chip
                        key={key}
                        label={`${key}: ${count} records`}
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Paper>
              )}

              <Alert severity="error" sx={{ mb: 2 }}>
                This action cannot be undone. All user data will be removed from Firestore, Realtime Database, and Storage.
              </Alert>
            </>
          )}

          {deleteDetails.length > 0 && (
            <Paper sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2, maxHeight: 300, overflow: "auto" }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Deletion Progress:
              </Typography>
              {deleteDetails.map((detail, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  fontFamily="monospace"
                  fontSize="0.75rem"
                  sx={{
                    color: detail.includes("✓") || detail.includes("✅") ? "#10b981" : 
                           detail.includes("✗") || detail.includes("❌") ? "#ef4444" : "text.secondary",
                    py: 0.2,
                  }}
                >
                  {detail}
                </Typography>
              ))}
            </Paper>
          )}

          {deleteProgress && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 4, px: 4 }}>
          {!deleteDetails.some(d => d.includes("✅")) && (
            <>
              <Button
                onClick={() => setDeleteConfirmDialog(false)}
                variant="outlined"
                disabled={deleteProgress}
                sx={{ minWidth: 120 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmFullDelete}
                variant="contained"
                color="error"
                disabled={deleteProgress}
                startIcon={<DeleteForeverIcon />}
                sx={{ minWidth: 160 }}
              >
                {deleteProgress ? "Deleting..." : "Delete Everything"}
              </Button>
            </>
          )}
          {deleteDetails.some(d => d.includes("✅")) && (
            <Button
              onClick={() => {
                setDeleteConfirmDialog(false);
                setUserToDelete(null);
              }}
              variant="contained"
              color="success"
              sx={{ minWidth: 120 }}
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
