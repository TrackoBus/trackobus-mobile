import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Route {
  id: string;
  number: string;
  startLocation: string;
  endLocation: string;
  type: string;
}

interface RouteCardProps {
  route: Route;
  isSelected?: boolean;
}

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  routeLocations: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    lineHeight: 16,
    fontWeight: "500",
  },
});

export default function RouteCard({ route, isSelected }: RouteCardProps) {
  return (
    <View style={[styles.routeCard, isSelected && styles.routeCardSelected]}>
      <Text style={styles.routeNumber}>{route.number}</Text>
      <Text style={styles.routeLocations}>{route.startLocation} -</Text>
      <Text style={styles.routeLocations}>{route.endLocation}</Text>
    </View>
  );
}
