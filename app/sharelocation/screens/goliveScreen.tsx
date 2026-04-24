import BottomNav from "@/components/BottomNav";
import apiClient from "@/lib/apiClient";
import {
  connectLiveTrackingSocket,
  disconnectLiveTrackingSocket,
} from "@/lib/liveTrackingSocket";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import type { RouteListItem } from "@/constants/types";
import { fetchAvailableRoutes } from "@/lib/routeService";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BenefitCard from "../components/BenefitCard";
import InfoBanner from "../components/InfoBanner";

interface Route {
  id: string;
  number: string;
  startLocation: string;
  endLocation: string;
  type: "AppRoute" | "Standard" | "Express";
}

const LIVE_TRACKING_CONNECT_TIMEOUT_MS = 15000;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1f1f1f",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "#e0e0e0",
    borderBottomWidth: 1,
  },
  headerBack: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#999999",
    marginTop: 2,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchSection: {
    marginBottom: 12,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    minHeight: 52,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
  },
  searchResultsContainer: {
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomColor: "#eef2f7",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
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
  searchResultText: {
    fontWeight: "600",
    color: "#1e293b",
    fontSize: 13,
  },
  searchInfoLabel: {
    alignSelf: "flex-start",
    marginBottom: 8,
    color: "#334155",
    fontSize: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  searchErrorLabel: {
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
  popularRoutesSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  routeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  routeCardContainer: {
    width: "48%",
  },
  routeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  routeCardSelected: {
    borderColor: "#22C55E",
    backgroundColor: "#f0fdf4",
  },
  routeNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
  },
  routeAvailable: {
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "600",
    marginTop: 8,
  },
  routeCount: {
    fontSize: 11,
    color: "#999999",
    marginTop: 4,
  },
  goLiveContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  goLiveButton: {
    backgroundColor: "#22C55E",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  goLiveButtonDisabled: {
    backgroundColor: "#BDEFCB",
  },
  goLiveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  goLiveButtonTextDisabled: {
    color: "#ffffff",
  },
});

export default function GoLiveScreen() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedRouteNumber, setSelectedRouteNumber] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<RouteListItem[]>([]);
  const [isRouteCatalogLoading, setIsRouteCatalogLoading] = useState(false);
  const [routeCatalogError, setRouteCatalogError] = useState("");

  const allRoutes: Route[] = [
    {
      id: "1",
      number: "138",
      startLocation: "Pettah",
      endLocation: "Kadawatha",
      type: "Standard",
    },
    {
      id: "2",
      number: "176",
      startLocation: "Colombo",
      endLocation: "Panadura",
      type: "Standard",
    },
    {
      id: "3",
      number: "120",
      startLocation: "Kadawatha",
      endLocation: "Malabe",
      type: "Standard",
    },
    {
      id: "4",
      number: "177",
      startLocation: "Pettah",
      endLocation: "Nugegoda",
      type: "Standard",
    },
    {
      id: "5",
      number: "145",
      startLocation: "Colombo",
      endLocation: "Negombo",
      type: "Express",
    },
    {
      id: "6",
      number: "156",
      startLocation: "Kandy",
      endLocation: "Matara",
      type: "AppRoute",
    },
  ];

  const popularRoutes: Route[] = [
    {
      id: "1",
      number: "138",
      startLocation: "Pettah",
      endLocation: "Kadawatha",
      type: "Standard",
    },
    {
      id: "2",
      number: "176",
      startLocation: "Colombo",
      endLocation: "Panadura",
      type: "Standard",
    },
    {
      id: "3",
      number: "120",
      startLocation: "Kadawatha",
      endLocation: "Malabe",
      type: "Standard",
    },
    {
      id: "4",
      number: "177",
      startLocation: "Pettah",
      endLocation: "Nugegoda",
      type: "Standard",
    },
  ];

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

  const getRouteDisplayLabel = (route: RouteListItem) => {
    return `${route.routeNumber} - ${route.routeName}`;
  };

  const getSelectedRouteInputLabel = (route: RouteListItem) => {
    return `${route.routeNumber} (${route.routeName})`;
  };

  const routeSuggestions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

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
  }, [availableRoutes, searchQuery]);

  const syncPopularSelection = (routeNumber: string) => {
    const matchingPopularRoute = popularRoutes.find(
      (route) => route.number === routeNumber,
    );
    setSelectedRoute(matchingPopularRoute ?? null);
  };

  const handleSelectSuggestion = (route: RouteListItem) => {
    setSelectedRouteNumber(route.routeNumber);
    setSearchQuery(getSelectedRouteInputLabel(route));
    syncPopularSelection(route.routeNumber);
    setShowSearchResults(false);
  };

  const handleSelectPopularRoute = (route: Route) => {
    setSelectedRoute(route);
    setSelectedRouteNumber(route.number);
    setSearchQuery(
      `${route.number} (${route.startLocation} - ${route.endLocation})`,
    );
    setShowSearchResults(false);
  };

  const handleSearchSubmit = () => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return;
    }

    const exactMatch = availableRoutes.find(
      (route) =>
        route.routeNumber.toLowerCase() === normalizedQuery ||
        route.routeName.toLowerCase() === normalizedQuery ||
        getSelectedRouteInputLabel(route).toLowerCase() === normalizedQuery ||
        getRouteDisplayLabel(route).toLowerCase() === normalizedQuery,
    );

    if (exactMatch) {
      handleSelectSuggestion(exactMatch);
      return;
    }

    if (routeSuggestions.length > 0) {
      handleSelectSuggestion(routeSuggestions[0]);
    }
  };

  const handleGoLive = async () => {
    if (!selectedRouteNumber || isStartingLive) {
      return;
    }

    const currentUser = FIREBASE_AUTH.currentUser;

    if (!currentUser) {
      alert("Please sign in before going live.");
      return;
    }

    setIsStartingLive(true);

    try {
      const token = await currentUser.getIdToken(true);

      const response = await apiClient.post<string | { busId?: string }>(
        "/api/tracking/start-trip",
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const responseData = response.data;
      const busId =
        typeof responseData === "string"
          ? responseData
          : typeof responseData?.busId === "string"
            ? responseData.busId
            : "";

      if (!busId) {
        throw new Error("Could not start trip. Invalid bus ID returned.");
      }

      await Promise.race([
        connectLiveTrackingSocket(token),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "Connection to live tracking timed out. Please try again.",
              ),
            );
          }, LIVE_TRACKING_CONNECT_TIMEOUT_MS);
        }),
      ]);

      router.push({
        pathname: "/sharelocation/screens/golivemapScreen" as any,
        params: {
          routeNumber: selectedRouteNumber,
          busId,
        },
      });
    } catch (error) {
      await disconnectLiveTrackingSocket().catch(() => {
        // no-op cleanup when connection attempt fails
      });

      if (error instanceof AxiosError) {
        const message =
          error.response?.data?.message ??
          "Unable to start trip. Please try again.";
        alert(message);
      } else {
        alert(error instanceof Error ? error.message : "Failed to go live.");
      }
    } finally {
      setIsStartingLive(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Feather name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Go Live</Text>
            <Text style={styles.headerSubtitle}>select your bus route</Text>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Benefit Tags */}
          <BenefitCard />

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.searchTitle}>Which route are you on?</Text>
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={18} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search route number or route"
                value={searchQuery}
                onFocus={() => setShowSearchResults(true)}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowSearchResults(true);
                }}
                placeholderTextColor="#94a3b8"
                returnKeyType="search"
              />
            </View>

            {/* Search Results */}
            {showSearchResults && routeSuggestions.length > 0 && (
              <View style={styles.searchResultsContainer}>
                {routeSuggestions.map((route) => (
                  <TouchableOpacity
                    key={route.id}
                    onPress={() => handleSelectSuggestion(route)}
                    style={styles.searchResultItem}
                  >
                    <View style={styles.routeNumberBadge}>
                      <Text style={styles.routeNumberBadgeText}>
                        {route.routeNumber}
                      </Text>
                    </View>
                    <Text style={styles.searchResultText}>
                      {route.routeName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {isRouteCatalogLoading ? (
              <Text style={styles.searchInfoLabel}>
                Loading route suggestions...
              </Text>
            ) : null}

            {routeCatalogError ? (
              <Text style={styles.searchErrorLabel}>{routeCatalogError}</Text>
            ) : null}
          </View>

          {/* Popular Routes Section */}
          <View style={styles.popularRoutesSection}>
            <Text style={styles.sectionTitle}>POPULAR ROUTES</Text>
            <View style={styles.routeGrid}>
              {popularRoutes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  onPress={() => handleSelectPopularRoute(route)}
                  style={styles.routeCardContainer}
                >
                  <View
                    style={[
                      styles.routeCard,
                      selectedRoute?.id === route.id &&
                        styles.routeCardSelected,
                    ]}
                  >
                    <Text style={styles.routeNumber}>{route.number}</Text>
                    <Text style={styles.routeCount}>
                      {route.startLocation} -
                    </Text>
                    <Text style={styles.routeCount}>{route.endLocation}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Banner */}
          <InfoBanner />
        </ScrollView>

        {/* Go Live Button */}
        <View style={styles.goLiveContainer}>
          <TouchableOpacity
            onPress={handleGoLive}
            disabled={!selectedRouteNumber || isStartingLive}
            style={[
              styles.goLiveButton,
              (!selectedRouteNumber || isStartingLive) &&
                styles.goLiveButtonDisabled,
            ]}
          >
            {isStartingLive ? (
              <>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text
                  style={[
                    styles.goLiveButtonText,
                    styles.goLiveButtonTextDisabled,
                  ]}
                >
                  Starting...
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="wifi" size={18} color="#ffffff" />
                <Text
                  style={[
                    styles.goLiveButtonText,
                    !selectedRouteNumber && styles.goLiveButtonTextDisabled,
                  ]}
                >
                  Go Live
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Navigation */}
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}
