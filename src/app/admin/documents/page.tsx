"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid2 as Grid,
  Card,
  CardContent,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Avatar,
  Menu,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Autocomplete,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
  Slideshow as PresentationIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Assessment as StatsIcon,
  Settings as SettingsIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  CheckBox as CheckBoxIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { useAppStore } from "../../../store/useAppStore";
import {
  Document,
  DocumentCategory,
  DocumentUploadInput,
  DocumentVisibility,
  DOCUMENT_CATEGORIES,
  VISIBILITY_OPTIONS,
  getDocumentCategoryInfo,
  getDocumentTypeInfo,
  formatFileSize,
  isViewableInBrowser,
} from "../../../types/document";
import {
  uploadDocument,
  subscribeToCompanyDocuments,
  deleteDocument,
  updateDocument,
  archiveDocument,
  restoreDocument,
  recordDocumentView,
  recordDocumentDownload,
  getDocumentStats,
} from "../../../lib/document";

// Document type icon mapping
const getDocumentIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <PdfIcon />;
    case "image":
      return <ImageIcon />;
    case "document":
      return <DocIcon />;
    case "spreadsheet":
      return <SpreadsheetIcon />;
    case "presentation":
      return <PresentationIcon />;
    default:
      return <FileIcon />;
  }
};

