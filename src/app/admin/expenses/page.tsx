"use client";

import { useEffect, useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
  Checkbox,
  LinearProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import TollIcon from "@mui/icons-material/Toll";
import PhoneIcon from "@mui/icons-material/Phone";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CelebrationIcon from "@mui/icons-material/Celebration";
import BuildIcon from "@mui/icons-material/Build";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import PaymentsIcon from "@mui/icons-material/Payments";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import { useAppStore, useCompany } from "@/store";
import {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  getExpenseCategoryInfo,
  getExpenseStatusColor,
  getExpenseStatusLabel,
  formatCurrency,
} from "@/types/expense";
import {
  approveExpense,
  rejectExpense,
  bulkApproveExpenses,
  markAsReimbursed,
  bulkMarkAsReimbursed,
  subscribeToCompanyExpenses,
  subscribeToPendingExpenses,
  getExpenseStats,
  getCompanyExpenseSummary,
} from "@/lib/expense";

// Category icon mapping
const CategoryIcon: Record<ExpenseCategory, React.ReactNode> = {
  travel: <DirectionsCarIcon />,
  food: <RestaurantIcon />,
  accommodation: <HotelIcon />,
  fuel: <LocalGasStationIcon />,
  parking: <LocalParkingIcon />,
  toll: <TollIcon />,
  communication: <PhoneIcon />,
  office_supplies: <Inventory2Icon />,
  client_entertainment: <CelebrationIcon />,
  equipment: <BuildIcon />,
  miscellaneous: <MoreHorizIcon />,
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

export default function AdminExpensesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const company = useCompany();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");

  // Selection for bulk actions
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState<{
    todayTotal: number;
    weekTotal: number;
    monthTotal: number;
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    reimbursedCount: number;
  } | null>(null);

  // Action dialogs
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReimburseDialog, setShowReimburseDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reimbursementRef, setReimbursementRef] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
    } else if (user.role !== "admin" && user.role !== "superadmin") {
      router.push("/dashboard");
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, router]);

  // Subscribe to pending expenses
  useEffect(() => {
    if (!company?.id) return;

    const unsubscribe = subscribeToPendingExpenses(company.id, (expenses) => {
      setPendingExpenses(expenses);
    });

    return () => unsubscribe();
  }, [company?.id]);

  // Subscribe to all expenses
  useEffect(() => {
    if (!company?.id) return;

    const unsubscribe = subscribeToCompanyExpenses(company.id, (expenses) => {
      setAllExpenses(expenses);
    });

    return () => unsubscribe();
  }, [company?.id]);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      if (!company?.id) return;
      const expenseStats = await getExpenseStats(company.id);
      setStats(expenseStats);
    };

    loadStats();
  }, [company?.id, allExpenses]);

  // Filter expenses for table
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((expense) => {
      if (statusFilter !== "all" && expense.status !== statusFilter) return false;
      if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
      return true;
    });
  }, [allExpenses, statusFilter, categoryFilter]);

  // Handle approve
  const handleApprove = async () => {
    if (!company?.id || !user?.id || !user?.name || !selectedExpense) return;

    setIsProcessing(true);
    try {
      await approveExpense(company.id, selectedExpense.id, user.id, user.name);
      setShowApproveDialog(false);
      setSelectedExpense(null);
    } catch (error) {
      console.error("Failed to approve expense:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!company?.id || !user?.id || !user?.name || !selectedExpense) return;

    if (!rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      await rejectExpense(company.id, selectedExpense.id, user.id, user.name, rejectionReason);
      setShowRejectDialog(false);
      setSelectedExpense(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject expense:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (!company?.id || !user?.id || !user?.name || selectedExpenses.length === 0) return;

    setIsProcessing(true);
    try {
      await bulkApproveExpenses(company.id, selectedExpenses, user.id, user.name);
      setSelectedExpenses([]);
    } catch (error) {
      console.error("Failed to bulk approve:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reimburse
  const handleReimburse = async () => {
    if (!company?.id || !selectedExpense) return;

    setIsProcessing(true);
    try {
      await markAsReimbursed(company.id, selectedExpense.id, reimbursementRef);
      setShowReimburseDialog(false);
      setSelectedExpense(null);
      setReimbursementRef("");
    } catch (error) {
      console.error("Failed to mark as reimbursed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk reimburse
  const handleBulkReimburse = async () => {
    if (!company?.id || selectedExpenses.length === 0) return;

    setIsProcessing(true);
    try {
      await bulkMarkAsReimbursed(company.id, selectedExpenses, reimbursementRef);
      setSelectedExpenses([]);
      setReimbursementRef("");
    } catch (error) {
      console.error("Failed to bulk reimburse:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle expense selection
  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  // Select all pending
  const selectAllPending = () => {
    const pendingIds = pendingExpenses.map((e) => e.id);
    setSelectedExpenses(pendingIds);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", pb: 4 }}>
      {/* Header */}
      <Paper
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: 2,
          px: 3,
          borderRadius: 0,
        }}
        elevation={2}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.push("/admin")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">Expense Management</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {selectedExpenses.length > 0 && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={handleBulkApprove}
                  disabled={isProcessing}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                >
                  Approve ({selectedExpenses.length})
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setSelectedExpenses([])}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                >
                  Clear
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h5" color="primary">
                    {formatCurrency(stats.monthTotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This Month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h5" color="warning.main">
                    {stats.pendingCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h5" color="warning.main">
                    {formatCurrency(stats.pendingAmount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending Amount
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h5" color="success.main">
                    {stats.approvedCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h5" color="info.main">
                    {stats.reimbursedCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reimbursed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h5">
                    {formatCurrency(stats.todayTotal)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Today
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
                <Badge badgeContent={pendingExpenses.length} color="error">
                  Pending Approval
                </Badge>
              }
            />
            <Tab label="All Expenses" />
            <Tab label="Reports" />
          </Tabs>
        </Paper>

        {/* Pending Approval Tab */}
        <TabPanel value={activeTab} index={0}>
          {pendingExpenses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <CheckCircleIcon sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                All caught up!
              </Typography>
              <Typography color="text.secondary">
                No pending expense claims to review.
              </Typography>
            </Paper>
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Button size="small" onClick={selectAllPending}>
                  Select All ({pendingExpenses.length})
                </Button>
              </Stack>
              <Stack spacing={2}>
                {pendingExpenses.map((expense) => {
                  const info = getExpenseCategoryInfo(expense.category);
                  const isSelected = selectedExpenses.includes(expense.id);
                  return (
                    <Paper key={expense.id} sx={{ p: 2, border: isSelected ? "2px solid" : "none", borderColor: "primary.main" }}>
                      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={2}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleExpenseSelection(expense.id)}
                        />
                        <Avatar sx={{ bgcolor: info.color, width: 48, height: 48 }}>
                          {CategoryIcon[expense.category]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight="bold">{expense.userName}</Typography>
                            <Chip
                              size="small"
                              label={info.label}
                              sx={{ bgcolor: info.color, color: "white" }}
                            />
                            {expense.hasReceipt && (
                              <Tooltip title="Has receipt">
                                <AttachFileIcon fontSize="small" color="success" />
                              </Tooltip>
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {expense.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(expense.date).toLocaleDateString()} •{" "}
                            {PAYMENT_METHODS.find((m) => m.type === expense.paymentMethod)?.label}
                            {expense.vendorName && ` • ${expense.vendorName}`}
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary" sx={{ minWidth: 100, textAlign: "right" }}>
                          {formatCurrency(expense.amount)}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedExpense(expense);
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
                                setSelectedExpense(expense);
                                setRejectionReason("");
                                setShowRejectDialog(true);
                              }}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </>
          )}
        </TabPanel>

        {/* All Expenses Tab */}
        <TabPanel value={activeTab} index={1}>
          {/* Filters */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "all")}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="reimbursed">Reimbursed</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | "all")}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.type} value={cat.type}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Agent</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Receipt</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No expenses found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const info = getExpenseCategoryInfo(expense.category);
                    return (
                      <TableRow key={expense.id} hover>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>{expense.userName}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={CategoryIcon[expense.category] as React.ReactElement}
                            label={info.label}
                            sx={{ bgcolor: `${info.color}20`, color: info.color }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography noWrap>{expense.description}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="medium">
                            {formatCurrency(expense.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getExpenseStatusLabel(expense.status)}
                            sx={{
                              bgcolor: getExpenseStatusColor(expense.status),
                              color: "white",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {expense.hasReceipt && expense.receiptUrl ? (
                            <Tooltip title="View Receipt">
                              <IconButton
                                size="small"
                                onClick={() => window.open(expense.receiptUrl, "_blank")}
                              >
                                <AttachFileIcon color="success" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            {expense.status === "pending" && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedExpense(expense);
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
                                      setSelectedExpense(expense);
                                      setRejectionReason("");
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    <CloseIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {expense.status === "approved" && (
                              <Tooltip title="Mark Reimbursed">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setReimbursementRef("");
                                    setShowReimburseDialog(true);
                                  }}
                                >
                                  <PaymentsIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={2}>
          <ExpenseReports companyId={company?.id || ""} />
        </TabPanel>
      </Container>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)}>
        <DialogTitle>Approve Expense</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, minWidth: 300 }}>
              <Typography variant="body2">
                <strong>{selectedExpense.userName}</strong> - {getExpenseCategoryInfo(selectedExpense.category).label}
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(selectedExpense.amount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedExpense.description}
              </Typography>
            </Box>
          )}
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to approve this expense?
          </Typography>
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
        <DialogTitle>Reject Expense</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedExpense && (
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{selectedExpense.userName}</strong> - {getExpenseCategoryInfo(selectedExpense.category).label}
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedExpense.amount)}
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
              placeholder="Please provide a reason..."
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

      {/* Reimburse Dialog */}
      <Dialog open={showReimburseDialog} onClose={() => setShowReimburseDialog(false)}>
        <DialogTitle>Mark as Reimbursed</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedExpense && (
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{selectedExpense.userName}</strong>
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedExpense.amount)}
                </Typography>
              </Box>
            )}
            <TextField
              label="Reference Number (Optional)"
              fullWidth
              value={reimbursementRef}
              onChange={(e) => setReimbursementRef(e.target.value)}
              placeholder="Transaction/Reference ID"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReimburseDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleReimburse}
            disabled={isProcessing}
          >
            {isProcessing ? <CircularProgress size={20} /> : "Mark Reimbursed"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Expense Details</Typography>
            <IconButton onClick={() => setShowDetailsDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedExpense && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Agent</Typography>
                  <Typography>{selectedExpense.userName}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    size="small"
                    label={getExpenseStatusLabel(selectedExpense.status)}
                    sx={{
                      bgcolor: getExpenseStatusColor(selectedExpense.status),
                      color: "white",
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Category</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {CategoryIcon[selectedExpense.category]}
                    <Typography>{getExpenseCategoryInfo(selectedExpense.category).label}</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Amount</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(selectedExpense.amount)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography>{new Date(selectedExpense.date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                  <Typography>
                    {PAYMENT_METHODS.find((m) => m.type === selectedExpense.paymentMethod)?.label}
                  </Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: "grey.50" }}>
                  <Typography>{selectedExpense.description}</Typography>
                </Paper>
              </Box>

              {selectedExpense.vendorName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Vendor</Typography>
                  <Typography>{selectedExpense.vendorName}</Typography>
                </Box>
              )}

              {selectedExpense.receiptUrl && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Receipt</Typography>
                  <Box
                    component="img"
                    src={selectedExpense.receiptUrl}
                    alt="Receipt"
                    sx={{
                      width: "100%",
                      maxHeight: 300,
                      objectFit: "contain",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "grey.300",
                      mt: 0.5,
                    }}
                  />
                </Box>
              )}

              {selectedExpense.approverName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {selectedExpense.status === "approved" || selectedExpense.status === "reimbursed"
                      ? "Approved By"
                      : "Rejected By"}
                  </Typography>
                  <Typography>
                    {selectedExpense.approverName} on{" "}
                    {new Date(selectedExpense.approvedAt || "").toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              {selectedExpense.rejectionReason && (
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Rejection Reason:</strong> {selectedExpense.rejectionReason}
                  </Typography>
                </Alert>
              )}

              {selectedExpense.status === "reimbursed" && selectedExpense.reimbursementReference && (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Reimbursement Ref:</strong> {selectedExpense.reimbursementReference}
                  </Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          {selectedExpense?.status === "pending" && (
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
                variant="contained"
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
    </Box>
  );
}

// Expense Reports Component
function ExpenseReports({ companyId }: { companyId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalAmount: number;
    totalExpenses: number;
    byStatus: Record<ExpenseStatus, { count: number; amount: number }>;
    byCategory: Record<ExpenseCategory, { count: number; amount: number }>;
    byUser: Record<string, { userName: string; count: number; amount: number }>;
  } | null>(null);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const loadSummary = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
        const data = await getCompanyExpenseSummary(companyId, dateRange.start, dateRange.end);
        setSummary(data);
      } catch (error) {
        console.error("Failed to load summary:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [companyId, dateRange]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) return null;

  return (
    <Stack spacing={3}>
      {/* Date Range Selector */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="h6" color="primary" sx={{ ml: 2 }}>
            Total: {formatCurrency(summary.totalAmount)} ({summary.totalExpenses} expenses)
          </Typography>
        </Stack>
      </Paper>

      {/* By Category */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          By Category
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(summary.byCategory).map(([category, data]) => {
            const info = getExpenseCategoryInfo(category as ExpenseCategory);
            return (
              <Grid key={category} size={{ xs: 6, sm: 4, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Avatar sx={{ bgcolor: info.color, width: 32, height: 32 }}>
                        {CategoryIcon[category as ExpenseCategory]}
                      </Avatar>
                      <Typography variant="body2">{info.label}</Typography>
                    </Stack>
                    <Typography variant="h6">{formatCurrency(data.amount)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {data.count} expenses
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* By User */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          By Agent
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell align="right">Expenses</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(summary.byUser)
                .sort(([, a], [, b]) => b.amount - a.amount)
                .map(([userId, data]) => (
                  <TableRow key={userId}>
                    <TableCell>{data.userName}</TableCell>
                    <TableCell align="right">{data.count}</TableCell>
                    <TableCell align="right">{formatCurrency(data.amount)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* By Status */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          By Status
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(summary.byStatus).map(([status, data]) => (
            <Grid key={status} size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: "center" }}>
                  <Chip
                    label={getExpenseStatusLabel(status as ExpenseStatus)}
                    sx={{
                      bgcolor: getExpenseStatusColor(status as ExpenseStatus),
                      color: "white",
                      mb: 1,
                    }}
                  />
                  <Typography variant="h6">{formatCurrency(data.amount)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.count} expenses
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Stack>
  );
}
