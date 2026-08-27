import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";

import { colors, spacing } from "../../theme/tokens";
import { addTrackItem } from "../../store/videoEditorSlice";
import { Track, TrackItem } from "../types";

export interface SoundItem {
  id: string;
  name: string;
  category: "music" | "fx" | "voice";
  durationMs: number;
  genre?: string;
  author?: string;
}

const STOCK_MUSIC: SoundItem[] = [
  { id: "snd-1", name: "Summer Breeze", category: "music", durationMs: 8000, genre: "Lofi / Chill", author: "QuickStudio Audio" },
  { id: "snd-2", name: "Urban Drive", category: "music", durationMs: 6500, genre: "Hip-Hop / Beat", author: "Beat Lab" },
  { id: "snd-3", name: "Cyber Pulse", category: "music", durationMs: 7200, genre: "Synthwave", author: "Neon Waves" },
  { id: "snd-4", name: "Acoustic Sun", category: "music", durationMs: 9000, genre: "Indie Acoustic", author: "Folk Studio" },
  { id: "snd-5", name: "Cinematic Rise", category: "music", durationMs: 10000, genre: "Orchestral", author: "Epic Sound" },
  { id: "snd-6", name: "Trap Voltage", category: "music", durationMs: 6000, genre: "Trap Beat", author: "808 Bass" },
];

const STOCK_FX: SoundItem[] = [
  { id: "fx-1", name: "Whoosh Transition", category: "fx", durationMs: 1500, genre: "Transition" },
  { id: "fx-2", name: "Camera Shutter", category: "fx", durationMs: 800, genre: "Foley" },
  { id: "fx-3", name: "Pop Bubble", category: "fx", durationMs: 600, genre: "UI" },
  { id: "fx-4", name: "Vinyl Scratch", category: "fx", durationMs: 1800, genre: "Music FX" },
  { id: "fx-5", name: "Laser Zap", category: "fx", durationMs: 1200, genre: "Sci-Fi" },
  { id: "fx-6", name: "Notification Ding", category: "fx", durationMs: 900, genre: "Chime" },
];

interface MediaDrawerProps {
  visible: boolean;
  initialTab?: "sounds" | "fx" | "videos" | "voice";
  onClose: () => void;
}

