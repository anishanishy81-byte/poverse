"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Grid2 as Grid,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  LinearProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import WorkIcon from "@mui/icons-material/Work";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PhotoCameraFrontIcon from "@mui/icons-material/PhotoCameraFront";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { useTrackedLocation } from "@/hooks";
import { SelfieCamera } from "@/components/SelfieCamera";
import {
  AttendanceRecord,
  AttendanceCalendarDay,
  MonthlyAttendanceSummary,
} from "@/types/attendance";
import {
  checkIn,
  checkOut,
  subscribeToTodayAttendance,
  getUserAttendanceCalendar,
  getUserMonthlySummary,
  getLateStatusInfo,
  formatDuration,
  getTodayDate,
} from "@/lib/attendance";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();
  const {
    latitude,
    longitude,
    accuracy,
    error: locationError,
    loading: locationLoading,
    permissionStatus,
    refreshLocation,
    requestLocation,
  } = useTrackedLocation({
    userId: user?.id,
    companyId: user?.companyId,
    userName: user?.name,
    enableTracking: true,
  });

  const [tabValue, setTabValue] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Camera state - using optimized SelfieCamera component
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<AttendanceCalendarDay[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Request location on mount - only if not already available
  useEffect(() => {
    if (isAuthenticated && user?.id && !latitude && !locationLoading && permissionStatus !== "denied") {
      // Request location only if we don't have it yet
      requestLocation();
    }
  }, [isAuthenticated, user?.id, latitude, locationLoading, permissionStatus, requestLocation]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Subscribe to today's attendance
  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);
    const unsubscribe = subscribeToTodayAttendance(user.id, (record) => {
      setTodayAttendance(record);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Load calendar data when month changes
  useEffect(() => {
    if (!user?.id || !company?.id) return;
    
    loadCalendarData();
  }, [user?.id, company?.id, selectedMonth, selectedYear]);

  const loadCalendarData = async () => {
    if (!user?.id || !company?.id) return;
    
    setIsLoadingCalendar(true);
    try {
      const [calendar, summary] = await Promise.all([
        getUserAttendanceCalendar(user.id, selectedYear, selectedMonth, company.id),
        getUserMonthlySummary(user.id, user.name, selectedYear, selectedMonth, company.id),
      ]);
      setCalendarData(calendar);
      setMonthlySummary(summary);
    } catch (err) {
      console.error("Error loading calendar:", err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Handle selfie capture from optimized camera component
  const handleSelfieCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setShowCamera(false);
  };

  const openCamera = () => {
    // Request location if not available before opening camera
    if (!latitude || !longitude) {
      requestLocation();
    }
    setShowCamera(true);
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  // Check-in handler
  const handleCheckIn = async () => {
    if (!user || !company) return;

    if (!latitude || !longitude) {
      setError("Location is required for check-in. Please enable location services.");
      return;
    }

    if (!capturedImage) {
      setError("Please take a selfie for check-in.");
      openCamera();
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      await checkIn(
        user.id,
        user.name,
        company.id,
        {
          latitude,
          longitude,
          accuracy,
        },
        capturedImage
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setSuccess("Checked in successfully! Your selfie and location have been recorded.");
        setCapturedImage(null);
        setUploadProgress(null);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to check in. Please try again.");
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check-out handler
  const handleCheckOut = async () => {
    if (!user || !latitude || !longitude) {
      setError("Location is required for check-out.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await checkOut(user.id, {
        latitude,
        longitude,
        accuracy,
      });
      setSuccess("Checked out successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to check out. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate months
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Get calendar grid
  const getCalendarGrid = () => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const grid: (AttendanceCalendarDay | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      grid.push(null);
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const calendarDay = calendarData.find((d) => d.date === dateStr);
      grid.push(calendarDay || { date: dateStr, status: "absent" });
    }

    return grid;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checked_in":
      case "checked_out":
        return "#4caf50";
      case "absent":
        return "#f44336";
      case "on_leave":
        return "#ff9800";
      case "half_day":
        return "#9c27b0";
      case "weekend":
        return "#9e9e9e";
      case "future":
        return "#e0e0e0";
      default:
        return "#e0e0e0";
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const isCheckedIn = todayAttendance?.status === "checked_in";
  const isCheckedOut = todayAttendance?.status === "checked_out";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 0,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => router.push("/dashboard")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Attendance
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>
            <Tooltip title="Refresh Location">
              <IconButton onClick={refreshLocation} sx={{ color: "white" }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        {locationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Location Error: {locationError}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="fullWidth"
          >
            <Tab icon={<AccessTimeIcon />} label="Check In/Out" />
            <Tab icon={<CalendarMonthIcon />} label="Calendar" />
          </Tabs>
        </Paper>

        {/* Check In/Out Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Today's Status Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: isCheckedOut
                      ? "#2196f3"
                      : isCheckedIn
                      ? "#4caf50"
                      : "#9e9e9e",
                    width: 56,
                    height: 56,
                  }}
                >
                  {isCheckedOut ? (
                    <CheckCircleIcon fontSize="large" />
                  ) : isCheckedIn ? (
                    <WorkIcon fontSize="large" />
                  ) : (
                    <ScheduleIcon fontSize="large" />
                  )}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    {isCheckedOut
                      ? "Day Complete"
                      : isCheckedIn
                      ? "Currently Working"
                      : "Not Checked In"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {todayAttendance?.lateStatus && todayAttendance.lateStatus !== "on_time" && (
                      <Chip
                        label={getLateStatusInfo(todayAttendance.lateStatus).label}
                        size="small"
                        sx={{
                          bgcolor: getLateStatusInfo(todayAttendance.lateStatus).color,
                          color: "white",
                          mr: 1,
                        }}
                      />
                    )}
                    {todayAttendance?.workDurationMinutes && (
                      <span>Work time: {formatDuration(todayAttendance.workDurationMinutes)}</span>
                    )}
                  </Typography>
                </Box>
                {todayAttendance?.checkIn?.selfieUrl && (
                  <Avatar
                    src={todayAttendance.checkIn.selfieUrl}
                    sx={{ width: 60, height: 60 }}
                  />
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Time Details */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LoginIcon color="success" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Check In
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {todayAttendance?.checkIn
                          ? new Date(todayAttendance.checkIn.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LogoutIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Check Out
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {todayAttendance?.checkOut
                          ? new Date(todayAttendance.checkOut.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              {/* Location Status */}
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocationOnIcon 
                    color={latitude && longitude ? "success" : locationLoading ? "primary" : "error"} 
                    fontSize="small" 
                  />
                  <Typography variant="body2" color="text.secondary">
                    {locationLoading ? (
                      "Fetching location..."
                    ) : latitude && longitude ? (
                      `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                    ) : permissionStatus === "denied" ? (
                      "Location denied - enable in settings"
                    ) : (
                      "Location not available"
                    )}
                  </Typography>
                  {locationLoading && <CircularProgress size={16} />}
                </Stack>
                {!latitude && !longitude && !locationLoading && (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={requestLocation}
                    startIcon={<LocationOnIcon />}
                  >
                    Enable
                  </Button>
                )}
                {latitude && longitude && (
                  <IconButton size="small" onClick={refreshLocation}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Selfie Preview with Location & Time Info */}
          {capturedImage && !isCheckedIn && (
            <Card sx={{ mb: 3, overflow: "hidden" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    <PhotoCameraFrontIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                    Selfie Ready for Check-In
                  </Typography>
                  <Chip
                    label="Photo captured"
                    color="success"
                    size="small"
                    icon={<CheckCircleIcon />}
                  />
                </Stack>
                
                <Box sx={{ position: "relative", display: "inline-block", width: "100%" }}>
                  <img
                    src={capturedImage}
                    alt="Selfie"
                    style={{
                      width: "100%",
                      maxHeight: 350,
                      objectFit: "contain",
                      borderRadius: 8,
                      border: "2px solid #4caf50",
                    }}
                  />
                  <IconButton
                    onClick={retakePhoto}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "rgba(0,0,0,0.6)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Box>

                {/* Location & Time Confirmation */}
                <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: "background.default" }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    The following data will be recorded with your check-in:
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AccessTimeIcon fontSize="small" color="primary" />
                      <Typography variant="body2">
                        <strong>Time:</strong> {new Date().toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LocationOnIcon fontSize="small" color="error" />
                      <Typography variant="body2">
                        <strong>Location:</strong> {latitude && longitude 
                          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                          : "Fetching location..."}
                        {accuracy && ` (±${accuracy.toFixed(0)}m)`}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>

                {/* Upload Progress */}
                {uploadProgress !== null && (
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Uploading selfie...
                      </Typography>
                      <Typography variant="caption" color="primary">
                        {uploadProgress}%
                      </Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Stack spacing={2}>
            {!isCheckedIn && !isCheckedOut && (
              <>
                {!capturedImage ? (
                  <Card 
                    sx={{ 
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
                    }}
                    onClick={openCamera}
                  >
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
                          <CameraAltIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">Take Selfie</Typography>
                          <Typography variant="body2" color="text.secondary">
                            A photo is required to verify your check-in
                          </Typography>
                        </Box>
                        <PhotoCameraFrontIcon color="action" />
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    color="success"
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                    onClick={handleCheckIn}
                    disabled={isSubmitting || !latitude || !longitude}
                    fullWidth
                    sx={{ 
                      py: 2.5, 
                      fontSize: "1.1rem",
                      boxShadow: 3,
                      "&:hover": { boxShadow: 5 },
                    }}
                  >
                    {isSubmitting ? "Checking In..." : "Confirm Check-In"}
                  </Button>
                )}
              </>
            )}

            {isCheckedIn && !isCheckedOut && (
              <Button
                variant="contained"
                size="large"
                color="primary"
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
                onClick={handleCheckOut}
                disabled={isSubmitting || !latitude || !longitude}
                fullWidth
                sx={{ 
                  py: 2.5, 
                  fontSize: "1.1rem",
                  boxShadow: 3,
                  "&:hover": { boxShadow: 5 },
                }}
              >
                {isSubmitting ? "Checking Out..." : "Check Out"}
              </Button>
            )}

            {isCheckedOut && (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                You have completed your attendance for today. See you tomorrow!
              </Alert>
            )}
          </Stack>
        </TabPanel>

        {/* Calendar Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Month Navigation */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <IconButton onClick={goToPreviousMonth}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={600}>
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </Typography>
              <IconButton onClick={goToNextMonth}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Paper>

          {/* Monthly Summary */}
          {monthlySummary && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Avatar sx={{ bgcolor: "#4caf50", mx: "auto", mb: 1 }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700}>
                      {monthlySummary.presentDays}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Present
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Avatar sx={{ bgcolor: "#f44336", mx: "auto", mb: 1 }}>
                      <CancelIcon />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700}>
                      {monthlySummary.absentDays}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Absent
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Avatar sx={{ bgcolor: "#ff9800", mx: "auto", mb: 1 }}>
                      <AccessTimeIcon />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700}>
                      {monthlySummary.lateDays}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Late Days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Avatar sx={{ bgcolor: "#2196f3", mx: "auto", mb: 1 }}>
                      <TrendingUpIcon />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700}>
                      {monthlySummary.attendancePercentage}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Attendance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Calendar Grid */}
          <Paper sx={{ p: 2 }}>
            {isLoadingCalendar ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Day Headers */}
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  {DAYS.map((day) => (
                    <Grid size={{ xs: 12 / 7 }} key={day}>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ textAlign: "center", display: "block" }}
                      >
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Calendar Days */}
                <Grid container spacing={1}>
                  {getCalendarGrid().map((day, index) => (
                    <Grid size={{ xs: 12 / 7 }} key={index}>
                      {day ? (
                        <Tooltip
                          title={
                            day.status === "checked_out"
                              ? `${day.checkInTime} - ${day.checkOutTime} (${day.workHours}h)`
                              : day.status === "checked_in"
                              ? `Checked in at ${day.checkInTime}`
                              : day.status
                          }
                        >
                          <Box
                            sx={{
                              aspectRatio: "1",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 1,
                              bgcolor:
                                day.date === getTodayDate()
                                  ? "primary.main"
                                  : getStatusColor(day.status) + "20",
                              border:
                                day.date === getTodayDate()
                                  ? "2px solid"
                                  : "1px solid transparent",
                              borderColor:
                                day.date === getTodayDate()
                                  ? "primary.main"
                                  : "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={day.date === getTodayDate() ? 700 : 400}
                              color={
                                day.date === getTodayDate()
                                  ? "white"
                                  : day.status === "future"
                                  ? "text.disabled"
                                  : "text.primary"
                              }
                            >
                              {parseInt(day.date.split("-")[2])}
                            </Typography>
                            {day.status !== "future" && day.status !== "weekend" && (
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: getStatusColor(day.status),
                                  mt: 0.5,
                                }}
                              />
                            )}
                            {day.isLate && (
                              <AccessTimeIcon
                                sx={{
                                  fontSize: 10,
                                  color: "#ff9800",
                                  position: "absolute",
                                  top: 2,
                                  right: 2,
                                }}
                              />
                            )}
                          </Box>
                        </Tooltip>
                      ) : (
                        <Box sx={{ aspectRatio: "1" }} />
                      )}
                    </Grid>
                  ))}
                </Grid>

                {/* Legend */}
                <Stack
                  direction="row"
                  spacing={2}
                  flexWrap="wrap"
                  sx={{ mt: 3, justifyContent: "center" }}
                >
                  {[
                    { label: "Present", color: "#4caf50" },
                    { label: "Absent", color: "#f44336" },
                    { label: "Leave", color: "#ff9800" },
                    { label: "Weekend", color: "#9e9e9e" },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" alignItems="center" spacing={0.5}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: item.color,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        </TabPanel>
      </Container>

      {/* Optimized Selfie Camera Component */}
      {showCamera && (
        <SelfieCamera
          onCapture={handleSelfieCapture}
          onClose={closeCamera}
          latitude={latitude}
          longitude={longitude}
          showLocationTime={true}
        />
      )}
    </Box>
  );
}
