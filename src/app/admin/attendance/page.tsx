"use client";

import { useEffect, useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Grid2 as Grid,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ImageIcon from "@mui/icons-material/Image";
import { useAppStore, useCompany, useIsAdmin, useIsSuperAdmin } from "@/store";
import { User } from "@/types/auth";
import { getAllUsers } from "@/lib/auth";
import {
  AttendanceRecord,
  MonthlyAttendanceSummary,
  DailyAttendanceSummary,
} from "@/types/attendance";
import {
  getCompanyAttendanceByDate,
  subscribeToCompanyAttendance,
  getUserMonthlySummary,
  getAttendanceStatusInfo,
  getLateStatusInfo,
  getEarlyDepartureStatusInfo,
  formatDuration,
  getTodayDate,
} from "@/lib/attendance";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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

export default function AdminAttendancePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const company = useCompany();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();

  const [tabValue, setTabValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyAttendanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isAdmin && !isSuperAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin, router]);

  // Fetch company users
  useEffect(() => {
    if (!company?.id) return;
    fetchUsers();
  }, [company?.id]);

  // Subscribe to daily attendance
  useEffect(() => {
    if (!company?.id) return;

    setIsLoading(true);
    const unsubscribe = subscribeToCompanyAttendance(
      company.id,
      selectedDate,
      (records) => {
        setAttendanceRecords(records);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [company?.id, selectedDate]);

  // Load monthly summaries when tab changes
  useEffect(() => {
    if (tabValue === 1 && company?.id && users.length > 0) {
      loadMonthlySummaries();
    }
  }, [tabValue, selectedMonth, selectedYear, users, company?.id]);

  const fetchUsers = async () => {
    if (!company?.id || !user) return;

    try {
      const usersData = await getAllUsers(company.id);
      // Filter to only agents (users with role "user")
      const agents = usersData.filter((u: User) => u.role === "user");
      setUsers(agents);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const loadMonthlySummaries = async () => {
    if (!company?.id) return;

    setIsLoadingMonthly(true);
    try {
      const summaries = await Promise.all(
        users.map((u) =>
          getUserMonthlySummary(u.id, u.name, selectedYear, selectedMonth, company.id)
        )
      );
      setMonthlySummaries(summaries);
    } catch (error) {
      console.error("Error loading monthly summaries:", error);
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  // Calculate daily summary
  const dailySummary = useMemo((): DailyAttendanceSummary => {
    const present = attendanceRecords.filter(
      (r) => r.status === "checked_in" || r.status === "checked_out"
    ).length;
    const onLeave = attendanceRecords.filter((r) => r.status === "on_leave").length;
    const late = attendanceRecords.filter(
      (r) => r.lateStatus === "late" || r.lateStatus === "very_late"
    ).length;
    const earlyDeparture = attendanceRecords.filter(
      (r) => r.earlyDepartureStatus === "early" || r.earlyDepartureStatus === "very_early"
    ).length;

    const totalWorkMinutes = attendanceRecords.reduce(
      (sum, r) => sum + (r.workDurationMinutes || 0),
      0
    );

    return {
      date: selectedDate,
      totalEmployees: users.length,
      present,
      absent: users.length - present - onLeave,
      onLeave,
      late,
      earlyDeparture,
      averageWorkHours: present > 0 ? Math.round((totalWorkMinutes / present / 60) * 10) / 10 : 0,
    };
  }, [attendanceRecords, users.length, selectedDate]);

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return attendanceRecords;
    return attendanceRecords.filter((r) =>
      r.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [attendanceRecords, searchQuery]);

  // Filter monthly summaries by search
  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return monthlySummaries;
    return monthlySummaries.filter((s) =>
      s.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [monthlySummaries, searchQuery]);

  // Navigate dates
  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    if (date <= new Date()) {
      setSelectedDate(date.toISOString().split("T")[0]);
    }
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  if (!isAuthenticated || (!isAdmin && !isSuperAdmin)) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

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
            <IconButton onClick={() => router.push("/admin")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Attendance Reports
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {company?.name} • Track team attendance
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchUsers} sx={{ color: "white" }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="fullWidth"
          >
            <Tab icon={<CalendarMonthIcon />} label="Daily Report" />
            <Tab icon={<TrendingUpIcon />} label="Monthly Summary" />
          </Tabs>
        </Paper>

        {/* Daily Report Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Date Navigation */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <IconButton onClick={goToPreviousDay}>
                <ChevronLeftIcon />
              </IconButton>
              <Stack direction="row" alignItems="center" spacing={2}>
                <TextField
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  size="small"
                  inputProps={{ max: getTodayDate() }}
                />
                {selectedDate === getTodayDate() && (
                  <Chip label="Today" color="primary" size="small" />
                )}
              </Stack>
              <IconButton
                onClick={goToNextDay}
                disabled={selectedDate === getTodayDate()}
              >
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Paper>

          {/* Daily Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Avatar sx={{ bgcolor: "#2196f3", mx: "auto", mb: 1, width: 40, height: 40 }}>
                    <PeopleIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {dailySummary.totalEmployees}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Agents
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Avatar sx={{ bgcolor: "#4caf50", mx: "auto", mb: 1, width: 40, height: 40 }}>
                    <CheckCircleIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {dailySummary.present}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Present
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Avatar sx={{ bgcolor: "#f44336", mx: "auto", mb: 1, width: 40, height: 40 }}>
                    <CancelIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    {dailySummary.absent}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Absent
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Avatar sx={{ bgcolor: "#ff9800", mx: "auto", mb: 1, width: 40, height: 40 }}>
                    <AccessTimeIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {dailySummary.late}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Late
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Avatar sx={{ bgcolor: "#9c27b0", mx: "auto", mb: 1, width: 40, height: 40 }}>
                    <TrendingUpIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {dailySummary.averageWorkHours}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Avatar sx={{ bgcolor: "#607d8b", mx: "auto", mb: 1, width: 40, height: 40 }}>
                    <CalendarMonthIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {dailySummary.onLeave}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    On Leave
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Search */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Paper>

          {/* Attendance Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Check Out</TableCell>
                  <TableCell>Work Hours</TableCell>
                  <TableCell>Late/Early</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No attendance records for this date
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const statusInfo = getAttendanceStatusInfo(record.status);
                    return (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar
                              src={record.checkIn?.selfieUrl}
                              sx={{ width: 36, height: 36 }}
                            >
                              <PersonIcon />
                            </Avatar>
                            <Typography variant="body2" fontWeight={500}>
                              {record.userName}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                              bgcolor: statusInfo.color,
                              color: "white",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {record.checkIn
                            ? new Date(record.checkIn.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {record.checkOut
                            ? new Date(record.checkOut.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                          {record.isAutoCheckedOut && (
                            <Chip label="Auto" size="small" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          {record.workDurationMinutes
                            ? formatDuration(record.workDurationMinutes)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {record.lateStatus && record.lateStatus !== "on_time" && (
                              <Chip
                                label={`${record.lateByMinutes}m late`}
                                size="small"
                                color="warning"
                              />
                            )}
                            {record.earlyDepartureStatus &&
                              record.earlyDepartureStatus !== "full_day" && (
                                <Chip
                                  label={`${record.earlyByMinutes}m early`}
                                  size="small"
                                  color="info"
                                />
                              )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <ImageIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Monthly Summary Tab */}
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

          {/* Search */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Paper>

          {/* Monthly Summary Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell align="center">Leave</TableCell>
                  <TableCell align="center">Late Days</TableCell>
                  <TableCell align="center">Early Dep.</TableCell>
                  <TableCell align="center">Total Hours</TableCell>
                  <TableCell align="center">Avg Hours</TableCell>
                  <TableCell align="center">Attendance %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingMonthly ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No data available for this month
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummaries.map((summary) => (
                    <TableRow key={summary.userId} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {summary.userName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Typography color="success.main" fontWeight={600}>
                          {summary.presentDays}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography color="error.main" fontWeight={600}>
                          {summary.absentDays}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{summary.leaveDays}</TableCell>
                      <TableCell align="center">
                        <Typography color="warning.main">{summary.lateDays}</Typography>
                      </TableCell>
                      <TableCell align="center">{summary.earlyDepartureDays}</TableCell>
                      <TableCell align="center">{summary.totalWorkHours}h</TableCell>
                      <TableCell align="center">{summary.averageWorkHours}h</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${summary.attendancePercentage}%`}
                          size="small"
                          color={
                            summary.attendancePercentage >= 90
                              ? "success"
                              : summary.attendancePercentage >= 75
                              ? "warning"
                              : "error"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Container>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Attendance Details - {selectedRecord?.userName}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Selfie */}
              {selectedRecord.checkIn?.selfieUrl && (
                <Box sx={{ textAlign: "center" }}>
                  <img
                    src={selectedRecord.checkIn.selfieUrl}
                    alt="Check-in selfie"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 300,
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )}

              {/* Check-in Details */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Check In
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AccessTimeIcon fontSize="small" color="success" />
                      <Typography>
                        {selectedRecord.checkIn
                          ? new Date(selectedRecord.checkIn.timestamp).toLocaleString()
                          : "Not checked in"}
                      </Typography>
                    </Stack>
                    {selectedRecord.checkIn?.location && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LocationOnIcon fontSize="small" color="error" />
                        <Typography variant="body2" color="text.secondary">
                          {selectedRecord.checkIn.location.address ||
                            `${selectedRecord.checkIn.location.latitude.toFixed(4)}, ${selectedRecord.checkIn.location.longitude.toFixed(4)}`}
                        </Typography>
                      </Stack>
                    )}
                    {selectedRecord.lateStatus && selectedRecord.lateStatus !== "on_time" && (
                      <Chip
                        label={`Late by ${selectedRecord.lateByMinutes} minutes`}
                        color="warning"
                        size="small"
                      />
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Check-out Details */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Check Out
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AccessTimeIcon fontSize="small" color="primary" />
                      <Typography>
                        {selectedRecord.checkOut
                          ? new Date(selectedRecord.checkOut.timestamp).toLocaleString()
                          : "Not checked out"}
                      </Typography>
                    </Stack>
                    {selectedRecord.checkOut?.location && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LocationOnIcon fontSize="small" color="error" />
                        <Typography variant="body2" color="text.secondary">
                          {selectedRecord.checkOut.location.address ||
                            `${selectedRecord.checkOut.location.latitude.toFixed(4)}, ${selectedRecord.checkOut.location.longitude.toFixed(4)}`}
                        </Typography>
                      </Stack>
                    )}
                    {selectedRecord.isAutoCheckedOut && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Auto checked out: {selectedRecord.autoCheckoutReason}
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Work Summary */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Work Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Work Time
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedRecord.workDurationMinutes
                          ? formatDuration(selectedRecord.workDurationMinutes)
                          : "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Box>
                        <Chip
                          label={getAttendanceStatusInfo(selectedRecord.status).label}
                          sx={{
                            bgcolor: getAttendanceStatusInfo(selectedRecord.status).color,
                            color: "white",
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRecord(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
