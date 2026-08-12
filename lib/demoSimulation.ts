import type { RoutePathPoint } from "@/constants/types";

export interface DemoPresetLocation {
  id: "haputale" | "bandarawela" | "kumbalwela";
  name: string;
  latitude: number;
  longitude: number;
}

export const DEMO_PRESETS: Record<"haputale" | "bandarawela" | "kumbalwela", DemoPresetLocation> = {
  haputale: {
    id: "haputale",
    name: "Haputale",
    latitude: 6.769005555512597,
    longitude: 80.96005843801424,
  },
  bandarawela: {
    id: "bandarawela",
    name: "Bandarawela",
    latitude: 6.829789809973427,
    longitude: 80.98813537506935,
  },
  kumbalwela: {
    id: "kumbalwela",
    name: "Kumbalwela",
    latitude: 6.874403908842685,
    longitude: 81.03157149558368,
  },
};

/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Finds index of point in path closest to target coordinate
 */
export function findClosestPathIndex(
  path: RoutePathPoint[],
  target: { latitude: number; longitude: number }
): number {
  if (!path || path.length === 0) return 0;

  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < path.length; i++) {
    const dist = calculateHaversineDistance(
      path[i].latitude,
      path[i].longitude,
      target.latitude,
      target.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}
