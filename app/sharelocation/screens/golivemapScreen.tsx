import type { RoutePathPoint } from "@/constants/types";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import apiClient from "@/lib/apiClient";
import {
  connectLiveTrackingSocket,
  disconnectLiveTrackingSocket,
  getLiveTrackingSocket,
} from "@/lib/liveTrackingSocket";
import { fetchRouteByNumber } from "@/lib/routeService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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

const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

export default function GoLiveMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    routeNumber?: string;
    busId?: string;
    wasPromoted?: string;
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
  const alertedPromotionRef = useRef(false);
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
  const [isStopping, setIsStopping] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const likesSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const congratsBottomSheetRef = useRef<BottomSheet>(null);
  const [pointsData, setPointsData] = useState<{
    totalPoints: number;
    distance: number;
    distancePoints: number;
    likes: number;
    likePoints: number;
  } | null>(null);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleKill = useCallback(() => {
    // Cut websocket connection immediately
    disconnectLiveTrackingSocket().catch((err) => {
      console.error("Failed to disconnect WebSocket on kill", err);
    });

    // Abort reconnect / connection loops
    didAbortForDisconnectRef.current = true;

    // Stop location tracking and all loops/intervals
    cleanupRef.current?.();

    // Update connection state and status messages immediately
    setConnectionState("lost");
    setStatusMessage("Location sharing ended due to inactivity.");
    setIsConnecting(false);

    Alert.alert(
      "Location sharing ended",
      "Location sharing ended due to inactivity.",
      [{ text: "OK", onPress: () => router.replace("/screens/home") }],
    );
  }, [router, setConnectionState, setStatusMessage, setIsConnecting]);

  const performStopSharing = useCallback(
    async (navigateAction: () => void) => {
      if (isStopping) return;
      setIsStopping(true);

      // Cut websocket connection immediately
      disconnectLiveTrackingSocket().catch((err) => {
        console.error("Failed to disconnect WebSocket on stop sharing", err);
      });

      // Abort reconnect / connection loops
      didAbortForDisconnectRef.current = true;

      // Stop location tracking and all loops/intervals
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Update connection state and status messages immediately
      setConnectionState("lost");
      setStatusMessage("Location sharing ended.");
      setIsConnecting(false);

      try {
        const response = await apiClient.post(
          `/api/live-tracking/buses/${encodeURIComponent(busId)}/points/calculate`,
          {},
        );
        const totalPoints = response.data?.totalPoints ?? 0;
        const distance = response.data?.distance ?? 0;
        const distancePoints = response.data?.distancePoints ?? 0;
        const likes = response.data?.likes ?? 0;
        const likePoints = response.data?.likePoints ?? 0;

        if (totalPoints > 0) {
          setPointsData({
            totalPoints,
            distance,
            distancePoints,
            likes,
            likePoints,
          });
          congratsBottomSheetRef.current?.expand();
          setIsStopping(false);
          return;
        } else {
          // Points earned is 0, do not show congrats popup
          navigateAction();
          return;
        }
      } catch (error) {
        console.error("Failed to calculate points:", error);
      }

      // If call failed: just navigate
      navigateAction();
    },
    [busId, isStopping, setConnectionState, setStatusMessage, setIsConnecting],
  );

  const handleStopSharing = useCallback(
    (navigateAction: () => void) => {
      if (isStopping) return;
      Alert.alert(
        "Stop Sharing Location?",
        "Are you sure you want to stop sharing?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Stop",
            style: "destructive",
            onPress: () => performStopSharing(navigateAction),
          },
        ],
        { cancelable: true },
      );
    },
    [performStopSharing, isStopping],
  );

  useEffect(() => {
    const backAction = () => {
      handleStopSharing(() => router.back());
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [handleStopSharing, router]);

  const handlePrompt = useCallback(() => {
    bottomSheetRef.current?.expand();
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    promptTimeoutRef.current = setTimeout(() => {
      bottomSheetRef.current?.close();
      handleKill();
    }, 60_000);
  }, [handleKill]);

  const handlePromptAcknowledge = useCallback(() => {
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    bottomSheetRef.current?.close();
  }, []);

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
    if (
      params.wasPromoted === "true" &&
      connectionState === "connected" &&
      !alertedPromotionRef.current
    ) {
      alertedPromotionRef.current = true;
      Alert.alert(
        "You are now the Primary Sharer!",
        "You have been promoted to Primary Sharer. Thank you for supporting the community.",
      );
    }
  }, [params.wasPromoted, connectionState]);

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

      if (validationLoopRef.current) {
        clearInterval(validationLoopRef.current);
        validationLoopRef.current = null;
      }

      if (likesSubscriptionRef.current) {
        likesSubscriptionRef.current.unsubscribe();
        likesSubscriptionRef.current = null;
      }
    };

    cleanupRef.current = cleanup;

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

    const subscribeToLikes = (activeClient: any) => {
      if (likesSubscriptionRef.current) {
        likesSubscriptionRef.current.unsubscribe();
        likesSubscriptionRef.current = null;
      }

      if (activeClient && activeClient.connected) {
        likesSubscriptionRef.current = activeClient.subscribe(
          `/topic/buses/${busId}/likes`,
          (message: any) => {
            try {
              const data = JSON.parse(message.body);
              if (data && typeof data.totalLikes === "number" && isMounted) {
                setLikeCount(data.totalLikes);

                // Pulse animation
                Animated.sequence([
                  Animated.timing(likeScaleAnim, {
                    toValue: 1.3,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                  Animated.timing(likeScaleAnim, {
                    toValue: 1.0,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }
            } catch (error) {
              console.error("Failed to parse like message:", error);
            }
          }
        );
      }
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

      if (client) {
        subscribeToLikes(client);
      }

      const runValidation = async (lat: number, lng: number) => {
        try {
          const response = await apiClient.post(
            `/api/live-tracking/buses/${encodeURIComponent(busId)}/validate`,
            {
              routeNumber,
              currentLat: lat,
              currentLng: lng,
              primary: true,
            },
          );

          const action = response.data?.action;

          if (!isMounted) return;

          if (action === "KILL_PRIMARY") {
            handleKill();
          } else if (action === "PROMPT_USER") {
            handlePrompt();
          }
        } catch (e) {
          console.error("Validation failed", e);
        }
      };

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

          const isFirstLocation = !latestCoordsRef.current;

          latestCoordsRef.current = coords;
          setCurrentLocation(coords);

          if (isFirstLocation) {
            runValidation(coords.latitude, coords.longitude);

            validationLoopRef.current = setInterval(
              () => {
                const current = latestCoordsRef.current;
                if (current) {
                  runValidation(current.latitude, current.longitude);
                }
              },
              10 * 60 * 1000,
            );
          }

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
          subscribeToLikes(activeClient);
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
      cleanupRef.current = null;
      disconnectLiveTrackingSocket().catch(() => {
        // no-op cleanup
      });
    };
  }, [routeNumber, busId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={() => handleStopSharing(() => router.back())}
              disabled={isStopping}
              style={[styles.backButton, isStopping && { opacity: 0.5 }]}
            >
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
                  <MaterialCommunityIcons
                    name="bus"
                    size={18}
                    color="#ffffff"
                  />
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
          <Animated.View
            style={[
              styles.likeCountContainer,
              { transform: [{ scale: likeScaleAnim }] },
            ]}
          >
            <MaterialCommunityIcons name="heart" size={18} color="#EF4444" />
            <Text style={styles.likeCountText}>
              {likeCount} {likeCount === 1 ? "Like" : "Likes"}
            </Text>
          </Animated.View>
          <Pressable
            onPress={() => handleStopSharing(() => router.replace("/screens/home"))}
            disabled={isStopping}
            style={[
              styles.stopSharingButton,
              isStopping && { backgroundColor: "#fca5a5" },
            ]}
          >
            {isStopping ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.stopSharingButtonText}>Stop Sharing</Text>
            )}
          </Pressable>
          <View style={styles.statusCard}>
            {connectionState === "connecting" ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : connectionState === "lost" ? (
              <MaterialCommunityIcons
                name="wifi-off"
                size={18}
                color="#DC2626"
              />
            ) : (
              <MaterialCommunityIcons name="wifi" size={18} color="#16A34A" />
            )}
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>

          <BottomSheet
            ref={bottomSheetRef}
            snapPoints={["30%"]}
            index={-1}
            enablePanDownToClose={false}
            backgroundStyle={styles.bottomSheetBackground}
          >
            <BottomSheetView style={styles.bottomSheetContent}>
              <Text style={styles.bottomSheetTitle}>
                Are you still in the bus?
              </Text>
              <Text style={styles.bottomSheetDetail}>
                We noticed you might be off the route. Please confirm you are
                still riding. Location sharing will stop if you don't respond.
              </Text>
              <Pressable
                style={styles.confirmButton}
                onPress={handlePromptAcknowledge}
              >
                <Text style={styles.confirmButtonText}>
                  Yes, I am in the bus
                </Text>
              </Pressable>
            </BottomSheetView>
          </BottomSheet>

          <BottomSheet
            ref={congratsBottomSheetRef}
            snapPoints={["45%"]}
            index={-1}
            enablePanDownToClose={false}
            backgroundStyle={styles.bottomSheetBackground}
          >
            <BottomSheetView style={styles.bottomSheetContent}>
              <View style={styles.congratsTitleContainer}>
                <MaterialCommunityIcons name="party-popper" size={28} color="#F59E0B" />
                <Text style={styles.congratsTitle}>Congratulation</Text>
                <MaterialCommunityIcons name="party-popper" size={28} color="#F59E0B" />
              </View>

              <View style={styles.congratsRow}>
                {/* Left Block: Distance */}
                <View style={styles.congratsBlock}>
                  <MaterialCommunityIcons name="map-marker-distance" size={22} color="#64748B" />
                  <Text style={styles.congratsBlockValue}>
                    {pointsData ? formatDistance(pointsData.distance) : "0 m"}
                  </Text>
                  <Text style={styles.congratsBlockSub}>
                    {pointsData ? `${pointsData.distancePoints} Points` : "0 Points"}
                  </Text>
                </View>

                {/* Middle Block: Total Points */}
                <View style={[styles.congratsBlock, styles.congratsBlockMiddle]}>
                  <MaterialCommunityIcons name="trophy" size={26} color="#EAB308" />
                  <Text style={[styles.congratsBlockValue, styles.congratsBlockValueMiddle]}>
                    {pointsData ? pointsData.totalPoints : 0}
                  </Text>
                  <Text style={styles.congratsBlockSub}>
                    Total Points
                  </Text>
                </View>

                {/* Right Block: Likes */}
                <View style={styles.congratsBlock}>
                  <MaterialCommunityIcons name="thumb-up" size={22} color="#3B82F6" />
                  <Text style={styles.congratsBlockValue}>
                    {pointsData ? `${pointsData.likes} Likes` : "0 Likes"}
                  </Text>
                  <Text style={styles.congratsBlockSub}>
                    {pointsData ? `${pointsData.likePoints} Points` : "0 Points"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.goHomeButton}
                onPress={() => {
                  congratsBottomSheetRef.current?.close();
                  router.replace("/screens/home");
                }}
              >
                <Text style={styles.goHomeButtonText}>Go Home</Text>
              </Pressable>
            </BottomSheetView>
          </BottomSheet>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  likeCountContainer: {
    position: "absolute",
    left: 12,
    bottom: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  likeCountText: {
    color: "#1F2937",
    fontWeight: "bold",
    fontSize: 14,
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
  bottomSheetBackground: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  bottomSheetDetail: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  congratsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
  },
  congratsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 12,
    gap: 8,
  },
  congratsBlock: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  congratsBlockMiddle: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1.5,
    transform: [{ scale: 1.05 }],
  },
  congratsBlockValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6,
    textAlign: "center",
  },
  congratsBlockValueMiddle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E40AF",
  },
  congratsBlockSub: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  goHomeButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  goHomeButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
