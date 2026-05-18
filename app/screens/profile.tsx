import BottomNav from "@/components/BottomNav";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Badge = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent: string;
  bg: string;
  unlocked: boolean;
};

type Activity = {
  id: string;
  route: string;
  timeLabel: string;
  points: number;
};

type SmartProfile = {
  fullName: string;
  roleLabel: string;
  level: number;
  totalPoints: number;
  nextLevelTarget: number;
  monthlyTrips: number;
  ecoScore: number;
  streakDays: number;
  badges: Badge[];
  activities: Activity[];
  memberSince: string;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const displayNameFromUser = (user: User | null) => {
  if (user?.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (user?.email) {
    const localPart = user.email.split("@")[0] ?? "";
    const cleaned = localPart.replace(/[._-]+/g, " ").trim();
    if (cleaned) {
      return toTitleCase(cleaned);
    }
  }

  return "Tracko Rider";
};

const initialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return "TR";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const formatJoinedDate = (creationTime?: string) => {
  if (!creationTime) {
    return "Joined recently";
  }

  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) {
    return "Joined recently";
  }

  return `Member since ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
};

const createSmartProfile = (user: User | null): SmartProfile => {
  const seed = hashString(user?.uid ?? user?.email ?? "trackobus");
  const fullName = displayNameFromUser(user);
  const totalPoints = 900 + (seed % 700);
  const level = Math.max(1, Math.floor(totalPoints / 300));
  const nextLevelTarget = (level + 1) * 300;
  const monthlyTrips = 20 + (seed % 28);
  const ecoScore = 70 + (seed % 27);
  const streakDays = 2 + (seed % 18);

  const routeBase = 100 + (seed % 90);

  return {
    fullName,
    roleLabel: user ? "Community Rider" : "Guest Rider",
    level,
    totalPoints,
    nextLevelTarget,
    monthlyTrips,
    ecoScore,
    streakDays,
    memberSince: formatJoinedDate(user?.metadata.creationTime),
    badges: [
      {
        id: "first-trip",
        label: "First Trip",
        icon: "star-circle-outline",
        accent: "#f08a00",
        bg: "#fff3df",
        unlocked: true,
      },
      {
        id: "time-keeper",
        label: "Time Keeper",
        icon: "clock-check-outline",
        accent: "#1478ff",
        bg: "#eaf3ff",
        unlocked: monthlyTrips > 24,
      },
      {
        id: "eco-hero",
        label: "Eco Hero",
        icon: "leaf-circle-outline",
        accent: "#16a34a",
        bg: "#eaf9ef",
        unlocked: ecoScore > 80,
      },
      {
        id: "explorer",
        label: "Explorer",
        icon: "compass-outline",
        accent: "#6b7280",
        bg: "#f3f4f6",
        unlocked: monthlyTrips > 35,
      },
    ],
    activities: [
      {
        id: "a1",
        route: `Route ${routeBase}`,
        timeLabel: "Today",
        points: 20 + (seed % 10),
      },
      {
        id: "a2",
        route: `Route ${routeBase + 12}`,
        timeLabel: "Yesterday",
        points: 16 + (seed % 14),
      },
      {
        id: "a3",
        route: `Route ${routeBase + 4}`,
        timeLabel: "2 days ago",
        points: 12 + (seed % 13),
      },
    ],
  };
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(FIREBASE_AUTH.currentUser);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(FIREBASE_AUTH, setUser);
    return unsub;
  }, []);

  const profile = useMemo(() => createSmartProfile(user), [user]);
  const pointStorageKey = useMemo(
    () => `trackobus-points-${user?.uid ?? "guest"}`,
    [user?.uid],
  );

  useEffect(() => {
    let isActive = true;

    const loadStoredPoints = async () => {
      try {
        const storedPoints = await AsyncStorage.getItem(pointStorageKey);
        const parsedPoints = storedPoints ? Number(storedPoints) : NaN;

        if (!isActive) {
          return;
        }

        if (Number.isFinite(parsedPoints) && parsedPoints > 0) {
          setCurrentPoints(parsedPoints);
        } else {
          setCurrentPoints(profile.totalPoints);
        }
      } catch {
        if (isActive) {
          setCurrentPoints(profile.totalPoints);
        }
      }
    };

    loadStoredPoints();

    return () => {
      isActive = false;
    };
  }, [pointStorageKey, profile.totalPoints]);

  useEffect(() => {
    setActivities(profile.activities);
  }, [profile.activities]);

  useEffect(() => {
    if (!currentPoints) {
      return;
    }

    AsyncStorage.setItem(pointStorageKey, String(currentPoints)).catch(() => {
      // Ignore persistence issues; UI state still updates.
    });
  }, [currentPoints, pointStorageKey]);

  const currentLevel = Math.max(1, Math.floor(currentPoints / 300));
  const nextLevelTarget = (currentLevel + 1) * 300;

  const pointsLeft = Math.max(nextLevelTarget - currentPoints, 0);
  const progressRatio = Math.min(currentPoints / nextLevelTarget, 1);

  const handleLogTrip = () => {
    const earnedPoints = 20 + ((Date.now() / 1000) % 8);
    const roundedEarnedPoints = Math.floor(earnedPoints);
    const routeNumber = 120 + (Math.floor(Date.now() / 1000) % 60);

    setCurrentPoints((prev) => prev + roundedEarnedPoints);
    setActivities((prev) => [
      {
        id: `live-${Date.now()}`,
        route: `Route ${routeNumber}`,
        timeLabel: "Just now",
        points: roundedEarnedPoints,
      },
      ...prev.slice(0, 2),
    ]);
  };

  const handleRedeemPoints = () => {
    if (currentPoints < 150) {
      Alert.alert("Not enough points", "You need at least 150 points to redeem.");
      return;
    }

    setCurrentPoints((prev) => Math.max(prev - 150, 0));
    Alert.alert("Redeemed", "150 points redeemed successfully.");
  };

  const handleSignOut = async () => {
    try {
      await signOut(FIREBASE_AUTH);
      router.replace("/auth/login");
    } catch {
      Alert.alert("Sign out failed", "Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>Profile</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{user ? "Online" : "Guest"}</Text>
              </View>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>
                  {initialsFromName(profile.fullName)}
                </Text>
              </View>
              <View style={styles.identityBlock}>
                <Text numberOfLines={1} style={styles.userName}>
                  {profile.fullName}
                </Text>
                <Text style={styles.userRole}>{profile.roleLabel}</Text>
                <View style={styles.levelPill}>
                  <MaterialCommunityIcons name="trophy-outline" size={12} color="#ffd54f" />
                  <Text style={styles.levelPillText}>Level {currentLevel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.pointsCard}>
            <View style={styles.pointsHeaderRow}>
              <View>
                <Text style={styles.cardLabel}>Total Points</Text>
                <Text style={styles.pointsValue}>{currentPoints}</Text>
              </View>
              <View style={styles.flagWrap}>
                <Feather name="flag" size={18} color="#4184ff" />
              </View>
            </View>

            <View style={styles.progressInfoRow}>
              <Text style={styles.progressLabel}>Progress to Level {currentLevel + 1}</Text>
              <Text style={styles.progressTarget}>
                {currentPoints}/{nextLevelTarget}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>

            <Text style={styles.remainingText}>{pointsLeft} points to next level</Text>
            <Text style={styles.memberSinceText}>{profile.memberSince}</Text>

            <View style={styles.primaryActionsRow}>
              <TouchableOpacity
                style={styles.primaryActionButton}
                activeOpacity={0.86}
                onPress={handleLogTrip}
              >
                <Feather name="plus-circle" size={16} color="#ffffff" />
                <Text style={styles.primaryActionText}>Add Trip Points</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                activeOpacity={0.86}
                onPress={handleRedeemPoints}
              >
                <Feather name="gift" size={16} color="#1d4ed8" />
                <Text style={styles.secondaryActionText}>Redeem 150</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.snapshotCard}>
            <View style={styles.snapshotTopRow}>
              <View>
                <Text style={styles.rewardsTitle}>Redeem Points</Text>
                <Text style={styles.rewardsSubtitle}>Ticket vouchers and partner offers</Text>
              </View>
              <Text style={styles.rewardsPoints}>{currentPoints} pts</Text>
            </View>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatCard}>
                <Text style={styles.quickStatValue}>{profile.monthlyTrips}</Text>
                <Text style={styles.quickStatLabel}>Trips</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Text style={styles.quickStatValue}>{profile.streakDays}</Text>
                <Text style={styles.quickStatLabel}>Streak</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Text style={styles.quickStatValue}>{profile.ecoScore}%</Text>
                <Text style={styles.quickStatLabel}>Eco</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
          </View>

          <View style={styles.badgesWrap}>
            {profile.badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  {
                    borderColor: badge.unlocked ? badge.accent : "#d1d5db",
                    backgroundColor: badge.unlocked ? badge.bg : "#f9fafb",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={badge.icon}
                  size={18}
                  color={badge.unlocked ? badge.accent : "#9ca3af"}
                />
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          <View style={styles.activityCard}>
            {activities.slice(0, 2).map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={styles.routePill}>
                  <Text style={styles.routePillText}>{item.route.split(" ")[1]}</Text>
                </View>
                <View style={styles.activityInfoBlock}>
                  <Text style={styles.activityRouteText}>{item.route}</Text>
                  <Text style={styles.activityTimeText}>{item.timeLabel}</Text>
                </View>
                <Text style={styles.activityPointsText}>+{item.points}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionCard}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.85}>
              <Feather name="settings" size={17} color="#111827" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {user ? (
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.85}
                onPress={handleSignOut}
              >
                <Feather name="log-out" size={17} color="#ef4444" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.85}
                onPress={() => router.push("/auth/login")}
              >
                <Feather name="log-in" size={17} color="#2563eb" />
                <Text style={styles.loginText}>Login / Signup</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <BottomNav />
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
    backgroundColor: "#ebedf2",
  },
  scrollContent: {
    paddingBottom: 14,
  },
  headerBlock: {
    backgroundColor: "#2d89ff",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: "#eaf2ff",
    fontSize: 12,
    fontWeight: "600",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  identityBlock: {
    flex: 1,
  },
  userName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  userRole: {
    marginTop: 2,
    color: "#d7e7ff",
    fontSize: 13,
    fontWeight: "500",
  },
  levelPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(20,46,97,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelPillText: {
    color: "#fff7d3",
    fontSize: 12,
    fontWeight: "700",
  },
  pointsCard: {
    marginHorizontal: 14,
    marginTop: -8,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "600",
  },
  pointsValue: {
    marginTop: 2,
    color: "#2f70ec",
    fontSize: 24,
    fontWeight: "800",
  },
  flagWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf3ff",
  },
  progressInfoRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    color: "#6b7280",
    fontSize: 12,
  },
  progressTarget: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2f80ff",
  },
  remainingText: {
    marginTop: 6,
    color: "#8b9098",
    fontSize: 12,
  },
  memberSinceText: {
    marginTop: 3,
    color: "#9ca3af",
    fontSize: 12,
  },
  primaryActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  primaryActionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#e8f0ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "700",
  },
  snapshotCard: {
    marginTop: 10,
    marginHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  snapshotTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rewardsTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  rewardsSubtitle: {
    marginTop: 1,
    color: "#6b7280",
    fontSize: 12,
  },
  rewardsPoints: {
    color: "#ff8a00",
    fontSize: 15,
    fontWeight: "800",
  },
  quickStatsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 6,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#f3f7ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    paddingVertical: 8,
  },
  quickStatValue: {
    color: "#101827",
    fontSize: 17,
    fontWeight: "700",
  },
  quickStatLabel: {
    marginTop: 1,
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  badgesWrap: {
    paddingHorizontal: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeCard: {
    width: "48.5%",
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    marginTop: 4,
    color: "#374151",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  activityCard: {
    marginHorizontal: 14,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  routePill: {
    backgroundColor: "#e8f1ff",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    minWidth: 44,
    alignItems: "center",
  },
  routePillText: {
    color: "#246ff4",
    fontWeight: "700",
    fontSize: 12,
  },
  activityInfoBlock: {
    flex: 1,
    marginLeft: 8,
  },
  activityRouteText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  activityTimeText: {
    marginTop: 2,
    color: "#9ca3af",
    fontSize: 12,
  },
  activityPointsText: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "700",
  },
  actionCard: {
    marginTop: 12,
    marginHorizontal: 14,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  actionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "700",
  },
  loginText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "700",
  },
  actionDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 14,
  },
});
