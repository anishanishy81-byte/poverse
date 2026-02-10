// Network Status Utility
// Provides consistent network status detection for both web and native apps

import { Network, ConnectionStatus, ConnectionType } from "@capacitor/network";
import { isNativeApp } from "@/lib/platform";

export interface NetworkState {
  isConnected: boolean;
  connectionType: ConnectionType;
}

// Listeners for network status changes
type NetworkStatusListener = (status: NetworkState) => void;
const listeners: Set<NetworkStatusListener> = new Set();

let currentStatus: NetworkState = {
  isConnected: true,
  connectionType: "unknown",
};

let initialized = false;
let networkListenerHandle: { remove: () => void } | null = null;

// Initialize network monitoring
export const initializeNetworkMonitoring = async (): Promise<void> => {
  if (initialized) return;
  initialized = true;

  if (isNativeApp()) {
    // Use Capacitor Network plugin for native apps
    try {
      const status = await Network.getStatus();
      currentStatus = {
        isConnected: status.connected,
        connectionType: status.connectionType,
      };

      // Listen for network status changes
      networkListenerHandle = await Network.addListener("networkStatusChange", (status: ConnectionStatus) => {
        currentStatus = {
          isConnected: status.connected,
          connectionType: status.connectionType,
        };
        notifyListeners();
      });
    } catch (error) {
      console.error("Failed to initialize network monitoring:", error);
      // Fallback to navigator.onLine
      currentStatus.isConnected = navigator.onLine;
    }
  } else {
    // Use browser's online/offline events for web
    currentStatus.isConnected = navigator.onLine;
    currentStatus.connectionType = navigator.onLine ? "wifi" : "none";

    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);
  }
};

// Cleanup network monitoring
export const cleanupNetworkMonitoring = (): void => {
  if (!isNativeApp()) {
    window.removeEventListener("online", handleBrowserOnline);
    window.removeEventListener("offline", handleBrowserOffline);
  }

  if (networkListenerHandle) {
    networkListenerHandle.remove();
    networkListenerHandle = null;
  }

  listeners.clear();
  initialized = false;
};

// Browser event handlers
const handleBrowserOnline = () => {
  currentStatus = {
    isConnected: true,
    connectionType: "wifi",
  };
  notifyListeners();
};

const handleBrowserOffline = () => {
  currentStatus = {
    isConnected: false,
    connectionType: "none",
  };
  notifyListeners();
};

// Notify all listeners of status change
const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(currentStatus);
    } catch (error) {
      console.error("Network listener error:", error);
    }
  });
};

// Get current network status
export const getNetworkStatus = (): NetworkState => {
  return { ...currentStatus };
};

// Check if currently connected
export const isNetworkConnected = (): boolean => {
  return currentStatus.isConnected;
};

// Subscribe to network status changes
export const subscribeToNetworkStatus = (listener: NetworkStatusListener): (() => void) => {
  listeners.add(listener);
  
  // Immediately call with current status
  listener(currentStatus);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
};

// Force refresh network status (useful after app resumes)
export const refreshNetworkStatus = async (): Promise<NetworkState> => {
  if (isNativeApp()) {
    try {
      const status = await Network.getStatus();
      currentStatus = {
        isConnected: status.connected,
        connectionType: status.connectionType,
      };
      notifyListeners();
    } catch (error) {
      console.error("Failed to refresh network status:", error);
    }
  } else {
    currentStatus.isConnected = navigator.onLine;
    currentStatus.connectionType = navigator.onLine ? "wifi" : "none";
    notifyListeners();
  }
  
  return { ...currentStatus };
};
