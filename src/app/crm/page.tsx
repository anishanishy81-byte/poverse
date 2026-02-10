"use client";

import { useEffect, useState, useCallback } from "react";
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
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Autocomplete,
  Drawer,
  ListItemButton,
  ListItemIcon,
  Badge,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NoteIcon from "@mui/icons-material/Note";
import HistoryIcon from "@mui/icons-material/History";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import StarIcon from "@mui/icons-material/Star";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CallIcon from "@mui/icons-material/Call";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ScheduleIcon from "@mui/icons-material/Schedule";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import {
  Customer,
  CustomerInteraction,
  CustomerNote,
  CustomerPurchase,
  CustomerStats,
  CustomerFormData,
} from "@/types/customer";
import {
  getCustomers,
  getCustomerStats,
  getAllTags,
  getInteractions,
  getNotes,
  getPurchases,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addInteraction,
  addNote,
  addPurchase,
  addTagToCustomer,
  removeTagFromCustomer,
} from "@/lib/customer";

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

const initialCustomerForm: CustomerFormData = {
  name: "",
  businessName: "",
  type: "individual",
  category: "",
  contact: {
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  },
  tags: [],
  status: "prospect",
  priority: "medium",
};

export default function CRMPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Customer dialog
  const [customerDialog, setCustomerDialog] = useState(false);
  const [customerDialogMode, setCustomerDialogMode] = useState<"create" | "edit">("create");
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(initialCustomerForm);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer detail view
  const [detailView, setDetailView] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState(0);
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);

  // Interaction dialog
  const [interactionDialog, setInteractionDialog] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: "visit" as const,
    description: "",
    outcome: "" as "" | "positive" | "neutral" | "negative",
    nextFollowUp: "",
  });

  // Note dialog
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  // Purchase dialog
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    productName: "",
    quantity: 1,
    unitPrice: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // New tag input
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  const fetchCustomers = useCallback(async () => {
    if (!user?.companyId) return;
    setIsLoading(true);
    try {
      const result = await getCustomers(user.companyId, {
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        searchQuery: searchQuery || undefined,
      });
      if (result.success) {
        setCustomers(result.customers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId, filterStatus, filterPriority, searchQuery]);

  const fetchStats = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const result = await getCustomerStats(user.companyId);
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user?.companyId]);

  const fetchTags = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const result = await getAllTags(user.companyId);
      if (result.success) {
        setAllTags(result.tags);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (user?.companyId) {
      fetchCustomers();
      fetchStats();
      fetchTags();
    }
  }, [user?.companyId, fetchCustomers, fetchStats, fetchTags]);

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const [interactionsData, notesData, purchasesData] = await Promise.all([
        getInteractions(customerId),
        getNotes(customerId),
        getPurchases(customerId),
      ]);

      if (interactionsData.success) setInteractions(interactionsData.interactions);
      if (notesData.success) setNotes(notesData.notes);
      if (purchasesData.success) setPurchases(purchasesData.purchases);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  const handleOpenCustomerDialog = (mode: "create" | "edit", customer?: Customer) => {
    setCustomerDialogMode(mode);
    if (mode === "edit" && customer) {
      setSelectedCustomer(customer);
      setCustomerForm({
        name: customer.name,
        businessName: customer.businessName || "",
        type: customer.type,
        category: customer.category || "",
        contact: customer.contact,
        tags: customer.tags,
        status: customer.status,
        priority: customer.priority,
        location: customer.location,
      });
    } else {
      setSelectedCustomer(null);
      setCustomerForm(initialCustomerForm);
    }
    setFormError(null);
    setFormSuccess(null);
    setCustomerDialog(true);
  };

  const handleCloseCustomerDialog = () => {
    setCustomerDialog(false);
    setSelectedCustomer(null);
    setCustomerForm(initialCustomerForm);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmitCustomer = async () => {
    if (!user) return;
    if (!user.companyId) {
      setFormError("Company ID is required");
      return;
    }
    if (!customerForm.name.trim()) {
      setFormError("Name is required");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (customerDialogMode === "create") {
        const result = await createCustomer(user.companyId, customerForm, user.id);
        if (result.success) {
          setFormSuccess("Customer created successfully!");
          fetchCustomers();
          fetchStats();
          setTimeout(handleCloseCustomerDialog, 1500);
        } else {
          setFormError(result.error || "Failed to create customer");
        }
      } else if (selectedCustomer) {
        const result = await updateCustomer(selectedCustomer.id, customerForm);
        if (result.success) {
          setFormSuccess("Customer updated successfully!");
          fetchCustomers();
          if (detailCustomer?.id === selectedCustomer.id) {
            setDetailCustomer({ ...detailCustomer, ...customerForm } as Customer);
          }
          setTimeout(handleCloseCustomerDialog, 1500);
        } else {
          setFormError(result.error || "Failed to update customer");
        }
      }
    } catch (error) {
      setFormError("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer? All related data will be lost.")) {
      return;
    }

    try {
      const result = await deleteCustomer(customerId);
      if (result.success) {
        fetchCustomers();
        fetchStats();
        if (detailCustomer?.id === customerId) {
          setDetailView(false);
          setDetailCustomer(null);
        }
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setDetailCustomer(customer);
    setDetailTab(0);
    fetchCustomerDetails(customer.id);
    setDetailView(true);
  };

  const handleAddInteraction = async () => {
    if (!user || !detailCustomer) return;
    if (!interactionForm.description.trim()) {
      return;
    }

    try {
      const interactionData = {
        ...interactionForm,
        outcome: interactionForm.outcome || undefined,
        nextFollowUp: interactionForm.nextFollowUp || undefined,
      };
      const result = await addInteraction(detailCustomer.id, interactionData, user.id, user.name);
      if (result.success && result.interaction) {
        setInteractions([result.interaction, ...interactions]);
        setInteractionDialog(false);
        setInteractionForm({
          type: "visit",
          description: "",
          outcome: "",
          nextFollowUp: "",
        });
        fetchCustomers();
        fetchStats();
      }
    } catch (error) {
      console.error("Error adding interaction:", error);
    }
  };

  const handleAddNote = async () => {
    if (!user || !detailCustomer || !noteContent.trim()) return;

    try {
      const result = await addNote(detailCustomer.id, noteContent, user.id, user.name);
      if (result.success && result.note) {
        setNotes([result.note, ...notes]);
        setNoteDialog(false);
        setNoteContent("");
      }
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const handleAddPurchase = async () => {
    if (!user || !detailCustomer) return;
    if (!purchaseForm.productName.trim() || purchaseForm.quantity <= 0) {
      return;
    }

    try {
      const result = await addPurchase(detailCustomer.id, purchaseForm, user.id, user.name);
      if (result.success && result.purchase) {
        setPurchases([result.purchase, ...purchases]);
        setPurchaseDialog(false);
        setPurchaseForm({
          productName: "",
          quantity: 1,
          unitPrice: 0,
          purchaseDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
        fetchCustomers();
        fetchStats();
      }
    } catch (error) {
      console.error("Error adding purchase:", error);
    }
  };

  const handleAddTag = async () => {
    if (!detailCustomer || !newTag.trim()) return;

    try {
      const result = await addTagToCustomer(detailCustomer.id, newTag.trim().toLowerCase());
      if (result.success) {
        const updatedTags = [...detailCustomer.tags, newTag.trim().toLowerCase()];
        setDetailCustomer({ ...detailCustomer, tags: updatedTags });
        setNewTag("");
        fetchTags();
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!detailCustomer) return;

    try {
      const result = await removeTagFromCustomer(detailCustomer.id, tag);
      if (result.success) {
        const updatedTags = detailCustomer.tags.filter((t) => t !== tag);
        setDetailCustomer({ ...detailCustomer, tags: updatedTags });
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "prospect": return "info";
      case "lead": return "warning";
      case "inactive": return "default";
      default: return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "error";
      case "medium": return "warning";
      case "low": return "default";
      default: return "default";
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "visit": return <VisibilityIcon />;
      case "call": return <CallIcon />;
      case "email": return <EmailIcon />;
      case "meeting": return <MeetingRoomIcon />;
      case "follow_up": return <ScheduleIcon />;
      default: return <HistoryIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Customer Detail View
  if (detailView && detailCustomer) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
            py: 2,
            px: { xs: 2, md: 3 },
            position: "sticky",
            top: 0,
            zIndex: 1100,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton
                  onClick={() => setDetailView(false)}
                  sx={{ color: "white" }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={700} sx={{ color: "white" }}>
                  Customer Details
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenCustomerDialog("edit", detailCustomer)}
                  sx={{ color: "white", borderColor: "white" }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteCustomer(detailCustomer.id)}
                  sx={{ borderColor: "#ff8a80", color: "#ff8a80" }}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {/* Customer Info Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: detailCustomer.type === "business" ? "#1976d2" : "#9c27b0",
                    }}
                  >
                    {detailCustomer.type === "business" ? (
                      <BusinessIcon sx={{ fontSize: 32 }} />
                    ) : (
                      <PersonIcon sx={{ fontSize: 32 }} />
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {detailCustomer.name}
                    </Typography>
                    {detailCustomer.businessName && (
                      <Typography variant="body2" color="text.secondary">
                        {detailCustomer.businessName}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip
                        label={detailCustomer.status}
                        size="small"
                        color={getStatusColor(detailCustomer.status) as any}
                      />
                      <Chip
                        label={detailCustomer.priority}
                        size="small"
                        color={getPriorityColor(detailCustomer.priority) as any}
                        icon={<StarIcon sx={{ fontSize: 14 }} />}
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Contact Info */}
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Contact Information
                </Typography>
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  {detailCustomer.contact.phone && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{detailCustomer.contact.phone}</Typography>
                    </Stack>
                  )}
                  {detailCustomer.contact.email && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2">{detailCustomer.contact.email}</Typography>
                    </Stack>
                  )}
                  {(detailCustomer.contact.address || detailCustomer.contact.city) && (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <LocationOnIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {[
                          detailCustomer.contact.address,
                          detailCustomer.contact.city,
                          detailCustomer.contact.state,
                          detailCustomer.contact.country,
                          detailCustomer.contact.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                {/* Tags */}
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Tags
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
                  {detailCustomer.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onDelete={() => handleRemoveTag(tag)}
                      icon={<LocalOfferIcon sx={{ fontSize: 14 }} />}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    sx={{ flex: 1 }}
                  />
                  <Button size="small" onClick={handleAddTag} disabled={!newTag.trim()}>
                    Add
                  </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* Stats */}
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Statistics
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={6}>
                    <Paper sx={{ p: 1.5, bgcolor: "#e3f2fd", textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700} color="primary">
                        {detailCustomer.totalInteractions}
                      </Typography>
                      <Typography variant="caption">Interactions</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={6}>
                    <Paper sx={{ p: 1.5, bgcolor: "#e8f5e9", textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        {detailCustomer.totalPurchases}
                      </Typography>
                      <Typography variant="caption">Purchases</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={12}>
                    <Paper sx={{ p: 1.5, bgcolor: "#fff3e0", textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700} color="warning.main">
                        {formatCurrency(detailCustomer.totalPurchaseValue)}
                      </Typography>
                      <Typography variant="caption">Total Value</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Tabs Content */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ borderRadius: 3 }}>
                <Tabs
                  value={detailTab}
                  onChange={(_, v) => setDetailTab(v)}
                  sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
                >
                  <Tab icon={<HistoryIcon />} iconPosition="start" label="Interactions" />
                  <Tab icon={<NoteIcon />} iconPosition="start" label="Notes" />
                  <Tab icon={<ShoppingCartIcon />} iconPosition="start" label="Purchases" />
                </Tabs>

                {/* Interactions Tab */}
                <TabPanel value={detailTab} index={0}>
                  <Box sx={{ px: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Interaction History
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        variant="contained"
                        onClick={() => setInteractionDialog(true)}
                      >
                        Add Interaction
                      </Button>
                    </Stack>
                    {interactions.length === 0 ? (
                      <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                        No interactions recorded yet
                      </Typography>
                    ) : (
                      <List>
                        {interactions.map((interaction) => (
                          <ListItem
                            key={interaction.id}
                            sx={{
                              bgcolor: "#f9f9f9",
                              borderRadius: 2,
                              mb: 1,
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "#e3f2fd" }}>
                                {getInteractionIcon(interaction.type)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    {interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1).replace("_", " ")}
                                  </Typography>
                                  {interaction.outcome && (
                                    <Chip
                                      label={interaction.outcome}
                                      size="small"
                                      color={
                                        interaction.outcome === "positive"
                                          ? "success"
                                          : interaction.outcome === "negative"
                                          ? "error"
                                          : "default"
                                      }
                                    />
                                  )}
                                </Stack>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {interaction.description}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    By {interaction.agentName} • {formatDate(interaction.createdAt)}
                                    {interaction.nextFollowUp && (
                                      <> • Follow-up: {formatDate(interaction.nextFollowUp)}</>
                                    )}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </TabPanel>

                {/* Notes Tab */}
                <TabPanel value={detailTab} index={1}>
                  <Box sx={{ px: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Notes
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        variant="contained"
                        onClick={() => setNoteDialog(true)}
                      >
                        Add Note
                      </Button>
                    </Stack>
                    {notes.length === 0 ? (
                      <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                        No notes added yet
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {notes.map((note) => (
                          <Paper key={note.id} sx={{ p: 2, bgcolor: "#fffde7" }}>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                              {note.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                              By {note.agentName} • {formatDate(note.createdAt)}
                            </Typography>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </TabPanel>

                {/* Purchases Tab */}
                <TabPanel value={detailTab} index={2}>
                  <Box sx={{ px: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Purchase History
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        variant="contained"
                        onClick={() => setPurchaseDialog(true)}
                      >
                        Add Purchase
                      </Button>
                    </Stack>
                    {purchases.length === 0 ? (
                      <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                        No purchases recorded yet
                      </Typography>
                    ) : (
                      <List>
                        {purchases.map((purchase) => (
                          <ListItem
                            key={purchase.id}
                            sx={{
                              bgcolor: "#f9f9f9",
                              borderRadius: 2,
                              mb: 1,
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "#e8f5e9" }}>
                                <ShoppingCartIcon color="success" />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {purchase.productName}
                                </Typography>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2">
                                    Qty: {purchase.quantity} × {formatCurrency(purchase.unitPrice)} = {formatCurrency(purchase.totalAmount)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(purchase.purchaseDate)} • By {purchase.agentName}
                                  </Typography>
                                  {purchase.notes && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                      {purchase.notes}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </TabPanel>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* Interaction Dialog */}
        <Dialog open={interactionDialog} onClose={() => setInteractionDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Interaction</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={interactionForm.type}
                  label="Type"
                  onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value as any })}
                >
                  <MenuItem value="visit">Visit</MenuItem>
                  <MenuItem value="call">Call</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="meeting">Meeting</MenuItem>
                  <MenuItem value="follow_up">Follow Up</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Description"
                multiline
                rows={3}
                value={interactionForm.description}
                onChange={(e) => setInteractionForm({ ...interactionForm, description: e.target.value })}
                fullWidth
                required
              />
              <FormControl fullWidth size="small">
                <InputLabel>Outcome</InputLabel>
                <Select
                  value={interactionForm.outcome}
                  label="Outcome"
                  onChange={(e) => setInteractionForm({ ...interactionForm, outcome: e.target.value as any })}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  <MenuItem value="positive">Positive</MenuItem>
                  <MenuItem value="neutral">Neutral</MenuItem>
                  <MenuItem value="negative">Negative</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Next Follow-up Date"
                type="date"
                value={interactionForm.nextFollowUp}
                onChange={(e) => setInteractionForm({ ...interactionForm, nextFollowUp: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInteractionDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddInteraction} disabled={!interactionForm.description.trim()}>
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Note Dialog */}
        <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Note</DialogTitle>
          <DialogContent>
            <TextField
              label="Note"
              multiline
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              fullWidth
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddNote} disabled={!noteContent.trim()}>
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Purchase Dialog */}
        <Dialog open={purchaseDialog} onClose={() => setPurchaseDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Purchase</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Product Name"
                value={purchaseForm.productName}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, productName: e.target.value })}
                fullWidth
                required
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
                <TextField
                  label="Unit Price"
                  type="number"
                  value={purchaseForm.unitPrice}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Stack>
              <TextField
                label="Purchase Date"
                type="date"
                value={purchaseForm.purchaseDate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notes"
                multiline
                rows={2}
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                fullWidth
              />
              <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle2">
                  Total: {formatCurrency(purchaseForm.quantity * purchaseForm.unitPrice)}
                </Typography>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPurchaseDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleAddPurchase}
              disabled={!purchaseForm.productName.trim() || purchaseForm.quantity <= 0}
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Customer Form Dialog */}
        <Dialog open={customerDialog} onClose={handleCloseCustomerDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {customerDialogMode === "create" ? "Add New Customer" : "Edit Customer"}
          </DialogTitle>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Name"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  fullWidth
                  required
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={customerForm.type}
                    label="Type"
                    onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value as any })}
                  >
                    <MenuItem value="individual">Individual</MenuItem>
                    <MenuItem value="business">Business</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              {customerForm.type === "business" && (
                <TextField
                  label="Business Name"
                  value={customerForm.businessName}
                  onChange={(e) => setCustomerForm({ ...customerForm, businessName: e.target.value })}
                  fullWidth
                />
              )}
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Phone"
                  value={customerForm.contact.phone}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      contact: { ...customerForm.contact, phone: e.target.value },
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="Email"
                  type="email"
                  value={customerForm.contact.email}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      contact: { ...customerForm.contact, email: e.target.value },
                    })
                  }
                  fullWidth
                />
              </Stack>
              <TextField
                label="Address"
                value={customerForm.contact.address}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    contact: { ...customerForm.contact, address: e.target.value },
                  })
                }
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="City"
                  value={customerForm.contact.city}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      contact: { ...customerForm.contact, city: e.target.value },
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="State"
                  value={customerForm.contact.state}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      contact: { ...customerForm.contact, state: e.target.value },
                    })
                  }
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={customerForm.status}
                    label="Status"
                    onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value as any })}
                  >
                    <MenuItem value="prospect">Prospect</MenuItem>
                    <MenuItem value="lead">Lead</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={customerForm.priority}
                    label="Priority"
                    onChange={(e) => setCustomerForm({ ...customerForm, priority: e.target.value as any })}
                  >
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Category"
                value={customerForm.category}
                onChange={(e) => setCustomerForm({ ...customerForm, category: e.target.value })}
                placeholder="e.g., retail, wholesale, distributor"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCustomerDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitCustomer} disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={20} /> : customerDialogMode === "create" ? "Create" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Customer List View
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 280,
            background: "linear-gradient(180deg, #1e3a5f 0%, #2d5a87 100%)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.2)" }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "white" }}>
                  {user?.name}
                </Typography>
                <Chip
                  label={user?.role?.toUpperCase()}
                  size="small"
                  sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#0ea5e9", color: "white" }}
                />
              </Box>
            </Stack>
            <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1 }} />
        </Box>
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => {
              router.push("/dashboard");
              setMobileMenuOpen(false);
            }}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            }}
          >
            <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          <ListItemButton
            onClick={() => {
              router.push("/profile");
              setMobileMenuOpen(false);
            }}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            }}
          >
            <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: "#ff8a80",
              "&:hover": { bgcolor: "rgba(255,138,128,0.15)" },
            }}
          >
            <ListItemIcon sx={{ color: "#ff8a80", minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
          py: 2,
          px: { xs: 2, md: 3 },
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: "white", display: { xs: "flex", md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              <PeopleIcon sx={{ color: "white", fontSize: 32 }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: "white" }}>
                Customer Database (CRM)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Dashboard">
                <IconButton
                  onClick={() => router.push("/dashboard")}
                  sx={{ color: "white", display: { xs: "none", md: "flex" } }}
                >
                  <DashboardIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCustomerDialog("create")}
                sx={{ bgcolor: "white", color: "#1e3a5f", "&:hover": { bgcolor: "#f0f0f0" } }}
              >
                Add Customer
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {stats.totalCustomers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Customers
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {stats.activeCustomers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {stats.prospects}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Prospects
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {stats.leads}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Leads
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {stats.highPriority}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  High Priority
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  {formatCurrency(stats.totalPurchaseValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Value
                </Typography>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                placeholder="Search customers..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="prospect">Prospect</MenuItem>
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  label="Priority"
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Customer List */}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : customers.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
            <PeopleIcon sx={{ fontSize: 64, color: "#ccc", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No customers found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Start building your customer database
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCustomerDialog("create")}>
              Add First Customer
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {customers.map((customer) => (
              <Grid key={customer.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => handleViewCustomer(customer)}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: customer.type === "business" ? "#1976d2" : "#9c27b0",
                        }}
                      >
                        {customer.type === "business" ? <BusinessIcon /> : <PersonIcon />}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {customer.name}
                        </Typography>
                        {customer.businessName && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {customer.businessName}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                          <Chip
                            label={customer.status}
                            size="small"
                            color={getStatusColor(customer.status) as any}
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                          <Chip
                            label={customer.priority}
                            size="small"
                            color={getPriorityColor(customer.priority) as any}
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        </Stack>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <HistoryIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">
                          {customer.totalInteractions} interactions
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <TrendingUpIcon sx={{ fontSize: 14, color: "success.main" }} />
                        <Typography variant="caption" color="success.main">
                          {formatCurrency(customer.totalPurchaseValue)}
                        </Typography>
                      </Stack>
                    </Stack>

                    {customer.tags.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ height: 18, fontSize: "0.6rem" }}
                          />
                        ))}
                        {customer.tags.length > 3 && (
                          <Chip
                            label={`+${customer.tags.length - 3}`}
                            size="small"
                            sx={{ height: 18, fontSize: "0.6rem" }}
                          />
                        )}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Customer Form Dialog */}
      <Dialog open={customerDialog} onClose={handleCloseCustomerDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {customerDialogMode === "create" ? "Add New Customer" : "Edit Customer"}
        </DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Name"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                fullWidth
                required
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={customerForm.type}
                  label="Type"
                  onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value as any })}
                >
                  <MenuItem value="individual">Individual</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            {customerForm.type === "business" && (
              <TextField
                label="Business Name"
                value={customerForm.businessName}
                onChange={(e) => setCustomerForm({ ...customerForm, businessName: e.target.value })}
                fullWidth
              />
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Phone"
                value={customerForm.contact.phone}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    contact: { ...customerForm.contact, phone: e.target.value },
                  })
                }
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={customerForm.contact.email}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    contact: { ...customerForm.contact, email: e.target.value },
                  })
                }
                fullWidth
              />
            </Stack>
            <TextField
              label="Address"
              value={customerForm.contact.address}
              onChange={(e) =>
                setCustomerForm({
                  ...customerForm,
                  contact: { ...customerForm.contact, address: e.target.value },
                })
              }
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="City"
                value={customerForm.contact.city}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    contact: { ...customerForm.contact, city: e.target.value },
                  })
                }
                fullWidth
              />
              <TextField
                label="State"
                value={customerForm.contact.state}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    contact: { ...customerForm.contact, state: e.target.value },
                  })
                }
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={customerForm.status}
                  label="Status"
                  onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value as any })}
                >
                  <MenuItem value="prospect">Prospect</MenuItem>
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={customerForm.priority}
                  label="Priority"
                  onChange={(e) => setCustomerForm({ ...customerForm, priority: e.target.value as any })}
                >
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Category"
              value={customerForm.category}
              onChange={(e) => setCustomerForm({ ...customerForm, category: e.target.value })}
              placeholder="e.g., retail, wholesale, distributor"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomerDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitCustomer} disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={20} /> : customerDialogMode === "create" ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
