import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "../../theme/tokens";

export default function SectionHeader({ title, meta }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  }
});
