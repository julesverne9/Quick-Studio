import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { colors, radius } from "../../theme/tokens";

export default function SkeletonBlock({ height, width = "100%", style }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.block, { height, width, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md
  }
});
