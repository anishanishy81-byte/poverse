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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SpeedIcon from "@mui/icons-material/Speed";
import GroupsIcon from "@mui/icons-material/Groups";
import WorkIcon from "@mui/icons-material/Work";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { DailyReport } from "@/types/dailyReport";
import {
  getOrGenerateDailyReport,
  getDateString,
  formatMinutesToHours,
  exportReportToCSV,
} from "@/lib/dailyReports";

export default function DailyReportsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();

  const [selectedDate, setSelectedDate] = useState(getDateString());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Load report
  useEffect(() => {
    if (!user?.id || !company?.id) return;
    loadReport();
  }, [user?.id, company?.id, selectedDate]);

  const loadReport = async () => {
    if (!user?.id || !company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const reportData = await getOrGenerateDailyReport(
        user.id,
        user.name,
        company.id,
        selectedDate
      );
      setReport(reportData);
    } catch (err: any) {
      console.error("Error loading report:", err);
      setError(err.message || "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(getDateString(date));
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const today = new Date();
    if (date <= today) {
      setSelectedDate(getDateString(date));
    }
  };

  const handleExportCSV = () => {
    if (report) {
      exportReportToCSV(report);
    }
    setExportMenuAnchor(null);
  };

  const handleExportPDF = () => {
    // PDF export using browser print
    if (report) {
      window.print();
    }
    setExportMenuAnchor(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "success";
      case "absent": return "error";
      case "half_day": return "warning";
      case "on_leave": return "info";
      default: return "default";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#4caf50";
    if (score >= 60) return "#ff9800";
    return "#f44336";
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }} className="printable-report">
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: "white",
          borderRadius: 0,
        }}
        className="no-print"
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => router.push("/dashboard")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Daily Activity Report
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                View your daily performance and activities
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.5)" }}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
            >
              <MenuItem onClick={handleExportCSV}>
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Export as CSV</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleExportPDF}>
                <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Print / Save as PDF</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* Date Navigation */}
        <Paper sx={{ p: 2, mb: 3 }} className="no-print">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <IconButton onClick={goToPreviousDay}>
              <ChevronLeftIcon />
            </IconButton>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CalendarMonthIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {formatDate(selectedDate)}
              </Typography>
            </Stack>
            <IconButton 
              onClick={goToNextDay}
              disabled={selectedDate === getDateString()}
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {report && (
          <>
            {/* Status Overview */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
                      <WorkIcon fontSize="large" />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{report.userName}</Typography>
                      <Chip
                        label={(report.attendance?.status || "absent").replace("_", " ").toUpperCase()}
                        color={getStatusColor(report.attendance?.status || "absent") as any}
                        size="small"
                      />
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {report.performance?.productivityScore ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Productivity Score
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {report.performance?.targetCompletionRate ?? 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completion Rate
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Attendance Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <AccessTimeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Attendance
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LoginIcon color="success" fontSize="small" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">Check In</Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {report.attendance?.checkInTime
                                ? new Date(report.attendance.checkInTime).toLocaleTimeString([], {
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
                          <LogoutIcon color="primary" fontSize="small" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">Check Out</Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {report.attendance?.checkOutTime
                                ? new Date(report.attendance.checkOutTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "--:--"}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Work Duration</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {report.attendance?.workDurationMinutes
                            ? formatMinutesToHours(report.attendance.workDurationMinutes)
                            : "N/A"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        {report.attendance?.lateByMinutes ? (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Late By</Typography>
                            <Typography variant="body1" fontWeight={600} color="error">
                              {formatMinutesToHours(report.attendance.lateByMinutes)}
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Punctuality</Typography>
                            <Typography variant="body1" fontWeight={600} color="success.main">
                              On Time
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Travel Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <DirectionsCarIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Travel & Locations
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Distance Traveled</Typography>
                        <Typography variant="h5" fontWeight={700} color="primary">
                          {report.travel?.totalDistanceKm ?? 0} km
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Locations Visited</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {report.travel?.totalLocationsVisited ?? 0}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Location Updates</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {report.travel?.locationUpdates ?? 0}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Travel Time</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatMinutesToHours(report.timeDistribution?.travelTimeMinutes ?? 0)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Targets Summary */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  <FlagIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Targets Summary
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h4" fontWeight={700}>{report.targets?.total ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Assigned</Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: "success.50" }}>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {report.targets?.completed ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Completed</Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: "warning.50" }}>
                      <Typography variant="h4" fontWeight={700} color="warning.main">
                        {report.targets?.skipped ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Skipped</Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: "info.50" }}>
                      <Typography variant="h4" fontWeight={700} color="info.main">
                        {report.targets?.pending ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Pending</Typography>
                    </Card>
                  </Grid>
                </Grid>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">Completion Rate</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {report.performance?.targetCompletionRate ?? 0}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={report.performance?.targetCompletionRate ?? 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Visits Table */}
                {report.targets?.visits && report.targets.visits.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Target</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Time Spent</TableCell>
                          <TableCell>Outcome</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {report.targets.visits.map((visit, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {visit.targetName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {visit.targetAddress}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={visit.visitStatus}
                                size="small"
                                color={
                                  visit.visitStatus === "completed" ? "success" :
                                  visit.visitStatus === "skipped" ? "error" :
                                  visit.visitStatus === "in_progress" ? "warning" : "default"
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {visit.timeSpentMinutes
                                ? formatMinutesToHours(visit.timeSpentMinutes)
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {visit.outcome ? (
                                <Chip label={visit.outcome.replace(/_/g, " ")} size="small" variant="outlined" />
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {(!report.targets?.visits || report.targets.visits.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                    No target visits recorded for this day
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Leads & Performance */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Leads Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GroupsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Leads Summary
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Total Interactions</Typography>
                        <Typography variant="h5" fontWeight={700}>{report.leads?.totalInteractions ?? 0}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Converted</Typography>
                        <Typography variant="h5" fontWeight={700} color="success.main">
                          {report.leads?.converted ?? 0}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Follow-ups</Typography>
                        <Typography variant="body1" fontWeight={600} color="info.main">
                          {report.leads?.followUps ?? 0}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Not Interested</Typography>
                        <Typography variant="body1" fontWeight={600} color="error">
                          {report.leads?.notInterested ?? 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Performance Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <SpeedIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Performance Metrics
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">Productivity Score</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {report.performance?.productivityScore ?? 0}/100
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={report.performance?.productivityScore ?? 0}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: "grey.200",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: getScoreColor(report.performance?.productivityScore ?? 0),
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">Punctuality Score</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {report.performance?.punctualityScore ?? 100}/100
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={report.performance?.punctualityScore ?? 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: "grey.200",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: getScoreColor(report.performance?.punctualityScore ?? 100),
                          },
                        }}
                      />
                    </Box>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Avg. Time per Target
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {report.performance?.avgTimePerTarget
                          ? formatMinutesToHours(report.performance.avgTimePerTarget)
                          : "N/A"}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Report Generated Info */}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
              Report generated: {new Date(report.generatedAt).toLocaleString()}
              {report.isAutoGenerated && " (Auto-generated)"}
            </Typography>
          </>
        )}

        {!report && !isLoading && (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Report Available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No activity data found for this date.
            </Typography>
            <Button variant="contained" onClick={loadReport} startIcon={<RefreshIcon />}>
              Generate Report
            </Button>
          </Paper>
        )}
      </Container>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .printable-report {
            padding: 20px !important;
          }
        }
      `}</style>
    </Box>
  );
}
