export type UserRole = "superadmin" | "admin" | "user";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  companyId?: string;
  companyName?: string;
  profilePicture?: string;
  createdAt: string;
  createdBy?: string;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  industry?: string;
  userLimit: number;
  adminLimit: number;
  agentLimit: number;
  adminCount: number;
  agentCount: number;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  companyId?: string;
}

export interface CreateCompanyData {
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  userLimit?: number;
  adminLimit?: number;
  agentLimit?: number;
}

export interface CompanyResponse {
  success: boolean;
  company?: Company;
  companies?: Company[];
  error?: string;
}
