import { FIREBASE_AUTH } from "@/firebaseConfig";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
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

type Tab = "all" | "mobile" | "cash" | "vouchers";

type Reward = {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  category: Tab;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  badge?: string;
  isLocked?: boolean;
  isPopular?: boolean;
};

const REWARDS: Reward[] = [
  {
    id: "dialog-reload-1",
    title: "Dialog Reload",
    description: "Rs. 500 Mobile Reload",
    pointsRequired: 500,
    category: "mobile",
    icon: "phone-outline",
    badge: "Popular",
    isPopular: true,
  },
  {
    id: "cash-voucher-1",
    title: "Cash Voucher",
    description: "Rs. 1000 Cash Voucher",
    pointsRequired: 1000,
    category: "cash",
    icon: "cash",
    badge: "Popular",
    isPopular: true,
  },
  {
    id: "dialog-reload-2",
    title: "Dialog Reload",
    description: "Rs. 200 Mobile Reload",
    pointsRequired: 200,
    category: "mobile",
    icon: "phone-outline",
    badge: "Popular",
  },
  {
    id: "mobitel-reload",
    title: "Mobitel Reload",
    description: "Rs. 300 Mobile Reload",
    pointsRequired: 300,
    category: "mobile",
    icon: "phone-outline",
    isLocked: false,
  },
  {
    id: "food-voucher",
    title: "Food Voucher",
    description: "Rs. 500 Food Voucher",
    pointsRequired: 500,
    category: "vouchers",
    icon: "food-outline",
    isLocked: true,
  },
  {
    id: "dialog-reload-3",
    title: "Dialog Reload",
    description: "Rs. 100 Mobile Reload",
    pointsRequired: 100,
    category: "mobile",
    icon: "phone-outline",
  },
];

