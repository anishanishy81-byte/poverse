import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Company, CreateCompanyData, CompanyResponse } from "@/types/auth";
import { uploadCompanyLogo } from "./storage";

const COMPANIES_COLLECTION = "companies";

// Create new company
export async function createCompany(
  data: CreateCompanyData,
  createdBy: string
): Promise<CompanyResponse> {
  try {
    // Check if company name already exists
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const q = query(
      companiesRef,
      where("name", "==", data.name),
      where("isActive", "==", true)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, error: "Company name already exists" };
    }

    // Create company document first (without logo)
    const companyDoc = {
      name: data.name,
      logo: "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      phone: data.phone || "",
      email: data.email || "",
      website: data.website || "",
      description: data.description || "",
      userLimit: data.userLimit || 10,
      adminLimit: data.adminLimit || 5,
      agentLimit: data.agentLimit || 100,
      adminCount: 0,
      agentCount: 0,
      createdAt: new Date().toISOString(),
      createdBy,
      isActive: true,
    };

    const docRef = await addDoc(collection(db, COMPANIES_COLLECTION), companyDoc);

    // Upload logo to Firebase Storage if provided
    let logoUrl = "";
    if (data.logo && data.logo.startsWith("data:")) {
      const uploadResult = await uploadCompanyLogo(docRef.id, data.logo);
      if (uploadResult.success && uploadResult.url) {
        logoUrl = uploadResult.url;
        // Update the company document with the logo URL
        await updateDoc(doc(db, COMPANIES_COLLECTION, docRef.id), { logo: logoUrl });
      }
    }

    const newCompany: Company = {
      id: docRef.id,
      ...companyDoc,
      logo: logoUrl,
    };

    return { success: true, company: newCompany };
  } catch (error) {
    console.error("Error creating company:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to create company: ${errorMessage}` };
  }
}

// Get all companies
export async function getAllCompanies(): Promise<Company[]> {
  try {
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    // Simple query without orderBy to avoid needing composite index
    const q = query(companiesRef, where("isActive", "==", true));
    const querySnapshot = await getDocs(q);

    // Sort by createdAt in memory
    const companies = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        logo: data.logo,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        phone: data.phone,
        email: data.email,
        website: data.website,
        description: data.description,
        userLimit: data.userLimit || 10,
        adminLimit: data.adminLimit || 5,
        agentLimit: data.agentLimit || 100,
        adminCount: data.adminCount || 0,
        agentCount: data.agentCount || 0,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        isActive: data.isActive,
      };
    });

    // Sort by createdAt descending
    companies.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return companies;
  } catch (error) {
    console.error("Error getting companies:", error);
    return [];
  }
}

// Get company by ID
export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const companySnap = await getDoc(companyRef);

    if (!companySnap.exists()) {
      return null;
    }

    const data = companySnap.data();
    return {
      id: companySnap.id,
      name: data.name,
      logo: data.logo,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      phone: data.phone,
      email: data.email,
      website: data.website,
      description: data.description,
      userLimit: data.userLimit || 10,
      adminLimit: data.adminLimit || 5,
      agentLimit: data.agentLimit || 100,
      adminCount: data.adminCount || 0,
      agentCount: data.agentCount || 0,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      isActive: data.isActive,
    };
  } catch (error) {
    console.error("Error getting company:", error);
    return null;
  }
}

// Update company
export async function updateCompany(
  companyId: string,
  updates: Partial<Omit<Company, "id" | "createdAt" | "createdBy">>
): Promise<CompanyResponse> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const companySnap = await getDoc(companyRef);

    if (!companySnap.exists()) {
      return { success: false, error: "Company not found" };
    }

    // Handle logo upload if it's a new base64 image
    const updateData = { ...updates };
    if (updates.logo && updates.logo.startsWith("data:")) {
      const uploadResult = await uploadCompanyLogo(companyId, updates.logo);
      if (uploadResult.success && uploadResult.url) {
        updateData.logo = uploadResult.url;
      } else {
        // If upload fails, don't update the logo
        delete updateData.logo;
      }
    }

    await updateDoc(companyRef, updateData);

    return { success: true };
  } catch (error) {
    console.error("Error updating company:", error);
    return { success: false, error: "Failed to update company" };
  }
}

// Soft delete company
export async function deleteCompany(companyId: string): Promise<CompanyResponse> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(companyRef, { isActive: false });
    return { success: true };
  } catch (error) {
    console.error("Error deleting company:", error);
    return { success: false, error: "Failed to delete company" };
  }
}

// Update company user counts
export async function updateCompanyUserCounts(
  companyId: string,
  adminDelta: number,
  agentDelta: number
): Promise<void> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const companySnap = await getDoc(companyRef);

    if (companySnap.exists()) {
      const data = companySnap.data();
      await updateDoc(companyRef, {
        adminCount: Math.max(0, (data.adminCount || 0) + adminDelta),
        agentCount: Math.max(0, (data.agentCount || 0) + agentDelta),
      });
    }
  } catch (error) {
    console.error("Error updating company user counts:", error);
  }
}
