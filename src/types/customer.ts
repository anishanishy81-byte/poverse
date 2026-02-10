// Customer/CRM Types

export interface CustomerContact {
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  agentId: string;
  agentName: string;
  type: 'visit' | 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
  description: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  nextFollowUp?: string; // ISO date string
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  agentId: string;
  agentName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerPurchase {
  id: string;
  customerId: string;
  agentId: string;
  agentName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  
  // Basic Info (from target or manual entry)
  name: string;
  businessName?: string;
  type: 'individual' | 'business';
  category?: string; // e.g., 'retail', 'wholesale', 'distributor'
  
  // Contact Info
  contact: CustomerContact;
  
  // Tags for categorization
  tags: string[];
  
  // Source tracking
  sourceType: 'target' | 'manual' | 'referral';
  sourceTargetId?: string; // If created from a target
  sourceAgentId?: string; // Agent who added this customer
  
  // Status
  status: 'active' | 'inactive' | 'prospect' | 'lead';
  priority: 'high' | 'medium' | 'low';
  
  // Location
  location?: {
    latitude: number;
    longitude: number;
  };
  
  // Stats
  totalInteractions: number;
  totalPurchases: number;
  totalPurchaseValue: number;
  lastInteractionDate?: string;
  lastPurchaseDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CustomerFormData {
  name: string;
  businessName?: string;
  type: 'individual' | 'business';
  category?: string;
  contact: CustomerContact;
  tags: string[];
  status: 'active' | 'inactive' | 'prospect' | 'lead';
  priority: 'high' | 'medium' | 'low';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface InteractionFormData {
  type: 'visit' | 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
  description: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  nextFollowUp?: string;
}

export interface PurchaseFormData {
  productName: string;
  quantity: number;
  unitPrice: number;
  purchaseDate: string;
  notes?: string;
}

export interface CustomerFilters {
  status?: string;
  priority?: string;
  category?: string;
  tags?: string[];
  searchQuery?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  prospects: number;
  leads: number;
  highPriority: number;
  totalInteractions: number;
  totalPurchaseValue: number;
  recentInteractions: number; // Last 7 days
}
