"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Badge,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DirectionsIcon from "@mui/icons-material/Directions";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NavigationIcon from "@mui/icons-material/Navigation";
import RefreshIcon from "@mui/icons-material/Refresh";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RouteIcon from "@mui/icons-material/Route";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import MapIcon from "@mui/icons-material/Map";
import ListIcon from "@mui/icons-material/List";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import NearMeIcon from "@mui/icons-material/NearMe";
import CancelIcon from "@mui/icons-material/Cancel";
import FlagIcon from "@mui/icons-material/Flag";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { useTrackedLocation } from "@/hooks";
import { TargetVisit } from "@/types/target";
import {
  OptimizedRoute,
  RouteWaypoint,
  RouteSummary,
  RouteMapData,
  RouteLeg,
  RouteStep,
} from "@/types/route";
import {
  createOptimizedRoute,
  subscribeToActiveRoute,
  startRoute,
  pauseRoute,
  completeRouteWaypoint,
  skipRouteWaypoint,
  cancelRoute,
  getRouteSummary,
  getRouteMapData,
  formatTimeForDisplay,
} from "@/lib/routeOptimization";
import { subscribeToUserActiveVisits } from "@/lib/targetTracking";

type TravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const buildRouteLeg = (leg: google.maps.DirectionsLeg): RouteLeg => ({
  startAddress: leg.start_address || "",
  endAddress: leg.end_address || "",
  distance: {
    text: leg.distance?.text || "",
    value: leg.distance?.value || 0,
  },
  duration: {
    text: leg.duration?.text || "",
    value: leg.duration?.value || 0,
  },
  durationInTraffic: leg.duration_in_traffic
    ? { text: leg.duration_in_traffic.text, value: leg.duration_in_traffic.value }
    : undefined,
  steps: leg.steps.map((step) => ({
    instruction: stripHtml(step.instructions || ""),
    distance: {
      text: step.distance?.text || "",
      value: step.distance?.value || 0,
    },
    duration: {
      text: step.duration?.text || "",
      value: step.duration?.value || 0,
    },
    startLocation: {
      lat: step.start_location.lat(),
      lng: step.start_location.lng(),
    },
    endLocation: {
      lat: step.end_location.lat(),
      lng: step.end_location.lng(),
    },
    maneuver: step.maneuver,
    polyline: step.polyline?.points || "",
  })) as RouteStep[],
  waypointIndex: 0,
});

