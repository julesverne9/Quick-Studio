import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import { landingFeatures } from "../data/mockContent";
import { colors } from "../theme/tokens";
import { layout, textStyles, landingStyles } from "../styles/styles";

const FEATURE_COLORS = {
  accent: colors.accent,
  success: colors.success,
};

export default function LandingScreen({ navigation }) {
  return (
    <View style={layout.screenContainer}>
      <View style={layout.centeredFull}>
        <View style={landingStyles.logoContainer}>
          <Ionicons name="videocam" size={38} color={colors.accent} />
        </View>

        <Text style={textStyles.appTitle}>QuickStudio</Text>
        <View style={landingStyles.accentLine} />

        <Text style={landingStyles.tagline}>
          Professional video editing, simplified.{"\n"}Create stunning content
          in minutes.
        </Text>

        <View style={landingStyles.featureGrid}>
          {landingFeatures.map((feature) => (
            <View key={feature.id} style={landingStyles.featurePill}>
              <Ionicons
                name={feature.icon}
                size={14}
                color={FEATURE_COLORS[feature.color]}
              />
              <Text style={landingStyles.featureText}>{feature.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={landingStyles.ctaDock}>
        <Button
          label="Get Started"
          onPress={() => navigation.navigate("Home")}
        />
      </View>
    </View>
  );
}
