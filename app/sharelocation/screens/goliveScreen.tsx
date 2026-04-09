import BottomNav from "@/components/BottomNav";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    borderColor: "#d0d0d0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#000000",
  },
  searchResultsContainer: {
    marginTop: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    overflow: "hidden",
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomColor: "#e0e0e0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultText: {
    fontWeight: "600",
    color: "#000000",
    fontSize: 14,
  },
  searchResultSubText: {
    fontSize: 12,
    color: "#999999",
    marginTop: 2,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      const results = allRoutes.filter((route) => route.number.includes(text));
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSelectRoute = (route: Route) => {
    setSelectedRoute(route);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleGoLive = () => {
    if (selectedRoute) {
      console.log("Going live with route:", selectedRoute);
      // Navigate to live tracking screen
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
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
        <View style={styles.scrollContent}>
          {/* Benefit Tags */}
          <BenefitCard />

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.searchTitle}>Which route are you on?</Text>
            <View style={styles.searchInputContainer}>
              <Feather name="search" size={16} color="#999999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter route number (eg. 175)"
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#999999"
              />
            </View>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                {searchResults.map((route) => (
                  <TouchableOpacity
                    key={route.id}
                    onPress={() => handleSelectRoute(route)}
                    style={styles.searchResultItem}
                  >
                    <View>
                      <Text style={styles.searchResultText}>
                        Route: {route.number}
                      </Text>
                      <Text style={styles.searchResultSubText}>
                        {route.startLocation} - {route.endLocation}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color="#22C55E"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Popular Routes Section */}
          <View style={styles.popularRoutesSection}>
            <Text style={styles.sectionTitle}>POPULAR ROUTES</Text>
            <View style={styles.routeGrid}>
              {popularRoutes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  onPress={() => handleSelectRoute(route)}
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
        </View>

        {/* Go Live Button */}
        <View style={styles.goLiveContainer}>
          <TouchableOpacity
            onPress={handleGoLive}
            disabled={!selectedRoute}
            style={[
              styles.goLiveButton,
              !selectedRoute && styles.goLiveButtonDisabled,
            ]}
          >
            <MaterialCommunityIcons name="wifi" size={18} color="#ffffff" />
            <Text
              style={[
                styles.goLiveButtonText,
                !selectedRoute && styles.goLiveButtonTextDisabled,
              ]}
            >
              Go Live
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Navigation */}
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}
