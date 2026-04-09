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
      <StatusBar style="dark" />

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

        <View pointerEvents="none" style={styles.mapTint} />

        <View style={styles.topPanel}>
          <Pressable style={styles.backPill} onPress={() => router.push("/screens/home")}>
            <MaterialIcons name="arrow-back-ios-new" size={14} color="#123524" />
            <Text style={styles.backText}>Back to Home</Text>
          </Pressable>

          <Text style={styles.screenTitle}>Find My Bus</Text>
          <Text style={styles.screenSubtitle}>Track live buses by route number</Text>

          <View style={styles.searchBar}>
            <View style={styles.searchIconWrap}>
              <MaterialIcons name="search" size={18} color="#1f6444" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search route (e.g. 138, 177)"
              placeholderTextColor="#789385"
            />
          </View>
        </View>

        {locationError ? <Text style={styles.errorBadge}>{locationError}</Text> : null}

        <Pressable style={styles.rightButton} onPress={recenterToCurrentLocation}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" />
        </Pressable>

        <View style={styles.floatingBadge}>
          <MaterialCommunityIcons name="map-marker-radius" size={16} color="#1f6444" />
          <Text style={styles.floatingBadgeText}>Live Location</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f8f6",
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 46, 29, 0.08)",
  },
  topPanel: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderWidth: 1,
    borderColor: "#dce8e1",
    ...Platform.select({
      ios: {
        shadowColor: "#112619",
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
  backPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#d8efe2",
    marginBottom: 10,
  },
  backText: {
    color: "#123524",
    fontSize: 13,
    fontWeight: "700",
  },
  screenTitle: {
    color: "#163d2b",
    fontSize: 19,
    fontWeight: "800",
  },
  screenSubtitle: {
    marginTop: 2,
    marginBottom: 10,
    color: "#4f675b",
    fontSize: 12,
    fontWeight: "500",
  },
  searchBar: {
    minHeight: 46,
    backgroundColor: "#ffffff",
    borderRadius: 13,
    paddingLeft: 10,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d8e4dd",
    gap: 10,
  },
  searchIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e8f4ed",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    color: "#173c2b",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBadge: {
    position: "absolute",
    top: 138,
    alignSelf: "center",
    backgroundColor: "rgba(198, 36, 36, 0.9)",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "500",
  },
  rightButton: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1e8b57",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#d9f2e4",
    ...Platform.select({
      ios: {
        shadowColor: "#0f2f20",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  floatingBadge: {
    position: "absolute",
    left: 16,
    bottom: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(250, 255, 252, 0.95)",
    borderWidth: 1,
    borderColor: "#dce8e1",
  },
  floatingBadgeText: {
    color: "#1f6444",
    fontSize: 12,
    fontWeight: "700",
  },
});
