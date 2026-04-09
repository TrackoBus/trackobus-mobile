import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Badge = {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  highlighted?: boolean;
};

type Activity = {
  id: string;
  route: string;
  time: string;
  points: string;
};

const badges: Badge[] = [
  { id: "first-trip", icon: "star", label: "First", value: "Trip" },
  { id: "ten-hours", icon: "clock-outline", label: "10", value: "Hours" },
  {
    id: "community-hero",
    icon: "run",
    label: "Community",
    value: "Hero",
    highlighted: true,
  },
  { id: "hundred-trips", icon: "send-outline", label: "100", value: "Trips" },
];

const recentActivities: Activity[] = [
  { id: "a1", route: "Route 138", time: "Today, 8:30 AM", points: "+25" },
  { id: "a2", route: "Route 176", time: "Yesterday, 5:45 PM", points: "+30" },
  { id: "a3", route: "Route 138", time: "Oct 7, 7:15 PM", points: "+25" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const totalPoints = 1250;
  const nextLevelTarget = 1500;
  const progress = useMemo(() => totalPoints / nextLevelTarget, [totalPoints]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>Profile</Text>
              <View style={styles.headerControls}>
                <View style={styles.toggleWrap}>
                  <View style={styles.toggleKnob} />
                </View>
                <Ionicons name="sparkles-outline" size={18} color="#E3EEFF" />
              </View>
            </View>

            <View style={styles.userRow}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={26} color="#B8D4FF" />
              </View>
              <View>
                <Text style={styles.userName}>Dulaa Malshan</Text>
                <Text style={styles.userRole}>Community Helper</Text>
                <View style={styles.levelPill}>
                  <Ionicons name="flash" size={11} color="#FFC857" />
                  <Text style={styles.levelText}>Level 7</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.contentWrap}>
            <View style={styles.pointsCard}>
              <View style={styles.pointsTopRow}>
                <View>
                  <Text style={styles.mutedLabel}>Total Points</Text>
                  <Text style={styles.pointsValue}>1250</Text>
                </View>
                <View style={styles.flagIconCircle}>
                  <Ionicons name="flag-outline" size={20} color="#3A89F8" />
                </View>
              </View>

              <View style={styles.progressMetaRow}>
                <Text style={styles.mutedLabel}>Progress to Level 8</Text>
                <Text style={styles.progressValueText}>1250/1500</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.nextLevelHint}>250 points to next level</Text>
            </View>

            <TouchableOpacity activeOpacity={0.88} style={styles.redeemCard}>
              <View style={styles.redeemTopRow}>
                <View style={styles.coinCircle}>
                  <MaterialCommunityIcons name="cash" size={14} color="#FFC857" />
                </View>
                <View>
                  <Text style={styles.redeemTitle}>Redeem Points</Text>
                  <Text style={styles.redeemSubtitle}>Get mobile reloads, cash & more</Text>
                </View>
              </View>
              <View style={styles.redeemBottomRow}>
                <Text style={styles.redeemMuted}>Available rewards</Text>
                <Text style={styles.redeemPoints}>1250 pts</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Badges Earned</Text>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.sectionAction}>View all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.badgesRow}>
              {badges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    badge.highlighted ? styles.badgeCardHighlighted : null,
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIconWrap,
                      badge.highlighted ? styles.badgeIconWrapHighlighted : null,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={badge.icon}
                      size={15}
                      color={badge.highlighted ? "#0DA65A" : "#3A89F8"}
                    />
                  </View>
                  <Text style={styles.badgeLine}>{badge.label}</Text>
                  <Text style={styles.badgeLine}>{badge.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.sectionAction}>View all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activityCard}>
              {recentActivities.map((activity, index) => (
                <View
                  key={activity.id}
                  style={[
                    styles.activityRow,
                    index !== recentActivities.length - 1 ? styles.activityRowDivider : null,
                  ]}
                >
                  <View style={styles.activityRouteCircle}>
                    <Text style={styles.activityRouteNumber}>{activity.route.split(" ")[1]}</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityRouteText}>{activity.route}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                  <Text style={styles.activityPoints}>{activity.points}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionListCard}>
              <TouchableOpacity activeOpacity={0.8} style={styles.actionRow}>
                <Feather name="settings" size={15} color="#2E2E2E" />
                <Text style={styles.actionText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity activeOpacity={0.8} style={styles.actionRow}>
                <Ionicons name="log-out-outline" size={16} color="#F44A4A" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.replace("/screens/home" as any)}
          >
            <Ionicons name="home-outline" size={22} color="#7C7C7C" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.replace("/screens/favorites" as any)}
          >
            <Ionicons name="star-outline" size={22} color="#7C7C7C" />
            <Text style={styles.navLabel}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.8}>
            <Ionicons name="person-circle" size={22} color="#2679FF" />
            <Text style={styles.navLabelActive}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#DCDDE1",
  },
  container: {
    flex: 1,
    backgroundColor: "#DCDDE1",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 18,
  },
  header: {
    backgroundColor: "#2F8FF9",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 74,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerTitle: {
    color: "#F4F9FF",
    fontSize: 16,
    fontWeight: "500",
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleWrap: {
    width: 34,
    height: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.38)",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F6FBFF",
    alignSelf: "flex-start",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.6,
    borderColor: "#95C4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  userRole: {
    color: "#DCEBFF",
    fontSize: 12,
    marginTop: 2,
  },
  levelPill: {
    marginTop: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(24, 94, 198, 0.55)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelText: {
    color: "#FFF6DA",
    fontSize: 10,
    fontWeight: "700",
  },
  contentWrap: {
    marginTop: -45,
    paddingHorizontal: 14,
  },
  pointsCard: {
    backgroundColor: "#F9FAFC",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pointsTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mutedLabel: {
    fontSize: 11,
    color: "#7D8595",
  },
  pointsValue: {
    marginTop: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#2178FA",
  },
  flagIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E6EEF9",
    alignItems: "center",
    justifyContent: "center",
  },
  progressMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressValueText: {
    color: "#2C2D30",
    fontSize: 10,
    fontWeight: "700",
  },
  progressTrack: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D5DDE8",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#3188FF",
  },
  nextLevelHint: {
    marginTop: 7,
    color: "#9CA4B2",
    fontSize: 10,
  },
  redeemCard: {
    marginTop: 14,
    backgroundColor: "#FF9807",
    borderRadius: 13,
    padding: 14,
  },
  redeemTopRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  coinCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF0D5",
    alignItems: "center",
    justifyContent: "center",
  },
  redeemTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  redeemSubtitle: {
    color: "#FFEDCF",
    fontSize: 11,
    marginTop: 1,
  },
  redeemBottomRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#FFAF3E",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  redeemMuted: {
    color: "#FFE0B3",
    fontSize: 11,
  },
  redeemPoints: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionHeadRow: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#2A2A2B",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionAction: {
    color: "#3B83F8",
    fontSize: 12,
    fontWeight: "600",
  },
  badgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  badgeCard: {
    backgroundColor: "#FBFBFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4A95FF",
    width: "23.5%",
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 88,
  },
  badgeCardHighlighted: {
    borderColor: "#2DDA7F",
  },
  badgeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  badgeIconWrapHighlighted: {
    backgroundColor: "#E5FCEC",
  },
  badgeLine: {
    color: "#3D3D3D",
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  activityCard: {
    borderRadius: 12,
    backgroundColor: "#F8F8F9",
    borderWidth: 1,
    borderColor: "#D8D9DE",
    overflow: "hidden",
  },
  activityRow: {
    paddingHorizontal: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activityRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E1E5",
  },
  activityRouteCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DEEAFD",
    alignItems: "center",
    justifyContent: "center",
  },
  activityRouteNumber: {
    color: "#2B7FF8",
    fontWeight: "700",
    fontSize: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityRouteText: {
    color: "#2B2B2B",
    fontSize: 13,
    fontWeight: "600",
  },
  activityTime: {
    color: "#8A8A8F",
    fontSize: 10,
    marginTop: 1,
  },
  activityPoints: {
    color: "#27B35C",
    fontSize: 17,
    fontWeight: "700",
  },
  actionListCard: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: "#F8F8F9",
    borderWidth: 1,
    borderColor: "#D5D5D7",
    overflow: "hidden",
  },
  actionRow: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E1",
  },
  actionText: {
    color: "#2D2D2D",
    fontSize: 14,
    fontWeight: "500",
  },
  logoutText: {
    color: "#EF3E3E",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomNav: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: "#CFCFD3",
    backgroundColor: "#ECECEF",
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
    color: "#818185",
    fontSize: 11,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#2679FF",
    fontSize: 11,
    fontWeight: "700",
  },
});
