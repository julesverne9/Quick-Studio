import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius } from "../../theme/tokens";

export default function Button({
  label,
  onPress,
  variant = "primary",
  style,
  textStyle
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : styles.primary,
        pressed ? styles.pressed : null,
        style
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "secondary" ? styles.secondaryLabel : styles.primaryLabel,
          textStyle
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  label: {
    fontSize: 15,
    fontWeight: "700"
  },
  primaryLabel: {
    color: colors.primaryText
  },
  secondaryLabel: {
    color: colors.text
  }
});
