import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Customer,
  CustomerFormData,
  CustomerInteraction,
  InteractionFormData,
  CustomerNote,
  CustomerPurchase,
  PurchaseFormData,
  CustomerFilters,
  CustomerStats,
} from "@/types/customer";

// ============ CUSTOMER OPERATIONS ============

export async function createCustomer(
  companyId: string,
  data: CustomerFormData,
  createdBy: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    const customerData = {
      companyId,
      name: data.name,
      businessName: data.businessName || undefined,
      type: data.type,
      category: data.category || undefined,
      contact: data.contact,
      tags: data.tags || [],
      sourceType: "manual" as const,
      sourceAgentId: createdBy,
      status: data.status,
      priority: data.priority,
      location: data.location || undefined,
      totalInteractions: 0,
      totalPurchases: 0,
      totalPurchaseValue: 0,
      lastInteractionDate: undefined,
      lastPurchaseDate: undefined,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    const docRef = await addDoc(collection(db, "customers"), customerData);
    
    return {
      success: true,
      customer: { id: docRef.id, ...customerData } as Customer,
    };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

export async function createCustomerFromTarget(
  companyId: string,
  targetData: {
    name: string;
    location?: { latitude: number; longitude: number };
    address?: string;
  },
  targetId: string,
  agentId: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    const customerData = {
      companyId,
      name: targetData.name,
      businessName: undefined,
      type: "business" as const,
      category: undefined,
      contact: {
        address: targetData.address || undefined,
      },
      tags: ["from-target"],
      sourceType: "target" as const,
      sourceTargetId: targetId,
      sourceAgentId: agentId,
      status: "prospect" as const,
      priority: "medium" as const,
      location: targetData.location || undefined,
      totalInteractions: 0,
      totalPurchases: 0,
      totalPurchaseValue: 0,
      lastInteractionDate: undefined,
      lastPurchaseDate: undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: agentId,
    };

    const docRef = await addDoc(collection(db, "customers"), customerData);
    
    return {
      success: true,
      customer: { id: docRef.id, ...customerData } as Customer,
    };
  } catch (error) {
    console.error("Error creating customer from target:", error);
    return { success: false, error: "Failed to create customer from target" };
  }
}

export async function getCustomers(
  companyId: string,
  filters?: CustomerFilters
): Promise<{ success: boolean; customers: Customer[]; error?: string }> {
  try {
    let q = query(
      collection(db, "customers"),
      where("companyId", "==", companyId),
      orderBy("updatedAt", "desc")
    );

    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    }

    if (filters?.priority) {
      q = query(q, where("priority", "==", filters.priority));
    }

    if (filters?.agentId) {
      q = query(q, where("createdBy", "==", filters.agentId));
    }

    const snapshot = await getDocs(q);
    let customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];

    // Client-side filtering for complex queries
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.businessName?.toLowerCase().includes(searchLower) ||
          c.contact.phone?.includes(filters.searchQuery!) ||
          c.contact.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.category) {
      customers = customers.filter((c) => c.category === filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      customers = customers.filter((c) =>
        filters.tags!.some((tag) => c.tags.includes(tag))
      );
    }

    return { success: true, customers };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, customers: [], error: "Failed to fetch customers" };
  }
}

export async function getCustomerById(
  customerId: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const docRef = doc(db, "customers", customerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: "Customer not found" };
    }

    return {
      success: true,
      customer: { id: docSnap.id, ...docSnap.data() } as Customer,
    };
  } catch (error) {
    console.error("Error fetching customer:", error);
    return { success: false, error: "Failed to fetch customer" };
  }
}

export async function updateCustomer(
  customerId: string,
  data: Partial<CustomerFormData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, "customers", customerId);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating customer:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete all related data
    const batch = writeBatch(db);

    // Delete interactions
    const interactionsSnap = await getDocs(
      query(collection(db, "customerInteractions"), where("customerId", "==", customerId))
    );
    interactionsSnap.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete notes
    const notesSnap = await getDocs(
      query(collection(db, "customerNotes"), where("customerId", "==", customerId))
    );
    notesSnap.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete purchases
    const purchasesSnap = await getDocs(
      query(collection(db, "customerPurchases"), where("customerId", "==", customerId))
    );
    purchasesSnap.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete customer
    batch.delete(doc(db, "customers", customerId));

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}

