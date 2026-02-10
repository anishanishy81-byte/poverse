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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
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
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid2 as Grid,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  Avatar,
  Menu,
  Fab,
  LinearProgress,
  Collapse,
  FormControlLabel,
  Switch,
  Autocomplete,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FlagIcon from "@mui/icons-material/Flag";
import EventIcon from "@mui/icons-material/Event";
import RepeatIcon from "@mui/icons-material/Repeat";
import CategoryIcon from "@mui/icons-material/Category";
import LabelIcon from "@mui/icons-material/Label";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import BusinessIcon from "@mui/icons-material/Business";
import MapIcon from "@mui/icons-material/Map";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import TimerIcon from "@mui/icons-material/Timer";
import DirectionsIcon from "@mui/icons-material/Directions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { useAppStore, useCompany } from "@/store";
import {
  AdminTarget,
  TargetCategory,
  TargetTag,
  TargetPriority,
  RecurrenceType,
  CreateAdminTargetInput,
  AdminTargetFilters,
  AdminTargetStats,
  BulkImportRecord,
  BulkImportResult,
  PRIORITY_INFO,
  RECURRENCE_INFO,
  CSV_IMPORT_HEADERS,
} from "@/types/adminTarget";
import { VisitReason, Target, TargetVisit } from "@/types/target";
import { getVisitReasonInfo, subscribeToAllCompanyTargets, subscribeToCompanyPastVisits, CompanyPastVisitsFilter, getLeadStatusInfo } from "@/lib/targetTracking";
import { User } from "@/types/auth";
import { getUserLocation, calculateDistance, LocationData } from "@/lib/locationTracking";
import { getAllUsers } from "@/lib/auth";
import {
  createAdminTarget,
  getAdminTargets,
  subscribeToAdminTargets,
  updateAdminTarget,
  deleteAdminTarget,
  getCategories,
  subscribeToCategories,
  createDefaultCategories,
  createCategory,
  assignTarget,
  bulkAssignTargets,
  unassignTarget,
  getAdminTargetStats,
  parseCSV,
  validateImportRecord,
  importTargets,
  generateCSVTemplate,
  PRIORITY_INFO as PriorityInfo,
  RECURRENCE_INFO as RecurrenceInfo,
} from "@/lib/adminTargets";

// Visit reasons list for dropdowns
const VISIT_REASONS_LIST: { value: VisitReason; label: string }[] = [
  { value: "sales_pitch", label: "Sales Pitch" },
  { value: "follow_up_visit", label: "Follow-up Visit" },
  { value: "product_demo", label: "Product Demo" },
  { value: "payment_collection", label: "Payment Collection" },
  { value: "customer_support", label: "Customer Support" },
  { value: "survey", label: "Survey" },
  { value: "delivery", label: "Delivery" },
  { value: "maintenance", label: "Maintenance" },
  { value: "new_lead", label: "New Lead" },
  { value: "relationship_building", label: "Relationship Building" },
  { value: "complaint_resolution", label: "Complaint Resolution" },
  { value: "contract_renewal", label: "Contract Renewal" },
  { value: "other", label: "Other" },
];

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// Helper to calculate distance from starting location to target location
const calculateStartToTargetDistance = (
  startLat: number,
  startLng: number,
  targetLat: number,
  targetLng: number
): number => {
  // Returns distance in meters
  return calculateDistance(startLat, startLng, targetLat, targetLng);
};

// Helper to get visit distance in meters - either from saved navigationDistanceKm or calculated from startingLocation to targetLocation
const getVisitDistanceMeters = (visit: TargetVisit): number | null => {
  // First try to use the saved navigation distance
  if (typeof visit.navigationDistanceKm === 'number' && !isNaN(visit.navigationDistanceKm)) {
    return visit.navigationDistanceKm * 1000; // Convert km to meters
  }
  
  // Calculate from navigationStartLocation to target location
  const startLat = visit.navigationStartLocation?.latitude;
  const startLng = visit.navigationStartLocation?.longitude;
  const targetLat = visit.location?.latitude;
  const targetLng = visit.location?.longitude;
  
  if (startLat && startLng && targetLat && targetLng) {
    return calculateStartToTargetDistance(startLat, startLng, targetLat, targetLng);
  }
  
  return null;
};

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

