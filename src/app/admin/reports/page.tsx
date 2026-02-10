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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FlagIcon from "@mui/icons-material/Flag";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useAppStore, useCompany } from "@/store";
import { getAllUsers } from "@/lib/auth";
import { DailyReport, TeamDailyReport, DailyReportSummary } from "@/types/dailyReport";
import {
  generateTeamDailyReport,
  getDateString,
  formatMinutesToHours,
  exportTeamReportToCSV,
  exportReportToCSV,
  getOrGenerateDailyReport,
} from "@/lib/dailyReports";

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

export default function AdminReportsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const company = useCompany();

  const [tabValue, setTabValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getDateString());
  const [teamReport, setTeamReport] = useState<TeamDailyReport | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Detail dialog
  const [selectedAgent, setSelectedAgent] = useState<DailyReportSummary | null>(null);
  const [agentReport, setAgentReport] = useState<DailyReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role !== "admin" && user?.role !== "superadmin") {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  // Fetch agents
  useEffect(() => {
    if (!user || !company) return;
    fetchAgents();
  }, [user, company]);

  // Load team report when date changes
  useEffect(() => {
    if (agents.length > 0 && company?.id) {
      loadTeamReport();
    }
  }, [agents, selectedDate, company?.id]);

  const fetchAgents = async () => {
    if (!company?.id) return;

    try {
      const usersData = await getAllUsers(company.id);
      const agentList = usersData
        .filter((u) => u.role === "user")
        .map((u) => ({ id: u.id, name: u.name }));
      setAgents(agentList);
    } catch (err) {
      console.error("Error fetching agents:", err);
    }
  };

  const loadTeamReport = async () => {
    if (!company?.id || agents.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const report = await generateTeamDailyReport(company.id, selectedDate, agents);
      setTeamReport(report);
    } catch (err: any) {
      console.error("Error loading team report:", err);
      setError(err.message || "Failed to load team report");
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

  const handleViewAgentReport = async (agent: DailyReportSummary) => {
    setSelectedAgent(agent);
    setDetailDialogOpen(true);
    setLoadingDetail(true);

    try {
      const report = await getOrGenerateDailyReport(
        agent.userId,
        agent.userName,
        company?.id || "",
        agent.date
      );
      setAgentReport(report);
    } catch (err) {
      console.error("Error loading agent report:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExportTeamCSV = () => {
    if (teamReport) {
      exportTeamReportToCSV(teamReport);
    }
    setExportMenuAnchor(null);
  };

  const handleExportAgentCSV = () => {
    if (agentReport) {
      exportReportToCSV(agentReport);
    }
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

  const filteredAgents = teamReport?.agentReports.filter(
    (agent) =>
      agent.userName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading && agents.length === 0) {
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
          background: "linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)",
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
                Team Activity Reports
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                View and analyze team performance
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
              <MenuItem onClick={handleExportTeamCSV}>
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Export Team Report (CSV)</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* Date Navigation */}
        <Paper sx={{ p: 2, mb: 3 }}>
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

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
            <Tab icon={<GroupsIcon />} label="Team Overview" />
            <Tab icon={<PersonIcon />} label="Individual Reports" />
          </Tabs>
        </Paper>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : teamReport && (
          <>
            {/* Team Overview Tab */}
            <TabPanel value={tabValue} index={0}>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Avatar sx={{ bgcolor: "primary.main", mx: "auto", mb: 1 }}>
                        <GroupsIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700}>
                        {teamReport.presentAgents}/{teamReport.totalAgents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Agents Present
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Avatar sx={{ bgcolor: "success.main", mx: "auto", mb: 1 }}>
                        <FlagIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700}>
                        {teamReport.totalTargetsCompleted}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Targets Completed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Avatar sx={{ bgcolor: "info.main", mx: "auto", mb: 1 }}>
                        <DirectionsCarIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700}>
                        {teamReport.totalDistanceKm}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total KM Traveled
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Avatar sx={{ bgcolor: "warning.main", mx: "auto", mb: 1 }}>
                        <TrendingUpIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700}>
                        {teamReport.avgProductivityScore}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Avg. Productivity
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Top Performers */}
              {teamReport.topPerformers.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <EmojiEventsIcon sx={{ mr: 1, verticalAlign: "middle", color: "warning.main" }} />
                      Top Performers
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      {teamReport.topPerformers.map((performer, index) => (
                        <Chip
                          key={performer.userId}
                          avatar={
                            <Avatar sx={{ bgcolor: index === 0 ? "warning.main" : "primary.main" }}>
                              {index + 1}
                            </Avatar>
                          }
                          label={`${performer.userName} (${performer.score})`}
                          variant={index === 0 ? "filled" : "outlined"}
                          color={index === 0 ? "warning" : "default"}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Summary */}
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Attendance Summary
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h3" fontWeight={700} color="success.main">
                          {teamReport.presentAgents}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Present</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h3" fontWeight={700} color="error.main">
                          {teamReport.absentAgents}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Absent</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h3" fontWeight={700} color="primary">
                          {teamReport.avgWorkHours}h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Avg. Work Hours</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>

            {/* Individual Reports Tab */}
            <TabPanel value={tabValue} index={1}>
              {/* Search */}
              <TextField
                fullWidth
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Agents Table */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Agent</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Targets</TableCell>
                      <TableCell align="center">Distance</TableCell>
                      <TableCell align="center">Work Hours</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.userId} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                              {agent.userName.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={500}>
                              {agent.userName}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={agent.status.replace("_", " ")}
                            size="small"
                            color={getStatusColor(agent.status) as any}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {agent.targetsCompleted}/{agent.targetsVisited}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{agent.distanceKm} km</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{agent.workHours}h</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={agent.productivityScore}
                            size="small"
                            sx={{
                              bgcolor: getScoreColor(agent.productivityScore),
                              color: "white",
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleViewAgentReport(agent)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAgents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No agents found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </>
        )}
      </Container>

      {/* Agent Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: "primary.main" }}>
                {selectedAgent?.userName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedAgent?.userName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(selectedAgent?.date || "")}
                </Typography>
              </Box>
            </Stack>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExportAgentCSV}
              disabled={!agentReport}
            >
              Export
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : agentReport ? (
            <Grid container spacing={2}>
              {/* Attendance */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Attendance
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Check In</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {agentReport.attendance.checkInTime
                            ? new Date(agentReport.attendance.checkInTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Check Out</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {agentReport.attendance.checkOutTime
                            ? new Date(agentReport.attendance.checkOutTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Work Duration</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {agentReport.attendance.workDurationMinutes
                            ? formatMinutesToHours(agentReport.attendance.workDurationMinutes)
                            : "N/A"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Targets */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Targets
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Completed</Typography>
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {agentReport.targets.completed}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Skipped</Typography>
                        <Typography variant="body2" fontWeight={600} color="error">
                          {agentReport.targets.skipped}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Completion Rate</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {agentReport.performance.targetCompletionRate}%
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Travel */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Travel
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Distance</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {agentReport.travel.totalDistanceKm} km
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Location Updates</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {agentReport.travel.locationUpdates}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Performance */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Performance
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Productivity Score</Typography>
                        <Chip
                          label={agentReport.performance.productivityScore}
                          size="small"
                          sx={{
                            bgcolor: getScoreColor(agentReport.performance.productivityScore),
                            color: "white",
                          }}
                        />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Punctuality Score</Typography>
                        <Chip
                          label={agentReport.performance.punctualityScore}
                          size="small"
                          sx={{
                            bgcolor: getScoreColor(agentReport.performance.punctualityScore),
                            color: "white",
                          }}
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Target Visits */}
              {agentReport.targets.visits.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Target Visits
                      </Typography>
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
                            {agentReport.targets.visits.map((visit, index) => (
                              <TableRow key={index}>
                                <TableCell>{visit.targetName}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={visit.visitStatus}
                                    size="small"
                                    color={
                                      visit.visitStatus === "completed" ? "success" :
                                      visit.visitStatus === "skipped" ? "error" : "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  {visit.timeSpentMinutes
                                    ? formatMinutesToHours(visit.timeSpentMinutes)
                                    : "N/A"}
                                </TableCell>
                                <TableCell>{visit.outcome || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              No report data available
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
