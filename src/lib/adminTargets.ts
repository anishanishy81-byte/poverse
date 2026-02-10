// Admin Target Management Library
import { db, realtimeDb } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { ref, set, get, update, push, onValue, off } from "firebase/database";
import {
  AdminTarget,
  TargetCategory,
  TargetTag,
  TargetAssignment,
  BulkImportRecord,
  BulkImportResult,
  CreateAdminTargetInput,
  AssignTargetInput,
  BulkAssignInput,
  AdminTargetFilters,
  AdminTargetStats,
  TargetPriority,
  RecurrenceType,
  PRIORITY_INFO,
  RECURRENCE_INFO,
  DEFAULT_CATEGORIES,
  CSV_IMPORT_HEADERS,
} from "@/types/adminTarget";
import { TargetLocation, VisitReason, LeadStatus } from "@/types/target";
import { User } from "@/types/auth";
import { notifyTargetAssigned } from "./notifications";

// Firebase paths
const ADMIN_TARGETS_PATH = "adminTargets";
const CATEGORIES_PATH = "targetCategories";
const ASSIGNMENTS_PATH = "targetAssignments";
const IMPORTS_PATH = "targetImports";

// Helper to remove undefined values (Firebase RTDB doesn't accept undefined)
const removeUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const result = {} as T;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result[key] = removeUndefined(obj[key] as Record<string, unknown>) as T[typeof key];
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
};

// ==================== CATEGORIES ====================

export const createDefaultCategories = async (
  companyId: string,
  createdBy: string
): Promise<void> => {
  const categoriesRef = ref(realtimeDb, `${CATEGORIES_PATH}/${companyId}`);
  const snapshot = await get(categoriesRef);
  
  if (snapshot.exists()) return; // Already has categories
  
  const categories: Record<string, TargetCategory> = {};
  const now = new Date().toISOString();
  
  DEFAULT_CATEGORIES.forEach((cat, index) => {
    const id = `cat_${Date.now()}_${index}`;
    categories[id] = {
      ...cat,
      id,
      companyId,
      createdAt: now,
      createdBy,
    };
  });
  
  await set(categoriesRef, categories);
};

export const getCategories = async (companyId: string): Promise<TargetCategory[]> => {
  const categoriesRef = ref(realtimeDb, `${CATEGORIES_PATH}/${companyId}`);
  const snapshot = await get(categoriesRef);
  
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val() as Record<string, TargetCategory>;
  return Object.values(data).filter((cat) => cat.isActive);
};

export const subscribeToCategories = (
  companyId: string,
  callback: (categories: TargetCategory[]) => void
): (() => void) => {
  const categoriesRef = ref(realtimeDb, `${CATEGORIES_PATH}/${companyId}`);
  
  const unsubscribe = onValue(categoriesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const categories = Object.values(data).filter((cat: any) => cat.isActive) as TargetCategory[];
    callback(categories.sort((a, b) => a.name.localeCompare(b.name)));
  });
  
  return () => off(categoriesRef);
};

export const createCategory = async (
  companyId: string,
  name: string,
  color: string,
  icon: string,
  description: string,
  createdBy: string
): Promise<TargetCategory> => {
  const id = `cat_${Date.now()}`;
  const category: TargetCategory = {
    id,
    name,
    color,
    icon,
    description,
    companyId,
    createdAt: new Date().toISOString(),
    createdBy,
    isActive: true,
  };
  
  const categoryRef = ref(realtimeDb, `${CATEGORIES_PATH}/${companyId}/${id}`);
  await set(categoryRef, category);
  
  return category;
};

export const updateCategory = async (
  companyId: string,
  categoryId: string,
  updates: Partial<TargetCategory>
): Promise<void> => {
  const categoryRef = ref(realtimeDb, `${CATEGORIES_PATH}/${companyId}/${categoryId}`);
  await update(categoryRef, updates);
};

export const deleteCategory = async (companyId: string, categoryId: string): Promise<void> => {
  // Soft delete
  await updateCategory(companyId, categoryId, { isActive: false });
};

// ==================== ADMIN TARGETS ====================

