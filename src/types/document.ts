// Document Management Types

// Document categories
export type DocumentCategory =
  | "product_catalog"
  | "price_list"
  | "marketing_material"
  | "brochure"
  | "presentation"
  | "training_material"
  | "policy"
  | "form"
  | "contract"
  | "report"
  | "other";

// Document type (file type)
export type DocumentType = "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "other";

// Document visibility
export type DocumentVisibility = "public" | "company" | "admin_only" | "specific_users";

// Document status
export type DocumentStatus = "active" | "archived" | "draft";

// Document interface
export interface Document {
  id: string;
  companyId: string;
  
  // Basic info
  name: string;
  description?: string;
  category: DocumentCategory;
  type: DocumentType;
  
  // File info
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // MIME type
  fileUrl: string;
  filePath: string; // Storage path
  thumbnailUrl?: string;
  
  // Organization
  tags: string[];
  folderId?: string;
  
  // Visibility
  visibility: DocumentVisibility;
  allowedUserIds?: string[]; // For specific_users visibility
  
  // Version control
  version: number;
  previousVersionId?: string;
  
  // Status
  status: DocumentStatus;
  
  // Analytics
  viewCount: number;
  downloadCount: number;
  lastViewedAt?: string;
  lastDownloadedAt?: string;
  
  // Metadata
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

// Document folder
export interface DocumentFolder {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  documentCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Document upload input
export interface DocumentUploadInput {
  name: string;
  description?: string;
  category: DocumentCategory;
  tags?: string[];
  folderId?: string;
  visibility?: DocumentVisibility;
  allowedUserIds?: string[];
}

// Document share
export interface DocumentShare {
  id: string;
  documentId: string;
  documentName: string;
  sharedBy: string;
  sharedByName: string;
  sharedWith: string; // chatId or userId
  shareType: "chat" | "user" | "broadcast";
  message?: string;
  createdAt: string;
}

// Document view/download log
export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  action: "view" | "download" | "share";
  timestamp: string;
}

// Product catalog item (for structured catalogs)
export interface ProductCatalogItem {
  id: string;
  catalogId: string; // Document ID of the catalog
  companyId: string;
  
  // Product info
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  
  // Pricing
  price: number;
  currency: string;
  unit?: string;
  minOrderQty?: number;
  
  // Media
  imageUrl?: string;
  images?: string[];
  
  // Status
  isActive: boolean;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Price list item
export interface PriceListItem {
  id: string;
  priceListId: string; // Document ID of the price list
  companyId: string;
  
  // Product reference
  productName: string;
  productSku?: string;
  productCategory?: string;
  
  // Pricing tiers
  basePrice: number;
  currency: string;
  unit?: string;
  
  // Discount tiers
  discountTiers?: Array<{
    minQty: number;
    maxQty?: number;
    discountPercent?: number;
    discountedPrice?: number;
  }>;
  
  // Validity
  validFrom?: string;
  validTo?: string;
  
