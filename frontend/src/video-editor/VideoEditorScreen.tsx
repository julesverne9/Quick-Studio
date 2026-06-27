import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";
import axios from "axios";

import { colors, spacing } from "../theme/tokens";
import {
  undo,
  redo,
  setPlaying,
  setCurrentTime,
  updateExportSettings,
  saveCurrentProjectToSavedDrafts,
  selectProject,
} from "../store/videoEditorSlice";
import { saveProjectsToDisk } from "./utils/projectPersistence";

import PreviewPlayer from "./components/PreviewPlayer";
import Timeline from "./components/Timeline";
import Controls from "./components/Controls";
import EditorHome from "./components/EditorHome";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

export default function VideoEditorScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch();

  const currentProject = useSelector((state: any) => state.videoEditor.currentProject);
  const projects = useSelector((state: any) => state.videoEditor.projects);
  const currentTimeMs = useSelector((state: any) => state.videoEditor.currentTimeMs);
  const isPlaying = useSelector((state: any) => state.videoEditor.isPlaying);
  const exportSettings = useSelector((state: any) => state.videoEditor.exportSettings);

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  // Autosave Project Drafts to storage every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentProject) {
        dispatch(saveCurrentProjectToSavedDrafts());
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [currentProject]);

  // Keep AsyncStorage synced when the projects list changes
  useEffect(() => {
    if (projects.length > 0) {
      saveProjectsToDisk(projects);
    }
  }, [projects]);

  // Socket.io connection for real-time video compilation progress tracking
  useEffect(() => {
    if (!isExporting) return;

    const socket = io(API_BASE_URL);

    socket.on("connect", () => {
      console.log("Connected to render updates socket.");
    });

    socket.on("render-progress", (data: { projectId: string; progress: number }) => {
      if (currentProject && data.projectId === currentProject.id) {
        setExportProgress(Math.round(data.progress));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isExporting, currentProject]);

  // Estimate compiled output size in MB
  const durationSeconds = currentProject ? currentProject.durationMs / 1000 : 0;
  const estimatedSizeMB = ((exportSettings.bitrateMbps * durationSeconds) / 8).toFixed(1);

  const triggerExport = async () => {
    if (!currentProject) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportedVideoUrl(null);

    try {
      // Trigger background compilation on backend
      const response = await axios.post(`${API_BASE_URL}/api/video/render`, {
        projectId: currentProject.id,
        name: currentProject.name,
        tracks: currentProject.tracks,
        durationMs: currentProject.durationMs,
        exportSettings: exportSettings,
      });

      if (response.data.success) {
        // Render completed (or running in bg)
        if (response.data.status === "completed") {
          setExportProgress(100);
          setExportedVideoUrl(response.data.editedAssetUrl);
          Alert.alert("Render Completed", "Your premium video compiled successfully.");
        } else {
          // It is processing in background, socket will update percentage
          Alert.alert("Render Processing", "Exporting has started in the background.");
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Export Failed",
        error.response?.data?.error || "Error initializing FFmpeg transcoder."
      );
      setIsExporting(false);
    }
  };

  const handlePlayPause = () => {
    dispatch(setPlaying(!isPlaying));
  };

  const formatTime = (timeMs: number) => {
    const mins = Math.floor(timeMs / 60000);
    const secs = Math.floor((timeMs % 60000) / 1000);
    const ms = Math.floor((timeMs % 1000) / 10);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}:${ms.toString().padStart(2, "0")}`;
  };

  if (!currentProject) {
    return (
      <EditorHome
        onSelectProject={(id) => dispatch(selectProject(id))}
        onClose={onBack}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Controls bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => dispatch(selectProject(""))} // Deselect to return to Video Home
          style={styles.headerBtn}
        >
          <Ionicons name="home-outline" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.undoRedoGroup}>
          <Pressable onPress={() => dispatch(undo())} style={styles.headerBtn}>
            <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => dispatch(redo())} style={styles.headerBtn}>
            <Ionicons name="arrow-redo-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Text style={styles.projectName} numberOfLines={1}>
          {currentProject.name}
        </Text>

        <Pressable
          onPress={() => setShowExportModal(true)}
          style={[styles.headerBtn, styles.exportBtn]}
        >
          <Text style={styles.exportBtnText}>Export</Text>
        </Pressable>
      </View>

      {/* Video Preview viewport */}
      <View style={styles.previewContainer}>
        <PreviewPlayer />
      </View>

      {/* Timecode and Play/Pause dock row */}
      <View style={styles.playbackControls}>
        <Text style={styles.timecode}>{formatTime(currentTimeMs)}</Text>

        <Pressable onPress={handlePlayPause} style={styles.playPauseBtn}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="#000"
          />
        </Pressable>

        <Text style={styles.totalDuration}>
          {formatTime(currentProject.durationMs)}
        </Text>
      </View>

      {/* Multi-Track timeline container */}
      <View style={styles.timelineContainer}>
        <Timeline />
      </View>

      {/* Tools Contextual controller dock */}
      <View style={styles.toolsDock}>
        <Controls />
      </View>

      {/* Export Settings & Progress Modal overlay */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.exportSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Export Configurations</Text>
              <Pressable
                onPress={() => {
                  setShowExportModal(false);
                  setIsExporting(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {isExporting ? (
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>
                  {exportProgress < 100
                    ? `Encoding Video Timelines: ${exportProgress}%`
                    : "Transcoding complete!"}
                </Text>

                {/* Horizontal Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${exportProgress}%` }]} />
                </View>

                {exportedVideoUrl ? (
                  <View style={{ marginTop: spacing.md, alignItems: "center" }}>
                    <Text style={{ color: colors.success, fontSize: 13, fontWeight: "700" }}>
                      Compiled MP4 available!
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                      {exportedVideoUrl}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.estimatedTimeText}>
                    FFmpeg background compiler processing clips...
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.settingsGroup}>
                {/* Resolution */}
                <Text style={styles.sectionLabel}>Resolution</Text>
                <View style={styles.optionsRow}>
                  {["1080p", "2K", "4K"].map((res) => (
                    <Pressable
                      key={res}
                      onPress={() => dispatch(updateExportSettings({ resolution: res as any }))}
                      style={[
                        styles.optionChip,
                        exportSettings.resolution === res && styles.optionChipActive,
                      ]}
                    >
                      <Text style={styles.optionChipText}>{res}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Framerate */}
                <Text style={styles.sectionLabel}>Frame Rate</Text>
                <View style={styles.optionsRow}>
                  {[24, 30, 60].map((fps) => (
                    <Pressable
                      key={fps}
                      onPress={() => dispatch(updateExportSettings({ fps: fps as any }))}
                      style={[
                        styles.optionChip,
                        exportSettings.fps === fps && styles.optionChipActive,
                      ]}
                    >
                      <Text style={styles.optionChipText}>{fps} FPS</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Codec */}
                <Text style={styles.sectionLabel}>Format Codec</Text>
                <View style={styles.optionsRow}>
                  {["h264", "hevc"].map((codec) => (
                    <Pressable
                      key={codec}
                      onPress={() => dispatch(updateExportSettings({ codec: codec as any }))}
                      style={[
                        styles.optionChip,
                        exportSettings.codec === codec && styles.optionChipActive,
                      ]}
                    >
                      <Text style={styles.optionChipText}>
                        {codec === "h264" ? "H.264 (MP4)" : "H.265 (HEVC)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Estimated size */}
                <View style={styles.estSizeContainer}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <Text style={styles.estSizeText}>
                    Estimated output size: ~{estimatedSizeMB} MB
                  </Text>
                </View>

                <Pressable onPress={triggerExport} style={styles.startExportBtn}>
                  <Text style={styles.startExportBtnText}>Compile & Render</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  undoRedoGroup: {
    flexDirection: "row",
    gap: 8,
  },
  projectName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: spacing.md,
  },
  exportBtn: {
    width: 68,
    borderRadius: 18,
    backgroundColor: colors.accentStrong,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  previewContainer: {
    height: 240,
    width: "100%",
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
  },
  timecode: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  totalDuration: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  playPauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineContainer: {
    flex: 1,
  },
  toolsDock: {
    height: 76,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  exportSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  progressContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  progressLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  estimatedTimeText: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 4,
  },
  settingsGroup: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionChip: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  optionChipActive: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accent,
  },
  optionChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  estSizeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: 8,
    gap: 8,
    marginVertical: spacing.xs,
  },
  estSizeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  startExportBtn: {
    backgroundColor: colors.accentStrong,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  startExportBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
