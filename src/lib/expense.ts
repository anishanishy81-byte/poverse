// Expense Management Library
import { realtimeDb, storage } from "./firebase";
import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  limitToLast,
  startAt,
  endAt,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  Expense,
  ExpenseInput,
  ExpenseStatus,
  ExpenseCategory,
  ExpensePolicy,
  MonthlyExpenseSummary,
  DailyExpenseSummary,
  ExpenseReport,
  ReimbursementBatch,
  DEFAULT_EXPENSE_POLICY,
  calculateExpenseTotal,
  getExpenseCategoryInfo,
  shouldAutoApprove,
} from "@/types/expense";
import { createNotification } from "./notifications";

// Database paths
const EXPENSES_PATH = "expenses";
const EXPENSE_POLICIES_PATH = "expensePolicies";
const EXPENSE_REPORTS_PATH = "expenseReports";
const REIMBURSEMENT_BATCHES_PATH = "reimbursementBatches";

// ==================== EXPENSE POLICY ====================

// Get expense policy for a company
export const getExpensePolicy = async (companyId: string): Promise<ExpensePolicy> => {
  const policyRef = ref(realtimeDb, `${EXPENSE_POLICIES_PATH}/${companyId}`);
  const snapshot = await get(policyRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as ExpensePolicy;
  }
  
  // Return default policy if none exists
  return {
    ...DEFAULT_EXPENSE_POLICY,
    companyId,
  };
};

// Update expense policy
export const updateExpensePolicy = async (
  companyId: string,
  updates: Partial<ExpensePolicy>
): Promise<void> => {
  const policyRef = ref(realtimeDb, `${EXPENSE_POLICIES_PATH}/${companyId}`);
  const existing = await getExpensePolicy(companyId);
  
  await set(policyRef, {
    ...existing,
    ...updates,
    companyId,
    updatedAt: new Date().toISOString(),
  });
};

// ==================== RECEIPT UPLOAD ====================

// Upload receipt image
export const uploadReceipt = async (
  expenseId: string,
  userId: string,
  file: File
): Promise<{ url: string; path: string }> => {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `receipts/${userId}/${expenseId}_${timestamp}.${extension}`;
  
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  
  return { url, path };
};

// Delete receipt
export const deleteReceipt = async (path: string): Promise<void> => {
  try {
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Failed to delete receipt:", error);
  }
};

// ==================== EXPENSE CRUD ====================

// Create a new expense
export const createExpense = async (
  userId: string,
  userName: string,
  companyId: string,
  input: ExpenseInput,
  receiptFile?: File
): Promise<Expense> => {
  const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  // Get policy
  const policy = await getExpensePolicy(companyId);
  
  // Upload receipt if provided
  let receiptUrl: string | undefined;
  let receiptPath: string | undefined;
  
  if (receiptFile) {
    const uploaded = await uploadReceipt(expenseId, userId, receiptFile);
    receiptUrl = uploaded.url;
    receiptPath = uploaded.path;
  }
  
  // Determine initial status
  const hasReceipt = !!receiptFile;
  const autoApprove = shouldAutoApprove(input, policy, hasReceipt);
  
  const expense: Expense = {
    id: expenseId,
    userId,
    userName,
    companyId,
    category: input.category,
    amount: input.amount,
    currency: input.currency || policy.currency,
    description: input.description,
    date: input.date,
    hasReceipt,
    paymentMethod: input.paymentMethod,
    status: autoApprove ? "approved" : "pending",
    createdAt: now,
    updatedAt: now,
  };
  
  // Add optional fields only if they have values
  if (receiptUrl) expense.receiptUrl = receiptUrl;
  if (receiptPath) expense.receiptPath = receiptPath;
  if (input.location) expense.location = input.location;
  if (input.latitude !== undefined) expense.latitude = input.latitude;
  if (input.longitude !== undefined) expense.longitude = input.longitude;
  if (input.targetId) expense.targetId = input.targetId;
  if (input.targetName) expense.targetName = input.targetName;
  if (input.visitId) expense.visitId = input.visitId;
  if (input.vendorName) expense.vendorName = input.vendorName;
  if (input.invoiceNumber) expense.invoiceNumber = input.invoiceNumber;
  
  // Save to database
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  await set(expenseRef, expense);
  
  return expense;
};

