import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

/* ── Pro feature perks list ──────────────────────────────────────── */
const PRO_PERKS = [
  { icon: "🎬", label: "4K Ultra HD Export" },
  { icon: "⚡", label: "120fps Slow-Motion Export" },
  { icon: "✨", label: "Premium Pro Filters" },
  { icon: "🎨", label: "Advanced Color Grading" },
  { icon: "♾️", label: "Unlimited Cloud Storage" },
];

export default function PaywallModal({ visible, onClose, feature, onUpgrade }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          {/* ── Drag handle ──────────────────────────────────────── */}
          <View style={styles.handleBar} />

          {/* ── Badge ────────────────────────────────────────────── */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PRO</Text>
          </View>

          {/* ── Header ───────────────────────────────────────────── */}
          <Text style={styles.title}>Unlock Pro Features</Text>
          <Text style={styles.subtitle}>
            {feature
              ? `"${feature}" is a Pro feature.`
              : "This feature requires a Pro subscription."}
            {"\n"}Upgrade to unlock the full creative toolkit.
          </Text>

          {/* ── Perks list ───────────────────────────────────────── */}
          <View style={styles.perksList}>
            {PRO_PERKS.map((perk) => (
              <View key={perk.label} style={styles.perkRow}>
                <Text style={styles.perkIcon}>{perk.icon}</Text>
                <Text style={styles.perkLabel}>{perk.label}</Text>
                <Text style={styles.perkCheck}>✓</Text>
              </View>
            ))}
          </View>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.upgradeButton,
              pressed && styles.upgradePressed,
            ]}
            onPress={() => {
              onUpgrade?.();
              onClose?.();
            }}
          >
            <Text style={styles.upgradeLabel}>Upgrade to Pro</Text>
          </Pressable>

          {/* ── Dismiss ──────────────────────────────────────────── */}
          <Pressable style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissLabel}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 40 : spacing.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    alignItems: "center",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },

  /* Badge */
  badge: {
    backgroundColor: colors.accentStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  badgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },

  /* Header */
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
    maxWidth: 300,
  },

  /* Perks */
  perksList: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  perkIcon: {
    fontSize: 18,
    width: 32,
    textAlign: "center",
  },
  perkLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  perkCheck: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "800",
  },

  /* CTA */
  upgradeButton: {
    width: "100%",
    height: 54,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentStrong,
  },
  upgradePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  upgradeLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Dismiss */
  dismissButton: {
    paddingVertical: spacing.md,
  },
  dismissLabel: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
});
