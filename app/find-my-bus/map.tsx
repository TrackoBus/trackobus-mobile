import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
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
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationError, setLocationError] = useState<string>("");

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

          if (mapRef.current) {
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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.mapCard}>
        <Pressable style={styles.backRow} onPress={() => router.push("/screens/home")}>
          <MaterialIcons name="arrow-left" size={18} color="#5e6f66" />
          <Text style={styles.backText}>Back to Home</Text>
        </Pressable>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="#3f3f3f" />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter route number (eg. 138)"
            placeholderTextColor="#707070"
          />
        </View>

        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === "android" || Platform.OS === "ios" ? PROVIDER_GOOGLE : undefined}
            initialRegion={INITIAL_REGION}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}
          />

          {locationError ? <Text style={styles.errorBadge}>{locationError}</Text> : null}

          <View style={styles.leftButton}>
            <MaterialCommunityIcons name="account" size={22} color="#121212" />
          </View>

          <Pressable style={styles.rightButton} onPress={recenterToCurrentLocation}>
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" />
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
    marginBottom: 12,
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