export default function MediaDrawer({ visible, initialTab = "sounds", onClose }: MediaDrawerProps) {
  const dispatch = useDispatch();
  const currentProject = useSelector((state: any) => state.videoEditor.currentProject);
  const currentTimeMs = useSelector((state: any) => state.videoEditor.currentTimeMs);

  const [activeTab, setActiveTab] = useState<"sounds" | "fx" | "videos" | "voice">(initialTab);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  if (!visible || !currentProject) return null;

  // Add Audio/Sound item to Music Track
  const handleAddSound = (sound: SoundItem, targetOffset?: number) => {
    const musicTrack = currentProject.tracks.find((t: Track) => t.id === "track-audio-music");
    
    let startPos = targetOffset ?? currentTimeMs;
    if (targetOffset === undefined && musicTrack && musicTrack.items.length > 0) {
      const lastItem = musicTrack.items[musicTrack.items.length - 1];
      const endOfLast = lastItem.startOffsetMs + lastItem.durationMs;
      startPos = currentTimeMs > 0 ? currentTimeMs : endOfLast;
    }

    const newItem: TrackItem = {
      id: `audio-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      type: "audio",
      name: sound.name,
      sourceUri: sound.id,
      startOffsetMs: startPos,
      durationMs: sound.durationMs,
      startCutMs: 0,
      endCutMs: 0,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1.0,
      speed: 1.0,
      filterPreset: "original",
      adjustments: { brightness: 1, contrast: 1, saturation: 1 },
      keyframes: [],
    };

    dispatch(addTrackItem({ trackId: "track-audio-music", item: newItem }));
    Alert.alert("Audio Added", `"${sound.name}" added to Music Track at ${(startPos / 1000).toFixed(1)}s`);
    onClose();
  };

  // Add Voiceover item to Voice Track
  const handleAddVoiceover = (name: string, durationMs: number) => {
    const newItem: TrackItem = {
      id: `voice-${Date.now()}`,
      type: "audio",
      name,
      sourceUri: `voice-${Date.now()}`,
      startOffsetMs: currentTimeMs,
      durationMs,
      startCutMs: 0,
      endCutMs: 0,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1.0,
      speed: 1.0,
      filterPreset: "original",
      adjustments: { brightness: 1, contrast: 1, saturation: 1 },
      keyframes: [],
    };

    dispatch(addTrackItem({ trackId: "track-audio-voice", item: newItem }));
    Alert.alert("Voice Added", `"${name}" added to Voice-over Track.`);
    onClose();
  };

  // Pick Video from gallery to append to Main Video Track
  const handlePickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow gallery access to import video clips.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const duration = asset.duration ? Math.round(asset.duration) : 5000;

    const mainTrack = currentProject.tracks.find((t: Track) => t.id === "track-video-main");
    let startOffset = currentTimeMs;
    if (mainTrack && mainTrack.items.length > 0) {
      const lastItem = mainTrack.items[mainTrack.items.length - 1];
      startOffset = lastItem.startOffsetMs + lastItem.durationMs;
    }

    const newItem: TrackItem = {
      id: `video-${Date.now()}`,
      type: "video",
      name: asset.fileName || `Clip ${mainTrack ? mainTrack.items.length + 1 : 1}`,
      sourceUri: asset.uri,
      startOffsetMs: startOffset,
      durationMs: duration,
      startCutMs: 0,
      endCutMs: 0,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1.0,
      speed: 1.0,
      filterPreset: "original",
      adjustments: { brightness: 1, contrast: 1, saturation: 1 },
      keyframes: [],
    };

    dispatch(addTrackItem({ trackId: "track-video-main", item: newItem }));
    Alert.alert("Video Added", `Imported video to Main Video Track.`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="musical-notes" size={20} color={colors.accent} />
              <Text style={styles.title}>Media & Audio Hub</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setActiveTab("sounds")}
              style={[styles.tabBtn, activeTab === "sounds" && styles.tabBtnActive]}
            >
              <Ionicons name="musical-note-outline" size={16} color={activeTab === "sounds" ? "#fff" : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "sounds" && styles.tabTextActive]}>Sounds</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("fx")}
              style={[styles.tabBtn, activeTab === "fx" && styles.tabBtnActive]}
            >
              <Ionicons name="sparkles-outline" size={16} color={activeTab === "fx" ? "#fff" : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "fx" && styles.tabTextActive]}>Sound FX</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("videos")}
              style={[styles.tabBtn, activeTab === "videos" && styles.tabBtnActive]}
            >
              <Ionicons name="videocam-outline" size={16} color={activeTab === "videos" ? "#fff" : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "videos" && styles.tabTextActive]}>Videos</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("voice")}
              style={[styles.tabBtn, activeTab === "voice" && styles.tabBtnActive]}
            >
              <Ionicons name="mic-outline" size={16} color={activeTab === "voice" ? "#fff" : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "voice" && styles.tabTextActive]}>Voice</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTab === "sounds" && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionSubtitle}>Studio Music Tracks (Tap + to add to Music Track)</Text>
                {STOCK_MUSIC.map((sound) => (
                  <View key={sound.id} style={styles.mediaCard}>
                    <Pressable
                      onPress={() => setPlayingPreviewId(playingPreviewId === sound.id ? null : sound.id)}
                      style={styles.previewPlayBtn}
                    >
                      <Ionicons
                        name={playingPreviewId === sound.id ? "pause-circle" : "play-circle"}
                        size={32}
                        color={colors.accent}
                      />
                    </Pressable>

                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{sound.name}</Text>
                      <Text style={styles.cardMeta}>{sound.genre} • {(sound.durationMs / 1000).toFixed(1)}s</Text>
                    </View>

                    <Pressable
                      onPress={() => handleAddSound(sound)}
                      style={styles.addBtn}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {activeTab === "fx" && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionSubtitle}>Sound Effects (Transitions, Foley & UI)</Text>
                {STOCK_FX.map((fx) => (
                  <View key={fx.id} style={styles.mediaCard}>
                    <View style={[styles.previewPlayBtn, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
                      <Ionicons name="sparkles" size={18} color={colors.accent} />
                    </View>

                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{fx.name}</Text>
                      <Text style={styles.cardMeta}>{fx.genre} • {(fx.durationMs / 1000).toFixed(1)}s</Text>
                    </View>

                    <Pressable
                      onPress={() => handleAddSound(fx)}
                      style={styles.addBtn}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {activeTab === "videos" && (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: spacing.lg }}>
                <Ionicons name="film-outline" size={48} color={colors.accent} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginTop: spacing.sm }}>
                  Import Video Clips
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 4, maxWidth: 260 }}>
                  Add video media to append to the Main Video Track on your timeline.
                </Text>

                <Pressable
                  onPress={handlePickVideo}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.accentStrong,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderRadius: 12,
                    marginTop: spacing.lg,
                    gap: 8,
                  }}
                >
                  <Ionicons name="image-outline" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Open Gallery</Text>
                </Pressable>
              </View>
            )}

            {activeTab === "voice" && (
              <View style={{ paddingVertical: spacing.sm }}>
                <Text style={styles.sectionSubtitle}>AI Text-to-Speech Voiceover</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TextInput
                    value={voiceText}
                    onChangeText={setVoiceText}
                    placeholder="Enter script for voiceover..."
                    placeholderTextColor={colors.textSoft}
                    style={styles.voiceInput}
                  />
                  <Pressable
                    onPress={() => {
                      if (!voiceText.trim()) return;
                      handleAddVoiceover(`Voice: ${voiceText.substring(0, 12)}...`, 4500);
                      setVoiceText("");
                    }}
                    style={styles.generateBtn}
                  >
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Gen</Text>
                  </Pressable>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

                <Text style={styles.sectionSubtitle}>Live Voice Recording</Text>
                <View style={{ alignItems: "center", marginTop: spacing.md }}>
                  <Pressable
                    onPress={() => {
                      if (isRecording) {
                        setIsRecording(false);
                        handleAddVoiceover(`Recorded Audio (${recordDuration}s)`, Math.max(2000, recordDuration * 1000));
                        setRecordDuration(0);
                      } else {
                        setIsRecording(true);
                        setRecordDuration(3);
                      }
                    }}
                    style={[
                      styles.recordButton,
                      isRecording && styles.recordButtonActive,
                    ]}
                  >
                    <Ionicons name={isRecording ? "stop" : "mic"} size={28} color="#fff" />
                  </Pressable>
                  <Text style={{ color: isRecording ? colors.danger : colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 8 }}>
                    {isRecording ? "Tap to Stop Recording" : "Tap to Record to Voice Track"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    maxHeight: "75%",
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: colors.accentStrong,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff",
  },
  newBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
  },
  content: {
    padding: spacing.md,
    minHeight: 280,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  cardMeta: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  voiceInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    color: "#fff",
    fontSize: 13,
    height: 40,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentStrong,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  recordButtonActive: {
    backgroundColor: colors.danger,
  },
});
