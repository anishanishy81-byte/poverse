"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid2 as Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EventNoteIcon from "@mui/icons-material/EventNote";
import StarsIcon from "@mui/icons-material/Stars";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import FaceIcon from "@mui/icons-material/Face";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { LeaveCalendar } from "@/components";
import {
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  LeaveStatus,
  LeaveDuration,
  LeaveRequestInput,
  LEAVE_TYPES,
  getLeaveTypeInfo,
  getLeaveStatusColor,
  getLeaveStatusLabel,
  calculateLeaveDays,
  formatDateRange,
  getDurationLabel,
} from "@/types/leave";
import {
  createLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalance,
  subscribeToUserLeaveRequests,
  subscribeToLeaveBalance,
  getLeaveSummary,
} from "@/lib/leave";

// Leave type icon mapping
const LeaveTypeIcon: Record<LeaveType, React.ReactNode> = {
  sick: <LocalHospitalIcon />,
  casual: <EventNoteIcon />,
  earned: <StarsIcon />,
  unpaid: <MoneyOffIcon />,
  maternity: <ChildCareIcon />,
  paternity: <FaceIcon />,
  bereavement: <FavoriteIcon />,
};

// Status icon mapping
const StatusIcon: Record<LeaveStatus, React.ReactNode> = {
  pending: <PendingIcon sx={{ color: "#ff9800" }} />,
  approved: <CheckCircleIcon sx={{ color: "#4caf50" }} />,
  rejected: <CancelIcon sx={{ color: "#f44336" }} />,
  cancelled: <CancelIcon sx={{ color: "#9e9e9e" }} />,
};

