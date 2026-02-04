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
  }
  
  return sessionToken;
};

// Validate current session
export const validateSession = async (userId: string): Promise<{
  valid: boolean;
  reason?: string;
}> => {
  if (typeof window === "undefined") {
    return { valid: true }; // Server-side, always valid
  }
  
  const storedToken = localStorage.getItem("sessionToken");
  const storedUserId = localStorage.getItem("sessionUserId");
  
  // If no token stored but user is in Zustand state, 
  // this might be a hydration issue - give benefit of doubt briefly
  if (!storedToken || !storedUserId) {
    // Check if this is a fresh page load (within 5 seconds)
    const lastValidation = sessionStorage.getItem("lastSessionValidation");
    const now = Date.now();
    if (lastValidation && (now - parseInt(lastValidation)) < 5000) {
      // Recently validated, likely a navigation/refresh issue
      return { valid: true };
    }
    return { valid: false, reason: "No session found" };
  }
  
  if (storedUserId !== userId) {
    return { valid: false, reason: "User ID mismatch" };
  }
  
  try {
    // Get current session from Firebase
    const sessionRef = ref(realtimeDb, `${SESSIONS_PATH}/${userId}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) {
      // Session might not exist in DB yet (race condition on login)
      // or was cleared - but if we have local token, re-create it
      return { valid: false, reason: "Session not found in database" };
    }
    
    const sessionData = snapshot.val() as SessionData;
    
    // Check if the stored token matches the active session
    if (sessionData.sessionToken !== storedToken) {
      return { 
        valid: false, 
        reason: `Your account was logged in on another device (${sessionData.deviceInfo})` 
      };
    }
    
    // Mark successful validation
    sessionStorage.setItem("lastSessionValidation", Date.now().toString());
    
    return { valid: true };
  } catch (error) {
    console.error("Error validating session:", error);
    // Network error - don't log out the user
    return { valid: true };
  }
};

// Subscribe to session changes (for real-time logout)
export const subscribeToSessionChanges = (
  userId: string,
  onSessionInvalid: (reason: string) => void
): (() => void) => {
  if (typeof window === "undefined") {
    return () => {}; // No-op on server
  }
  
  const storedToken = localStorage.getItem("sessionToken");
  if (!storedToken) {
    return () => {};
  }
  
  const sessionRef = ref(realtimeDb, `${SESSIONS_PATH}/${userId}`);
  let isFirstLoad = true;
  
  const unsubscribe = onValue(sessionRef, (snapshot) => {
    // Skip the first callback - this is the initial data load
    if (isFirstLoad) {
      isFirstLoad = false;
      return;
    }
    
    if (!snapshot.exists()) {
      onSessionInvalid("Session was terminated");
      return;
    }
    
    const sessionData = snapshot.val() as SessionData;
    const currentStoredToken = localStorage.getItem("sessionToken");
    
    // If the session token changed, this device was logged out
    if (sessionData.sessionToken !== currentStoredToken) {
      onSessionInvalid(`Your account was logged in on another device (${sessionData.deviceInfo})`);
    }
  }, (error) => {
    // Handle errors silently - don't log out on network issues
    console.error("Session subscription error:", error);
  });
  
  return () => off(sessionRef);
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
