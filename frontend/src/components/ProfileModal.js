import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "../theme/tokens";
import { modalStyles } from "../styles/styles";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function ProfileModal({
  visible,
  user,
  loading,
  onClose,
  onLogout,
  onDeleteAccount,
}) {
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your QuickStudio account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: onDeleteAccount,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.name}>{user?.name || "QuickStudio User"}</Text>
              <Text style={styles.email}>{user?.email || "No email available"}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={HIT_SLOP}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tier</Text>
            <Text style={styles.tier}>{user?.subscriptionTier || "free"}</Text>
          </View>

          <Pressable
            onPress={onLogout}
            disabled={loading}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.primaryText} />
            <Text style={styles.actionText}>Logout</Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            disabled={loading}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={styles.deleteText}>Delete Account</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  headerText: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    ...typography.eyebrow,
    color: colors.textSoft,
  },
  tier: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  actionButton: {
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: "800",
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(251, 113, 133, 0.35)",
    backgroundColor: "rgba(251, 113, 133, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.7,
  },
});
