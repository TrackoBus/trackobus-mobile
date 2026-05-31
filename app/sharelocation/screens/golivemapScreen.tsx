import type { RoutePathPoint } from "@/constants/types";
import { FIREBASE_AUTH } from "@/firebaseConfig";
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
  Animated,
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
  primary: boolean;
  offline: boolean;
};

const INITIAL_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 3.6,
  longitudeDelta: 3.2,
};

const RECONNECT_TIMEOUT_MS = 70_000;
const RECONNECT_BACKOFF_BASE_MS = 1_000;
const RECONNECT_BACKOFF_MAX_MS = 16_000;
const RECONNECT_LOOP_INTERVAL_MS = 1_000;

type ConnectionState = "connecting" | "connected" | "lost";

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
  const disconnectedSinceRef = useRef<number | null>(null);
  const didAbortForDisconnectRef = useRef(false);
  const publishLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptCountRef = useRef(0);
  const reconnectInFlightRef = useRef<Promise<void> | null>(null);
  const nextReconnectAttemptAtRef = useRef(0);
  const livePulseAnim = useRef(new Animated.Value(1)).current;
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [routePath, setRoutePath] = useState<RoutePathPoint[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [statusMessage, setStatusMessage] = useState(
    "Connecting to live tracking...",
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const isSimulatingRef = useRef(isSimulating);

  const handleSimulatePress = () => {
    setIsSimulating((prev) => {
      const newVal = !prev;
      isSimulatingRef.current = newVal;
      return newVal;
    });
  };

  useEffect(() => {
    if (connectionState === "connected") {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(livePulseAnim, {
            toValue: 0.55,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(livePulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }

    livePulseAnim.stopAnimation();
    livePulseAnim.setValue(1);
    return undefined;
  }, [connectionState, livePulseAnim]);

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

      if (reconnectLoopRef.current) {
        clearInterval(reconnectLoopRef.current);
        reconnectLoopRef.current = null;
      }
    };

    const connectWithBackoff = async (startedAt: number) => {
      if (!isMounted || didAbortForDisconnectRef.current) {
        return;
      }

      const now = Date.now();

      if (now >= startedAt + RECONNECT_TIMEOUT_MS) {
        didAbortForDisconnectRef.current = true;

        if (isMounted) {
          setStatusMessage("Connection Lost. Live sharing stopped.");
          setIsConnecting(false);
          setConnectionState("lost");
        }

        return;
      }

      if (
        reconnectInFlightRef.current ||
        now < nextReconnectAttemptAtRef.current
      ) {
        return;
      }

      const nextAttempt = reconnectAttemptCountRef.current + 1;
      reconnectAttemptCountRef.current = nextAttempt;

      const backoffMs = Math.min(
        RECONNECT_BACKOFF_BASE_MS * 2 ** (nextAttempt - 1),
        RECONNECT_BACKOFF_MAX_MS,
      );
      nextReconnectAttemptAtRef.current = now + backoffMs;

      if (isMounted) {
        setStatusMessage("Disconnected. Reconnecting...");
        setIsConnecting(true);
        setConnectionState("connecting");
      }

      reconnectInFlightRef.current = (async () => {
        try {
          const currentUser = FIREBASE_AUTH.currentUser;

          if (!currentUser) {
            throw new Error("Please sign in before going live.");
          }

          const refreshedToken = await currentUser.getIdToken(true);

          if (!isMounted || didAbortForDisconnectRef.current) {
            return;
          }

          await connectLiveTrackingSocket(refreshedToken);
        } catch {
          // Keep retrying until timeout window expires.
        }
      })().finally(() => {
        reconnectInFlightRef.current = null;
      });
    };

    const setupLiveTracking = async () => {
      if (!routeNumber || !busId) {
        if (isMounted) {
          setStatusMessage("Missing route or trip ID. Please start again.");
          setIsConnecting(false);
          setConnectionState("lost");
        }
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (isMounted) {
          setStatusMessage("Location permission denied.");
          setIsConnecting(false);
          setConnectionState("lost");
        }
        return;
      }

      if (isMounted) {
        setIsConnecting(true);
        setConnectionState("connecting");
        setStatusMessage("Connecting to live tracking...");
      }

      connectionAnnouncedRef.current = false;
      disconnectedSinceRef.current = null;
      didAbortForDisconnectRef.current = false;

      reconnectAttemptCountRef.current = 0;
      reconnectInFlightRef.current = null;
      nextReconnectAttemptAtRef.current = 0;

      const initialConnectStartedAt = Date.now();

      while (isMounted && !didAbortForDisconnectRef.current) {
        const activeClient = getLiveTrackingSocket();

        if (activeClient?.connected) {
          break;
        }

        await connectWithBackoff(initialConnectStartedAt);
        await new Promise((resolve) => {
          setTimeout(resolve, 300);
        });
      }

      const client = getLiveTrackingSocket();
      if (!client?.connected) {
        throw new Error("Connection Lost. Live sharing stopped.");
      }

      connectionAnnouncedRef.current = true;
      reconnectAttemptCountRef.current = 0;
      nextReconnectAttemptAtRef.current = 0;

      if (isMounted) {
        setStatusMessage("Live tracking connected.");
        setIsConnecting(false);
        setConnectionState("connected");
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

        // ** Temporary Simulation Overrides ** //
        // For testing we will override the actual coordinates if isSimulating is set
        const publishLat = isSimulatingRef.current
          ? 6.828441203035964
          : coords?.latitude;
        const publishLng = isSimulatingRef.current
          ? 80.9862700035748
          : coords?.longitude;

        if (!activeClient?.connected) {
          if (didAbortForDisconnectRef.current) {
            return;
          }

          const now = Date.now();

          if (disconnectedSinceRef.current === null) {
            disconnectedSinceRef.current = now;
          }

          const disconnectedDuration = now - disconnectedSinceRef.current;

          if (disconnectedDuration >= RECONNECT_TIMEOUT_MS) {
            didAbortForDisconnectRef.current = true;

            if (isMounted) {
              setStatusMessage("Connection Lost. Live sharing stopped.");
              setIsConnecting(false);
              setConnectionState("lost");
            }

            cleanup();
            disconnectLiveTrackingSocket().catch(() => {
              // no-op cleanup
            });
            return;
          }

          connectionAnnouncedRef.current = false;

          return;
        }

        disconnectedSinceRef.current = null;
        reconnectAttemptCountRef.current = 0;
        nextReconnectAttemptAtRef.current = 0;

        if (publishLat === undefined || publishLng === undefined) {
          return;
        }

        if (!connectionAnnouncedRef.current && isMounted) {
          connectionAnnouncedRef.current = true;
          setStatusMessage("Live tracking connected.");
          setIsConnecting(false);
          setConnectionState("connected");
        }

        activeClient.publish({
          destination: "/app/ping",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            routeNumber,
            busId,
            lat: publishLat,
            lng: publishLng,
            timestamp: Date.now(),
            primary: true,
            offline: false,
          } satisfies LocationPingPayload),
        });
      }, 5000);

      reconnectLoopRef.current = setInterval(() => {
        if (!isMounted || didAbortForDisconnectRef.current) {
          return;
        }

        if (disconnectedSinceRef.current === null) {
          return;
        }

        void connectWithBackoff(disconnectedSinceRef.current);
      }, RECONNECT_LOOP_INTERVAL_MS);
    };

    setupLiveTracking().catch((error) => {
      if (isMounted) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to start live sharing.";
        setStatusMessage(message);
        setIsConnecting(false);
        setConnectionState("lost");
      }
    });

    return () => {
      isMounted = false;
      reconnectInFlightRef.current = null;
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
            <View style={styles.titleRow}>
              <Text style={styles.title}>
                {connectionState === "lost"
                  ? "Lost Connection"
                  : "You Are Live"}
              </Text>
              <Animated.View
                style={[
                  styles.statusLight,
                  connectionState === "connected"
                    ? styles.statusLightConnected
                    : connectionState === "lost"
                      ? styles.statusLightLost
                      : styles.statusLightConnecting,
                  connectionState === "connected"
                    ? { opacity: livePulseAnim }
                    : null,
                ]}
              />
            </View>
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
        {/* TEMPORARY SIMULATION BUTTON FOR TESTING */}
        <Pressable
          onPress={handleSimulatePress}
          style={[
            styles.simulationButton,
            isSimulating ? styles.simulationButtonActive : undefined,
          ]}
        >
          <Text style={styles.simulationButtonText}>
            {isSimulating ? "Stop Simulating" : "Simulate Far Location"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            router.replace("/screens/home");
          }}
          style={styles.stopSharingButton}
        >
          <Text style={styles.stopSharingButtonText}>Stop Sharing</Text>
        </Pressable>
        <View style={styles.statusCard}>
          {connectionState === "connecting" ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : connectionState === "lost" ? (
            <MaterialCommunityIcons name="wifi-off" size={18} color="#DC2626" />
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLight: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLightConnected: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.9,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  statusLightLost: {
    backgroundColor: "#DC2626",
  },
  statusLightConnecting: {
    backgroundColor: "#F59E0B",
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
  stopSharingButton: {
    position: "absolute",
    left: 12,
    bottom: 80,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  stopSharingButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  simulationButton: {
    position: "absolute",
    right: 12,
    bottom: 80,
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    borderWidth: 2,
    borderColor: "#DC2626",
    borderStyle: "dashed",
  },
  simulationButtonActive: {
    backgroundColor: "#DC2626",
  },
  simulationButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});
