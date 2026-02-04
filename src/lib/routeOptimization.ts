// Route Optimization Library
import { realtimeDb } from "./firebase";
import { ref, get, set, push, onValue, off, update } from "firebase/database";
import {
  RouteWaypoint,
  OptimizedRoute,
  RouteDirectionsRequest,
  RouteETA,
  NavigationLink,
  RouteMapMarker,
  RouteMapData,
  RouteSummary,
  RouteOptimizationOptions,
  RouteLeg,
  RouteStep,
} from "@/types/route";
import { TargetVisit } from "@/types/target";

// Firebase path
const ROUTES_PATH = "optimizedRoutes";

// Helper to remove undefined values (Firebase RTDB doesn't accept undefined)
const removeUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const result = {} as T;
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      result[key] = value
        .filter((item) => item !== undefined)
        .map((item) =>
          item && typeof item === "object" && !Array.isArray(item)
            ? removeUndefined(item as Record<string, unknown>)
            : item
        ) as T[typeof key];
      continue;
    }

    if (value !== null && typeof value === "object") {
      result[key] = removeUndefined(value as Record<string, unknown>) as T[typeof key];
      continue;
    }

    result[key] = value;
  }
  return result;
};

// ==================== NAVIGATION LINKS ====================

export const generateNavigationLinks = (
  destination: { name: string; latitude: number; longitude: number },
  origin?: { latitude: number; longitude: number }
): NavigationLink => {
  const destLat = destination.latitude;
  const destLng = destination.longitude;
  const destName = encodeURIComponent(destination.name);
  
  // Google Maps URL with directions
  let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=&travelmode=driving`;
  if (origin) {
    googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  
  // Apple Maps URL
  const appleMapsUrl = origin
    ? `http://maps.apple.com/?saddr=${origin.latitude},${origin.longitude}&daddr=${destLat},${destLng}&dirflg=d`
    : `http://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=d`;
  
  // Waze URL
  const wazeUrl = `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
  
  return {
    googleMapsUrl,
    appleMapsUrl,
    wazeUrl,
    destination,
  };
};

// Open navigation in default map app
export const openNavigation = (
  destination: { name: string; latitude: number; longitude: number },
  origin?: { latitude: number; longitude: number },
  preferredApp: "google" | "apple" | "waze" = "google"
): void => {
  const links = generateNavigationLinks(destination, origin);
  
  let url: string;
  switch (preferredApp) {
    case "apple":
      url = links.appleMapsUrl;
      break;
    case "waze":
      url = links.wazeUrl;
      break;
    default:
      url = links.googleMapsUrl;
  }
  
  window.open(url, "_blank");
};

// ==================== GOOGLE DIRECTIONS API ====================

interface DirectionsResponse {
  routes: {
    legs: {
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      duration_in_traffic?: { text: string; value: number };
      start_address: string;
      end_address: string;
      steps: {
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
        html_instructions: string;
        maneuver?: string;
        polyline: { points: string };
      }[];
    }[];
    overview_polyline: { points: string };
    bounds: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    waypoint_order: number[];
  }[];
  status: string;
}

export const getDirections = async (
  request: RouteDirectionsRequest
): Promise<{
  success: boolean;
  data?: DirectionsResponse;
  error?: string;
}> => {
  try {
    // Use Google Maps JavaScript API DirectionsService
    const directionsService = new google.maps.DirectionsService();
    
    const waypoints = request.waypoints.map((wp) => ({
      location: new google.maps.LatLng(wp.latitude, wp.longitude),
      stopover: true,
    }));
    
    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(
        {
          origin: new google.maps.LatLng(request.origin.latitude, request.origin.longitude),
          destination: waypoints.length > 0 
            ? waypoints[waypoints.length - 1].location 
            : new google.maps.LatLng(request.origin.latitude, request.origin.longitude),
          waypoints: waypoints.slice(0, -1),
          optimizeWaypoints: request.optimizeWaypoints,
          travelMode: google.maps.TravelMode[request.travelMode],
          drivingOptions: request.departureTime
            ? {
                departureTime: request.departureTime,
                trafficModel: google.maps.TrafficModel.BEST_GUESS,
              }
            : undefined,
          avoidTolls: request.avoidTolls,
          avoidHighways: request.avoidHighways,
          avoidFerries: request.avoidFerries,
        },
        (response, status) => {
          if (status === google.maps.DirectionsStatus.OK && response) {
            resolve(response);
          } else {
            reject(new Error(status));
          }
        }
      );
    });
    
    // Convert to our format
    const route = result.routes[0];
    const data: DirectionsResponse = {
      routes: [
        {
          legs: route.legs.map((leg) => ({
            distance: { text: leg.distance?.text || "", value: leg.distance?.value || 0 },
            duration: { text: leg.duration?.text || "", value: leg.duration?.value || 0 },
            duration_in_traffic: leg.duration_in_traffic
              ? { text: leg.duration_in_traffic.text, value: leg.duration_in_traffic.value }
              : undefined,
            start_address: leg.start_address || "",
            end_address: leg.end_address || "",
            steps: leg.steps.map((step) => ({
              distance: { text: step.distance?.text || "", value: step.distance?.value || 0 },
              duration: { text: step.duration?.text || "", value: step.duration?.value || 0 },
              start_location: { lat: step.start_location.lat(), lng: step.start_location.lng() },
              end_location: { lat: step.end_location.lat(), lng: step.end_location.lng() },
              html_instructions: step.instructions || "",
              maneuver: step.maneuver,
              polyline: { points: step.polyline?.points || "" },
            })),
          })),
          overview_polyline: { points: route.overview_polyline || "" },
          bounds: {
            northeast: {
              lat: route.bounds?.getNorthEast().lat() || 0,
              lng: route.bounds?.getNorthEast().lng() || 0,
            },
            southwest: {
              lat: route.bounds?.getSouthWest().lat() || 0,
              lng: route.bounds?.getSouthWest().lng() || 0,
            },
          },
          waypoint_order: route.waypoint_order || [],
        },
      ],
      status: "OK",
    };
    
    return { success: true, data };
  } catch (error) {
    console.error("Directions API error:", error);
    return { success: false, error: String(error) };
  }
};

// ==================== ROUTE OPTIMIZATION ====================

// Nearest Neighbor Algorithm for route optimization
export const optimizeRouteNearestNeighbor = (
  origin: { latitude: number; longitude: number },
  waypoints: { id: string; latitude: number; longitude: number }[]
): number[] => {
  if (waypoints.length <= 1) return waypoints.map((_, i) => i);
  
  const visited: boolean[] = new Array(waypoints.length).fill(false);
  const order: number[] = [];
  let currentLat = origin.latitude;
  let currentLng = origin.longitude;
  
  for (let i = 0; i < waypoints.length; i++) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    
    for (let j = 0; j < waypoints.length; j++) {
      if (!visited[j]) {
        const dist = haversineDistance(
          currentLat,
          currentLng,
          waypoints[j].latitude,
          waypoints[j].longitude
        );
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIndex = j;
        }
      }
    }
    
    if (nearestIndex !== -1) {
      visited[nearestIndex] = true;
      order.push(nearestIndex);
      currentLat = waypoints[nearestIndex].latitude;
      currentLng = waypoints[nearestIndex].longitude;
    }
  }
  
  return order;
};

// Haversine distance calculation
const haversineDistance = (
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

// ==================== CREATE OPTIMIZED ROUTE ====================

export const createOptimizedRoute = async (
  userId: string,
  companyId: string,
  origin: { latitude: number; longitude: number; address?: string },
  targets: TargetVisit[],
  options: RouteOptimizationOptions = {
    algorithm: "google",
    returnToOrigin: false,
    maxWaypoints: 10,
  }
): Promise<{ success: boolean; route?: OptimizedRoute; error?: string }> => {
  try {
    // Limit waypoints
    const limitedTargets = targets.slice(0, options.maxWaypoints);
    
    // Prepare waypoints
    const waypointData = limitedTargets.map((t, index) => ({
      id: t.id,
      targetId: t.targetId,
      latitude: t.location.latitude,
      longitude: t.location.longitude,
    }));
    
    let waypointOrder: number[];
    let directionsResult: DirectionsResponse | undefined;
    
    if (options.algorithm === "google" && waypointData.length > 1) {
      // Use Google Directions API with optimization
      const directionsResponse = await getDirections({
        origin,
        waypoints: waypointData,
        optimizeWaypoints: true,
        travelMode: "DRIVING",
        departureTime: new Date(),
      });
      
      if (directionsResponse.success && directionsResponse.data) {
        directionsResult = directionsResponse.data;
        waypointOrder = directionsResult.routes[0].waypoint_order;
        // Add the last waypoint index since it's the destination
        if (waypointOrder.length < waypointData.length) {
          waypointOrder.push(waypointData.length - 1);
        }
      } else {
        // Fallback to nearest neighbor
        waypointOrder = optimizeRouteNearestNeighbor(origin, waypointData);
      }
    } else {
      // Use nearest neighbor algorithm
      waypointOrder = optimizeRouteNearestNeighbor(origin, waypointData);
    }
    
    // Build waypoints in optimized order
    const waypoints: RouteWaypoint[] = waypointOrder.map((originalIndex, newOrder) => {
      const target = limitedTargets[originalIndex];
      const leg = directionsResult?.routes[0].legs[newOrder];
      
      return {
        id: target.id,
        targetId: target.targetId,
        targetName: target.targetName,
        location: {
          latitude: target.location.latitude,
          longitude: target.location.longitude,
          address: target.location.address,
        },
        visitStatus: "pending",
        order: newOrder,
        distanceFromPrevious: leg?.distance.value,
        durationFromPrevious: leg?.duration.value,
      };
    });
    
    // Calculate ETAs
    let cumulativeSeconds = 0;
    const now = new Date();
    waypoints.forEach((wp, index) => {
      if (wp.durationFromPrevious) {
        cumulativeSeconds += wp.durationFromPrevious;
      }
      const eta = new Date(now.getTime() + cumulativeSeconds * 1000);
      wp.estimatedArrival = eta.toISOString();
    });
    
    // Build route legs
    const legs: RouteLeg[] = directionsResult?.routes[0].legs.map((leg, index) => ({
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      distance: leg.distance,
      duration: leg.duration,
      durationInTraffic: leg.duration_in_traffic,
      steps: leg.steps.map((step) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ""), // Remove HTML tags
        distance: step.distance,
        duration: step.duration,
        startLocation: step.start_location,
        endLocation: step.end_location,
        maneuver: step.maneuver,
        polyline: step.polyline.points,
      })),
      waypointIndex: index,
    })) || [];
    
    // Calculate totals
    const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value, 0);
    
    const route: OptimizedRoute = {
      id: `route_${Date.now()}`,
      userId,
      companyId,
      waypoints,
      waypointOrder,
      origin,
      totalDistance: {
        text: formatDistance(totalDistance),
        value: totalDistance,
      },
      totalDuration: {
        text: formatDuration(totalDuration),
        value: totalDuration,
      },
      legs,
      overviewPolyline: directionsResult?.routes[0].overview_polyline.points || "",
      bounds: directionsResult?.routes[0].bounds || {
        northeast: { lat: 0, lng: 0 },
        southwest: { lat: 0, lng: 0 },
      },
      optimizedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      currentWaypointIndex: 0,
      visitedWaypoints: [],
      status: "planning",
    };
    
    // Save to Firebase
    const routeRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}/${route.id}`);
    await set(routeRef, removeUndefined(route as unknown as Record<string, unknown>));
    
    return { success: true, route };
  } catch (error) {
    console.error("Error creating optimized route:", error);
    return { success: false, error: String(error) };
  }
};

