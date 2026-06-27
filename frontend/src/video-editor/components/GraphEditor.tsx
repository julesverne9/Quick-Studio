import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { colors, spacing } from "../../theme/tokens";

interface GraphEditorProps {
  activeCurve: string;
  onChangeCurve: (curve: string) => void;
  onClose: () => void;
}

export default function GraphEditor({ activeCurve, onChangeCurve, onClose }: GraphEditorProps) {
  const curves = [
    { id: "linear", label: "Linear", desc: "Constant speed" },
    { id: "ease-in", label: "Ease In", desc: "Start slow, speed up" },
    { id: "ease-out", label: "Ease Out", desc: "Start fast, slow down" },
    { id: "ease-in-out", label: "Ease In Out", desc: "Slow start & end" },
  ];

  // Simple visual path rendering for each curve
  const renderCurveIcon = (id: string) => {
    switch (id) {
      case "ease-in":
        return (
          <View style={styles.curvePreviewBox}>
            <View style={[styles.curveLine, styles.easeInLine]} />
          </View>
        );
      case "ease-out":
        return (
          <View style={styles.curvePreviewBox}>
            <View style={[styles.curveLine, styles.easeOutLine]} />
          </View>
        );
      case "ease-in-out":
        return (
          <View style={styles.curvePreviewBox}>
            <View style={[styles.curveLine, styles.easeInOutLine]} />
          </View>
        );
      case "linear":
      default:
        return (
          <View style={styles.curvePreviewBox}>
            <View style={[styles.curveLine, styles.linearLine]} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Keyframe Graph Editor</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.sub}>
        Select a Bezier curve to interpolate values between your animation keyframe markers.
      </Text>

      {/* Visualizer Graph Box */}
      <View style={styles.visualizerBox}>
        <View style={styles.gridLines} />
        {renderCurveIcon(activeCurve)}
        <Text style={styles.activeLabel}>
          {curves.find((c) => c.id === activeCurve)?.label}
        </Text>
      </View>

      {/* Curves presets list */}
      <View style={styles.list}>
        {curves.map((curve) => (
          <Pressable
            key={curve.id}
            onPress={() => onChangeCurve(curve.id)}
            style={[
              styles.item,
              activeCurve === curve.id && styles.itemActive,
            ]}
          >
            <Text
              style={[
                styles.itemText,
                activeCurve === curve.id && styles.itemTextActive,
              ]}
            >
              {curve.label}
            </Text>
            <Text style={styles.itemDesc}>{curve.desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: colors.accentStrong,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sub: {
    color: colors.textSoft,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  visualizerBox: {
    height: 120,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginVertical: 20,
  },
  activeLabel: {
    position: "absolute",
    bottom: 8,
    right: 12,
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  curvePreviewBox: {
    width: "80%",
    height: "60%",
    position: "relative",
  },
  curveLine: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textSoft,
  },
  linearLine: {
    width: 0,
    height: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderColor: colors.accent,
    transform: [{ rotate: "-35deg" }],
    top: 35,
    left: 10,
  },
  easeInLine: {
    borderBottomLeftRadius: 100,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.accent,
  },
  easeOutLine: {
    borderTopRightRadius: 100,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.accent,
  },
  easeInOutLine: {
    borderBottomLeftRadius: 50,
    borderTopRightRadius: 50,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.accent,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  item: {
    width: "48%",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  itemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceSoft,
  },
  itemText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  itemTextActive: {
    color: colors.text,
  },
  itemDesc: {
    color: colors.textSoft,
    fontSize: 10,
    marginTop: 2,
  },
});
