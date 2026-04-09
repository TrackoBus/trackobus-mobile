import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface BenefitTag {
  label: string;
  icon: string;
  color: string;
  backgroundColor: string;
  tagStyle: any;
}

interface BenefitCardProps {
  benefitTags?: BenefitTag[];
}

const styles = StyleSheet.create({
  benefitTagsContainer: {
    marginBottom: 32,
    paddingTop: 16,
    paddingBottom: 1,
  },
  benefitTagsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  benefitTag: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTagGreen: {
    borderColor: "#D4F1E4",
    backgroundColor: "#f0fdf4",
  },
  benefitTagBlue: {
    borderColor: "#E3F0FF",
    backgroundColor: "#f0f4ff",
  },
  benefitTagOrange: {
    borderColor: "#FFE8D6",
    backgroundColor: "#fff7f0",
  },
  benefitTagIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitTagLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});

const defaultBenefitTags = [
  {
    label: "Earn Points",
    icon: "medal",
    color: "#22C55E",
    backgroundColor: "#E3F0E8",
    tagStyle: styles.benefitTagGreen,
  },
  {
    label: "Help Others",
    icon: "heart",
    color: "#0066FF",
    backgroundColor: "#E3F0FF",
    tagStyle: styles.benefitTagBlue,
  },
  {
    label: "Live Updates",
    icon: "wifi",
    color: "#EF4444",
    backgroundColor: "#FFDDDD",
    tagStyle: styles.benefitTagOrange,
  },
];

export default function BenefitCard({
  benefitTags = defaultBenefitTags,
}: BenefitCardProps) {
  return (
    <View style={styles.benefitTagsContainer}>
      <View style={styles.benefitTagsRow}>
        {benefitTags.map((tag) => (
          <View key={tag.label} style={[styles.benefitTag, tag.tagStyle]}>
            <View
              style={[
                styles.benefitTagIcon,
                { backgroundColor: tag.backgroundColor },
              ]}
            >
              <MaterialCommunityIcons
                name={tag.icon as any}
                size={20}
                color={tag.color}
              />
            </View>
            <Text style={[styles.benefitTagLabel, { color: tag.color }]}>
              {tag.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
