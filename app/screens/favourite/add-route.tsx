import BottomNav from "@/components/BottomNav";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface RouteCard {
  number: string;
  from: string;
  to: string;
}

const popularRoutes: RouteCard[] = [
  { number: "138", from: "Pettah", to: "Kadawatha" },
  { number: "176", from: "Colombo", to: "Panadura" },
  { number: "120", from: "Kadawatha", to: "Malabe" },
  { number: "177", from: "Pettah", to: "Nugegoda" },
];

export default function AddRouteScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RouteCard | null>(null);

  const handleRouteSelect = (route: RouteCard) => {
    setSelectedRoute(route);
  };

  const handleAddToFavorites = () => {
    if (selectedRoute) {
      // Handle adding to favorites
      router.back();
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fafafa" />

      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111" }}>
              Add Route
            </Text>
            <Text style={{ fontSize: 14, color: "#999", marginTop: 2 }}>
              select a route to add to your favorites
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: "#e5e7eb",
            marginHorizontal: 0,
            marginVertical: 12,
          }}
        />

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 20,
          }}
        >
          {/* Search Section */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={20} color="#999" />
              <TextInput
                placeholder="Search by number or destination..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontSize: 14,
                  color: "#333",
                }}
              />
            </View>
          </View>

          {/* Popular Routes Section */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#666",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Popular Routes:
            </Text>

            {/* Routes Grid */}
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", gap: 14 }}>
                {popularRoutes.slice(0, 2).map((route) => (
                  <TouchableOpacity
                    key={route.number}
                    onPress={() => handleRouteSelect(route)}
                    style={{
                      flex: 1,
                      backgroundColor:
                        selectedRoute?.number === route.number
                          ? "#eef6ff"
                          : "#fff",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor:
                        selectedRoute?.number === route.number
                          ? "#0066FF"
                          : "#e5e7eb",
                      padding: 28,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "700",
                        color: "#0066FF",
                        marginBottom: 10,
                      }}
                    >
                      {route.number}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#666",
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      {route.from} - {route.to}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 14 }}>
                {popularRoutes.slice(2, 4).map((route) => (
                  <TouchableOpacity
                    key={route.number}
                    onPress={() => handleRouteSelect(route)}
                    style={{
                      flex: 1,
                      backgroundColor:
                        selectedRoute?.number === route.number
                          ? "#eef6ff"
                          : "#fff",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor:
                        selectedRoute?.number === route.number
                          ? "#0066FF"
                          : "#e5e7eb",
                      padding: 28,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "700",
                        color: "#0066FF",
                        marginBottom: 10,
                      }}
                    >
                      {route.number}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#666",
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      {route.from} - {route.to}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Add to Favorites Button */}
          <TouchableOpacity
            onPress={handleAddToFavorites}
            disabled={!selectedRoute}
            style={{
              backgroundColor: selectedRoute ? "#0066FF" : "#f0f0f0",
              borderRadius: 10,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
              borderWidth: 1,
              borderColor: selectedRoute ? "#0066FF" : "#e5e7eb",
              opacity: selectedRoute ? 1 : 0.5,
            }}
          >
            <MaterialCommunityIcons
              name={selectedRoute ? "star" : "star-outline"}
              size={20}
              color={selectedRoute ? "#fff" : "#999"}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: selectedRoute ? "#fff" : "#999",
              }}
            >
              Add to Favorites
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <BottomNav />
    </SafeAreaView>
  );
}
