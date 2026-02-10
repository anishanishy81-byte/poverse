"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  CardActions,
  CardMedia,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Autocomplete,
  LinearProgress,
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
  Sort as SortIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Inventory as CatalogIcon,
  AttachMoney as PriceIcon,
  Campaign as MarketingIcon,
  School as TrainingIcon,
  Policy as PolicyIcon,
  Gavel as ContractIcon,
  Assessment as ReportIcon,
  MenuBook as BrochureIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { useAppStore, useHasHydrated } from "../../store/useAppStore";
import {
  Document,
  DocumentCategory,
  DocumentUploadInput,
  DOCUMENT_CATEGORIES,
  getDocumentCategoryInfo,
  getDocumentTypeInfo,
  formatFileSize,
  isViewableInBrowser,
} from "../../types/document";
import {
  uploadDocument,
  subscribeToCompanyDocuments,
  deleteDocument,
  updateDocument,
  recordDocumentView,
  recordDocumentDownload,
  searchDocuments,
  getDocumentStats,
} from "../../lib/document";

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

// Category icon mapping
const getCategoryIcon = (category: DocumentCategory) => {
  switch (category) {
    case "product_catalog":
      return <CatalogIcon />;
    case "price_list":
      return <PriceIcon />;
    case "marketing_material":
      return <MarketingIcon />;
    case "brochure":
      return <BrochureIcon />;
    case "presentation":
      return <PresentationIcon />;
    case "training_material":
      return <TrainingIcon />;
    case "policy":
      return <PolicyIcon />;
    case "contract":
      return <ContractIcon />;
    case "report":
      return <ReportIcon />;
    default:
      return <FolderIcon />;
  }
};