// Get expense by ID
export const getExpense = async (
  companyId: string,
  expenseId: string
): Promise<Expense | null> => {
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  const snapshot = await get(expenseRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as Expense;
  }
  return null;
};

// Update expense
export const updateExpense = async (
  companyId: string,
  expenseId: string,
  updates: Partial<ExpenseInput>,
  newReceiptFile?: File
): Promise<void> => {
  const expense = await getExpense(companyId, expenseId);
  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "pending") throw new Error("Can only edit pending expenses");
  
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  const updateData: Partial<Expense> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  // Handle receipt update
  if (newReceiptFile) {
    // Delete old receipt if exists
    if (expense.receiptPath) {
      await deleteReceipt(expense.receiptPath);
    }
    
    // Upload new receipt
    const uploaded = await uploadReceipt(expenseId, expense.userId, newReceiptFile);
    updateData.receiptUrl = uploaded.url;
    updateData.receiptPath = uploaded.path;
    updateData.hasReceipt = true;
  }
  
  await update(expenseRef, updateData);
};

// Delete expense
export const deleteExpense = async (
  companyId: string,
  expenseId: string
): Promise<void> => {
  const expense = await getExpense(companyId, expenseId);
  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "pending") throw new Error("Can only delete pending expenses");
  
  // Delete receipt if exists
  if (expense.receiptPath) {
    await deleteReceipt(expense.receiptPath);
  }
  
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  await set(expenseRef, null);
};

// ==================== EXPENSE QUERIES ====================

// Get user expenses for a date range
export const getUserExpenses = async (
  userId: string,
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<Expense[]> => {
  const expensesRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}`);
  const snapshot = await get(expensesRef);
  
  if (!snapshot.exists()) return [];
  
  const expenses: Expense[] = [];
  snapshot.forEach((child) => {
    const expense = child.val() as Expense;
    if (expense.userId === userId) {
      if (startDate && expense.date < startDate) return;
      if (endDate && expense.date > endDate) return;
      expenses.push(expense);
    }
  });
  
  return expenses.sort((a, b) => b.date.localeCompare(a.date));
};

// Get all company expenses for a date range
export const getCompanyExpenses = async (
  companyId: string,
  startDate?: string,
  endDate?: string,
  status?: ExpenseStatus
): Promise<Expense[]> => {
  const expensesRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}`);
  const snapshot = await get(expensesRef);
  
  if (!snapshot.exists()) return [];
  
  const expenses: Expense[] = [];
  snapshot.forEach((child) => {
    const expense = child.val() as Expense;
    if (startDate && expense.date < startDate) return;
    if (endDate && expense.date > endDate) return;
    if (status && expense.status !== status) return;
    expenses.push(expense);
  });
  
  return expenses.sort((a, b) => b.date.localeCompare(a.date));
};

// Get pending expenses for approval
export const getPendingExpenses = async (companyId: string): Promise<Expense[]> => {
  return getCompanyExpenses(companyId, undefined, undefined, "pending");
};

// Subscribe to user expenses
export const subscribeToUserExpenses = (
  userId: string,
  companyId: string,
  callback: (expenses: Expense[]) => void,
  limitCount: number = 100
): (() => void) => {
  const expensesRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}`);
  
  const handleValue = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const expenses: Expense[] = [];
    snapshot.forEach((child: any) => {
      const expense = child.val() as Expense;
      if (expense.userId === userId) {
        expenses.push(expense);
      }
    });
    
    expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(expenses.slice(0, limitCount));
  };
  
  onValue(expensesRef, handleValue);
  return () => off(expensesRef, "value", handleValue);
};

// Subscribe to company expenses (for admin)
export const subscribeToCompanyExpenses = (
  companyId: string,
  callback: (expenses: Expense[]) => void
): (() => void) => {
  const expensesRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}`);
  
  const handleValue = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const expenses: Expense[] = [];
    snapshot.forEach((child: any) => {
      expenses.push(child.val() as Expense);
    });
    
    expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(expenses);
  };
  
  onValue(expensesRef, handleValue);
  return () => off(expensesRef, "value", handleValue);
};