// Visibility icon mapping
const getVisibilityIcon = (visibility: DocumentVisibility) => {
  switch (visibility) {
    case "public":
      return <PublicIcon fontSize="small" />;
    case "company":
      return <BusinessIcon fontSize="small" />;
    case "admin_only":
      return <LockIcon fontSize="small" />;
    case "specific_users":
      return <PeopleIcon fontSize="small" />;
    default:
      return <PublicIcon fontSize="small" />;
  }
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDocumentsPage() {
  const { user, company } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "all">("all");
  const [selectedVisibility, setSelectedVisibility] = useState<DocumentVisibility | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"active" | "archived" | "all">("active");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  
  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState<DocumentUploadInput>({
    name: "",
    description: "",
    category: "other",
    tags: [],
    visibility: "company",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Edit form
  const [editForm, setEditForm] = useState<Partial<Document>>({});
  
  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    document: Document;
  } | null>(null);
  
  // Stats
  const [stats, setStats] = useState<{
    totalDocuments: number;
    byCategory: Record<DocumentCategory, number>;
    totalSize: number;
    totalViews: number;
    totalDownloads: number;
  } | null>(null);
  
  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "superadmin") {
      window.location.href = "/dashboard";
    }
  }, [user]);
  
  // Load documents
  useEffect(() => {
    if (!company?.id) return;
    
    setLoading(true);
    const unsubscribe = subscribeToCompanyDocuments(company.id, (docs) => {
      // Admin sees all documents including archived
      setDocuments(docs);
      setLoading(false);
    });
    
    // Load stats
    loadStats();
    
    return () => unsubscribe();
  }, [company?.id]);
  
  const loadStats = async () => {
    if (!company?.id) return;
    const docStats = await getDocumentStats(company.id);
    setStats(docStats);
  };
  
  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory !== "all" && doc.category !== selectedCategory) return false;
    if (selectedVisibility !== "all" && doc.visibility !== selectedVisibility) return false;
    if (selectedStatus !== "all" && doc.status !== selectedStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.uploadedByName.toLowerCase().includes(query) ||
        doc.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadForm((prev) => ({
        ...prev,
        name: file.name.substring(0, file.name.lastIndexOf(".")) || file.name,
      }));
      setUploadDialogOpen(true);
    }
  };
  
  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile || !company?.id || !user?.id || !user?.name) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      
      await uploadDocument(company.id, user.id, user.name, uploadFile, uploadForm);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setSuccess("Document uploaded successfully!");
      setUploadDialogOpen(false);
      resetUploadForm();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadForm({
      name: "",
      description: "",
      category: "other",
      tags: [],
      visibility: "company",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Handle view document
  const handleViewDocument = async (doc: Document) => {
    if (!company?.id || !user?.id || !user?.name) return;
    
    await recordDocumentView(company.id, doc.id, user.id, user.name);
    
    if (isViewableInBrowser(doc.type)) {
      setSelectedDocument(doc);
      setViewDialogOpen(true);
    } else {
      handleDownloadDocument(doc);
    }
  };
  
  // Handle download document
  const handleDownloadDocument = async (doc: Document) => {
    if (!company?.id || !user?.id || !user?.name) return;
    
    await recordDocumentDownload(company.id, doc.id, user.id, user.name);
    window.open(doc.fileUrl, "_blank");
  };
  
  // Handle edit document
  const handleEditDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setEditForm({
      name: doc.name,
      description: doc.description,
      category: doc.category,
      tags: doc.tags,
      visibility: doc.visibility,
    });
    setEditDialogOpen(true);
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    if (!selectedDocument || !company?.id) return;
    
    try {
      await updateDocument(company.id, selectedDocument.id, editForm);
      setSuccess("Document updated successfully!");
      setEditDialogOpen(false);
      setSelectedDocument(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update document");
    }
  };
  
  // Handle archive document
  const handleArchiveDocument = async (doc: Document) => {
    if (!company?.id) return;
    
    try {
      await archiveDocument(company.id, doc.id);
      setSuccess("Document archived successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive document");
    }
  };
  
  // Handle restore document
  const handleRestoreDocument = async (doc: Document) => {
    if (!company?.id) return;
    
    try {
      await restoreDocument(company.id, doc.id);
      setSuccess("Document restored successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore document");
    }
  };
  
  // Handle delete document
  const handleDeleteDocument = async () => {
    if (!selectedDocument || !company?.id) return;
    
    try {
      await deleteDocument(company.id, selectedDocument.id);
      setSuccess("Document deleted permanently!");
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };
  
  // Handle bulk actions
  const handleBulkArchive = async () => {
    if (!company?.id || selectedDocs.length === 0) return;
    
    try {
      await Promise.all(selectedDocs.map((id) => archiveDocument(company.id!, id)));
      setSuccess(`${selectedDocs.length} documents archived!`);
      setSelectedDocs([]);
    } catch (err) {
      setError("Failed to archive some documents");
    }
  };
  
  const handleBulkDelete = async () => {
    if (!company?.id || selectedDocs.length === 0) return;
    
    try {
      await Promise.all(selectedDocs.map((id) => deleteDocument(company.id!, id)));
      setSuccess(`${selectedDocs.length} documents deleted!`);
      setSelectedDocs([]);
      loadStats();
    } catch (err) {
      setError("Failed to delete some documents");
    }
  };
  
  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocuments.map((d) => d.id));
    }
  };
  
  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent, doc: Document) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      document: doc,
    });
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton href="/admin">
            <BackIcon />
          </IconButton>
          <AdminIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Document Management
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadStats}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Document
          </Button>
        </Box>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
        />
      </Box>
      
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<FileIcon />} label="All Documents" iconPosition="start" />
          <Tab icon={<StatsIcon />} label="Statistics" iconPosition="start" />
        </Tabs>
      </Paper>
      
      {/* Documents Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" color="primary">
                    {stats.totalDocuments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Documents
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" color="success.main">
                    {formatFileSize(stats.totalSize)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Storage Used
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" color="info.main">
                    {stats.totalViews}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Views
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="h4" color="warning.main">
                    {stats.totalDownloads}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Downloads
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | "all")}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.type} value={cat.type}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Visibility</InputLabel>
                <Select
                  value={selectedVisibility}
                  label="Visibility"
                  onChange={(e) => setSelectedVisibility(e.target.value as DocumentVisibility | "all")}
                >
                  <MenuItem value="all">All</MenuItem>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => setSelectedStatus(e.target.value as "active" | "archived" | "all")}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Bulk Actions */}
        {selectedDocs.length > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: "primary.light" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="primary.contrastText">
                {selectedDocs.length} document(s) selected
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<ArchiveIcon />}
                  onClick={handleBulkArchive}
                >
                  Archive
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </Paper>
        )}
        
        {/* Documents Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedDocs.length === filteredDocuments.length && filteredDocuments.length > 0}
                    indeterminate={selectedDocs.length > 0 && selectedDocs.length < filteredDocuments.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Visibility</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Views / Downloads</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No documents found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow
                    key={doc.id}
                    hover
                    onContextMenu={(e) => handleContextMenu(e, doc)}
                    sx={{ opacity: doc.status === "archived" ? 0.6 : 1 }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedDocs.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocs([...selectedDocs, doc.id]);
                          } else {
                            setSelectedDocs(selectedDocs.filter((id) => id !== doc.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ color: getDocumentCategoryInfo(doc.category).color }}>
                          {getDocumentIcon(doc.type)}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {doc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.fileName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getDocumentCategoryInfo(doc.category).label}
                        sx={{
                          bgcolor: getDocumentCategoryInfo(doc.category).color + "20",
                          color: getDocumentCategoryInfo(doc.category).color,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={VISIBILITY_OPTIONS.find((o) => o.value === doc.visibility)?.description}>
                        <Chip
                          size="small"
                          icon={getVisibilityIcon(doc.visibility)}
                          label={VISIBILITY_OPTIONS.find((o) => o.value === doc.visibility)?.label}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell>
                      {doc.viewCount} / {doc.downloadCount}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{doc.uploadedByName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={doc.status}
                        color={doc.status === "active" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => handleViewDocument(doc)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton size="small" onClick={() => handleDownloadDocument(doc)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditDocument(doc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={(e) => handleContextMenu(e, doc)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      
      {/* Statistics Tab */}
      <TabPanel value={tabValue} index={1}>
        {stats && (
          <Grid container spacing={3}>
            {/* Category Breakdown */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Documents by Category
                </Typography>
                <List>
                  {DOCUMENT_CATEGORIES.map((cat) => {
                    const count = stats.byCategory[cat.type] || 0;
                    const percentage = stats.totalDocuments > 0 
                      ? Math.round((count / stats.totalDocuments) * 100) 
                      : 0;
                    
                    return (
                      <ListItem key={cat.type}>
                        <ListItemIcon sx={{ color: cat.color }}>
                          <FolderIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={cat.label}
                          secondary={`${count} documents`}
                        />
                        <Box sx={{ width: 100, mr: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: cat.color + "20",
                              "& .MuiLinearProgress-bar": { bgcolor: cat.color },
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {percentage}%
                        </Typography>
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            </Grid>
            
            {/* Summary Stats */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Summary Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" color="primary">
                          {stats.totalDocuments}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Documents
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" color="success.main">
                          {formatFileSize(stats.totalSize)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Storage
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" color="info.main">
                          {stats.totalViews}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Views
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" color="warning.main">
                          {stats.totalDownloads}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Downloads
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Average per Document
                  </Typography>
                  <Typography variant="body2">
                    Views: {stats.totalDocuments > 0 ? (stats.totalViews / stats.totalDocuments).toFixed(1) : 0}
                  </Typography>
                  <Typography variant="body2">
                    Downloads: {stats.totalDocuments > 0 ? (stats.totalDownloads / stats.totalDocuments).toFixed(1) : 0}
                  </Typography>
                  <Typography variant="body2">
                    Size: {stats.totalDocuments > 0 ? formatFileSize(stats.totalSize / stats.totalDocuments) : "0 B"}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </TabPanel>
      
      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          {uploadFile && (
            <Box sx={{ mb: 3, p: 2, bgcolor: "action.hover", borderRadius: 1, display: "flex", alignItems: "center", gap: 2 }}>
              {getDocumentIcon(uploadFile.type.split("/")[0])}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{uploadFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(uploadFile.size)}
                </Typography>
              </Box>
              <IconButton size="small" onClick={resetUploadForm} disabled={uploading}>
                <CloseIcon />
              </IconButton>
            </Box>
          )}
          
          <TextField
            fullWidth
            label="Document Name"
            value={uploadForm.name}
            onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
            sx={{ mb: 2 }}
            disabled={uploading}
          />
          
          <TextField
            fullWidth
            label="Description"
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
            disabled={uploading}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={uploadForm.category}
              label="Category"
              onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })}
              disabled={uploading}
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <MenuItem key={cat.type} value={cat.type}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={uploadForm.visibility}
              label="Visibility"
              onChange={(e) => setUploadForm({ ...uploadForm, visibility: e.target.value as DocumentVisibility })}
              disabled={uploading}
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box>
                    <Typography variant="body2">{opt.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={uploadForm.tags || []}
            onChange={(_, newValue) => setUploadForm({ ...uploadForm, tags: newValue })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Add tags..." helperText="Press Enter to add tags" />
            )}
            disabled={uploading}
          />
          
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!uploadForm.name || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Document Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {selectedDocument?.name}
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ height: "70vh" }}>
              {selectedDocument.type === "pdf" ? (
                <iframe
                  src={selectedDocument.fileUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title={selectedDocument.name}
                />
              ) : selectedDocument.type === "image" ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <Box
                    component="img"
                    src={selectedDocument.fileUrl}
                    alt={selectedDocument.name}
                    sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1">
                    This file type cannot be previewed in the browser.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadDocument(selectedDocument)}
                    sx={{ mt: 2 }}
                  >
                    Download File
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: "flex", gap: 1, flex: 1, justifyContent: "space-between", px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {selectedDocument && formatFileSize(selectedDocument.fileSize)} • {selectedDocument?.viewCount} views • {selectedDocument?.downloadCount} downloads
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
            >
              Download
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Document Name"
            value={editForm.name || ""}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            fullWidth
            label="Description"
            value={editForm.description || ""}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={editForm.category || "other"}
              label="Category"
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value as DocumentCategory })}
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <MenuItem key={cat.type} value={cat.type}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={editForm.visibility || "company"}
              label="Visibility"
              onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value as DocumentVisibility })}
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={editForm.tags || []}
            onChange={(_, newValue) => setEditForm({ ...editForm, tags: newValue })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Add tags..." />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document Permanently</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to permanently delete "{selectedDocument?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteDocument}>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (contextMenu?.document) handleViewDocument(contextMenu.document);
            handleCloseContextMenu();
          }}
        >
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu?.document) handleDownloadDocument(contextMenu.document);
            handleCloseContextMenu();
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu?.document) handleEditDocument(contextMenu.document);
            handleCloseContextMenu();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <Divider />
        {contextMenu?.document.status === "active" ? (
          <MenuItem
            onClick={() => {
              if (contextMenu?.document) handleArchiveDocument(contextMenu.document);
              handleCloseContextMenu();
            }}
          >
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              if (contextMenu?.document) handleRestoreDocument(contextMenu.document);
              handleCloseContextMenu();
            }}
          >
            <ListItemIcon>
              <RestoreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Restore</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (contextMenu?.document) {
              setSelectedDocument(contextMenu.document);
              setDeleteDialogOpen(true);
            }
            handleCloseContextMenu();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Permanently</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
