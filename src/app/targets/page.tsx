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
  TextField,
  IconButton,
  List,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  FormLabel,
  Tabs,
  Tab,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import DirectionsIcon from "@mui/icons-material/Directions";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import NearMeIcon from "@mui/icons-material/NearMe";
import MapIcon from "@mui/icons-material/Map";
import QrCodeIcon from "@mui/icons-material/QrCode";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import StorefrontIcon from "@mui/icons-material/Storefront";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import RouteIcon from "@mui/icons-material/Route";
import { useAppStore, useCompany, useHasHydrated } from "@/store";
import { useTrackedLocation } from "@/hooks";
import {
  TargetVisit,
  LeadStatus,
  VisitReason,
  OutcomeFlag,
  TargetOffer,
  TargetLocation,
} from "@/types/target";
import {
  createTarget,
  assignTargetToUser,
  subscribeToUserActiveVisits,
  startTransitToTarget,
  checkAndMarkReached,
  startWorkTimer,
  completeVisit,
  skipVisit,
  calculateDistance,
  getLeadStatusInfo,
  getTargetStatusInfo,
  getVisitReasonInfo,
  getOutcomeFlagInfo,
  VISIT_REASONS,
  OUTCOME_FLAGS,
  LEAD_STATUSES,
  startNavigationTracking,
  addNavigationPoint,
  completeNavigationTracking,
  cancelNavigationTracking,
  getActiveNavigation,
  NavigationTrackingEntry,
  subscribeToUserPastVisits,
  PastVisitsFilter,
} from "@/lib/targetTracking";
import {
  openNavigation,
  generateNavigationLinks,
} from "@/lib/routeOptimization";

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  types?: string[];
  distance?: number;
}

// Place type categories for nearby search
const PLACE_CATEGORIES = [
  { type: "store", label: "Stores", icon: <StorefrontIcon /> },
  { type: "restaurant", label: "Restaurants", icon: <RestaurantIcon /> },
  { type: "hospital", label: "Healthcare", icon: <LocalHospitalIcon /> },
  { type: "school", label: "Education", icon: <SchoolIcon /> },
  { type: "establishment", label: "Businesses", icon: <BusinessIcon /> },
  { type: "supermarket", label: "Supermarkets", icon: <LocalGroceryStoreIcon /> },
];

// Helper to calculate distance from starting location to target location
const calculateStartToTargetDistance = (
  startLat: number,
  startLng: number,
  targetLat: number,
  targetLng: number
): number => {
  // Returns distance in km
  const distanceMeters = calculateDistance(startLat, startLng, targetLat, targetLng);
  return distanceMeters / 1000;
};

// Helper to get visit distance in km - either from saved navigationDistanceKm or calculated from startingLocation to targetLocation
const getVisitDistanceKm = (visit: TargetVisit): number | null => {
  // First try to use the saved navigation distance
  if (typeof visit.navigationDistanceKm === 'number' && !isNaN(visit.navigationDistanceKm)) {
    return visit.navigationDistanceKm;
  }
  
  // Calculate from navigationStartLocation to target location
  const startLat = visit.navigationStartLocation?.latitude;
  const startLng = visit.navigationStartLocation?.longitude;
  const targetLat = visit.location?.latitude;
  const targetLng = visit.location?.longitude;
  
  if (startLat && startLng && targetLat && targetLng) {
    return calculateStartToTargetDistance(startLat, startLng, targetLat, targetLng);
  }
  
  return null;
};

