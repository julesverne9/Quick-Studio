import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme/tokens";

const TABS = { LOGIN: "login", REGISTER: "register" };

export default function AuthModal({ visible, onClose, initialTab }) {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || TABS.LOGIN);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
  };

  const switchTab = (tab) => {
    resetForm();
    setActiveTab(tab);
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  useEffect(() => {
    setActiveTab(initialTab || TABS.LOGIN);
  }, [initialTab, visible]);

  /* ── Submit ───────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (activeTab === TABS.REGISTER) {
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    const result =
      activeTab === TABS.REGISTER
        ? await register(name.trim(), email.trim(), password)
        : await login(email.trim(), password);

    setLoading(false);

    if (result.success) {
      handleClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.sheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Drag handle ──────────────────────────────────────── */}
            <View style={styles.handleBar} />

            {/* ── Header ───────────────────────────────────────────── */}
            <Text style={styles.title}>
              {activeTab === TABS.LOGIN
                ? "Welcome Back"
                : "Create Account"}
            </Text>
            <Text style={styles.subtitle}>
              {activeTab === TABS.LOGIN
                ? "Sign in to export your creations"
                : "Join QuickStudio to save & export"}
            </Text>

            {/* ── Tab switcher ─────────────────────────────────────── */}
            <View style={styles.tabBar}>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === TABS.LOGIN && styles.tabActive,
                ]}
                onPress={() => switchTab(TABS.LOGIN)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === TABS.LOGIN && styles.tabLabelActive,
                  ]}
                >
                  Login
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === TABS.REGISTER && styles.tabActive,
                ]}
                onPress={() => switchTab(TABS.REGISTER)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === TABS.REGISTER && styles.tabLabelActive,
                  ]}
                >
                  Register
                </Text>
              </Pressable>
            </View>

            {/* ── Error banner ────────────────────────────────────── */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Form fields ─────────────────────────────────────── */}
            {activeTab === TABS.REGISTER && (
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={colors.textSoft}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textSoft}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textSoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              returnKeyType={activeTab === TABS.REGISTER ? "next" : "done"}
              onSubmitEditing={
                activeTab === TABS.LOGIN ? handleSubmit : undefined
              }
            />

            {activeTab === TABS.REGISTER && (
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={colors.textSoft}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            )}

            {/* ── Submit button ───────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitPressed,
                loading && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text style={styles.submitLabel}>
                  {activeTab === TABS.LOGIN ? "Sign In" : "Create Account"}
                </Text>
              )}
            </Pressable>

            {/* ── Footer toggle ───────────────────────────────────── */}
            <Pressable
              style={styles.footerToggle}
              onPress={() =>
                switchTab(
                  activeTab === TABS.LOGIN ? TABS.REGISTER : TABS.LOGIN
                )
              }
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.footerText}>
                {activeTab === TABS.LOGIN
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={styles.footerLink}>
                  {activeTab === TABS.LOGIN ? "Register" : "Sign In"}
                </Text>
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "85%",
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  handleBar: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },

  /* Header */
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },

  /* Tabs */
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.sm - 3,
  },
  tabActive: {
    backgroundColor: colors.accentStrong,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSoft,
  },
  tabLabelActive: {
    color: "#fff",
  },

  /* Error */
  errorBanner: {
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 113, 133, 0.25)",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  /* Inputs */
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.sm,
  },

  /* Submit */
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  submitPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitLabel: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "700",
  },

  /* Footer */
  footerToggle: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: "700",
  },
});
