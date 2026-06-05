import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const styles = StyleSheet.create({
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
    fontSize: 11,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#2276ff",
  },
  navLabelInactive: {
    color: "#b5b5b5",
  },
});

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => {
    return pathname === route || pathname.includes(route);
  };

  return (
    <View style={styles.bottomNav}>
      {/* Home */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/screens/home")}
      >
        <MaterialCommunityIcons
          name="home"
          size={24}
          color={isActive("home") ? "#0066FF" : "#b5b5b5"}
        />
        <Text
          style={[
            styles.navLabel,
            isActive("home") ? styles.navLabelActive : styles.navLabelInactive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Favorites */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/screens/favourite/favorites")}
      >
        <MaterialCommunityIcons
          name="star-outline"
          size={24}
          color={isActive("favorites") ? "#0066FF" : "#b5b5b5"}
        />
        <Text
          style={[
            styles.navLabel,
            isActive("favorites")
              ? styles.navLabelActive
              : styles.navLabelInactive,
          ]}
        >
          Favorites
        </Text>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/screens/profile")}
      >
        <MaterialCommunityIcons
          name="account-outline"
          size={24}
          color={isActive("profile") ? "#0066FF" : "#b5b5b5"}
        />
        <Text
          style={[
            styles.navLabel,
            isActive("profile")
              ? styles.navLabelActive
              : styles.navLabelInactive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}
