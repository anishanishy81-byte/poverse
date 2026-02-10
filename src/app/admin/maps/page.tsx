"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Chip,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  Drawer,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Badge,
  TextField,
  InputAdornment,
  Fab,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import CloseIcon from "@mui/icons-material/Close";
import DirectionsIcon from "@mui/icons-material/Directions";
import ChatIcon from "@mui/icons-material/Chat";
import FlagIcon from "@mui/icons-material/Flag";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MapIcon from "@mui/icons-material/Map";
import SatelliteAltIcon from "@mui/icons-material/SatelliteAlt";
import TerrainIcon from "@mui/icons-material/Terrain";
import LayersIcon from "@mui/icons-material/Layers";
import TrafficIcon from "@mui/icons-material/Traffic";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import PlaceIcon from "@mui/icons-material/Place";
import NavigationIcon from "@mui/icons-material/Navigation";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useAppStore, useCompany } from "@/store";
import { subscribeToAllUserLocations, LocationData, subscribeToLocationHistory, LocationHistoryEntry } from "@/lib/locationTracking";
import { subscribeToPresence } from "@/lib/chat";
import { subscribeToAgentAssignments, getAdminTarget } from "@/lib/adminTargets";
import { TargetAssignment, AdminTarget } from "@/types/adminTarget";
import { NavigationTrackingEntry, subscribeToUserActiveVisits, subscribeToCompanyPastVisits, subscribeToCompanyTargets } from "@/lib/targetTracking";
import { Target, TargetVisit } from "@/types/target";
import { realtimeDb } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";

// Presence data interface
interface PresenceInfo {
  isOnline: boolean;
  lastActive: string;
}

// Character avatars for Snapchat-like display
const CHARACTER_AVATARS = [
  "🧑‍💼", "👨‍💼", "👩‍💼", "🧑‍🔧", "👨‍🔧", "👩‍🔧",
  "🧑‍💻", "👨‍💻", "👩‍💻", "🧑‍🏫", "👨‍🏫", "👩‍🏫",
  "🦸", "🦸‍♂️", "🦸‍♀️", "🧙", "🧙‍♂️", "🧙‍♀️",
];

// Get consistent avatar for user based on their ID
const getCharacterAvatar = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return CHARACTER_AVATARS[Math.abs(hash) % CHARACTER_AVATARS.length];
};