export const createAdminTarget = async (
  companyId: string,
  input: CreateAdminTargetInput,
  createdBy: string,
  createdByName: string
): Promise<AdminTarget> => {
  const id = `target_${Date.now()}`;
  const now = new Date().toISOString();
  
  // Get category name if categoryId provided
  let categoryName: string | undefined;
  if (input.categoryId) {
    const categories = await getCategories(companyId);
    const category = categories.find((c) => c.id === input.categoryId);
    categoryName = category?.name;
  }
  
  // Get assigned user name if assignedTo provided
  let assignedToName: string | undefined;
  if (input.assignedTo) {
    const userRef = doc(db, "users", input.assignedTo);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      assignedToName = userSnap.data().name;
    }
  }
  
  // Convert tag IDs to tag objects
  const tags: TargetTag[] = (input.tags || []).map((tagName) => ({
    id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: tagName,
    color: getRandomColor(),
    companyId,
  }));
  
  const target: AdminTarget = {
    id,
    companyId,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    categoryName,
    tags,
    contactPerson: input.contactPerson,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    contactDesignation: input.contactDesignation,
    alternatePhone: input.alternatePhone,
    location: input.location,
    businessType: input.businessType,
    annualRevenue: input.annualRevenue,
    employeeCount: input.employeeCount,
    website: input.website,
    priority: input.priority,
    deadline: input.deadline,
    deadlineNotes: input.deadlineNotes,
    recurrence: input.recurrence,
    recurrenceDay: input.recurrenceDay,
    recurrenceTime: input.recurrenceTime,
    nextScheduledVisit: calculateNextScheduledVisit(input.recurrence, input.recurrenceDay),
    assignedTo: input.assignedTo,
    assignedToName,
    assignedAt: input.assignedTo ? now : undefined,
    assignmentNotes: input.assignmentNotes,
    leadStatus: "new",
    isActive: true,
    totalVisits: 0,
    customFields: input.customFields,
    createdAt: now,
    createdBy,
    createdByName,
    updatedAt: now,
  };
  
  const targetRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}/${id}`);
  await set(targetRef, removeUndefined(target as unknown as Record<string, unknown>));
  
  // If assigned, create assignment record and visit for the agent
  if (input.assignedTo && input.visitReason) {
    await createTargetAssignment(
      companyId,
      target,
      input.assignedTo,
      assignedToName || "",
      createdBy,
      createdByName,
      input.visitReason,
      input.assignmentNotes,
      input.priority,
      input.deadline
    );
  }
  
  return target;
};

export const getAdminTargets = async (
  companyId: string,
  filters?: AdminTargetFilters
): Promise<AdminTarget[]> => {
  const targetsRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}`);
  const snapshot = await get(targetsRef);
  
  if (!snapshot.exists()) return [];
  
  let targets: AdminTarget[] = Object.values(snapshot.val());
  
  // Apply filters
  if (filters) {
    targets = applyTargetFilters(targets, filters);
  }
  
  // Sort by priority, then by deadline
  targets.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return targets;
};

export const subscribeToAdminTargets = (
  companyId: string,
  callback: (targets: AdminTarget[]) => void,
  filters?: AdminTargetFilters
): (() => void) => {
  const targetsRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}`);
  
  const unsubscribe = onValue(targetsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    let targets: AdminTarget[] = Object.values(snapshot.val());
    
    if (filters) {
      targets = applyTargetFilters(targets, filters);
    }
    
    // Sort by priority, then by deadline
    targets.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    callback(targets);
  });
  
  return () => off(targetsRef);
};

export const getAdminTarget = async (
  companyId: string,
  targetId: string
): Promise<AdminTarget | null> => {
  const targetRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}/${targetId}`);
  const snapshot = await get(targetRef);
  
  if (!snapshot.exists()) return null;
  return snapshot.val() as AdminTarget;
};

export const updateAdminTarget = async (
  companyId: string,
  targetId: string,
  updates: Partial<AdminTarget> | Partial<CreateAdminTargetInput>,
  updatedBy: string
): Promise<void> => {
  const targetRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}/${targetId}`);
  
  // Convert tags from string[] to TargetTag[] if needed
  const processedUpdates: Record<string, unknown> = { ...updates };
  if (Array.isArray(updates.tags) && updates.tags.length > 0 && typeof updates.tags[0] === 'string') {
    processedUpdates.tags = (updates.tags as string[]).map((tagName, index) => ({
      id: `tag_${Date.now()}_${index}`,
      name: tagName,
      color: '#9e9e9e',
      companyId,
    }));
  }
  
  await update(targetRef, {
    ...processedUpdates,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
};

export const deleteAdminTarget = async (
  companyId: string,
  targetId: string
): Promise<void> => {
  // Soft delete
  const targetRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}/${targetId}`);
  await update(targetRef, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  });
};

