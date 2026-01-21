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
import { useAppStore, useCompany } from "@/store";
import { subscribeToAllUserLocations, LocationData } from "@/lib/locationTracking";
import { subscribeToPresence } from "@/lib/chat";

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
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });
      
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
      const newMap = new Map<string, PresenceInfo>();
      Object.entries(presence).forEach(([userId, data]) => {
        newMap.set(userId, data);
      });
      setPresenceData(newMap);
    });

    return () => unsub();
  }, [company?.id, agentLocations.size]);

  // Update markers on map
  useEffect(() => {
    if (!mapRef.current || !mapsLoaded) return;

    const bounds = new (window as any).google.maps.LatLngBounds();
    let hasValidLocation = false;

    // Update or create markers for each agent
    agentLocations.forEach((agent, agentId) => {
      if (!agent.latitude || !agent.longitude) return;
      
      hasValidLocation = true;
      const position = { lat: agent.latitude, lng: agent.longitude };
      bounds.extend(position);

      const presence = presenceData.get(agentId);
      const isOnline = presence?.isOnline || false;

      let marker = markersRef.current.get(agentId);
      
      if (marker) {
        // Update existing marker position
        marker.setPosition(position);
      } else {
        // Create custom marker with character avatar
        const markerElement = document.createElement("div");
        markerElement.innerHTML = `
          <div style="
            position: relative;
            cursor: pointer;
            transform: translate(-50%, -100%);
          ">
            <div style="
              width: 50px;
              height: 50px;
              background: ${agent.color};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              border: 3px solid ${isOnline ? '#4caf50' : '#9e9e9e'};
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 24px;
              ">${agent.character}</span>
            </div>
            <div style="
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              background: ${isOnline ? '#4caf50' : '#9e9e9e'};
              color: white;
              padding: 2px 6px;
              border-radius: 8px;
              font-size: 10px;
              white-space: nowrap;
              font-weight: bold;
            ">${agent.userName || 'Agent'}</div>
          </div>
        `;

        // Use AdvancedMarkerElement if available, otherwise fallback
        if ((window as any).google.maps.marker?.AdvancedMarkerElement) {
          marker = new (window as any).google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position,
            content: markerElement,
          });
        } else {
          // Fallback to regular marker with custom icon
          marker = new (window as any).google.maps.Marker({
            map: mapRef.current,
            position,
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
        }

        // Add click listener only if marker was created
        if (marker) {
          marker.addListener("click", () => {
            setSelectedAgent({ ...agent, isOnline });
            
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
                    ${agent.address || 'Location updating...'}
                  </div>
                  <div style="font-size: 11px; color: #999; margin-top: 5px;">
                    Last update: ${new Date(agent.timestamp).toLocaleTimeString()}
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
    });

    // Remove markers for agents no longer in the list
    markersRef.current.forEach((marker, agentId) => {
      if (!agentLocations.has(agentId)) {
        marker.setMap(null);
        markersRef.current.delete(agentId);
      }
    });

    // Fit bounds if we have locations
    if (hasValidLocation && agentLocations.size > 0) {
      mapRef.current.fitBounds(bounds);
      
      // Don't zoom in too much
      const map = mapRef.current;
      const listener = (window as any).google.maps.event.addListener(map, "idle", () => {
        const zoom = map.getZoom();
        if (zoom && zoom > 15) {
          map.setZoom(15);
        }
        (window as any).google.maps.event.removeListener(listener);
      });
    }
  }, [agentLocations, presenceData, mapsLoaded]);

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
      <Box sx={{ flex: 1, position: "relative" }}>
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

        {/* Floating action buttons */}
        <Stack
          spacing={1}
          sx={{
            position: "absolute",
            bottom: 20,
            right: 20,
          }}
        >
          <Tooltip title="Fit all agents">
            <Fab
              size="small"
              color="primary"
              onClick={() => {
                if (mapRef.current && agentLocations.size > 0) {
                  const bounds = new (window as any).google.maps.LatLngBounds();
                  agentLocations.forEach((agent) => {
                    if (agent.latitude && agent.longitude) {
                      bounds.extend({ lat: agent.latitude, lng: agent.longitude });
                    }
                  });
                  mapRef.current.fitBounds(bounds);
                }
              }}
            >
              <MyLocationIcon />
            </Fab>
          </Tooltip>
        </Stack>

        {/* Selected Agent Card */}
        {selectedAgent && (
          <Card
            sx={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 80,
              maxWidth: 400,
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
                    📍 {selectedAgent.address || "Location updating..."}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <AccessTimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }} />
                    Last seen: {new Date(selectedAgent.timestamp).toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
                    onClick={() => handleCenterOnAgent({ ...agent, isOnline })}
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
                            📍 {agent.address || "Location updating..."}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(agent.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Stack>
                      }
                    />
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