// Get avatar color based on user ID
const getAvatarColor = (userId: string): string => {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
    "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
    "#8bc34a", "#cddc39", "#ffc107", "#ff9800", "#ff5722",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface AgentLocation extends LocationData {
  odisplayName?: string;
  isOnline?: boolean;
  lastActive?: string;
  character?: string;
  color?: string;
}

// Tracked agent with targets and navigation
interface TrackedAgentData {
  agent: AgentLocation;
  assignments: TargetAssignment[];
  targets: AdminTarget[];
  userTargets: Target[]; // Self-assigned targets
  activeVisits: TargetVisit[]; // Current active visits
  todayCompletedVisits: TargetVisit[]; // Today's completed visits
  activeNavigation: NavigationTrackingEntry | null;
  locationHistory: LocationHistoryEntry[]; // Today's location trail
}

// Smooth animation helper
const animateMarkerPosition = (
  marker: google.maps.Marker,
  fromPos: google.maps.LatLng,
  toPos: google.maps.LatLng,
  duration: number = 1000
) => {
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic for smooth deceleration
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    const lat = fromPos.lat() + (toPos.lat() - fromPos.lat()) * easeProgress;
    const lng = fromPos.lng() + (toPos.lng() - fromPos.lng()) * easeProgress;
    
    marker.setPosition({ lat, lng });
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

export default function AdminMapsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const company = useCompany();
  
  const [isLoading, setIsLoading] = useState(true);
  const [agentLocations, setAgentLocations] = useState<Map<string, AgentLocation>>(new Map());
  const [presenceData, setPresenceData] = useState<Map<string, PresenceInfo>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null);
  const [showAgentList, setShowAgentList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  
  // Map control states
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "terrain" | "hybrid">("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLocationHistory, setShowLocationHistory] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(5);
  const [agentLocationHistory, setAgentLocationHistory] = useState<LocationHistoryEntry[]>([]);
  
  // Agent tracking mode states
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackedAgent, setTrackedAgent] = useState<TrackedAgentData | null>(null);
  const [showTargetsOnMap, setShowTargetsOnMap] = useState(true);
  const [showNavigationRoute, setShowNavigationRoute] = useState(true);
  const [showVisitedPlaces, setShowVisitedPlaces] = useState(true);
  const [showLocationTrail, setShowLocationTrail] = useState(true);
  
  // Geocoder for reverse geocoding
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [resolvedAddresses, setResolvedAddresses] = useState<Map<string, string>>(new Map());
  
  // Map layer refs
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const historyPolylineRef = useRef<google.maps.Polyline | null>(null);
  const navigationPolylineRef = useRef<google.maps.Polyline | null>(null);
  const navigationRoutePolylineRef = useRef<google.maps.Polyline | null>(null);
  const locationTrailPolylineRef = useRef<google.maps.Polyline | null>(null);
  const targetMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const visitedPlaceMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  
  // Store previous positions for smooth animation
  const previousPositionsRef = useRef<Map<string, google.maps.LatLng>>(new Map());
  
  // NEVER auto-recenter - user controls map position
  const userHasInteractedRef = useRef(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "superadmin") {
      router.push("/dashboard");
      return;
    }
    setIsLoading(false);
  }, [isAuthenticated, user, router]);

  // Add global styles for animations (client-side only)
  useEffect(() => {
    const styleId = "admin-maps-animations";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!mapContainerRef.current || mapRef.current) return false;
      
      if (typeof window === "undefined" || !(window as any).google?.maps) {
        return false;
      }

      // Default center (India)
      const defaultCenter = { lat: 20.5937, lng: 78.9629 };
      
      mapRef.current = new (window as any).google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: true, // Enable street view
        fullscreenControl: false, // We'll use our own
        zoomControl: false, // We'll use our own
        rotateControl: true,
        scaleControl: true,
        gestureHandling: "greedy",
        mapTypeId: mapType,
        // Show all POI labels (shops, restaurants, places, etc.)
        styles: [],
      });
      
      // Initialize geocoder for reverse geocoding
      geocoderRef.current = new (window as any).google.maps.Geocoder();
      
      // Initialize traffic layer
      trafficLayerRef.current = new (window as any).google.maps.TrafficLayer();
      
      // Initialize transit layer
      transitLayerRef.current = new (window as any).google.maps.TransitLayer();
      
      // Track user interaction - NEVER auto-recenter after user interacts
      if (mapRef.current) {
        mapRef.current.addListener("dragstart", () => {
          userHasInteractedRef.current = true;
        });
        
        mapRef.current.addListener("zoom_changed", () => {
          userHasInteractedRef.current = true;
          if (mapRef.current) {
            setZoomLevel(mapRef.current.getZoom() || 5);
          }
        });
      }
      
      infoWindowRef.current = new (window as any).google.maps.InfoWindow();
      setMapsLoaded(true);
      return true;
    };

    if (initMap()) return;

    // Retry loading
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (initMap() || attempts >= 20) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Update map type when changed
  useEffect(() => {
    if (mapRef.current && mapsLoaded) {
      mapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, mapsLoaded]);

  // Toggle traffic layer
  useEffect(() => {
    if (!mapRef.current || !trafficLayerRef.current) return;
    
    if (showTraffic) {
      trafficLayerRef.current.setMap(mapRef.current);
    } else {
      trafficLayerRef.current.setMap(null);
    }
  }, [showTraffic, mapsLoaded]);

  // Toggle transit layer
  useEffect(() => {
    if (!mapRef.current || !transitLayerRef.current) return;
    
    if (showTransit) {
      transitLayerRef.current.setMap(mapRef.current);
    } else {
      transitLayerRef.current.setMap(null);
    }
  }, [showTransit, mapsLoaded]);

  // Load location history for selected agent
  useEffect(() => {
    if (!selectedAgent || !showLocationHistory) {
      // Clear history polyline
      if (historyPolylineRef.current) {
        historyPolylineRef.current.setMap(null);
        historyPolylineRef.current = null;
      }
      setAgentLocationHistory([]);
      return;
    }

    const unsubscribe = subscribeToLocationHistory(selectedAgent.userId, 50, (history) => {
      setAgentLocationHistory(history);
      
      // Draw polyline on map
      if (historyPolylineRef.current) {
        historyPolylineRef.current.setMap(null);
      }
      
      if (history.length > 1 && mapRef.current) {
        const path = history.map((h) => ({ lat: h.latitude, lng: h.longitude }));
        
        historyPolylineRef.current = new (window as any).google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: selectedAgent.color || "#4285F4",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          icons: [
            {
              icon: {
                path: (window as any).google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: selectedAgent.color || "#4285F4",
              },
              offset: "100%",
              repeat: "100px",
            },
          ],
          map: mapRef.current,
        });
      }
    });

    return () => unsubscribe();
  }, [selectedAgent, showLocationHistory]);

  // Subscribe to all user locations
  useEffect(() => {
    if (!company?.id) return;

    const unsubscribe = subscribeToAllUserLocations(company.id, (locations) => {
      const locationMap = new Map<string, AgentLocation>();
      
      locations.forEach((loc) => {
        locationMap.set(loc.userId, {
          ...loc,
          character: getCharacterAvatar(loc.userId),
          color: getAvatarColor(loc.userId),
        });
      });
      
      setAgentLocations(locationMap);
    });

    return () => unsubscribe();
  }, [company?.id]);

  // Subscribe to presence data
  useEffect(() => {
    if (!company?.id) return;

    // Get all agent IDs and subscribe to their presence
    const agentIds = Array.from(agentLocations.keys());
    if (agentIds.length === 0) return;

    const unsub = subscribeToPresence(agentIds, (presence) => {
      setPresenceData((prevMap) => {
        // Check if data actually changed to avoid unnecessary re-renders
        const newEntries = Object.entries(presence);
        if (prevMap.size === newEntries.length) {
          let hasChanged = false;
          for (const [userId, data] of newEntries) {
            const prev = prevMap.get(userId);
            if (!prev || prev.isOnline !== data.isOnline || prev.lastActive !== data.lastActive) {
              hasChanged = true;
              break;
            }
          }
          if (!hasChanged) return prevMap;
        }
        const newMap = new Map<string, PresenceInfo>();
        newEntries.forEach(([userId, data]) => {
          newMap.set(userId, data);
        });
        return newMap;
      });
    });

    return () => unsub();
  }, [company?.id, agentLocations.size]);

  // Reverse geocode to get address when missing
  const reverseGeocode = useCallback((lat: number, lng: number, agentId: string) => {
    if (!geocoderRef.current) return;
    if (resolvedAddresses.has(agentId)) return; // Already resolved
    
    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === "OK" && results && results[0]) {
          setResolvedAddresses((prev) => new Map(prev).set(agentId, results[0].formatted_address));
        }
      }
    );
  }, [resolvedAddresses]);

  // Get display address - from location data or reverse geocoded
  const getDisplayAddress = useCallback((agent: AgentLocation): string => {
    if (agent.address && agent.address !== "Location updating...") {
      return agent.address;
    }
    return resolvedAddresses.get(agent.userId) || "Fetching address...";
  }, [resolvedAddresses]);

  // Update markers on map with SMOOTH ANIMATION
  useEffect(() => {
    if (!mapRef.current || !mapsLoaded) return;

    // Update or create markers for each agent
    agentLocations.forEach((agent, agentId) => {
      if (!agent.latitude || !agent.longitude) return;
      
      const newPosition = new (window as any).google.maps.LatLng(agent.latitude, agent.longitude);
      const presence = presenceData.get(agentId);
      const isOnline = presence?.isOnline || false;

      // Reverse geocode if address is missing
      if (!agent.address) {
        reverseGeocode(agent.latitude, agent.longitude, agentId);
      }

      let marker = markersRef.current.get(agentId);
      
      if (marker) {
        // SMOOTH ANIMATION: Animate from previous position to new position
        const previousPos = previousPositionsRef.current.get(agentId);
        if (previousPos) {
          // Calculate distance to determine animation duration
          const distance = (window as any).google.maps.geometry?.spherical?.computeDistanceBetween?.(previousPos, newPosition) || 0;
          // Animate over 800ms for short distances, up to 2000ms for longer
          const duration = Math.min(Math.max(distance * 2, 800), 2000);
          animateMarkerPosition(marker, previousPos, newPosition, duration);
        } else {
          marker.setPosition(newPosition);
        }
      } else {
        // Create custom marker with character avatar
        marker = new (window as any).google.maps.Marker({
          map: mapRef.current,
          position: newPosition,
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="50" height="60" viewBox="0 0 50 60">
                <path d="M25 0C11.2 0 0 11.2 0 25c0 17.5 25 35 25 35s25-17.5 25-35C50 11.2 38.8 0 25 0z" fill="${agent.color}"/>
                <circle cx="25" cy="22" r="15" fill="white"/>
                <text x="25" y="28" text-anchor="middle" font-size="20">${agent.character}</text>
                <circle cx="40" cy="10" r="8" fill="${isOnline ? '#4caf50' : '#9e9e9e'}"/>
              </svg>
            `)}`,
            scaledSize: new (window as any).google.maps.Size(50, 60),
            anchor: new (window as any).google.maps.Point(25, 60),
          },
          title: agent.userName || 'Agent',
        });

        // Add click listener only if marker was created
        if (marker) {
          marker.addListener("click", () => {
            const displayAddr = getDisplayAddress(agent);
            setSelectedAgent({ ...agent, isOnline, address: displayAddr });
            
            if (infoWindowRef.current && mapRef.current && marker) {
              const content = `
                <div style="padding: 10px; min-width: 200px;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 32px;">${agent.character}</span>
                    <div>
                      <div style="font-weight: bold; font-size: 16px;">${agent.userName || 'Agent'}</div>
                      <div style="color: ${isOnline ? '#4caf50' : '#9e9e9e'}; font-size: 12px;">
                        ${isOnline ? '● Online' : '○ Offline'}
                      </div>
                    </div>
                  </div>
                  <div style="font-size: 12px; color: #666;">
                    📍 ${displayAddr}
                  </div>
                  <div style="font-size: 11px; color: #999; margin-top: 5px;">
                    Last update: ${new Date(agent.timestamp).toLocaleTimeString()}
                  </div>
                  <div style="margin-top: 8px;">
                    <button onclick="window.dispatchEvent(new CustomEvent('trackAgent', {detail: '${agentId}' }))" 
                      style="background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                      🎯 Track Agent
                    </button>
                  </div>
                </div>
              `;
              infoWindowRef.current.setContent(content);
              infoWindowRef.current.open(mapRef.current, marker);
            }
          });

          markersRef.current.set(agentId, marker);
        }
      }
      
      // Store current position for next animation
      previousPositionsRef.current.set(agentId, newPosition);
    });

    // Remove markers for agents no longer in the list
    markersRef.current.forEach((marker, agentId) => {
      if (!agentLocations.has(agentId)) {
        marker.setMap(null);
        markersRef.current.delete(agentId);
        previousPositionsRef.current.delete(agentId);
      }
    });

    // NEVER AUTO-RECENTER - User is in full control of the map
    // Map position only changes when user explicitly clicks "Fit All" or centers on an agent
  }, [agentLocations, presenceData, mapsLoaded, reverseGeocode, getDisplayAddress]);

  const handleCenterOnAgent = useCallback((agent: AgentLocation) => {
    if (!mapRef.current || !agent.latitude || !agent.longitude) return;
    
    mapRef.current.panTo({ lat: agent.latitude, lng: agent.longitude });
    mapRef.current.setZoom(16);
    setSelectedAgent(agent);
    setShowAgentList(false);
  }, []);

  const handleRefresh = useCallback(() => {
    // Force refresh by triggering re-render
    setAgentLocations(new Map(agentLocations));
  }, [agentLocations]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || 5;
      mapRef.current.setZoom(Math.min(currentZoom + 1, 21));
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || 5;
      mapRef.current.setZoom(Math.max(currentZoom - 1, 1));
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const mapContainer = document.getElementById("admin-maps-container");
    if (!document.fullscreenElement && mapContainer) {
      mapContainer.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleMapTypeChange = useCallback((_: React.MouseEvent<HTMLElement>, newType: string | null) => {
    if (newType && ["roadmap", "satellite", "terrain", "hybrid"].includes(newType)) {
      setMapType(newType as "roadmap" | "satellite" | "terrain" | "hybrid");
    }
  }, []);

  const fitAllAgents = useCallback(() => {
    if (mapRef.current && agentLocations.size > 0) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      agentLocations.forEach((agent) => {
        if (agent.latitude && agent.longitude) {
          bounds.extend({ lat: agent.latitude, lng: agent.longitude });
        }
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [agentLocations]);

  // Start tracking a specific agent (Rapido-like view)
  const startTrackingAgent = useCallback(async (agentId: string) => {
    const agent = agentLocations.get(agentId);
    if (!agent || !company?.id) return;
    
    setTrackingMode(true);
    setTrackedAgent({
      agent,
      assignments: [],
      targets: [],
      userTargets: [],
      activeVisits: [],
      todayCompletedVisits: [],
      activeNavigation: null,
      locationHistory: [],
    });
    
    // Center map on agent
    if (mapRef.current && agent.latitude && agent.longitude) {
      mapRef.current.panTo({ lat: agent.latitude, lng: agent.longitude });
      mapRef.current.setZoom(16);
    }
    
    setShowAgentList(false);
    infoWindowRef.current?.close();
  }, [agentLocations, company?.id]);

  // Stop tracking agent
  const stopTrackingAgent = useCallback(() => {
    setTrackingMode(false);
    setTrackedAgent(null);
    
    // Clear target markers
    targetMarkersRef.current.forEach((marker) => marker.setMap(null));
    targetMarkersRef.current.clear();
    
    // Clear visited places markers
    visitedPlaceMarkersRef.current.forEach((marker) => marker.setMap(null));
    visitedPlaceMarkersRef.current.clear();
    
    // Clear navigation routes
    if (navigationPolylineRef.current) {
      navigationPolylineRef.current.setMap(null);
      navigationPolylineRef.current = null;
    }
    if (navigationRoutePolylineRef.current) {
      navigationRoutePolylineRef.current.setMap(null);
      navigationRoutePolylineRef.current = null;
    }
    
    // Clear location trail
    if (locationTrailPolylineRef.current) {
      locationTrailPolylineRef.current.setMap(null);
      locationTrailPolylineRef.current = null;
    }
  }, []);

  // Listen for trackAgent events from info window
  useEffect(() => {
    const handleTrackAgent = (e: CustomEvent) => {
      startTrackingAgent(e.detail);
    };
    
    window.addEventListener("trackAgent", handleTrackAgent as EventListener);
    return () => window.removeEventListener("trackAgent", handleTrackAgent as EventListener);
  }, [startTrackingAgent]);

  // Subscribe to tracked agent's assignments and navigation
  useEffect(() => {
    if (!trackingMode || !trackedAgent || !company?.id) return;
    
    const agentId = trackedAgent.agent.userId;
    
    // Subscribe to agent assignments (admin-assigned targets)
    const unsubAssignments = subscribeToAgentAssignments(company.id, agentId, async (assignments) => {
      // Fetch target details for each assignment
      const targetPromises = assignments.map((a) => getAdminTarget(company.id, a.targetId));
      const targets = (await Promise.all(targetPromises)).filter((t): t is AdminTarget => t !== null);
      
      setTrackedAgent((prev) => prev ? { ...prev, assignments, targets } : null);
    });
    
    // Subscribe to user's self-created targets
    const unsubUserTargets = subscribeToCompanyTargets(company.id, (allTargets) => {
      // Filter targets created by this user (self-assigned)
      const userTargets = allTargets.filter((t) => t.createdBy === agentId);
      setTrackedAgent((prev) => prev ? { ...prev, userTargets } : null);
    });
    
    // Subscribe to user's active visits
    const unsubActiveVisits = subscribeToUserActiveVisits(agentId, (visits) => {
      setTrackedAgent((prev) => prev ? { ...prev, activeVisits: visits } : null);
    });
    
    // Subscribe to today's completed visits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const unsubPastVisits = subscribeToCompanyPastVisits(company.id, (visits) => {
      // Filter to today's completed visits only
      const todayCompleted = visits.filter((v) => {
        if (v.status !== "completed") return false;
        if (v.userId !== agentId) return false;
        
        // Check if completed today
        const completedDate = v.completedAt ? new Date(v.completedAt) : null;
        if (!completedDate) return false;
        
        const visitDay = new Date(completedDate);
        visitDay.setHours(0, 0, 0, 0);
        return visitDay.getTime() === today.getTime();
      });
      
      console.log("[Admin Maps] Today's completed visits for agent:", agentId, todayCompleted.length, todayCompleted);
      setTrackedAgent((prev) => prev ? { ...prev, todayCompletedVisits: todayCompleted } : null);
    }, {
      limit: 100
    });
    
    // Subscribe to today's location history (for trail)
    const unsubLocationHistory = subscribeToLocationHistory(agentId, 100, (history) => {
      // Filter to today's locations only
      const todayHistory = history.filter((loc) => {
        const locDate = new Date(loc.timestamp);
        locDate.setHours(0, 0, 0, 0);
        return locDate.getTime() === today.getTime();
      });
      setTrackedAgent((prev) => prev ? { ...prev, locationHistory: todayHistory } : null);
    });
    
    // Subscribe to agent's active navigation
    const navRef = ref(realtimeDb, "navigationTracking");
    const unsubNav = onValue(navRef, (snapshot) => {
      if (!snapshot.exists()) {
        setTrackedAgent((prev) => prev ? { ...prev, activeNavigation: null } : null);
        return;
      }
      
      let activeNav: NavigationTrackingEntry | null = null;
      snapshot.forEach((child) => {
        const nav = child.val() as NavigationTrackingEntry;
        if (nav.userId === agentId && nav.status === "in_progress") {
          activeNav = nav;
        }
      });
      
      setTrackedAgent((prev) => prev ? { ...prev, activeNavigation: activeNav } : null);
    });
    
    return () => {
      unsubAssignments();
      unsubUserTargets();
      unsubActiveVisits();
      unsubPastVisits();
      unsubLocationHistory();
      off(navRef);
    };
  }, [trackingMode, trackedAgent?.agent.userId, company?.id]);

  // Update tracked agent location when agentLocations change
  useEffect(() => {
    if (!trackingMode || !trackedAgent) return;
    
    const agentId = trackedAgent.agent.userId;
    const agentLocation = agentLocations.get(agentId);
    
    if (agentLocation) {
      // Use functional update to avoid dependency on trackedAgent
      setTrackedAgent((prev) => {
        if (!prev) return null;
        // Only update if location actually changed
        if (prev.agent.latitude === agentLocation.latitude && 
            prev.agent.longitude === agentLocation.longitude) {
          return prev; // No change, return same reference
        }
        return { ...prev, agent: { ...prev.agent, ...agentLocation } };
      });
    }
  }, [trackingMode, agentLocations]); // Removed trackedAgent from dependencies
  
  // Draw map elements for tracked agent
  useEffect(() => {
    if (!trackingMode || !trackedAgent || !mapRef.current || !mapsLoaded) return;
    
    // Use the agent's current location from trackedAgent state
    const agentLocation = trackedAgent.agent;
    
    // Draw target markers (admin-assigned and user self-assigned)
    if (showTargetsOnMap) {
      // Combine admin targets and user self-assigned targets
      const allTargets = [
        ...trackedAgent.targets.map((t) => ({ ...t, isAdminAssigned: true })),
        ...trackedAgent.userTargets
          .filter((ut) => !trackedAgent.targets.some((at) => at.id === ut.id)) // Avoid duplicates
          .map((t) => ({ ...t, isAdminAssigned: false })),
      ];
      
      // Clear old target markers
      targetMarkersRef.current.forEach((marker, targetId) => {
        if (!allTargets.find((t) => t.id === targetId)) {
          marker.setMap(null);
          targetMarkersRef.current.delete(targetId);
        }
      });
      
      // Add new target markers
      allTargets.forEach((target) => {
        if (!target.location?.latitude || !target.location?.longitude) return;
        
        const existingMarker = targetMarkersRef.current.get(target.id);
        if (!existingMarker) {
          const isActiveNav = trackedAgent.activeNavigation?.targetId === target.id;
          const isUserTarget = !('isAdminAssigned' in target) || !target.isAdminAssigned;
          
          const newMarker = new (window as any).google.maps.Marker({
            map: mapRef.current,
            position: { lat: target.location.latitude, lng: target.location.longitude },
            icon: {
              url: `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
                  <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 18 30 18 30s18-17.4 18-30C36 8.06 27.94 0 18 0z" 
                    fill="${isActiveNav ? '#f44336' : isUserTarget ? '#2196f3' : '#4caf50'}"/>
                  <circle cx="18" cy="16" r="10" fill="white"/>
                  <text x="18" y="20" text-anchor="middle" font-size="12" fill="${isActiveNav ? '#f44336' : isUserTarget ? '#2196f3' : '#4caf50'}">${isUserTarget ? '📌' : '🎯'}</text>
                </svg>
              `)}`,
              scaledSize: new (window as any).google.maps.Size(36, 48),
              anchor: new (window as any).google.maps.Point(18, 48),
            },
            title: target.name,
            zIndex: isActiveNav ? 1000 : 100,
          });
          
          newMarker.addListener("click", () => {
            if (infoWindowRef.current && mapRef.current) {
              infoWindowRef.current.setContent(`
                <div style="padding: 10px; min-width: 180px;">
                  <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">${isUserTarget ? '📌' : '🎯'} ${target.name}</div>
                  <div style="font-size: 12px; color: #666;">📍 ${target.location?.address || 'No address'}</div>
                  <div style="font-size: 11px; color: #999; margin-top: 3px;">${isUserTarget ? 'Self-assigned target' : 'Admin assigned'}</div>
                  ${isActiveNav ? '<div style="color: #f44336; font-size: 12px; margin-top: 5px;">🚗 Agent navigating here</div>' : ''}
                </div>
              `);
              infoWindowRef.current.open(mapRef.current, newMarker);
            }
          });
          
          targetMarkersRef.current.set(target.id, newMarker);
        }
      });
    }
    
    // Draw navigation route if agent is navigating
    if (showNavigationRoute && trackedAgent.activeNavigation && agentLocation) {
      const nav = trackedAgent.activeNavigation;
      // Look for target in admin-assigned, user self-assigned, or active visits
      let targetLocation: { latitude: number; longitude: number } | null = null;
      
      // Check admin-assigned targets
      const adminTarget = trackedAgent.targets.find((t) => t.id === nav.targetId);
      if (adminTarget?.location?.latitude && adminTarget?.location?.longitude) {
        targetLocation = { latitude: adminTarget.location.latitude, longitude: adminTarget.location.longitude };
      }
      
      // Check user self-assigned targets
      if (!targetLocation) {
        const userTarget = trackedAgent.userTargets?.find((t) => t.id === nav.targetId);
        if (userTarget?.location?.latitude && userTarget?.location?.longitude) {
          targetLocation = { latitude: userTarget.location.latitude, longitude: userTarget.location.longitude };
        }
      }
      
      // Check active visits (visits have location copied from target)
      if (!targetLocation) {
        const activeVisit = trackedAgent.activeVisits?.find((v) => v.targetId === nav.targetId);
        if (activeVisit?.location?.latitude && activeVisit?.location?.longitude) {
          targetLocation = { latitude: activeVisit.location.latitude, longitude: activeVisit.location.longitude };
        }
      }
      
      if (targetLocation) {
        // Draw route from agent to target
        if (navigationRoutePolylineRef.current) {
          navigationRoutePolylineRef.current.setMap(null);
        }
        
        // Use Directions API to get actual route
        const directionsService = new (window as any).google.maps.DirectionsService();
        directionsService.route(
          {
            origin: { lat: agentLocation.latitude, lng: agentLocation.longitude },
            destination: { lat: targetLocation.latitude, lng: targetLocation.longitude },
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
          },
          (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
            if (status === "OK" && result) {
              if (navigationRoutePolylineRef.current) {
                navigationRoutePolylineRef.current.setMap(null);
              }
              
              const route = result.routes[0];
              const path = route.overview_path;
              
              navigationRoutePolylineRef.current = new (window as any).google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: "#4285F4",
                strokeOpacity: 0.8,
                strokeWeight: 5,
                icons: [
                  {
                    icon: {
                      path: (window as any).google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 4,
                      strokeColor: "#4285F4",
                      fillColor: "#4285F4",
                      fillOpacity: 1,
                    },
                    offset: "100%",
                    repeat: "150px",
                  },
                ],
                map: mapRef.current,
              });
            }
          }
        );
        
        // Draw the trail of agent's traveled path
        if (nav.routePoints && nav.routePoints.length > 1) {
          if (navigationPolylineRef.current) {
            navigationPolylineRef.current.setMap(null);
          }
          
          const traveledPath = nav.routePoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
          
          navigationPolylineRef.current = new (window as any).google.maps.Polyline({
            path: traveledPath,
            geodesic: true,
            strokeColor: "#00C853",
            strokeOpacity: 1,
            strokeWeight: 4,
            map: mapRef.current,
          });
        }
      }
    } else {
      // Clear navigation routes
      if (navigationRoutePolylineRef.current) {
        navigationRoutePolylineRef.current.setMap(null);
        navigationRoutePolylineRef.current = null;
      }
      if (navigationPolylineRef.current) {
        navigationPolylineRef.current.setMap(null);
        navigationPolylineRef.current = null;
      }
    }
    
    // Draw today's visited places (completed visits)
    if (showVisitedPlaces && trackedAgent.todayCompletedVisits?.length > 0) {
      // Clear old visited place markers
      visitedPlaceMarkersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      visitedPlaceMarkersRef.current.clear();
      
      // Add markers for completed visits
      trackedAgent.todayCompletedVisits.forEach((visit) => {
        // Use reachedLocation if available, otherwise fall back to target's location
        const visitLocation = visit.reachedLocation || visit.location;
        if (!visitLocation?.latitude || !visitLocation?.longitude) return;
        
        const marker = new (window as any).google.maps.Marker({
          map: mapRef.current,
          position: { lat: visitLocation.latitude, lng: visitLocation.longitude },
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="#4caf50" stroke="white" stroke-width="2"/>
                <text x="16" y="21" text-anchor="middle" font-size="16" fill="white">✓</text>
              </svg>
            `)}`,
            scaledSize: new (window as any).google.maps.Size(32, 32),
            anchor: new (window as any).google.maps.Point(16, 16),
          },
          title: `Visited: ${visit.targetName}`,
          zIndex: 50,
        });
        
        marker.addListener("click", () => {
          if (infoWindowRef.current && mapRef.current) {
            const visitTime = visit.completedAt 
              ? new Date(visit.completedAt).toLocaleTimeString()
              : 'Unknown';
            const duration = visit.timerStartedAt && visit.completedAt
              ? Math.round((new Date(visit.completedAt).getTime() - new Date(visit.timerStartedAt).getTime()) / 60000)
              : visit.durationMinutes || null;
              
            infoWindowRef.current.setContent(`
              <div style="padding: 10px; min-width: 180px;">
                <div style="font-weight: bold; font-size: 14px; color: #4caf50; margin-bottom: 5px;">✓ ${visit.targetName}</div>
                <div style="font-size: 12px; color: #666;">⏰ Completed at ${visitTime}</div>
                ${duration ? `<div style="font-size: 12px; color: #666;">⏱️ Duration: ${duration} mins</div>` : ''}
                ${visit.outcome ? `<div style="font-size: 12px; color: #666;">📝 Outcome: ${visit.outcome}</div>` : ''}
              </div>
            `);
            infoWindowRef.current.open(mapRef.current, marker);
          }
        });
        
        visitedPlaceMarkersRef.current.set(visit.id, marker);
      });
    } else {
      // Clear visited place markers if toggle is off
      visitedPlaceMarkersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      visitedPlaceMarkersRef.current.clear();
    }
    
    // Draw location trail (today's location history)
    if (showLocationTrail && trackedAgent.locationHistory?.length > 1) {
      // Clear old trail
      if (locationTrailPolylineRef.current) {
        locationTrailPolylineRef.current.setMap(null);
      }
      
      // Sort location history by timestamp ascending (oldest first)
      const sortedHistory = [...trackedAgent.locationHistory].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const trailPath = sortedHistory.map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
      }));
      
      locationTrailPolylineRef.current = new (window as any).google.maps.Polyline({
        path: trailPath,
        geodesic: true,
        strokeColor: "#9c27b0",
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [
          {
            icon: {
              path: (window as any).google.maps.SymbolPath.CIRCLE,
              scale: 3,
              strokeColor: "#9c27b0",
              fillColor: "#9c27b0",
              fillOpacity: 0.8,
            },
            offset: "0",
            repeat: "30px",
          },
        ],
        map: mapRef.current,
      });
    } else {
      // Clear location trail if toggle is off
      if (locationTrailPolylineRef.current) {
        locationTrailPolylineRef.current.setMap(null);
        locationTrailPolylineRef.current = null;
      }
    }
  }, [trackingMode, trackedAgent, mapsLoaded, showTargetsOnMap, showNavigationRoute, showVisitedPlaces, showLocationTrail]);

  // Center on tracked agent button handler
  const centerOnTrackedAgent = useCallback(() => {
    if (!mapRef.current || !trackedAgent) return;
    
    const agent = agentLocations.get(trackedAgent.agent.userId);
    if (agent?.latitude && agent?.longitude) {
      mapRef.current.panTo({ lat: agent.latitude, lng: agent.longitude });
    }
  }, [trackedAgent, agentLocations]);

  const filteredAgents = Array.from(agentLocations.values()).filter((agent) =>
    (agent.userName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = Array.from(presenceData.values()).filter((p) => p.isOnline).length;

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 0,
          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
          color: "white",
          zIndex: 1000,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton color="inherit" onClick={() => router.push("/admin")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600} flex={1}>
            Live Agent Map
          </Typography>
          <Chip
            icon={<PeopleIcon sx={{ color: "white !important" }} />}
            label={`${onlineCount}/${agentLocations.size} Online`}
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
          />
          <IconButton color="inherit" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setShowAgentList(true)}>
            <PeopleIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* Map Container */}
      <Box id="admin-maps-container" sx={{ flex: 1, position: "relative" }}>
        <Box
          ref={mapContainerRef}
          sx={{
            width: "100%",
            height: "100%",
            bgcolor: "grey.200",
          }}
        />

        {!mapsLoaded && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading map...
            </Typography>
          </Box>
        )}

        {/* Map Type Selector - Top Left */}
        {mapsLoaded && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 1,
            }}
          >
            <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden" }}>
              <ToggleButtonGroup
                value={mapType}
                exclusive
                onChange={handleMapTypeChange}
                size="small"
              >
                <ToggleButton value="roadmap" sx={{ px: 1.5 }}>
                  <Tooltip title="Map">
                    <MapIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="satellite" sx={{ px: 1.5 }}>
                  <Tooltip title="Satellite">
                    <SatelliteAltIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="terrain" sx={{ px: 1.5 }}>
                  <Tooltip title="Terrain">
                    <TerrainIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="hybrid" sx={{ px: 1.5 }}>
                  <Tooltip title="Hybrid">
                    <LayersIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Paper>
          </Box>
        )}

        {/* Layer Controls & Fullscreen - Top Right */}
        {mapsLoaded && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 1,
            }}
          >
            <Stack spacing={1}>
              <Paper elevation={3} sx={{ borderRadius: 2 }}>
                <Stack direction="row">
                  <Tooltip title={showTraffic ? "Hide Traffic" : "Show Traffic"}>
                    <IconButton 
                      onClick={() => setShowTraffic(!showTraffic)}
                      color={showTraffic ? "primary" : "default"}
                      size="small"
                    >
                      <TrafficIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={showTransit ? "Hide Transit" : "Show Transit"}>
                    <IconButton 
                      onClick={() => setShowTransit(!showTransit)}
                      color={showTransit ? "primary" : "default"}
                      size="small"
                    >
                      <DirectionsBusIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                    <IconButton onClick={toggleFullscreen} size="small">
                      {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            </Stack>
          </Box>
        )}

        {/* Zoom Controls - Right Side */}
        {mapsLoaded && (
          <Box
            sx={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
            }}
          >
            <Paper elevation={3} sx={{ borderRadius: 2 }}>
              <Stack>
                <Tooltip title="Zoom In">
                  <IconButton onClick={handleZoomIn} size="small">
                    <ZoomInIcon />
                  </IconButton>
                </Tooltip>
                <Divider />
                <Box sx={{ px: 1, py: 0.5, textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    {zoomLevel}
                  </Typography>
                </Box>
                <Divider />
                <Tooltip title="Zoom Out">
                  <IconButton onClick={handleZoomOut} size="small">
                    <ZoomOutIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Floating action buttons - Bottom Right */}
        <Stack
          spacing={1}
          sx={{
            position: "absolute",
            bottom: 20,
            right: 20,
          }}
        >
          {trackingMode && (
            <Tooltip title="Center on agent">
              <Fab
                size="small"
                color="secondary"
                onClick={centerOnTrackedAgent}
              >
                <GpsFixedIcon />
              </Fab>
            </Tooltip>
          )}
          <Tooltip title="Fit all agents">
            <Fab
              size="small"
              color="primary"
              onClick={fitAllAgents}
            >
              <MyLocationIcon />
            </Fab>
          </Tooltip>
        </Stack>

        {/* Tracking Mode Panel - Shows when tracking an agent */}
        {trackingMode && trackedAgent && (
          <Card
            sx={{
              position: "absolute",
              top: 70,
              left: 10,
              width: 300,
              borderRadius: 3,
              boxShadow: 4,
              zIndex: 2,
            }}
          >
            <CardContent sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonPinCircleIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Tracking Agent
                  </Typography>
                </Stack>
                <IconButton size="small" onClick={stopTrackingAgent}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
                <Avatar sx={{ bgcolor: trackedAgent.agent.color, fontSize: 20, width: 36, height: 36 }}>
                  {trackedAgent.agent.character}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {trackedAgent.agent.userName || "Agent"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    📍 {getDisplayAddress(trackedAgent.agent)}
                  </Typography>
                </Box>
              </Stack>
              
              <Divider sx={{ my: 1 }} />
              
              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showTargetsOnMap}
                      onChange={(e) => setShowTargetsOnMap(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <PlaceIcon fontSize="small" color="success" />
                      <Typography variant="body2">Show Targets ({trackedAgent.targets.length + (trackedAgent.userTargets?.length || 0)})</Typography>
                    </Stack>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showNavigationRoute}
                      onChange={(e) => setShowNavigationRoute(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <NavigationIcon fontSize="small" color="primary" />
                      <Typography variant="body2">Show Route</Typography>
                    </Stack>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showVisitedPlaces}
                      onChange={(e) => setShowVisitedPlaces(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <FlagIcon fontSize="small" sx={{ color: "#4caf50" }} />
                      <Typography variant="body2">Visited Places ({trackedAgent.todayCompletedVisits?.length || 0})</Typography>
                    </Stack>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showLocationTrail}
                      onChange={(e) => setShowLocationTrail(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <DirectionsIcon fontSize="small" sx={{ color: "#9c27b0" }} />
                      <Typography variant="body2">Location Trail</Typography>
                    </Stack>
                  }
                />
              </Stack>
              
              {trackedAgent.activeNavigation && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "primary.50", borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <NavigationIcon color="primary" sx={{ animation: "pulse 1.5s infinite" }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        Navigating to Target
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {trackedAgent.activeNavigation.targetName}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    Distance: {trackedAgent.activeNavigation.totalDistanceKm.toFixed(2)} km traveled
                  </Typography>
                </Box>
              )}
              
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={centerOnTrackedAgent}
                startIcon={<GpsFixedIcon />}
                sx={{ mt: 1.5 }}
              >
                Center on Agent
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Selected Agent Card */}
        {selectedAgent && !trackingMode && (
          <Card
            sx={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 80,
              maxWidth: 450,
              borderRadius: 3,
              boxShadow: 4,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="flex-start" spacing={2}>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: selectedAgent.color,
                    fontSize: 32,
                  }}
                >
                  {selectedAgent.character}
                </Avatar>
                <Box flex={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" fontWeight={600}>
                      {selectedAgent.userName || "Agent"}
                    </Typography>
                    <IconButton size="small" onClick={() => setSelectedAgent(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Chip
                    size="small"
                    label={selectedAgent.isOnline ? "Online" : "Offline"}
                    color={selectedAgent.isOnline ? "success" : "default"}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    📍 {getDisplayAddress(selectedAgent)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <AccessTimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }} />
                    Last seen: {new Date(selectedAgent.timestamp).toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={<GpsFixedIcon />}
                      label="Track"
                      size="small"
                      color="primary"
                      onClick={() => {
                        startTrackingAgent(selectedAgent.userId);
                        setSelectedAgent(null);
                      }}
                      sx={{ cursor: "pointer" }}
                    />
                    <Chip
                      icon={<DirectionsIcon />}
                      label="Directions"
                      size="small"
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${selectedAgent.latitude},${selectedAgent.longitude}`,
                          "_blank"
                        );
                      }}
                      sx={{ cursor: "pointer" }}
                    />
                    <Chip
                      icon={<ChatIcon />}
                      label="Chat"
                      size="small"
                      onClick={() => router.push("/chat")}
                      sx={{ cursor: "pointer" }}
                    />
                    <Chip
                      icon={<FlagIcon />}
                      label="Targets"
                      size="small"
                      onClick={() => router.push("/admin")}
                      sx={{ cursor: "pointer" }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Agent List Drawer */}
      <Drawer
        anchor="right"
        open={showAgentList}
        onClose={() => setShowAgentList(false)}
      >
        <Box sx={{ width: 320, height: "100%" }}>
          <Box sx={{ p: 2, bgcolor: "primary.main", color: "white" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Agents</Typography>
              <IconButton color="inherit" onClick={() => setShowAgentList(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <TextField
              fullWidth
              size="small"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                mt: 2,
                bgcolor: "rgba(255,255,255,0.1)",
                borderRadius: 1,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "transparent" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "rgba(255,255,255,0.7)" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <List sx={{ overflow: "auto", flex: 1 }}>
            {filteredAgents.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">No agents found</Typography>
              </Box>
            ) : (
              filteredAgents.map((agent) => {
                const presence = presenceData.get(agent.userId);
                const isOnline = presence?.isOnline || false;
                
                return (
                  <ListItemButton
                    key={agent.userId}
                    sx={{ py: 2 }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: isOnline ? "success.main" : "grey.400",
                              border: "2px solid white",
                            }}
                          />
                        }
                      >
                        <Avatar
                          sx={{
                            bgcolor: agent.color,
                            fontSize: 24,
                          }}
                        >
                          {agent.character}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={agent.userName || "Agent"}
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            📍 {getDisplayAddress(agent)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(agent.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Stack>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      onClick={() => handleCenterOnAgent({ ...agent, isOnline })}
                      sx={{ cursor: "pointer" }}
                    />
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Center on map">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCenterOnAgent({ ...agent, isOnline })}
                        >
                          <MyLocationIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Track agent">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => startTrackingAgent(agent.userId)}
                        >
                          <GpsFixedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItemButton>
                );
              })
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}