export default function RoutesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();

  // Geolocation hook
  const geoHook = useTrackedLocation({
    userId: user?.id,
    companyId: user?.companyId,
    userName: user?.name,
    enableTracking: true,
  });

  const userLat = geoHook.latitude;
  const userLon = geoHook.longitude;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [activeVisits, setActiveVisits] = useState<TargetVisit[]>([]);
  const [activeRoute, setActiveRoute] = useState<OptimizedRoute | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeMapData, setRouteMapData] = useState<RouteMapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [expandedWaypoint, setExpandedWaypoint] = useState<string | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<RouteWaypoint | null>(null);
  const [navigationMode, setNavigationMode] = useState<TravelMode>("DRIVING");
  const [navigationLeg, setNavigationLeg] = useState<RouteLeg | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [isNavLoading, setIsNavLoading] = useState(false);
  const [showNavSteps, setShowNavSteps] = useState(false);

  // Map refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Auth check
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    setIsLoading(false);
  }, [hasHydrated, isAuthenticated, user, router]);

  // Initialize Google Maps
  useEffect(() => {
    const initMaps = () => {
      if (typeof window !== "undefined" && (window as any).google?.maps) {
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    if (initMaps()) return;

    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      attempts++;
      if (initMaps() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to active visits
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserActiveVisits(user.id, (visits) => {
      // Filter to only pending visits that can be routed
      const routableVisits = visits.filter(
        (v) => v.status === "pending" || v.status === "in_transit"
      );
      setActiveVisits(routableVisits);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Subscribe to active route
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToActiveRoute(user.id, (route) => {
      setActiveRoute(route);
      if (route) {
        setRouteSummary(getRouteSummary(route));
        setRouteMapData(
          getRouteMapData(route, userLat && userLon ? { lat: userLat, lng: userLon } : undefined)
        );
      } else {
        setRouteSummary(null);
        setRouteMapData(null);
      }
    });

    return () => unsubscribe();
  }, [user?.id, userLat, userLon]);

  useEffect(() => {
    if (activeRoute) return;
    setNavigationTarget(null);
    setNavigationLeg(null);
    setNavigationError(null);
    setShowNavSteps(false);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  }, [activeRoute]);

  // Update map when route data changes
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || viewMode !== "map") return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: userLat && userLon ? { lat: userLat, lng: userLon } : { lat: 20.5937, lng: 78.9629 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });
      setMapReady(true);
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!routeMapData) return;
    const showOverview = !navigationTarget;

    // Add markers
    routeMapData.markers.forEach((marker) => {
      const markerColor = getMarkerColor(marker.type);
      const gMarker = new google.maps.Marker({
        position: marker.position,
        map: mapRef.current,
        label: {
          text: marker.label,
          color: "white",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
          scale: 15,
        },
        title: marker.title,
      });

      // Info window
      const info = marker.info || { name: marker.title || "", address: "", status: "" };
      const infoContent = `
        <div style="padding: 8px; max-width: 200px;">
          <strong>${info.name}</strong><br/>
          <small>${info.address || ""}</small>
          ${info.eta ? `<br/><strong>ETA:</strong> ${info.eta}` : ""}
          ${info.distance ? `<br/><strong>Distance:</strong> ${info.distance}` : ""}
          <br/><em>${info.status}</em>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({ content: infoContent });
      gMarker.addListener("click", () => {
        infoWindow.open(mapRef.current, gMarker);
      });

      markersRef.current.push(gMarker);
    });

    // Draw polyline for overview (skip when navigating)
    if (showOverview && routeMapData.polylinePath.length > 0) {
      polylineRef.current = new google.maps.Polyline({
        path: routeMapData.polylinePath,
        geodesic: true,
        strokeColor: "#1976d2",
        strokeOpacity: 1.0,
        strokeWeight: 4,
      });
      polylineRef.current.setMap(mapRef.current);
    }

    // Fit bounds for overview only
    if (showOverview && routeMapData.bounds) {
      const bounds = new google.maps.LatLngBounds(
        routeMapData.bounds.southwest,
        routeMapData.bounds.northeast
      );
      mapRef.current.fitBounds(bounds, 50);
    }

    // Add current location marker
    if (userLat && userLon) {
      const currentLocMarker = new google.maps.Marker({
        position: { lat: userLat, lng: userLon },
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#4285f4",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
          scale: 10,
        },
        title: "Your Location",
        zIndex: 1000,
      });
      markersRef.current.push(currentLocMarker);
    }
  }, [mapsLoaded, viewMode, routeMapData, userLat, userLon, navigationTarget]);

  const requestNavigationRoute = useCallback(
    async (target: RouteWaypoint, mode: TravelMode) => {
      if (!mapsLoaded || !mapReady || viewMode !== "map" || !mapRef.current) return;
      if (!userLat || !userLon) {
        setNavigationError("Current location is not available.");
        return;
      }

      setIsNavLoading(true);
      setNavigationError(null);
      setNavigationLeg(null);

      try {
        const directionsService = new google.maps.DirectionsService();
        const travelMode = google.maps.TravelMode[mode];

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin: { lat: userLat, lng: userLon },
              destination: {
                lat: target.location.latitude,
                lng: target.location.longitude,
              },
              travelMode,
              drivingOptions:
                mode === "DRIVING"
                  ? {
                      departureTime: new Date(),
                      trafficModel: google.maps.TrafficModel.BEST_GUESS,
                    }
                  : undefined,
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

        if (!directionsRendererRef.current) {
          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
              strokeColor: "#1a73e8",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          });
        }

        directionsRendererRef.current.setMap(mapRef.current);
        directionsRendererRef.current.setDirections(result);

        const leg = result.routes[0]?.legs?.[0];
        if (leg) {
          setNavigationLeg(buildRouteLeg(leg));
        } else {
          setNavigationLeg(null);
        }
      } catch (err) {
        console.error("Navigation route error:", err);
        setNavigationError("Failed to load in-app navigation. Try refresh.");
        setNavigationLeg(null);
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
      } finally {
        setIsNavLoading(false);
      }
    },
    [mapsLoaded, mapReady, viewMode, userLat, userLon]
  );

  useEffect(() => {
    if (!navigationTarget) {
      setNavigationLeg(null);
      setNavigationError(null);
      setShowNavSteps(false);
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      return;
    }

    requestNavigationRoute(navigationTarget, navigationMode);
  }, [navigationTarget, navigationMode, requestNavigationRoute]);

  useEffect(() => {
    if (viewMode !== "map" && directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  }, [viewMode]);

  const getMarkerColor = (type: string): string => {
    switch (type) {
      case "origin":
        return "#4caf50"; // Green
      case "visited":
        return "#9e9e9e"; // Gray
      case "current":
        return "#ff9800"; // Orange
      case "remaining":
        return "#1976d2"; // Blue
      case "skipped":
        return "#f44336"; // Red
      default:
        return "#1976d2";
    }
  };

  const handleGenerateRoute = async () => {
    if (!user?.id || !user?.companyId || !userLat || !userLon || activeVisits.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await createOptimizedRoute(
        user.id,
        user.companyId,
        { latitude: userLat, longitude: userLon, address: "Current Location" },
        activeVisits,
        { algorithm: "google", returnToOrigin: false, maxWaypoints: 10 }
      );

      if (!result.success) {
        setError(result.error || "Failed to generate route");
      }
    } catch (err) {
      console.error("Error generating route:", err);
      setError("Failed to generate route. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartRoute = async () => {
    if (!user?.id || !activeRoute) return;
    await startRoute(user.id, activeRoute.id);
  };

  const handlePauseRoute = async () => {
    if (!user?.id || !activeRoute) return;
    await pauseRoute(user.id, activeRoute.id);
  };

  const handleCompleteWaypoint = async (waypointId: string) => {
    if (!user?.id || !activeRoute) return;
    await completeRouteWaypoint(user.id, activeRoute.id, waypointId);
  };

  const handleSkipWaypoint = async (waypointId: string) => {
    if (!user?.id || !activeRoute) return;
    await skipRouteWaypoint(user.id, activeRoute.id, waypointId);
  };

  const handleCancelRoute = async () => {
    if (!user?.id || !activeRoute) return;
    await cancelRoute(user.id, activeRoute.id);
    setShowConfirmCancel(false);
  };

  const handleNavigate = (waypoint: RouteWaypoint) => {
    setNavigationTarget(waypoint);
    setViewMode("map");
    setShowNavSteps(false);
    setNavigationError(null);

    if (!userLat || !userLon) {
      setNavigationError("Current location is not available.");
    }
  };

  const handleStopNavigation = () => {
    setNavigationTarget(null);
    setNavigationLeg(null);
    setNavigationError(null);
    setShowNavSteps(false);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  };

  const handleRefreshNavigation = () => {
    if (!navigationTarget) return;
    requestNavigationRoute(navigationTarget, navigationMode);
  };

  const getWaypointStatusChip = (status: string) => {
    switch (status) {
      case "visited":
        return <Chip size="small" color="success" label="Visited" icon={<CheckCircleIcon />} />;
      case "current":
        return <Chip size="small" color="warning" label="In Progress" icon={<NearMeIcon />} />;
      case "skipped":
        return <Chip size="small" color="error" label="Skipped" icon={<SkipNextIcon />} />;
      default:
        return <Chip size="small" color="default" label="Pending" />;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 100,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Route Optimization
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Plan optimal routes for your visits
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
          >
            <ToggleButton value="list">
              <ListIcon />
            </ToggleButton>
            <ToggleButton value="map">
              <MapIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      <Container maxWidth="md" sx={{ mt: 2 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Location Warning */}
        {(!userLat || !userLon) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Location access is required for route optimization. Please enable location services.
          </Alert>
        )}

        {/* No Active Route - Show Generate */}
        {!activeRoute && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
              <RouteIcon sx={{ fontSize: 60, color: "primary.main", opacity: 0.7 }} />
              <Typography variant="h6">Plan Your Route</Typography>
              <Typography variant="body2" color="text.secondary">
                {activeVisits.length === 0
                  ? "No pending visits available. Add targets from the Targets page first."
                  : `You have ${activeVisits.length} pending visit${activeVisits.length > 1 ? "s" : ""}. Generate an optimized route to visit them efficiently.`}
              </Typography>

              {activeVisits.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <DirectionsIcon />}
                  onClick={handleGenerateRoute}
                  disabled={isGenerating || !userLat || !userLon}
                  size="large"
                  sx={{ mt: 2 }}
                >
                  {isGenerating ? "Generating..." : "Generate Optimized Route"}
                </Button>
              )}

              {/* Preview pending visits */}
              {activeVisits.length > 0 && (
                <Box sx={{ width: "100%", mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom align="left">
                    Pending Visits:
                  </Typography>
                  <List dense>
                    {activeVisits.slice(0, 5).map((visit) => (
                      <ListItem key={visit.id}>
                        <ListItemIcon>
                          <LocationOnIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={visit.targetName}
                          secondary={visit.location.address}
                          primaryTypographyProps={{ variant: "body2" }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                      </ListItem>
                    ))}
                    {activeVisits.length > 5 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 7 }}>
                        +{activeVisits.length - 5} more
                      </Typography>
                    )}
                  </List>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {/* Active Route View */}
        {activeRoute && routeSummary && (
          <>
            {/* Route Summary Card */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {activeRoute.status === "active" ? "Route In Progress" : "Route Planned"}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {activeRoute.status === "planning" && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={handleStartRoute}
                      >
                        Start
                      </Button>
                    )}
                    {activeRoute.status === "active" && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PauseIcon />}
                        onClick={handlePauseRoute}
                      >
                        Pause
                      </Button>
                    )}
                    {activeRoute.status === "paused" && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={handleStartRoute}
                      >
                        Resume
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setShowConfirmCancel(true)}
                    >
                      <CancelIcon />
                    </IconButton>
                  </Stack>
                </Stack>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {routeSummary.visitedTargets}/{routeSummary.totalTargets} completed
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={routeSummary.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Stats Grid */}
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Chip
                    icon={<RouteIcon />}
                    label={`${routeSummary.totalDistance}`}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={`${routeSummary.totalDuration}`}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    icon={<FlagIcon />}
                    label={`Est. End: ${routeSummary.estimatedEndTime}`}
                    variant="outlined"
                    size="small"
                  />
                </Stack>

                {/* Next Target */}
                {routeSummary.nextTarget && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mt: 2,
                      bgcolor: "action.hover",
                      borderColor: "primary.main",
                      borderWidth: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          NEXT DESTINATION
                        </Typography>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {routeSummary.nextTarget.name}
                        </Typography>
                        <Stack direction="row" spacing={2} mt={0.5}>
                          <Typography variant="caption">
                            📍 {routeSummary.nextTarget.distance}
                          </Typography>
                          <Typography variant="caption">
                            ⏱️ ETA: {routeSummary.nextTarget.eta}
                          </Typography>
                        </Stack>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<NavigationIcon />}
                        onClick={() => {
                          const nextWp = activeRoute.waypoints.find(
                            (wp) => wp.visitStatus === "current" || wp.visitStatus === "pending"
                          );
                          if (nextWp) handleNavigate(nextWp);
                        }}
                      >
                        Navigate
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* In-app Navigation Panel */}
            {navigationTarget && (
              <Paper sx={{ p: 2, mb: 2, border: 1, borderColor: "primary.light" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      IN-APP NAVIGATION
                    </Typography>
                    <Typography variant="h6">{navigationTarget.targetName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {navigationTarget.location.address}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshNavigation}
                      disabled={isNavLoading}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<StopIcon />}
                      onClick={handleStopNavigation}
                    >
                      Stop
                    </Button>
                  </Stack>
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Mode
                  </Typography>
                  <ToggleButtonGroup
                    value={navigationMode}
                    exclusive
                    onChange={(_, val) => val && setNavigationMode(val as TravelMode)}
                    size="small"
                  >
                    <ToggleButton value="DRIVING">Drive</ToggleButton>
                    <ToggleButton value="WALKING">Walk</ToggleButton>
                    <ToggleButton value="BICYCLING">Bike</ToggleButton>
                    <ToggleButton value="TRANSIT">Transit</ToggleButton>
                  </ToggleButtonGroup>
                  {isNavLoading && <CircularProgress size={18} />}
                  {navigationLeg && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        icon={<RouteIcon />}
                        label={navigationLeg.distance.text || "Distance"}
                        size="small"
                      />
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={navigationLeg.duration.text || "Duration"}
                        size="small"
                      />
                      {navigationLeg.durationInTraffic?.text && (
                        <Chip
                          label={`Traffic: ${navigationLeg.durationInTraffic.text}`}
                          size="small"
                        />
                      )}
                    </Stack>
                  )}
                </Stack>

                {navigationError && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {navigationError}
                  </Alert>
                )}

                {navigationLeg && navigationLeg.steps.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      endIcon={showNavSteps ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => setShowNavSteps((prev) => !prev)}
                    >
                      {showNavSteps ? "Hide turn-by-turn" : "Show turn-by-turn"}
                    </Button>
                    <Collapse in={showNavSteps}>
                      <Stepper orientation="vertical" sx={{ mt: 1 }}>
                        {navigationLeg.steps.map((step, index) => (
                          <Step key={`${step.instruction}-${index}`} active>
                            <StepLabel>
                              <Typography variant="body2">{step.instruction}</Typography>
                            </StepLabel>
                            <StepContent>
                              <Typography variant="caption" color="text.secondary">
                                {step.distance.text} - {step.duration.text}
                              </Typography>
                            </StepContent>
                          </Step>
                        ))}
                      </Stepper>
                    </Collapse>
                  </Box>
                )}
              </Paper>
            )}

            {/* Map View */}
            {viewMode === "map" && (
              <Paper sx={{ mb: 2, overflow: "hidden", borderRadius: 2 }}>
                <Box
                  ref={mapContainerRef}
                  sx={{ height: 400, width: "100%" }}
                />
                {/* Map Legend */}
                <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
                  <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#4caf50" }} />
                      <Typography variant="caption">Start</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ff9800" }} />
                      <Typography variant="caption">Current</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#1976d2" }} />
                      <Typography variant="caption">Remaining</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#9e9e9e" }} />
                      <Typography variant="caption">Visited</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#4285f4" }} />
                      <Typography variant="caption">You</Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <Paper sx={{ overflow: "hidden" }}>
                <List disablePadding>
                  {/* Origin */}
                  <ListItem sx={{ bgcolor: "success.light", color: "success.contrastText" }}>
                    <ListItemIcon>
                      <MyLocationIcon sx={{ color: "inherit" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Starting Point"
                      secondary={activeRoute.origin.address || "Current Location"}
                      primaryTypographyProps={{ fontWeight: "bold" }}
                      secondaryTypographyProps={{ color: "inherit", sx: { opacity: 0.8 } }}
                    />
                    <Chip label="START" size="small" sx={{ bgcolor: "white", color: "success.main" }} />
                  </ListItem>

                  <Divider />

                  {/* Waypoints */}
                  {activeRoute.waypoints.map((waypoint, index) => (
                    <Box key={waypoint.id}>
                      <ListItem
                        sx={{
                          bgcolor:
                            waypoint.visitStatus === "current"
                              ? "warning.light"
                              : waypoint.visitStatus === "visited"
                              ? "action.disabledBackground"
                              : "inherit",
                          transition: "background-color 0.3s",
                        }}
                        secondaryAction={
                          <IconButton
                            onClick={() =>
                              setExpandedWaypoint(
                                expandedWaypoint === waypoint.id ? null : waypoint.id
                              )
                            }
                          >
                            {expandedWaypoint === waypoint.id ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </IconButton>
                        }
                      >
                        <ListItemIcon>
                          <Badge
                            badgeContent={index + 1}
                            color={
                              waypoint.visitStatus === "visited"
                                ? "default"
                                : waypoint.visitStatus === "current"
                                ? "warning"
                                : "primary"
                            }
                          >
                            <LocationOnIcon
                              color={
                                waypoint.visitStatus === "visited"
                                  ? "disabled"
                                  : waypoint.visitStatus === "current"
                                  ? "warning"
                                  : "primary"
                              }
                            />
                          </Badge>
                        </ListItemIcon>
                        <ListItemText
                          primary={waypoint.targetName}
                          secondary={
                            <Stack direction="row" spacing={1} mt={0.5}>
                              {waypoint.distanceFromPrevious && (
                                <Typography variant="caption">
                                  📍 {(waypoint.distanceFromPrevious / 1000).toFixed(1)} km
                                </Typography>
                              )}
                              {waypoint.estimatedArrival && (
                                <Typography variant="caption">
                                  ⏱️ ETA: {formatTimeForDisplay(waypoint.estimatedArrival)}
                                </Typography>
                              )}
                            </Stack>
                          }
                          primaryTypographyProps={{
                            fontWeight: waypoint.visitStatus === "current" ? "bold" : "normal",
                            sx: {
                              textDecoration:
                                waypoint.visitStatus === "visited" ||
                                waypoint.visitStatus === "skipped"
                                  ? "line-through"
                                  : "none",
                            },
                          }}
                        />
                        {getWaypointStatusChip(waypoint.visitStatus)}
                      </ListItem>

                      {/* Expanded Details */}
                      <Collapse in={expandedWaypoint === waypoint.id}>
                        <Box sx={{ px: 3, py: 2, bgcolor: "action.hover" }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {waypoint.location.address}
                          </Typography>

                          <Stack direction="row" spacing={1} mt={2}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<NavigationIcon />}
                              onClick={() => handleNavigate(waypoint)}
                            >
                              Navigate
                            </Button>

                            {waypoint.visitStatus !== "visited" &&
                              waypoint.visitStatus !== "skipped" && (
                                <>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="success"
                                    startIcon={<CheckCircleIcon />}
                                    onClick={() => handleCompleteWaypoint(waypoint.id)}
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    startIcon={<SkipNextIcon />}
                                    onClick={() => handleSkipWaypoint(waypoint.id)}
                                  >
                                    Skip
                                  </Button>
                                </>
                              )}
                          </Stack>
                        </Box>
                      </Collapse>

                      <Divider />
                    </Box>
                  ))}
                </List>
              </Paper>
            )}

            {/* Quick Actions */}
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Actions
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleGenerateRoute}
                  disabled={isGenerating}
                >
                  Recalculate
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setShowConfirmCancel(true)}
                >
                  Cancel Route
                </Button>
              </Stack>
            </Paper>
          </>
        )}

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showConfirmCancel} onClose={() => setShowConfirmCancel(false)}>
          <DialogTitle>Cancel Route?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to cancel this route? Your progress will be lost.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmCancel(false)}>Keep Route</Button>
            <Button color="error" onClick={handleCancelRoute}>
              Cancel Route
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
