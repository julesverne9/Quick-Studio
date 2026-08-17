import React, { useMemo, useState } from "react";
import { CommonActions } from "@react-navigation/native";
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

const normalizeReturnRoute = (target) => {
  const routeName = target?.name === "Home" ? "HomeScreen" : target?.name;

  return {
    name: routeName || "HomeScreen",
    params: target?.params || {},
  };
};

export default function AuthScreen({ navigation, route }) {
  const initialMode =
    route.params?.mode === "signUp" || route.params?.mode === "register"
      ? MODES.SIGN_UP
      : MODES.SIGN_IN;
  const returnTo = route.params?.returnTo || { name: "Home" };
  const { login, register } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setMode((current) =>
      current === MODES.SIGN_IN ? MODES.SIGN_UP : MODES.SIGN_IN
    );
  };

  const completeAuth = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [normalizeReturnRoute(returnTo)],
      })
    );
  };

  const showValidationAlert = (title, message) => {
    setError(message);
    Alert.alert(title, message);
  };

  const getSanitizedForm = () => ({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });

  const validateForm = ({ name: cleanName, email: cleanEmail, password: cleanPassword }) => {
    if (!cleanEmail || /\s/.test(cleanEmail) || !EMAIL_REGEX.test(cleanEmail)) {
      showValidationAlert(
        "Invalid Email",
        "Please enter a valid email address (e.g., user@example.com)."
      );
      return false;
    }

    if (isSignUp && cleanName.length < 2) {
      showValidationAlert("Name Required", "Please enter your full name.");
      return false;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      showValidationAlert(
        "Password Too Short",
        "Your password must be at least 6 characters long."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (loading) return;

    setError("");
    const sanitizedForm = getSanitizedForm();

    if (!validateForm(sanitizedForm)) {
      return;
    }

    setLoading(true);
    const result = isSignUp
      ? await register(
          sanitizedForm.name,
          sanitizedForm.email,
          sanitizedForm.password
        )
      : await login(sanitizedForm.email, sanitizedForm.password);
    setLoading(false);

    if (result.success) {
      completeAuth();
      return;
    }

    setError(result.message);
    Alert.alert(result.title || "Authentication Failed", result.message);
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

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isSignUp ? (
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.textSoft}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
              returnKeyType="next"
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
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
            textContentType={isSignUp ? "newPassword" : "password"}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

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
    marginBottom: spacing.sm,
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
