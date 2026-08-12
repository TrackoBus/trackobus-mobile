import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { DEMO_PRESETS, DemoPresetLocation } from "@/lib/demoSimulation";

interface DemoControlPanelProps {
  currentPreset?: string;
  onSelectPreset?: (preset: DemoPresetLocation) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  speed?: number;
  onChangeSpeed?: (speed: number) => void;
  isLocationLocked?: boolean;
  onToggleLocationLock?: () => void;
  onResetSimulation?: () => void;
  title?: string;
}

export default function DemoControlPanel({
  currentPreset,
  onSelectPreset,
  isPlaying = false,
  onTogglePlay,
  speed = 3,
  onChangeSpeed,
  isLocationLocked = false,
  onToggleLocationLock,
  onResetSimulation,
  title = "Route 99 Demo Controller",
}: DemoControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const speeds = [1, 3, 5, 10];

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerTitleRow}
          onPress={() => setIsExpanded((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DEMO MODE</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#94a3b8"
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Controls */}
      {isExpanded && (
        <View style={styles.body}>
          {/* Location Presets */}
          {onSelectPreset && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Jump to Track Stop:</Text>
              <View style={styles.presetGrid}>
                {Object.values(DEMO_PRESETS).map((preset) => {
                  const isSelected = currentPreset === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetButton,
                        isSelected && styles.presetButtonSelected,
                      ]}
                      onPress={() => onSelectPreset(preset)}
                    >
                      <MaterialCommunityIcons
                        name="map-marker-path"
                        size={14}
                        color={isSelected ? "#ffffff" : "#0284c7"}
                      />
                      <Text
                        style={[
                          styles.presetButtonText,
                          isSelected && styles.presetButtonTextSelected,
                        ]}
                      >
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Simulation Play / Pause & Speed */}
          {onTogglePlay && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  isPlaying ? styles.pauseButton : styles.startButton,
                ]}
                onPress={onTogglePlay}
              >
                <Feather
                  name={isPlaying ? "pause" : "play"}
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.playButtonText}>
                  {isPlaying ? "Pause Trip" : "Play Trip"}
                </Text>
              </TouchableOpacity>

              {onChangeSpeed && (
                <View style={styles.speedRow}>
                  {speeds.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.speedPill,
                        speed === s && styles.speedPillActive,
                      ]}
                      onPress={() => onChangeSpeed(s)}
                    >
                      <Text
                        style={[
                          styles.speedText,
                          speed === s && styles.speedTextActive,
                        ]}
                      >
                        {s}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {onResetSimulation && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onResetSimulation}
                >
                  <Feather name="rotate-ccw" size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Device Location Lock Toggle (for Device 2) */}
          {onToggleLocationLock && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.lockButton,
                  isLocationLocked && styles.lockButtonActive,
                ]}
                onPress={onToggleLocationLock}
              >
                <MaterialCommunityIcons
                  name={isLocationLocked ? "map-marker-check" : "map-marker-off"}
                  size={18}
                  color={isLocationLocked ? "#ffffff" : "#0f172a"}
                />
                <Text
                  style={[
                    styles.lockButtonText,
                    isLocationLocked && styles.lockButtonTextActive,
                  ]}
                >
                  {isLocationLocked
                    ? "Device Location: Locked to Bandarawela 📍"
                    : "Lock Device Location to Bandarawela"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    padding: 10,
    gap: 8,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  presetGrid: {
    flexDirection: "row",
    gap: 6,
  },
  presetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  presetButtonSelected: {
    backgroundColor: "#0284c7",
    borderColor: "#38bdf8",
  },
  presetButtonText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
  },
  presetButtonTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: "#16a34a",
  },
  pauseButton: {
    backgroundColor: "#dc2626",
  },
  playButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  speedRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 2,
  },
  speedPill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  speedPillActive: {
    backgroundColor: "#38bdf8",
  },
  speedText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },
  speedTextActive: {
    color: "#0f172a",
  },
  iconButton: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
  },
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  lockButtonActive: {
    backgroundColor: "#16a34a",
  },
  lockButtonText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  lockButtonTextActive: {
    color: "#ffffff",
  },
});