export default function AdminTargetsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const company = useCompany();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [targets, setTargets] = useState<AdminTarget[]>([]);
  const [categories, setCategories] = useState<TargetCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminTargetStats | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [userTargets, setUserTargets] = useState<Target[]>([]);

  // Past visits history state
  const [pastVisits, setPastVisits] = useState<TargetVisit[]>([]);
  const [historyFilter, setHistoryFilter] = useState<CompanyPastVisitsFilter>({ status: "all", limit: 100 });
  const [historyUserFilter, setHistoryUserFilter] = useState<string>("");
  const [historyDetailVisit, setHistoryDetailVisit] = useState<TargetVisit | null>(null);
  const [showHistoryDetailDialog, setShowHistoryDetailDialog] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AdminTargetFilters>({ isActive: true });

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminTarget | null>(null);
  const [targetToAssign, setTargetToAssign] = useState<AdminTarget | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateAdminTargetInput>>({
    priority: "medium",
    recurrence: "none",
    visitReason: "sales_pitch",
    assignedTo: "",
  });
  const [assignData, setAssignData] = useState({
    assignedTo: "",
    visitReason: "sales_pitch" as VisitReason,
    visitReasonNote: "",
    priority: "medium" as TargetPriority,
    deadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRecords, setImportRecords] = useState<BulkImportRecord[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  // Category form
  const [newCategory, setNewCategory] = useState({ name: "", color: "#2196f3", icon: "store", description: "" });

  // Google Places
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [agentLocation, setAgentLocation] = useState<LocationData | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
  const [nearbyRadius, setNearbyRadius] = useState(2000);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; target: AdminTarget } | null>(null);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "superadmin") {
      router.push("/dashboard");
      return;
    }
    setIsLoading(false);
  }, [isAuthenticated, user, router]);

  // Initialize Google Maps
  useEffect(() => {
    const initMaps = () => {
      if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
        const mapDiv = document.createElement("div");
        const map = new (window as any).google.maps.Map(mapDiv);
        placesServiceRef.current = new (window as any).google.maps.places.PlacesService(map);
        autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
        geocoderRef.current = new (window as any).google.maps.Geocoder();
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    if (initMaps()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (initMaps() || attempts >= 20) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Load data
  useEffect(() => {
    if (!user?.companyId) return;

    // Initialize categories
    createDefaultCategories(user.companyId, user.id);

    // Subscribe to targets
    const unsubTargets = subscribeToAdminTargets(
      user.companyId,
      (data) => setTargets(data),
      filters
    );

    // Subscribe to categories
    const unsubCategories = subscribeToCategories(user.companyId, setCategories);

    // Subscribe to user-created targets
    const unsubUserTargets = subscribeToAllCompanyTargets(user.companyId, setUserTargets);

    // Load users
    loadUsers();

    // Load stats
    loadStats();

    return () => {
      unsubTargets();
      unsubCategories();
      unsubUserTargets();
    };
  }, [user?.companyId, filters]);

  // Subscribe to past visits history
  useEffect(() => {
    if (!user?.companyId) return;

    const filter: CompanyPastVisitsFilter = {
      ...historyFilter,
      userId: historyUserFilter || undefined,
    };

    const unsubPastVisits = subscribeToCompanyPastVisits(
      user.companyId,
      setPastVisits,
      filter
    );

    return () => unsubPastVisits();
  }, [user?.companyId, historyFilter, historyUserFilter]);

  const loadUsers = async () => {
    if (!user?.companyId || !user?.id || !user?.role) return;
    try {
      const usersData = await getAllUsers(user.companyId);
      const filteredUsers = usersData.filter((u) => u.role !== "superadmin");
      setUsers(filteredUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadStats = async () => {
    if (!user?.companyId) return;
    try {
      const data = await getAdminTargetStats(user.companyId);
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  // Search location
  const handleLocationSearch = useCallback(async (query: string) => {
    if (!query.trim() || !autocompleteServiceRef.current) return;

    setIsSearching(true);
    try {
      autocompleteServiceRef.current.getPlacePredictions(
        { input: query, types: ["establishment", "geocode"] },
        (predictions, status) => {
          if (status === "OK" && predictions) {
            const detailPromises = predictions.slice(0, 5).map(
              (prediction) =>
                new Promise<PlaceResult | null>((resolve) => {
                  if (!placesServiceRef.current) {
                    resolve(null);
                    return;
                  }
                  placesServiceRef.current.getDetails(
                    { placeId: prediction.place_id, fields: ["name", "formatted_address", "geometry", "place_id"] },
                    (place: any, detailStatus: string) => {
                      if (detailStatus === "OK" && place) {
                        resolve({
                          place_id: place.place_id,
                          name: place.name,
                          formatted_address: place.formatted_address,
                          geometry: place.geometry,
                        });
                      } else {
                        resolve(null);
                      }
                    }
                  );
                })
            );

            Promise.all(detailPromises).then((results) => {
              setSearchResults(results.filter((r): r is PlaceResult => r !== null));
              setIsSearching(false);
            });
          } else {
            setSearchResults([]);
            setIsSearching(false);
          }
        }
      );
    } catch (err) {
      setIsSearching(false);
    }
  }, []);

  const handleSelectPlace = (place: PlaceResult) => {
    setFormData({
      ...formData,
      name: formData.name || place.name,
      location: {
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        address: place.formatted_address,
        placeId: place.place_id,
        placeName: place.name,
      },
    });
    setLocationSearch(place.formatted_address);
    setSearchResults([]);
  };

  useEffect(() => {
    if (!showCreateDialog) return;

    const assignedTo = formData.assignedTo;
    if (!assignedTo) {
      setAgentLocation(null);
      setNearbyPlaces([]);
      setNearbyError(null);
      return;
    }

    let cancelled = false;

    const loadNearby = async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      setNearbyPlaces([]);

      try {
        const location = await getUserLocation(assignedTo);
        if (cancelled) return;

        if (!location || location.latitude == null || location.longitude == null) {
          setAgentLocation(null);
          setNearbyError("No recent location for this agent.");
          setNearbyLoading(false);
          return;
        }

        setAgentLocation(location);

        if (!mapsLoaded || !placesServiceRef.current) {
          setNearbyError("Maps are still loading. Nearby places will appear shortly.");
          setNearbyLoading(false);
          return;
        }

        placesServiceRef.current.nearbySearch(
          {
            location: { lat: location.latitude, lng: location.longitude },
            radius: nearbyRadius,
            type: "establishment",
          },
          (results, status) => {
            if (cancelled) return;

            if (status === "OK" && results) {
              const mapped = results
                .map((place) => {
                  if (!place.place_id || !place.geometry?.location) return null;
                  return {
                    place_id: place.place_id,
                    name: place.name || "Nearby place",
                    formatted_address: place.vicinity || place.formatted_address || "Nearby location",
                    geometry: place.geometry,
                  } as PlaceResult;
                })
                .filter((place): place is PlaceResult => place !== null);

              setNearbyPlaces(mapped);
              setNearbyError(null);
            } else if (status === "ZERO_RESULTS") {
              setNearbyPlaces([]);
              setNearbyError("No nearby places found.");
            } else {
              setNearbyPlaces([]);
              setNearbyError("Failed to load nearby places.");
            }

            setNearbyLoading(false);
          }
        );
      } catch (err) {
        if (cancelled) return;
        setNearbyError("Failed to load nearby places.");
        setNearbyLoading(false);
      }
    };

    loadNearby();

    return () => {
      cancelled = true;
    };
  }, [formData.assignedTo, nearbyRadius, showCreateDialog, mapsLoaded]);

  // Create target
  const handleCreateTarget = async () => {
    if (!user?.companyId || !formData.name || !formData.location) {
      setError("Name and location are required");
      return;
    }

    if (!formData.assignedTo || !formData.visitReason) {
      setError("Please select an agent and visit reason before creating the target.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createAdminTarget(
        user.companyId,
        formData as CreateAdminTargetInput,
        user.id,
        user.name
      );
      setShowCreateDialog(false);
      resetForm();
      loadStats();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Update target
  const handleUpdateTarget = async () => {
    if (!user?.companyId || !editTarget) return;

    setSaving(true);
    setError(null);

    try {
      await updateAdminTarget(user.companyId, editTarget.id, formData, user.id);
      setEditTarget(null);
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Delete target
  const handleDeleteTarget = async (target: AdminTarget) => {
    if (!user?.companyId || !confirm("Are you sure you want to delete this target?")) return;

    try {
      await deleteAdminTarget(user.companyId, target.id);
      loadStats();
    } catch (err) {
      setError(String(err));
    }
  };

  // Assign target
  const handleAssignTarget = async () => {
    if (!user?.companyId || !targetToAssign || !assignData.assignedTo) return;

    setSaving(true);
    setError(null);

    try {
      await assignTarget(
        user.companyId,
        {
          targetId: targetToAssign.id,
          assignedTo: assignData.assignedTo,
          visitReason: assignData.visitReason,
          visitReasonNote: assignData.visitReasonNote,
          priority: assignData.priority,
          deadline: assignData.deadline || undefined,
        },
        user.id,
        user.name
      );
      setShowAssignDialog(false);
      setTargetToAssign(null);
      resetAssignForm();
      loadStats();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Bulk assign
  const handleBulkAssign = async () => {
    if (!user?.companyId || selectedTargets.size === 0 || !assignData.assignedTo) return;

    setSaving(true);
    setError(null);

    try {
      const result = await bulkAssignTargets(
        user.companyId,
        {
          targetIds: Array.from(selectedTargets),
          assignedTo: assignData.assignedTo,
          visitReason: assignData.visitReason,
          visitReasonNote: assignData.visitReasonNote,
          priority: assignData.priority,
          deadline: assignData.deadline || undefined,
        },
        user.id,
        user.name
      );

      if (result.failed > 0) {
        setError(`Assigned ${result.success} targets. ${result.failed} failed.`);
      }

      setShowBulkAssignDialog(false);
      setSelectedTargets(new Set());
      resetAssignForm();
      loadStats();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const records = parseCSV(content);
      setImportRecords(records);
    };
    reader.readAsText(file);
  };

  // Import targets
  const handleImport = async () => {
    if (!user?.companyId || importRecords.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
        if (!geocoderRef.current) return null;
        return new Promise((resolve) => {
          geocoderRef.current!.geocode({ address }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              resolve({
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
              });
            } else {
              resolve(null);
            }
          });
        });
      };

      const result = await importTargets(
        user.companyId,
        importRecords,
        user.id,
        user.name,
        categories,
        users,
        geocodeAddress
      );

      setImportResult(result);
      loadStats();
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = CSV_IMPORT_HEADERS.join(",") + "\n" +
      "ABC Store,\"123 Main St, City, State 12345\",John Doe,+1234567890,john@example.com,Retail,\"premium,key-account\",high,2026-02-15,weekly,agent@company.com,sales_pitch,Important client,Retail Store,,";
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "target_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Create category
  const handleCreateCategory = async () => {
    if (!user?.companyId || !newCategory.name) return;

    try {
      await createCategory(
        user.companyId,
        newCategory.name,
        newCategory.color,
        newCategory.icon,
        newCategory.description,
        user.id
      );
      setShowCategoryDialog(false);
      setNewCategory({ name: "", color: "#2196f3", icon: "store", description: "" });
    } catch (err) {
      setError(String(err));
    }
  };

  const resetForm = () => {
    setFormData({
      priority: "medium",
      recurrence: "none",
      visitReason: "sales_pitch",
      assignedTo: "",
    });
    setLocationSearch("");
    setSearchResults([]);
    setAgentLocation(null);
    setNearbyPlaces([]);
    setNearbyError(null);
  };

  const resetAssignForm = () => {
    setAssignData({
      assignedTo: "",
      visitReason: "sales_pitch",
      visitReasonNote: "",
      priority: "medium",
      deadline: "",
    });
  };

  const handleEditClick = (target: AdminTarget) => {
    setEditTarget(target);
    setFormData({
      name: target.name,
      description: target.description,
      categoryId: target.categoryId,
      tags: target.tags.map((t) => t.name),
      contactPerson: target.contactPerson,
      contactPhone: target.contactPhone,
      contactEmail: target.contactEmail,
      contactDesignation: target.contactDesignation,
      alternatePhone: target.alternatePhone,
      location: target.location,
      businessType: target.businessType,
      annualRevenue: target.annualRevenue,
      employeeCount: target.employeeCount,
      website: target.website,
      priority: target.priority,
      deadline: target.deadline,
      deadlineNotes: target.deadlineNotes,
      recurrence: target.recurrence,
      recurrenceDay: target.recurrenceDay,
      recurrenceTime: target.recurrenceTime,
    });
    setLocationSearch(target.location.address);
    setShowCreateDialog(true);
  };

  const handleSelectAll = () => {
    if (selectedTargets.size === targets.length) {
      setSelectedTargets(new Set());
    } else {
      setSelectedTargets(new Set(targets.map((t) => t.id)));
    }
  };

  const handleSelectTarget = (targetId: string) => {
    const newSelected = new Set(selectedTargets);
    if (newSelected.has(targetId)) {
      newSelected.delete(targetId);
    } else {
      newSelected.add(targetId);
    }
    setSelectedTargets(newSelected);
  };

  const filteredTargets = targets.filter((t) =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityChip = (priority: TargetPriority) => {
    const info = PRIORITY_INFO[priority];
    return (
      <Chip
        size="small"
        label={info.label}
        sx={{ bgcolor: info.color, color: "white", fontWeight: 600 }}
      />
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
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
          p: 2,
          borderRadius: 0,
          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
          color: "white",
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton color="inherit" onClick={() => router.push("/admin")}>
              <ArrowBackIcon />
            </IconButton>
            <Box flex={1}>
              <Typography variant="h5" fontWeight="bold">
                Target Management
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create, assign, and manage targets for your team
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => setShowImportDialog(true)}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
              >
                Import
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { resetForm(); setEditTarget(null); setShowCreateDialog(true); }}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
              >
                Add Target
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {stats.totalTargets}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Targets
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.assignedTargets}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Assigned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {stats.unassignedTargets}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Unassigned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {stats.overdueTargets}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overdue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {stats.completedToday}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed Today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.byPriority.urgent + stats.byPriority.high}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    High Priority
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs for Admin vs User Targets */}
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              "& .MuiTab-root": { fontWeight: 600 },
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Tab
              icon={<FlagIcon />}
              iconPosition="start"
              label={`Admin Targets (${targets.length})`}
            />
            <Tab
              icon={<PersonIcon />}
              iconPosition="start"
              label={`User Targets (${userTargets.length})`}
            />
            <Tab
              icon={<HistoryIcon />}
              iconPosition="start"
              label={`Past Visits (${pastVisits.length})`}
            />
          </Tabs>
        </Paper>

        {/* Admin Targets Tab */}
        {activeTab === 0 && (
          <>
        {/* Search & Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              placeholder="Search targets..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.categoryId || ""}
                label="Category"
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined })}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority?.[0] || ""}
                label="Priority"
                onChange={(e) => setFilters({ ...filters, priority: e.target.value ? [e.target.value as TargetPriority] : undefined })}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={filters.assignedTo || ""}
                label="Assigned To"
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value || undefined })}
              >
                <MenuItem value="">All Agents</MenuItem>
                <MenuItem value="__unassigned__">Unassigned</MenuItem>
                {users.filter((u) => u.role === "user").map((user) => (
                  <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={filters.overdueOnly || false}
                  onChange={(e) => setFilters({ ...filters, overdueOnly: e.target.checked })}
                  size="small"
                />
              }
              label="Overdue Only"
            />

            <Box flex={1} />

            {selectedTargets.size > 0 && (
              <Button
                variant="contained"
                startIcon={<GroupAddIcon />}
                onClick={() => setShowBulkAssignDialog(true)}
              >
                Assign {selectedTargets.size} Selected
              </Button>
            )}

            <IconButton onClick={() => setShowCategoryDialog(true)}>
              <CategoryIcon />
            </IconButton>
          </Stack>
        </Paper>

        {/* Targets Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedTargets.size > 0 && selectedTargets.size < filteredTargets.length}
                      checked={filteredTargets.length > 0 && selectedTargets.size === filteredTargets.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Deadline</TableCell>
                  <TableCell>Recurrence</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTargets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No targets found. Create your first target!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTargets.map((target) => {
                    const isOverdue = target.deadline && new Date(target.deadline) < new Date();
                    
                    return (
                      <TableRow
                        key={target.id}
                        hover
                        selected={selectedTargets.has(target.id)}
                        sx={{ bgcolor: isOverdue ? "error.lighter" : "inherit" }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedTargets.has(target.id)}
                            onChange={() => handleSelectTarget(target.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.main" }}>
                              <BusinessIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {target.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {target.location.address.substring(0, 40)}...
                              </Typography>
                              {target.contactPerson && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  👤 {target.contactPerson}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {target.categoryName && (
                            <Chip size="small" label={target.categoryName} variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>{getPriorityChip(target.priority)}</TableCell>
                        <TableCell>
                          {target.deadline ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {isOverdue && <ErrorIcon color="error" fontSize="small" />}
                              <Typography
                                variant="caption"
                                color={isOverdue ? "error" : "text.secondary"}
                              >
                                {new Date(target.deadline).toLocaleDateString()}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {target.recurrence !== "none" ? (
                            <Chip
                              size="small"
                              icon={<RepeatIcon />}
                              label={RECURRENCE_INFO[target.recurrence].label}
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">One-time</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {target.assignedToName ? (
                            <Chip
                              size="small"
                              avatar={<Avatar sx={{ width: 24, height: 24 }}>{target.assignedToName[0]}</Avatar>}
                              label={target.assignedToName}
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Button
                              size="small"
                              startIcon={<PersonAddIcon />}
                              onClick={() => { setTargetToAssign(target); setShowAssignDialog(true); }}
                            >
                              Assign
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={target.leadStatus.replace("_", " ")}
                            color={
                              target.leadStatus === "converted" ? "success" :
                              target.leadStatus === "interested" ? "primary" :
                              target.leadStatus === "not_interested" ? "error" :
                              "default"
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor({ element: e.currentTarget, target })}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
          </>
        )}

        {/* User Targets Tab */}
        {activeTab === 1 && (
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                User-Created Targets
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Targets created by users for their own visits. These are self-assigned targets.
              </Typography>
            </Box>
            
            {userTargets.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">No user-created targets found.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f9fafb" }}>
                      <TableCell>Target</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Lead Status</TableCell>
                      <TableCell>Last Visit</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userTargets.map((target) => (
                      <TableRow key={target.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: "#10b981" }}>
                              <FlagIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {target.name}
                              </Typography>
                              {target.contactPerson && (
                                <Typography variant="caption" color="text.secondary">
                                  👤 {target.contactPerson}
                                </Typography>
                              )}
                              {target.contactPhone && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  📞 {target.contactPhone}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {target.location?.address || `${target.location?.latitude?.toFixed(4)}, ${target.location?.longitude?.toFixed(4)}` || "-"}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            avatar={<Avatar sx={{ width: 20, height: 20 }}><PersonIcon sx={{ fontSize: 14 }} /></Avatar>}
                            label={target.createdBy || "Unknown"}
                            variant="outlined"
                            color="success"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={(target.leadStatus || "new").replace("_", " ")}
                            variant="outlined"
                            color={
                              target.leadStatus === "converted" ? "success" :
                              target.leadStatus === "interested" ? "primary" :
                              target.leadStatus === "not_interested" ? "error" :
                              target.leadStatus === "follow_up" ? "info" :
                              "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {target.lastVisitOutcome?.replace(/_/g, " ") || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {target.createdAt
                              ? new Date(target.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

        {/* Past Visits History Tab */}
        {activeTab === 2 && (
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Past Visits History
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View completed and skipped visits by all users. Click on a visit to see details.
              </Typography>
              
              {/* Filters */}
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label="All"
                    variant={historyFilter.status === "all" ? "filled" : "outlined"}
                    color={historyFilter.status === "all" ? "primary" : "default"}
                    onClick={() => setHistoryFilter((f) => ({ ...f, status: "all" }))}
                    size="small"
                  />
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Completed"
                    variant={historyFilter.status === "completed" ? "filled" : "outlined"}
                    color={historyFilter.status === "completed" ? "success" : "default"}
                    onClick={() => setHistoryFilter((f) => ({ ...f, status: "completed" }))}
                    size="small"
                  />
                  <Chip
                    icon={<SkipNextIcon />}
                    label="Skipped"
                    variant={historyFilter.status === "skipped" ? "filled" : "outlined"}
                    color={historyFilter.status === "skipped" ? "warning" : "default"}
                    onClick={() => setHistoryFilter((f) => ({ ...f, status: "skipped" }))}
                    size="small"
                  />
                </Stack>
                
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by User</InputLabel>
                  <Select
                    value={historyUserFilter}
                    label="Filter by User"
                    onChange={(e) => setHistoryUserFilter(e.target.value)}
                  >
                    <MenuItem value="">All Users</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {pastVisits.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <HistoryIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                <Typography color="text.secondary">No past visits found.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f9fafb" }}>
                      <TableCell>Target</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Distance</TableCell>
                      <TableCell>Lead Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pastVisits.map((visit) => {
                      const visitUser = users.find((u) => u.id === visit.userId);
                      const durationMin = visit.durationMinutes || 0;
                      const durationHrs = Math.floor(durationMin / 60);
                      const durationDisplay = durationHrs > 0
                        ? `${durationHrs}h ${durationMin % 60}m`
                        : `${durationMin}m`;
                      const leadInfo = visit.leadStatus ? getLeadStatusInfo(visit.leadStatus) : null;
                      
                      return (
                        <TableRow 
                          key={visit.id} 
                          hover 
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            setHistoryDetailVisit(visit);
                            setShowHistoryDetailDialog(true);
                          }}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar sx={{ bgcolor: visit.status === "completed" ? "#10b981" : "#f59e0b" }}>
                                {visit.status === "completed" ? <CheckCircleIcon /> : <SkipNextIcon />}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {visit.targetName || "Target"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {visit.location?.address || "-"}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              avatar={<Avatar sx={{ width: 20, height: 20 }}><PersonIcon sx={{ fontSize: 14 }} /></Avatar>}
                              label={visitUser?.name || visit.userId || "Unknown"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              icon={visit.status === "completed" ? <CheckCircleIcon /> : <SkipNextIcon />}
                              label={visit.status === "completed" ? "Completed" : "Skipped"}
                              color={visit.status === "completed" ? "success" : "warning"}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <TimerIcon fontSize="small" color="action" />
                              <Typography variant="body2">{durationDisplay}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <DirectionsIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {(() => {
                                  const distanceMeters = getVisitDistanceMeters(visit);
                                  return distanceMeters !== null ? formatDistance(distanceMeters) : "-";
                                })()}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {leadInfo ? (
                              <Chip
                                size="small"
                                label={leadInfo.label}
                                sx={{ bgcolor: leadInfo.color, color: "#fff" }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(visit.completedAt || visit.skippedAt || visit.assignedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryDetailVisit(visit);
                                setShowHistoryDetailDialog(true);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Container>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => { handleEditClick(menuAnchor!.target); setMenuAnchor(null); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          Edit
        </MenuItem>
        {!menuAnchor?.target.assignedTo && (
          <MenuItem onClick={() => { setTargetToAssign(menuAnchor!.target); setShowAssignDialog(true); setMenuAnchor(null); }}>
            <ListItemIcon><PersonAddIcon fontSize="small" /></ListItemIcon>
            Assign
          </MenuItem>
        )}
        {menuAnchor?.target.assignedTo && (
          <MenuItem onClick={async () => {
            if (user?.companyId && menuAnchor?.target) {
              await unassignTarget(user.companyId, menuAnchor.target.id, menuAnchor.target.assignedTo!);
              setMenuAnchor(null);
            }
          }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            Unassign
          </MenuItem>
        )}
        <MenuItem onClick={() => { handleDeleteTarget(menuAnchor!.target); setMenuAnchor(null); }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>

      {/* Create/Edit Target Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editTarget ? "Edit Target" : "Create New Target"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Target Name *"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.categoryId || ""}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>

            {/* Location */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                Location
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Search Address *"
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  handleLocationSearch(e.target.value);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnIcon />
                    </InputAdornment>
                  ),
                }}
              />
              {searchResults.length > 0 && (
                <Paper sx={{ maxHeight: 200, overflow: "auto", mt: 1 }}>
                  <List dense>
                    {searchResults.map((place) => (
                      <ListItemButton key={place.place_id} onClick={() => handleSelectPlace(place)}>
                        <ListItemIcon><LocationOnIcon /></ListItemIcon>
                        <ListItemText
                          primary={place.name}
                          secondary={place.formatted_address}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}

              {!editTarget && (
                <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">Nearby Locations for Selected Agent</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Select an agent below to view nearby places and assign faster.
                      </Typography>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Radius</InputLabel>
                      <Select
                        value={nearbyRadius}
                        label="Radius"
                        onChange={(e) => setNearbyRadius(Number(e.target.value))}
                      >
                        <MenuItem value={500}>500 m</MenuItem>
                        <MenuItem value={1000}>1 km</MenuItem>
                        <MenuItem value={2000}>2 km</MenuItem>
                        <MenuItem value={5000}>5 km</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    {!formData.assignedTo && (
                      <Alert severity="info">Pick an agent to load nearby locations.</Alert>
                    )}

                    {formData.assignedTo && (
                      <>
                        {agentLocation && (
                          <Alert severity="success" sx={{ mb: 1 }}>
                            Agent last location: {agentLocation.address || "Location available"} ·{" "}
                            {new Date(agentLocation.timestamp).toLocaleString()}
                          </Alert>
                        )}
                        {nearbyLoading && (
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                            <CircularProgress size={18} />
                            <Typography variant="body2">Loading nearby places...</Typography>
                          </Stack>
                        )}
                        {nearbyError && !nearbyLoading && (
                          <Alert severity="warning">{nearbyError}</Alert>
                        )}
                        {!nearbyLoading && !nearbyError && nearbyPlaces.length === 0 && formData.assignedTo && (
                          <Typography variant="body2" color="text.secondary">
                            No nearby places found for this agent.
                          </Typography>
                        )}
                        {nearbyPlaces.length > 0 && (
                          <List dense sx={{ mt: 1 }}>
                            {nearbyPlaces.slice(0, 8).map((place) => {
                              const distance =
                                agentLocation
                                  ? formatDistance(
                                      calculateDistance(
                                        agentLocation.latitude,
                                        agentLocation.longitude,
                                        place.geometry.location.lat(),
                                        place.geometry.location.lng()
                                      )
                                    )
                                  : "";

                              return (
                                <ListItem
                                  key={place.place_id}
                                  secondaryAction={
                                    <Button size="small" onClick={() => handleSelectPlace(place)}>
                                      Use
                                    </Button>
                                  }
                                >
                                  <ListItemIcon>
                                    <LocationOnIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={place.name}
                                    secondary={
                                      distance
                                        ? `${place.formatted_address} • ${distance}`
                                        : place.formatted_address
                                    }
                                  />
                                </ListItem>
                              );
                            })}
                          </List>
                        )}
                      </>
                    )}
                  </Box>
                </Paper>
              )}
            </Grid>

            {/* Contact */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                Contact Information
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Contact Person"
                value={formData.contactPerson || ""}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Designation"
                value={formData.contactDesignation || ""}
                onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.contactPhone || ""}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={formData.contactEmail || ""}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment> }}
              />
            </Grid>

            {/* Priority & Schedule */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                Priority & Schedule
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Priority *</InputLabel>
                <Select
                  value={formData.priority || "medium"}
                  label="Priority *"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TargetPriority })}
                >
                  <MenuItem value="low">🔵 Low</MenuItem>
                  <MenuItem value="medium">🟡 Medium</MenuItem>
                  <MenuItem value="high">🟠 High</MenuItem>
                  <MenuItem value="urgent">🔴 Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Deadline"
                value={formData.deadline?.split("T")[0] || ""}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Recurrence</InputLabel>
                <Select
                  value={formData.recurrence || "none"}
                  label="Recurrence"
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as RecurrenceType })}
                >
                  {Object.entries(RECURRENCE_INFO).map(([key, info]) => (
                    <MenuItem key={key} value={key}>{info.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Assignment */}
            {!editTarget && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                    Assignment (Required)
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Assign To</InputLabel>
                    <Select
                      value={formData.assignedTo || ""}
                      label="Assign To"
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    >
                      {users.filter((u) => u.role === "user").map((user) => (
                        <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Visit Reason</InputLabel>
                    <Select
                      value={formData.visitReason || "sales_pitch"}
                      label="Visit Reason"
                      onChange={(e) => setFormData({ ...formData, visitReason: e.target.value as VisitReason })}
                    >
                      {VISIT_REASONS_LIST.map((reason) => (
                        <MenuItem key={reason.value} value={reason.value}>{reason.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={editTarget ? handleUpdateTarget : handleCreateTarget}
            disabled={
              saving ||
              !formData.name ||
              !formData.location ||
              (!editTarget && (!formData.assignedTo || !formData.visitReason))
            }
          >
            {saving ? <CircularProgress size={20} /> : (editTarget ? "Update" : "Create & Assign")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Target</DialogTitle>
        <DialogContent>
          {targetToAssign && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Assigning: <strong>{targetToAssign.name}</strong>
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={assignData.assignedTo}
                label="Assign To"
                onChange={(e) => setAssignData({ ...assignData, assignedTo: e.target.value })}
              >
                {users.filter((u) => u.role === "user").map((user) => (
                  <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Visit Reason</InputLabel>
              <Select
                value={assignData.visitReason}
                label="Visit Reason"
                onChange={(e) => setAssignData({ ...assignData, visitReason: e.target.value as VisitReason })}
              >
                {VISIT_REASONS_LIST.map((reason) => (
                  <MenuItem key={reason.value} value={reason.value}>{reason.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={assignData.priority}
                label="Priority"
                onChange={(e) => setAssignData({ ...assignData, priority: e.target.value as TargetPriority })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="Deadline"
              value={assignData.deadline}
              onChange={(e) => setAssignData({ ...assignData, deadline: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={2}
              value={assignData.visitReasonNote}
              onChange={(e) => setAssignData({ ...assignData, visitReasonNote: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignTarget}
            disabled={saving || !assignData.assignedTo}
          >
            {saving ? <CircularProgress size={20} /> : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onClose={() => setShowBulkAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Assign Targets</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Assigning <strong>{selectedTargets.size}</strong> targets
          </Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={assignData.assignedTo}
                label="Assign To"
                onChange={(e) => setAssignData({ ...assignData, assignedTo: e.target.value })}
              >
                {users.filter((u) => u.role === "user").map((user) => (
                  <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Visit Reason</InputLabel>
              <Select
                value={assignData.visitReason}
                label="Visit Reason"
                onChange={(e) => setAssignData({ ...assignData, visitReason: e.target.value as VisitReason })}
              >
                {VISIT_REASONS_LIST.map((reason) => (
                  <MenuItem key={reason.value} value={reason.value}>{reason.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={assignData.priority}
                label="Priority"
                onChange={(e) => setAssignData({ ...assignData, priority: e.target.value as TargetPriority })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="Deadline"
              value={assignData.deadline}
              onChange={(e) => setAssignData({ ...assignData, deadline: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkAssign}
            disabled={saving || !assignData.assignedTo}
          >
            {saving ? <CircularProgress size={20} /> : "Assign All"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Targets from CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Upload a CSV file with target data. Download the template for the correct format.
              <Button size="small" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} sx={{ ml: 2 }}>
                Download Template
              </Button>
            </Alert>

            <Box
              sx={{
                border: "2px dashed",
                borderColor: "grey.300",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": { borderColor: "primary.main", bgcolor: "grey.50" },
              }}
              component="label"
            >
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileUpload}
              />
              <UploadFileIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
              <Typography>
                {importFile ? importFile.name : "Click or drag CSV file here"}
              </Typography>
            </Box>

            {importRecords.length > 0 && !importResult && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preview ({importRecords.length} records)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Priority</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importRecords.slice(0, 10).map((record, i) => (
                        <TableRow key={i}>
                          <TableCell>{record.rowNumber}</TableCell>
                          <TableCell>{record.name}</TableCell>
                          <TableCell>{record.address?.substring(0, 30)}...</TableCell>
                          <TableCell>{record.contactPerson || "-"}</TableCell>
                          <TableCell>{record.priority || "medium"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {importRecords.length > 10 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {importRecords.length - 10} more records
                  </Typography>
                )}
              </Box>
            )}

            {importing && (
              <Box sx={{ textAlign: "center" }}>
                <CircularProgress />
                <Typography sx={{ mt: 1 }}>Importing targets...</Typography>
              </Box>
            )}

            {importResult && (
              <Box>
                <Alert severity={importResult.errorCount > 0 ? "warning" : "success"}>
                  Import completed: {importResult.successCount} success, {importResult.errorCount} errors
                </Alert>
                {importResult.errors.length > 0 && (
                  <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto" }}>
                    <Typography variant="subtitle2" color="error">Errors:</Typography>
                    {importResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" display="block" color="error">
                        Row {err.row}: {err.message}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowImportDialog(false); setImportFile(null); setImportRecords([]); setImportResult(null); }}>
            Close
          </Button>
          {importRecords.length > 0 && !importResult && (
            <Button variant="contained" onClick={handleImport} disabled={importing}>
              Import {importRecords.length} Targets
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onClose={() => setShowCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Categories</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Existing Categories</Typography>
            <List dense>
              {categories.map((cat) => (
                <ListItem key={cat.id}>
                  <ListItemIcon>
                    <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: cat.color }} />
                  </ListItemIcon>
                  <ListItemText primary={cat.name} secondary={cat.description} />
                </ListItem>
              ))}
            </List>

            <Divider />

            <Typography variant="subtitle2">Add New Category</Typography>
            <TextField
              fullWidth
              label="Category Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Color"
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                sx={{ width: 100 }}
              />
              <TextField
                fullWidth
                label="Description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCategoryDialog(false)}>Close</Button>
          <Button variant="contained" onClick={handleCreateCategory} disabled={!newCategory.name}>
            Add Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Detail Dialog */}
      <Dialog
        open={showHistoryDetailDialog}
        onClose={() => setShowHistoryDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: historyDetailVisit?.status === "completed" ? "#10b981" : "#f59e0b" }}>
              {historyDetailVisit?.status === "completed" ? <CheckCircleIcon /> : <SkipNextIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6">{historyDetailVisit?.targetName || "Visit Details"}</Typography>
              <Typography variant="body2" color="text.secondary">
                {historyDetailVisit?.status === "completed" ? "Completed" : "Skipped"} on{" "}
                {historyDetailVisit?.completedAt || historyDetailVisit?.skippedAt
                  ? new Date(historyDetailVisit.completedAt || historyDetailVisit.skippedAt || "").toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {historyDetailVisit && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* User Info */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  User
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PersonIcon fontSize="small" color="action" />
                  <Typography>
                    {users.find((u) => u.id === historyDetailVisit.userId)?.name || historyDetailVisit.userId}
                  </Typography>
                </Stack>
              </Box>

              {/* Skip Reason (if skipped) */}
              {historyDetailVisit.status === "skipped" && historyDetailVisit.skipReason && (
                <Box>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Skip Reason
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    {historyDetailVisit.skipReason}
                  </Alert>
                </Box>
              )}

              {/* Visit Statistics */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Visit Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                        <TimerIcon color="primary" />
                        <Typography variant="h6">
                          {(() => {
                            const mins = historyDetailVisit.durationMinutes || 0;
                            const hrs = Math.floor(mins / 60);
                            return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
                          })()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Duration
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                        <DirectionsIcon color="info" />
                        <Typography variant="h6">
                          {(() => {
                            const distanceMeters = getVisitDistanceMeters(historyDetailVisit);
                            return distanceMeters !== null ? formatDistance(distanceMeters) : "-";
                          })()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Distance
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                        <EventIcon color="success" />
                        <Typography variant="h6">
                          {historyDetailVisit.reachedAt
                            ? new Date(historyDetailVisit.reachedAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reached At
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                        <EventIcon color="error" />
                        <Typography variant="h6">
                          {historyDetailVisit.timerEndedAt
                            ? new Date(historyDetailVisit.timerEndedAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Completed At
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Outcome and Notes */}
              {(historyDetailVisit.outcome || historyDetailVisit.conversationNotes) && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Outcome & Notes
                  </Typography>
                  {historyDetailVisit.outcome && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Outcome:</strong> {historyDetailVisit.outcome}
                    </Typography>
                  )}
                  {historyDetailVisit.conversationNotes && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Notes:</strong> {historyDetailVisit.conversationNotes}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Lead Status and Follow-up */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Lead Information
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {historyDetailVisit.leadStatus && (
                    <Chip
                      label={getLeadStatusInfo(historyDetailVisit.leadStatus).label}
                      sx={{
                        bgcolor: getLeadStatusInfo(historyDetailVisit.leadStatus).color,
                        color: "#fff",
                      }}
                    />
                  )}
                  {historyDetailVisit.nextFollowUpDate && (
                    <Chip
                      icon={<EventIcon />}
                      label={`Follow-up: ${new Date(historyDetailVisit.nextFollowUpDate).toLocaleDateString("en-IN")}`}
                      variant="outlined"
                      color="info"
                    />
                  )}
                  {historyDetailVisit.outcomeFlags?.includes("deal_closed") && (
                    <Chip label="Deal Closed" color="success" />
                  )}
                  {historyDetailVisit.outcomeFlags?.includes("interested") && (
                    <Chip label="Interested" color="success" />
                  )}
                  {historyDetailVisit.outcomeFlags?.includes("send_quotation") && (
                    <Chip label="Send Quotation" color="primary" />
                  )}
                  {historyDetailVisit.outcomeFlags?.includes("needs_follow_up") && (
                    <Chip label="Needs Follow-up" color="warning" />
                  )}
                </Stack>
              </Box>

              {/* Location */}
              {historyDetailVisit.location && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Location
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationOnIcon fontSize="small" color="error" />
                    <Typography variant="body2">
                      {historyDetailVisit.location.address ||
                        `${historyDetailVisit.location.latitude?.toFixed(5)}, ${historyDetailVisit.location.longitude?.toFixed(5)}`}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Contact Info */}
              {(historyDetailVisit.contactPerson || historyDetailVisit.contactPhone) && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Contact Information
                  </Typography>
                  {historyDetailVisit.contactPerson && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2">{historyDetailVisit.contactPerson}</Typography>
                    </Stack>
                  )}
                  {historyDetailVisit.contactPhone && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{historyDetailVisit.contactPhone}</Typography>
                    </Stack>
                  )}
                </Box>
              )}

              {/* Visit Reason */}
              {historyDetailVisit.visitReason && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Visit Reason
                  </Typography>
                  <Chip
                    label={getVisitReasonInfo(historyDetailVisit.visitReason).label}
                    sx={{
                      bgcolor: getVisitReasonInfo(historyDetailVisit.visitReason).color,
                      color: "#fff",
                    }}
                  />
                  {historyDetailVisit.visitReasonNote && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {historyDetailVisit.visitReasonNote}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistoryDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