// Subscribe to pending expenses (for admin)
export const subscribeToPendingExpenses = (
  companyId: string,
  callback: (expenses: Expense[]) => void
): (() => void) => {
  const expensesRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}`);
  
  const handleValue = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const expenses: Expense[] = [];
    snapshot.forEach((child: any) => {
      const expense = child.val() as Expense;
      if (expense.status === "pending") {
        expenses.push(expense);
      }
    });
    
    expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(expenses);
  };
  
  onValue(expensesRef, handleValue);
  return () => off(expensesRef, "value", handleValue);
};

// ==================== EXPENSE APPROVAL ====================

// Approve expense
export const approveExpense = async (
  companyId: string,
  expenseId: string,
  approverId: string,
  approverName: string
): Promise<void> => {
  const expense = await getExpense(companyId, expenseId);
  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "pending") throw new Error("Expense is not pending");
  
  const now = new Date().toISOString();
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  
  await update(expenseRef, {
    status: "approved",
    approvedBy: approverId,
    approverName,
    approvedAt: now,
    updatedAt: now,
  });
  
  // Send notification to user
  try {
    const categoryInfo = getExpenseCategoryInfo(expense.category);
    await createNotification(companyId, {
      userId: expense.userId,
      type: "approval_granted",
      title: "Expense Approved",
      body: `Your ${categoryInfo.label} expense of ₹${expense.amount} has been approved`,
      senderId: approverId,
      senderName: approverName,
      clickAction: "/expenses",
      relatedId: expenseId,
    });
  } catch (error) {
    console.error("Failed to send expense approval notification:", error);
  }
};

// Reject expense
export const rejectExpense = async (
  companyId: string,
  expenseId: string,
  approverId: string,
  approverName: string,
  rejectionReason: string
): Promise<void> => {
  const expense = await getExpense(companyId, expenseId);
  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "pending") throw new Error("Expense is not pending");
  
  const now = new Date().toISOString();
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  
  await update(expenseRef, {
    status: "rejected",
    approvedBy: approverId,
    approverName,
    approvedAt: now,
    rejectionReason,
    updatedAt: now,
  });
  
  // Send notification to user
  try {
    const categoryInfo = getExpenseCategoryInfo(expense.category);
    await createNotification(companyId, {
      userId: expense.userId,
      type: "approval_rejected",
      title: "Expense Rejected",
      body: `Your ${categoryInfo.label} expense of ₹${expense.amount} was rejected: ${rejectionReason}`,
      senderId: approverId,
      senderName: approverName,
      clickAction: "/expenses",
      relatedId: expenseId,
    });
  } catch (error) {
    console.error("Failed to send expense rejection notification:", error);
  }
};

// Bulk approve expenses
export const bulkApproveExpenses = async (
  companyId: string,
  expenseIds: string[],
  approverId: string,
  approverName: string
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = [];
  const failed: string[] = [];
  
  for (const expenseId of expenseIds) {
    try {
      await approveExpense(companyId, expenseId, approverId, approverName);
      success.push(expenseId);
    } catch (error) {
      failed.push(expenseId);
    }
  }
  
  return { success, failed };
};

// ==================== REIMBURSEMENT ====================

// Mark expense as reimbursed
export const markAsReimbursed = async (
  companyId: string,
  expenseId: string,
  reference?: string,
  amount?: number
): Promise<void> => {
  const expense = await getExpense(companyId, expenseId);
  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "approved") throw new Error("Expense is not approved");
  
  const now = new Date().toISOString();
  const expenseRef = ref(realtimeDb, `${EXPENSES_PATH}/${companyId}/${expenseId}`);
  
  await update(expenseRef, {
    status: "reimbursed",
    reimbursedAt: now,
    reimbursementReference: reference,
    reimbursementAmount: amount || expense.amount,
    updatedAt: now,
  });
};

// Bulk mark as reimbursed
export const bulkMarkAsReimbursed = async (
  companyId: string,
  expenseIds: string[],
  reference?: string
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = [];
  const failed: string[] = [];
  
  for (const expenseId of expenseIds) {
    try {
      await markAsReimbursed(companyId, expenseId, reference);
      success.push(expenseId);
    } catch (error) {
      failed.push(expenseId);
    }
  }
  
  return { success, failed };
};

// Create reimbursement batch
export const createReimbursementBatch = async (
  companyId: string,
  expenseIds: string[]
): Promise<ReimbursementBatch> => {
  const batchId = `reimb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  // Get all expenses
  const expenses: Array<{ expenseId: string; userId: string; userName: string; amount: number }> = [];
  const byUser: Record<string, { userName: string; amount: number; count: number }> = {};
  let totalAmount = 0;
  
  for (const expenseId of expenseIds) {
    const expense = await getExpense(companyId, expenseId);
    if (!expense || expense.status !== "approved") continue;
    
    expenses.push({
      expenseId: expense.id,
      userId: expense.userId,
      userName: expense.userName,
      amount: expense.amount,
    });
    
    if (!byUser[expense.userId]) {
      byUser[expense.userId] = { userName: expense.userName, amount: 0, count: 0 };
    }
    byUser[expense.userId].amount += expense.amount;
    byUser[expense.userId].count += 1;
    totalAmount += expense.amount;
  }
  
  const batch: ReimbursementBatch = {
    id: batchId,
    companyId,
    batchDate: now.split("T")[0],
    totalAmount,
    expenseCount: expenses.length,
    expenses,
    byUser,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  
  const batchRef = ref(realtimeDb, `${REIMBURSEMENT_BATCHES_PATH}/${companyId}/${batchId}`);
  await set(batchRef, batch);
  
  return batch;
};

