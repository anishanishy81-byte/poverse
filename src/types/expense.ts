// Expense Tracking Types

// Expense categories
export type ExpenseCategory =
  | "travel"
  | "food"
  | "accommodation"
  | "fuel"
  | "parking"
  | "toll"
  | "communication"
  | "office_supplies"
  | "client_entertainment"
  | "equipment"
  | "miscellaneous";

// Expense status
export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed" | "cancelled";

// Payment method
export type PaymentMethod = "cash" | "card" | "upi" | "company_card" | "other";

// Expense entry
export interface Expense {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  
  // Expense details
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  date: string; // YYYY-MM-DD
  
  // Receipt
  receiptUrl?: string;
  receiptPath?: string;
  hasReceipt: boolean;
  
  // Location (optional)
  location?: string;
  latitude?: number;
  longitude?: number;
  
  // Related target/visit (optional)
  targetId?: string;
  targetName?: string;
  visitId?: string;
  
  // Payment info
  paymentMethod: PaymentMethod;
  vendorName?: string;
  invoiceNumber?: string;
  
  // Status tracking
  status: ExpenseStatus;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Reimbursement tracking
  reimbursedAt?: string;
  reimbursementReference?: string;
  reimbursementAmount?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Expense input for creating new expense
export interface ExpenseInput {
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  vendorName?: string;
  invoiceNumber?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  targetId?: string;
  targetName?: string;
  visitId?: string;
}

// Expense policy
export interface ExpensePolicy {
  companyId: string;
  requiresReceipt: boolean;
  receiptRequiredAbove: number; // Amount above which receipt is mandatory
  maxDailyLimit: number;
  maxPerTransactionLimit: number;
  autoApproveBelow: number; // Auto-approve expenses below this amount
  allowedCategories: ExpenseCategory[];
  categoryLimits: Partial<Record<ExpenseCategory, number>>; // Per-category daily limits
  requiresApproval: boolean;
  currency: string;
  updatedAt: string;
}

// Monthly expense summary
export interface MonthlyExpenseSummary {
  userId: string;
  userName: string;
  companyId: string;
  year: number;
  month: number;
  
  // Totals
  totalAmount: number;
  totalExpenses: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  reimbursedAmount: number;
  
  // By category
  byCategory: Record<ExpenseCategory, number>;
  
  // By status
  byStatus: Record<ExpenseStatus, number>;
}

// Daily expense summary
export interface DailyExpenseSummary {
  date: string;
  totalAmount: number;
  expenseCount: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

// Expense report
export interface ExpenseReport {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  
  // Report period
  startDate: string;
  endDate: string;
  reportType: "weekly" | "monthly" | "custom";
  
  // Summary
  totalAmount: number;
  totalExpenses: number;
  approvedAmount: number;
  pendingAmount: number;
  reimbursedAmount: number;
  
  // By category breakdown
  byCategory: Record<ExpenseCategory, { count: number; amount: number }>;
  
  // Expense IDs included
  expenseIds: string[];
  
  // Status
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
  approvedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Reimbursement batch
export interface ReimbursementBatch {
  id: string;
  companyId: string;
  
  // Batch details
  batchDate: string;
  totalAmount: number;
  expenseCount: number;
  
  // Expenses in this batch
  expenses: Array<{
    expenseId: string;
    userId: string;
    userName: string;
    amount: number;
  }>;
  
  // By user
  byUser: Record<string, { userName: string; amount: number; count: number }>;
  
