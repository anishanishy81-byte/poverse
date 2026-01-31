import { realtimeDb } from "./firebase";
import {
  ref,
  set,
  push,
  get,
  update,
  onValue,
  query as rtdbQuery,
  orderByChild,
  limitToLast,
  off,
  DataSnapshot,
} from "firebase/database";

// Realtime Database paths
const LOCATIONS_PATH = "locations";
const LOCATION_HISTORY_PATH = "locationHistory";

export interface LocationData {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  address?: string;
  companyId?: string;
  userName?: string;
}

export interface LocationHistoryEntry extends LocationData {
  id: string;
}

// Update user's current location
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
  };

  // Only add optional fields if they have values
  if (address) locationData.address = address;
  if (companyId) locationData.companyId = companyId;
  if (userName) locationData.userName = userName;

  // Update current location
  await set(locationRef, locationData);

  // Also add to location history
  const historyRef = ref(realtimeDb, `${LOCATION_HISTORY_PATH}/${userId}`);
  const newHistoryRef = push(historyRef);
  await set(newHistoryRef, locationData);
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

  const unsubscribe = onValue(locationRef, (snapshot: DataSnapshot) => {
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

  const unsubscribe = onValue(locationsRef, (snapshot: DataSnapshot) => {
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

// Get user's location history
export const getUserLocationHistory = async (
  userId: string,
  limit: number = 50
): Promise<LocationHistoryEntry[]> => {
  const historyRef = ref(realtimeDb, `${LOCATION_HISTORY_PATH}/${userId}`);
  const historyQuery = rtdbQuery(historyRef, orderByChild("timestamp"), limitToLast(limit));
  
  const snapshot = await get(historyQuery);
  const history: LocationHistoryEntry[] = [];
  
  snapshot.forEach((childSnapshot) => {
    history.push({
      id: childSnapshot.key!,
      ...childSnapshot.val(),
    } as LocationHistoryEntry);
  });
  
  // Sort by timestamp descending (most recent first)
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return history;
};

// Subscribe to user's location history (real-time)
export const subscribeToLocationHistory = (
  userId: string,
  limit: number = 50,
  callback: (history: LocationHistoryEntry[]) => void
) => {
  const historyRef = ref(realtimeDb, `${LOCATION_HISTORY_PATH}/${userId}`);
  const historyQuery = rtdbQuery(historyRef, orderByChild("timestamp"), limitToLast(limit));

  const unsubscribe = onValue(historyQuery, (snapshot: DataSnapshot) => {
    const history: LocationHistoryEntry[] = [];
    
    snapshot.forEach((childSnapshot) => {
      history.push({
        id: childSnapshot.key!,
        ...childSnapshot.val(),
      } as LocationHistoryEntry);
    });
    
    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    callback(history);
  });

  return () => off(historyRef);
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

// Get location update stats for today
export const getTodayLocationStats = async (
  userId: string
): Promise<{
  totalUpdates: number;
  firstLocation: LocationHistoryEntry | null;
  lastLocation: LocationHistoryEntry | null;
  totalDistanceTraveled: number;
}> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISOString = today.toISOString();

  const history = await getUserLocationHistory(userId, 1000);
  
  // Filter for today's entries
  const todayEntries = history.filter(
    (entry) => new Date(entry.timestamp) >= today
  );

  if (todayEntries.length === 0) {
    return {
      totalUpdates: 0,
      firstLocation: null,
      lastLocation: null,
      totalDistanceTraveled: 0,
    };
  }

  // Sort by timestamp ascending for distance calculation
  const sortedEntries = [...todayEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate total distance traveled
  let totalDistance = 0;
  for (let i = 1; i < sortedEntries.length; i++) {
    totalDistance += calculateDistance(
      sortedEntries[i - 1].latitude,
      sortedEntries[i - 1].longitude,
      sortedEntries[i].latitude,
      sortedEntries[i].longitude
    );
  }

  return {
    totalUpdates: todayEntries.length,
    firstLocation: sortedEntries[0],
    lastLocation: sortedEntries[sortedEntries.length - 1],
    totalDistanceTraveled: Math.round(totalDistance),
  };
};
