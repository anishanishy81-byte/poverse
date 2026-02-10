"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  TextField,
  Alert,
  Avatar,
  Divider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Autocomplete,
  CircularProgress,
  Badge,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { User, UserRole } from "@/types/auth";
import { countries, getStatesForCountry, getCitiesForState } from "@/lib/locationData";
import { getUserById, updateUser, verifyPassword } from "@/lib/auth";
import { uploadProfilePicture } from "@/lib/storage";

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case "superadmin":
      return "Super Admin";
    case "admin":
      return "Admin";
    default:
      return "Agent";
  }
};

const getRoleColor = (role: UserRole): "error" | "warning" | "info" => {
  switch (role) {
    case "superadmin":
      return "error";
    case "admin":
      return "warning";
    default:
      return "info";
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  // Profile form
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
  });
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [newProfilePicture, setNewProfilePicture] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Location dropdown options
  const stateOptions = useMemo(() => getStatesForCountry(profileData.country), [profileData.country]);
  const cityOptions = useMemo(() => getCitiesForState(profileData.state), [profileData.state]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    fetchProfile();
  }, [hasHydrated, isAuthenticated, user, router]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await getUserById(user.id);
      if (result.user) {
        setProfileData({
          name: result.user.name || "",
          email: result.user.email || "",
          phone: result.user.phone || "",
          city: result.user.city || "",
          state: result.user.state || "",
          country: result.user.country || "",
        });
        setProfilePicture(result.user.profilePicture || null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfileError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileError(null);
    setProfileSuccess(null);

    if (!profileData.name) {
      setProfileError("Name is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (profileData.email && !emailRegex.test(profileData.email)) {
      setProfileError("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    try {
      let profilePictureUrl: string | undefined;

      if (newProfilePicture) {
        const uploadResult = await uploadProfilePicture(user.id, newProfilePicture);
        if (!uploadResult.success || !uploadResult.url) {
          setProfileError(uploadResult.error || "Failed to upload profile picture");
          return;
        }
        profilePictureUrl = uploadResult.url;
      }

      const result = await updateUser(user.id, {
        ...profileData,
        profilePicture: profilePictureUrl || undefined,
      });

      if (result.success) {
        setProfileSuccess("Profile updated successfully!");
        // Update profile picture from response or refetch
        if (profilePictureUrl) {
          setProfilePicture(profilePictureUrl);
        } else if (result.user?.profilePicture) {
          setProfilePicture(result.user.profilePicture);
        }
        setNewProfilePicture(null);
        // Refetch profile to ensure we have latest data
        await fetchProfile();
        setTimeout(() => setProfileSuccess(null), 3000);
      } else {
        setProfileError(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileError("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setProfileError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image size should be less than 5MB");
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProfilePicture(reader.result as string);
      setProfileError(null);
    };
    reader.onerror = () => {
      setProfileError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePicture = () => {
    setNewProfilePicture(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await getUserById(user.id);
      if (!result.user || !result.passwordHash) {
        setPasswordError("User not found");
        return;
      }

      const isValid = await verifyPassword(passwordData.currentPassword, result.passwordHash);
      if (!isValid) {
        setPasswordError("Current password is incorrect");
        return;
      }

      const updateResult = await updateUser(user.id, { password: passwordData.newPassword });
      if (updateResult.success) {
        setPasswordSuccess("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setPasswordSuccess(null), 3000);
      } else {
        setPasswordError(updateResult.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("An error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleBack = () => {
    if (user?.role === "superadmin") {
      router.push("/superadmin");
    } else if (user?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
          py: 2,
          px: 3,
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton onClick={handleBack} sx={{ color: "white" }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h5" fontWeight={700} sx={{ color: "white" }}>
                My Profile
              </Typography>
            </Stack>
            {company && (
              <Stack direction="row" spacing={1} alignItems="center">
                {company.logoUrl && (
                  <Avatar src={company.logoUrl} alt={company.name} sx={{ width: 32, height: 32 }} />
                )}
                <Typography sx={{ color: "white", opacity: 0.9 }}>{company.name}</Typography>
              </Stack>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={4}>
            {/* User Info Card */}
            <Card>
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "center", sm: "flex-start" }}>
                  {/* Profile Picture with Upload */}
                  <Box sx={{ position: "relative" }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleProfilePictureChange}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={
                        <Tooltip title="Change profile picture">
                          <IconButton
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                              bgcolor: "primary.main",
                              color: "white",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "primary.dark" },
                            }}
                          >
                            <CameraAltIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <Avatar
                        src={newProfilePicture || profilePicture || undefined}
                        sx={{
                          width: 100,
                          height: 100,
                          bgcolor: "primary.main",
                          fontSize: "2.5rem",
                          border: "4px solid",
                          borderColor: "primary.light",
                        }}
                      >
                        {!newProfilePicture && !profilePicture && (profileData.name?.charAt(0)?.toUpperCase() || "U")}
                      </Avatar>
                    </Badge>
                    {newProfilePicture && (
                      <Box sx={{ mt: 1, textAlign: "center" }}>
                        <Tooltip title="Remove selected image">
                          <IconButton
                            size="small"
                            onClick={handleRemoveProfilePicture}
                            sx={{ color: "error.main" }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Typography variant="caption" color="text.secondary" display="block">
                          New photo selected
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                    <Typography variant="h5" fontWeight={600}>
                      {profileData.name || user?.name}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      @{user?.username}
                    </Typography>
                    <Chip
                      label={getRoleLabel(user?.role || "user")}
                      color={getRoleColor(user?.role || "user")}
                      size="small"
                    />
                    {company && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {company.name}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Paper sx={{ p: 4 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={3}>
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Profile Details
                </Typography>
              </Stack>

              {profileError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {profileError}
                </Alert>
              )}
              {profileSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {profileSuccess}
                </Alert>
              )}

              <Stack spacing={3}>
                <TextField
                  label="Full Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  fullWidth
                />

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>

                <Autocomplete
                  options={countries}
                  value={profileData.country || null}
                  onChange={(_, newValue) => {
                    setProfileData({
                      ...profileData,
                      country: newValue || "",
                      state: "",
                      city: "",
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
                  value={profileData.state || null}
                  onChange={(_, newValue) => {
                    setProfileData({
                      ...profileData,
                      state: newValue || "",
                      city: "",
                    });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="State" placeholder="Select or type to search" />
                  )}
                  freeSolo
                  autoHighlight
                  disabled={!profileData.country}
                />
                <Autocomplete
                  options={cityOptions}
                  value={profileData.city || null}
                  onChange={(_, newValue) => {
                    setProfileData({ ...profileData, city: newValue || "" });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="City" placeholder="Select or type to search" />
                  )}
                  freeSolo
                  autoHighlight
                  disabled={!profileData.state}
                />

                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  sx={{
                    background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                    alignSelf: "flex-start",
                  }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </Stack>
            </Paper>

            {/* Change Password */}
            <Paper sx={{ p: 4 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={3}>
                <LockIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Change Password
                </Typography>
              </Stack>

              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}
              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {passwordSuccess}
                </Alert>
              )}

              <Stack spacing={3}>
                <TextField
                  label="Current Password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                />
                <TextField
                  label="New Password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  fullWidth
                  required
                  helperText="Minimum 6 characters"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                />
                <TextField
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  fullWidth
                  required
                  error={
                    !!passwordData.confirmPassword &&
                    passwordData.newPassword !== passwordData.confirmPassword
                  }
                  helperText={
                    passwordData.confirmPassword &&
                    passwordData.newPassword !== passwordData.confirmPassword
                      ? "Passwords do not match"
                      : ""
                  }
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                />

                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<LockIcon />}
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