  // Metadata
  updatedAt: string;
}

// ==================== CONSTANTS ====================

// Document category info
export interface DocumentCategoryInfo {
  type: DocumentCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategoryInfo[] = [
  {
    type: "product_catalog",
    label: "Product Catalog",
    icon: "inventory",
    color: "#2196f3",
    description: "Product listings and catalogs",
  },
  {
    type: "price_list",
    label: "Price List",
    icon: "attach_money",
    color: "#4caf50",
    description: "Pricing information",
  },
  {
    type: "marketing_material",
    label: "Marketing Material",
    icon: "campaign",
    color: "#e91e63",
    description: "Marketing and promotional content",
  },
  {
    type: "brochure",
    label: "Brochure",
    icon: "menu_book",
    color: "#9c27b0",
    description: "Company and product brochures",
  },
  {
    type: "presentation",
    label: "Presentation",
    icon: "slideshow",
    color: "#ff9800",
    description: "Sales and training presentations",
  },
  {
    type: "training_material",
    label: "Training Material",
    icon: "school",
    color: "#00bcd4",
    description: "Training guides and materials",
  },
  {
    type: "policy",
    label: "Policy Document",
    icon: "policy",
    color: "#607d8b",
    description: "Company policies and guidelines",
  },
  {
    type: "form",
    label: "Form/Template",
    icon: "description",
    color: "#795548",
    description: "Forms and templates",
  },
  {
    type: "contract",
    label: "Contract",
    icon: "gavel",
    color: "#f44336",
    description: "Contracts and agreements",
  },
  {
    type: "report",
    label: "Report",
    icon: "assessment",
    color: "#3f51b5",
    description: "Reports and analytics",
  },
  {
    type: "other",
    label: "Other",
    icon: "folder",
    color: "#9e9e9e",
    description: "Other documents",
  },
];

// Document type info
export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  icon: string;
  extensions: string[];
  mimeTypes: string[];
}

export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  {
    type: "pdf",
    label: "PDF",
    icon: "picture_as_pdf",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
  },
  {
    type: "image",
    label: "Image",
    icon: "image",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  },
  {
    type: "document",
    label: "Document",
    icon: "article",
    extensions: [".doc", ".docx", ".txt", ".rtf"],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
    ],
  },
  {
    type: "spreadsheet",
    label: "Spreadsheet",
    icon: "table_chart",
    extensions: [".xls", ".xlsx", ".csv"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
  },
  {
    type: "presentation",
    label: "Presentation",
    icon: "slideshow",
    extensions: [".ppt", ".pptx"],
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  {
    type: "other",
    label: "Other",
    icon: "insert_drive_file",
    extensions: [],
    mimeTypes: [],
  },
];

// Visibility options
export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "All users can view" },
  { value: "company", label: "Company", description: "Only company members" },
  { value: "admin_only", label: "Admin Only", description: "Only admins can view" },
  { value: "specific_users", label: "Specific Users", description: "Selected users only" },
];

// ==================== HELPER FUNCTIONS ====================

// Get document category info
export const getDocumentCategoryInfo = (category: DocumentCategory): DocumentCategoryInfo => {
  return DOCUMENT_CATEGORIES.find((c) => c.type === category) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];
};

// Get document type from file
export const getDocumentType = (mimeType: string, fileName: string): DocumentType => {
  // Check by MIME type first
  for (const docType of DOCUMENT_TYPES) {
    if (docType.mimeTypes.includes(mimeType)) {
      return docType.type;
    }
  }
  
  // Check by extension
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  for (const docType of DOCUMENT_TYPES) {
    if (docType.extensions.includes(ext)) {
      return docType.type;
    }
  }
  
  return "other";
};

// Get document type info
export const getDocumentTypeInfo = (type: DocumentType): DocumentTypeInfo => {
  return DOCUMENT_TYPES.find((t) => t.type === type) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Get file icon based on type
export const getFileIcon = (type: DocumentType): string => {
  const typeInfo = getDocumentTypeInfo(type);
  return typeInfo.icon;
};

// Check if file is viewable in browser
export const isViewableInBrowser = (type: DocumentType): boolean => {
  return ["pdf", "image"].includes(type);
};

// Get visibility label
export const getVisibilityLabel = (visibility: DocumentVisibility): string => {
  const option = VISIBILITY_OPTIONS.find((o) => o.value === visibility);
  return option?.label || visibility;
};

// Generate document search keywords
export const generateSearchKeywords = (doc: Document): string[] => {
  const keywords: string[] = [];
  
  // Add name words
  keywords.push(...doc.name.toLowerCase().split(/\s+/));
  
  // Add description words
  if (doc.description) {
    keywords.push(...doc.description.toLowerCase().split(/\s+/));
  }
  
  // Add tags
  keywords.push(...doc.tags.map((t) => t.toLowerCase()));
  
  // Add category
  keywords.push(doc.category);
  
  // Add type
  keywords.push(doc.type);
  
  // Remove duplicates and short words
  return [...new Set(keywords)].filter((k) => k.length > 2);
};
