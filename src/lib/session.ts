import { realtimeDb } from "./firebase";
import {
  ref,
  set,
  get,
  onValue,
  off,
} from "firebase/database";

// Session path in Realtime Database
const SESSIONS_PATH = "sessions";

// Generate a unique session token
export const generateSessionToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
};

// Get device info for session
export const getDeviceInfo = (): string => {
  if (typeof window === "undefined") return "server";
  
  const userAgent = navigator.userAgent;
  const platform = navigator.platform || "Unknown";
  
  // Simple device detection
  let device = "Desktop";
  if (/Android/i.test(userAgent)) {
    device = "Android";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    device = "iOS";
  } else if (/Mobile/i.test(userAgent)) {
    device = "Mobile";
  }
  
  // Browser detection
  let browser = "Unknown";
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = "Safari";
  } else if (/Firefox/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/Edg/i.test(userAgent)) {
    browser = "Edge";
  }
  
  return `${device} - ${browser} (${platform})`;
};

export interface SessionData {
  userId: string;
  sessionToken: string;
  deviceInfo: string;
  createdAt: string;
  lastActivity: string;
}

// Create or update session for a user
export const createSession = async (userId: string): Promise<string> => {
  const sessionToken = generateSessionToken();
  const deviceInfo = getDeviceInfo();
  const now = new Date().toISOString();
  
  const sessionData: SessionData = {
    userId,
    sessionToken,
    deviceInfo,
    createdAt: now,
    lastActivity: now,
  };
  
  // Store session in Firebase - only one session per user
  const sessionRef = ref(realtimeDb, `${SESSIONS_PATH}/${userId}`);
  await set(sessionRef, sessionData);
  
  // Store session token in localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem("sessionToken", sessionToken);
    localStorage.setItem("sessionUserId", userId);
    // Mark login time to allow grace period
    localStorage.setItem("sessionLoginTime", Date.now().toString());
  }
  
  return sessionToken;
};

// Validate current session
// For Instagram-like behavior, we trust localStorage and always return valid
// The only time we invalidate is if the user explicitly logs out
export const validateSession = async (userId: string): Promise<{
  valid: boolean;
  reason?: string;
}> => {
  if (typeof window === "undefined") {
    return { valid: true }; // Server-side, always valid
  }
  
  const storedUserId = localStorage.getItem("sessionUserId");
  
  // If user ID in localStorage doesn't match, something is wrong
  if (storedUserId && storedUserId !== userId) {
    return { valid: false, reason: "User ID mismatch" };
  }
  
  // Instagram-like: Always valid if user is in local storage
  // Session token validation against Firebase is disabled for persistent login
  // This means users stay logged in until they manually logout
  
  // Mark successful validation
  sessionStorage.setItem("lastSessionValidation", Date.now().toString());
  
  return { valid: true };
};

// Subscribe to session changes (for real-time logout)
// DISABLED: For Instagram-like persistent login, we don't auto-logout
// Users stay logged in until they manually logout
export const subscribeToSessionChanges = (
  userId: string,
  onSessionInvalid: (reason: string) => void
): (() => void) => {
  // Return no-op for Instagram-like persistent login
  // Session changes don't cause automatic logout
  return () => {};
};

// Update last activity timestamp
export const updateSessionActivity = async (userId: string): Promise<void> => {
  const storedToken = localStorage.getItem("sessionToken");
  if (!storedToken) return;
  
  try {
    const sessionRef = ref(realtimeDb, `${SESSIONS_PATH}/${userId}`);
    const snapshot = await get(sessionRef);
    
    if (snapshot.exists()) {
      const sessionData = snapshot.val() as SessionData;
      
      // Only update if this is the active session
      if (sessionData.sessionToken === storedToken) {
        await set(sessionRef, {
          ...sessionData,
          lastActivity: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Error updating session activity:", error);
  }
};

// Clear session on logout
export const clearSession = async (userId: string): Promise<void> => {
  try {
    // Remove from Firebase
    const sessionRef = ref(realtimeDb, `${SESSIONS_PATH}/${userId}`);
    await set(sessionRef, null);
  } catch (error) {
    console.error("Error clearing session:", error);
  }
  
  // Clear local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("sessionUserId");
  }
};

// Get current session info
export const getCurrentSession = async (userId: string): Promise<SessionData | null> => {
  try {
    const sessionRef = ref(realtimeDb, `${SESSIONS_PATH}/${userId}`);
    const snapshot = await get(sessionRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as SessionData;
    }
    return null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};