// Process reimbursement batch
export const processReimbursementBatch = async (
  companyId: string,
  batchId: string,
  processedBy: string,
  reference: string,
  notes?: string
): Promise<void> => {
  const batchRef = ref(realtimeDb, `${REIMBURSEMENT_BATCHES_PATH}/${companyId}/${batchId}`);
  const snapshot = await get(batchRef);
  
  if (!snapshot.exists()) throw new Error("Batch not found");
  const batch = snapshot.val() as ReimbursementBatch;
  
  const now = new Date().toISOString();
  
  // Mark all expenses as reimbursed
  for (const exp of batch.expenses) {
    await markAsReimbursed(companyId, exp.expenseId, reference);
  }
  
  // Update batch status
  await update(batchRef, {
    status: "completed",
    processedBy,
    processedAt: now,
    reference,
    notes,
    updatedAt: now,
  });
};

// ==================== REPORTS & ANALYTICS ====================

// Get monthly expense summary for user
export const getMonthlyExpenseSummary = async (
  userId: string,
  companyId: string,
  year: number,
  month: number
): Promise<MonthlyExpenseSummary> => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];
  
  const expenses = await getUserExpenses(userId, companyId, startDate, endDate);
  
  const summary: MonthlyExpenseSummary = {
    userId,
    userName: expenses[0]?.userName || "",
    companyId,
    year,
    month,
    totalAmount: 0,
    totalExpenses: expenses.length,
    approvedAmount: 0,
    pendingAmount: 0,
    rejectedAmount: 0,
    reimbursedAmount: 0,
    byCategory: {} as Record<ExpenseCategory, number>,
    byStatus: {} as Record<ExpenseStatus, number>,
  };
  
  for (const expense of expenses) {
    summary.totalAmount += expense.amount;
    
    // By status
    summary.byStatus[expense.status] = (summary.byStatus[expense.status] || 0) + expense.amount;
    
    if (expense.status === "approved") {
      summary.approvedAmount += expense.amount;
    } else if (expense.status === "pending") {
      summary.pendingAmount += expense.amount;
    } else if (expense.status === "rejected") {
      summary.rejectedAmount += expense.amount;
    } else if (expense.status === "reimbursed") {
      summary.reimbursedAmount += expense.amount;
    }
    
    // By category
    summary.byCategory[expense.category] = (summary.byCategory[expense.category] || 0) + expense.amount;
  }
  
  return summary;
};