  // Status
  status: "pending" | "processing" | "completed";
  processedBy?: string;
  processedAt?: string;
  reference?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ==================== CONSTANTS ====================

// Expense category info
export interface ExpenseCategoryInfo {
  type: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryInfo[] = [
  {
    type: "travel",
    label: "Travel",
    icon: "directions_car",
    color: "#2196f3",
    description: "Transportation expenses",
  },
  {
    type: "food",
    label: "Food & Meals",
    icon: "restaurant",
    color: "#ff9800",
    description: "Food and dining expenses",
  },
  {
    type: "accommodation",
    label: "Accommodation",
    icon: "hotel",
    color: "#9c27b0",
    description: "Hotel and lodging",
  },
  {
    type: "fuel",
    label: "Fuel",
    icon: "local_gas_station",
    color: "#f44336",
    description: "Vehicle fuel expenses",
  },
  {
    type: "parking",
    label: "Parking",
    icon: "local_parking",
    color: "#607d8b",
    description: "Parking fees",
  },
  {
    type: "toll",
    label: "Toll",
    icon: "toll",
    color: "#795548",
    description: "Toll charges",
  },
  {
    type: "communication",
    label: "Communication",
    icon: "phone",
    color: "#00bcd4",
    description: "Phone, internet expenses",
  },
  {
    type: "office_supplies",
    label: "Office Supplies",
    icon: "inventory_2",
    color: "#4caf50",
    description: "Stationery and supplies",
  },
  {
    type: "client_entertainment",
    label: "Client Entertainment",
    icon: "celebration",
    color: "#e91e63",
    description: "Client meetings, gifts",
  },
  {
    type: "equipment",
    label: "Equipment",
    icon: "build",
    color: "#3f51b5",
    description: "Tools and equipment",
  },
  {
    type: "miscellaneous",
    label: "Miscellaneous",
    icon: "more_horiz",
    color: "#9e9e9e",
    description: "Other expenses",
  },
];

// Payment method info
export interface PaymentMethodInfo {
  type: PaymentMethod;
  label: string;
  icon: string;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  { type: "cash", label: "Cash", icon: "payments" },
  { type: "card", label: "Personal Card", icon: "credit_card" },
  { type: "upi", label: "UPI", icon: "phone_android" },
  { type: "company_card", label: "Company Card", icon: "credit_score" },
  { type: "other", label: "Other", icon: "account_balance" },
];

// Default expense policy
export const DEFAULT_EXPENSE_POLICY: Omit<ExpensePolicy, "companyId"> = {
  requiresReceipt: true,
  receiptRequiredAbove: 500,
  maxDailyLimit: 5000,
  maxPerTransactionLimit: 2000,
  autoApproveBelow: 100,
  allowedCategories: [
    "travel", "food", "fuel", "parking", "toll",
    "communication", "office_supplies", "miscellaneous"
  ],
  categoryLimits: {
    food: 500,
    fuel: 1000,
    parking: 200,
    toll: 500,
  },
  requiresApproval: true,
  currency: "INR",
  updatedAt: new Date().toISOString(),
};

// ==================== HELPER FUNCTIONS ====================

// Get expense category info
export const getExpenseCategoryInfo = (category: ExpenseCategory): ExpenseCategoryInfo => {
  return EXPENSE_CATEGORIES.find((c) => c.type === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
};

// Get payment method info
export const getPaymentMethodInfo = (method: PaymentMethod): PaymentMethodInfo => {
  return PAYMENT_METHODS.find((m) => m.type === method) || PAYMENT_METHODS[PAYMENT_METHODS.length - 1];
};

// Get expense status color
export const getExpenseStatusColor = (status: ExpenseStatus): string => {
  const colors: Record<ExpenseStatus, string> = {
    pending: "#ff9800",
    approved: "#4caf50",
    rejected: "#f44336",
    reimbursed: "#2196f3",
    cancelled: "#9e9e9e",
  };
  return colors[status];
};

// Get expense status label
export const getExpenseStatusLabel = (status: ExpenseStatus): string => {
  const labels: Record<ExpenseStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    reimbursed: "Reimbursed",
    cancelled: "Cancelled",
  };
  return labels[status];
};

// Format currency
export const formatCurrency = (amount: number, currency: string = "INR"): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get date range for month
export const getMonthDateRange = (year: number, month: number): { start: string; end: string } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

// Calculate total from expenses
export const calculateExpenseTotal = (expenses: Expense[]): number => {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
};

// Group expenses by category
export const groupExpensesByCategory = (
  expenses: Expense[]
): Record<ExpenseCategory, Expense[]> => {
  const grouped = {} as Record<ExpenseCategory, Expense[]>;
  
  for (const expense of expenses) {
    if (!grouped[expense.category]) {
      grouped[expense.category] = [];
    }
    grouped[expense.category].push(expense);
  }
  
  return grouped;
};

// Group expenses by date
export const groupExpensesByDate = (
  expenses: Expense[]
): Record<string, Expense[]> => {
  const grouped: Record<string, Expense[]> = {};
  
  for (const expense of expenses) {
    if (!grouped[expense.date]) {
      grouped[expense.date] = [];
    }
    grouped[expense.date].push(expense);
  }
  
  return grouped;
};

// Check if expense requires receipt
export const requiresReceipt = (
  expense: ExpenseInput,
  policy: ExpensePolicy
): boolean => {
  if (!policy.requiresReceipt) return false;
  return expense.amount >= policy.receiptRequiredAbove;
};

// Check if expense exceeds limit
export const exceedsLimit = (
  expense: ExpenseInput,
  policy: ExpensePolicy,
  dailyTotal: number
): { exceeded: boolean; message?: string } => {
  // Check per-transaction limit
  if (expense.amount > policy.maxPerTransactionLimit) {
    return {
      exceeded: true,
      message: `Amount exceeds per-transaction limit of ${formatCurrency(policy.maxPerTransactionLimit, policy.currency)}`,
    };
  }
  
  // Check daily limit
  if (dailyTotal + expense.amount > policy.maxDailyLimit) {
    return {
      exceeded: true,
      message: `Amount exceeds daily limit of ${formatCurrency(policy.maxDailyLimit, policy.currency)}`,
    };
  }
  
  // Check category limit
  const categoryLimit = policy.categoryLimits[expense.category];
  if (categoryLimit && expense.amount > categoryLimit) {
    return {
      exceeded: true,
      message: `Amount exceeds ${getExpenseCategoryInfo(expense.category).label} limit of ${formatCurrency(categoryLimit, policy.currency)}`,
    };
  }
  
  return { exceeded: false };
};

// Check if expense should be auto-approved
export const shouldAutoApprove = (
  expense: ExpenseInput,
  policy: ExpensePolicy,
  hasReceipt: boolean
): boolean => {
  if (!policy.requiresApproval) return true;
  if (expense.amount > policy.autoApproveBelow) return false;
  if (requiresReceipt({ ...expense }, policy) && !hasReceipt) return false;
  return true;
};