export default function TargetsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const company = useCompany();
  
  // Use geolocation hook directly for better control
  const geoHook = useTrackedLocation({
    userId: user?.id,
    companyId: user?.companyId,
    userName: user?.name,
    enableTracking: true,
  });
  
  const userLat = geoHook.latitude;
  const userLon = geoHook.longitude;

  const [isLoading, setIsLoading] = useState(true);
  const [activeVisits, setActiveVisits] = useState<TargetVisit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<TargetVisit | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchTab, setSearchTab] = useState(0); // 0: Nearby, 1: Search, 2: Code, 3: Map
  const [selectedCategory, setSelectedCategory] = useState<string>("store");
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  
  // Map state
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    name: string;
  } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  // Add target dialog
  const [showAddTargetDialog, setShowAddTargetDialog] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [newTargetData, setNewTargetData] = useState({
    name: "",
    description: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    visitReason: "sales_pitch" as VisitReason,
    visitReasonNote: "",
  });
  
  // Complete visit dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeData, setCompleteData] = useState({
    conversationNotes: "",
    outcome: "",
    leadStatus: "contacted" as LeadStatus,
    outcomeFlags: [] as OutcomeFlag[],
    offersDiscussed: [] as TargetOffer[],
    nextFollowUpDate: "",
  });
  
  // Skip dialog
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  
  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Navigation Tracking
  const [activeNavigation, setActiveNavigation] = useState<NavigationTrackingEntry | null>(null);
  const navigationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Past Visits History
  const [pastVisits, setPastVisits] = useState<TargetVisit[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "skipped">("all");
  const [historyDetailVisit, setHistoryDetailVisit] = useState<TargetVisit | null>(null);
  const [showHistoryDetailDialog, setShowHistoryDetailDialog] = useState(false);
  
  // Google Maps
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    setIsLoading(false);
  }, [hasHydrated, isAuthenticated, user, router]);

  // Request location on mount
  useEffect(() => {
    if (!locationRequested && geoHook.requestLocation) {
      setLocationRequested(true);
      geoHook.requestLocation();
    }
  }, [locationRequested, geoHook.requestLocation]);

  // Initialize Google Maps services - with retry logic
  useEffect(() => {
    const initMaps = () => {
      if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
        const mapDiv = document.createElement("div");
        const map = new (window as any).google.maps.Map(mapDiv);
        placesServiceRef.current = new (window as any).google.maps.places.PlacesService(map);
        autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
        geocoderRef.current = new (window as any).google.maps.Geocoder();
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Try immediately
    if (initMaps()) return;

    // Retry every 500ms for up to 10 seconds
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

  // Set map center when user location is available
  useEffect(() => {
    if (userLat && userLon && !mapCenter) {
      setMapCenter({ lat: userLat, lng: userLon });
    }
  }, [userLat, userLon, mapCenter]);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserActiveVisits(user.id, (visits) => {
      setActiveVisits(visits);
      if (selectedVisit) {
        const updated = visits.find(v => v.id === selectedVisit.id);
        if (updated) setSelectedVisit(updated);
      }
    });

    return () => unsubscribe();
  }, [user?.id, selectedVisit?.id]);

  // Subscribe to past visits
  useEffect(() => {
    if (!user?.id) return;
    
    const filter: PastVisitsFilter = {
      status: historyFilter === "all" ? "all" : historyFilter,
      limit: 100,
    };
    
    const unsubscribe = subscribeToUserPastVisits(user.id, (visits) => {
      setPastVisits(visits);
    }, filter);
    
    return () => unsubscribe();
  }, [user?.id, historyFilter]);

  // Restore active navigation on mount (in case of page refresh)
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchActiveNavigation = async () => {
      try {
        const nav = await getActiveNavigation(user.id);
        if (nav) {
          setActiveNavigation(nav);
        }
      } catch (error) {
        console.error("Error fetching active navigation:", error);
      }
    };
    
    fetchActiveNavigation();
  }, [user?.id]);

  useEffect(() => {
    if (selectedVisit?.status === "in_progress" && selectedVisit.timerStartedAt) {
      const updateTimer = () => {
        const startTime = new Date(selectedVisit.timerStartedAt!).getTime();
        const now = Date.now();
        setTimerSeconds(Math.floor((now - startTime) / 1000));
      };
      
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [selectedVisit?.status, selectedVisit?.timerStartedAt]);

  // Load nearby places when tab changes or category changes
  useEffect(() => {
    if (searchTab === 0 && userLat && userLon && mapsLoaded) {
      loadNearbyPlaces();
    }
  }, [searchTab, selectedCategory, userLat, userLon, mapsLoaded]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const loadNearbyPlaces = useCallback(async () => {
    if (!placesServiceRef.current || !userLat || !userLon) return;
    
    setIsLoadingNearby(true);
    
    const request = {
      location: new (window as any).google.maps.LatLng(userLat, userLon),
      radius: 2000, // 2km radius
      type: selectedCategory,
    };
    
    placesServiceRef.current.nearbySearch(
      request,
      (results: any[] | null, status: string) => {
        if (status === "OK" && results) {
          const placesWithDistance = results.map((place) => {
            const placeLat = place.geometry.location.lat();
            const placeLon = place.geometry.location.lng();
            const distance = calculateDistance(userLat, userLon, placeLat, placeLon);
            return {
              place_id: place.place_id,
              name: place.name,
              formatted_address: place.vicinity || place.formatted_address || "",
              geometry: place.geometry,
              types: place.types,
              distance,
            };
          });
          
          // Sort by distance
          placesWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
          setNearbyPlaces(placesWithDistance.slice(0, 15));
        } else {
          setNearbyPlaces([]);
        }
        setIsLoadingNearby(false);
      }
    );
  }, [userLat, userLon, selectedCategory]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !autocompleteServiceRef.current) return;
    
    setIsSearching(true);
    
    try {
      const request: any = {
        input: searchQuery,
        types: ["establishment", "geocode"],
      };
      
      // Bias search results to user's current location
      if (userLat && userLon) {
        request.locationBias = {
          center: { lat: userLat, lng: userLon },
          radius: 50000, // 50km bias
        };
      }
      
      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === "OK" && predictions) {
            const detailPromises = predictions.slice(0, 8).map(
              (prediction) =>
                new Promise<PlaceResult | null>((resolve) => {
                  if (!placesServiceRef.current) {
                    resolve(null);
                    return;
                  }
                  placesServiceRef.current.getDetails(
                    { placeId: prediction.place_id, fields: ["name", "formatted_address", "geometry", "place_id", "types"] },
                    (place: any, detailStatus: string) => {
                      if (detailStatus === "OK" && place) {
                        const placeResult: PlaceResult = {
                          place_id: place.place_id,
                          name: place.name,
                          formatted_address: place.formatted_address,
                          geometry: place.geometry,
                          types: place.types,
                        };
                        
                        // Calculate distance if user location available
                        if (userLat && userLon) {
                          const placeLat = place.geometry.location.lat();
                          const placeLon = place.geometry.location.lng();
                          placeResult.distance = calculateDistance(userLat, userLon, placeLat, placeLon);
                        }
                        
                        resolve(placeResult);
                      } else {
                        resolve(null);
                      }
                    }
                  );
                })
            );
            
            Promise.all(detailPromises).then((results) => {
              const validResults = results.filter((r): r is PlaceResult => r !== null);
              // Sort by distance
              validResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
              setSearchResults(validResults);
              setIsSearching(false);
            });
          } else {
            setSearchResults([]);
            setIsSearching(false);
          }
        }
      );
    } catch (error) {
      console.error("Search error:", error);
      setIsSearching(false);
    }
  }, [searchQuery, userLat, userLon]);

  // Search by postal code
  const handleCodeSearch = useCallback(async () => {
    if (!searchQuery.trim() || !geocoderRef.current || !placesServiceRef.current) return;
    
    setIsSearching(true);
    
    try {
      // First geocode the postal code
      geocoderRef.current.geocode(
        { address: searchQuery },
        (results: any[] | null, status: string) => {
          if (status === "OK" && results && results.length > 0) {
            const location = results[0].geometry.location;
            
            // Then search for places near that postal code
            placesServiceRef.current!.nearbySearch(
              {
                location,
                radius: 1000,
                type: "establishment",
              },
              (places: any[] | null, placesStatus: string) => {
                if (placesStatus === "OK" && places) {
                  const placesWithDistance = places.map((place) => {
                    const placeLat = place.geometry.location.lat();
                    const placeLon = place.geometry.location.lng();
                    let distance: number | undefined;
                    if (userLat && userLon) {
                      distance = calculateDistance(userLat, userLon, placeLat, placeLon);
                    }
                    return {
                      place_id: place.place_id,
                      name: place.name,
                      formatted_address: place.vicinity || place.formatted_address || "",
                      geometry: place.geometry,
                      types: place.types,
                      distance,
                    };
                  });
                  
                  placesWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
                  setSearchResults(placesWithDistance.slice(0, 15));
                } else {
                  setSearchResults([]);
                }
                setIsSearching(false);
              }
            );
          } else {
            setSearchResults([]);
            setIsSearching(false);
          }
        }
      );
    } catch (error) {
      console.error("Code search error:", error);
      setIsSearching(false);
    }
  }, [searchQuery, userLat, userLon]);

  // Initialize map when map dialog opens
  useEffect(() => {
    if (!showMapDialog) {
      // Clean up when dialog closes
      mapRef.current = null;
      markerRef.current = null;
      return;
    }

    // Wait a bit for the dialog to render
    const initMap = () => {
      if (!mapContainerRef.current || !mapsLoaded) {
        return false;
      }

      // Use default location if user location not available
      const defaultLat = 28.6139; // Delhi as default
      const defaultLng = 77.2090;
      const center = { 
        lat: userLat || mapCenter?.lat || defaultLat, 
        lng: userLon || mapCenter?.lng || defaultLng 
      };
      
      console.log("Initializing map with center:", center);
      
      try {
        mapRef.current = new (window as any).google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
        });
        
        // Add click listener
        mapRef.current?.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          
          // Reverse geocode to get address
          if (geocoderRef.current) {
            geocoderRef.current.geocode(
              { location: { lat, lng } },
              (results: any[] | null, status: string) => {
                if (status === "OK" && results && results.length > 0) {
                  setSelectedMapLocation({
                    lat,
                    lng,
                    address: results[0].formatted_address,
                    name: results[0].formatted_address.split(",")[0],
                  });
                  
                  // Update marker
                  if (markerRef.current) {
                    markerRef.current.setPosition({ lat, lng });
                  } else {
                    markerRef.current = new (window as any).google.maps.Marker({
                      position: { lat, lng },
                      map: mapRef.current,
                      draggable: true,
                    });
                    
                    markerRef.current?.addListener("dragend", (e: any) => {
                      const newLat = e.latLng.lat();
                      const newLng = e.latLng.lng();
                      
                      geocoderRef.current?.geocode(
                        { location: { lat: newLat, lng: newLng } },
                        (results: any[] | null, status: string) => {
                          if (status === "OK" && results && results.length > 0) {
                            setSelectedMapLocation({
                              lat: newLat,
                              lng: newLng,
                              address: results[0].formatted_address,
                              name: results[0].formatted_address.split(",")[0],
                            });
                          }
                        }
                      );
                    });
                  }
                }
              }
            );
          }
        });
        
        // Add current location marker if available
        if (userLat && userLon) {
          new (window as any).google.maps.Marker({
            position: { lat: userLat, lng: userLon },
            map: mapRef.current,
            icon: {
              path: (window as any).google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            title: "Your Location",
          });
        }
        
        return true;
      } catch (error) {
        console.error("Error initializing map:", error);
        return false;
      }
    };

    // Small delay to ensure container is rendered
    const timeout = setTimeout(() => {
      if (!initMap()) {
        // Retry after a bit more time
        setTimeout(initMap, 500);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [showMapDialog, mapsLoaded, mapCenter, userLat, userLon]);

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setNewTargetData({
      ...newTargetData,
      name: place.name,
    });
    setShowSearchDialog(false);
    setShowAddTargetDialog(true);
  };

  const handleSelectMapLocation = () => {
    if (!selectedMapLocation) return;
    
    const place: PlaceResult = {
      place_id: `map_${Date.now()}`,
      name: selectedMapLocation.name,
      formatted_address: selectedMapLocation.address,
      geometry: {
        location: {
          lat: () => selectedMapLocation.lat,
          lng: () => selectedMapLocation.lng,
        },
      },
    };
    
    handleSelectPlace(place);
    setShowMapDialog(false);
    setSelectedMapLocation(null);
  };

  const handleCreateTarget = async () => {
    if (!selectedPlace || !user || !company) {
      setSaveError("Missing required data. Please try again.");
      return;
    }
    
    setSavingTarget(true);
    setSaveError(null);
    
    try {
      const location: TargetLocation = {
        latitude: selectedPlace.geometry.location.lat(),
        longitude: selectedPlace.geometry.location.lng(),
        address: selectedPlace.formatted_address,
        placeId: selectedPlace.place_id,
        placeName: selectedPlace.name,
      };

      console.log("Creating target with location:", location);
      console.log("Company ID:", company.id);
      console.log("User ID:", user.id);

      const target = await createTarget(company.id, user.id, {
        name: newTargetData.name || selectedPlace.name,
        description: newTargetData.description || undefined,
        contactPerson: newTargetData.contactPerson || undefined,
        contactPhone: newTargetData.contactPhone || undefined,
        contactEmail: newTargetData.contactEmail || undefined,
        location,
        visitReason: newTargetData.visitReason,
        visitReasonNote: newTargetData.visitReasonNote || undefined,
      });

      console.log("Target created:", target);

      const visit = await assignTargetToUser(
        target, 
        user.id, 
        user.name, 
        user.id,
        newTargetData.visitReason,
        newTargetData.visitReasonNote || undefined
      );
      
      console.log("Visit assigned:", visit);
      
      setShowAddTargetDialog(false);
      setSelectedPlace(null);
      setNewTargetData({
        name: "",
        description: "",
        contactPerson: "",
        contactPhone: "",
        contactEmail: "",
        visitReason: "sales_pitch",
        visitReasonNote: "",
      });
      
      setSelectedVisit(visit);
      setSavingTarget(false);
    } catch (error) {
      console.error("Error creating target:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to create target. Please check your connection.");
      setSavingTarget(false);
    }
  };

  const handleStartTransit = async () => {
    if (!selectedVisit || !user || !company) return;
    
    // Start transit
    await startTransitToTarget(selectedVisit.id, user.id);
    
    // Start navigation tracking if we have user location and target location
    if (userLat && userLon && selectedVisit.location?.latitude && selectedVisit.location?.longitude) {
      try {
        const trackingId = await startNavigationTracking(
          selectedVisit.id,
          user.id,
          company.id,
          selectedVisit.targetId,
          selectedVisit.targetName,
          userLat,
          userLon,
          selectedVisit.location.latitude,
          selectedVisit.location.longitude
        );
        
        // Fetch the active navigation
        const nav = await getActiveNavigation(user.id);
        setActiveNavigation(nav);
        
        // Navigation tracking is now handled by the useEffect below that watches location changes
      } catch (error) {
        console.error("Error starting navigation tracking:", error);
      }
    }
  };

  // Effect to track navigation points
  useEffect(() => {
    if (!activeNavigation || !userLat || !userLon) return;
    
    // Update navigation point when location changes
    const updateNavPoint = async () => {
      if (activeNavigation.status === "in_progress") {
        await addNavigationPoint(activeNavigation.id, userLat, userLon);
      }
    };
    
    updateNavPoint();
  }, [userLat, userLon, activeNavigation]);
  
  // Clean up navigation interval
  useEffect(() => {
    return () => {
      if (navigationIntervalRef.current) {
        clearInterval(navigationIntervalRef.current);
      }
    };
  }, []);

  const handleCheckReached = async () => {
    if (!selectedVisit || !user || !userLat || !userLon) return;
    
    const result = await checkAndMarkReached(
      selectedVisit.id,
      user.id,
      userLat,
      userLon,
      selectedVisit.location.latitude,
      selectedVisit.location.longitude,
      100
    );
    
    if (result.success) {
      // Complete navigation tracking
      if (activeNavigation && activeNavigation.status === "in_progress") {
        try {
          await completeNavigationTracking(activeNavigation.id, userLat, userLon);
          setActiveNavigation(null);
          
          // Stop tracking interval
          if (navigationIntervalRef.current) {
            clearInterval(navigationIntervalRef.current);
            navigationIntervalRef.current = null;
          }
        } catch (error) {
          console.error("Error completing navigation tracking:", error);
        }
      }
    } else {
      alert(result.message);
    }
  };

  const handleStartTimer = async () => {
    if (!selectedVisit || !user) return;
    await startWorkTimer(selectedVisit.id, user.id);
  };

  const handleCompleteVisit = async () => {
    if (!selectedVisit || !user) return;
    
    try {
      await completeVisit(selectedVisit.id, user.id, selectedVisit.targetId, {
        conversationNotes: completeData.conversationNotes,
        outcome: completeData.outcome,
        leadStatus: completeData.leadStatus,
        outcomeFlags: completeData.outcomeFlags,
        offersDiscussed: completeData.offersDiscussed,
        nextFollowUpDate: completeData.nextFollowUpDate || undefined,
      });
      
      setShowCompleteDialog(false);
      setSelectedVisit(null);
      setCompleteData({
        conversationNotes: "",
        outcome: "",
        leadStatus: "contacted",
        outcomeFlags: [],
        offersDiscussed: [],
        nextFollowUpDate: "",
      });
    } catch (error) {
      console.error("Error completing visit:", error);
      alert("Failed to complete visit. Please try again.");
    }
  };

  const handleSkipVisit = async () => {
    if (!selectedVisit || !user || !skipReason.trim()) return;
    
    // Cancel navigation tracking if active
    if (activeNavigation && activeNavigation.status === "in_progress") {
      try {
        await cancelNavigationTracking(activeNavigation.id);
        setActiveNavigation(null);
        
        if (navigationIntervalRef.current) {
          clearInterval(navigationIntervalRef.current);
          navigationIntervalRef.current = null;
        }
      } catch (error) {
        console.error("Error cancelling navigation tracking:", error);
      }
    }
    
    await skipVisit(selectedVisit.id, user.id, skipReason);
    
    setShowSkipDialog(false);
    setSelectedVisit(null);
    setSkipReason("");
  };

  const getDistanceToTarget = (visit: TargetVisit): string => {
    if (!userLat || !userLon) return "Unknown";
    const distance = calculateDistance(
      userLat,
      userLon,
      visit.location.latitude,
      visit.location.longitude
    );
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatDistance = (distance: number | undefined): string => {
    if (distance === undefined) return "";
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 0,
          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
          color: "white",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton color="inherit" onClick={() => router.push("/dashboard")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600} flex={1}>
            Targets
          </Typography>
          {activeVisits.filter(v => v.status === "pending" || v.status === "in_transit").length > 1 && (
            <Button
              variant="outlined"
              startIcon={<RouteIcon />}
              onClick={() => router.push("/routes")}
              sx={{
                borderColor: "rgba(255,255,255,0.5)",
                color: "white",
                "&:hover": { 
                  borderColor: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              Plan Route
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddLocationIcon />}
            onClick={() => setShowSearchDialog(true)}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
          >
            Add Target
          </Button>
        </Stack>
      </Paper>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Active Visits */}
        {activeVisits.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Active Targets ({activeVisits.length})
            </Typography>
            <List>
              {activeVisits.map((visit) => {
                const statusInfo = getTargetStatusInfo(visit.status);
                const reasonInfo = getVisitReasonInfo(visit.visitReason);
                const isSelected = selectedVisit?.id === visit.id;
                
                return (
                  <ListItemButton
                    key={visit.id}
                    selected={isSelected}
                    onClick={() => setSelectedVisit(visit)}
                    sx={{ borderRadius: 2, mb: 1 }}
                  >
                    <ListItemIcon>
                      <LocationOnIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={visit.targetName}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            label={`${reasonInfo.icon} ${reasonInfo.label}`}
                            size="small"
                            sx={{ bgcolor: reasonInfo.color, color: "white", height: 20 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {getDistanceToTarget(visit)} away
                          </Typography>
                        </Stack>
                      }
                    />
                    <Chip
                      label={statusInfo.label}
                      size="small"
                      sx={{ bgcolor: statusInfo.color, color: "white" }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        )}

        {/* Selected Visit Details */}
        {selectedVisit && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  {selectedVisit.targetName}
                </Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  <Chip
                    label={getTargetStatusInfo(selectedVisit.status).label}
                    sx={{
                      bgcolor: getTargetStatusInfo(selectedVisit.status).color,
                      color: "white",
                    }}
                  />
                  <Chip
                    label={`${getVisitReasonInfo(selectedVisit.visitReason).icon} ${getVisitReasonInfo(selectedVisit.visitReason).label}`}
                    sx={{
                      bgcolor: getVisitReasonInfo(selectedVisit.visitReason).color,
                      color: "white",
                    }}
                  />
                </Stack>
              </Box>
              <Tooltip title="Skip this target">
                <IconButton
                  color="error"
                  onClick={() => setShowSkipDialog(true)}
                >
                  <SkipNextIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Location */}
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <LocationOnIcon color="action" />
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  {selectedVisit.location.address}
                </Typography>
                <Typography variant="caption" color="primary">
                  Distance: {getDistanceToTarget(selectedVisit)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Open in Google Maps">
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    onClick={() => openNavigation(
                      {
                        name: selectedVisit.targetName,
                        latitude: selectedVisit.location.latitude,
                        longitude: selectedVisit.location.longitude,
                      },
                      userLat && userLon ? { latitude: userLat, longitude: userLon } : undefined,
                      "google"
                    )}
                  >
                    <DirectionsIcon />
                  </Button>
                </Tooltip>
                <Tooltip title="Open in Apple Maps">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => openNavigation(
                      {
                        name: selectedVisit.targetName,
                        latitude: selectedVisit.location.latitude,
                        longitude: selectedVisit.location.longitude,
                      },
                      userLat && userLon ? { latitude: userLat, longitude: userLon } : undefined,
                      "apple"
                    )}
                  >
                    🍎
                  </Button>
                </Tooltip>
                <Tooltip title="Open in Waze">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => openNavigation(
                      {
                        name: selectedVisit.targetName,
                        latitude: selectedVisit.location.latitude,
                        longitude: selectedVisit.location.longitude,
                      },
                      userLat && userLon ? { latitude: userLat, longitude: userLon } : undefined,
                      "waze"
                    )}
                  >
                    W
                  </Button>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Contact Info */}
            {(selectedVisit.contactPerson || selectedVisit.contactPhone || selectedVisit.contactEmail) && (
              <Stack spacing={1} mb={2}>
                {selectedVisit.contactPerson && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedVisit.contactPerson}</Typography>
                  </Stack>
                )}
                {selectedVisit.contactPhone && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedVisit.contactPhone}</Typography>
                  </Stack>
                )}
                {selectedVisit.contactEmail && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedVisit.contactEmail}</Typography>
                  </Stack>
                )}
              </Stack>
            )}

            {selectedVisit.visitReasonNote && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> {selectedVisit.visitReasonNote}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Progress Stepper */}
            <Stepper activeStep={
              selectedVisit.status === "pending" ? 0 :
              selectedVisit.status === "in_transit" ? 1 :
              selectedVisit.status === "reached" ? 2 :
              selectedVisit.status === "in_progress" ? 3 : 4
            } sx={{ mb: 3 }}>
              <Step><StepLabel>Assigned</StepLabel></Step>
              <Step><StepLabel>In Transit</StepLabel></Step>
              <Step><StepLabel>Reached</StepLabel></Step>
              <Step><StepLabel>In Progress</StepLabel></Step>
              <Step><StepLabel>Complete</StepLabel></Step>
            </Stepper>

            {/* Timer Display */}
            {selectedVisit.status === "in_progress" && (
              <Box sx={{ textAlign: "center", mb: 3, p: 2, bgcolor: "primary.50", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Time Elapsed
                </Typography>
                <Typography variant="h3" fontWeight={700} color="primary">
                  {formatTime(timerSeconds)}
                </Typography>
              </Box>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} justifyContent="center">
              {selectedVisit.status === "pending" && (
                <Button
                  variant="contained"
                  startIcon={<DirectionsIcon />}
                  onClick={handleStartTransit}
                  sx={{ background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)" }}
                >
                  Start Navigation
                </Button>
              )}

              {selectedVisit.status === "in_transit" && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCheckReached}
                >
                  Mark as Reached
                </Button>
              )}

              {selectedVisit.status === "reached" && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartTimer}
                >
                  Start Work Timer
                </Button>
              )}

              {selectedVisit.status === "in_progress" && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<StopIcon />}
                  onClick={() => setShowCompleteDialog(true)}
                >
                  Complete Visit
                </Button>
              )}
            </Stack>
          </Paper>
        )}

        {/* Empty State */}
        {activeVisits.length === 0 && !selectedVisit && (
          <Paper sx={{ p: 6, textAlign: "center", borderRadius: 2 }}>
            <AddLocationIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Active Targets
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Search for a location to add it as a target
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddLocationIcon />}
              onClick={() => setShowSearchDialog(true)}
              sx={{ background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)" }}
            >
              Add Target
            </Button>
          </Paper>
        )}

        {/* Past Visits History */}
        <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Past Targets ({pastVisits.length})
            </Typography>
            <ToggleButtonGroup
              value={historyFilter}
              exclusive
              onChange={(_, v) => v && setHistoryFilter(v)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="completed">Completed</ToggleButton>
              <ToggleButton value="skipped">Skipped</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          
          {pastVisits.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">No past visits found</Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {pastVisits.map((visit) => {
                const statusInfo = getTargetStatusInfo(visit.status);
                const visitDate = visit.completedAt || visit.skippedAt || visit.assignedAt;
                
                return (
                  <ListItemButton
                    key={visit.id}
                    onClick={() => {
                      setHistoryDetailVisit(visit);
                      setShowHistoryDetailDialog(true);
                    }}
                    sx={{ borderRadius: 2, mb: 1, bgcolor: "grey.50" }}
                  >
                    <ListItemIcon>
                      {visit.status === "completed" ? (
                        <CheckCircleIcon sx={{ color: "#4caf50" }} />
                      ) : (
                        <SkipNextIcon sx={{ color: "#ff9800" }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={visit.targetName}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption">
                            {new Date(visitDate).toLocaleDateString([], { 
                              month: "short", 
                              day: "numeric",
                              year: "numeric"
                            })}
                          </Typography>
                          {visit.durationMinutes && (
                            <Chip 
                              size="small" 
                              label={`${visit.durationMinutes} min`}
                              sx={{ height: 18, fontSize: 10 }}
                            />
                          )}
                          {getVisitDistanceKm(visit) !== null && (
                            <Chip 
                              size="small" 
                              label={`${getVisitDistanceKm(visit)!.toFixed(1)} km`}
                              sx={{ height: 18, fontSize: 10 }}
                            />
                          )}
                        </Stack>
                      }
                    />
                    <Chip
                      label={statusInfo.label}
                      size="small"
                      sx={{ bgcolor: statusInfo.color, color: "white" }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Paper>
      </Container>

      {/* Past Visit Detail Dialog */}
      <Dialog
        open={showHistoryDetailDialog}
        onClose={() => setShowHistoryDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {historyDetailVisit && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={2}>
                {historyDetailVisit.status === "completed" ? (
                  <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 32 }} />
                ) : (
                  <SkipNextIcon sx={{ color: "#ff9800", fontSize: 32 }} />
                )}
                <Box>
                  <Typography variant="h6">{historyDetailVisit.targetName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {historyDetailVisit.status === "completed" ? "Completed" : "Skipped"} on{" "}
                    {new Date(historyDetailVisit.completedAt || historyDetailVisit.skippedAt || "").toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3}>
                {/* Skip Reason */}
                {historyDetailVisit.status === "skipped" && historyDetailVisit.skipReason && (
                  <Paper sx={{ p: 2, bgcolor: "#fff3e0", borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Skip Reason
                    </Typography>
                    <Typography>{historyDetailVisit.skipReason}</Typography>
                  </Paper>
                )}

                {/* Completion Details */}
                {historyDetailVisit.status === "completed" && (
                  <>
                    {/* Time & Distance Stats */}
                    <Paper sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Visit Statistics
                      </Typography>
                      <Stack direction="row" spacing={3} flexWrap="wrap">
                        {historyDetailVisit.durationMinutes !== undefined && (
                          <Box>
                            <Typography variant="h5" fontWeight={600}>
                              {historyDetailVisit.durationMinutes}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Minutes Spent
                            </Typography>
                          </Box>
                        )}
                        {getVisitDistanceKm(historyDetailVisit) !== null && (
                          <Box>
                            <Typography variant="h5" fontWeight={600}>
                              {getVisitDistanceKm(historyDetailVisit)!.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              KM Traveled
                            </Typography>
                          </Box>
                        )}
                        {historyDetailVisit.timerStartedAt && (
                          <Box>
                            <Typography variant="h5" fontWeight={600}>
                              {new Date(historyDetailVisit.timerStartedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Work Started
                            </Typography>
                          </Box>
                        )}
                        {historyDetailVisit.timerEndedAt && (
                          <Box>
                            <Typography variant="h5" fontWeight={600}>
                              {new Date(historyDetailVisit.timerEndedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Work Ended
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>

                    {/* Outcome */}
                    {historyDetailVisit.outcome && (
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Outcome
                        </Typography>
                        <Typography>{historyDetailVisit.outcome}</Typography>
                      </Paper>
                    )}

                    {/* Conversation Notes */}
                    {historyDetailVisit.conversationNotes && (
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Conversation Notes
                        </Typography>
                        <Typography>{historyDetailVisit.conversationNotes}</Typography>
                      </Paper>
                    )}

                    {/* Outcome Flags */}
                    {historyDetailVisit.outcomeFlags && historyDetailVisit.outcomeFlags.length > 0 && (
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Outcome Flags
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                          {historyDetailVisit.outcomeFlags.map((flag) => {
                            const flagInfo = getOutcomeFlagInfo(flag);
                            return (
                              <Chip
                                key={flag}
                                label={flagInfo.label}
                                size="small"
                                sx={{ bgcolor: flagInfo.color, color: "white" }}
                              />
                            );
                          })}
                        </Stack>
                      </Paper>
                    )}

                    {/* Lead Status */}
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Lead Status
                      </Typography>
                      <Chip
                        label={getLeadStatusInfo(historyDetailVisit.leadStatus).label}
                        sx={{
                          bgcolor: getLeadStatusInfo(historyDetailVisit.leadStatus).color,
                          color: "white",
                        }}
                      />
                    </Paper>

                    {/* Next Follow Up */}
                    {historyDetailVisit.nextFollowUpDate && (
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Next Follow-up Date
                        </Typography>
                        <Typography>
                          {new Date(historyDetailVisit.nextFollowUpDate).toLocaleDateString([], {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Typography>
                      </Paper>
                    )}
                  </>
                )}

                {/* Location Info */}
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Location
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationOnIcon color="action" />
                    <Typography variant="body2">{historyDetailVisit.location.address}</Typography>
                  </Stack>
                  {historyDetailVisit.reachedLocation && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      Reached at: {historyDetailVisit.reachedLocation.latitude.toFixed(6)}, {historyDetailVisit.reachedLocation.longitude.toFixed(6)}
                      {historyDetailVisit.distanceFromTarget !== undefined && (
                        <> ({historyDetailVisit.distanceFromTarget.toFixed(0)}m from target)</>
                      )}
                    </Typography>
                  )}
                </Paper>

                {/* Contact Info */}
                {(historyDetailVisit.contactPerson || historyDetailVisit.contactPhone || historyDetailVisit.contactEmail) && (
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Contact Information
                    </Typography>
                    <Stack spacing={1}>
                      {historyDetailVisit.contactPerson && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">{historyDetailVisit.contactPerson}</Typography>
                        </Stack>
                      )}
                      {historyDetailVisit.contactPhone && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">{historyDetailVisit.contactPhone}</Typography>
                        </Stack>
                      )}
                      {historyDetailVisit.contactEmail && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">{historyDetailVisit.contactEmail}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* Visit Reason */}
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Visit Reason
                  </Typography>
                  <Chip
                    label={`${getVisitReasonInfo(historyDetailVisit.visitReason).icon} ${getVisitReasonInfo(historyDetailVisit.visitReason).label}`}
                    sx={{
                      bgcolor: getVisitReasonInfo(historyDetailVisit.visitReason).color,
                      color: "white",
                    }}
                  />
                  {historyDetailVisit.visitReasonNote && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {historyDetailVisit.visitReasonNote}
                    </Typography>
                  )}
                </Paper>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowHistoryDetailDialog(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Enhanced Search Dialog */}
      <Dialog 
        open={showSearchDialog} 
        onClose={() => {
          setShowSearchDialog(false);
          setSearchResults([]);
          setSearchQuery("");
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AddLocationIcon color="primary" />
            <Typography variant="h6">Find Location</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Search Mode Tabs */}
          <Tabs 
            value={searchTab} 
            onChange={(_, v) => setSearchTab(v)} 
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab icon={<NearMeIcon />} label="Nearby" iconPosition="start" />
            <Tab icon={<SearchIcon />} label="Search" iconPosition="start" />
            <Tab icon={<QrCodeIcon />} label="By Code" iconPosition="start" />
            <Tab icon={<MapIcon />} label="On Map" iconPosition="start" />
          </Tabs>

          {/* Tab 0: Nearby Places */}
          {searchTab === 0 && (
            <Box>
              {!mapsLoaded && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography>Loading Google Maps...</Typography>
                  </Stack>
                </Alert>
              )}
              
              {geoHook.loading && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography>Getting your location...</Typography>
                  </Stack>
                </Alert>
              )}
              
              {geoHook.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">{geoHook.error}</Typography>
                  <Button 
                    size="small" 
                    onClick={() => geoHook.requestLocation()} 
                    sx={{ mt: 1 }}
                  >
                    Try Again
                  </Button>
                </Alert>
              )}

              {!userLat || !userLon ? (
                !geoHook.loading && !geoHook.error && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <MyLocationIcon />
                        <Typography>Location access required for nearby search</Typography>
                      </Stack>
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<MyLocationIcon />}
                        onClick={() => geoHook.requestLocation()}
                      >
                        Enable Location
                      </Button>
                    </Stack>
                  </Alert>
                )
              ) : (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      📍 Location found! Showing places within 2km
                    </Typography>
                  </Alert>
                  
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Select Category
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedCategory}
                    exclusive
                    onChange={(_, v) => v && setSelectedCategory(v)}
                    sx={{ mb: 2, flexWrap: "wrap" }}
                  >
                    {PLACE_CATEGORIES.map((cat) => (
                      <ToggleButton key={cat.type} value={cat.type} sx={{ px: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {cat.icon}
                          <Typography variant="caption">{cat.label}</Typography>
                        </Stack>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  {isLoadingNearby ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : nearbyPlaces.length > 0 ? (
                    <List sx={{ maxHeight: 400, overflow: "auto" }}>
                      {nearbyPlaces.map((place) => (
                        <ListItemButton 
                          key={place.place_id} 
                          onClick={() => handleSelectPlace(place)} 
                          sx={{ borderRadius: 2, mb: 1 }}
                        >
                          <ListItemIcon><LocationOnIcon color="primary" /></ListItemIcon>
                          <ListItemText 
                            primary={place.name} 
                            secondary={place.formatted_address} 
                          />
                          {place.distance !== undefined && (
                            <Chip 
                              label={formatDistance(place.distance)} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </ListItemButton>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">
                      No places found nearby. Try a different category or use the Search tab.
                    </Alert>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Tab 1: Text Search */}
          {searchTab === 1 && (
            <Box>
              <TextField
                fullWidth
                placeholder="Search for a place, business, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  endAdornment: isSearching && <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <Button 
                variant="contained" 
                onClick={handleSearch} 
                disabled={!searchQuery.trim() || isSearching}
                fullWidth
                sx={{ mb: 2 }}
              >
                Search
              </Button>

              {searchResults.length > 0 && (
                <List sx={{ maxHeight: 350, overflow: "auto" }}>
                  {searchResults.map((place) => (
                    <ListItemButton 
                      key={place.place_id} 
                      onClick={() => handleSelectPlace(place)} 
                      sx={{ borderRadius: 2, mb: 1 }}
                    >
                      <ListItemIcon><LocationOnIcon color="primary" /></ListItemIcon>
                      <ListItemText 
                        primary={place.name} 
                        secondary={place.formatted_address} 
                      />
                      {place.distance !== undefined && (
                        <Chip 
                          label={formatDistance(place.distance)} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                    </ListItemButton>
                  ))}
                </List>
              )}

              {!mapsLoaded && (
                <Alert severity="warning">
                  Google Maps is not loaded. Make sure the API key is configured.
                </Alert>
              )}
            </Box>
          )}

          {/* Tab 2: Postal/Zip Code Search */}
          {searchTab === 2 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Enter a postal code, zip code, or PIN code to find places in that area.
              </Alert>
              
              <TextField
                fullWidth
                placeholder="Enter postal code (e.g., 110001, 10001, SW1A 1AA)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCodeSearch()}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><QrCodeIcon /></InputAdornment>,
                  endAdornment: isSearching && <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <Button 
                variant="contained" 
                onClick={handleCodeSearch} 
                disabled={!searchQuery.trim() || isSearching}
                fullWidth
                sx={{ mb: 2 }}
              >
                Search by Code
              </Button>

              {searchResults.length > 0 && (
                <List sx={{ maxHeight: 350, overflow: "auto" }}>
                  {searchResults.map((place) => (
                    <ListItemButton 
                      key={place.place_id} 
                      onClick={() => handleSelectPlace(place)} 
                      sx={{ borderRadius: 2, mb: 1 }}
                    >
                      <ListItemIcon><LocationOnIcon color="primary" /></ListItemIcon>
                      <ListItemText 
                        primary={place.name} 
                        secondary={place.formatted_address} 
                      />
                      {place.distance !== undefined && (
                        <Chip 
                          label={formatDistance(place.distance)} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Tab 3: Map Selection */}
          {searchTab === 3 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Click on the map to select a location, or drag the marker to adjust.
              </Alert>
              
              <Button
                variant="contained"
                startIcon={<MapIcon />}
                onClick={() => setShowMapDialog(true)}
                fullWidth
                sx={{ mb: 2 }}
              >
                Open Full Map
              </Button>

              {selectedMapLocation && (
                <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                  <Typography variant="subtitle2" gutterBottom>Selected Location:</Typography>
                  <Typography variant="body2">{selectedMapLocation.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedMapLocation.address}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSelectMapLocation}
                    sx={{ mt: 1 }}
                    fullWidth
                  >
                    Use This Location
                  </Button>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowSearchDialog(false);
            setSearchResults([]);
            setSearchQuery("");
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Map Dialog */}
      <Dialog 
        open={showMapDialog} 
        onClose={() => {
          setShowMapDialog(false);
          setSelectedMapLocation(null);
        }} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Select Location on Map</Typography>
            {userLat && userLon && (
              <Button
                size="small"
                startIcon={<MyLocationIcon />}
                onClick={() => {
                  if (mapRef.current && userLat && userLon) {
                    mapRef.current.panTo({ lat: userLat, lng: userLon });
                  }
                }}
              >
                My Location
              </Button>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box 
            ref={mapContainerRef} 
            sx={{ 
              width: "100%", 
              height: 500, 
              borderRadius: 2, 
              overflow: "hidden",
              bgcolor: "grey.200"
            }} 
          />
          
          {selectedMapLocation && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: "primary.50" }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <LocationOnIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="subtitle2">{selectedMapLocation.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedMapLocation.address}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowMapDialog(false);
            setSelectedMapLocation(null);
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSelectMapLocation}
            disabled={!selectedMapLocation}
          >
            Select This Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Target Dialog */}
      <Dialog open={showAddTargetDialog} onClose={() => setShowAddTargetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Target</DialogTitle>
        <DialogContent>
          {selectedPlace && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">{selectedPlace.name}</Typography>
              <Typography variant="caption">{selectedPlace.formatted_address}</Typography>
            </Alert>
          )}

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Target Name"
              value={newTargetData.name}
              onChange={(e) => setNewTargetData({ ...newTargetData, name: e.target.value })}
              fullWidth
              required
            />
            
            {/* Visit Reason Selection */}
            <FormControl fullWidth required>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Reason for Visit</FormLabel>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {VISIT_REASONS.map((reason) => {
                  const info = getVisitReasonInfo(reason);
                  const isSelected = newTargetData.visitReason === reason;
                  return (
                    <Chip
                      key={reason}
                      label={`${info.icon} ${info.label}`}
                      onClick={() => setNewTargetData({ ...newTargetData, visitReason: reason })}
                      sx={{
                        bgcolor: isSelected ? info.color : "grey.200",
                        color: isSelected ? "white" : "text.primary",
                        cursor: "pointer",
                        "&:hover": { bgcolor: isSelected ? info.color : "grey.300" },
                      }}
                    />
                  );
                })}
              </Box>
            </FormControl>

            <TextField
              label="Visit Note (Optional)"
              value={newTargetData.visitReasonNote}
              onChange={(e) => setNewTargetData({ ...newTargetData, visitReasonNote: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Any additional notes for this visit..."
            />

            <Divider />

            <TextField
              label="Contact Person (Optional)"
              value={newTargetData.contactPerson}
              onChange={(e) => setNewTargetData({ ...newTargetData, contactPerson: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contact Phone (Optional)"
              value={newTargetData.contactPhone}
              onChange={(e) => setNewTargetData({ ...newTargetData, contactPhone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contact Email (Optional)"
              value={newTargetData.contactEmail}
              onChange={(e) => setNewTargetData({ ...newTargetData, contactEmail: e.target.value })}
              fullWidth
            />
            
            {saveError && (
              <Alert severity="error">
                {saveError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddTargetDialog(false)} disabled={savingTarget}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTarget} 
            disabled={!newTargetData.name || !newTargetData.visitReason || savingTarget}
          >
            {savingTarget ? <CircularProgress size={20} color="inherit" /> : "Add Target"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Visit Dialog */}
      <Dialog open={showCompleteDialog} onClose={() => setShowCompleteDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Visit</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Conversation Notes"
              value={completeData.conversationNotes}
              onChange={(e) => setCompleteData({ ...completeData, conversationNotes: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="Describe the conversation you had..."
              required
            />

            <TextField
              label="Outcome / Result"
              value={completeData.outcome}
              onChange={(e) => setCompleteData({ ...completeData, outcome: e.target.value })}
              fullWidth
              placeholder="What was the result of this visit?"
              required
            />

            <FormControl fullWidth>
              <InputLabel>Lead Status</InputLabel>
              <Select
                value={completeData.leadStatus}
                label="Lead Status"
                onChange={(e) => setCompleteData({ ...completeData, leadStatus: e.target.value as LeadStatus })}
              >
                {LEAD_STATUSES.map((status) => {
                  const info = getLeadStatusInfo(status);
                  return (
                    <MenuItem key={status} value={status}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: info.color }} />
                        <Typography>{info.label}</Typography>
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Outcome Flags */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Outcome Flags (Select all that apply)
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {OUTCOME_FLAGS.map((flag) => {
                  const info = getOutcomeFlagInfo(flag);
                  const isSelected = completeData.outcomeFlags.includes(flag);
                  return (
                    <Chip
                      key={flag}
                      label={`${info.icon} ${info.label}`}
                      onClick={() => {
                        if (isSelected) {
                          setCompleteData({
                            ...completeData,
                            outcomeFlags: completeData.outcomeFlags.filter((f) => f !== flag),
                          });
                        } else {
                          setCompleteData({
                            ...completeData,
                            outcomeFlags: [...completeData.outcomeFlags, flag],
                          });
                        }
                      }}
                      sx={{
                        bgcolor: isSelected ? info.color : "grey.200",
                        color: isSelected ? "white" : "text.primary",
                        cursor: "pointer",
                        "&:hover": { bgcolor: isSelected ? info.color : "grey.300" },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            <TextField
              label="Next Follow Up Date (Optional)"
              type="date"
              value={completeData.nextFollowUpDate}
              onChange={(e) => setCompleteData({ ...completeData, nextFollowUpDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCompleteVisit}
            disabled={!completeData.conversationNotes || !completeData.outcome}
          >
            Complete Visit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Skip Visit Dialog */}
      <Dialog open={showSkipDialog} onClose={() => setShowSkipDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Skip Target</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason for skipping"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Why are you skipping this target?"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSkipDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleSkipVisit} disabled={!skipReason.trim()}>
            Skip Target
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
