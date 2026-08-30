import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  PanResponder,
  Animated as RNAnimated,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { colors, spacing } from "../../theme/tokens";
import {
  addTrackItem,
  reorderTrackItems,
  setActiveItem,
  setCurrentTime,
  setZoomLevel,
} from "../../store/videoEditorSlice";
import { Track, TrackItem } from "../types";
import MediaDrawer from "./MediaDrawer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TIMELINE_CENTER_OFFSET = SCREEN_WIDTH / 2;

export default function Timeline() {
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserDraggingRef = useRef(false);

  const currentProject = useSelector((state: any) => state.videoEditor.currentProject);
  const currentTimeMs = useSelector((state: any) => state.videoEditor.currentTimeMs);
  const isPlaying = useSelector((state: any) => state.videoEditor.isPlaying);
  const zoomLevel = useSelector((state: any) => state.videoEditor.zoomLevel); // px per second
  const activeItemId = useSelector((state: any) => state.videoEditor.activeItemId);

  const [showAudioDrawer, setShowAudioDrawer] = useState(false);

  // Sync timeline scroll with playback and currentTime changes
  useEffect(() => {
    if (scrollViewRef.current && !isUserDraggingRef.current) {
      const seconds = currentTimeMs / 1000;
      const scrollX = seconds * zoomLevel;
      scrollViewRef.current.scrollTo({ x: scrollX, animated: false });
    }
  }, [currentTimeMs, zoomLevel]);

  if (!currentProject) return null;

  const handleScrollBeginDrag = () => {
    isUserDraggingRef.current = true;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isPlaying || !isUserDraggingRef.current) return;
    
    const scrollX = event.nativeEvent.contentOffset.x;
    const timeMs = (scrollX / zoomLevel) * 1000;
    dispatch(setCurrentTime(Math.round(timeMs)));
  };

  const handleScrollEnd = () => {
    isUserDraggingRef.current = false;
  };

  // Convert time to pixels
  const timeToPx = (timeMs: number) => {
    return (timeMs / 1000) * zoomLevel;
  };

  // Pick video to append directly to Main Video Track
  const handlePickVideoForMainTrack = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow gallery access to import videos.");
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
    let startOffset = 0;
    if (mainTrack && mainTrack.items.length > 0) {
      const lastItem = mainTrack.items[mainTrack.items.length - 1];
      startOffset = lastItem.startOffsetMs + lastItem.durationMs;
    }

    const newItem: TrackItem = {
      id: `video-${Date.now()}`,
      type: "video",
      name: asset.fileName || `Clip ${(mainTrack?.items.length || 0) + 1}`,
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
  };

  // Helper to get color of item based on type
  const getItemColor = (type: string, isSelected: boolean) => {
    if (isSelected) return colors.accentStrong;
    switch (type) {
      case "video":
        return "#1e3a8a"; // Deep Blue
      case "overlay":
        return "#581c87"; // Deep Purple
      case "audio":
        return "#0f766e"; // Teal / Waveform cyan-green
      case "text":
        return "#78350f"; // Brown/Orange
      case "sticker":
        return "#831843"; // Deep Pink
      default:
        return colors.surfaceSoft;
    }
  };

  function DraggableClip({
    item,
    trackId,
    isSelected,
    zoomLevel,
    onSelect
  }: {
    item: TrackItem,
    trackId: string,
    isSelected: boolean,
    zoomLevel: number,
    onSelect: (trackId: string, itemId: string) => void
  }) {
    const dispatch = useDispatch();
    const pan = useRef(new RNAnimated.ValueXY()).current;
    const isDragging = useRef(false);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          isDragging.current = true;
          onSelect(trackId, item.id);
        },
        onPanResponderMove: RNAnimated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (e, gestureState) => {
          isDragging.current = false;

          // Calculate reorder
          const left = (item.startOffsetMs / 1000) * zoomLevel;
          const width = (item.durationMs / 1000) * zoomLevel;
          const currentCenter = left + gestureState.dx + width / 2;

          handleReorder(trackId, item.id, currentCenter);

          RNAnimated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        },
      })
    ).current;

    const handleReorder = (tid: string, iid: string, centerPos: number) => {
      const track = currentProject.tracks.find((t: Track) => t.id === tid);
      if (!track) return;

      const newItems = [...track.items];
      const draggedIndex = newItems.findIndex(i => i.id === iid);
      if (draggedIndex === -1) return;

      const draggedItem = newItems.splice(draggedIndex, 1)[0];

      // Find insertion point
      let insertIndex = 0;
      let currentEdge = 0;
      for (let i = 0; i < newItems.length; i++) {
        const itemWidth = (newItems[i].durationMs / 1000) * zoomLevel;
        const itemCenter = currentEdge + itemWidth / 2;
        if (centerPos < itemCenter) {
          insertIndex = i;
          break;
        }
        currentEdge += itemWidth;
        insertIndex = i + 1;
      }

      newItems.splice(insertIndex, 0, draggedItem);
      dispatch(reorderTrackItems({ trackId: tid, newItems }));
    };

    const left = (item.startOffsetMs / 1000) * zoomLevel;
    const width = (item.durationMs / 1000) * zoomLevel;

    return (
      <RNAnimated.View
        {...panResponder.panHandlers}
        style={[
          styles.clipBlock,
          {
            left,
            width,
            backgroundColor: getItemColor(item.type, isSelected),
            borderColor: isSelected ? colors.text : colors.border,
            borderWidth: isSelected ? 2 : 1,
            transform: pan.getTranslateTransform(),
            zIndex: isDragging.current ? 100 : 1,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {item.type === "audio" && (
            <Ionicons name="musical-note" size={12} color="#5eead4" />
          )}
          <Text style={styles.clipLabel} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {item.type === "audio" && (
          <View style={styles.waveformContainer}>
            {[4, 8, 14, 6, 12, 16, 8, 14, 10, 6, 15, 9, 12, 5, 14].map((h, i) => (
              <View key={`w-${i}`} style={[styles.waveBar, { height: h }]} />
            ))}
          </View>
        )}

        {item.keyframes.map((k, index) => (
          <View
            key={`k-${index}`}
            style={{
              position: "absolute",
              left: (k.timeOffsetMs / 1000) * zoomLevel,
              top: "50%",
              marginTop: -4,
              width: 8,
              height: 8,
              backgroundColor: colors.accent,
              transform: [{ rotate: "45deg" }],
              zIndex: 10,
            }}
          />
        ))}
      </RNAnimated.View>
    );
  }

  const totalSeconds = Math.max(30, Math.ceil(currentProject.durationMs / 1000) + 10);
  const timelineContentWidth = totalSeconds * zoomLevel;

  // Render rulers/ticks
  const renderRuler = () => {
    const ticks = [];
    
    for (let i = 0; i <= totalSeconds; i++) {
      ticks.push(
        <View
          key={`tick-${i}`}
          style={{
            position: "absolute",
            left: i * zoomLevel,
            width: 1,
            height: i % 5 === 0 ? 12 : 6,
            backgroundColor: i % 5 === 0 ? colors.textMuted : colors.textSoft,
            alignItems: "center",
          }}
        >
          {i % 5 === 0 ? (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 9,
                fontWeight: "700",
                marginTop: 14,
                position: "absolute",
              }}
            >
              {i}s
            </Text>
          ) : null}
        </View>
      );
    }

    return (
      <View style={[styles.rulerContainer, { width: timelineContentWidth }]}>
        {ticks}
      </View>
    );
  };

  const selectClip = (trackId: string, itemId: string) => {
    dispatch(setActiveItem({ trackId, itemId }));
  };

  return (
    <View style={styles.container}>
      {/* Zoom Toolbar */}
      <View style={styles.zoomBar}>
        <Pressable
          onPress={() => dispatch(setZoomLevel(zoomLevel - 3))}
          style={styles.zoomButton}
        >
          <Ionicons name="remove-circle-outline" size={16} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.zoomText}>Timeline Zoom</Text>
        <Pressable
          onPress={() => dispatch(setZoomLevel(zoomLevel + 3))}
          style={styles.zoomButton}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Main Track Editor */}
      <View style={styles.scrollWrapper}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.verticalScrollContent}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            nestedScrollEnabled
            contentContainerStyle={{
              paddingLeft: TIMELINE_CENTER_OFFSET,
              paddingRight: TIMELINE_CENTER_OFFSET,
            }}
          >
            <View style={[styles.tracksContainer, { width: timelineContentWidth }]}>
              {/* Timeline Ruler */}
              {renderRuler()}

              {/* Tracks */}
              {currentProject.tracks.map((track: Track) => {
                const lastItemEndMs = track.items.reduce(
                  (max, itm) => Math.max(max, itm.startOffsetMs + itm.durationMs),
                  0
                );

                return (
                  <View key={track.id} style={[styles.trackRow, { width: timelineContentWidth }]}>
                    {/* Track icon and name tag */}
                    <View style={styles.trackHeader}>
                      <Text style={styles.trackHeaderText} numberOfLines={1}>
                        {track.name}
                      </Text>
                    </View>

                    {/* Track content area */}
                    <View style={[styles.trackContent, { width: timelineContentWidth }]}>
                      {track.items.map((item: TrackItem) => (
                        <DraggableClip
                          key={item.id}
                          item={item}
                          trackId={track.id}
                          isSelected={activeItemId === item.id}
                          zoomLevel={zoomLevel}
                          onSelect={selectClip}
                        />
                      ))}

                      {/* Main Video Track [+] append button */}
                      {track.id === "track-video-main" && (
                        <Pressable
                          onPress={handlePickVideoForMainTrack}
                          style={[
                            styles.addClipBtn,
                            { left: timeToPx(lastItemEndMs) + 8 },
                          ]}
                        >
                          <Ionicons name="add" size={22} color="#fff" />
                        </Pressable>
                      )}

                      {/* Music Track [+ Add audio] button */}
                      {track.id === "track-audio-music" && (
                        <Pressable
                          onPress={() => setShowAudioDrawer(true)}
                          style={[
                            styles.addAudioBtn,
                            { left: timeToPx(lastItemEndMs) + 8 },
                          ]}
                        >
                          <Ionicons name="add" size={13} color={colors.accent} />
                          <Text style={styles.addAudioBtnText}>Add audio</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Fixed vertical Playhead cursor red line */}
        <View style={styles.playheadLine} pointerEvents="none">
          <View style={styles.playheadHandle} />
        </View>
      </View>

      {/* Audio Drawer */}
      <MediaDrawer
        visible={showAudioDrawer}
        initialTab="sounds"
        onClose={() => setShowAudioDrawer(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  zoomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundMuted,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  zoomButton: {
    paddingHorizontal: spacing.md,
  },
  zoomText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollWrapper: {
    flex: 1,
    position: "relative",
  },
  verticalScrollContent: {
    paddingBottom: 80,
  },
  tracksContainer: {
    paddingTop: 36, // leave room for ruler
    paddingBottom: spacing.lg,
  },
  rulerContainer: {
    height: 30,
    position: "absolute",
    top: 0,
    left: 0,
  },
  trackRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    position: "relative",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.4)",
  },
  trackHeader: {
    position: "absolute",
    left: 8,
    top: 4,
    zIndex: 10,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  trackHeaderText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trackContent: {
    flex: 1,
    position: "relative",
    height: "100%",
  },
  clipBlock: {
    position: "absolute",
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  clipLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  addClipBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  addAudioBtn: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(15, 118, 110, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.4)",
    gap: 4,
  },
  addAudioBtnText: {
    color: "#5eead4",
    fontSize: 11,
    fontWeight: "700",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
    height: 16,
  },
  waveBar: {
    width: 2,
    backgroundColor: "#5eead4",
    borderRadius: 1,
    opacity: 0.8,
  },
  playheadLine: {
    position: "absolute",
    left: TIMELINE_CENTER_OFFSET,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.danger,
    zIndex: 200,
    pointerEvents: "none",
  },
  playheadHandle: {
    width: 12,
    height: 12,
    backgroundColor: colors.danger,
    borderRadius: 6,
    alignSelf: "center",
    marginTop: 24, // aligns with timeline ruler bottom
  },
});
