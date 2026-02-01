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
import Image from "next/image";
import { useAppStore, useIsSuperAdmin } from "@/store";
import { User, UserRole, Company } from "@/types/auth";

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
  const { isAuthenticated, user, logout } = useAppStore();
  const isSuperAdmin = useIsSuperAdmin();
  
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
    country: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    userLimit: 10,
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated, isSuperAdmin, router]);

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      fetchCompanies();
      fetchUsers();
    }
  }, [isAuthenticated, isSuperAdmin]);

  // Fetch user profile picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const response = await fetch(`/api/profile?userId=${user.id}`);
        const data = await response.json();
        if (data.success && data.user?.profilePicture) {
          setUserProfilePicture(data.user.profilePicture);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchUserProfile();
  }, [user]);

  const fetchCompanies = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/companies", {
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/users", {
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
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
      country: "",
      phone: "",
      email: "",
      website: "",
      description: "",
      userLimit: 10,
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
      country: company.country || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      description: company.description || "",
      userLimit: company.userLimit || 10,
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
      const response = await fetch("/api/companies", {
        method: companyDialogMode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
        body: JSON.stringify(
          companyDialogMode === "create"
            ? companyFormData
            : { companyId: selectedCompany?.id, ...companyFormData }
        ),
      });

      const data = await response.json();

      if (data.success) {
        setFormSuccess(
          companyDialogMode === "create"
            ? "Company created successfully!"
            : "Company updated successfully!"
        );
        fetchCompanies();
        setTimeout(() => {
          handleCloseCompanyDialog();
        }, 1500);
      } else {
        setFormError(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error:", error);
      setFormError("An error occurred");
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!user || !confirm("Are you sure you want to delete this company?")) return;

    try {
      const response = await fetch(`/api/companies?companyId=${companyId}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });

      const data = await response.json();

      if (data.success) {
        fetchCompanies();
      } else {
        alert(data.error || "Failed to delete company");
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

    try {
      const response = await fetch("/api/users", {
        method: userDialogMode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
        body: JSON.stringify(
          userDialogMode === "create"
            ? userFormData
            : { userId: selectedUser?.id, ...userFormData }
        ),
      });

      const data = await response.json();

      if (data.success) {
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
      } else {
        setFormError(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error:", error);
      setFormError("An error occurred");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user || !confirm("Are you sure you want to deactivate this user?")) return;

    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });

      const data = await response.json();

      if (data.success) {
        fetchUsers();
        fetchCompanies();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("An error occurred");
    }
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

              {/* Quick Actions - tablet+ */}
              <Stack 
                direction="row" 
                spacing={0.5} 
                sx={{ display: { xs: "none", sm: "flex" } }}
              >
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
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { fontWeight: 600 },
            }}
          >
            <Tab icon={<BusinessIcon />} label="Companies" iconPosition="start" />
            <Tab icon={<PeopleIcon />} label="All Users" iconPosition="start" />
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
                              <Tooltip title="Deactivate">
                                <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id)}>
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
        <DialogTitle>
          {companyDialogMode === "create" ? "Create New Company" : "Edit Company"}
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

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Logo Upload */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: "center" }}>
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
                      style={{ maxHeight: 100, maxWidth: 200, objectFit: "contain" }}
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
                  >
                    Upload Logo
                  </Button>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Company Name"
                value={companyFormData.name}
                onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Email"
                type="email"
                value={companyFormData.email}
                onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Phone"
                value={companyFormData.phone}
                onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Website"
                value={companyFormData.website}
                onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address"
                value={companyFormData.address}
                onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="City"
                value={companyFormData.city}
                onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="State"
                value={companyFormData.state}
                onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Country"
                value={companyFormData.country}
                onChange={(e) => setCompanyFormData({ ...companyFormData, country: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Description"
                value={companyFormData.description}
                onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="User Limit"
                type="number"
                value={companyFormData.userLimit}
                onChange={(e) => setCompanyFormData({ ...companyFormData, userLimit: parseInt(e.target.value) || 10 })}
                fullWidth
                required
                helperText="Maximum number of users (admins + agents) allowed for this company"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseCompanyDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitCompany}
            variant="contained"
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
    </Box>
  );
}