export default function RedeemScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(FIREBASE_AUTH.currentUser);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(FIREBASE_AUTH, setUser);
    return unsub;
  }, []);

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
          setCurrentPoints(1250);
        }
      } catch {
        if (isActive) {
          setCurrentPoints(1250);
        }
      }
    };

    loadStoredPoints();

    return () => {
      isActive = false;
    };
  }, [pointStorageKey]);

  const filteredRewards = useMemo(() => {
    if (activeTab === "all") {
      return REWARDS;
    }
    return REWARDS.filter((reward) => reward.category === activeTab);
  }, [activeTab]);

  const popularRewards = REWARDS.filter((r) => r.isPopular);

  const handleRedeem = (reward: Reward) => {
    if (reward.isLocked) {
      Alert.alert("Unavailable", "This reward is currently unavailable.");
      return;
    }

    if (currentPoints < reward.pointsRequired) {
      Alert.alert(
        "Insufficient Points",
        `You need ${reward.pointsRequired} points but only have ${currentPoints}.`,
      );
      return;
    }

    Alert.alert(
      "Confirm Redemption",
      `Redeem ${reward.title} for ${reward.pointsRequired} points?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          onPress: async () => {
            const newPoints = currentPoints - reward.pointsRequired;
            setCurrentPoints(newPoints);
            await AsyncStorage.setItem(pointStorageKey, String(newPoints)).catch(
              () => {},
            );
            Alert.alert(
              "Success!",
              `You have redeemed ${reward.title}. You have ${newPoints} points remaining.`,
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#2d89ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Redeem Points</Text>
          <View style={styles.placeholderButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Available Points</Text>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsValue}>{currentPoints}</Text>
              <MaterialCommunityIcons
                name="star"
                size={32}
                color="#7c3aed"
                style={styles.starIcon}
              />
            </View>
          </View>

          <View style={styles.tabsContainer}>
            {(["all", "mobile", "cash", "vouchers"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <MaterialCommunityIcons
                  name={
                    tab === "all"
                      ? "view-list"
                      : tab === "mobile"
                        ? "phone"
                        : tab === "cash"
                          ? "cash"
                          : "ticket-percent"
                  }
                  size={16}
                  color={activeTab === tab ? "#2d89ff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab && styles.tabLabelActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "all" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Rewards</Text>
              </View>

              <View style={styles.popularRewardsGrid}>
                {popularRewards.map((reward) => (
                  <View key={reward.id} style={styles.popularCard}>
                    <View
                      style={[
                        styles.popularIconBox,
                        { backgroundColor: "#e0e7ff" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={reward.icon}
                        size={32}
                        color="#6366f1"
                      />
                    </View>
                    <Text style={styles.popularTitle}>{reward.title}</Text>
                    <Text style={styles.popularDesc}>{reward.description}</Text>
                    <View style={styles.redeemFooter}>
                      <Text style={styles.redeemPoints}>⭐ {reward.pointsRequired}</Text>
                      <Text style={styles.availableLabel}>Available</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.redeemButton}
                      activeOpacity={0.8}
                      onPress={() => handleRedeem(reward)}
                    >
                      <Text style={styles.redeemButtonText}>Redeem</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Rewards</Text>
              </View>
            </>
          )}

          {filteredRewards.map((reward) => (
            <View
              key={reward.id}
              style={[
                styles.rewardItem,
                reward.isLocked && styles.rewardItemLocked,
              ]}
            >
              <View style={styles.rewardLeftBlock}>
                <View
                  style={[
                    styles.rewardIcon,
                    reward.isLocked && styles.rewardIconLocked,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={reward.icon}
                    size={24}
                    color={reward.isLocked ? "#d1d5db" : "#2d89ff"}
                  />
                </View>
                <View style={styles.rewardInfo}>
                  <View style={styles.rewardTitleRow}>
                    <Text
                      style={[
                        styles.rewardTitle,
                        reward.isLocked && styles.rewardTitleLocked,
                      ]}
                    >
                      {reward.title}
                    </Text>
                    {reward.badge && (
                      <Text style={styles.badgeLabel}>{reward.badge}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.rewardDesc,
                      reward.isLocked && styles.rewardDescLocked,
                    ]}
                  >
                    {reward.description}
                  </Text>
                  <View style={styles.pointsReqRow}>
                    <Text style={styles.pointsReqLabel}>⭐ {reward.pointsRequired}</Text>
                    <Text
                      style={[
                        styles.pointsStatus,
                        currentPoints >= reward.pointsRequired &&
                          styles.pointsStatusAvailable,
                      ]}
                    >
                      {currentPoints >= reward.pointsRequired
                        ? "Available"
                        : "Locked"}
                    </Text>
                  </View>
                </View>
              </View>

              {!reward.isLocked ? (
                <TouchableOpacity
                  style={styles.itemRedeemButton}
                  activeOpacity={0.8}
                  onPress={() => handleRedeem(reward)}
                >
                  <Text style={styles.itemRedeemButtonText}>Redeem</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.itemLockedButton}>
                  <Text style={styles.itemLockedButtonText}>Locked</Text>
                </View>
              )}
            </View>
          ))}

          <View style={styles.tipCard}>
            <View style={styles.tipContent}>
              <MaterialCommunityIcons
                name="lightbulb-outline"
                size={18}
                color="#7c3aed"
              />
              <Text style={styles.tipText}>
                Tip: Keep tracking buses to earn more points and unlock amazing rewards!
              </Text>
            </View>
          </View>
        </ScrollView>
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
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  placeholderButton: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
  },
  pointsCard: {
    backgroundColor: "#2d89ff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  pointsLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginBottom: 8,
  },
  pointsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsValue: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "700",
  },
  starIcon: {
    marginRight: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tabActive: {
    backgroundColor: "#e0e7ff",
    borderColor: "#2d89ff",
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabLabelActive: {
    color: "#2d89ff",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  popularRewardsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  popularCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    alignItems: "center",
  },
  popularIconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  popularDesc: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  redeemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
  },
  redeemPoints: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2d89ff",
  },
  availableLabel: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },
  redeemButton: {
    backgroundColor: "#2d89ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  redeemButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  rewardItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rewardItemLocked: {
    opacity: 0.6,
  },
  rewardLeftBlock: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardIconLocked: {
    backgroundColor: "#f3f4f6",
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  rewardTitleLocked: {
    color: "#9ca3af",
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  rewardDescLocked: {
    color: "#d1d5db",
  },
  pointsReqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointsReqLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2d89ff",
  },
  pointsStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
  },
  pointsStatusAvailable: {
    color: "#10b981",
  },
  itemRedeemButton: {
    backgroundColor: "#2d89ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  itemRedeemButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  itemLockedButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  itemLockedButtonText: {
    color: "#9ca3af",
    fontWeight: "700",
    fontSize: 12,
  },
  tipCard: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#7c3aed",
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  tipText: {
    fontSize: 12,
    color: "#7c3aed",
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
});
