import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoritesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved routes and stops will appear here.</Text>
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.replace("/screens/home" as any)}
          >
            <MaterialCommunityIcons name="home-outline" size={24} color="#b5b5b5" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.replace("/screens/favorites" as any)}
          >
            <MaterialCommunityIcons name="star" size={24} color="#2276ff" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.replace("/screens/profile" as any)}
          >
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={24}
              color="#b5b5b5"
            />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1f1f1f",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    color: "#000000",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
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
