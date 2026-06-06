import React, { useMemo, useState } from "react";
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
import Slider from "@react-native-community/slider";
import {
  ColorMatrix,
  concatColorMatrices,
  brightness as brightnessMatrix,
  contrast as contrastMatrix,
  saturate as saturateMatrix,
  grayscale as grayscaleMatrix,
  sepia as sepiaMatrix,
} from "react-native-color-matrix-image-filters";

import Button from "../components/ui/Button";
import { colors, spacing } from "../theme/tokens";
import {
  layout,
  topBarStyles,
  editorStyles,
  modalStyles,
} from "../styles/styles";

/* ═══════════════════════════════════════════════════════════════════════
   Preset definitions — each is a factory returning a 4×5 color matrix.
   ═══════════════════════════════════════════════════════════════════════ */

const PRESETS = [
  {
    id: "original",
    label: "Original",
    icon: "image-outline",
    getMatrix: () => null, // identity — no filter
  },
  {
    id: "bw",
    label: "B & W",
    icon: "contrast-outline",
    getMatrix: () => grayscaleMatrix(1),
  },
  {
    id: "sepia",
    label: "Sepia",
    icon: "sunny-outline",
    getMatrix: () => sepiaMatrix(1),
  },
  {
    id: "vintage",
    label: "Vintage",
    icon: "film-outline",
    getMatrix: () =>
      concatColorMatrices(
        sepiaMatrix(0.35),
        saturateMatrix(0.75),
        contrastMatrix(1.1),
        brightnessMatrix(1.05)
      ),
  },
  {
    id: "cool",
    label: "Cool",
    icon: "snow-outline",
    getMatrix: () =>
      concatColorMatrices(
        saturateMatrix(0.8),
        [
          1, 0, 0, 0, -0.02,
          0, 1, 0, 0, 0,
          0, 0, 1, 0, 0.06,
          0, 0, 0, 1, 0,
        ]
      ),
  },
  {
    id: "warm",
    label: "Warm",
    icon: "flame-outline",
    getMatrix: () =>
      concatColorMatrices(
        saturateMatrix(1.15),
        [
          1, 0, 0, 0, 0.06,
          0, 1, 0, 0, 0.02,
          0, 0, 1, 0, -0.04,
          0, 0, 0, 1, 0,
        ]
      ),
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   Default adjustment values (1 = no change for brightness/contrast/sat)
   ═══════════════════════════════════════════════════════════════════════ */

const DEFAULT_ADJUSTMENTS = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
};

/* ═══════════════════════════════════════════════════════════════════════ */

export default function Workspace({ onBack }) {
  const [asset, setAsset] = useState(null);
  const [activeTab, setActiveTab] = useState("presets");
  const [activePreset, setActivePreset] = useState("original");
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);

  /* Auth state */
  const [isAuthenticated] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
  });

  /* ── Compute the final combined color matrix ─────────────────────── */

  const combinedMatrix = useMemo(() => {
    const matrices = [];

    // 1. Preset matrix
    const preset = PRESETS.find((p) => p.id === activePreset);
    const presetMatrix = preset?.getMatrix();
    if (presetMatrix) {
      matrices.push(presetMatrix);
    }

    // 2. Adjustment matrices (only if changed from default)
    if (adjustments.brightness !== 1) {
      matrices.push(brightnessMatrix(adjustments.brightness));
    }
    if (adjustments.contrast !== 1) {
      matrices.push(contrastMatrix(adjustments.contrast));
    }
    if (adjustments.saturation !== 1) {
      matrices.push(saturateMatrix(adjustments.saturation));
    }

    if (matrices.length === 0) return null;
    if (matrices.length === 1) return matrices[0];
    return concatColorMatrices(...matrices);
  }, [activePreset, adjustments]);

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

    if (result.canceled || !result.assets?.length) return;

    const selectedAsset = result.assets[0];
    setAsset({
      uri: selectedAsset.uri,
      fileName: selectedAsset.fileName || "Untitled asset",
      assetType: selectedAsset.type === "video" ? "video" : "photo",
    });

    // Reset filters when new asset is loaded
    setActivePreset("original");
    setAdjustments(DEFAULT_ADJUSTMENTS);
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

  const updateAdjustment = (key, value) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const resetAdjustments = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  /* ── Helper: render filtered image ───────────────────────────────── */

  const renderFilteredImage = (imageStyle) => {
    const imageElement = (
      <Image
        source={{ uri: asset.uri }}
        style={imageStyle}
        resizeMode="contain"
      />
    );

    if (!combinedMatrix) return imageElement;

    return (
      <ColorMatrix matrix={combinedMatrix}>
        {imageElement}
      </ColorMatrix>
    );
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
            <Ionicons
              name="image-outline"
              size={32}
              color={colors.textMuted}
            />
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
          {/* ── Preview surface ─────────────────────────── */}
          <View style={editorStyles.previewSurface}>
            {asset.assetType === "photo" ? (
              renderFilteredImage(editorStyles.assetPreview)
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

          {/* ── Toolbar ─────────────────────────────────── */}
          <View style={editorStyles.toolbarSurface}>
            {/* Tab bar */}
            <View style={editorStyles.tabBar}>
              {["presets", "adjust"].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    editorStyles.tabItem,
                    activeTab === tab && editorStyles.tabItemActive,
                  ]}
                >
                  <Text
                    style={[
                      editorStyles.tabLabel,
                      activeTab === tab && editorStyles.tabLabelActive,
                    ]}
                  >
                    {tab === "presets" ? "Presets" : "Adjust"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Presets tab ────────────────────────────── */}
            {activeTab === "presets" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={editorStyles.presetsScroll}
              >
                {PRESETS.map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => setActivePreset(preset.id)}
                      style={editorStyles.presetItem}
                    >
                      <View
                        style={[
                          editorStyles.presetThumb,
                          isActive && editorStyles.presetThumbActive,
                        ]}
                      >
                        {/* Thumbnail with filter preview */}
                        {preset.id === "original" ? (
                          <Image
                            source={{ uri: asset.uri }}
                            style={editorStyles.presetThumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <ColorMatrix matrix={preset.getMatrix()}>
                            <Image
                              source={{ uri: asset.uri }}
                              style={editorStyles.presetThumbImage}
                              resizeMode="cover"
                            />
                          </ColorMatrix>
                        )}
                      </View>
                      <Text
                        style={[
                          editorStyles.presetLabel,
                          isActive && editorStyles.presetLabelActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* ── Adjust tab ────────────────────────────── */}
            {activeTab === "adjust" && (
              <View style={editorStyles.adjustPanel}>
                {/* Brightness */}
                <View style={editorStyles.sliderRow}>
                  <View style={editorStyles.sliderHeader}>
                    <Text style={editorStyles.sliderLabel}>
                      <Ionicons
                        name="sunny-outline"
                        size={14}
                        color={colors.textMuted}
                      />{" "}
                      Brightness
                    </Text>
                    <Text style={editorStyles.sliderValue}>
                      {Math.round((adjustments.brightness - 1) * 100)}
                    </Text>
                  </View>
                  <Slider
                    style={editorStyles.slider}
                    minimumValue={0.5}
                    maximumValue={1.5}
                    step={0.01}
                    value={adjustments.brightness}
                    onValueChange={(v) => updateAdjustment("brightness", v)}
                    minimumTrackTintColor={colors.accentStrong}
                    maximumTrackTintColor={colors.surfaceSoft}
                    thumbTintColor={colors.text}
                  />
                </View>

                {/* Contrast */}
                <View style={editorStyles.sliderRow}>
                  <View style={editorStyles.sliderHeader}>
                    <Text style={editorStyles.sliderLabel}>
                      <Ionicons
                        name="contrast-outline"
                        size={14}
                        color={colors.textMuted}
                      />{" "}
                      Contrast
                    </Text>
                    <Text style={editorStyles.sliderValue}>
                      {Math.round((adjustments.contrast - 1) * 100)}
                    </Text>
                  </View>
                  <Slider
                    style={editorStyles.slider}
                    minimumValue={0.5}
                    maximumValue={1.5}
                    step={0.01}
                    value={adjustments.contrast}
                    onValueChange={(v) => updateAdjustment("contrast", v)}
                    minimumTrackTintColor={colors.accentStrong}
                    maximumTrackTintColor={colors.surfaceSoft}
                    thumbTintColor={colors.text}
                  />
                </View>

                {/* Saturation */}
                <View style={editorStyles.sliderRow}>
                  <View style={editorStyles.sliderHeader}>
                    <Text style={editorStyles.sliderLabel}>
                      <Ionicons
                        name="color-palette-outline"
                        size={14}
                        color={colors.textMuted}
                      />{" "}
                      Saturation
                    </Text>
                    <Text style={editorStyles.sliderValue}>
                      {Math.round((adjustments.saturation - 1) * 100)}
                    </Text>
                  </View>
                  <Slider
                    style={editorStyles.slider}
                    minimumValue={0}
                    maximumValue={2}
                    step={0.01}
                    value={adjustments.saturation}
                    onValueChange={(v) => updateAdjustment("saturation", v)}
                    minimumTrackTintColor={colors.accentStrong}
                    maximumTrackTintColor={colors.surfaceSoft}
                    thumbTintColor={colors.text}
                  />
                </View>

                {/* Reset button */}
                <Pressable
                  onPress={resetAdjustments}
                  style={editorStyles.resetButton}
                >
                  <Text style={editorStyles.resetLabel}>
                    <Ionicons
                      name="refresh-outline"
                      size={12}
                      color={colors.textMuted}
                    />{" "}
                    Reset All
                  </Text>
                </Pressable>
              </View>
            )}
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