// ==================== TARGET ASSIGNMENT ====================

export const createTargetAssignment = async (
  companyId: string,
  target: AdminTarget,
  assignedTo: string,
  assignedToName: string,
  assignedBy: string,
  assignedByName: string,
  visitReason: VisitReason,
  visitReasonNote?: string,
  priority?: TargetPriority,
  deadline?: string
): Promise<TargetAssignment> => {
  const id = `assign_${Date.now()}`;
  const now = new Date().toISOString();
  
  const assignment: TargetAssignment = {
    id,
    targetId: target.id,
    targetName: target.name,
    companyId,
    assignedTo,
    assignedToName,
    assignedBy,
    assignedByName,
    assignedAt: now,
    visitReason,
    visitReasonNote,
    priority: priority || target.priority,
    deadline: deadline || target.deadline,
    isRecurring: target.recurrence !== "none",
    recurrence: target.recurrence,
    status: "pending",
    location: target.location,
    createdAt: now,
    updatedAt: now,
  };
  
  // Save assignment
  const assignmentRef = ref(realtimeDb, `${ASSIGNMENTS_PATH}/${companyId}/${assignedTo}/${id}`);
  await set(assignmentRef, removeUndefined(assignment as unknown as Record<string, unknown>));
  
  // Update target with assignment info
  const targetRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}/${target.id}`);
  await update(targetRef, {
    assignedTo,
    assignedToName,
    assignedAt: now,
    updatedAt: now,
  });
  
  // Create visit in agent's active visits (targetVisits)
  await createVisitFromAssignment(companyId, target, assignment, assignedTo, assignedToName);
  
  // Send notification to assigned agent
  try {
    await notifyTargetAssigned(
      companyId,
      assignedTo,
      assignedToName,
      target.name,
      target.id,
      assignedBy,
      assignedByName,
      deadline
    );
  } catch (error) {
    console.error("Failed to send target assignment notification:", error);
  }
  
  return assignment;
};

export const assignTarget = async (
  companyId: string,
  input: AssignTargetInput,
  assignedBy: string,
  assignedByName: string
): Promise<TargetAssignment | null> => {
  const target = await getAdminTarget(companyId, input.targetId);
  if (!target) return null;
  
  // Get assignee name
  const userRef = doc(db, "users", input.assignedTo);
  const userSnap = await getDoc(userRef);
  const assignedToName = userSnap.exists() ? userSnap.data().name : "Unknown";
  
  return createTargetAssignment(
    companyId,
    target,
    input.assignedTo,
    assignedToName,
    assignedBy,
    assignedByName,
    input.visitReason,
    input.visitReasonNote,
    input.priority,
    input.deadline
  );
};

export const bulkAssignTargets = async (
  companyId: string,
  input: BulkAssignInput,
  assignedBy: string,
  assignedByName: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const result = { success: 0, failed: 0, errors: [] as string[] };
  
  // Get assignee name
  const userRef = doc(db, "users", input.assignedTo);
  const userSnap = await getDoc(userRef);
  const assignedToName = userSnap.exists() ? userSnap.data().name : "Unknown";
  
  for (const targetId of input.targetIds) {
    try {
      const target = await getAdminTarget(companyId, targetId);
      if (!target) {
        result.failed++;
        result.errors.push(`Target ${targetId} not found`);
        continue;
      }
      
      await createTargetAssignment(
        companyId,
        target,
        input.assignedTo,
        assignedToName,
        assignedBy,
        assignedByName,
        input.visitReason,
        input.visitReasonNote,
        input.priority,
        input.deadline
      );
      
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to assign target ${targetId}: ${error}`);
    }
  }
  
  return result;
};

