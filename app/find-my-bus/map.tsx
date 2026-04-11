import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import type { RouteListItem, RoutePathPoint } from "@/constants/types";
import { fetchAvailableRoutes, fetchRouteByNumber } from "@/lib/routeService";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const INITIAL_REGION = {
  latitude: 6.9037,
  longitude: 79.918,
  latitudeDelta: 0.015,
  longitudeDelta: 0.012,
};

export default function FindMyBusMapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const activeSearchRequestRef = useRef(0);
  const routePathRef = useRef<RoutePathPoint[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [routeQuery, setRouteQuery] = useState("");
  const [routePath, setRoutePath] = useState<RoutePathPoint[]>([]);
  const [routeName, setRouteName] = useState("");
  const [routeError, setRouteError] = useState("");
  const [routeCatalogError, setRouteCatalogError] = useState("");
  const [availableRoutes, setAvailableRoutes] = useState<RouteListItem[]>([]);
  const [isRouteCatalogLoading, setIsRouteCatalogLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  useEffect(() => {
    routePathRef.current = routePath;
  }, [routePath]);

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
      setRouteName("");

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
        setRouteName(`${route.routeNumber} - ${route.routeName}`);

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

        setRoutePath([]);
        setRouteName("");
        setRouteError(
          error instanceof Error ? error.message : "Failed to fetch route.",
        );
      } finally {
        if (activeSearchRequestRef.current === requestId) {
          setIsRouteLoading(false);
        }
      }
    },
    [isRouteLoading],
  );

  const handleSearchRoute = useCallback(() => {
    const sanitizedQuery = routeQuery.trim();
    const normalizedQuery = sanitizedQuery.toLowerCase();

    setShowSuggestions(false);

    if (!sanitizedQuery) {
      setRouteError("Please enter a route number or route name.");
      return;
    }

    const bestMatch = availableRoutes.find(
      (route) =>
        route.routeNumber.toLowerCase() === normalizedQuery ||
        route.routeName.toLowerCase() === normalizedQuery,
    );

    if (bestMatch) {
      void searchRouteByNumber(bestMatch.routeNumber);
      return;
    }

    if (/^[a-zA-Z0-9]+$/.test(sanitizedQuery)) {
      void searchRouteByNumber(sanitizedQuery);
      return;
    }

    const partialMatch = availableRoutes.find(
      (route) =>
        route.routeNumber.toLowerCase().includes(normalizedQuery) ||
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
        <Pressable
          style={styles.backRow}
          onPress={() => router.push("/screens/home")}
        >
          <MaterialIcons name="arrow-left" size={18} color="#5e6f66" />
          <Text style={styles.backText}>Back to Home</Text>
        </Pressable>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="#3f3f3f" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search route number or name"
            placeholderTextColor="#707070"
            value={routeQuery}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setShowSuggestions(true)}
            onChangeText={(text) => {
              setRouteQuery(text);
              setRouteError("");
              setShowSuggestions(true);
            }}
            onSubmitEditing={handleSearchRoute}
            returnKeyType="search"
          />
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
                <Text style={styles.suggestionText}>
                  {route.routeNumber} - {route.routeName}
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
        {routeCatalogError ? (
          <Text style={styles.catalogErrorLabel}>{routeCatalogError}</Text>
        ) : null}

        {routeName ? <Text style={styles.routeLabel}>{routeName}</Text> : null}

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
          </MapView>

          {locationError || routeError ? (
            <Text style={styles.errorBadge}>{routeError || locationError}</Text>
          ) : null}
          {isRouteLoading ? (
            <Text style={styles.loadingBadge}>Loading route...</Text>
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
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
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
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#b9dfc7",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  },
  backText: {
    color: "#5e6f66",
    fontSize: 14,
    fontWeight: "500",
  },
  searchBar: {
    marginHorizontal: 18,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9e9e9e",
    backgroundColor: "#f0f0f0",
    minHeight: 48,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#2c2c2c",
    fontSize: 14,
  },
  searchButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2276ff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    opacity: 0.55,
  },
  suggestionsList: {
    marginHorizontal: 18,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8c8c8",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
  },
  suggestionText: {
    color: "#313131",
    fontSize: 13,
    fontWeight: "500",
  },
  catalogInfoLabel: {
    marginHorizontal: 18,
    marginBottom: 8,
    color: "#4d4d4d",
    fontSize: 12,
  },
  catalogErrorLabel: {
    marginHorizontal: 18,
    marginBottom: 8,
    color: "#b12020",
    fontSize: 12,
    fontWeight: "500",
  },
  routeLabel: {
    marginHorizontal: 18,
    marginBottom: 8,
    color: "#1a4f2f",
    fontSize: 13,
    fontWeight: "600",
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  errorBadge: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "rgba(198, 36, 36, 0.9)",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "500",
  },
  loadingBadge: {
    position: "absolute",
    top: 46,
    alignSelf: "center",
    backgroundColor: "rgba(28, 28, 28, 0.86)",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "500",
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
