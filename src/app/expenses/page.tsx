"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  InputAdornment,
  Badge,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
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
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import {
  Expense,
  ExpenseInput,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  getExpenseCategoryInfo,
  getExpenseStatusColor,
  getExpenseStatusLabel,
  formatCurrency,
} from "@/types/expense";
import {
  createExpense,
  deleteExpense,
  subscribeToUserExpenses,
  getMonthlyExpenseSummary,
  getDailyExpenseSummary,
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

// Status icon mapping
const StatusIcon: Record<ExpenseStatus, React.ReactNode> = {
  pending: <PendingIcon sx={{ color: "#ff9800" }} />,
  approved: <CheckCircleIcon sx={{ color: "#4caf50" }} />,
  rejected: <CancelIcon sx={{ color: "#f44336" }} />,
  reimbursed: <PaymentsIcon sx={{ color: "#2196f3" }} />,
  cancelled: <CancelIcon sx={{ color: "#9e9e9e" }} />,
};

export default function ExpensesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");

  // Monthly summary
  const [monthlySummary, setMonthlySummary] = useState<{
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
    reimbursedAmount: number;
  } | null>(null);

  // New expense dialog
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [expenseData, setExpenseData] = useState<ExpenseInput>({
    category: "travel",
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
  });

  // Delete dialog
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth check
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
    } else {
      setIsLoading(false);
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Subscribe to expenses
  useEffect(() => {
    if (!user?.id || !company?.id) return;

    const unsubscribe = subscribeToUserExpenses(user.id, company.id, (userExpenses) => {
      setExpenses(userExpenses);
    });

    return () => unsubscribe();
  }, [user?.id, company?.id]);

  // Load monthly summary
  useEffect(() => {
    const loadSummary = async () => {
      if (!user?.id || !company?.id) return;

      const now = new Date();
      const summary = await getMonthlyExpenseSummary(
        user.id,
        company.id,
        now.getFullYear(),
        now.getMonth() + 1
      );

      setMonthlySummary({
        totalAmount: summary.totalAmount,
        approvedAmount: summary.approvedAmount,
        pendingAmount: summary.pendingAmount,
        reimbursedAmount: summary.reimbursedAmount,
      });
    };

    loadSummary();
  }, [user?.id, company?.id, expenses]);

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    // Status filter
    if (statusFilter !== "all" && expense.status !== statusFilter) return false;

    // Tab filter
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (activeTab === 1) {
      // Today
      return expense.date === today;
    } else if (activeTab === 2) {
      // This week
      return expense.date >= weekAgo;
    } else if (activeTab === 3) {
      // Pending
      return expense.status === "pending";
    }

    return true;
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setExpenseData({
      category: "travel",
      amount: 0,
      description: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
    });
    setReceiptFile(null);
    setReceiptPreview(null);
    setSubmitError(null);
  };

  // Open dialog
  const handleOpenExpenseDialog = () => {
    resetForm();
    setShowExpenseDialog(true);
  };

  // Submit expense
  const handleSubmitExpense = async () => {
    if (!user?.id || !user?.name || !company?.id) return;

    if (!expenseData.amount || expenseData.amount <= 0) {
      setSubmitError("Please enter a valid amount");
      return;
    }

    if (!expenseData.description.trim()) {
      setSubmitError("Please enter a description");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createExpense(
        user.id,
        user.name,
        company.id,
        expenseData,
        receiptFile || undefined
      );

      setShowExpenseDialog(false);
      resetForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async () => {
    if (!company?.id || !deletingExpense) return;

    setIsDeleting(true);
    try {
      await deleteExpense(company.id, deletingExpense.id);
      setShowDeleteDialog(false);
      setDeletingExpense(null);
    } catch (error) {
      console.error("Failed to delete expense:", error);
    } finally {
      setIsDeleting(false);
    }
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
            <IconButton onClick={() => router.push("/dashboard")} sx={{ color: "white" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">Expense Tracking</Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenExpenseDialog}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
          >
            Add Expense
          </Button>
        </Stack>
      </Paper>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* Monthly Summary Cards */}
        {monthlySummary && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              This Month&apos;s Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 2 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 32, color: "primary.main", mb: 1 }} />
                    <Typography variant="h6">{formatCurrency(monthlySummary.totalAmount)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Expenses
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 2 }}>
                    <PendingIcon sx={{ fontSize: 32, color: "#ff9800", mb: 1 }} />
                    <Typography variant="h6">{formatCurrency(monthlySummary.pendingAmount)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 2 }}>
                    <CheckCircleIcon sx={{ fontSize: 32, color: "#4caf50", mb: 1 }} />
                    <Typography variant="h6">{formatCurrency(monthlySummary.approvedAmount)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Approved
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 2 }}>
                    <PaymentsIcon sx={{ fontSize: 32, color: "#2196f3", mb: 1 }} />
                    <Typography variant="h6">{formatCurrency(monthlySummary.reimbursedAmount)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Reimbursed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tabs and Filter */}
        <Paper sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 1 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="All" />
              <Tab label="Today" />
              <Tab label="This Week" />
              <Tab
                label={
                  <Badge badgeContent={expenses.filter((e) => e.status === "pending").length} color="warning">
                    Pending
                  </Badge>
                }
              />
            </Tabs>
            <ToggleButtonGroup
              size="small"
              value={statusFilter}
              exclusive
              onChange={(_, v) => v && setStatusFilter(v)}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="approved">Approved</ToggleButton>
              <ToggleButton value="reimbursed">Reimbursed</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Paper>

        {/* Expense List */}
        <Paper>
          {filteredExpenses.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <ReceiptIcon sx={{ fontSize: 60, color: "grey.400", mb: 2 }} />
              <Typography color="text.secondary">No expenses found</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenExpenseDialog}
                sx={{ mt: 2 }}
              >
                Add Your First Expense
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {filteredExpenses.map((expense, index) => {
                const info = getExpenseCategoryInfo(expense.category);
                return (
                  <Box key={expense.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: info.color }}>
                          {CategoryIcon[expense.category]}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight="medium">{expense.description}</Typography>
                            <Chip
                              size="small"
                              label={getExpenseStatusLabel(expense.status)}
                              sx={{
                                bgcolor: getExpenseStatusColor(expense.status),
                                color: "white",
                                fontWeight: "medium",
                              }}
                            />
                            {expense.hasReceipt && (
                              <Tooltip title="Has receipt">
                                <AttachFileIcon fontSize="small" color="action" />
                              </Tooltip>
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {info.label} • {new Date(expense.date).toLocaleDateString()} •{" "}
                              {PAYMENT_METHODS.find((m) => m.type === expense.paymentMethod)?.label}
                            </Typography>
                            {expense.vendorName && (
                              <Typography variant="body2" color="text.secondary">
                                Vendor: {expense.vendorName}
                              </Typography>
                            )}
                            {expense.rejectionReason && (
                              <Typography variant="body2" color="error">
                                Rejected: {expense.rejectionReason}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                      <Stack alignItems="flex-end" spacing={1}>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(expense.amount)}
                        </Typography>
                        {expense.status === "pending" && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDeletingExpense(expense);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
      </Container>

      {/* Add Expense Dialog */}
      <Dialog
        open={showExpenseDialog}
        onClose={() => setShowExpenseDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={expenseData.category}
                label="Category"
                onChange={(e) =>
                  setExpenseData({ ...expenseData, category: e.target.value as ExpenseCategory })
                }
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.type} value={cat.type}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {CategoryIcon[cat.type]}
                      <span>{cat.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={expenseData.amount || ""}
              onChange={(e) =>
                setExpenseData({ ...expenseData, amount: parseFloat(e.target.value) || 0 })
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={expenseData.description}
              onChange={(e) =>
                setExpenseData({ ...expenseData, description: e.target.value })
              }
              placeholder="What was this expense for?"
            />

            <TextField
              label="Date"
              type="date"
              fullWidth
              value={expenseData.date}
              onChange={(e) =>
                setExpenseData({ ...expenseData, date: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={expenseData.paymentMethod}
                label="Payment Method"
                onChange={(e) =>
                  setExpenseData({ ...expenseData, paymentMethod: e.target.value as PaymentMethod })
                }
              >
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method.type} value={method.type}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Vendor Name (Optional)"
              fullWidth
              value={expenseData.vendorName || ""}
              onChange={(e) =>
                setExpenseData({ ...expenseData, vendorName: e.target.value })
              }
            />

            <TextField
              label="Invoice Number (Optional)"
              fullWidth
              value={expenseData.invoiceNumber || ""}
              onChange={(e) =>
                setExpenseData({ ...expenseData, invoiceNumber: e.target.value })
              }
            />

            {/* Receipt Upload */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Receipt (Optional)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              {receiptPreview ? (
                <Box sx={{ position: "relative" }}>
                  <Box
                    component="img"
                    src={receiptPreview}
                    alt="Receipt preview"
                    sx={{
                      width: "100%",
                      maxHeight: 200,
                      objectFit: "contain",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "grey.300",
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "white",
                    }}
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptPreview(null);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  fullWidth
                >
                  Upload Receipt Photo
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitExpense}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : "Add Expense"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Expense</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this expense?
          </Typography>
          {deletingExpense && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{deletingExpense.description}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(deletingExpense.amount)} • {new Date(deletingExpense.date).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteExpense}
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