// ==================== ROUTE MANAGEMENT ====================

export const getActiveRoute = async (
  userId: string
): Promise<OptimizedRoute | null> => {
  try {
    const routesRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}`);
    const snapshot = await get(routesRef);
    
    if (!snapshot.exists()) return null;
    
    let activeRoute: OptimizedRoute | null = null;
    snapshot.forEach((child) => {
      const route = child.val() as OptimizedRoute;
      if (route.status === "active" || route.status === "planning") {
        if (!activeRoute || new Date(route.optimizedAt) > new Date(activeRoute.optimizedAt)) {
          activeRoute = route;
        }
      }
    });
    
    return activeRoute;
  } catch (error) {
    console.error("Error getting active route:", error);
    return null;
  }
};

export const subscribeToActiveRoute = (
  userId: string,
  callback: (route: OptimizedRoute | null) => void
): (() => void) => {
  const routesRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}`);
  
  const unsubscribe = onValue(routesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    
    let activeRoute: OptimizedRoute | null = null;
    snapshot.forEach((child) => {
      const route = child.val() as OptimizedRoute;
      if (route.status === "active" || route.status === "planning") {
        if (!activeRoute || new Date(route.optimizedAt) > new Date(activeRoute.optimizedAt)) {
          activeRoute = route;
        }
      }
    });
    
    callback(activeRoute);
  });
  
  return () => off(routesRef);
};

