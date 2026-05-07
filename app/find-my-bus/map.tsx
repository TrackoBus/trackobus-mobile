import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import apiClient from "@/lib/apiClient";
import {
  connectLiveTrackingSocket,
  disconnectLiveTrackingSocket,
} from "@/lib/liveTrackingSocket";
import type { RouteListItem, RoutePathPoint } from "@/constants/types";
import { fetchAvailableRoutes, fetchRouteByNumber } from "@/lib/routeService";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
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

  const activeBusList = useMemo(() => {
    return Object.values(activeBuses);
  }, [activeBuses]);

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

  const recenterToCurrentLocation = () => {
    if (!currentLocation || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  };

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

              setActiveBuses((previousBuses) => ({
                ...previousBuses,
                [incomingBusId]: {
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
                },
              }));
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

  return (
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
            <Pressable
              style={styles.topHomeButton}
              onPress={() => router.push("/screens/home")}
            >
              <Text style={styles.topHomeButtonText}>{"Back to Home"}</Text>
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
              <Pressable
                style={[
                  styles.searchButton,
                  isRouteLoading ? styles.searchButtonDisabled : null,
                ]}
                onPress={handleSearchRoute}
                disabled={isRouteLoading}
              >
                <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
              </Pressable>
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
                <Text style={styles.collapsedHomeFabText}>
                  {"Back to Home"}
                </Text>
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

          <View style={styles.leftButton}>
            <MaterialCommunityIcons name="account" size={22} color="#121212" />
          </View>

          <Pressable
            style={styles.rightButton}
            onPress={recenterToCurrentLocation}
          >
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={22}
              color="#ffffff"
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomNav}>
        <View style={styles.navItem}>
          <MaterialIcons name="place" size={20} color="#2276ff" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Map</Text>
        </View>
        <View style={styles.navItem}>
          <MaterialIcons name="star-border" size={20} color="#b5b5b5" />
          <Text style={styles.navLabel}>Favorites</Text>
        </View>
        <View style={styles.navItem}>
          <MaterialIcons name="person-outline" size={20} color="#b5b5b5" />
          <Text style={styles.navLabel}>Profile</Text>
        </View>
      </View>
    </SafeAreaView>
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
    top: 10,
    left: 10,
    right: 10,
    zIndex: 8,
  },
  topHomeButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "#dbe3ef",
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  topHomeButtonText: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "700",
  },
  searchShell: {
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
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    opacity: 0.55,
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
    top: 116,
  },
  errorBadgeCollapsed: {
    top: 46,
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
    top: 116,
  },
  loadingBadgeCollapsed: {
    top: 46,
  },
  leftButton: {
    position: "absolute",
    left: 12,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9ce05f",
    alignItems: "center",
    justifyContent: "center",
  },
  rightButton: {
    position: "absolute",
    right: 12,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#37c866",
    alignItems: "center",
    justifyContent: "center",
  },
  collapsedSearchFab: {
    position: "absolute",
    top: 14,
    right: 14,
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
    top: 14,
    left: 14,
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "#dbe3ef",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
    zIndex: 9,
  },
  collapsedHomeFabText: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomNav: {
    height: 62,
    backgroundColor: "#ffffff",
    borderTopColor: "#ececec",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  navLabel: {
    color: "#b5b5b5",
    fontSize: 11,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#2276ff",
  },
});
