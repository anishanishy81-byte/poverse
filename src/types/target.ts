// Target/Lead tracking types

export type LeadStatus = 
  | "new"
  | "contacted"
  | "interested"
  | "not_interested"
  | "follow_up"
  | "converted"
  | "lost";

export type TargetStatus = 
  | "pending"      // Target assigned, not yet started
  | "in_transit"   // User is heading to the target
  | "reached"      // User is within 100m radius
  | "in_progress"  // Timer started, work in progress
  | "completed"    // Work done and documented
  | "skipped";     // User skipped this target

// Reason for Visit - selected when creating/adding a target
export type VisitReason = 
  | "sales_pitch"
  | "follow_up_visit"
  | "product_demo"
  | "payment_collection"
  | "customer_support"
  | "survey"
  | "delivery"
  | "maintenance"
  | "new_lead"
  | "relationship_building"
  | "complaint_resolution"
  | "contract_renewal"
  | "other";

// Outcome Flags - selected when completing a visit
export type OutcomeFlag = 
  | "needs_follow_up"
  | "interested"
  | "not_interested"
  | "deal_closed"
  | "callback_requested"
  | "send_quotation"
  | "schedule_demo"
  | "escalate_to_manager"
  | "competitor_using"
  | "budget_constraint"
  | "decision_pending"
  | "wrong_contact"
  | "not_available";

export interface TargetLocation {
  latitude: number;
  longitude: number;
  address: string;
  placeId?: string;  // Google Places ID
  placeName?: string;
}

export interface TargetOffer {
  id: string;
  name: string;
  description?: string;
  discount?: string;
  applied: boolean;
}

export interface TargetVisit {
  id: string;
  targetId: string;
  userId: string;
  userName: string;
  companyId: string;
  
  // Target info
  targetName: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  location: TargetLocation;
  
  // Reason for visit (set when creating)
  visitReason: VisitReason;
  visitReasonNote?: string;
  
  // Status tracking
  status: TargetStatus;
  leadStatus: LeadStatus;
  
  // Geofencing
  reachedAt?: string;
  reachedLocation?: {
    latitude: number;
    longitude: number;
  };
  distanceFromTarget?: number;
  
  // Timer
  timerStartedAt?: string;
  timerEndedAt?: string;
  durationMinutes?: number;
  
  // Navigation tracking (km tracking)
  navigationTrackingId?: string;
  navigationStartedAt?: string;
  navigationStartLocation?: {
    latitude: number;
    longitude: number;
  };
  navigationDistanceKm?: number;
  navigationCompletedAt?: string;
  
  // Visit details (filled on completion)
  conversationNotes?: string;
  outcome?: string;
  outcomeFlags: OutcomeFlag[];
  offersDiscussed: TargetOffer[];
  nextFollowUpDate?: string;
  
  // Metadata
  assignedAt: string;
  completedAt?: string;
  skippedAt?: string;
  skipReason?: string;
  createdBy: string;
  updatedAt: string;
}

export interface Target {
  id: string;
  companyId: string;
  
  // Basic info
  name: string;
  description?: string;
  category?: string;
  
  // Contact
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Location
  location: TargetLocation;
  
  // Status
  leadStatus: LeadStatus;
  lastVisitDate?: string;
  lastVisitOutcome?: string;
  lastOutcomeFlags?: OutcomeFlag[];
  totalVisits: number;
  
  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  isActive: boolean;
}

// For creating a new target from search
export interface CreateTargetInput {
  name: string;
  description?: string;
  category?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  location: TargetLocation;
  visitReason: VisitReason;
  visitReasonNote?: string;
}

// For completing a visit
export interface CompleteVisitInput {
  conversationNotes: string;
  outcome: string;
  leadStatus: LeadStatus;
  outcomeFlags: OutcomeFlag[];
  offersDiscussed: TargetOffer[];
  nextFollowUpDate?: string;
}