export const startRoute = async (
  userId: string,
  routeId: string
): Promise<boolean> => {
  try {
    const routeRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}/${routeId}`);
    await update(routeRef, {
      status: "active",
      startedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error starting route:", error);
    return false;
  }
};

export const pauseRoute = async (
  userId: string,
  routeId: string
): Promise<boolean> => {
  try {
    const routeRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}/${routeId}`);
    await update(routeRef, {
      status: "paused",
      pausedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error pausing route:", error);
    return false;
  }
};

export const completeRouteWaypoint = async (
  userId: string,
  routeId: string,
  waypointId: string
): Promise<boolean> => {
  try {
    const routeRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}/${routeId}`);
    const snapshot = await get(routeRef);
    
    if (!snapshot.exists()) return false;
    
    const route = snapshot.val() as OptimizedRoute;
    const waypointIndex = route.waypoints.findIndex((wp) => wp.id === waypointId);
    
    if (waypointIndex === -1) return false;
    
    // Update waypoint status
    route.waypoints[waypointIndex].visitStatus = "visited";
    route.visitedWaypoints.push(waypointId);
    
    // Move to next waypoint
    if (waypointIndex < route.waypoints.length - 1) {
      route.currentWaypointIndex = waypointIndex + 1;
      route.waypoints[waypointIndex + 1].visitStatus = "current";
    } else {
      // All waypoints completed
      route.status = "completed";
    }
    
    await set(routeRef, route);
    return true;
  } catch (error) {
    console.error("Error completing waypoint:", error);
    return false;
  }
};

export const skipRouteWaypoint = async (
  userId: string,
  routeId: string,
  waypointId: string
): Promise<boolean> => {
  try {
    const routeRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}/${routeId}`);
    const snapshot = await get(routeRef);
    
    if (!snapshot.exists()) return false;
    
    const route = snapshot.val() as OptimizedRoute;
    const waypointIndex = route.waypoints.findIndex((wp) => wp.id === waypointId);
    
    if (waypointIndex === -1) return false;
    
    // Update waypoint status
    route.waypoints[waypointIndex].visitStatus = "skipped";
    
    // Move to next waypoint
    if (waypointIndex < route.waypoints.length - 1) {
      route.currentWaypointIndex = waypointIndex + 1;
      route.waypoints[waypointIndex + 1].visitStatus = "current";
    }
    
    await set(routeRef, route);
    return true;
  } catch (error) {
    console.error("Error skipping waypoint:", error);
    return false;
  }
};

