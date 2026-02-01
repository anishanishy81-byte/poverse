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
  Avatar,
  Tooltip,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
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
import PersonIcon from "@mui/icons-material/Person";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useAppStore, useCompany } from "@/store";
import { LeaveCalendar } from "@/components";
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  LEAVE_TYPES,
  getLeaveTypeInfo,
  getLeaveStatusColor,
  getLeaveStatusLabel,
  formatDateRange,
  getDurationLabel,
} from "@/types/leave";
import {
  approveLeaveRequest,
  rejectLeaveRequest,
  subscribeToCompanyLeaveRequests,
  subscribeToPendingLeaveRequests,
  getMonthlyLeaveStats,
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function LeaveApprovalPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const company = useCompany();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");

  // Action dialogs
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats
  const [monthlyStats, setMonthlyStats] = useState<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    // Check if user is admin
    if (user.role !== "admin" && user.role !== "superadmin") {
      router.push("/dashboard");
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, user, router]);

  // Subscribe to pending leave requests
  useEffect(() => {
    if (!user?.companyId) return;

    const unsubscribe = subscribeToPendingLeaveRequests(user.companyId, (requests) => {
      setPendingRequests(requests);
    });

    return () => unsubscribe();
  }, [user?.companyId]);

  // Subscribe to all leave requests
  useEffect(() => {
    if (!user?.companyId) return;

    const unsubscribe = subscribeToCompanyLeaveRequests(user.companyId, (requests) => {
      setAllRequests(requests);

      // Calculate stats
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const monthRequests = requests.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });

      setMonthlyStats({
        total: monthRequests.length,
        approved: monthRequests.filter((r) => r.status === "approved").length,
        rejected: monthRequests.filter((r) => r.status === "rejected").length,
        pending: monthRequests.filter((r) => r.status === "pending").length,
      });
    });

    return () => unsubscribe();
  }, [user?.companyId]);

  const handleApprove = async () => {
    if (!selectedRequest || !user?.id) return;

    setIsProcessing(true);
    try {
      await approveLeaveRequest(selectedRequest.id, user.id, user.name || "Admin");
      setShowApproveDialog(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user?.id || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      await rejectLeaveRequest(
        selectedRequest.id,
        user.id,
        user.name || "Admin",
        rejectionReason
      );
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = allRequests.filter((request) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  });

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
            <IconButton onClick={() => router.push("/admin")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                Leave Approval
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Manage team leave requests
              </Typography>
            </Box>
            <Badge badgeContent={pendingRequests.length} color="error">
              <PendingIcon sx={{ fontSize: 32 }} />
            </Badge>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Stats Cards */}
        {monthlyStats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {monthlyStats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total This Month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h3" sx={{ color: "#ff9800" }} fontWeight="bold">
                    {monthlyStats.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h3" sx={{ color: "#4caf50" }} fontWeight="bold">
                    {monthlyStats.approved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h3" sx={{ color: "#f44336" }} fontWeight="bold">
                    {monthlyStats.rejected}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab
              label={
                <Badge badgeContent={pendingRequests.length} color="error">
                  Pending Approval
                </Badge>
              }
            />
            <Tab label="All Requests" />
            <Tab label="Leave Calendar" icon={<CalendarMonthIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Pending Requests Tab */}
        <TabPanel value={activeTab} index={0}>
          {pendingRequests.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <CheckCircleIcon sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                All caught up!
              </Typography>
              <Typography color="text.secondary">
                No pending leave requests at the moment.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {pendingRequests.map((request) => {
                const info = getLeaveTypeInfo(request.leaveType);
                return (
                  <Paper key={request.id} sx={{ p: 2 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={2}>
                      <Avatar sx={{ bgcolor: info.color, width: 48, height: 48 }}>
                        {LeaveTypeIcon[request.leaveType]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight="bold">{request.userName}</Typography>
                          <Chip
                            size="small"
                            label={info.label}
                            sx={{ bgcolor: info.color, color: "white" }}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateRange(request.startDate, request.endDate)} •{" "}
                          {request.totalDays} day{request.totalDays !== 1 ? "s" : ""} •{" "}
                          {getDurationLabel(request.duration)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {request.reason}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApproveDialog(true);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectionReason("");
                            setShowRejectDialog(true);
                          }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </TabPanel>

        {/* All Requests Tab */}
        <TabPanel value={activeTab} index={1}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
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
          </Stack>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No requests found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const info = getLeaveTypeInfo(request.leaveType);
                    return (
                      <TableRow key={request.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              <PersonIcon />
                            </Avatar>
                            <Typography>{request.userName}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={LeaveTypeIcon[request.leaveType] as React.ReactElement}
                            label={info.label}
                            sx={{ bgcolor: `${info.color}20`, color: info.color }}
                          />
                        </TableCell>
                        <TableCell>
                          {formatDateRange(request.startDate, request.endDate)}
                        </TableCell>
                        <TableCell>{request.totalDays}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getLeaveStatusLabel(request.status)}
                            sx={{
                              bgcolor: getLeaveStatusColor(request.status),
                              color: "white",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {request.status === "pending" && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowApproveDialog(true);
                                  }}
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setRejectionReason("");
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Leave Calendar Tab */}
        <TabPanel value={activeTab} index={2}>
          {company?.id && (
            <LeaveCalendar
              companyId={company.id}
              onEventClick={(event) => {
                const request = allRequests.find((r) => r.id === event.id);
                if (request) {
                  setSelectedRequest(request);
                  setShowDetailsDialog(true);
                }
              }}
              height={600}
            />
          )}
        </TabPanel>
      </Container>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: getLeaveTypeInfo(selectedRequest.leaveType).color, width: 56, height: 56 }}>
                  {LeaveTypeIcon[selectedRequest.leaveType]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedRequest.userName}</Typography>
                  <Chip
                    size="small"
                    label={getLeaveStatusLabel(selectedRequest.status)}
                    sx={{
                      bgcolor: getLeaveStatusColor(selectedRequest.status),
                      color: "white",
                    }}
                  />
                </Box>
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Leave Type</Typography>
                  <Typography>{getLeaveTypeInfo(selectedRequest.leaveType).label}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                  <Typography>{getDurationLabel(selectedRequest.duration)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Start Date</Typography>
                  <Typography>{new Date(selectedRequest.startDate).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">End Date</Typography>
                  <Typography>{new Date(selectedRequest.endDate).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Total Days</Typography>
                  <Typography>{selectedRequest.totalDays}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Requested On</Typography>
                  <Typography>{new Date(selectedRequest.createdAt).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" color="text.secondary">Reason</Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: "grey.50" }}>
                  <Typography>{selectedRequest.reason}</Typography>
                </Paper>
              </Box>

              {selectedRequest.attachmentUrl && (
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  href={selectedRequest.attachmentUrl}
                  target="_blank"
                >
                  View Attachment
                </Button>
              )}

              {selectedRequest.approverName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {selectedRequest.status === "approved" ? "Approved" : "Rejected"} By
                  </Typography>
                  <Typography>
                    {selectedRequest.approverName} on{" "}
                    {new Date(selectedRequest.approvedAt || "").toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              {selectedRequest.rejectionReason && (
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          {selectedRequest?.status === "pending" && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setShowDetailsDialog(false);
                  setShowApproveDialog(true);
                }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setShowDetailsDialog(false);
                  setRejectionReason("");
                  setShowRejectDialog(true);
                }}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)}>
        <DialogTitle>Approve Leave Request</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this leave request?
          </Typography>
          {selectedRequest && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{selectedRequest.userName}</strong> - {getLeaveTypeInfo(selectedRequest.leaveType).label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)} ({selectedRequest.totalDays} days)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? <CircularProgress size={20} /> : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Leave Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedRequest && (
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{selectedRequest.userName}</strong> - {getLeaveTypeInfo(selectedRequest.leaveType).label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)} ({selectedRequest.totalDays} days)
                </Typography>
              </Box>
            )}
            <TextField
              label="Rejection Reason"
              multiline
              rows={3}
              fullWidth
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this request..."
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={isProcessing || !rejectionReason.trim()}
          >
            {isProcessing ? <CircularProgress size={20} /> : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
