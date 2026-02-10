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
  FormControl,
  Select,
  MenuItem,
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
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useAppStore, useIsSuperAdmin, useHasHydrated } from "@/store";
import { subscribeToAllLocations, LocationData } from "@/lib/locationTracking";
import { subscribeToPresence } from "@/lib/chat";
import { Company } from "@/types/auth";
import { getAllCompanies } from "@/lib/company";

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
  "🧑‍🚀", "👨‍🚀", "👩‍🚀", "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️",
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

// Company colors for grouping
const getCompanyColor = (companyId: string): string => {
  const colors = [
    "#667eea", "#764ba2", "#f59e0b", "#10b981", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316",
  ];
  let hash = 0;
  for (let i = 0; i < companyId.length; i++) {
    hash = companyId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface AgentLocation extends LocationData {
  displayName?: string;
  isOnline?: boolean;
  lastActive?: string;
  character?: string;
  color?: string;
  companyName?: string;
  companyColor?: string;
}

export default function SuperAdminMapsPage() {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, user } = useAppStore();
  const isSuperAdmin = useIsSuperAdmin();
  
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agentLocations, setAgentLocations] = useState<Map<string, AgentLocation>>(new Map());
  const [presenceData, setPresenceData] = useState<Map<string, PresenceInfo>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null);
  const [showAgentList, setShowAgentList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Auth check
  useEffect(() => {
    if (!hasHydrated) return;
    
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/dashboard");
      return;
    }
    setIsLoading(false);
  }, [hasHydrated, isAuthenticated, user, isSuperAdmin, router]);

  // Fetch companies
  useEffect(() => {
    if (!hasHydrated || !isSuperAdmin) return;
    
    const fetchCompanies = async () => {
      try {
        const companiesData = await getAllCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    
    fetchCompanies();
  }, [hasHydrated, isSuperAdmin]);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!mapContainerRef.current || mapRef.current) return false;
      
      if (typeof window === "undefined" || !(window as any).google?.maps) {
        return false;
      }

      // Default center (World view)
      const defaultCenter = { lat: 20.5937, lng: 78.9629 };
      
      mapRef.current = new (window as any).google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 4,
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

  // Subscribe to ALL user locations (no company filter for superadmin)
  useEffect(() => {
    if (!hasHydrated || !isSuperAdmin) return;

    const unsubscribe = subscribeToAllLocations(null, (locations) => {
      const locationMap = new Map<string, AgentLocation>();
      
      locations.forEach((loc) => {
        const company = companies.find(c => c.id === loc.companyId);
        locationMap.set(loc.userId, {
          ...loc,
          character: getCharacterAvatar(loc.userId),
          color: getAvatarColor(loc.userId),
          companyName: company?.name || "Unknown Company",
          companyColor: loc.companyId ? getCompanyColor(loc.companyId) : "#666",
        });
      });
      
      setAgentLocations(locationMap);
    });

    return () => unsubscribe();
  }, [hasHydrated, isSuperAdmin, companies]);

  // Subscribe to presence data
  useEffect(() => {
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
  }, [agentLocations.size]);

  // Update markers on map
  useEffect(() => {
    if (!mapRef.current || !mapsLoaded) return;

    const bounds = new (window as any).google.maps.LatLngBounds();
    let hasValidLocation = false;

    // Filter locations by company if selected
    const filteredLocations = filterCompany === "all" 
      ? agentLocations 
      : new Map(Array.from(agentLocations.entries()).filter(([_, agent]) => agent.companyId === filterCompany));

    // Update or create markers for each agent
    filteredLocations.forEach((agent, agentId) => {
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
            <div style="
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              background: ${agent.companyColor};
              color: white;
              padding: 1px 4px;
              border-radius: 4px;
              font-size: 8px;
              white-space: nowrap;
            ">${agent.companyName?.substring(0, 10) || ''}</div>
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
          // Fallback to regular marker
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
            title: `${agent.userName || 'Agent'} - ${agent.companyName || 'Unknown'}`,
          });
        }

        // Add click listener
        if (marker) {
          marker.addListener("click", () => {
            setSelectedAgent({ ...agent, isOnline });
            
            if (infoWindowRef.current && mapRef.current && marker) {
              const content = `
                <div style="padding: 10px; min-width: 220px;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 32px;">${agent.character}</span>
                    <div>
                      <div style="font-weight: bold; font-size: 16px;">${agent.userName || 'Agent'}</div>
                      <div style="color: ${isOnline ? '#4caf50' : '#9e9e9e'}; font-size: 12px;">
                        ${isOnline ? '● Online' : '○ Offline'}
                      </div>
                    </div>
                  </div>
                  <div style="
                    background: ${agent.companyColor}; 
                    color: white; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    margin-bottom: 8px;
                    display: inline-block;
                  ">
                    🏢 ${agent.companyName || 'Unknown Company'}
                  </div>
                  <div style="font-size: 12px; color: #666;">
                    📍 ${agent.address || 'Location updating...'}
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

    // Remove markers for agents no longer in the filtered list
    markersRef.current.forEach((marker, agentId) => {
      if (!filteredLocations.has(agentId)) {
        marker.setMap(null);
        markersRef.current.delete(agentId);
      }
    });

    // Fit bounds if we have locations
    if (hasValidLocation && filteredLocations.size > 0) {
      mapRef.current.fitBounds(bounds);
      
      const map = mapRef.current;
      const listener = (window as any).google.maps.event.addListener(map, "idle", () => {
        const zoom = map.getZoom();
        if (zoom && zoom > 15) {
          map.setZoom(15);
        }
        (window as any).google.maps.event.removeListener(listener);
      });
    }
  }, [agentLocations, presenceData, mapsLoaded, filterCompany]);

  const handleCenterOnAgent = useCallback((agent: AgentLocation) => {
    if (!mapRef.current || !agent.latitude || !agent.longitude) return;
    
    mapRef.current.panTo({ lat: agent.latitude, lng: agent.longitude });
    mapRef.current.setZoom(16);
    setSelectedAgent(agent);
    setShowAgentList(false);
  }, []);

  const handleRefresh = useCallback(() => {
    setAgentLocations(new Map(agentLocations));
  }, [agentLocations]);

  // Filter agents by search and company
  const filteredAgents = Array.from(agentLocations.values()).filter((agent) => {
    const matchesSearch = (agent.userName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (agent.companyName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompany === "all" || agent.companyId === filterCompany;
    return matchesSearch && matchesCompany;
  });

  // Group agents by company for display
  const agentsByCompany = filteredAgents.reduce((acc, agent) => {
    const companyId = agent.companyId || "unknown";
    if (!acc[companyId]) {
      acc[companyId] = {
        companyName: agent.companyName || "Unknown",
        companyColor: agent.companyColor || "#666",
        agents: [],
      };
    }
    acc[companyId].agents.push(agent);
    return acc;
  }, {} as Record<string, { companyName: string; companyColor: string; agents: AgentLocation[] }>);

  const onlineCount = Array.from(presenceData.values()).filter((p) => p.isOnline).length;
  const totalAgents = agentLocations.size;

  // Show loading
  if (!hasHydrated || isLoading) {
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          zIndex: 1000,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton color="inherit" onClick={() => router.push("/superadmin")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600} flex={1}>
            🗺️ Live Global Map
          </Typography>
          <Chip
            icon={<BusinessIcon sx={{ color: "white !important" }} />}
            label={`${companies.length} Companies`}
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", display: { xs: "none", sm: "flex" } }}
          />
          <Chip
            icon={<PeopleIcon sx={{ color: "white !important" }} />}
            label={`${onlineCount}/${totalAgents} Online`}
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

      {/* Company Filter Bar */}
      <Paper sx={{ p: 1, borderRadius: 0, zIndex: 999 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <FilterListIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">All Companies ({totalAgents} agents)</MenuItem>
              {companies.map((company) => {
                const companyAgentCount = Array.from(agentLocations.values()).filter(a => a.companyId === company.id).length;
                return (
                  <MenuItem key={company.id} value={company.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: getCompanyColor(company.id) }} />
                      <span>{company.name} ({companyAgentCount})</span>
                    </Stack>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
            Viewing {filteredAgents.length} agents
          </Typography>
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
                  const filteredLocs = filterCompany === "all" 
                    ? agentLocations 
                    : new Map(Array.from(agentLocations.entries()).filter(([_, a]) => a.companyId === filterCompany));
                  filteredLocs.forEach((agent) => {
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
              maxWidth: 420,
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
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      size="small"
                      label={selectedAgent.isOnline ? "Online" : "Offline"}
                      color={selectedAgent.isOnline ? "success" : "default"}
                    />
                    <Chip
                      size="small"
                      icon={<BusinessIcon />}
                      label={selectedAgent.companyName}
                      sx={{ bgcolor: selectedAgent.companyColor, color: "white" }}
                    />
                  </Stack>
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
        <Box sx={{ width: 360, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">All Agents</Typography>
              <IconButton color="inherit" onClick={() => setShowAgentList(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <TextField
              fullWidth
              size="small"
              placeholder="Search agents or companies..."
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
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip
                size="small"
                label={`${onlineCount} Online`}
                sx={{ bgcolor: "#4caf50", color: "white" }}
              />
              <Chip
                size="small"
                label={`${totalAgents - onlineCount} Offline`}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
              />
            </Stack>
          </Box>
          
          <List sx={{ overflow: "auto", flex: 1 }}>
            {Object.keys(agentsByCompany).length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">No agents found</Typography>
              </Box>
            ) : (
              Object.entries(agentsByCompany).map(([companyId, { companyName, companyColor, agents }]) => (
                <Box key={companyId}>
                  <Box sx={{ px: 2, py: 1, bgcolor: "grey.100" }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: companyColor }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        {companyName}
                      </Typography>
                      <Chip size="small" label={agents.length} sx={{ height: 20 }} />
                    </Stack>
                  </Box>
                  {agents.map((agent) => {
                    const presence = presenceData.get(agent.userId);
                    const isOnline = presence?.isOnline || false;
                    
                    return (
                      <ListItemButton
                        key={agent.userId}
                        onClick={() => handleCenterOnAgent({ ...agent, isOnline })}
                        sx={{ py: 1.5 }}
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
                                fontSize: 20,
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
                  })}
                  <Divider />
                </Box>
              ))
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}
