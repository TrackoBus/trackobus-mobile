import type { RoutePathPoint } from "@/constants/types";
import {
  connectLiveTrackingSocket,
  disconnectLiveTrackingSocket,
  getLiveTrackingSocket,
} from "@/lib/liveTrackingSocket";
import { fetchRouteByNumber } from "@/lib/routeService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type LocationPingPayload = {
  routeNumber: string;
  busId: string;
  lat: number;
  lng: number;
  timestamp: number;
  isPrimary: boolean;
};

const INITIAL_REGION = {
  latitude: 6.9037,
  longitude: 79.918,
  latitudeDelta: 0.015,
  longitudeDelta: 0.012,
};

export default function GoLiveMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    routeNumber?: string;
    busId?: string;
  }>();
  const routeNumber = useMemo(() => {
    if (typeof params.routeNumber === "string") {
      return params.routeNumber;
    }

    return "";
  }, [params.routeNumber]);
  const busId = useMemo(() => {
    if (typeof params.busId === "string") {
      return params.busId;
    }

    return "";
  }, [params.busId]);

  const mapRef = useRef<MapView | null>(null);
  const latestCoordsRef = useRef<Coordinate | null>(null);
  const connectionAnnouncedRef = useRef(false);
  const publishLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [routePath, setRoutePath] = useState<RoutePathPoint[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [statusMessage, setStatusMessage] = useState(
    "Connecting to live tracking...",
  );

  useEffect(() => {
    let isMounted = true;

    const loadRoutePath = async () => {
      if (!routeNumber) {
        return;
      }

      try {
        const route = await fetchRouteByNumber(routeNumber);

        if (!isMounted) {
          return;
        }

        if (Array.isArray(route.path) && route.path.length > 0) {
          setRoutePath(route.path);
        }
      } catch {
        if (isMounted) {
          setRoutePath([]);
        }
      }
    };

    loadRoutePath().catch(() => {
      if (isMounted) {
        setRoutePath([]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [routeNumber]);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    const cleanup = () => {
      locationSubscription?.remove();

      if (publishLoopRef.current) {
        clearInterval(publishLoopRef.current);
        publishLoopRef.current = null;
      }
    };

    const setupLiveTracking = async () => {
      if (!routeNumber || !busId) {
        if (isMounted) {
          setStatusMessage("Missing route or trip ID. Please start again.");
          setIsConnecting(false);
        }
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (isMounted) {
          setStatusMessage("Location permission denied.");
          setIsConnecting(false);
        }
        return;
      }

      if (isMounted) {
        setIsConnecting(true);
        setStatusMessage("Connecting to live tracking...");
      }

      connectionAnnouncedRef.current = false;

      const client = getLiveTrackingSocket();
      if (!client?.connected) {
        throw new Error("Live tracking is not connected. Please start again.");
      }

      connectionAnnouncedRef.current = true;
      if (isMounted) {
        setStatusMessage("Live tracking connected.");
        setIsConnecting(false);
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (position) => {
          if (!isMounted) {
            return;
          }

          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          latestCoordsRef.current = coords;
          setCurrentLocation(coords);

          if (mapRef.current) {
            mapRef.current.animateCamera(
              {
                center: {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                },
                zoom: 17,
              },
              { duration: 600 },
            );
          }
        },
      );

      publishLoopRef.current = setInterval(() => {
        const coords = latestCoordsRef.current;
        const activeClient = getLiveTrackingSocket();

        if (!coords || !activeClient?.connected) {
          if (isMounted) {
            connectionAnnouncedRef.current = false;
            setStatusMessage("Disconnected. Reconnecting...");
            setIsConnecting(true);
          }
          return;
        }

        if (!connectionAnnouncedRef.current && isMounted) {
          connectionAnnouncedRef.current = true;
          setStatusMessage("Live tracking connected.");
          setIsConnecting(false);
        }

        activeClient.publish({
          destination: "/app/ping",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            routeNumber,
            busId,
            lat: coords.latitude,
            lng: coords.longitude,
            timestamp: Date.now(),
            isPrimary: true,
          } satisfies LocationPingPayload),
        });
      }, 3000);
    };

    setupLiveTracking().catch((error) => {
      if (isMounted) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to start live sharing.";
        setStatusMessage(message);
        setIsConnecting(false);
      }
    });

    return () => {
      isMounted = false;
      cleanup();
      disconnectLiveTrackingSocket().catch(() => {
        // no-op cleanup
      });
    };
  }, [routeNumber, busId]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={26}
              color="#111827"
            />
          </Pressable>
          <View>
            <Text style={styles.title}>You Are Live</Text>
            <Text style={styles.subtitle}>
              Route {routeNumber} | Bus ID: {busId}
            </Text>
          </View>
        </View>

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation={false}
          showsMyLocationButton={false}
          loadingEnabled
        >
          {routePath.length > 0 ? (
            <Polyline
              coordinates={routePath}
              strokeColor="#2276ff"
              strokeWidth={4}
            />
          ) : null}

          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Bus"
              description={`Route ${routeNumber}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.busMarker}>
                <MaterialCommunityIcons name="bus" size={18} color="#ffffff" />
              </View>
            </Marker>
          )}
        </MapView>

        <View style={styles.statusCard}>
          {isConnecting ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <MaterialCommunityIcons name="wifi" size={18} color="#16A34A" />
          )}
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1F1F1F",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  busMarker: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#DBEAFE",
  },
  statusCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    flex: 1,
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "500",
  },
});