export const cancelRoute = async (
  userId: string,
  routeId: string
): Promise<boolean> => {
  try {
    const routeRef = ref(realtimeDb, `${ROUTES_PATH}/${userId}/${routeId}`);
    await update(routeRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error cancelling route:", error);
    return false;
  }
};

// ==================== ETA CALCULATIONS ====================

export const calculateETAs = (
  route: OptimizedRoute,
  currentLocation?: { latitude: number; longitude: number }
): RouteETA[] => {
  const now = new Date();
  const etas: RouteETA[] = [];
  let cumulativeSeconds = 0;
  
  // Start from current waypoint
  const startIndex = route.currentWaypointIndex;
  
  for (let i = startIndex; i < route.waypoints.length; i++) {
    const waypoint = route.waypoints[i];
    
    if (waypoint.visitStatus === "visited" || waypoint.visitStatus === "skipped") {
      continue;
    }
    
    // Add duration from previous waypoint
    if (waypoint.durationFromPrevious) {
      cumulativeSeconds += waypoint.durationFromPrevious;
    }
    
    // Add estimated time at location (default 15 minutes)
    const timeAtLocation = waypoint.estimatedDuration || 15 * 60;
    
    const arrivalTime = new Date(now.getTime() + cumulativeSeconds * 1000);
    
    etas.push({
      waypointId: waypoint.id,
      estimatedArrival: arrivalTime.toISOString(),
      durationFromCurrent: {
        text: formatDuration(cumulativeSeconds),
        value: cumulativeSeconds,
      },
      distanceFromCurrent: {
        text: formatDistance(waypoint.distanceFromPrevious || 0),
        value: waypoint.distanceFromPrevious || 0,
      },
    });
    
    cumulativeSeconds += timeAtLocation;
  }
  
  return etas;
};

// ==================== MAP DATA ====================

export const getRouteMapData = (
  route: OptimizedRoute,
  currentLocation?: { lat: number; lng: number }
): RouteMapData => {
  const markers: RouteMapMarker[] = [];
  const visitedPath: { lat: number; lng: number }[] = [];
  const remainingPath: { lat: number; lng: number }[] = [];
  
  // Add origin marker
  markers.push({
    id: "origin",
    position: { lat: route.origin.latitude, lng: route.origin.longitude },
    label: "S",
    title: "Start",
    type: "origin",
    order: 0,
    info: {
      name: "Starting Point",
      address: route.origin.address || "Current Location",
      status: "Start",
    },
  });
  
  // Start path from origin
  visitedPath.push({ lat: route.origin.latitude, lng: route.origin.longitude });
  
  // Add waypoint markers
  route.waypoints.forEach((waypoint, index) => {
    const position = {
      lat: waypoint.location.latitude,
      lng: waypoint.location.longitude,
    };
    
    let markerType: RouteMapMarker["type"];
    switch (waypoint.visitStatus) {
      case "visited":
        markerType = "visited";
        visitedPath.push(position);
        break;
      case "current":
        markerType = "current";
        remainingPath.push(position);
        break;
      case "skipped":
        markerType = "skipped";
        break;
      default:
        markerType = "remaining";
        remainingPath.push(position);
    }
    
    markers.push({
      id: waypoint.id,
      position,
      label: String(index + 1),
      title: waypoint.targetName,
      type: markerType,
      order: waypoint.order + 1,
      info: {
        name: waypoint.targetName,
        address: waypoint.location.address,
        eta: waypoint.estimatedArrival
          ? new Date(waypoint.estimatedArrival).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined,
        distance: waypoint.distanceFromPrevious
          ? formatDistance(waypoint.distanceFromPrevious)
          : undefined,
        status: waypoint.visitStatus,
      },
    });
  });
  
  // Decode overview polyline
  const polylinePath = route.overviewPolyline
    ? decodePolyline(route.overviewPolyline)
    : [...visitedPath, ...remainingPath];
  
  return {
    markers,
    polylinePath,
    visitedPath,
    remainingPath,
    bounds: route.bounds,
    currentLocation,
  };
};

// ==================== ROUTE SUMMARY ====================

export const getRouteSummary = (route: OptimizedRoute): RouteSummary => {
  const totalTargets = route.waypoints.length;
  const visitedTargets = route.waypoints.filter((wp) => wp.visitStatus === "visited").length;
  const skippedTargets = route.waypoints.filter((wp) => wp.visitStatus === "skipped").length;
  const remainingTargets = totalTargets - visitedTargets - skippedTargets;
  
  const progress = totalTargets > 0 ? Math.round((visitedTargets / totalTargets) * 100) : 0;
  
  // Calculate estimated end time
  const remainingDuration = route.waypoints
    .filter((wp) => wp.visitStatus === "pending" || wp.visitStatus === "current")
    .reduce((sum, wp) => sum + (wp.durationFromPrevious || 0) + (wp.estimatedDuration || 900), 0);
  
  const estimatedEndTime = new Date(Date.now() + remainingDuration * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // Get next target
  const nextWaypoint = route.waypoints.find(
    (wp) => wp.visitStatus === "current" || wp.visitStatus === "pending"
  );
  
  return {
    totalTargets,
    visitedTargets,
    remainingTargets,
    skippedTargets,
    totalDistance: route.totalDistance.text,
    totalDuration: route.totalDuration.text,
    estimatedEndTime,
    nextTarget: nextWaypoint
      ? {
          name: nextWaypoint.targetName,
          eta: nextWaypoint.estimatedArrival
            ? new Date(nextWaypoint.estimatedArrival).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Calculating...",
          distance: nextWaypoint.distanceFromPrevious
            ? formatDistance(nextWaypoint.distanceFromPrevious)
            : "Calculating...",
        }
      : undefined,
    progress,
  };
};

// ==================== UTILITY FUNCTIONS ====================

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
};

// Decode Google polyline
const decodePolyline = (encoded: string): { lat: number; lng: number }[] => {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    
    shift = 0;
    result = 0;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    
    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }
  
  return points;
};

// Format time for display
export const formatTimeForDisplay = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Calculate time difference
export const getTimeUntil = (isoString: string): string => {
  const target = new Date(isoString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  
  if (diffMs < 0) return "Arrived";
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  return `${diffMins} min`;
};
