"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChatIcon from "@mui/icons-material/Chat";
import { useAppStore, useIsAdmin, useIsSuperAdmin, useCompany } from "@/store";
import { User, UserRole, Company } from "@/types/auth";
import { countries, getStatesForCountry, getCitiesForState } from "@/lib/locationData";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout, setCompany: setStoreCompany } = useAppStore();
  const storedCompany = useCompany();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();

  const [company, setCompany] = useState<Company | null>(storedCompany);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!isAuthenticated) {
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
  }, [isAuthenticated, isAdmin, isSuperAdmin, router]);

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

  const fetchCompany = async () => {
    if (!user?.companyId) return;
    setIsLoading(true);
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
        setStoreCompany(data.company); // Update store
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
      const response = await fetch(`/api/users?companyId=${user.companyId}`, {
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
      const formDataToSubmit = {
        ...dataWithoutConfirm,
        role: 'user' as const,
      };
      
      const response = await fetch("/api/users", {
        method: userDialogMode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
        body: JSON.stringify(
          userDialogMode === "create"
            ? { ...formDataToSubmit, companyId: user.companyId }
            : { userId: selectedUser?.id, ...formDataToSubmit }
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
        fetchCompany(); // Refresh to update user counts
        setTimeout(() => {
          handleCloseUserDialog();
        }, 1500);
      } else {
        setFormError(data.error || "Operation failed");
      }
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
        fetchCompany();
      } else {
        alert(data.error || "Failed to delete user");
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

  if (!isAuthenticated || !isAdmin || isSuperAdmin) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          py: 2,
          px: 3,
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              {company?.logo ? (
                <Avatar
                  src={company.logo}
                  alt={company.name}
                  sx={{ width: 40, height: 40, borderRadius: 1 }}
                  variant="rounded"
                />
              ) : (
                <Avatar sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.2)", borderRadius: 1 }} variant="rounded">
                  <BusinessIcon />
                </Avatar>
              )}
              <Typography variant="h5" fontWeight={700} sx={{ color: "white" }}>
                {company?.name || "Admin Dashboard"}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.2)" }}>
                  <SupervisorAccountIcon />
                </Avatar>
                <Box>
                  <Typography fontWeight={500} sx={{ color: "white", fontSize: "0.9rem" }}>
                    {user?.name}
                  </Typography>
                  <Chip
                    label="ADMIN"
                    size="small"
                    sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#92400e", color: "white" }}
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