export const unassignTarget = async (
  companyId: string,
  targetId: string,
  userId: string
): Promise<void> => {
  // Remove from assignments
  const assignmentsRef = ref(realtimeDb, `${ASSIGNMENTS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(assignmentsRef);
  
  if (snapshot.exists()) {
    const assignments = snapshot.val();
    for (const [assignId, assignment] of Object.entries(assignments)) {
      if ((assignment as TargetAssignment).targetId === targetId) {
        const assignRef = ref(realtimeDb, `${ASSIGNMENTS_PATH}/${companyId}/${userId}/${assignId}`);
        await update(assignRef, { status: "cancelled", cancelledAt: new Date().toISOString() });
      }
    }
  }
  
  // Update target
  const targetRef = ref(realtimeDb, `${ADMIN_TARGETS_PATH}/${companyId}/${targetId}`);
  await update(targetRef, {
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    updatedAt: new Date().toISOString(),
  });
};

export const getAgentAssignments = async (
  companyId: string,
  userId: string
): Promise<TargetAssignment[]> => {
  const assignmentsRef = ref(realtimeDb, `${ASSIGNMENTS_PATH}/${companyId}/${userId}`);
  const snapshot = await get(assignmentsRef);
  
  if (!snapshot.exists()) return [];
  
  const assignments: TargetAssignment[] = Object.values(snapshot.val());
  return assignments.filter((a) => a.status === "pending" || a.status === "in_progress");
};

export const subscribeToAgentAssignments = (
  companyId: string,
  userId: string,
  callback: (assignments: TargetAssignment[]) => void
): (() => void) => {
  const assignmentsRef = ref(realtimeDb, `${ASSIGNMENTS_PATH}/${companyId}/${userId}`);
  
  const unsubscribe = onValue(assignmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const assignments: TargetAssignment[] = Object.values(snapshot.val());
    const activeAssignments = assignments.filter(
      (a) => a.status === "pending" || a.status === "in_progress"
    );
    
    callback(activeAssignments);
  });
  
  return () => off(assignmentsRef);
};

// ==================== BULK IMPORT ====================

export const parseCSV = (csvContent: string): BulkImportRecord[] => {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const records: BulkImportRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: BulkImportRecord = {
      name: "",
      address: "",
      rowNumber: i + 1,
      importStatus: "pending",
    };
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";
      switch (header) {
        case "name":
          record.name = value;
          break;
        case "address":
          record.address = value;
          break;
        case "contactperson":
        case "contact_person":
          record.contactPerson = value;
          break;
        case "contactphone":
        case "contact_phone":
        case "phone":
          record.contactPhone = value;
          break;
        case "contactemail":
        case "contact_email":
        case "email":
          record.contactEmail = value;
          break;
        case "category":
          record.category = value;
          break;
        case "tags":
          record.tags = value;
          break;
        case "priority":
          record.priority = value.toLowerCase();
          break;
        case "deadline":
          record.deadline = value;
          break;
        case "recurrence":
          record.recurrence = value.toLowerCase();
          break;
        case "assignto":
        case "assign_to":
        case "assigned_to":
          record.assignTo = value;
          break;
        case "visitreason":
        case "visit_reason":
          record.visitReason = value;
          break;
        case "notes":
          record.notes = value;
          break;
        case "businesstype":
        case "business_type":
          record.businessType = value;
          break;
        case "latitude":
        case "lat":
          record.latitude = parseFloat(value) || undefined;
          break;
        case "longitude":
        case "lng":
        case "lon":
          record.longitude = parseFloat(value) || undefined;
          break;
      }
    });
    
    records.push(record);
  }
  
  return records;
};

// Parse CSV line handling quoted values
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
};

export const validateImportRecord = (
  record: BulkImportRecord,
  categories: TargetCategory[],
  users: User[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required fields
  if (!record.name || record.name.trim() === "") {
    errors.push("Name is required");
  }
  
  if (!record.address || record.address.trim() === "") {
    errors.push("Address is required");
  }
  
  // Validate priority
  if (record.priority && !["low", "medium", "high", "urgent"].includes(record.priority)) {
    errors.push(`Invalid priority: ${record.priority}`);
  }
  
  // Validate recurrence
  if (record.recurrence && !["none", "daily", "weekly", "biweekly", "monthly", "quarterly"].includes(record.recurrence)) {
    errors.push(`Invalid recurrence: ${record.recurrence}`);
  }
  
  // Validate deadline format
  if (record.deadline) {
    const date = new Date(record.deadline);
    if (isNaN(date.getTime())) {
      errors.push(`Invalid deadline format: ${record.deadline}`);
    }
  }
  
  // Validate category
  if (record.category) {
    const categoryExists = categories.some(
      (c) => c.name.toLowerCase() === record.category?.toLowerCase()
    );
    if (!categoryExists) {
      errors.push(`Unknown category: ${record.category}`);
    }
  }
  
  // Validate assignTo
  if (record.assignTo) {
    const userExists = users.some(
      (u) =>
        u.email?.toLowerCase() === record.assignTo?.toLowerCase() ||
        u.username?.toLowerCase() === record.assignTo?.toLowerCase()
    );
    if (!userExists) {
      errors.push(`Unknown user: ${record.assignTo}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
};

export const importTargets = async (
  companyId: string,
  records: BulkImportRecord[],
  importedBy: string,
  importedByName: string,
  categories: TargetCategory[],
  users: User[],
  geocodeAddress: (address: string) => Promise<{ lat: number; lng: number } | null>
): Promise<BulkImportResult> => {
  const importId = `import_${Date.now()}`;
  const now = new Date().toISOString();
  
  const result: BulkImportResult = {
    id: importId,
    companyId,
    fileName: "",
    totalRecords: records.length,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    errors: [],
    importedTargets: [],
    importedAt: now,
    importedBy,
    importedByName,
    status: "processing",
  };
  
  for (const record of records) {
    // Validate
    const validation = validateImportRecord(record, categories, users);
    if (!validation.valid) {
      result.errorCount++;
      validation.errors.forEach((err) => {
        result.errors.push({
          row: record.rowNumber || 0,
          field: "",
          message: err,
        });
      });
      continue;
    }
    
    try {
      // Geocode address if lat/lng not provided
      let location: TargetLocation;
      if (record.latitude && record.longitude) {
        location = {
          latitude: record.latitude,
          longitude: record.longitude,
          address: record.address,
        };
      } else {
        const coords = await geocodeAddress(record.address);
        if (coords) {
          location = {
            latitude: coords.lat,
            longitude: coords.lng,
            address: record.address,
          };
        } else {
          // Use dummy coordinates if geocoding fails
          location = {
            latitude: 0,
            longitude: 0,
            address: record.address,
          };
        }
      }
      
      // Find category
      const category = record.category
        ? categories.find((c) => c.name.toLowerCase() === record.category?.toLowerCase())
        : undefined;
      
      // Find user to assign
      let assignedTo: string | undefined;
      if (record.assignTo) {
        const user = users.find(
          (u) =>
            u.email?.toLowerCase() === record.assignTo?.toLowerCase() ||
            u.username?.toLowerCase() === record.assignTo?.toLowerCase()
        );
        assignedTo = user?.id;
      }
      
      // Parse tags
      const tags = record.tags
        ? record.tags.split(",").map((t) => t.trim()).filter((t) => t)
        : [];
      
      // Create target
      const target = await createAdminTarget(
        companyId,
        {
          name: record.name,
          description: record.notes,
          categoryId: category?.id,
          tags,
          contactPerson: record.contactPerson,
          contactPhone: record.contactPhone,
          contactEmail: record.contactEmail,
          location,
          businessType: record.businessType,
          priority: (record.priority as TargetPriority) || "medium",
          deadline: record.deadline,
          recurrence: (record.recurrence as RecurrenceType) || "none",
          assignedTo,
          visitReason: (record.visitReason as VisitReason) || "sales_pitch",
        },
        importedBy,
        importedByName
      );
      
      result.successCount++;
      result.importedTargets.push(target.id);
    } catch (error) {
      result.errorCount++;
      result.errors.push({
        row: record.rowNumber || 0,
        field: "",
        message: String(error),
      });
    }
  }
  
  result.status = "completed";
  
  // Save import result
  const importRef = ref(realtimeDb, `${IMPORTS_PATH}/${companyId}/${importId}`);
  await set(importRef, removeUndefined(result as unknown as Record<string, unknown>));
  
  return result;
};

export const generateCSVTemplate = (): string => {
  const headers = CSV_IMPORT_HEADERS.join(",");
  const example = CSV_IMPORT_HEADERS.map((h) => {
    const val = (CSV_IMPORT_HEADERS as any)[h] || "";
    return val.includes(",") ? `"${val}"` : val;
  }).join(",");
  
  return `${headers}\n${example}`;
};

// ==================== RECURRING TARGETS ====================

export const calculateNextScheduledVisit = (
  recurrence: RecurrenceType,
  recurrenceDay?: number
): string | undefined => {
  if (recurrence === "none") return undefined;
  
  const now = new Date();
  let next = new Date();
  
  switch (recurrence) {
    case "daily":
      next.setDate(now.getDate() + 1);
      break;
    case "weekly":
      const dayOfWeek = recurrenceDay ?? 1; // Default Monday
      const daysUntilNext = (dayOfWeek + 7 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilNext);
      break;
    case "biweekly":
      const biweeklyDay = recurrenceDay ?? 1;
      const daysUntilBiweekly = (biweeklyDay + 7 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilBiweekly + 7);
      break;
    case "monthly":
      const dayOfMonth = recurrenceDay ?? 1;
      next.setMonth(now.getMonth() + 1);
      next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
      break;
    case "quarterly":
      next.setMonth(now.getMonth() + 3);
      next.setDate(recurrenceDay ?? 1);
      break;
  }
  
  return next.toISOString();
};

export const processRecurringTargets = async (companyId: string): Promise<void> => {
  const targets = await getAdminTargets(companyId, { recurrence: ["daily", "weekly", "biweekly", "monthly", "quarterly"] });
  const now = new Date();
  
  for (const target of targets) {
    if (!target.nextScheduledVisit || !target.assignedTo) continue;
    
    const nextVisit = new Date(target.nextScheduledVisit);
    if (nextVisit <= now) {
      // Create new assignment for this scheduled visit
      const userRef = doc(db, "users", target.assignedTo);
      const userSnap = await getDoc(userRef);
      const assignedToName = userSnap.exists() ? userSnap.data().name : "Unknown";
      
      await createTargetAssignment(
        companyId,
        target,
        target.assignedTo,
        assignedToName,
        "system",
        "System (Recurring)",
        "follow_up_visit",
        "Recurring scheduled visit",
        target.priority,
        undefined
      );
      
      // Update next scheduled visit
      const newNext = calculateNextScheduledVisit(target.recurrence, target.recurrenceDay);
      await updateAdminTarget(companyId, target.id, {
        lastScheduledVisit: target.nextScheduledVisit,
        nextScheduledVisit: newNext,
      }, "system");
    }
  }
};

// ==================== STATS ====================

export const getAdminTargetStats = async (companyId: string): Promise<AdminTargetStats> => {
  const targets = await getAdminTargets(companyId);
  const categories = await getCategories(companyId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  // Get all assignments for agent stats
  const assignmentsRef = ref(realtimeDb, `${ASSIGNMENTS_PATH}/${companyId}`);
  const assignmentsSnap = await get(assignmentsRef);
  const allAssignments: Record<string, TargetAssignment[]> = {};
  
  if (assignmentsSnap.exists()) {
    Object.entries(assignmentsSnap.val()).forEach(([userId, assigns]) => {
      allAssignments[userId] = Object.values(assigns as Record<string, TargetAssignment>);
    });
  }
  
  const stats: AdminTargetStats = {
    totalTargets: targets.length,
    activeTargets: targets.filter((t) => t.isActive).length,
    assignedTargets: targets.filter((t) => t.assignedTo).length,
    unassignedTargets: targets.filter((t) => !t.assignedTo && t.isActive).length,
    overdueTargets: targets.filter((t) => t.deadline && new Date(t.deadline) < now).length,
    completedToday: 0,
    pendingToday: 0,
    byPriority: {
      low: targets.filter((t) => t.priority === "low").length,
      medium: targets.filter((t) => t.priority === "medium").length,
      high: targets.filter((t) => t.priority === "high").length,
      urgent: targets.filter((t) => t.priority === "urgent").length,
    },
    byCategory: categories.map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      count: targets.filter((t) => t.categoryId === cat.id).length,
    })),
    byAgent: [],
  };
  
  // Calculate agent stats
  const agentMap = new Map<string, AdminTargetStats["byAgent"][0]>();
  
  for (const [userId, assignments] of Object.entries(allAssignments)) {
    const assigned = assignments.length;
    const completed = assignments.filter((a) => a.status === "completed").length;
    const pending = assignments.filter((a) => a.status === "pending" || a.status === "in_progress").length;
    const overdue = assignments.filter(
      (a) => a.deadline && new Date(a.deadline) < now && a.status !== "completed"
    ).length;
    
    // Count today's completions
    const completedToday = assignments.filter(
      (a) => a.completedAt && a.completedAt >= todayStart
    ).length;
    stats.completedToday += completedToday;
    
    // Get user name from first assignment
    const userName = assignments[0]?.assignedToName || "Unknown";
    
    agentMap.set(userId, {
      userId,
      userName,
      assigned,
      completed,
      pending,
      overdue,
    });
  }
  
  stats.byAgent = Array.from(agentMap.values()).sort((a, b) => b.assigned - a.assigned);
  
  // Count pending today
  Object.values(allAssignments).forEach((assignments) => {
    stats.pendingToday += assignments.filter(
      (a) => (a.status === "pending" || a.status === "in_progress") && 
             (!a.deadline || a.deadline >= todayStart)
    ).length;
  });
  
  return stats;
};