export default function DocumentsPage() {
  const { user, company, isAuthenticated } = useAppStore();
  const hasHydrated = useHasHydrated();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "views">("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState<DocumentUploadInput>({
    name: "",
    description: "",
    category: "other",
    tags: [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
  
  // Auth check
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Load documents
  useEffect(() => {
    if (!company?.id) return;
    
    setLoading(true);
    const unsubscribe = subscribeToCompanyDocuments(company.id, (docs) => {
      // Filter documents based on user access
      const accessibleDocs = docs.filter((doc) => {
        if (user?.role === "admin" || user?.role === "superadmin") return true;
        if (doc.visibility === "admin_only") return false;
        if (doc.visibility === "specific_users") {
          return doc.allowedUserIds?.includes(user?.id || "") || doc.uploadedBy === user?.id;
        }
        return true;
      });
      setDocuments(accessibleDocs);
      setLoading(false);
    });
    
    // Load stats
    loadStats();
    
    return () => unsubscribe();
  }, [company?.id, user?.id, user?.role]);
  
  const loadStats = async () => {
    if (!company?.id) return;
    const docStats = await getDocumentStats(company.id);
    setStats(docStats);
  };
  
  // Filter and sort documents
  const filteredDocuments = documents
    .filter((doc) => {
      if (selectedCategory !== "all" && doc.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.name.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.tags?.some((t) => t.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "views":
          return (b.viewCount + b.downloadCount) - (a.viewCount + a.downloadCount);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  
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
      // Simulate progress
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
      // Download for non-viewable types
      handleDownloadDocument(doc);
    }
  };
  
  // Handle download document
  const handleDownloadDocument = async (doc: Document) => {
    if (!company?.id || !user?.id || !user?.name) return;
    
    await recordDocumentDownload(company.id, doc.id, user.id, user.name);
    
    // Open in new tab for download
    window.open(doc.fileUrl, "_blank");
  };
  
  // Handle delete document
  const handleDeleteDocument = async () => {
    if (!selectedDocument || !company?.id) return;
    
    try {
      await deleteDocument(company.id, selectedDocument.id);
      setSuccess("Document deleted successfully!");
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
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
    <Box sx={{ p: 3, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton href="/dashboard">
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            Documents
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </Button>
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
      
      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
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
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as "date" | "name" | "views")}
              >
                <MenuItem value="date">Date (Newest)</MenuItem>
                <MenuItem value="name">Name (A-Z)</MenuItem>
                <MenuItem value="views">Most Popular</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <IconButton
                onClick={() => setViewMode("grid")}
                color={viewMode === "grid" ? "primary" : "default"}
              >
                <GridViewIcon />
              </IconButton>
              <IconButton
                onClick={() => setViewMode("list")}
                color={viewMode === "list" ? "primary" : "default"}
              >
                <ListViewIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Category Chips */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
        <Chip
          label="All"
          onClick={() => setSelectedCategory("all")}
          color={selectedCategory === "all" ? "primary" : "default"}
          variant={selectedCategory === "all" ? "filled" : "outlined"}
        />
        {DOCUMENT_CATEGORIES.slice(0, 6).map((cat) => (
          <Chip
            key={cat.type}
            label={cat.label}
            icon={getCategoryIcon(cat.type)}
            onClick={() => setSelectedCategory(cat.type)}
            color={selectedCategory === cat.type ? "primary" : "default"}
            variant={selectedCategory === cat.type ? "filled" : "outlined"}
          />
        ))}
      </Box>
      
      {/* Documents */}
      {filteredDocuments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <FileIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery ? "Try a different search term" : "Upload your first document to get started"}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Document
          </Button>
        </Paper>
      ) : viewMode === "grid" ? (
        <Grid container spacing={2}>
          {filteredDocuments.map((doc) => (
            <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  "&:hover": { boxShadow: 4 },
                }}
                onClick={() => handleViewDocument(doc)}
                onContextMenu={(e) => handleContextMenu(e, doc)}
              >
                <CardMedia
                  sx={{
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: getDocumentCategoryInfo(doc.category).color + "20",
                  }}
                >
                  {doc.type === "image" && doc.fileUrl ? (
                    <Box
                      component="img"
                      src={doc.fileUrl}
                      alt={doc.name}
                      sx={{ maxHeight: "100%", maxWidth: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Box sx={{ fontSize: 48, color: getDocumentCategoryInfo(doc.category).color }}>
                      {getDocumentIcon(doc.type)}
                    </Box>
                  )}
                </CardMedia>
                <CardContent sx={{ pb: 0 }}>
                  <Typography variant="subtitle2" noWrap fontWeight="bold">
                    {doc.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {getDocumentCategoryInfo(doc.category).label}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(doc.fileSize)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.viewCount} views
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between" }}>
                  <Chip
                    size="small"
                    label={doc.type.toUpperCase()}
                    sx={{ fontSize: "0.65rem" }}
                  />
                  <Box>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDocument(doc);
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, doc);
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper>
          <List>
            {filteredDocuments.map((doc, index) => (
              <React.Fragment key={doc.id}>
                {index > 0 && <Divider />}
                <ListItem
                  component="div"
                  sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                  onClick={() => handleViewDocument(doc)}
                  onContextMenu={(e) => handleContextMenu(e, doc)}
                >
                  <ListItemIcon sx={{ color: getDocumentCategoryInfo(doc.category).color }}>
                    {getDocumentIcon(doc.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={doc.name}
                    secondary={
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <span>{getDocumentCategoryInfo(doc.category).label}</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{doc.viewCount} views</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleDownloadDocument(doc)}>
                      <DownloadIcon />
                    </IconButton>
                    <IconButton onClick={(e) => handleContextMenu(e, doc)}>
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getCategoryIcon(cat.type)}
                    {cat.label}
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
            <Box>
              <Typography variant="caption" color="text.secondary">
                {selectedDocument && formatFileSize(selectedDocument.fileSize)} • {selectedDocument?.viewCount} views • {selectedDocument?.downloadCount} downloads
              </Typography>
            </Box>
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDocument?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteDocument}>
            Delete
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
        <Divider />
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
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
