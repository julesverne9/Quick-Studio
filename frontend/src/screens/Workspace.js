import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import { editingTools, timelineCards } from "../data/mockContent";
import { colors, spacing } from "../theme/tokens";
import {
  layout,
  topBarStyles,
  editorStyles,
  modalStyles,
} from "../styles/styles";

export default function Workspace({ onBack }) {
  const [asset, setAsset] = useState(null);
  const [isAuthenticated] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
  });

  /* ── Media picker ────────────────────────────────────────────────── */

  const pickAsset = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Gallery access needed",
        "Please allow gallery access so QuickStudio can load your photo or video."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selectedAsset = result.assets[0];

    setAsset({
      uri: selectedAsset.uri,
      fileName: selectedAsset.fileName || "Untitled asset",
      assetType: selectedAsset.type === "video" ? "video" : "photo",
    });
  };

  /* ── Export handler ──────────────────────────────────────────────── */

  const handleExport = () => {
    if (!isAuthenticated) {
      setShowAuthSheet(true);
      return;
    }
    Alert.alert("Export", "Authenticated export flow will continue here.");
  };

  const updateField = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <View style={layout.screenContainer}>
      {/* ── Top bar ──────────────────────────────────────── */}
      <View style={topBarStyles.container}>
        <Pressable onPress={onBack} style={topBarStyles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={topBarStyles.centerContent}>
          <Text style={topBarStyles.brand}>QuickStudio</Text>
          <Text style={topBarStyles.brandMeta}>
            {asset
              ? `${asset.assetType} loaded`
              : "Select media to begin"}
          </Text>
        </View>

        <Pressable onPress={handleExport} style={topBarStyles.iconButton}>
          <Ionicons name="share-outline" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {/* ── No asset: prompt to select ───────────────────── */}
      {!asset ? (
        <View style={layout.centeredFull}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              backgroundColor: colors.surfaceSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.xl,
            }}
          >
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>

          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Start Editing
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 15,
              lineHeight: 22,
              textAlign: "center",
              marginTop: spacing.sm,
              maxWidth: 280,
            }}
          >
            Tap below to select a photo or video and begin on the canvas.
          </Text>
          <Button
            label="Select Photo or Video"
            onPress={pickAsset}
            style={{ marginTop: spacing.xl, minWidth: 240 }}
          />
        </View>
      ) : (
        /* ── Editor shell ──────────────────────────────────── */
        <View style={editorStyles.shell}>
          {/* Preview surface */}
          <View style={editorStyles.previewSurface}>
            <View style={editorStyles.previewHeader}>
              <Text style={editorStyles.previewLabelTitle}>Preview Canvas</Text>
              <Text style={editorStyles.previewLabelMeta}>
                {asset.assetType === "video"
                  ? "Timeline ready"
                  : "Photo layer stack"}
              </Text>
            </View>

            <View style={editorStyles.previewStage}>
              {asset.assetType === "photo" ? (
                <Image
                  source={{ uri: asset.uri }}
                  style={editorStyles.assetPreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={editorStyles.videoPlaceholder}>
                  <View style={editorStyles.videoPlayButton}>
                    <Text style={editorStyles.videoPlayButtonText}>Play</Text>
                  </View>
                  <Text style={editorStyles.videoPlaceholderTitle}>
                    Video Preview
                  </Text>
                  <Text style={editorStyles.videoPlaceholderBody}>
                    Playback, trimming, and FFmpeg render hooks will plug into
                    this preview surface.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Controls surface */}
          <View style={editorStyles.controlsSurface}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={editorStyles.toolRow}
            >
              {editingTools.map((tool) => (
                <Pressable key={tool} style={editorStyles.toolChip}>
                  <Text style={editorStyles.toolChipText}>{tool}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={editorStyles.timelineSection}>
              <SectionHeader
                title="Timeline"
                meta={
                  asset.assetType === "video" ? "Track stack" : "Layer order"
                }
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={editorStyles.timelineRow}
              >
                {timelineCards.map((card) => (
                  <View key={card.id} style={editorStyles.timelineCard}>
                    <View
                      style={[
                        editorStyles.timelineVisual,
                        { backgroundColor: card.accent },
                      ]}
                    />
                    <Text style={editorStyles.timelineCardTitle}>
                      {card.label}
                    </Text>
                    <Text style={editorStyles.timelineCardMeta}>00:03</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={editorStyles.trackBar}>
                <View style={editorStyles.trackProgress} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Auth modal ─────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={showAuthSheet}
        onRequestClose={() => setShowAuthSheet(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.sheetEyebrow}>Save & Export</Text>
            <Text style={modalStyles.sheetTitle}>
              Sign up to save your high-resolution creation directly to your
              gallery with no ads and no watermarks.
            </Text>

            <TextInput
              placeholder="Name"
              placeholderTextColor={colors.textSoft}
              style={modalStyles.input}
              value={formValues.name}
              onChangeText={(v) => updateField("name", v)}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textSoft}
              keyboardType="email-address"
              autoCapitalize="none"
              style={modalStyles.input}
              value={formValues.email}
              onChangeText={(v) => updateField("email", v)}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textSoft}
              secureTextEntry
              style={modalStyles.input}
              value={formValues.password}
              onChangeText={(v) => updateField("password", v)}
            />

            <View style={modalStyles.actionRow}>
              <Button
                label="Create Account"
                onPress={() => {}}
                style={modalStyles.halfButton}
              />
              <Button
                label="Maybe Later"
                variant="secondary"
                onPress={() => setShowAuthSheet(false)}
                style={modalStyles.halfButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
