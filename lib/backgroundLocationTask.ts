import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectLiveTrackingSocket, getLiveTrackingSocket } from "@/lib/liveTrackingSocket";

export const BACKGROUND_LOCATION_TASK = "background-bus-location-task";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[Background Location Task] error:", error);
    return;
  }
  if (!data) return;

  try {
    const isActive = await AsyncStorage.getItem("background_sharing_active");
    if (isActive !== "true") {
      return;
    }

    const routeNumber = await AsyncStorage.getItem("background_route_number");
    const busId = await AsyncStorage.getItem("background_bus_id");
    if (!routeNumber || !busId) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const location = locations[0];
    const { latitude, longitude } = location.coords;

    let activeClient = getLiveTrackingSocket();
    if (!activeClient?.connected) {
      activeClient = await connectLiveTrackingSocket("");
    }

    if (activeClient?.connected) {
      activeClient.publish({
        destination: "/app/ping",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          routeNumber,
          busId,
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
          primary: true,
          offline: false,
        }),
      });
      console.log(`[Background Location Task] Sent ping: ${latitude}, ${longitude}`);
    } else {
      console.log("[Background Location Task] Socket not connected, could not send ping");
    }
  } catch (err) {
    console.error("[Background Location Task] Error in background ping:", err);
  }
});
