import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { User, UserRole, CreateUserData, AuthResponse } from "@/types/auth";
import { updateCompanyUserCounts } from "./company";
import bcrypt from "bcryptjs";

const USERS_COLLECTION = "users";

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Get user by username
export async function getUserByUsername(username: string): Promise<{
  user: User | null;
  passwordHash: string | null;
}> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(
      usersRef,
      where("username", "==", username.toLowerCase()),
      where("isActive", "==", true)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { user: null, passwordHash: null };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const user: User = {
      id: userDoc.id,
      username: userData.username,
      role: userData.role as UserRole,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      companyId: userData.companyId,
      createdAt: userData.createdAt,
      createdBy: userData.createdBy,
      isActive: userData.isActive,
    };

    return { user, passwordHash: userData.passwordHash };
  } catch (error) {
    console.error("Error getting user:", error);
    return { user: null, passwordHash: null };
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<{
  user: User | null;
  passwordHash: string | null;
}> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { user: null, passwordHash: null };
    }

    const userData = userSnap.data();

    const user: User = {
      id: userSnap.id,
      username: userData.username,
      role: userData.role as UserRole,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      city: userData.city,
      state: userData.state,
      country: userData.country,
      companyId: userData.companyId,
      createdAt: userData.createdAt,
      createdBy: userData.createdBy,
      isActive: userData.isActive,
      profilePicture: userData.profilePicture,
    };

    return { user, passwordHash: userData.passwordHash ?? null };
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return { user: null, passwordHash: null };
  }
}

// Authenticate user
export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { user, passwordHash } = await getUserByUsername(username);

    if (!user || !passwordHash) {
      return { success: false, error: "Invalid username or password" };
    }

    const isValid = await verifyPassword(password, passwordHash);

    if (!isValid) {
      return { success: false, error: "Invalid username or password" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, error: "An error occurred during authentication" };
  }
}

// Create new user (only superadmin and admin can do this)
export async function createUser(
  data: CreateUserData,
  createdBy: string
): Promise<AuthResponse> {
  try {
    // Check if username already exists
    const { user: existingUser } = await getUserByUsername(data.username);
    if (existingUser) {
      return { success: false, error: "Username already exists" };
    }

    // Hash the password
    const passwordHash = await hashPassword(data.password);

    // Create user document
    const userDoc = {
      username: data.username.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      email: data.email || "",
      phone: data.phone || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      companyId: data.companyId || "",
      createdAt: new Date().toISOString(),
      createdBy,
      isActive: true,
    };

    const docRef = await addDoc(collection(db, USERS_COLLECTION), userDoc);

    // Update company user counts if user belongs to a company
    if (data.companyId) {
      const adminDelta = data.role === "admin" ? 1 : 0;
      const agentDelta = data.role === "user" ? 1 : 0;
      await updateCompanyUserCounts(data.companyId, adminDelta, agentDelta);
    }

    const newUser: User = {
      id: docRef.id,
      username: data.username.toLowerCase(),
      role: data.role,
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      state: data.state,
      country: data.country,
      companyId: data.companyId,
      createdAt: userDoc.createdAt,
      createdBy,
      isActive: true,
    };

    return { success: true, user: newUser };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

// Get all users (for superadmin)
export async function getAllUsers(companyId?: string): Promise<User[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    let q;
    
    if (companyId) {
      q = query(usersRef, where("companyId", "==", companyId));
    } else {
      q = query(usersRef);
    }
    
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username,
        role: data.role as UserRole,
        name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        country: data.country,
        companyId: data.companyId,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        isActive: data.isActive,
        profilePicture: data.profilePicture,
      };
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
}

// Update user
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, "id" | "createdAt" | "createdBy">> & {
    password?: string;
  }
): Promise<AuthResponse> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: "User not found" };
    }

    const updateData: Record<string, unknown> = {};

    if (updates.username) updateData.username = updates.username.toLowerCase();
    if (updates.name) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.companyId !== undefined) updateData.companyId = updates.companyId;
    if (updates.role) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.profilePicture !== undefined) updateData.profilePicture = updates.profilePicture;
    if (updates.password) {
      updateData.passwordHash = await hashPassword(updates.password);
    }

    await updateDoc(userRef, updateData);

    // Fetch updated user data to return
    const updatedUserSnap = await getDoc(userRef);
    const updatedUserData = updatedUserSnap.data();

    return { 
      success: true,
      user: updatedUserData ? {
        id: userId,
        username: updatedUserData.username,
        name: updatedUserData.name,
        email: updatedUserData.email,
        phone: updatedUserData.phone,
        city: updatedUserData.city,
        state: updatedUserData.state,
        country: updatedUserData.country,
        role: updatedUserData.role,
        companyId: updatedUserData.companyId,
        profilePicture: updatedUserData.profilePicture,
        createdAt: updatedUserData.createdAt,
        isActive: updatedUserData.isActive,
      } as User : undefined
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Failed to update user" };
  }
}

// Delete user (soft delete)
export async function deleteUser(userId: string): Promise<AuthResponse> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Decrement company user counts if user belongs to a company
      if (userData.companyId && userData.isActive) {
        const adminDelta = userData.role === "admin" ? -1 : 0;
        const agentDelta = userData.role === "user" ? -1 : 0;
        await updateCompanyUserCounts(userData.companyId, adminDelta, agentDelta);
      }
    }
    
    await updateDoc(userRef, { isActive: false });
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

// Hard delete user
export async function hardDeleteUser(userId: string): Promise<AuthResponse> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

// Check if superadmin exists
export async function superadminExists(): Promise<boolean> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("role", "==", "superadmin"));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking superadmin:", error);
    return false;
  }
}
