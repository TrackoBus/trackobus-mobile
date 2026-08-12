import type { RoutePathPoint } from "@/constants/types";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import apiClient from "@/lib/apiClient";
import {
    connectLiveTrackingSocket,
    disconnectLiveTrackingSocket,
} from "@/lib/liveTrackingSocket";
import { fetchRouteByNumber } from "@/lib/routeService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
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

export default function BackupMapScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        routeNumber?: string;
        busId?: string;
    }>();

    const routeNumber = params.routeNumber || "";
    const busId = params.busId || "";

    const mapRef = useRef<MapView | null>(null);
    const activeRouteSubscriptionRef = useRef<{
        unsubscribe: () => void;
    } | null>(null);
    const promotionSubscriptionRef = useRef<{
        unsubscribe: () => void;
    } | null>(null);

    const bottomSheetRef = useRef<BottomSheet>(null);
    const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const validationLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const latestCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

    const handleKill = useCallback(() => {
        // Stop location tracking
        locationSubscriptionRef.current?.remove();
        locationSubscriptionRef.current = null;

        // Clear loops
        if (validationLoopRef.current) {
            clearInterval(validationLoopRef.current);
            validationLoopRef.current = null;
        }
        if (promptTimeoutRef.current) {
            clearTimeout(promptTimeoutRef.current);
            promptTimeoutRef.current = null;
        }

        // Cut websocket connection immediately
        activeRouteSubscriptionRef.current?.unsubscribe();
        activeRouteSubscriptionRef.current = null;
        promotionSubscriptionRef.current?.unsubscribe();
        promotionSubscriptionRef.current = null;
        disconnectLiveTrackingSocket().catch((err) => {
            console.error("Failed to disconnect WebSocket on kill", err);
        });

        Alert.alert(
            "Location sharing ended",
            "Location sharing ended due to inactivity.",
            [{ text: "OK", onPress: () => router.replace("/screens/home") }]
        );
    }, [router]);

    const handlePromotion = useCallback((promotedBusId: string, promotedRouteNumber: string) => {
        // Stop location tracking
        locationSubscriptionRef.current?.remove();
        locationSubscriptionRef.current = null;

        // Clear loops
        if (validationLoopRef.current) {
            clearInterval(validationLoopRef.current);
            validationLoopRef.current = null;
        }
        if (promptTimeoutRef.current) {
            clearTimeout(promptTimeoutRef.current);
            promptTimeoutRef.current = null;
        }

        // Unsubscribe WebSocket subscriptions
        activeRouteSubscriptionRef.current?.unsubscribe();
        activeRouteSubscriptionRef.current = null;
        promotionSubscriptionRef.current?.unsubscribe();
        promotionSubscriptionRef.current = null;

        router.replace({
            pathname: "/sharelocation/screens/golivemapScreen" as any,
            params: {
                routeNumber: promotedRouteNumber,
                busId: promotedBusId,
                wasPromoted: "true",
                isDemoMode: "true",
            },
        });
    }, [router]);

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

    const runValidation = async (lat: number, lng: number) => {
        try {
            const response = await apiClient.post(
                `/api/live-tracking/buses/${encodeURIComponent(busId)}/validate`,
                {
                    routeNumber,
                    currentLat: lat,
                    currentLng: lng,
                    primary: false,
                }
            );

            const action = response.data?.action;

            if (action === "KILL_BACKUP") {
                handleKill();
            } else if (action === "PROMPT_USER") {
                handlePrompt();
            }
        } catch (e) {
            console.error("Validation failed in backupMap", e);
        }
    };

    const [locationError, setLocationError] = useState("");
    const [routePath, setRoutePath] = useState<RoutePathPoint[]>([]);
    const [routeError, setRouteError] = useState("");
    const [busLocation, setBusLocation] = useState<LiveBusLocation | null>(null);
    const [isOptingOut, setIsOptingOut] = useState(false);

    const getBusMarkerColor = useCallback((id: string) => {
        let hash = 0;
        for (let index = 0; index < id.length; index += 1) {
            hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
        }
        return BUS_MARKER_COLORS[hash % BUS_MARKER_COLORS.length];
    }, []);

    // 1. Fetch Route polyline path
    useEffect(() => {
        let isMounted = true;
        if (!routeNumber) return;

        const loadRoute = async () => {
            try {
                const route = await fetchRouteByNumber(routeNumber);
                if (isMounted) {
                    if (Array.isArray(route.path) && route.path.length > 0) {
                        setRoutePath(route.path);
                    } else {
                        setRouteError("Route path points not found.");
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setRouteError(err instanceof Error ? err.message : "Failed to load route path.");
                }
            }
        };

        loadRoute();
        return () => {
            isMounted = false;
        };
    }, [routeNumber]);

    // 2. Request user location permissions & watch user location
    useEffect(() => {
        let isMounted = true;

        const startLocationWatch = async () => {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (!isMounted) return;

            if (permission.status !== "granted") {
                setLocationError("Location permission denied.");
                return;
            }

            locationSubscriptionRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 2000,
                    distanceInterval: 2,
                },
                (position) => {
                    if (!isMounted) return;
                    setLocationError("");

                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };

                    const isFirstLocation = !latestCoordsRef.current;
                    latestCoordsRef.current = coords;

                    if (isFirstLocation) {
                        runValidation(coords.latitude, coords.longitude);

                        validationLoopRef.current = setInterval(
                            () => {
                                const current = latestCoordsRef.current;
                                if (current) {
                                    runValidation(current.latitude, current.longitude);
                                }
                            },
                            10 * 60 * 1000
                        );
                    }
                }
            );
        };

        startLocationWatch().catch(() => {
            if (isMounted) {
                setLocationError("Unable to read current location.");
            }
        });

        return () => {
            isMounted = false;
            locationSubscriptionRef.current?.remove();
            locationSubscriptionRef.current = null;
            if (validationLoopRef.current) {
                clearInterval(validationLoopRef.current);
                validationLoopRef.current = null;
            }
            if (promptTimeoutRef.current) {
                clearTimeout(promptTimeoutRef.current);
                promptTimeoutRef.current = null;
            }
        };
    }, [routeNumber, busId]);

    // 3. Connect Live tracking WebSocket and load initial snapshot position
    useEffect(() => {
        let isMounted = true;
        if (!routeNumber || !busId) return;

        const setupLiveTracking = async () => {
            try {
                const currentUser = FIREBASE_AUTH.currentUser;
                if (!currentUser) return;
                const token = await currentUser.getIdToken();

                // 3a. Get initial position snapshot from API
                const snapshotResponse = await apiClient.get<LiveBusLocation[]>(
                    `/api/live-tracking/routes/${encodeURIComponent(routeNumber)}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!isMounted) return;

                const snapshotBuses = Array.isArray(snapshotResponse.data)
                    ? snapshotResponse.data
                    : [];

                const activeSnapshotBus = snapshotBuses.find((b) => b.busId === busId);
                if (activeSnapshotBus) {
                    setBusLocation({
                        ...activeSnapshotBus,
                        coordinate: new AnimatedRegion({
                            latitude: activeSnapshotBus.lat,
                            longitude: activeSnapshotBus.lng,
                            latitudeDelta: 0,
                            longitudeDelta: 0,
                        }),
                    });

                    // Focus camera on the bus initially
                    if (mapRef.current) {
                        mapRef.current.animateCamera(
                            {
                                center: {
                                    latitude: activeSnapshotBus.lat,
                                    longitude: activeSnapshotBus.lng,
                                },
                                zoom: 16,
                            },
                            { duration: 800 }
                        );
                    }
                }

                // 3b. Establish WebSocket subscription for live position updates
                const client = await connectLiveTrackingSocket(token);
                if (!isMounted) return;

                // Subscribe to user-specific promotion queue
                promotionSubscriptionRef.current = client.subscribe(
                    "/user/queue/promotion",
                    (message) => {
                        try {
                            const payload = JSON.parse(message.body);
                            if (payload.action === "PROMOTE_TO_PRIMARY") {
                                handlePromotion(payload.busId, payload.routeNumber);
                            }
                        } catch (err) {
                            console.warn("Failed to parse promotion message", err);
                        }
                    }
                );

                activeRouteSubscriptionRef.current = client.subscribe(
                    `/topic/route/${routeNumber}`,
                    (message) => {
                        try {
                            const incoming = JSON.parse(message.body) as Partial<LiveBusLocation>;
                            if (!isMounted || typeof incoming.busId !== "string" || incoming.busId !== busId) {
                                return;
                            }

                            // Handle bus going offline
                            if (incoming.offline === true) {
                                setBusLocation(null);
                                return;
                            }

                            const hasValidCoords = Number.isFinite(incoming.lat) && Number.isFinite(incoming.lng);
                            if (!hasValidCoords) return;

                            const incomingLat = Number(incoming.lat);
                            const incomingLng = Number(incoming.lng);

                            setBusLocation((prevBus) => {
                                let coordinate = prevBus?.coordinate;

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
                                    routeNumber: incoming.routeNumber || routeNumber,
                                    busId,
                                    lat: incomingLat,
                                    lng: incomingLng,
                                    timestamp: incoming.timestamp || Date.now(),
                                    primary: Boolean(incoming.primary),
                                    offline: false,
                                    lastHeartbeatAt: Date.now(),
                                    coordinate,
                                };
                            });
                        } catch (err) {
                            console.warn("Failed to parse incoming WS update", err);
                        }
                    }
                );
            } catch (err) {
                console.warn("Failed setting up live tracking in backupMap", err);
            }
        };

        setupLiveTracking();

        return () => {
            isMounted = false;
            activeRouteSubscriptionRef.current?.unsubscribe();
            activeRouteSubscriptionRef.current = null;
            promotionSubscriptionRef.current?.unsubscribe();
            promotionSubscriptionRef.current = null;
            disconnectLiveTrackingSocket().catch(() => { });
        };
    }, [routeNumber, busId]);

    // 4. Opt Out Action
    const handleOptOut = useCallback(async () => {
        if (!busId) return;

        Alert.alert(
            "Confirm Opt Out",
            "Are you sure you want to stop acting as a backup rider for this bus?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Opt Out",
                    style: "destructive",
                    onPress: async () => {
                        setIsOptingOut(true);
                        try {
                            const currentUser = FIREBASE_AUTH.currentUser;
                            if (currentUser) {
                                const token = await currentUser.getIdToken();
                                await apiClient.post(
                                    `/api/live-tracking/buses/${encodeURIComponent(busId)}/backup`,
                                    null,
                                    {
                                        params: { isOptingIn: false },
                                        headers: { Authorization: `Bearer ${token}` },
                                    }
                                );
                            }

                            // Disconnect from the WebSocket explicitly before navigating
                            activeRouteSubscriptionRef.current?.unsubscribe();
                            activeRouteSubscriptionRef.current = null;
                            promotionSubscriptionRef.current?.unsubscribe();
                            promotionSubscriptionRef.current = null;
                            await disconnectLiveTrackingSocket().catch(() => { });

                            router.push("/screens/home");
                        } catch (err) {
                            console.error("Failed to opt out:", err);
                            Alert.alert("Error", "Failed to opt out. Please try again.");
                        } finally {
                            setIsOptingOut(false);
                        }
                    },
                },
            ]
        );
    }, [busId, router]);

    // Automatically fit map to route bounds initially
    useEffect(() => {
        if (mapRef.current && routePath.length > 1) {
            mapRef.current.fitToCoordinates(routePath, {
                edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
                animated: true,
            });
        }
    }, [routePath]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.screen}>
                <StatusBar style="light" />

                {/* Floating Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={handleOptOut}
                        style={styles.backButton}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Currently Riding</Text>
                        <Text style={styles.headerSubtitle}>
                            Route {routeNumber} • Bus {busId}
                        </Text>
                    </View>
                </View>

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
                            showsUserLocation
                            showsMyLocationButton={false}
                            toolbarEnabled={false}
                        >
                            {routePath.length > 0 && (
                                <Polyline
                                    coordinates={routePath}
                                    strokeColor="#2276ff"
                                    strokeWidth={4}
                                />
                            )}

                            {busLocation && (
                                <Marker
                                    key={busLocation.busId}
                                    coordinate={{ latitude: busLocation.lat, longitude: busLocation.lng }}
                                    title={`Bus ${busLocation.busId}`}
                                    description={`Currently Riding`}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View
                                        style={[
                                            styles.busMarker,
                                            { backgroundColor: getBusMarkerColor(busLocation.busId) },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="bus" size={18} color="#ffffff" />
                                    </View>
                                </Marker>
                            )}
                        </MapView>

                        {/* Error/Loading overlay status */}
                        {routeError || locationError ? (
                            <Text style={styles.errorBadge}>
                                {routeError || locationError}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Bottom Option card */}
                <View style={styles.bottomCard}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="shield-check" size={24} color="#10b981" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoTitle}>Backup Rider Active</Text>
                            <Text style={styles.infoDescription}>
                                {"Thank you for supporting the community. You will be promoted to Primary Sharer if the current Primary Sharer stops tracking the bus."}
                            </Text>
                        </View>
                    </View>

                    <Pressable
                        style={[styles.optOutButton, isOptingOut && styles.disabledButton]}
                        onPress={handleOptOut}
                        disabled={isOptingOut}
                    >
                        <Text style={styles.optOutButtonText}>
                            {isOptingOut ? "Opting Out..." : "Opt Out"}
                        </Text>
                    </Pressable>
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
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#202022",
    },
    header: {
        position: "absolute",
        top: 50,
        left: 16,
        right: 16,
        zIndex: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#334155",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 14,
        color: "#94a3b8",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 18,
        color: "#ffffff",
        fontWeight: "700",
        marginTop: 2,
    },
    mapCard: {
        flex: 1,
        marginHorizontal: 8,
        marginTop: 8,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#d7e7df",
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
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    errorBadge: {
        position: "absolute",
        bottom: 20,
        alignSelf: "center",
        backgroundColor: "rgba(198, 36, 36, 0.95)",
        color: "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        fontSize: 13,
        fontWeight: "600",
    },
    bottomCard: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 34,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
    },
    infoRow: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 24,
        alignItems: "flex-start",
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0f172a",
    },
    infoDescription: {
        fontSize: 14,
        color: "#64748b",
        lineHeight: 20,
        marginTop: 4,
    },
    optOutButton: {
        backgroundColor: "#ef4444",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.6,
    },
    optOutButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
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
});