export default function LeavePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();

  const [isLoading, setIsLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");

  // New request dialog
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestData, setRequestData] = useState<LeaveRequestInput>({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    duration: "full_day",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<LeaveRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    setIsLoading(false);
  }, [hasHydrated, isAuthenticated, user, router]);

  // Subscribe to leave requests
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserLeaveRequests(user.id, (requests) => {
      setLeaveRequests(requests);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to leave balance
  useEffect(() => {
    if (!user?.id || !user?.companyId) return;

    const currentYear = new Date().getFullYear();
    const unsubscribe = subscribeToLeaveBalance(
      user.id,
      user.companyId,
      currentYear,
      (balance) => {
        setLeaveBalance(balance);
      }
    );

    return () => unsubscribe();
  }, [user?.id, user?.companyId]);

  const handleOpenRequestDialog = () => {
    const today = new Date().toISOString().split("T")[0];
    setRequestData({
      leaveType: "casual",
      startDate: today,
      endDate: today,
      duration: "full_day",
      reason: "",
    });
    setSubmitError(null);
    setShowRequestDialog(true);
  };

  const handleSubmitRequest = async () => {
    if (!user?.id || !user?.companyId) return;

    if (!requestData.startDate || !requestData.endDate || !requestData.reason.trim()) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    if (new Date(requestData.endDate) < new Date(requestData.startDate)) {
      setSubmitError("End date cannot be before start date");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createLeaveRequest(
        user.id,
        user.name || "Unknown",
        user.companyId,
        requestData
      );
      setShowRequestDialog(false);
    } catch (error) {
      setSubmitError(String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancellingRequest) return;

    setIsCancelling(true);
    try {
      await cancelLeaveRequest(cancellingRequest.id);
      setShowCancelDialog(false);
      setCancellingRequest(null);
    } catch (error) {
      console.error("Failed to cancel request:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredRequests = leaveRequests.filter((request) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  });

  const calculateDays = () => {
    if (!requestData.startDate || !requestData.endDate) return 0;
    return calculateLeaveDays(requestData.startDate, requestData.endDate, requestData.duration);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          py: 3,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.push("/dashboard")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                Leave Management
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Request and track your leaves
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenRequestDialog}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              New Request
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Leave Balance Cards */}
        {leaveBalance && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Leave Balance ({leaveBalance.year})
            </Typography>
            <Grid container spacing={2}>
              {(["sick", "casual", "earned", "unpaid"] as LeaveType[]).map((type) => {
                const balance = leaveBalance[type];
                const info = getLeaveTypeInfo(type);
                const usedPercent = (balance.used / balance.total) * 100;

                return (
                  <Grid size={{ xs: 6, sm: 3 }} key={type}>
                    <Card>
                      <CardContent sx={{ pb: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                          <Avatar sx={{ bgcolor: info.color, width: 32, height: 32 }}>
                            {LeaveTypeIcon[type]}
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium">
                            {info.label}
                          </Typography>
                        </Stack>
                        <Typography variant="h4" fontWeight="bold" color={info.color}>
                          {balance.available}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          of {balance.total} days available
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(usedPercent, 100)}
                          sx={{
                            mt: 1,
                            height: 6,
                            borderRadius: 1,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: info.color,
                            },
                          }}
                        />
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Used: {balance.used}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pending: {balance.pending}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* Tabs and Filter */}
        <Paper sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 1 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="All Requests" />
              <Tab label="Pending" />
              <Tab label="History" />
              <Tab label="Team Calendar" icon={<CalendarMonthIcon />} iconPosition="start" />
            </Tabs>
            {activeTab !== 3 && (
              <ToggleButtonGroup
                size="small"
                value={statusFilter}
                exclusive
                onChange={(_, v) => v && setStatusFilter(v)}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="pending">Pending</ToggleButton>
                <ToggleButton value="approved">Approved</ToggleButton>
                <ToggleButton value="rejected">Rejected</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>
        </Paper>

        {/* Leave Requests List */}
        {activeTab !== 3 && (
        <Paper>
          {filteredRequests.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <EventIcon sx={{ fontSize: 60, color: "grey.400", mb: 2 }} />
              <Typography color="text.secondary">
                No leave requests found
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenRequestDialog}
                sx={{ mt: 2 }}
              >
                Create New Request
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {filteredRequests.map((request, index) => {
                const info = getLeaveTypeInfo(request.leaveType);
                return (
                  <Box key={request.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: info.color }}>
                          {LeaveTypeIcon[request.leaveType]}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight="medium">{info.label}</Typography>
                            <Chip
                              size="small"
                              label={getLeaveStatusLabel(request.status)}
                              sx={{
                                bgcolor: getLeaveStatusColor(request.status),
                                color: "white",
                                fontWeight: "medium",
                              }}
                            />
                          </Stack>
                        }
                        secondary={
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateRange(request.startDate, request.endDate)} •{" "}
                              {request.totalDays} day{request.totalDays !== 1 ? "s" : ""} •{" "}
                              {getDurationLabel(request.duration)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Reason: {request.reason}
                            </Typography>
                            {request.rejectionReason && (
                              <Typography variant="body2" color="error">
                                Rejected: {request.rejectionReason}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        {(request.status === "pending" || request.status === "approved") && (
                          <Tooltip title="Cancel Request">
                            <IconButton
                              edge="end"
                              onClick={() => {
                                setCancellingRequest(request);
                                setShowCancelDialog(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
        )}

        {/* Team Calendar Tab */}
        {activeTab === 3 && company?.id && (
          <LeaveCalendar
            companyId={company.id}
            onEventClick={(event) => {
              const request = leaveRequests.find((r) => r.id === event.id);
              if (request) {
                // Could show a details dialog here
                console.log("Selected leave:", request);
              }
            }}
            height={600}
          />
        )}
      </Container>

      {/* New Request Dialog */}
      <Dialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New Leave Request</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <FormControl fullWidth>
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={requestData.leaveType}
                label="Leave Type"
                onChange={(e) =>
                  setRequestData({ ...requestData, leaveType: e.target.value as LeaveType })
                }
              >
                {LEAVE_TYPES.map((type) => (
                  <MenuItem key={type.type} value={type.type}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {LeaveTypeIcon[type.type]}
                      <Typography>{type.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={requestData.startDate}
                onChange={(e) => setRequestData({ ...requestData, startDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={requestData.endDate}
                onChange={(e) => setRequestData({ ...requestData, endDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select
                value={requestData.duration}
                label="Duration"
                onChange={(e) =>
                  setRequestData({ ...requestData, duration: e.target.value as LeaveDuration })
                }
              >
                <MenuItem value="full_day">Full Day</MenuItem>
                <MenuItem value="half_day_morning">Half Day (Morning)</MenuItem>
                <MenuItem value="half_day_afternoon">Half Day (Afternoon)</MenuItem>
              </Select>
            </FormControl>

            {requestData.startDate && requestData.endDate && (
              <Alert severity="info">
                Total days: <strong>{calculateDays()}</strong>
                {leaveBalance && (
                  <>
                    {" "}
                    • Available: <strong>{leaveBalance[requestData.leaveType].available}</strong>
                  </>
                )}
              </Alert>
            )}

            <TextField
              label="Reason"
              multiline
              rows={3}
              fullWidth
              value={requestData.reason}
              onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
              placeholder="Please provide a reason for your leave request..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRequestDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitRequest}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : "Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
      >
        <DialogTitle>Cancel Leave Request?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this leave request? This action cannot be undone.
          </Typography>
          {cancellingRequest && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{getLeaveTypeInfo(cancellingRequest.leaveType).label}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDateRange(cancellingRequest.startDate, cancellingRequest.endDate)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>Keep Request</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelRequest}
            disabled={isCancelling}
          >
            {isCancelling ? <CircularProgress size={20} /> : "Cancel Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