// ============ INTERACTION OPERATIONS ============

export async function addInteraction(
  customerId: string,
  data: InteractionFormData,
  agentId: string,
  agentName: string
): Promise<{ success: boolean; interaction?: CustomerInteraction; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    const interactionData = {
      customerId,
      agentId,
      agentName,
      type: data.type,
      description: data.description,
      outcome: data.outcome || null,
      nextFollowUp: data.nextFollowUp || null,
      createdAt: now,
    };

    const docRef = await addDoc(collection(db, "customerInteractions"), interactionData);

    // Update customer stats
    const customerRef = doc(db, "customers", customerId);
    await updateDoc(customerRef, {
      totalInteractions: increment(1),
      lastInteractionDate: now,
      updatedAt: now,
    });

    return {
      success: true,
      interaction: { id: docRef.id, ...interactionData } as CustomerInteraction,
    };
  } catch (error) {
    console.error("Error adding interaction:", error);
    return { success: false, error: "Failed to add interaction" };
  }
}

export async function getInteractions(
  customerId: string
): Promise<{ success: boolean; interactions: CustomerInteraction[]; error?: string }> {
  try {
    const q = query(
      collection(db, "customerInteractions"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const interactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerInteraction[];

    return { success: true, interactions };
  } catch (error) {
    console.error("Error fetching interactions:", error);
    return { success: false, interactions: [], error: "Failed to fetch interactions" };
  }
}

export async function deleteInteraction(
  interactionId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, "customerInteractions", interactionId));

    // Update customer stats
    const customerRef = doc(db, "customers", customerId);
    await updateDoc(customerRef, {
      totalInteractions: increment(-1),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting interaction:", error);
    return { success: false, error: "Failed to delete interaction" };
  }
}

// ============ NOTES OPERATIONS ============

export async function addNote(
  customerId: string,
  content: string,
  agentId: string,
  agentName: string
): Promise<{ success: boolean; note?: CustomerNote; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    const noteData = {
      customerId,
      agentId,
      agentName,
      content,
      createdAt: now,
    };

    const docRef = await addDoc(collection(db, "customerNotes"), noteData);

    // Update customer timestamp
    await updateDoc(doc(db, "customers", customerId), {
      updatedAt: now,
    });

    return {
      success: true,
      note: { id: docRef.id, ...noteData } as CustomerNote,
    };
  } catch (error) {
    console.error("Error adding note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function getNotes(
  customerId: string
): Promise<{ success: boolean; notes: CustomerNote[]; error?: string }> {
  try {
    const q = query(
      collection(db, "customerNotes"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerNote[];

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching notes:", error);
    return { success: false, notes: [], error: "Failed to fetch notes" };
  }
}

export async function updateNote(
  noteId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, "customerNotes", noteId), {
      content,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating note:", error);
    return { success: false, error: "Failed to update note" };
  }
}

export async function deleteNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, "customerNotes", noteId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

// ============ PURCHASE OPERATIONS ============

export async function addPurchase(
  customerId: string,
  data: PurchaseFormData,
  agentId: string,
  agentName: string
): Promise<{ success: boolean; purchase?: CustomerPurchase; error?: string }> {
  try {
    const now = new Date().toISOString();
    const totalAmount = data.quantity * data.unitPrice;
    
    const purchaseData = {
      customerId,
      agentId,
      agentName,
      productName: data.productName,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount,
      purchaseDate: data.purchaseDate,
      notes: data.notes || null,
      createdAt: now,
    };

    const docRef = await addDoc(collection(db, "customerPurchases"), purchaseData);

    // Update customer stats
    const customerRef = doc(db, "customers", customerId);
    await updateDoc(customerRef, {
      totalPurchases: increment(1),
      totalPurchaseValue: increment(totalAmount),
      lastPurchaseDate: data.purchaseDate,
      updatedAt: now,
      // Promote to active customer after purchase
      status: "active",
    });

    return {
      success: true,
      purchase: { id: docRef.id, ...purchaseData } as CustomerPurchase,
    };
  } catch (error) {
    console.error("Error adding purchase:", error);
    return { success: false, error: "Failed to add purchase" };
  }
}

export async function getPurchases(
  customerId: string
): Promise<{ success: boolean; purchases: CustomerPurchase[]; error?: string }> {
  try {
    const q = query(
      collection(db, "customerPurchases"),
      where("customerId", "==", customerId),
      orderBy("purchaseDate", "desc")
    );

    const snapshot = await getDocs(q);
    const purchases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerPurchase[];

    return { success: true, purchases };
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return { success: false, purchases: [], error: "Failed to fetch purchases" };
  }
}

export async function deletePurchase(
  purchaseId: string,
  customerId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, "customerPurchases", purchaseId));

    // Update customer stats
    const customerRef = doc(db, "customers", customerId);
    await updateDoc(customerRef, {
      totalPurchases: increment(-1),
      totalPurchaseValue: increment(-amount),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return { success: false, error: "Failed to delete purchase" };
  }
}

// ============ STATS & ANALYTICS ============

export async function getCustomerStats(
  companyId: string
): Promise<{ success: boolean; stats?: CustomerStats; error?: string }> {
  try {
    const customersSnap = await getDocs(
      query(collection(db, "customers"), where("companyId", "==", companyId))
    );

    const customers = customersSnap.docs.map((doc) => doc.data()) as Customer[];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats: CustomerStats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter((c) => c.status === "active").length,
      prospects: customers.filter((c) => c.status === "prospect").length,
      leads: customers.filter((c) => c.status === "lead").length,
      highPriority: customers.filter((c) => c.priority === "high").length,
      totalInteractions: customers.reduce((sum, c) => sum + (c.totalInteractions || 0), 0),
      totalPurchaseValue: customers.reduce((sum, c) => sum + (c.totalPurchaseValue || 0), 0),
      recentInteractions: customers.filter(
        (c) => c.lastInteractionDate && new Date(c.lastInteractionDate) >= sevenDaysAgo
      ).length,
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    return { success: false, error: "Failed to fetch customer stats" };
  }
}

// ============ TAG OPERATIONS ============

export async function getAllTags(
  companyId: string
): Promise<{ success: boolean; tags: string[]; error?: string }> {
  try {
    const customersSnap = await getDocs(
      query(collection(db, "customers"), where("companyId", "==", companyId))
    );

    const tagSet = new Set<string>();
    customersSnap.docs.forEach((doc) => {
      const customer = doc.data() as Customer;
      customer.tags?.forEach((tag) => tagSet.add(tag));
    });

    return { success: true, tags: Array.from(tagSet).sort() };
  } catch (error) {
    console.error("Error fetching tags:", error);
    return { success: false, tags: [], error: "Failed to fetch tags" };
  }
}

export async function addTagToCustomer(
  customerId: string,
  tag: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await getDoc(customerRef);
    
    if (!customerSnap.exists()) {
      return { success: false, error: "Customer not found" };
    }

    const customer = customerSnap.data() as Customer;
    const currentTags = customer.tags || [];
    
    if (!currentTags.includes(tag)) {
      await updateDoc(customerRef, {
        tags: [...currentTags, tag],
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding tag:", error);
    return { success: false, error: "Failed to add tag" };
  }
}

export async function removeTagFromCustomer(
  customerId: string,
  tag: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await getDoc(customerRef);
    
    if (!customerSnap.exists()) {
      return { success: false, error: "Customer not found" };
    }

    const customer = customerSnap.data() as Customer;
    const currentTags = customer.tags || [];
    
    await updateDoc(customerRef, {
      tags: currentTags.filter((t) => t !== tag),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing tag:", error);
    return { success: false, error: "Failed to remove tag" };
  }
}
