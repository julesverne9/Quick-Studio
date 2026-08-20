import React, { useCallback, useEffect, useRef, useState } from "react";
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

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ navigation, route }) {
  const email = route.params?.email || "";
  const { verifyOtp, resendOtp } = useAuth();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for focusing each input
  const inputRefs = useRef([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus the first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  /* ── Handle individual digit input ─────────────────────────────── */
  const handleDigitChange = useCallback(
    (text, index) => {
      setError("");

      // Handle paste: if user pastes full OTP
      if (text.length > 1) {
        const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
        const newOtp = [...otp];
        digits.forEach((d, i) => {
          if (index + i < OTP_LENGTH) newOtp[index + i] = d;
        });
        setOtp(newOtp);
        const nextIdx = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIdx]?.focus();
        return;
      }

      // Single digit
      const digit = text.replace(/\D/g, "");
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-advance to next input
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  /* ── Handle backspace ──────────────────────────────────────────── */
  const handleKeyPress = useCallback(
    (e, index) => {
      if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    },
    [otp]
  );

  /* ── Submit OTP ────────────────────────────────────────────────── */
  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await verifyOtp(email, code);
    setLoading(false);

    if (result.success) {
      // AuthContext sets token & user → AppNavigator auto-switches to MainStack
      return;
    }

    setError(result.message || "Verification failed.");
    Alert.alert(result.title || "Verification Failed", result.message);
  };

  /* ── Resend OTP ────────────────────────────────────────────────── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    const result = await resendOtp(email);
    setLoading(false);

    if (result.success) {
      setResendCooldown(60);
      setOtp(Array(OTP_LENGTH).fill(""));
      Alert.alert("Code Sent", result.message);
    } else {
      Alert.alert("Failed", result.message);
    }
  };

  // Auto-submit when all digits filled
  useEffect(() => {
    const code = otp.join("");
    if (code.length === OTP_LENGTH && !loading) {
      handleVerify();
    }
  }, [otp]);

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
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* ── Icon ──────────────────────────────────────── */}
          <View style={styles.mark}>
            <Ionicons name="mail-outline" size={34} color={colors.accent} />
          </View>

          <Text style={styles.eyebrow}>Email Verification</Text>
          <Text style={styles.title}>Enter Code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* ── Error ─────────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── OTP Input Row ─────────────────────────────── */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                  error && styles.otpInputError,
                ]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                caretHidden
              />
            ))}
          </View>

          {/* ── Verify Button ─────────────────────────────── */}
          <Pressable
            onPress={handleVerify}
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
              <Text style={styles.primaryButtonText}>Verify & Continue</Text>
            )}
          </Pressable>

          {/* ── Resend Link ───────────────────────────────── */}
          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0 || loading}
            hitSlop={HIT_SLOP}
            style={styles.inlineLinkWrap}
          >
            <Text
              style={[
                styles.inlineLink,
                resendCooldown > 0 && styles.inlineLinkDisabled,
              ]}
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Didn't receive the code? Resend"}
            </Text>
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
  emailHighlight: {
    color: colors.accent,
    fontWeight: "700",
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: spacing.xl,
  },
  otpInput: {
    width: 48,
    height: 58,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  otpInputError: {
    borderColor: colors.danger,
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
  inlineLinkDisabled: {
    color: colors.textSoft,
  },
});
