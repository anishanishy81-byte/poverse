// Admin Target Assignment Types

import { TargetLocation, LeadStatus, VisitReason, OutcomeFlag } from "./target";

// Priority levels for targets
export type TargetPriority = "low" | "medium" | "high" | "urgent";

// Recurrence types for recurring visits
export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";

// Target categories/tags
export interface TargetCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  companyId: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

// Target tag
export interface TargetTag {
  id: string;
  name: string;
  color: string;
  companyId: string;
}

// Admin-created target (master target that can be assigned to agents)
export interface AdminTarget {
  id: string;
  companyId: string;

  // Basic info
  name: string;
  description?: string;
  
  // Category & Tags
  categoryId?: string;
  categoryName?: string;
  tags: TargetTag[];

  // Contact
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDesignation?: string;
  alternatePhone?: string;

  // Location
  location: TargetLocation;
  
  // Business info
  businessType?: string;
  annualRevenue?: string;
  employeeCount?: number;
  website?: string;

  // Priority & Deadline
  priority: TargetPriority;
  deadline?: string; // ISO date string
  deadlineNotes?: string;

  // Recurring visits
  recurrence: RecurrenceType;
  recurrenceDay?: number; // Day of week (0-6) or day of month (1-31)
  recurrenceTime?: string; // Preferred time for visit
  nextScheduledVisit?: string;
  lastScheduledVisit?: string;

  // Assignment
  assignedTo?: string; // userId
  assignedToName?: string;
  assignedAt?: string;
  assignmentNotes?: string;

  // Status
  leadStatus: LeadStatus;
  isActive: boolean;

  // Visit history summary
  totalVisits: number;
  lastVisitDate?: string;
  lastVisitOutcome?: string;
  lastOutcomeFlags?: OutcomeFlag[];

  // Custom fields
  customFields?: Record<string, string | number | boolean>;

  // Metadata
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  updatedAt: string;
  updatedBy?: string;
}

// Target assignment record
export interface TargetAssignment {
  id: string;
  targetId: string;
  targetName: string;
  companyId: string;
  
  // Assignment details
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;

  // Visit requirements
  visitReason: VisitReason;
  visitReasonNote?: string;
  priority: TargetPriority;
  deadline?: string;
  
  // Recurring
  isRecurring: boolean;
  recurrence?: RecurrenceType;
  recurrenceInstanceDate?: string;
  
  // Status
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;

  // Location copy
  location: TargetLocation;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Bulk import record
export interface BulkImportRecord {
  // Required fields
  name: string;
  address: string;
  
  // Optional fields
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  category?: string;
  tags?: string; // Comma-separated
  priority?: string;
  deadline?: string;
  recurrence?: string;
  assignTo?: string; // Username or email
  visitReason?: string;
  notes?: string;
  
  // Business info
  businessType?: string;
  latitude?: number;
  longitude?: number;
  
