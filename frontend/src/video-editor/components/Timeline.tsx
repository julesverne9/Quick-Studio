import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "../../theme/tokens";
import {
  setActiveItem,
  setCurrentTime,
  setZoomLevel,
} from "../../store/videoEditorSlice";
import { Track, TrackItem } from "../types";

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
    if (isPlaying || !isUserDraggingRef.current) return; // only sync when user is physically dragging
    
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

  // Helper to get color of item based on type
  const getItemColor = (type: string, isSelected: boolean) => {
    if (isSelected) return colors.accentStrong;
    switch (type) {
      case "video":
        return "#1e3a8a"; // Deep Blue
      case "overlay":
        return "#581c87"; // Deep Purple
      case "audio":
        return "#064e3b"; // Deep Green
      case "text":
        return "#78350f"; // Brown/Orange
      case "sticker":
        return "#831843"; // Deep Pink
      default:
        return colors.surfaceSoft;
    }
  };

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
              {currentProject.tracks.map((track: Track) => (
                <View key={track.id} style={[styles.trackRow, { width: timelineContentWidth }]}>
                  {/* Track icon and name tag */}
                  <View style={styles.trackHeader}>
                    <Text style={styles.trackHeaderText} numberOfLines={1}>
                      {track.name}
                    </Text>
                  </View>

                  {/* Track content area */}
                  <View style={[styles.trackContent, { width: timelineContentWidth }]}>
                    {track.items.map((item: TrackItem) => {
                      const isSelected = activeItemId === item.id;
                      const left = timeToPx(item.startOffsetMs);
                      const width = timeToPx(item.durationMs);

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => selectClip(track.id, item.id)}
                          style={[
                            styles.clipBlock,
                            {
                              left,
                              width,
                              backgroundColor: getItemColor(item.type, isSelected),
                              borderColor: isSelected ? colors.text : colors.border,
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                        >
                          <Text style={styles.clipLabel} numberOfLines={1}>
                            {item.name}
                          </Text>

                          {/* Render keyframe indicators on block */}
                          {item.keyframes.map((k, index) => (
                            <View
                              key={`k-${index}`}
                              style={{
                                position: "absolute",
                                left: timeToPx(k.timeOffsetMs),
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
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Fixed vertical Playhead cursor red line */}
        <View style={styles.playheadLine} pointerEvents="none">
          <View style={styles.playheadHandle} />
        </View>
      </View>
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
