import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { layout, topBarStyles } from "../styles/styles";

const MODES = { SIGN_IN: "signIn", SIGN_UP: "signUp" };
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z0-9 ]+$/;
const HAS_NUMBER = /\d/;

export default function AuthScreen({ navigation, route }) {
  const initialMode =
    route.params?.mode === "signUp" || route.params?.mode === "register"
      ? MODES.SIGN_UP
      : MODES.SIGN_IN;
  const { login, register } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline field-level errors
  const [fieldErrors, setFieldErrors] = useState({});

  const isSignUp = mode === MODES.SIGN_UP;
  const title = isSignUp ? "Create Account" : "Sign In";
  const submitLabel = isSignUp ? "Create Account" : "Sign In";
  const switchCopy = isSignUp
    ? "Already have an account? Sign In"
    : "New User? Create an Account here!";

  const subtitle = useMemo(
    () =>
      isSignUp
        ? "Create your QuickStudio account to save and export your work."
        : "Welcome back. Sign in to keep creating from where you left off.",
    [isSignUp]
  );

  const switchMode = () => {
    setError("");
    setFieldErrors({});
    setMode((current) =>
      current === MODES.SIGN_IN ? MODES.SIGN_UP : MODES.SIGN_IN
    );
  };

  /* ── Client-side validation (inline errors) ────────────────────── */
  const validateForm = () => {
    const errors = {};
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPassword = password;

    // Email validation
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    // Name validation (sign up only)
    if (isSignUp) {
      if (!cleanName || cleanName.length < 3) {
        errors.name = "Name must be at least 3 characters.";
      } else if (!NAME_REGEX.test(cleanName)) {
        errors.name = "Name must be alphanumeric (letters, numbers, spaces).";
      }
    }

    // Password validation
    if (!cleanPassword || cleanPassword.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    } else if (!HAS_NUMBER.test(cleanPassword)) {
      errors.password = "Password must include at least one number.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Submit handler ────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (loading) return;

    setError("");
    if (!validateForm()) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    setLoading(true);

    if (isSignUp) {
      const result = await register(cleanName, cleanEmail, password);
      setLoading(false);

      if (result.success && result.requiresVerification) {
        // Navigate to OTP screen
        navigation.navigate("OTPVerification", {
          email: result.email || cleanEmail,
        });
        return;
      }

      if (!result.success) {
        setError(result.message);
        Alert.alert(result.title || "Registration Failed", result.message);
      }
    } else {
      const result = await login(cleanEmail, password);
      setLoading(false);

      if (result.success) {
        // AuthContext sets token → AppNavigator auto-switches to MainStack
        return;
      }

      // If unverified user tries to login, redirect to OTP
      if (result.requiresVerification) {
        navigation.navigate("OTPVerification", {
          email: result.email || cleanEmail,
        });
        return;
      }

      setError(result.message);
      Alert.alert(result.title || "Login Failed", result.message);
    }
  };

  /* ── Inline error component ────────────────────────────────────── */
  const FieldError = ({ field }) => {
    if (!fieldErrors[field]) return null;
    return <Text style={styles.fieldError}>{fieldErrors[field]}</Text>;
  };

  return (
    <View style={layout.screenContainer}>
      <View style={topBarStyles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={topBarStyles.iconButton}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.mark}>
            <Ionicons name="person-circle-outline" size={34} color={colors.accent} />
          </View>

          <Text style={styles.eyebrow}>QuickStudio Account</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* ── Global error banner ──────────────────────── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Name input (sign up only) ────────────────── */}
          {isSignUp ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.name && styles.inputError,
                ]}
                placeholder="Name (min 3 characters)"
                placeholderTextColor={colors.textSoft}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
              />
              <FieldError field="name" />
            </>
          ) : null}

          {/* ── Email input ──────────────────────────────── */}
          <TextInput
            style={[
              styles.input,
              fieldErrors.email && styles.inputError,
            ]}
            placeholder="Email"
            placeholderTextColor={colors.textSoft}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <FieldError field="email" />

          {/* ── Password input ───────────────────────────── */}
          <TextInput
            style={[
              styles.input,
              fieldErrors.password && styles.inputError,
            ]}
            placeholder="Password (min 6 chars, include a number)"
            placeholderTextColor={colors.textSoft}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            textContentType={isSignUp ? "newPassword" : "password"}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <FieldError field="password" />

          {/* ── Submit button ─────────────────────────────── */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{submitLabel}</Text>
            )}
          </Pressable>

          {/* ── Mode switch link ──────────────────────────── */}
          <Pressable
            onPress={switchMode}
            hitSlop={HIT_SLOP}
            style={styles.inlineLinkWrap}
          >
            <Text style={styles.inlineLink}>{switchCopy}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  mark: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  errorBox: {
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
  },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
    marginBottom: 4,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: "700",
  },
  inlineLinkWrap: {
    alignSelf: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  inlineLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
