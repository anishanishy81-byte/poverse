// Route Optimization Types

export interface RouteWaypoint {
  id: string;
  targetId: string;
  targetName: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  visitStatus: "pending" | "visited" | "skipped" | "current";
  order: number;
  estimatedArrival?: string;
  estimatedDuration?: number; // minutes at location
  distanceFromPrevious?: number; // meters
  durationFromPrevious?: number; // seconds
}

export interface RouteStep {
  instruction: string;
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  startLocation: {
    lat: number;
    lng: number;
  };
  endLocation: {
    lat: number;
    lng: number;
  };
  maneuver?: string;
  polyline: string;
}

export interface RouteLeg {
  startAddress: string;
  endAddress: string;
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  durationInTraffic?: {
    text: string;
    value: number;
  };
  steps: RouteStep[];
  waypointIndex: number;
}

export interface OptimizedRoute {
  id: string;
  userId: string;
  companyId: string;
  
  // Route info
  waypoints: RouteWaypoint[];
  waypointOrder: number[]; // Optimized order of waypoint indices
  
  // Origin (current location)
  origin: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  
  // Totals
  totalDistance: {
    text: string;
    value: number; // meters
  };
  totalDuration: {
    text: string;
    value: number; // seconds
  };
  totalDurationInTraffic?: {
    text: string;
    value: number;
  };
  
  // Route details
  legs: RouteLeg[];
  overviewPolyline: string;
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  
  // Metadata
  optimizedAt: string;
  expiresAt: string;
  
  // Progress
  currentWaypointIndex: number;
  visitedWaypoints: string[]; // IDs of visited waypoints
  
  // Status
  status: "planning" | "active" | "paused" | "completed" | "cancelled";
}

export interface RouteDirectionsRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  waypoints: {
    targetId: string;
    latitude: number;
    longitude: number;
  }[];
  optimizeWaypoints: boolean;
  travelMode: "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
  departureTime?: Date;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
}

export interface RouteETA {
  waypointId: string;
  estimatedArrival: string; // ISO timestamp
  durationFromCurrent: {
    text: string;
    value: number; // seconds
  };
  distanceFromCurrent: {
    text: string;
    value: number; // meters
  };
  traffic?: "light" | "moderate" | "heavy";
}

export interface NavigationLink {
  googleMapsUrl: string;
  appleMapsUrl: string;
  wazeUrl: string;
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

// Map display for visited vs remaining
export interface RouteMapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  label: string;
  title: string;
  type: "origin" | "visited" | "current" | "remaining" | "skipped";
  order: number;
  info?: {
    name: string;
    address: string;
    eta?: string;
    distance?: string;
    status: string;
  };
}

export interface RouteMapData {
  markers: RouteMapMarker[];
  polylinePath: { lat: number; lng: number }[];
  visitedPath: { lat: number; lng: number }[];
  remainingPath: { lat: number; lng: number }[];
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

// Route optimization algorithm options
export interface RouteOptimizationOptions {
  algorithm: "google" | "nearest-neighbor" | "genetic";
  returnToOrigin: boolean;
  maxWaypoints: number;
  priorityTargets?: string[]; // Target IDs to visit first
  timeWindows?: {
    targetId: string;
    startTime: string;
    endTime: string;
  }[];
}

// Route summary for display
export interface RouteSummary {
  totalTargets: number;
  visitedTargets: number;
  remainingTargets: number;
  skippedTargets: number;
  totalDistance: string;
  totalDuration: string;
  estimatedEndTime: string;
  nextTarget?: {
    name: string;
    eta: string;
    distance: string;
  };
  progress: number; // 0-100
}
