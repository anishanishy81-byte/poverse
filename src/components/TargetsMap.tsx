"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, CircularProgress, Chip, Stack, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { TargetVisit } from "@/types/target";

interface TargetsMapProps {
  userLatitude: number;
  userLongitude: number;
  activeTargets: TargetVisit[];
  completedTargets: TargetVisit[];
  onTargetClick?: (visit: TargetVisit) => void;
  height?: number | string;
  showLegend?: boolean;
}

// Custom flag marker SVG paths
const FLAG_MARKER_PATH = "M12 2L4 5v5.5c0 5.2 3.4 9.9 8 11.5 4.6-1.6 8-6.3 8-11.5V5l-8-3z";

export function TargetsMap({
  userLatitude,
  userLongitude,
  activeTargets,
  completedTargets,
  onTargetClick,
  height = 300,
  showLegend = true,
}: TargetsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = () => {
      if (!window.google?.maps) {
        setMapError("Google Maps not loaded");
        setIsLoading(false);
        return;
      }

      try {
        const map = new google.maps.Map(mapContainerRef.current!, {
          center: { lat: userLatitude, lng: userLongitude },
          zoom: 14,
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

        mapRef.current = map;
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError("Failed to initialize map");
        setIsLoading(false);
      }
    };

    // Try immediately or retry
    if (window.google?.maps) {
      initMap();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.google?.maps) {
          clearInterval(interval);
          initMap();
        } else if (attempts >= 20) {
          clearInterval(interval);
          setMapError("Google Maps failed to load");
          setIsLoading(false);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [userLatitude, userLongitude]);

  // Update markers when targets change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: userLatitude, lng: userLongitude });

    // Add user location marker (blue circle)
    const userMarker = new google.maps.Marker({
      position: { lat: userLatitude, lng: userLongitude },
      map: mapRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      title: "Your Location",
      zIndex: 1000,
    });
    markersRef.current.push(userMarker);

    // Add active target markers (red/orange flags)
    activeTargets.forEach((visit) => {
      const position = {
        lat: visit.location.latitude,
        lng: visit.location.longitude,
      };
      bounds.extend(position);

      // Determine marker color based on status
      let fillColor = "#FF5722"; // Default orange for pending
      let title = `${visit.targetName} (Pending)`;

      if (visit.status === "in_transit") {
        fillColor = "#2196F3"; // Blue for in transit
        title = `${visit.targetName} (In Transit)`;
      } else if (visit.status === "reached") {
        fillColor = "#FF9800"; // Orange for reached
        title = `${visit.targetName} (Reached)`;
      } else if (visit.status === "in_progress") {
        fillColor = "#9C27B0"; // Purple for in progress
        title = `${visit.targetName} (In Progress)`;
      }

      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          path: FLAG_MARKER_PATH,
          scale: 1.5,
          fillColor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          anchor: new google.maps.Point(12, 24),
        },
        title,
        zIndex: visit.status === "in_progress" ? 999 : 500,
      });

      marker.addListener("click", () => {
        onTargetClick?.(visit);
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${visit.targetName}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${visit.location.address?.substring(0, 50) || ""}</div>
            <div style="display: inline-block; padding: 2px 8px; background: ${fillColor}; color: white; border-radius: 12px; font-size: 11px;">
              ${visit.status.replace("_", " ").toUpperCase()}
            </div>
          </div>
        `,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(mapRef.current, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });

    // Add completed target markers (green checkmark flags)
    completedTargets.forEach((visit) => {
      const position = {
        lat: visit.location.latitude,
        lng: visit.location.longitude,
      };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          path: FLAG_MARKER_PATH,
          scale: 1.5,
          fillColor: "#4CAF50", // Green for completed
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          anchor: new google.maps.Point(12, 24),
        },
        title: `${visit.targetName} (Completed)`,
        zIndex: 100,
      });

      marker.addListener("click", () => {
        onTargetClick?.(visit);
      });

      // Add info window with completion info
      const completedTime = visit.completedAt
        ? new Date(visit.completedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 4px;">✓ ${visit.targetName}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${visit.location.address?.substring(0, 50) || ""}</div>
            <div style="display: inline-block; padding: 2px 8px; background: #4CAF50; color: white; border-radius: 12px; font-size: 11px;">
              Completed ${completedTime}
            </div>
          </div>
        `,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(mapRef.current, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if there are targets
    if (activeTargets.length > 0 || completedTargets.length > 0) {
      mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      
      // Don't zoom in too much
      const listener = mapRef.current.addListener("idle", () => {
        const zoom = mapRef.current?.getZoom();
        if (zoom && zoom > 16) {
          mapRef.current?.setZoom(16);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [activeTargets, completedTargets, userLatitude, userLongitude, onTargetClick]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: userLatitude, lng: userLongitude });
      mapRef.current.setZoom(14);
    }
  };

  if (mapError) {
    return (
      <Box
        sx={{
          height,
          bgcolor: "grey.100",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">{mapError}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.100",
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box ref={mapContainerRef} sx={{ height, width: "100%" }} />

      {/* Recenter Button */}
      <Tooltip title="Center on my location">
        <IconButton
          onClick={handleRecenter}
          size="small"
          sx={{
            position: "absolute",
            bottom: showLegend ? 56 : 16,
            right: 16,
            bgcolor: "white",
            boxShadow: 2,
            "&:hover": { bgcolor: "grey.100" },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Tooltip>

      {/* Legend */}
      {showLegend && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            bgcolor: "rgba(255,255,255,0.95)",
            borderRadius: 1,
            p: 1,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: "#4285F4", borderRadius: "50%" }} />
            <Typography variant="caption">You</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: "#FF5722", borderRadius: 0.5 }} />
            <Typography variant="caption">Pending</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: "#2196F3", borderRadius: 0.5 }} />
            <Typography variant="caption">In Transit</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: "#9C27B0", borderRadius: 0.5 }} />
            <Typography variant="caption">In Progress</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: "#4CAF50", borderRadius: 0.5 }} />
            <Typography variant="caption">Completed</Typography>
          </Stack>
        </Box>
      )}

      {/* Target Count */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          display: "flex",
          gap: 1,
        }}
      >
        {activeTargets.length > 0 && (
          <Chip
            label={`${activeTargets.length} Active`}
            size="small"
            sx={{ bgcolor: "white", boxShadow: 1 }}
          />
        )}
        {completedTargets.length > 0 && (
          <Chip
            label={`${completedTargets.length} Completed Today`}
            size="small"
            color="success"
            sx={{ boxShadow: 1 }}
          />
        )}
      </Box>
    </Box>
  );
}

export default TargetsMap;
