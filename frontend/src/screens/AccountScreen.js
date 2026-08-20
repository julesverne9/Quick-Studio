import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { layout, topBarStyles } from "../styles/styles";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function AccountScreen({ navigation }) {
  const { user, logout, deleteAccount } = useAuth();
  const [loading, setLoading] = useState(false);

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  /* ── Logout ────────────────────────────────────────────────────── */
  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    // AuthContext clears token → AppNavigator auto-switches to AuthStack → Landing
  };

  /* ── Delete Account ────────────────────────────────────────────── */
  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your QuickStudio account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const result = await deleteAccount();
            setLoading(false);

            if (!result.success) {
              Alert.alert("Delete Failed", result.message);
            }
            // If success: AuthContext clears → auto-routes to Landing
          },
        },
      ]
    );
  };

  return (
    <View style={layout.screenContainer}>
      {/* ── Top bar ────────────────────────────────────────── */}
      <View style={topBarStyles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={topBarStyles.iconButton}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Text style={styles.topBarTitle}>Account</Text>

        <View style={{ flex: 1 }} />

        {/* Spacer to balance the back button */}
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ── Profile header ──────────────────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user?.name || "QuickStudio User"}</Text>
          <Text style={styles.email}>{user?.email || "No email"}</Text>
        </View>

        {/* ── Details card ────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Subscription</Text>
            <Text style={styles.tierBadge}>
              {user?.subscriptionTier || "free"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Email Verified</Text>
            <View style={styles.verifiedRow}>
              <Ionicons
                name={
                  user?.isEmailVerified
                    ? "checkmark-circle"
                    : "close-circle-outline"
                }
                size={16}
                color={user?.isEmailVerified ? colors.success : colors.warning}
              />
              <Text
                style={[
                  styles.verifiedText,
                  {
                    color: user?.isEmailVerified
                      ? colors.success
                      : colors.warning,
                  },
                ]}
              >
                {user?.isEmailVerified ? "Yes" : "No"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Member Since</Text>
            <Text style={styles.cardValue}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </Text>
          </View>
        </View>

        {/* ── Actions ─────────────────────────────────────── */}
        <Pressable
          onPress={handleLogout}
          disabled={loading}
          hitSlop={HIT_SLOP}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} size="small" />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={18}
                color={colors.primaryText}
              />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
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
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteText}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBarTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  email: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  cardLabel: {
    ...typography.eyebrow,
    color: colors.textSoft,
  },
  cardValue: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  tierBadge: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logoutText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: "800",
  },
  deleteButton: {
    minHeight: 54,
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
