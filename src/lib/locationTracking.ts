import { realtimeDb } from "./firebase";
import {
  ref,
  set,
  get,
  onValue,
  off,
  remove,
  DataSnapshot,
} from "firebase/database";

// Realtime Database paths
const LOCATIONS_PATH = "locations";

export interface LocationData {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  address?: string;
  companyId?: string;
  userName?: string;
  isOnline?: boolean;
}

export interface LocationHistoryEntry extends LocationData {
  id: string;
}

// Update user's current location (only stores last active location, no history)
export const updateUserLocation = async (
  userId: string,
  latitude: number,
  longitude: number,
  accuracy: number | null,
  companyId?: string,
  userName?: string,
  address?: string
): Promise<void> => {
  const locationRef = ref(realtimeDb, `${LOCATIONS_PATH}/${userId}`);
  const timestamp = new Date().toISOString();

  // Build location data without undefined values (Firebase doesn't allow undefined)
  const locationData: Record<string, unknown> = {
    userId,
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    timestamp,
    isOnline: true,
  };

  // Only add optional fields if they have values
  if (address) locationData.address = address;
  if (companyId) locationData.companyId = companyId;
  if (userName) locationData.userName = userName;

  // Update current location only - replaces previous location
  await set(locationRef, locationData);
};

// Save last active location when user goes offline (replaces any previous saved location)
export const saveLastActiveLocation = async (
  userId: string,
  latitude: number,
  longitude: number,
  accuracy: number | null,
  companyId?: string,
  userName?: string,
  address?: string
): Promise<void> => {
  const locationRef = ref(realtimeDb, `${LOCATIONS_PATH}/${userId}`);
  const timestamp = new Date().toISOString();

  const locationData: Record<string, unknown> = {
    userId,
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    timestamp,
    isOnline: false,
  };

  if (address) locationData.address = address;
  if (companyId) locationData.companyId = companyId;
  if (userName) locationData.userName = userName;

  // Replace the current entry with offline marker
  await set(locationRef, locationData);
};

// Get user's current location
export const getUserLocation = async (userId: string): Promise<LocationData | null> => {
  const locationRef = ref(realtimeDb, `${LOCATIONS_PATH}/${userId}`);
  const snapshot = await get(locationRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as LocationData;
  }
  
  return null;
};

// Subscribe to user's current location (real-time)
export const subscribeToUserLocation = (
  userId: string,
  callback: (location: LocationData | null) => void
) => {
  const locationRef = ref(realtimeDb, `${LOCATIONS_PATH}/${userId}`);

  onValue(locationRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as LocationData);
    } else {
      callback(null);
    }
  });

  return () => off(locationRef);
};

// Subscribe to all users' locations (for admin/superadmin)
export const subscribeToAllLocations = (
  companyId: string | null,
  callback: (locations: LocationData[]) => void
) => {
  const locationsRef = ref(realtimeDb, LOCATIONS_PATH);

  onValue(locationsRef, (snapshot: DataSnapshot) => {
    const locations: LocationData[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val() as LocationData;
      
      // Filter by company if companyId is provided
      if (!companyId || data.companyId === companyId) {
        locations.push(data);
      }
    });
    
    callback(locations);
  });

  return () => off(locationsRef);
};

// Subscribe to all user locations for a company (alias for admin maps)
export const subscribeToAllUserLocations = (
  companyId: string,
  callback: (locations: LocationData[]) => void
) => {
  return subscribeToAllLocations(companyId, callback);
};

// Get user's location history - returns current location only (no history stored)
export const getUserLocationHistory = async (
  userId: string,
  _limit: number = 50
): Promise<LocationHistoryEntry[]> => {
  const current = await getUserLocation(userId);
  if (current) {
    return [{ id: "current", ...current }];
  }
  return [];
};

// Subscribe to user's location history - returns current location only
export const subscribeToLocationHistory = (
  userId: string,
  _limit: number = 50,
  callback: (history: LocationHistoryEntry[]) => void
) => {
  const locationRef = ref(realtimeDb, `${LOCATIONS_PATH}/${userId}`);

  onValue(locationRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as LocationData;
      callback([{ id: "current", ...data }]);
    } else {
      callback([]);
    }
  });

  return () => off(locationRef);
};

// Get all agents' locations for a company (for admin view)
export const getCompanyAgentLocations = async (
  companyId: string
): Promise<LocationData[]> => {
  const locationsRef = ref(realtimeDb, LOCATIONS_PATH);
  const snapshot = await get(locationsRef);
  
  const locations: LocationData[] = [];
  
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val() as LocationData;
    if (data.companyId === companyId) {
      locations.push(data);
    }
  });
  
  return locations;
};

// Calculate distance between two points (in meters)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Get location stats for today (simplified - no history)
export const getTodayLocationStats = async (
  userId: string
): Promise<{
  totalUpdates: number;
  firstLocation: LocationHistoryEntry | null;
  lastLocation: LocationHistoryEntry | null;
  totalDistanceTraveled: number;
}> => {
  const current = await getUserLocation(userId);
  
  if (!current) {
    return {
      totalUpdates: 0,
      firstLocation: null,
      lastLocation: null,
      totalDistanceTraveled: 0,
    };
  }

  const entry: LocationHistoryEntry = { id: "current", ...current };

  return {
    totalUpdates: 1,
    firstLocation: entry,
    lastLocation: entry,
    totalDistanceTraveled: 0,
  };
};

// Delete all location data for a user (for full user deletion)
export const deleteUserLocationData = async (userId: string): Promise<void> => {
  try {
    const locationRef = ref(realtimeDb, `${LOCATIONS_PATH}/${userId}`);
    await remove(locationRef);
    
    // Delete any leftover history (legacy cleanup)
    const historyRef = ref(realtimeDb, `locationHistory/${userId}`);
    await remove(historyRef);
  } catch (error) {
    console.error("Error deleting user location data:", error);
  }
};
