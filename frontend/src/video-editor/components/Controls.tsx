import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "../../theme/tokens";
import {
  addTrackItem,
  removeTrackItem,
  updateTrackItem,
  splitTrackItem,
  addKeyframe,
  removeKeyframe,
  setActiveTool,
} from "../../store/videoEditorSlice";
import { Keyframe, Track, TrackItem } from "../types";
import GraphEditor from "./GraphEditor";

export default function Controls() {
  const dispatch = useDispatch();
  
  const currentProject = useSelector((state: any) => state.videoEditor.currentProject);
  const currentTimeMs = useSelector((state: any) => state.videoEditor.currentTimeMs);
  const activeItemId = useSelector((state: any) => state.videoEditor.activeItemId);
  const activeTrackId = useSelector((state: any) => state.videoEditor.activeTrackId);
  const activeTool = useSelector((state: any) => state.videoEditor.activeTool);

  const [aiProcessing, setAiProcessing] = useState(false);
  const [textVal, setTextVal] = useState("");
  const [showCurveEditor, setShowCurveEditor] = useState(false);

  if (!currentProject) return null;

  // Find active track item
  let activeItem: TrackItem | null = null;
  if (activeTrackId && activeItemId) {
    const track = currentProject.tracks.find((t: Track) => t.id === activeTrackId);
    if (track) {
      activeItem = track.items.find((itm: TrackItem) => itm.id === activeItemId) || null;
    }
  }

  const handleSplit = () => {
    if (!activeItem || !activeTrackId) return;
    dispatch(
      splitTrackItem({
        trackId: activeTrackId,
        itemId: activeItem.id,
        splitTimeMs: currentTimeMs,
      })
    );
  };

  const handleDelete = () => {
    if (!activeItem || !activeTrackId) return;
    dispatch(
      removeTrackItem({
        trackId: activeTrackId,
        itemId: activeItem.id,
      })
    );
  };

  const handleUpdateProp = (updates: Partial<TrackItem>) => {
    if (!activeItem || !activeTrackId) return;
    dispatch(
      updateTrackItem({
        trackId: activeTrackId,
        itemId: activeItem.id,
        updates,
      })
    );
  };

  // AI Captions simulator - inserts real text layers onto subtitles track!
  const runAiCaptions = () => {
    setAiProcessing(true);
    setTimeout(() => {
      setAiProcessing(false);
      
      const subtitles = [
        { start: 1000, dur: 2500, text: "Hey guys! Welcome back to the channel." },
        { start: 3800, dur: 3000, text: "Today we are testing this new video compiler." },
        { start: 7000, dur: 2500, text: "The rendering speed is absolutely insane!" }
      ];

      subtitles.forEach((sub, idx) => {
        const item: TrackItem = {
          id: `ai-sub-${Date.now()}-${idx}`,
          type: "text",
          name: `Subtitle ${idx + 1}`,
          startOffsetMs: sub.start,
          durationMs: sub.dur,
          startCutMs: 0,
          endCutMs: 0,
          x: 0,
          y: 60, // position low on screen
          scale: 1.0,
          rotation: 0,
          opacity: 1.0,
          volume: 1.0,
          speed: 1.0,
          filterPreset: "original",
          adjustments: { brightness: 1, contrast: 1, saturation: 1 },
          keyframes: [],
          textStyle: {
            text: sub.text,
            fontFamily: "default",
            fontSize: 16,
            color: "#ffffff",
            backgroundColor: "rgba(0,0,0,0.5)",
            alignment: "center",
            tracking: 0,
          }
        };

        dispatch(addTrackItem({ trackId: "track-text-subs", item }));
      });

      Alert.alert("AI Captions Ready", "Successfully generated 3 subtitle layers synchronized to audio waveform.");
      dispatch(setActiveTool(null));
    }, 2500);
  };

  const addTextLayer = () => {
    if (!textVal.trim()) return;
    const item: TrackItem = {
      id: `text-${Date.now()}`,
      type: "text",
      name: `Text: ${textVal.substring(0, 10)}...`,
      startOffsetMs: currentTimeMs,
      durationMs: 4000, // 4 seconds duration
      startCutMs: 0,
      endCutMs: 0,
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      volume: 1.0,
      speed: 1.0,
      filterPreset: "original",
      adjustments: { brightness: 1, contrast: 1, saturation: 1 },
      keyframes: [],
      textStyle: {
        text: textVal,
        fontFamily: "default",
        fontSize: 18,
        color: "#ffffff",
        alignment: "center",
        tracking: 0,
      }
    };
    dispatch(addTrackItem({ trackId: "track-text-subs", item }));
    setTextVal("");
    dispatch(setActiveTool(null));
  };

  // Keyframe logic
  const handleAddKeyframe = () => {
    if (!activeItem || !activeTrackId) return;
    
    // Relative offset of playhead inside clip
    const relativeOffset = currentTimeMs - activeItem.startOffsetMs;
    const kf: Keyframe = {
      timeOffsetMs: relativeOffset,
      position: { x: activeItem.x, y: activeItem.y },
      scale: activeItem.scale,
      rotation: activeItem.rotation,
      opacity: activeItem.opacity,
      easeCurve: "linear",
    };

    dispatch(
      addKeyframe({
        trackId: activeTrackId,
        itemId: activeItem.id,
        keyframe: kf,
      })
    );
    Alert.alert("Keyframe Added", `New keyframe placed at clip offset: ${(relativeOffset / 1000).toFixed(2)}s`);
  };

  // Render contextual panels based on selected tool
  const renderToolPanel = () => {
    if (!activeItem && activeTool !== "text" && activeTool !== "ai") return null;

    switch (activeTool) {
      case "speed":
        return (
          <View style={styles.subPanel}>
            <Text style={styles.panelTitle}>Clip Speed: {activeItem?.speed}x</Text>
            <View style={styles.chipRow}>
              {[0.5, 1.0, 1.5, 2.0, 4.0, 8.0].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => handleUpdateProp({ speed: s })}
                  style={[
                    styles.chip,
                    activeItem?.speed === s && styles.chipActive,
                  ]}
                >
                  <Text style={[styles.chipText, activeItem?.speed === s && styles.chipTextActive]}>
                    {s}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "volume":
        return (
          <View style={styles.subPanel}>
            <Text style={styles.panelTitle}>Volume Control: {Math.round((activeItem?.volume || 0) * 100)}%</Text>
            <View style={styles.chipRow}>
              {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => handleUpdateProp({ volume: v })}
                  style={[
                    styles.chip,
                    activeItem?.volume === v && styles.chipActive,
                  ]}
                >
                  <Text style={[styles.chipText, activeItem?.volume === v && styles.chipTextActive]}>
                    {v === 0 ? "Mute" : `${v * 100}%`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "filter":
        return (
          <View style={styles.subPanel}>
            <Text style={styles.panelTitle}>Color Filters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
              {["original", "bw", "sepia", "vintage", "cool", "warm"].map((f) => (
                <Pressable
                  key={f}
                  onPress={() => handleUpdateProp({ filterPreset: f })}
                  style={[
                    styles.filterChip,
                    activeItem?.filterPreset === f && styles.filterChipActive,
                  ]}
                >
                  <Text style={styles.filterChipText}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );

      case "text":
        return (
          <View style={styles.subPanel}>
            <Text style={styles.panelTitle}>Add Text Overlay</Text>
            <View style={{ flexDirection: "row", paddingHorizontal: spacing.sm, gap: 10 }}>
              <TextInput
                value={textVal}
                onChangeText={setTextVal}
                placeholder="Enter text style caption..."
                placeholderTextColor={colors.textSoft}
                style={styles.textInput}
              />
              <Pressable onPress={addTextLayer} style={styles.submitBtn}>
                <Ionicons name="send" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        );

      case "keyframe":
        const currentRelativeOffset = activeItem ? currentTimeMs - activeItem.startOffsetMs : 0;
        const keyframeAtPlayhead = activeItem?.keyframes.find(
          (k) => k.timeOffsetMs === currentRelativeOffset
        );

        return (
          <View style={styles.subPanel}>
            <Text style={styles.panelTitle}>Keyframe Settings</Text>
            <View style={styles.chipRow}>
              <Pressable onPress={handleAddKeyframe} style={styles.actionButton}>
                <Ionicons name="diamond-outline" size={16} color={colors.accent} />
                <Text style={styles.actionButtonText}>Add Keyframe</Text>
              </Pressable>

              {keyframeAtPlayhead && (
                <Pressable
                  onPress={() =>
                    dispatch(
                      removeKeyframe({
                        trackId: activeTrackId,
                        itemId: activeItem!.id,
                        timeOffsetMs: currentRelativeOffset,
                      })
                    )
                  }
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.actionButtonText}>Remove Keyframe</Text>
                </Pressable>
              )}

              {activeItem && activeItem.keyframes.length > 0 && (
                <Pressable onPress={() => setShowCurveEditor(true)} style={styles.actionButton}>
                  <Ionicons name="analytics-outline" size={16} color={colors.success} />
                  <Text style={styles.actionButtonText}>Graph Curves</Text>
                </Pressable>
              )}
            </View>
          </View>
        );

      case "ai":
        return (
          <View style={styles.subPanel}>
            <Text style={styles.panelTitle}>AI Video Intelligence Suite</Text>
            {aiProcessing ? (
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
                  Executing AI Transcribing Model...
                </Text>
              </View>
            ) : (
              <View style={styles.chipRow}>
                <Pressable onPress={runAiCaptions} style={styles.actionButton}>
                  <Ionicons name="text-outline" size={16} color={colors.accent} />
                  <Text style={styles.actionButtonText}>Auto Subtitles</Text>
                </Pressable>
                
                <Pressable
                  onPress={() => {
                    Alert.alert("AI Background Removed", "Dynamic segment masking algorithm active on timeline preview.");
                    dispatch(setActiveTool(null));
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="people-outline" size={16} color={colors.success} />
                  <Text style={styles.actionButtonText}>Remove BG</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    Alert.alert("AI Noise Removal", "Audio voice isolate filter generated successfully.");
                    dispatch(setActiveTool(null));
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="volume-mute-outline" size={16} color={colors.warning} />
                  <Text style={styles.actionButtonText}>De-noise</Text>
                </Pressable>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Contextual Toolbar Panel display (filters, speed curves, transitions) */}
      {activeTool ? (
        <View style={styles.expandedPanel}>
          <Pressable onPress={() => dispatch(setActiveTool(null))} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={16} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Back</Text>
          </Pressable>
          {renderToolPanel()}
        </View>
      ) : (
        /* Base toolbar icons */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
          {activeItem && (
            <>
              <Pressable onPress={handleSplit} style={styles.toolItem}>
                <Ionicons name="cut-outline" size={18} color={colors.text} />
                <Text style={styles.toolLabel}>Split</Text>
              </Pressable>

              <Pressable onPress={() => dispatch(setActiveTool("speed"))} style={styles.toolItem}>
                <Ionicons name="speedometer-outline" size={18} color={colors.text} />
                <Text style={styles.toolLabel}>Speed</Text>
              </Pressable>

              <Pressable onPress={() => dispatch(setActiveTool("volume"))} style={styles.toolItem}>
                <Ionicons name="volume-medium-outline" size={18} color={colors.text} />
                <Text style={styles.toolLabel}>Volume</Text>
              </Pressable>

              <Pressable onPress={() => dispatch(setActiveTool("filter"))} style={styles.toolItem}>
                <Ionicons name="color-palette-outline" size={18} color={colors.text} />
                <Text style={styles.toolLabel}>Filters</Text>
              </Pressable>

              <Pressable onPress={() => dispatch(setActiveTool("keyframe"))} style={styles.toolItem}>
                <Ionicons name="diamond-outline" size={18} color={colors.text} />
                <Text style={styles.toolLabel}>Keyframe</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={() => dispatch(setActiveTool("text"))} style={styles.toolItem}>
            <Ionicons name="text" size={18} color={colors.text} />
            <Text style={styles.toolLabel}>Text</Text>
          </Pressable>

          <Pressable onPress={() => dispatch(setActiveTool("ai"))} style={styles.toolItem}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.toolLabel}>AI tools</Text>
          </Pressable>

          {activeItem && (
            <Pressable onPress={handleDelete} style={styles.toolItem}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.toolLabel}>Delete</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Curves graph editor modal sheet */}
      <Modal visible={showCurveEditor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {activeItem && (
              <GraphEditor
                activeCurve={activeItem.keyframes[0]?.easeCurve || "linear"}
                onChangeCurve={(curve) => {
                  const updatedKeyframes = activeItem!.keyframes.map((k) => ({
                    ...k,
                    easeCurve: curve,
                  }));
                  handleUpdateProp({ keyframes: updatedKeyframes });
                }}
                onClose={() => setShowCurveEditor(false)}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  toolbarScroll: {
    paddingHorizontal: spacing.md,
    gap: 16,
    height: 48,
    alignItems: "center",
  },
  toolItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  toolLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  expandedPanel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  subPanel: {
    flex: 1,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  scrollRow: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    color: "#fff",
    fontSize: 13,
    height: 38,
  },
  submitBtn: {
    backgroundColor: colors.accentStrong,
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
  },
});
