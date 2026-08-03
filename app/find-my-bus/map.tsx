import type { RouteListItem, RoutePathPoint } from "@/constants/types";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import apiClient from "@/lib/apiClient";
import {
  connectLiveTrackingSocket,
  disconnectLiveTrackingSocket,
} from "@/lib/liveTrackingSocket";
import { fetchAvailableRoutes, fetchRouteByNumber } from "@/lib/routeService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, {
  AnimatedRegion,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

type LiveBusLocation = {
  routeNumber: string;
  busId: string;
  lat: number;
  lng: number;
  timestamp: number;
  primary: boolean;
  offline: boolean;
  lastHeartbeatAt: number;
  isStale?: boolean;
  coordinate: AnimatedRegion;
};

const BUS_HEARTBEAT_TIMEOUT_MS = 60_000;
const BUS_HEARTBEAT_CHECK_INTERVAL_MS = 5_000;

const BUS_MARKER_COLORS = [
  "#2196F3",
  "#32c787",
  "#00BCD4",
  "#ffc107",
  "#ff85af",
  "#FF9800",
  "#39bbb0",
];



const INITIAL_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 3.6,
  longitudeDelta: 3.2,
};

const formatEta = (seconds?: number) => {
  if (seconds === undefined || seconds < 0) return "Unknown";
  if (seconds < 60) return "1 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  }
  return `${minutes} min`;
};

