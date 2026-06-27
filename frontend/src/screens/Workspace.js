import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000");

function AdjustmentSlider({
  label,
  icon,
  minimumValue,
  maximumValue,
  step,
  value,
  displayValue,
  onValueChange,
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const updateValueFromPosition = (positionX) => {
    if (!trackWidth) return;

    const ratio = Math.min(Math.max(positionX / trackWidth, 0), 1);
    const rawValue = minimumValue + ratio * (maximumValue - minimumValue);
    const steppedValue = Math.round(rawValue / step) * step;
    const nextValue = Number(
      Math.min(Math.max(steppedValue, minimumValue), maximumValue).toFixed(2)
    );

    onValueChange(nextValue);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateValueFromPosition(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateValueFromPosition(event.nativeEvent.locationX);
        },
      }),
    [trackWidth, minimumValue, maximumValue, step, onValueChange]
  );

  const progress =
    ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <View style={editorStyles.sliderRow}>
      <View style={editorStyles.sliderHeader}>
        <View style={editorStyles.sliderLabelRow}>
          <Ionicons name={icon} size={14} color={colors.textMuted} />
          <Text style={editorStyles.sliderLabel}>{label}</Text>
        </View>
        <Text style={editorStyles.sliderValue}>{displayValue}</Text>
      </View>

      <View
        style={editorStyles.sliderTrackWrap}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={editorStyles.sliderTrack} />
        <View
          style={[
            editorStyles.sliderFill,
            { width: `${Math.min(Math.max(progress, 0), 100)}%` },
          ]}
        />
        <View
          style={[
            editorStyles.sliderThumb,
            { left: `${Math.min(Math.max(progress, 0), 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function Workspace({ onBack }) {
  const [asset, setAsset] = useState(null);
  const [activeTab, setActiveTab] = useState("presets");
  const [activePreset, setActivePreset] = useState("original");
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);

  /* Auth state */
  const [authSession, setAuthSession] = useState(null);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
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
      mimeType: selectedAsset.mimeType || "image/jpeg",
      assetType: selectedAsset.type === "video" ? "video" : "photo",
    });

    // Reset filters when new asset is loaded
    setActivePreset("original");
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  /* ── Export handler ──────────────────────────────────────────────── */

  const handleExport = async () => {
    if (!authSession?.token) {
      setShowAuthSheet(true);
      return;
    }

    if (!asset || asset.assetType !== "photo") {
      Alert.alert(
        "Export Unavailable",
        "Please load a photo first. Video export is not wired up yet."
      );
      return;
    }

    setIsExporting(true);

    try {
      const formData = new FormData();
      formData.append("mediaFile", {
        uri: asset.uri,
        name: asset.fileName || "quickstudio-photo.jpg",
        type: asset.mimeType || "image/jpeg",
      });
      formData.append("assetType", asset.assetType);
      formData.append("preset", activePreset);
      formData.append("brightness", String(adjustments.brightness));
      formData.append("contrast", String(adjustments.contrast));
      formData.append("saturation", String(adjustments.saturation));
      formData.append("guestDeviceId", authSession.user.id);

      const response = await axios.post(
        `${API_BASE_URL}/api/media/process`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authSession.token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setExportResult(response.data);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Export failed. Please try again.";

      Alert.alert("Export Failed", message);
    } finally {
      setIsExporting(false);
    }
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

  const handleCreateAccount = async () => {
    const name = formValues.name.trim();
    const email = formValues.email.trim().toLowerCase();
    const password = formValues.password;

    if (!name || !email || !password) {
      Alert.alert("Missing Details", "Please complete all three fields.");
      return;
    }

    setIsSigningUp(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/signup`,
        {
          name,
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const payload = response.data;

      setAuthSession({
        token: payload.token,
        user: payload.user,
      });
      setShowAuthSheet(false);
      setFormValues({
        name: "",
        email: "",
        password: "",
      });

      Alert.alert(
        "Account Created",
        `${payload.user.name}, your details have been saved and export is now unlocked.`
      );
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "We couldn't create your account. Please try again in a moment.";

      Alert.alert(
        "Sign Up Failed",
        message
      );
    } finally {
      setIsSigningUp(false);
    }
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

    if (!combinedMatrix) {
      return (
        <View style={editorStyles.assetPreviewFrame}>
          {imageElement}
        </View>
      );
    }

    return (
      <View style={editorStyles.assetPreviewFrame}>
        <ColorMatrix
          matrix={combinedMatrix}
          style={editorStyles.assetPreviewFrame}
        >
          {imageElement}
        </ColorMatrix>
      </View>
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
                <AdjustmentSlider
                  label="Brightness"
                  icon="sunny-outline"
                  minimumValue={0.5}
                  maximumValue={1.5}
                  step={0.01}
                  value={adjustments.brightness}
                  displayValue={Math.round((adjustments.brightness - 1) * 100)}
                  onValueChange={(v) => updateAdjustment("brightness", v)}
                />

                {/* Contrast */}
                <AdjustmentSlider
                  label="Contrast"
                  icon="contrast-outline"
                  minimumValue={0.5}
                  maximumValue={1.5}
                  step={0.01}
                  value={adjustments.contrast}
                  displayValue={Math.round((adjustments.contrast - 1) * 100)}
                  onValueChange={(v) => updateAdjustment("contrast", v)}
                />

                {/* Saturation */}
                <AdjustmentSlider
                  label="Saturation"
                  icon="color-palette-outline"
                  minimumValue={0}
                  maximumValue={2}
                  step={0.01}
                  value={adjustments.saturation}
                  displayValue={Math.round((adjustments.saturation - 1) * 100)}
                  onValueChange={(v) => updateAdjustment("saturation", v)}
                />

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
                label={isSigningUp ? "Creating..." : "Create Account"}
                onPress={handleCreateAccount}
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

      <Modal
        animationType="fade"
        transparent
        visible={isExporting}
      >
        <View style={modalStyles.overlay}>
          <View
            style={[
              modalStyles.sheet,
              {
                alignItems: "center",
                paddingBottom: spacing.xl,
              },
            ]}
          >
            <View style={modalStyles.handle} />
            <Text style={modalStyles.sheetEyebrow}>Exporting</Text>
            <Text
              style={[
                modalStyles.sheetTitle,
                {
                  fontSize: 20,
                  lineHeight: 28,
                  textAlign: "center",
                },
              ]}
            >
              Rendering your edited image and saving the export metadata.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(exportResult)}
        onRequestClose={() => setExportResult(null)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.sheetEyebrow}>Export Complete</Text>
            <Text style={modalStyles.sheetTitle}>
              Your original and edited images have been exported.
            </Text>

            {exportResult?.editedAssetUrl ? (
              <Image
                source={{ uri: exportResult.editedAssetUrl }}
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 20,
                  marginTop: spacing.lg,
                  backgroundColor: colors.surfaceAlt,
                }}
                resizeMode="cover"
              />
            ) : null}

            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: 22,
                marginTop: spacing.md,
              }}
            >
              Project ID: {exportResult?.projectId}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: 22,
                marginTop: spacing.xs,
              }}
            >
              Both asset URLs are now stored in MongoDB project metadata.
            </Text>

            <View style={modalStyles.actionRow}>
              <Button
                label="Open Edited"
                onPress={() => Linking.openURL(exportResult.editedAssetUrl)}
                style={modalStyles.halfButton}
              />
              <Button
                label="Done"
                variant="secondary"
                onPress={() => setExportResult(null)}
                style={modalStyles.halfButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
