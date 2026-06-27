import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "../../theme/tokens";

export default function Surface({ children, style }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border
  }
});
