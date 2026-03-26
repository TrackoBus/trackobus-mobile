import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1f1f1f",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  headerBrand: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999999",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    padding: 25,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardBlue: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: 1,
  },
  cardGreen: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBlue: {
    backgroundColor: "#E3F0FF",
  },
  iconGreen: {
    backgroundColor: "#D4F1E4",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  cardDescription: {
    fontSize: 15,
    color: "#666666",
    marginTop: 6,
    lineHeight: 18,
  },
  tagContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
  },
  tagBlue: {
    borderColor: "#0066FF",
  },
  tagGreen: {
    borderColor: "#27AE60",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#000000",
  },
  tagTextBlue: {
    color: "#0066FF",
  },
  tagTextGreen: {
    color: "#27AE60",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    paddingVertical: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    gap: 16,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statNumberBlue: {
    color: "#0066FF",
  },
  statNumberOrange: {
    color: "#FF9800",
  },
  statNumberGreen: {
    color: "#27AE60",
  },
  statLabel: {
    fontSize: 12,
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
    color: "#b5b5b5",
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

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="bus" size={28} color="#0066FF" />
          <Text style={styles.brandName}>TrackoBus</Text>
        </View>

        {/* Main Content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            {/* Welcome Text */}
            <Text style={styles.welcomeText}>
              What would you like to do today?
            </Text>

            {/* Find My Bus Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/find-my-bus/map")}
              style={[styles.card, styles.cardBlue]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, styles.iconBlue]}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={24}
                    color="#0066FF"
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Find My Bus</Text>
                  <Text style={styles.cardDescription}>
                    Search for bus routes and track buses in real-time on the
                    map
                  </Text>
                </View>
              </View>

              {/* Tags */}
              <View style={styles.tagContainer}>
                <View style={[styles.tag, styles.tagBlue]}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={16}
                    color="#0066FF"
                  />
                  <Text style={[styles.tagText, styles.tagTextBlue]}>
                    LIVE TRACKING
                  </Text>
                </View>
                <View style={[styles.tag, styles.tagBlue]}>
                  <MaterialCommunityIcons
                    name="routes"
                    size={16}
                    color="#0066FF"
                  />
                  <Text style={[styles.tagText, styles.tagTextBlue]}>
                    ROUTE INFO
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Share My Location Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.card, styles.cardGreen]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, styles.iconGreen]}>
                  <MaterialCommunityIcons
                    name="wifi"
                    size={24}
                    color="#27AE60"
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Share My Location</Text>
                  <Text style={styles.cardDescription}>
                    Go live and help fellow commuters track the bus you're on
                  </Text>
                </View>
              </View>

              {/* Tags */}
              <View style={styles.tagContainer}>
                <View style={[styles.tag, styles.tagGreen]}>
                  <Feather name="award" size={16} color="#27AE60" />
                  <Text style={[styles.tagText, styles.tagTextGreen]}>
                    EARN POINTS
                  </Text>
                </View>
                <View style={[styles.tag, styles.tagGreen]}>
                  <MaterialCommunityIcons
                    name="account-multiple"
                    size={16}
                    color="#27AE60"
                  />
                  <Text style={[styles.tagText, styles.tagTextGreen]}>
                    HELP OTHERS
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Stats Section */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, styles.statNumberBlue]}>
                  24
                </Text>
                <Text style={styles.statLabel}>Live Buses</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, styles.statNumberOrange]}>
                  156
                </Text>
                <Text style={styles.statLabel}>Active Shares</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, styles.statNumberGreen]}>
                  1.2K
                </Text>
                <Text style={styles.statLabel}>Riders Today</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons name="home" size={24} color="#0066FF" />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons
              name="star-outline"
              size={24}
              color="#b5b5b5"
            />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>
              Favorites
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons
              name="account-outline"
              size={24}
              color="#b5b5b5"
            />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
