"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Geolocation, Position } from "@capacitor/geolocation";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: PermissionState | null;
  timestamp: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
  watchPosition: false,
};

// Check if running in Capacitor native app
const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.isNativePlatform?.();
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permissionStatus: null,
    timestamp: null,
  });

  const [permissionChecked, setPermissionChecked] = useState(false);
  const watchIdRef = useRef<string | number | null>(null);

  // Check permission status using Capacitor for native, web API for browser
  const checkPermission = useCallback(async (): Promise<PermissionState | null> => {
    if (typeof navigator === "undefined") {
      setState((prev) => ({ ...prev, permissionStatus: "prompt" }));
      setPermissionChecked(true);
      return "prompt";
    }

    // Use Capacitor for native app
    if (isNativeApp()) {
      try {
        const status = await Geolocation.checkPermissions();
        let permState: PermissionState = "prompt";
        
        if (status.location === "granted" || status.coarseLocation === "granted") {
          permState = "granted";
        } else if (status.location === "denied") {
          permState = "denied";
        }
        
        setState((prev) => ({ ...prev, permissionStatus: permState }));
        setPermissionChecked(true);
        return permState;
      } catch (error) {
        console.error("Error checking Capacitor permissions:", error);
        setState((prev) => ({ ...prev, permissionStatus: "prompt" }));
        setPermissionChecked(true);
        return "prompt";
      }
    }
    
    // Use web Permissions API for browser
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        result.addEventListener("change", () => {
          setState((prev) => ({ ...prev, permissionStatus: result.state }));
        });
        setState((prev) => ({ ...prev, permissionStatus: result.state }));
        setPermissionChecked(true);
        return result.state;
      } catch {
        setState((prev) => ({ ...prev, permissionStatus: "prompt" }));
        setPermissionChecked(true);
        return "prompt";
      }
    }
    
    setState((prev) => ({ ...prev, permissionStatus: "prompt" }));
    setPermissionChecked(true);
    return "prompt";
  }, []);

  // Handle Capacitor position success
  const handleCapacitorSuccess = useCallback((position: Position) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
      permissionStatus: "granted",
      timestamp: position.timestamp,
    });
  }, []);

  // Handle web geolocation success
  const handleWebSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
      permissionStatus: "granted",
      timestamp: position.timestamp,
    });
  }, []);

  // Handle errors
  const handleError = useCallback((error: GeolocationPositionError | Error | unknown) => {
    let errorMessage = "Unknown error occurred";
    let newPermissionStatus: PermissionState | null = null;
    
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please enable location access in your device settings.";
          newPermissionStatus = "denied";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable. Please ensure GPS is enabled.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.toLowerCase().includes("denied") || errorMessage.toLowerCase().includes("permission")) {
        newPermissionStatus = "denied";
      }
    }
    
    setState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
      ...(newPermissionStatus ? { permissionStatus: newPermissionStatus } : {}),
    }));
  }, []);

  // Request location - handles both native and web
  const requestLocation = useCallback(async () => {
    // Skip if already loading
    if (state.loading) return;
    
    // If permission is already granted and we have location, just start watching
    // This avoids showing unnecessary dialogs
    if (state.permissionStatus === "granted" && state.latitude && state.longitude) {
      // Already have location, no need to request again unless watchPosition
      if (!mergedOptions.watchPosition) return;
    }
    
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Use Capacitor for native app
    if (isNativeApp()) {
      try {
        // Only request permissions if not already granted
        if (state.permissionStatus !== "granted") {
          const permResult = await Geolocation.requestPermissions();
          
          if (permResult.location === "denied") {
            setState((prev) => ({
              ...prev,
              error: "Location permission denied. Please enable location in your device settings.",
              loading: false,
              permissionStatus: "denied",
            }));
            return;
          }
        }

        if (mergedOptions.watchPosition) {
          // Clear existing watch
          if (watchIdRef.current !== null && typeof watchIdRef.current === "string") {
            await Geolocation.clearWatch({ id: watchIdRef.current });
          }
          
          const id = await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: mergedOptions.timeout,
              maximumAge: 0,
            },
            (position, err) => {
              if (err) {
                handleError(err);
              } else if (position) {
                handleCapacitorSuccess(position);
              }
            }
          );
          watchIdRef.current = id;
        } else {
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: mergedOptions.timeout,
            maximumAge: 0,
          });
          handleCapacitorSuccess(position);
        }
      } catch (error) {
        handleError(error);
      }
      return;
    }

    // Use web geolocation for browser
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: mergedOptions.timeout,
      maximumAge: 0,
    };

    if (mergedOptions.watchPosition) {
      if (watchIdRef.current !== null && typeof watchIdRef.current === "number") {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      const id = navigator.geolocation.watchPosition(
        handleWebSuccess,
        handleError,
        geoOptions
      );
      watchIdRef.current = id;
    } else {
      navigator.geolocation.getCurrentPosition(
        handleWebSuccess,
        handleError,
        geoOptions
      );
    }
  }, [mergedOptions.timeout, mergedOptions.watchPosition, handleCapacitorSuccess, handleWebSuccess, handleError]);

  // Clear watch
  const clearWatch = useCallback(async () => {
    if (watchIdRef.current !== null) {
      if (isNativeApp() && typeof watchIdRef.current === "string") {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } else if (typeof watchIdRef.current === "number") {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  }, []);

  // Refresh location
  const refreshLocation = useCallback(async () => {
    await clearWatch();
    requestLocation();
  }, [clearWatch, requestLocation]);

  // Initial permission check
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Auto-request location when watchPosition is enabled and permission is granted
  useEffect(() => {
    if (mergedOptions.watchPosition && state.permissionStatus === "granted" && !state.latitude && !state.loading) {
      requestLocation();
    }
  }, [mergedOptions.watchPosition, state.permissionStatus, state.latitude, state.loading, requestLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        if (isNativeApp() && typeof watchIdRef.current === "string") {
          Geolocation.clearWatch({ id: watchIdRef.current });
        } else if (typeof watchIdRef.current === "number") {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
    };
  }, []);

  return {
    ...state,
    permissionChecked,
    requestLocation,
    refreshLocation,
    clearWatch,
    checkPermission,
    isSupported: typeof navigator !== "undefined" && ("geolocation" in navigator || isNativeApp()),
    isNative: isNativeApp(),
  };
}

export default useGeolocation;