// ==================== HELPER FUNCTIONS ====================

const applyTargetFilters = (targets: AdminTarget[], filters: AdminTargetFilters): AdminTarget[] => {
  return targets.filter((target) => {
    // Active filter
    if (filters.isActive !== undefined && target.isActive !== filters.isActive) {
      return false;
    }
    
    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch =
        target.name.toLowerCase().includes(search) ||
        target.contactPerson?.toLowerCase().includes(search) ||
        target.contactEmail?.toLowerCase().includes(search) ||
        target.contactPhone?.includes(search) ||
        target.location.address.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    
    // Category
    if (filters.categoryId && target.categoryId !== filters.categoryId) {
      return false;
    }
    
    // Tags
    if (filters.tags && filters.tags.length > 0) {
      const targetTagNames = target.tags.map((t) => t.name.toLowerCase());
      const hasMatchingTag = filters.tags.some((tag) =>
        targetTagNames.includes(tag.toLowerCase())
      );
      if (!hasMatchingTag) return false;
    }
    
    // Priority
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(target.priority)) return false;
    }
    
    // Lead status
    if (filters.leadStatus && filters.leadStatus.length > 0) {
      if (!filters.leadStatus.includes(target.leadStatus)) return false;
    }
    
    // Assigned to
    if (filters.assignedTo && target.assignedTo !== filters.assignedTo) {
      return false;
    }
    
    // Unassigned only
    if (filters.unassignedOnly && target.assignedTo) {
      return false;
    }
    
    // Has deadline
    if (filters.hasDeadline && !target.deadline) {
      return false;
    }
    
    // Overdue only
    if (filters.overdueOnly) {
      if (!target.deadline || new Date(target.deadline) >= new Date()) {
        return false;
      }
    }
    
    // Recurrence
    if (filters.recurrence && filters.recurrence.length > 0) {
      if (!filters.recurrence.includes(target.recurrence)) return false;
    }
    
    // Date range
    if (filters.dateFrom && new Date(target.createdAt) < new Date(filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && new Date(target.createdAt) > new Date(filters.dateTo)) {
      return false;
    }
    
    return true;
  });
};

