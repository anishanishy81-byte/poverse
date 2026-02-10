"use client";

import { useCallback, useState, memo, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle, TrafficLayer, TransitLayer } from "@react-google-maps/api";
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper, 
  Stack, 
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Collapse,
  Divider,
  Button,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MapIcon from "@mui/icons-material/Map";
import SatelliteAltIcon from "@mui/icons-material/SatelliteAlt";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrafficIcon from "@mui/icons-material/Traffic";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import SettingsIcon from "@mui/icons-material/Settings";
import PlaceIcon from "@mui/icons-material/Place";
import HomeIcon from "@mui/icons-material/Home";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import LayersIcon from "@mui/icons-material/Layers";

// Libraries needed for Places API
const libraries: ("places" | "geometry" | "drawing")[] = ["places", "geometry"];

interface LocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number | null;
  userName?: string;
  height?: string | number;
  showInfoWindow?: boolean;
  showControls?: boolean;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

type MapTypeId = "roadmap" | "satellite" | "terrain" | "hybrid";

// Memoized map component to prevent unnecessary reloads
const LocationMapInner = memo(function LocationMapInner({
  latitude,
  longitude,
  accuracy,
  timestamp,
  userName,
  showInfoWindow = true,
  showControls = true,
}: Omit<LocationMapProps, "height">) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);
  const [infoOpen, setInfoOpen] = useState(showInfoWindow);
  const [mapType, setMapType] = useState<MapTypeId>("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(16);
  const [copied, setCopied] = useState(false);
  
  // Track if user has manually interacted with the map (panned/zoomed)
  const [userInteracted, setUserInteracted] = useState(false);
  // Store the initial center position
  const initialCenterRef = useRef({ lat: latitude, lng: longitude });
  // Track if this is first render
  const isFirstRenderRef = useRef(true);

  const currentPosition = { lat: latitude, lng: longitude };

  // Reverse geocoding to get address
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google && latitude && longitude) {
      setLoadingAddress(true);
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: currentPosition }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          setAddress("Address not found");
        }
        setLoadingAddress(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLoad = useCallback((mapInstance: any) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleRecenter = () => {
    if (map) {
      map.panTo(currentPosition);
      map.setZoom(16);
      setZoomLevel(16);
      setUserInteracted(false); // Reset so map follows user again
    }
  };

  const handleZoomIn = () => {
    if (map) {
      const newZoom = Math.min(zoomLevel + 1, 21);
      map.setZoom(newZoom);
      setZoomLevel(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const newZoom = Math.max(zoomLevel - 1, 1);
      map.setZoom(newZoom);
      setZoomLevel(newZoom);
    }
  };

  const handleMapTypeChange = (_: React.MouseEvent<HTMLElement>, newType: MapTypeId | null) => {
    if (newType) {
      setMapType(newType);
      if (map) {
        map.setMapTypeId(newType);
      }
    }
  };

  const toggleFullscreen = () => {
    const mapContainer = document.getElementById("location-map-container");
    if (!document.fullscreenElement && mapContainer) {
      mapContainer.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLocation = () => {
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    if (navigator.share) {
      navigator.share({
        title: "My Location",
        text: address || `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        url: googleMapsUrl,
      });
    } else {
      window.open(googleMapsUrl, "_blank");
    }
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, "_blank");
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getMapOptions = () => ({
    disableDefaultUI: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    rotateControl: true,
    scaleControl: true,
    clickableIcons: true,
    gestureHandling: "greedy",
    styles: mapType === "roadmap" ? [
      {
        featureType: "poi.business",
        stylers: [{ visibility: "on" }],
      },
      {
        featureType: "transit",
        elementType: "labels.icon",
        stylers: [{ visibility: showTransit ? "on" : "off" }],
      },
    ] : [],
  });

  // Get marker icon
  const getMarkerIcon = () => {
    const googleRef = typeof window !== "undefined" ? (window as any).google : null;
    if (googleRef) {
      return {
        path: googleRef.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      };
    }
    return undefined;
  };

  // Smoothly pan to user's location only if they haven't manually interacted
  useEffect(() => {
    if (map && !userInteracted && !isFirstRenderRef.current) {
      // Don't re-center the map, just let the marker move
      // User's position updates but map stays where user positioned it
    }
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
    }
  }, [latitude, longitude, map, userInteracted]);

  return (
    <Box id="location-map-container" sx={{ position: "relative", height: "100%", width: "100%" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={isFirstRenderRef.current ? currentPosition : undefined}
        zoom={zoomLevel}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={getMapOptions()}
        onDragStart={() => setUserInteracted(true)}
        onZoomChanged={() => {
          if (map) {
            setZoomLevel(map.getZoom() || 16);
            setUserInteracted(true);
          }
        }}
      >
        {/* Traffic Layer */}
        {showTraffic && <TrafficLayer />}
        
        {/* Transit Layer */}
        {showTransit && <TransitLayer />}

        {/* Accuracy circle */}
        {accuracy && (
          <Circle
            center={currentPosition}
            radius={accuracy}
            options={{
              fillColor: "#4285F4",
              fillOpacity: 0.1,
              strokeColor: "#4285F4",
              strokeOpacity: 0.3,
              strokeWeight: 2,
            }}
          />
        )}

        {/* Pulse animation circle */}
        <Circle
          center={currentPosition}
          radius={20}
          options={{
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeColor: "#4285F4",
            strokeOpacity: 0.5,
            strokeWeight: 1,
          }}
        />

        {/* Current location marker */}
        <Marker
          position={currentPosition}
          onClick={() => setInfoOpen(true)}
          icon={getMarkerIcon()}
          animation={typeof window !== "undefined" && (window as any).google ? (window as any).google.maps.Animation.DROP : undefined}
        />

        {/* Info Window */}
        {infoOpen && (
          <InfoWindow
            position={currentPosition}
            onCloseClick={() => setInfoOpen(false)}
          >
            <Box sx={{ p: 1, minWidth: 250, maxWidth: 300 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MyLocationIcon sx={{ fontSize: 20, color: "#4285F4" }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {userName || "Your Location"}
                  </Typography>
                </Stack>
                
                {/* Address */}
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <HomeIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    {loadingAddress ? "Loading address..." : address}
                  </Typography>
                </Stack>

                <Divider />

                {/* Coordinates */}
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy coordinates"}>
                    <IconButton size="small" onClick={copyCoordinates}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Accuracy & Time */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {accuracy && (
                    <Chip
                      size="small"
                      icon={<PlaceIcon sx={{ fontSize: 14 }} />}
                      label={`±${Math.round(accuracy)}m`}
                      sx={{ fontSize: "0.7rem", height: 24 }}
                      color={accuracy < 30 ? "success" : accuracy < 100 ? "warning" : "error"}
                    />
                  )}
                  {timestamp && (
                    <Chip
                      size="small"
                      icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                      label={formatTimestamp(timestamp)}
                      sx={{ fontSize: "0.7rem", height: 24 }}
                    />
                  )}
                </Stack>

                {/* Actions */}
                <Stack direction="row" spacing={1}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
                    onClick={shareLocation}
                    sx={{ flex: 1, fontSize: "0.75rem" }}
                  >
                    Share
                  </Button>
                  <Button 
                    size="small" 
                    variant="contained" 
                    onClick={openInGoogleMaps}
                    sx={{ flex: 1, fontSize: "0.75rem" }}
                  >
                    Open in Maps
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Controls Overlay */}
      {showControls && (
        <>
          {/* Top Left - Map Type Selector */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 1,
            }}
          >
            <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
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

          {/* Top Right - Layer Toggles & Settings */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 1,
            }}
          >
            <Stack spacing={1}>
              <Paper elevation={2} sx={{ borderRadius: 2 }}>
                <Stack direction="row">
                  <Tooltip title="Toggle Traffic">
                    <IconButton 
                      onClick={() => setShowTraffic(!showTraffic)}
                      color={showTraffic ? "primary" : "default"}
                      size="small"
                    >
                      <TrafficIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Toggle Transit">
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

              {/* Settings Panel */}
              <Paper elevation={2} sx={{ borderRadius: 2 }}>
                <Tooltip title="More Options">
                  <IconButton onClick={() => setShowSettings(!showSettings)} size="small">
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Paper>
              
              <Collapse in={showSettings}>
                <Paper elevation={2} sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="caption" fontWeight={600}>
                      Quick Actions
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      fullWidth
                      startIcon={<ContentCopyIcon />}
                      onClick={copyCoordinates}
                    >
                      {copied ? "Copied!" : "Copy Coords"}
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      fullWidth
                      startIcon={<ShareIcon />}
                      onClick={shareLocation}
                    >
                      Share Location
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained" 
                      fullWidth
                      onClick={openInGoogleMaps}
                    >
                      Open in Google Maps
                    </Button>
                  </Stack>
                </Paper>
              </Collapse>
            </Stack>
          </Box>

          {/* Right Side - Zoom Controls */}
          <Box
            sx={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
            }}
          >
            <Paper elevation={2} sx={{ borderRadius: 2 }}>
              <Stack>
                <IconButton onClick={handleZoomIn} size="small">
                  <ZoomInIcon />
                </IconButton>
                <Divider />
                <Box sx={{ px: 1, py: 0.5, textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    {zoomLevel}
                  </Typography>
                </Box>
                <Divider />
                <IconButton onClick={handleZoomOut} size="small">
                  <ZoomOutIcon />
                </IconButton>
              </Stack>
            </Paper>
          </Box>

          {/* Bottom Right - Recenter Button */}
          <Box
            sx={{
              position: "absolute",
              bottom: 20,
              right: 10,
              zIndex: 1,
            }}
          >
            <Paper elevation={3} sx={{ borderRadius: "50%" }}>
              <Tooltip title="Center on my location">
                <IconButton 
                  onClick={handleRecenter}
                  sx={{ 
                    bgcolor: "white",
                    "&:hover": { bgcolor: "grey.100" },
                  }}
                >
                  <MyLocationIcon sx={{ color: "#4285F4" }} />
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>

          {/* Bottom Left - Location Info */}
          <Box
            sx={{
              position: "absolute",
              bottom: 20,
              left: 10,
              zIndex: 1,
              maxWidth: "calc(100% - 80px)",
            }}
          >
            <Paper 
              elevation={2} 
              sx={{ 
                px: 2, 
                py: 1, 
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.95)",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOnIcon sx={{ color: "#4285F4", fontSize: 18 }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    maxWidth: 250, 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    whiteSpace: "nowrap" 
                  }}
                >
                  {loadingAddress ? "Loading..." : address}
                </Typography>
              </Stack>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
});

export function LocationMap({
  latitude,
  longitude,
  accuracy,
  timestamp,
  userName,
  height = 400,
  showInfoWindow = true,
  showControls = true,
}: LocationMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  if (loadError) {
    return (
      <Paper
        sx={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
        }}
      >
        <Stack spacing={1} alignItems="center">
          <LocationOnIcon sx={{ fontSize: 48, color: "error.main" }} />
          <Typography color="error">Failed to load Google Maps</Typography>
          <Typography variant="caption" color="text.secondary">
            Please check your API key configuration
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (!isLoaded) {
    return (
      <Paper
        sx={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Loading map...</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box sx={{ height, borderRadius: 2, overflow: "hidden" }}>
      <LocationMapInner
        latitude={latitude}
        longitude={longitude}
        accuracy={accuracy}
        timestamp={timestamp}
        userName={userName}
        showInfoWindow={showInfoWindow}
        showControls={showControls}
      />
    </Box>
  );
}

export default LocationMap;
