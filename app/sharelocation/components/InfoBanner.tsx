import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  infoBanner: {
    backgroundColor: "#eaf2ff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  infoBannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoBannerIconWrap: {
    width: 18,
    alignItems: "center",
    marginRight: 6,
  },
  infoBannerPrimaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#5b6c8f",
    lineHeight: 18,
  },
  infoBannerSecondaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 25,
  },

  infoBannerSecondaryText: {
    flex: 1,
    fontSize: 12,
    color: "#5b6c8f",
    lineHeight: 18,
  },
});

export default function InfoBanner() {
  return (
    <View style={styles.infoBanner}>
      <View style={styles.infoBannerTopRow}>
        <View style={styles.infoBannerIconWrap}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={14}
            color="#f5b301"
          />
        </View>
        <Text style={styles.infoBannerPrimaryText}>
          Your exact location is never shared.
        </Text>
      </View>

      <View style={styles.infoBannerSecondaryRow}>
        <Text style={styles.infoBannerSecondaryText}>
          We only show your bus on the route to help other commuters.
        </Text>
      </View>
    </View>
  );
}