const createVisitFromAssignment = async (
  companyId: string,
  target: AdminTarget,
  assignment: TargetAssignment,
  userId: string,
  userName: string
): Promise<void> => {
  const visitId = `visit_${Date.now()}`;
  const now = new Date().toISOString();
  
  const visit = {
    id: visitId,
    targetId: target.id,
    userId,
    userName,
    companyId,
    targetName: target.name,
    contactPerson: target.contactPerson,
    contactPhone: target.contactPhone,
    contactEmail: target.contactEmail,
    location: target.location,
    visitReason: assignment.visitReason,
    visitReasonNote: assignment.visitReasonNote,
    status: "pending",
    leadStatus: target.leadStatus,
    outcomeFlags: [],
    offersDiscussed: [],
    assignedAt: now,
    createdAt: now,
    createdBy: assignment.assignedBy,
    updatedAt: now,
    // Admin assignment reference
    assignmentId: assignment.id,
    priority: assignment.priority,
    deadline: assignment.deadline,
  };
  
  // Save to targetVisits (global visits collection)
  const visitRef = ref(realtimeDb, `targetVisits/${visitId}`);
  await set(visitRef, removeUndefined(visit as unknown as Record<string, unknown>));

  // Add to user's active visits for agent UI
  const activeVisitRef = ref(realtimeDb, `userActiveVisits/${userId}/${visitId}`);
  await set(activeVisitRef, { visitId, targetId: target.id, status: "pending" });
};

const getRandomColor = (): string => {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7",
    "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
    "#009688", "#4caf50", "#8bc34a", "#cddc39",
    "#ffc107", "#ff9800", "#ff5722", "#795548",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// Export helpers
export { PRIORITY_INFO, RECURRENCE_INFO };