  // Import status
  rowNumber?: number;
  importStatus?: "pending" | "success" | "error";
  errorMessage?: string;
}

// Bulk import result
export interface BulkImportResult {
  id: string;
  companyId: string;
  fileName: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: {
    row: number;
    field: string;
    message: string;
  }[];
  importedTargets: string[]; // Array of target IDs
  importedAt: string;
  importedBy: string;
  importedByName: string;
  status: "processing" | "completed" | "failed";
}

// Create admin target input
export interface CreateAdminTargetInput {
  name: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDesignation?: string;
  alternatePhone?: string;
  location: TargetLocation;
  businessType?: string;
  annualRevenue?: string;
  employeeCount?: number;
  website?: string;
  priority: TargetPriority;
  deadline?: string;
  deadlineNotes?: string;
  recurrence: RecurrenceType;
  recurrenceDay?: number;
  recurrenceTime?: string;
  assignedTo?: string;
  assignmentNotes?: string;
  visitReason?: VisitReason;
  customFields?: Record<string, string | number | boolean>;
}

// Assign target input
export interface AssignTargetInput {
  targetId: string;
  assignedTo: string;
  visitReason: VisitReason;
  visitReasonNote?: string;
  priority?: TargetPriority;
  deadline?: string;
}

// Bulk assign input
export interface BulkAssignInput {
  targetIds: string[];
  assignedTo: string;
  visitReason: VisitReason;
  visitReasonNote?: string;
  priority?: TargetPriority;
  deadline?: string;
}

// Target filter options
export interface AdminTargetFilters {
  search?: string;
  categoryId?: string;
  tags?: string[];
  priority?: TargetPriority[];
  leadStatus?: LeadStatus[];
  assignedTo?: string;
  unassignedOnly?: boolean;
  hasDeadline?: boolean;
  overdueOnly?: boolean;
  recurrence?: RecurrenceType[];
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// Target stats for admin dashboard
export interface AdminTargetStats {
  totalTargets: number;
  activeTargets: number;
  assignedTargets: number;
  unassignedTargets: number;
  overdueTargets: number;
  completedToday: number;
  pendingToday: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    categoryId: string;
    categoryName: string;
    count: number;
  }[];
  byAgent: {
    userId: string;
    userName: string;
    assigned: number;
    completed: number;
    pending: number;
    overdue: number;
  }[];
}

// Priority info helper
export const PRIORITY_INFO: Record<TargetPriority, { label: string; color: string; icon: string }> = {
  low: { label: "Low", color: "#9e9e9e", icon: "arrow_downward" },
  medium: { label: "Medium", color: "#2196f3", icon: "remove" },
  high: { label: "High", color: "#ff9800", icon: "arrow_upward" },
  urgent: { label: "Urgent", color: "#f44336", icon: "priority_high" },
};

// Recurrence info helper
export const RECURRENCE_INFO: Record<RecurrenceType, { label: string; description: string }> = {
  none: { label: "One-time", description: "Single visit, no recurrence" },
  daily: { label: "Daily", description: "Visit every day" },
  weekly: { label: "Weekly", description: "Visit once a week" },
  biweekly: { label: "Bi-weekly", description: "Visit every two weeks" },
  monthly: { label: "Monthly", description: "Visit once a month" },
  quarterly: { label: "Quarterly", description: "Visit every 3 months" },
};

// Default categories
export const DEFAULT_CATEGORIES: Omit<TargetCategory, "id" | "companyId" | "createdAt" | "createdBy">[] = [
  { name: "Retail", color: "#4caf50", icon: "store", description: "Retail shops and stores", isActive: true },
  { name: "Wholesale", color: "#2196f3", icon: "warehouse", description: "Wholesale distributors", isActive: true },
  { name: "Restaurant", color: "#ff9800", icon: "restaurant", description: "Restaurants and food services", isActive: true },
  { name: "Healthcare", color: "#e91e63", icon: "local_hospital", description: "Healthcare facilities", isActive: true },
  { name: "Education", color: "#9c27b0", icon: "school", description: "Schools and educational institutions", isActive: true },
  { name: "Corporate", color: "#607d8b", icon: "business", description: "Corporate offices", isActive: true },
  { name: "Government", color: "#795548", icon: "account_balance", description: "Government offices", isActive: true },
  { name: "Other", color: "#9e9e9e", icon: "category", description: "Other categories", isActive: true },
];

// CSV template headers
export const CSV_IMPORT_HEADERS = [
  "name",
  "address",
  "contactPerson",
  "contactPhone",
  "contactEmail",
  "category",
  "tags",
  "priority",
  "deadline",
  "recurrence",
  "assignTo",
  "visitReason",
  "notes",
  "businessType",
  "latitude",
  "longitude",
];

// CSV template example row
export const CSV_TEMPLATE_EXAMPLE = {
  name: "ABC Retail Store",
  address: "123 Main Street, City, State 12345",
  contactPerson: "John Doe",
  contactPhone: "+1234567890",
  contactEmail: "john@example.com",
  category: "Retail",
  tags: "premium,key-account",
  priority: "high",
  deadline: "2026-02-15",
  recurrence: "weekly",
  assignTo: "agent@company.com",
  visitReason: "sales_pitch",
  notes: "Key account - handle with care",
  businessType: "Retail Store",
  latitude: "",
  longitude: "",
};
