import BottomNav from "@/components/BottomNav";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FavoriteRoute {
  id: string;
  routeNumber: string;
  from: string;
  to: string;
  lastUsed: string;
  liveCount: number;
  duration?: string;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([
    {
      id: "1",
      routeNumber: "138",
      from: "Pettah",
      to: "Kadawatha",
      lastUsed: "Today, 8.30 AM",
      liveCount: 3,
      duration: "Every 10-15 min",
    },
    {
      id: "2",
      routeNumber: "176",
      from: "Colombo",
      to: "Panadura",
      lastUsed: "Yesterday",
      liveCount: 2,
      duration: "Every 20 min",
    },
    {
      id: "3",
      routeNumber: "120",
      from: "Kadawatha",
      to: "Malabe",
      lastUsed: "Oct 7",
      liveCount: 1,
      duration: "Every 15 min",
    },
  ]);

  const removeFavorite = (id: string) => {
    setFavoriteRoutes(favoriteRoutes.filter((route) => route.id !== id));
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#1f1f1f" }}
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1f1f1f" />

      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 10,
          }}
        >
          <View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111" }}>
              Favorites
            </Text>
            <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {favoriteRoutes.length} saved routes
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/screens/favourite/add-route")}
            style={{
              backgroundColor: "#007aff",
              borderRadius: 21,
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: "#e5e7eb",
            marginHorizontal: 16,
            marginVertical: 12,
          }}
        />

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: 10,
            gap: 10,
          }}
        >
          {favoriteRoutes.map((route) => (
            <View
              key={route.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 22,
                borderWidth: 0.8,
                borderColor: "#efefef",
                marginBottom: 6,
              }}
            >
              {/* Card Top */}
              <View style={{ padding: 22, paddingBottom: 18 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  {/* Badge */}
                  <View
                    style={{
                      backgroundColor: "#eef6ff",
                      borderRadius: 16,
                      width: 66,
                      height: 66,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#5ba3ff",
                        fontWeight: "700",
                        fontSize: 20,
                      }}
                    >
                      {route.routeNumber}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "700",
                          color: "#111",
                        }}
                      >
                        Route {route.routeNumber}
                      </Text>
                      <FontAwesome name="star" size={13} color="#fbbf24" />
                    </View>

                    <Text
                      style={{
                        fontSize: 13,
                        color: "#9ca3af",
                        marginBottom: 9,
                      }}
                    >
                      {route.from} - {route.to}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Feather name="clock" size={13} color="#94a3b8" />
                        <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                          {route.duration}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: "#10b981",
                            borderRadius: 4,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#10b981",
                            fontWeight: "600",
                          }}
                        >
                          {route.liveCount} live
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#f5f5f5",
                  marginHorizontal: 22,
                }}
              />

              {/* Footer */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 22,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather name="map-pin" size={13} color="#94a3b8" />
                  <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                    Last used: {route.lastUsed}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeFavorite(route.id)}>
                  <Feather name="trash-2" size={15} color="#ff8888" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Tip Banner */}
          <View
            style={{
              backgroundColor: "#ed9d4d",
              borderRadius: 16,
              padding: 20,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: "500",
                lineHeight: 21,
              }}
            >
              Tip: Tap on any favorite route to see live buses instantly!
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}