// Get company expense summary
export const getCompanyExpenseSummary = async (
  companyId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalAmount: number;
  totalExpenses: number;
  byStatus: Record<ExpenseStatus, { count: number; amount: number }>;
  byCategory: Record<ExpenseCategory, { count: number; amount: number }>;
  byUser: Record<string, { userName: string; count: number; amount: number }>;
  byDate: Record<string, number>;
}> => {
  const expenses = await getCompanyExpenses(companyId, startDate, endDate);
  
  const summary = {
    totalAmount: 0,
    totalExpenses: expenses.length,
    byStatus: {} as Record<ExpenseStatus, { count: number; amount: number }>,
    byCategory: {} as Record<ExpenseCategory, { count: number; amount: number }>,
    byUser: {} as Record<string, { userName: string; count: number; amount: number }>,
    byDate: {} as Record<string, number>,
  };
  
  for (const expense of expenses) {
    summary.totalAmount += expense.amount;
    
    // By status
    if (!summary.byStatus[expense.status]) {
      summary.byStatus[expense.status] = { count: 0, amount: 0 };
    }
    summary.byStatus[expense.status].count += 1;
    summary.byStatus[expense.status].amount += expense.amount;
    
    // By category
    if (!summary.byCategory[expense.category]) {
      summary.byCategory[expense.category] = { count: 0, amount: 0 };
    }
    summary.byCategory[expense.category].count += 1;
    summary.byCategory[expense.category].amount += expense.amount;
    
    // By user
    if (!summary.byUser[expense.userId]) {
      summary.byUser[expense.userId] = { userName: expense.userName, count: 0, amount: 0 };
    }
    summary.byUser[expense.userId].count += 1;
    summary.byUser[expense.userId].amount += expense.amount;
    
    // By date
    summary.byDate[expense.date] = (summary.byDate[expense.date] || 0) + expense.amount;
  }
  
  return summary;
};

// Get daily expense summary
export const getDailyExpenseSummary = async (
  userId: string,
  companyId: string,
  date: string
): Promise<DailyExpenseSummary> => {
  const expenses = await getUserExpenses(userId, companyId, date, date);
  
  const summary: DailyExpenseSummary = {
    date,
    totalAmount: 0,
    expenseCount: expenses.length,
    byCategory: {},
  };
  
  for (const expense of expenses) {
    summary.totalAmount += expense.amount;
    summary.byCategory[expense.category] = (summary.byCategory[expense.category] || 0) + expense.amount;
  }
  
  return summary;
};

// Get expense stats for dashboard
export const getExpenseStats = async (
  companyId: string
): Promise<{
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  reimbursedCount: number;
}> => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  
  const expenses = await getCompanyExpenses(companyId, monthStart);
  
  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;
  let pendingCount = 0;
  let pendingAmount = 0;
  let approvedCount = 0;
  let reimbursedCount = 0;
  
  for (const expense of expenses) {
    monthTotal += expense.amount;
    
    if (expense.date >= weekStartStr) {
      weekTotal += expense.amount;
    }
    
    if (expense.date === todayStr) {
      todayTotal += expense.amount;
    }
    
    if (expense.status === "pending") {
      pendingCount += 1;
      pendingAmount += expense.amount;
    } else if (expense.status === "approved") {
      approvedCount += 1;
    } else if (expense.status === "reimbursed") {
      reimbursedCount += 1;
    }
  }
  
  return {
    todayTotal,
    weekTotal,
    monthTotal,
    pendingCount,
    pendingAmount,
    approvedCount,
    reimbursedCount,
  };
};