const formatDistance = (meters?: number) => {
  if (meters === undefined || meters < 0) return "Unknown";
  if (meters < 100) return "Less than 100m";
  if (meters < 1000) {
    const rounded = Math.floor(meters / 100) * 100;
    return `${rounded}m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
};

export default function FindMyBusMapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  const activeRouteSubscriptionRef = useRef<{
    unsubscribe: () => void;
  } | null>(null);
  const subscribedRouteNumberRef = useRef("");
  const topControlsAnim = useRef(new Animated.Value(0)).current;
  const activeSearchRequestRef = useRef(0);
  const routePathRef = useRef<RoutePathPoint[]>([]);
  const previousTrackedBusIdRef = useRef<string | null>(null);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [routeQuery, setRouteQuery] = useState("");
  const [routePath, setRoutePath] = useState<RoutePathPoint[]>([]);
  const [routeError, setRouteError] = useState("");
  const [routeCatalogError, setRouteCatalogError] = useState("");
  const [availableRoutes, setAvailableRoutes] = useState<RouteListItem[]>([]);
  const [isRouteCatalogLoading, setIsRouteCatalogLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isTopControlsCollapsed, setIsTopControlsCollapsed] = useState(false);
  const [activeBuses, setActiveBuses] = useState<
    Record<string, LiveBusLocation>
  >({});
  const [trackedBusId, setTrackedBusId] = useState<string | null>(null);
  const [busEtaData, setBusEtaData] = useState<
    Record<string, { etaSeconds?: number; distanceMeters?: number }>
  >({});
  const [showArrivalActionSheet, setShowArrivalActionSheet] = useState(false);
  const [isMissingBusReportExpanded, setIsMissingBusReportExpanded] = useState(false);
  const collapsibleAnim = useRef(new Animated.Value(0)).current;
  const triggeredBusesRef = useRef<Set<string>>(new Set());
  const [likedBuses, setLikedBuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (trackedBusId && !activeBuses[trackedBusId]) {
      setTrackedBusId(null);
    }
  }, [activeBuses, trackedBusId]);

  const activeBusList = useMemo(() => {
    const list = Object.values(activeBuses);
    let result = list;
    if (trackedBusId) {
      result = list.filter((bus) => bus.busId === trackedBusId);
    }

    return result.sort((a, b) => {
      const distA = busEtaData[a.busId]?.distanceMeters;
      const distB = busEtaData[b.busId]?.distanceMeters;

      const validA = distA !== undefined && distA >= 0;
      const validB = distB !== undefined && distB >= 0;

      if (validA && validB) return distA - distB;
      if (validA && !validB) return -1;
      if (!validA && validB) return 1;
      return 0;
    });
  }, [activeBuses, trackedBusId, busEtaData]);

  const fetchBusEta = async (
    busId: string,
    lat: number,
    lng: number,
    routeNumber: string,
  ) => {
    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) return null;
      const token = await currentUser.getIdToken();
      const response = await apiClient.get<{
        etaSeconds: number;
        distanceMeters: number;
      }>(
        `/api/live-tracking/routes/${encodeURIComponent(routeNumber)}/buses/${encodeURIComponent(busId)}/eta`,
        {
          params: { lat, lng },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch ETA for bus ${busId}:`, error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const updateEtas = async () => {
      if (!currentLocation) return;

      const newBusEtaData: Record<
        string,
        { etaSeconds?: number; distanceMeters?: number }
      > = {};

      for (const bus of Object.values(activeBuses)) {
        const etaData = await fetchBusEta(
          bus.busId,
          currentLocation.latitude,
          currentLocation.longitude,
          bus.routeNumber,
        );
        if (etaData && isMounted) {
          newBusEtaData[bus.busId] = etaData;
        }
      }

      if (isMounted) {
        setBusEtaData((prev) => ({ ...prev, ...newBusEtaData }));

        if (trackedBusId) {
          const distance = newBusEtaData[trackedBusId]?.distanceMeters;
          if (distance !== undefined && distance <= 20) {
            if (!triggeredBusesRef.current.has(trackedBusId)) {
              triggeredBusesRef.current.add(trackedBusId);
              setShowArrivalActionSheet(true);
            }
          }
        }
      }
    };

    updateEtas();

    return () => {
      isMounted = false;
    };
  }, [activeBuses, currentLocation, trackedBusId]);

  const getBusMarkerColor = useCallback((busId: string) => {
    let hash = 0;

    for (let index = 0; index < busId.length; index += 1) {
      hash = (hash * 31 + busId.charCodeAt(index)) >>> 0;
    }

    return BUS_MARKER_COLORS[hash % BUS_MARKER_COLORS.length];
  }, []);

  useEffect(() => {
    routePathRef.current = routePath;
  }, [routePath]);

  const trackedLat = trackedBusId ? activeBuses[trackedBusId]?.lat : undefined;
  const trackedLng = trackedBusId ? activeBuses[trackedBusId]?.lng : undefined;

  useEffect(() => {
    if (
      trackedBusId &&
      trackedLat !== undefined &&
      trackedLng !== undefined &&
      mapRef.current
    ) {
      mapRef.current.animateCamera(
        {
          center: { latitude: trackedLat, longitude: trackedLng },
          zoom: 17,
        },
        { duration: 800 },
      );
    } else if (
      previousTrackedBusIdRef.current !== null &&
      trackedBusId === null &&
      mapRef.current
    ) {
      if (routePathRef.current.length > 1) {
        mapRef.current.fitToCoordinates(routePathRef.current, {
          edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
          animated: true,
        });
      } else if (routePathRef.current.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: routePathRef.current[0].latitude,
            longitude: routePathRef.current[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      }
    }
    previousTrackedBusIdRef.current = trackedBusId;
  }, [trackedBusId, trackedLat, trackedLng]);

  useEffect(() => {
    const heartbeatSweepTimer = setInterval(() => {
      const now = Date.now();

      setActiveBuses((previousBuses) => {
        let hasChanges = false;
        const nextBuses: Record<string, LiveBusLocation> = {};

        Object.entries(previousBuses).forEach(([busId, busData]) => {
          if (now - busData.lastHeartbeatAt <= BUS_HEARTBEAT_TIMEOUT_MS) {
            const isStale = now - busData.lastHeartbeatAt > 15_000;
            if (busData.isStale !== isStale) {
              nextBuses[busId] = { ...busData, isStale };
              hasChanges = true;
            } else {
              nextBuses[busId] = busData;
            }
            return;
          }

          hasChanges = true;
        });

        return hasChanges ? nextBuses : previousBuses;
      });
    }, BUS_HEARTBEAT_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(heartbeatSweepTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      activeRouteSubscriptionRef.current?.unsubscribe();
      activeRouteSubscriptionRef.current = null;
      subscribedRouteNumberRef.current = "";

      disconnectLiveTrackingSocket().catch(() => {
        // no-op cleanup
      });
    };
  }, []);

  useEffect(() => {
    Animated.timing(topControlsAnim, {
      toValue: isTopControlsCollapsed ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isTopControlsCollapsed, topControlsAnim]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startLocationWatch = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!isMounted) {
        return;
      }

      if (permission.status !== "granted") {
        setLocationError("Location permission denied.");
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (position) => {
          if (!isMounted) {
            return;
          }

          setCurrentLocation(position.coords);
          setLocationError("");

          if (mapRef.current && routePathRef.current.length === 0) {
            mapRef.current.animateCamera(
              {
                center: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
                zoom: 16,
              },
              { duration: 550 },
            );
          }
        },
      );
    };

    startLocationWatch().catch(() => {
      if (isMounted) {
        setLocationError("Unable to read your current location.");
      }
    });

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRouteCatalog = async () => {
      setIsRouteCatalogLoading(true);
      setRouteCatalogError("");

      try {
        const routes = await fetchAvailableRoutes();

        if (!isMounted) {
          return;
        }

        setAvailableRoutes(routes);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRouteCatalogError(
          error instanceof Error
            ? error.message
            : "Failed to load route suggestions.",
        );
      } finally {
        if (isMounted) {
          setIsRouteCatalogLoading(false);
        }
      }
    };

    loadRouteCatalog().catch(() => {
      if (isMounted) {
        setRouteCatalogError("Failed to load route suggestions.");
        setIsRouteCatalogLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const routeSuggestions = useMemo(() => {
    const normalizedQuery = routeQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return availableRoutes
      .filter(
        (route) =>
          route.routeNumber.toLowerCase().includes(normalizedQuery) ||
          route.routeName.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 3);
  }, [availableRoutes, routeQuery]);

  const collapseTopControls = useCallback(() => {
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    setIsTopControlsCollapsed(true);
  }, []);

  const expandTopControls = useCallback(() => {
    setIsTopControlsCollapsed(false);
  }, []);

  const handleExpandFromFab = useCallback(() => {
    setIsTopControlsCollapsed(false);
    setShowSuggestions(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 160);
  }, []);

  const searchRouteByNumber = useCallback(
    async (query: string) => {
      if (isRouteLoading) {
        return;
      }

      const sanitizedRouteNumber = query.trim();

      if (!sanitizedRouteNumber) {
        setRouteError("Please enter a route number or route name.");
        return;
      }

      if (!/^[a-zA-Z0-9]+$/.test(sanitizedRouteNumber)) {
        setRouteError("Route number can only contain letters and numbers.");
        return;
      }

      setIsRouteLoading(true);
      setRouteError("");
      setActiveBuses({});

      activeRouteSubscriptionRef.current?.unsubscribe();
      activeRouteSubscriptionRef.current = null;
      subscribedRouteNumberRef.current = "";

      const requestId = activeSearchRequestRef.current + 1;
      activeSearchRequestRef.current = requestId;

      try {
        const route = await fetchRouteByNumber(sanitizedRouteNumber);

        if (activeSearchRequestRef.current !== requestId) {
          return;
        }

        if (!Array.isArray(route.path) || route.path.length === 0) {
          setRoutePath([]);
          setRouteError("Route was found but has no path points.");
          return;
        }

        setRoutePath(route.path);
        setRouteQuery(`${route.routeNumber} (${route.routeName})`);
        setShowSuggestions(false);
        searchInputRef.current?.blur();

        const currentUser = FIREBASE_AUTH.currentUser;

        if (!currentUser) {
          throw new Error("Please sign in to view live tracked buses.");
        }

        const token = await currentUser.getIdToken();

        const snapshotResponse = await apiClient.get<LiveBusLocation[]>(
          `/api/live-tracking/routes/${encodeURIComponent(route.routeNumber)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (activeSearchRequestRef.current !== requestId) {
          return;
        }

        const snapshotBuses = Array.isArray(snapshotResponse.data)
          ? snapshotResponse.data
          : [];

        const snapshotDictionary = snapshotBuses.reduce<
          Record<string, LiveBusLocation>
        >((accumulator, bus) => {
          if (bus.offline === true) {
            return accumulator;
          }

          if (
            typeof bus.busId !== "string" ||
            !Number.isFinite(bus.lat) ||
            !Number.isFinite(bus.lng)
          ) {
            return accumulator;
          }

          accumulator[bus.busId] = {
            routeNumber:
              typeof bus.routeNumber === "string"
                ? bus.routeNumber
                : route.routeNumber,
            busId: bus.busId,
            lat: bus.lat,
            lng: bus.lng,
            timestamp:
              typeof bus.timestamp === "number" ? bus.timestamp : Date.now(),
            primary: Boolean(bus.primary),
            offline: false,
            lastHeartbeatAt: Date.now(),
            isStale: false,
            coordinate: new AnimatedRegion({
              latitude: bus.lat,
              longitude: bus.lng,
              latitudeDelta: 0,
              longitudeDelta: 0,
            }),
          };

          return accumulator;
        }, {});

        setActiveBuses(snapshotDictionary);

        const client = await connectLiveTrackingSocket(token);

        if (activeSearchRequestRef.current !== requestId) {
          return;
        }

        activeRouteSubscriptionRef.current = client.subscribe(
          `/topic/route/${route.routeNumber}`,
          (message) => {
            try {
              const incoming = JSON.parse(
                message.body,
              ) as Partial<LiveBusLocation>;

              if (typeof incoming.busId !== "string") {
                return;
              }

              const incomingBusId = incoming.busId;
              const heartbeatTimestamp = Date.now();

              if (incoming.offline === true) {
                setActiveBuses((previousBuses) => {
                  if (!previousBuses[incomingBusId]) {
                    return previousBuses;
                  }

                  const { [incomingBusId]: _removedBus, ...remainingBuses } =
                    previousBuses;

                  return remainingBuses;
                });

                return;
              }

              const hasValidCoordinates =
                Number.isFinite(incoming.lat) && Number.isFinite(incoming.lng);

              if (!hasValidCoordinates) {
                setActiveBuses((previousBuses) => {
                  const existingBus = previousBuses[incomingBusId];

                  if (!existingBus) {
                    return previousBuses;
                  }

                  return {
                    ...previousBuses,
                    [incomingBusId]: {
                      ...existingBus,
                      timestamp:
                        typeof incoming.timestamp === "number"
                          ? incoming.timestamp
                          : existingBus.timestamp,
                      primary:
                        typeof incoming.primary === "boolean"
                          ? incoming.primary
                          : existingBus.primary,
                      offline: false,
                      isStale: false,
                      lastHeartbeatAt: heartbeatTimestamp,
                    },
                  };
                });

                return;
              }

              const incomingLat = Number(incoming.lat);
              const incomingLng = Number(incoming.lng);

              if (
                !Number.isFinite(incomingLat) ||
                !Number.isFinite(incomingLng)
              ) {
                return;
              }

              setActiveBuses((previousBuses) => {
                const existingBus = previousBuses[incomingBusId];
                let coordinate = existingBus?.coordinate;

                if (coordinate) {
                  coordinate
                    .timing({
                      latitude: incomingLat,
                      longitude: incomingLng,
                      latitudeDelta: 0,
                      longitudeDelta: 0,
                      duration: 500,
                      useNativeDriver: false,
                      toValue: 0,
                    })
                    .start();
                } else {
                  coordinate = new AnimatedRegion({
                    latitude: incomingLat,
                    longitude: incomingLng,
                    latitudeDelta: 0,
                    longitudeDelta: 0,
                  });
                }

                return {
                  ...previousBuses,
                  [incomingBusId]: {
                    ...existingBus,
                    routeNumber:
                      typeof incoming.routeNumber === "string"
                        ? incoming.routeNumber
                        : route.routeNumber,
                    busId: incomingBusId,
                    lat: incomingLat,
                    lng: incomingLng,
                    timestamp:
                      typeof incoming.timestamp === "number"
                        ? incoming.timestamp
                        : Date.now(),
                    primary:
                      typeof incoming.primary === "boolean"
                        ? incoming.primary
                        : false,
                    offline: false,
                    isStale: false,
                    lastHeartbeatAt: heartbeatTimestamp,
                    coordinate,
                  },
                };
              });
            } catch {
              // ignore malformed updates
            }
          },
        );

        subscribedRouteNumberRef.current = route.routeNumber;

        if (mapRef.current) {
          if (route.path.length > 1) {
            mapRef.current.fitToCoordinates(route.path, {
              edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
              animated: true,
            });
          } else {
            mapRef.current.animateToRegion(
              {
                latitude: route.path[0].latitude,
                longitude: route.path[0].longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              500,
            );
          }
        }
      } catch (error) {
        if (activeSearchRequestRef.current !== requestId) {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch route.";
        const isServerUnreachable = /unable to reach server/i.test(
          errorMessage,
        );

        setRoutePath([]);
        setActiveBuses({});

        if (isServerUnreachable && routeCatalogError) {
          return;
        }

        setRouteError(errorMessage);
      } finally {
        if (activeSearchRequestRef.current === requestId) {
          setIsRouteLoading(false);
        }
      }
    },
    [isRouteLoading, routeCatalogError],
  );

  const handleSearchRoute = useCallback(() => {
    const sanitizedQuery = routeQuery.trim();
    const normalizedQuery = sanitizedQuery.toLowerCase();
    const extractedRouteNumber =
      sanitizedQuery.match(/^[a-zA-Z0-9]+/)?.[0] ?? "";
    const normalizedRouteNumber = extractedRouteNumber.toLowerCase();

    setShowSuggestions(false);

    if (!sanitizedQuery) {
      setRouteError("Please enter a route number or route name.");
      return;
    }

    const bestMatch = availableRoutes.find(
      (route) =>
        route.routeNumber.toLowerCase() === normalizedQuery ||
        route.routeName.toLowerCase() === normalizedQuery ||
        `${route.routeNumber} (${route.routeName})`.toLowerCase() ===
        normalizedQuery,
    );

    if (bestMatch) {
      void searchRouteByNumber(bestMatch.routeNumber);
      return;
    }

    if (/^[a-zA-Z0-9]+$/.test(extractedRouteNumber)) {
      void searchRouteByNumber(extractedRouteNumber);
      return;
    }

    const partialMatch = availableRoutes.find(
      (route) =>
        route.routeNumber.toLowerCase().includes(normalizedQuery) ||
        route.routeNumber.toLowerCase().includes(normalizedRouteNumber) ||
        route.routeName.toLowerCase().includes(normalizedQuery),
    );

    if (partialMatch) {
      setRouteQuery(partialMatch.routeNumber);
      void searchRouteByNumber(partialMatch.routeNumber);
      return;
    }

    setRouteError("Please choose a route from suggestions.");
  }, [availableRoutes, routeQuery, searchRouteByNumber]);

  const handleOptIn = useCallback(async () => {
    if (!trackedBusId) return;

    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        Alert.alert("Authentication Required", "Please sign in to perform this action.");
        return;
      }
      const token = await currentUser.getIdToken();

      // POST 1: /api/live-tracking/buses/{trackedBusId}/backup?isOptingIn=true
      await apiClient.post(
        `/api/live-tracking/buses/${encodeURIComponent(trackedBusId)}/backup`,
        null,
        {
          params: { isOptingIn: true },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // POST 2: /api/live-tracking/buses/backup/addPoints
      await apiClient.post(
        `/api/live-tracking/buses/backup/addPoints`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowArrivalActionSheet(false);
      router.push({
        pathname: "/backup/backupMap",
        params: {
          routeNumber: subscribedRouteNumberRef.current || "",
          busId: trackedBusId,
        },
      });
    } catch (error) {
      console.error("Failed to opt in as backup rider:", error);
      Alert.alert("Error", "Failed to opt in as backup rider. Please try again.");
    }
  }, [trackedBusId, router]);

  const handleReportBus = useCallback(async () => {
    if (!trackedBusId) return;

    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        Alert.alert("Authentication Required", "Please sign in to perform this action.");
        return;
      }
      const token = await currentUser.getIdToken();

      const routeNumber = subscribedRouteNumberRef.current;
      const response = await apiClient.post<{ status: string }>(
        `/api/live-tracking/buses/${encodeURIComponent(trackedBusId)}/report`,
        null,
        {
          params: { routeNumber },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const status = response.data?.status;

      if (status === "REPORT_LOGGED") {
        Alert.alert("Report Received", "Thank you for your report. We are monitoring this bus.");
      } else if (status === "BUS_KILLED") {
        Alert.alert(
          "Report Received",
          "Bus has been reported and removed from the map. Sorry for the inconvenience. Please check for other active buses."
        );
      }

      setShowArrivalActionSheet(false);
      setTrackedBusId(null);
    } catch (error) {
      console.error("Failed to report missing bus:", error);
      Alert.alert("Error", "Failed to report the bus. Please try again.");
    }
  }, [trackedBusId]);

  const handleLikeBus = useCallback(async (busId: string) => {
    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (!currentUser) {
        Alert.alert("Authentication Required", "Please sign in to perform this action.");
        return;
      }
      const token = await currentUser.getIdToken();

      await apiClient.post(
        `/api/live-tracking/buses/${encodeURIComponent(busId)}/like`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setLikedBuses((prev) => ({
        ...prev,
        [busId]: true,
      }));
    } catch (error) {
      console.error("Failed to like bus:", error);
      Alert.alert("Error", "Failed to like bus. Please try again.");
    }
  }, []);

  useEffect(() => {
    Animated.timing(collapsibleAnim, {
      toValue: isMissingBusReportExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isMissingBusReportExpanded, collapsibleAnim]);

  const toggleMissingBusReport = useCallback(() => {
    setIsMissingBusReportExpanded((prev) => !prev);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />

        <View style={styles.mapCard}>
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={
                Platform.OS === "android" || Platform.OS === "ios"
                  ? PROVIDER_GOOGLE
                  : undefined
              }
              initialRegion={INITIAL_REGION}
              onPanDrag={collapseTopControls}
              onPress={expandTopControls}
              showsUserLocation
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {routePath.length > 0 ? (
                <Polyline
                  coordinates={routePath}
                  strokeColor="#2276ff"
                  strokeWidth={4}
                />
              ) : null}

              {activeBusList.map((bus) => (
                <Marker
                  key={bus.busId}
                  coordinate={{ latitude: bus.lat, longitude: bus.lng }}
                  title={`Bus ${bus.busId}`}
                  description={`Route ${bus.routeNumber}`}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View
                    style={[
                      styles.busMarker,
                      {
                        backgroundColor: getBusMarkerColor(bus.busId),
                        opacity: bus.isStale ? 0.5 : 1,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="bus"
                      size={16}
                      color="#ffffff"
                    />
                  </View>
                </Marker>
              ))}
            </MapView>

            <Animated.View
              style={[
                styles.topOverlay,
                {
                  opacity: topControlsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      translateY: topControlsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -74],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={isTopControlsCollapsed ? "none" : "auto"}
            >
              <View style={styles.topControlsRow}>
                <Pressable
                  style={styles.topHomeButton}
                  onPress={() => router.push("/screens/home")}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                </Pressable>

                <View style={styles.searchShell}>
                  <MaterialIcons name="search" size={18} color="#64748b" />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search route number or name"
                    placeholderTextColor="#94a3b8"
                    value={routeQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => {
                      setIsTopControlsCollapsed(false);
                      setShowSuggestions(true);
                    }}
                    onChangeText={(text) => {
                      setRouteQuery(text);
                      setRouteError("");
                      setShowSuggestions(true);
                    }}
                    onSubmitEditing={handleSearchRoute}
                    returnKeyType="search"
                  />
                  {routeQuery.length > 0 && (
                    <Pressable
                      onPress={() => {
                        setRouteQuery("");
                        setRouteError("");
                      }}
                      style={{ padding: 4 }}
                    >
                      <MaterialIcons name="close" size={18} color="#94a3b8" />
                    </Pressable>
                  )}
                </View>
              </View>

              {showSuggestions && routeSuggestions.length > 0 ? (
                <View style={styles.suggestionsList}>
                  {routeSuggestions.map((route) => (
                    <Pressable
                      key={route.id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setRouteQuery(route.routeNumber);
                        setShowSuggestions(false);
                        void searchRouteByNumber(route.routeNumber);
                      }}
                    >
                      <View style={styles.routeNumberBadge}>
                        <Text style={styles.routeNumberBadgeText}>
                          {route.routeNumber}
                        </Text>
                      </View>
                      <Text style={styles.suggestionText}>
                        ({route.routeName})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {isRouteCatalogLoading ? (
                <Text style={styles.catalogInfoLabel}>
                  Loading route suggestions...
                </Text>
              ) : null}
            </Animated.View>

            {isTopControlsCollapsed ? (
              <>
                <Pressable
                  style={styles.collapsedHomeFab}
                  onPress={() => router.push("/screens/home")}
                >
                  <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
                </Pressable>
                <Pressable
                  style={styles.collapsedSearchFab}
                  onPress={handleExpandFromFab}
                >
                  <MaterialIcons name="search" size={20} color="#ffffff" />
                </Pressable>
              </>
            ) : null}

            {routeCatalogError || locationError || routeError ? (
              <Text
                style={[
                  styles.errorBadge,
                  isTopControlsCollapsed
                    ? styles.errorBadgeCollapsed
                    : styles.errorBadgeExpanded,
                ]}
              >
                {routeCatalogError || routeError || locationError}
              </Text>
            ) : null}
            {isRouteLoading ? (
              <Text
                style={[
                  styles.loadingBadge,
                  isTopControlsCollapsed
                    ? styles.loadingBadgeCollapsed
                    : styles.loadingBadgeExpanded,
                ]}
              >
                Loading route...
              </Text>
            ) : null}
          </View>
        </View>

        {routePath.length > 0 || activeBusList.length > 0 ? (
          <BottomSheet snapPoints={["40%", "50%"]} index={0}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>
                Route {subscribedRouteNumberRef.current || "---"}
              </Text>
              <Text style={styles.bottomSheetSubtitle}>
                {trackedBusId && activeBuses[trackedBusId]
                  ? `Tracking Bus: ${trackedBusId}`
                  : `${Object.keys(activeBuses).length} Buses Live`}
              </Text>
            </View>
            <BottomSheetScrollView
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {activeBusList.length > 0 ? (
                activeBusList.map((bus) => {
                  const eta = busEtaData[bus.busId];
                  const isTracked = trackedBusId === bus.busId;
                  return (
                    <View key={bus.busId} style={styles.busCard}>
                      <View
                        style={[
                          styles.busCardIconWrapper,
                          { backgroundColor: getBusMarkerColor(bus.busId) },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="bus"
                          size={24}
                          color="#ffffff"
                        />
                      </View>
                      <View style={styles.busCardContent}>
                        <Text style={styles.busCardEta}>
                          Arrive In: {formatEta(eta?.etaSeconds)}
                        </Text>
                        <Text style={styles.busCardDistance}>
                          {formatDistance(eta?.distanceMeters)}
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          styles.busCardLikeButton,
                          likedBuses[bus.busId] && styles.busCardLikeButtonActive,
                        ]}
                        onPress={() => handleLikeBus(bus.busId)}
                        disabled={likedBuses[bus.busId]}
                      >
                        <MaterialCommunityIcons
                          name={likedBuses[bus.busId] ? "heart" : "heart-outline"}
                          size={20}
                          color={likedBuses[bus.busId] ? "#f43f5e" : "#64748b"}
                        />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.busCardTrackButton,
                          isTracked && styles.busCardTrackButtonActive,
                        ]}
                        onPress={() =>
                          setTrackedBusId((prev) =>
                            prev === bus.busId ? null : bus.busId,
                          )
                        }
                      >
                        <MaterialCommunityIcons
                          name={isTracked ? "crosshairs-gps" : "crosshairs"}
                          size={20}
                          color={isTracked ? "#0ea5e9" : "#64748b"}
                        />
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noBusesInnerContainer}>
                  <MaterialCommunityIcons
                    name="bus-alert"
                    size={32}
                    color="#94a3b8"
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={styles.noBusesInnerMessage}>
                    There are currently no live buses available on this route.
                  </Text>
                </View>
              )}
            </BottomSheetScrollView>
          </BottomSheet>
        ) : null}

        <Modal
          transparent={true}
          visible={showArrivalActionSheet}
          animationType="slide"
          onRequestClose={() => setShowArrivalActionSheet(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bus Is Arriving!</Text>
                <Pressable
                  onPress={() => setShowArrivalActionSheet(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </Pressable>
              </View>

              {/* Section A: Backup Rider Opt-In */}
              <View style={styles.modalSection}>
                <View style={styles.sectionIconRow}>
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={24}
                    color="#10b981"
                  />
                  <Text style={styles.sectionTitle}>Join As a Backup Rider!</Text>
                </View>
                <Text style={[styles.sectionDescription, { marginBottom: 8 }]}>
                  The bus is almost here! Would you like to help the community by staying as a backup rider?
                </Text>
                <Text style={styles.pointsText}>
                  You will earn 5 points if you stay as a backup rider
                </Text>
                <View style={styles.buttonCol}>
                  <Pressable
                    style={styles.successButton}
                    onPress={handleOptIn}
                  >
                    <Text style={styles.successButtonText}>Yes, Opt In</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => setShowArrivalActionSheet(false)}
                  >
                    <Text style={styles.secondaryButtonText}>No, Dismiss</Text>
                  </Pressable>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.modalDivider} />

              {/* Section B: Missing Bus Report */}
              <Pressable
                style={styles.collapsibleHeader}
                onPress={toggleMissingBusReport}
              >
                <Text style={styles.sectionTitle}>{"Don't See the Bus?"}</Text>
                <MaterialIcons
                  name={isMissingBusReportExpanded ? "expand-less" : "expand-more"}
                  size={24}
                  color="#64748b"
                />
              </Pressable>

              <Animated.View
                style={{
                  height: collapsibleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 115],
                  }),
                  opacity: collapsibleAnim,
                  overflow: "hidden",
                }}
              >
                <View style={styles.collapsibleContent}>
                  <Text style={styles.sectionDescription}>
                    {"Please wait for 3-5 minutes. If it still hasn't arrived, please report the bus."}
                  </Text>
                  <Pressable
                    style={styles.dangerButton}
                    onPress={handleReportBus}
                  >
                    <Text style={styles.dangerButtonText}>Report Missing Bus</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#202022",
  },
  mapCard: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#d7e7df",
  },
  topOverlay: {
    position: "absolute",
    top: 45,
    left: 10,
    right: 10,
    zIndex: 8,
  },
  topControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topHomeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchShell: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "500",
  },
  suggestionsList: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  routeNumberBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  suggestionText: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "600",
  },
  catalogInfoLabel: {
    alignSelf: "flex-start",
    marginBottom: 8,
    color: "#334155",
    fontSize: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  catalogErrorLabel: {
    alignSelf: "flex-start",
    marginBottom: 8,
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "500",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  busMarker: {
    borderRadius: 20,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  errorBadge: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(198, 36, 36, 0.9)",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "500",
  },
  errorBadgeExpanded: {
    top: 146,
  },
  errorBadgeCollapsed: {
    top: 76,
  },
  loadingBadge: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(28, 28, 28, 0.86)",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "500",
  },
  loadingBadgeExpanded: {
    top: 146,
  },
  loadingBadgeCollapsed: {
    top: 76,
  },
  collapsedSearchFab: {
    position: "absolute",
    top: 50,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
    zIndex: 9,
  },
  collapsedHomeFab: {
    position: "absolute",
    top: 50,
    left: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9,
  },
  bottomSheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  busCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  busCardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  busCardContent: {
    flex: 1,
  },
  busCardEta: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  busCardDistance: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  busCardLikeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  busCardLikeButtonActive: {
    backgroundColor: "#ffe4e6",
  },
  busCardTrackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  busCardTrackButtonActive: {
    backgroundColor: "#e0f2fe",
  },
  noBusesInnerContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  noBusesInnerMessage: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  modalSection: {
    marginBottom: 16,
  },
  sectionIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 14,
  },
  buttonCol: {
    flexDirection: "column",
    gap: 10,
  },
  successButton: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  successButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  dangerButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  collapsibleContent: {
    marginTop: 8,
    paddingBottom: 8,
  },
  pointsText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 14,
  },
});
