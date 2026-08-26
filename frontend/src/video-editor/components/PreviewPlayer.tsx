import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "../../theme/tokens";
import { setCurrentTime, setPlaying } from "../../store/videoEditorSlice";
import { Keyframe, TrackItem } from "../types";

// Linear interpolation helper
const interpolate = (startVal: number, endVal: number, factor: number) => {
  return startVal + factor * (endVal - startVal);
};

// Keyframe interpolation evaluator
const evaluateKeyframes = (
  keyframes: Keyframe[],
  timeMs: number,
  defaultValues: { x: number; y: number; scale: number; rotation: number; opacity: number }
) => {
  if (!keyframes || keyframes.length === 0) {
    return defaultValues;
  }

  // If time is before the first keyframe, return first keyframe properties
  if (timeMs <= keyframes[0].timeOffsetMs) {
    return {
      x: keyframes[0].position?.x ?? defaultValues.x,
      y: keyframes[0].position?.y ?? defaultValues.y,
      scale: keyframes[0].scale ?? defaultValues.scale,
      rotation: keyframes[0].rotation ?? defaultValues.rotation,
      opacity: keyframes[0].opacity ?? defaultValues.opacity,
    };
  }

  // If time is after the last keyframe, return last keyframe properties
  if (timeMs >= keyframes[keyframes.length - 1].timeOffsetMs) {
    const last = keyframes[keyframes.length - 1];
    return {
      x: last.position?.x ?? defaultValues.x,
      y: last.position?.y ?? defaultValues.y,
      scale: last.scale ?? defaultValues.scale,
      rotation: last.rotation ?? defaultValues.rotation,
      opacity: last.opacity ?? defaultValues.opacity,
    };
  }

  // Find the two keyframes surrounding the current time
  let startNode = keyframes[0];
  let endNode = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (timeMs >= keyframes[i].timeOffsetMs && timeMs <= keyframes[i + 1].timeOffsetMs) {
      startNode = keyframes[i];
      endNode = keyframes[i + 1];
      break;
    }
  }

  const range = endNode.timeOffsetMs - startNode.timeOffsetMs;
  let factor = range === 0 ? 0 : (timeMs - startNode.timeOffsetMs) / range;

  // Apply easing curve
  const ease = startNode.easeCurve || "linear";
  if (ease === "ease-in") {
    factor = factor * factor;
  } else if (ease === "ease-out") {
    factor = factor * (2 - factor);
  } else if (ease === "ease-in-out") {
    factor = factor < 0.5 ? 2 * factor * factor : -1 + (4 - 2 * factor) * factor;
  }

  return {
    x: interpolate(startNode.position?.x ?? defaultValues.x, endNode.position?.x ?? defaultValues.x, factor),
    y: interpolate(startNode.position?.y ?? defaultValues.y, endNode.position?.y ?? defaultValues.y, factor),
    scale: interpolate(startNode.scale ?? defaultValues.scale, endNode.scale ?? defaultValues.scale, factor),
    rotation: interpolate(startNode.rotation ?? defaultValues.rotation, endNode.rotation ?? defaultValues.rotation, factor),
    opacity: interpolate(startNode.opacity ?? defaultValues.opacity, endNode.opacity ?? defaultValues.opacity, factor),
  };
};

export default function PreviewPlayer() {
  const dispatch = useDispatch();
  const videoRef = useRef<Video>(null);

  const currentProject = useSelector((state: any) => state.videoEditor.currentProject);
  const currentTimeMs = useSelector((state: any) => state.videoEditor.currentTimeMs);
  const isPlaying = useSelector((state: any) => state.videoEditor.isPlaying);

  const [isLoading, setIsLoading] = useState(false);
  const [activeVideoItem, setActiveVideoItem] = useState<TrackItem | null>(null);

  // Keep refs in sync for ticker and callbacks
  const isPlayingRef = useRef(isPlaying);
  const currentTimeMsRef = useRef(currentTimeMs);
  const activeVideoItemRef = useRef(activeVideoItem);
  const currentProjectRef = useRef(currentProject);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeMsRef.current = currentTimeMs; }, [currentTimeMs]);
  useEffect(() => { activeVideoItemRef.current = activeVideoItem; }, [activeVideoItem]);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  // Determine active video clip and other overlays at the current playhead
  useEffect(() => {
    if (!currentProject) return;

    // Find main video track and overlays
    const mainVideoTrack = currentProject.tracks.find((t: any) => t.type === "video");
    const activeVideo = mainVideoTrack?.items.find(
      (item: TrackItem) =>
        currentTimeMs >= item.startOffsetMs &&
        currentTimeMs <= item.startOffsetMs + item.durationMs
    );

    if (activeVideo) {
      // If the content (ID or URI) changed, trigger loading state
      if (activeVideoItem?.id !== activeVideo.id || activeVideoItem?.sourceUri !== activeVideo.sourceUri) {
        setIsLoading(true);
      }
      // Always update to catch property changes (volume, speed, etc.)
      setActiveVideoItem(activeVideo);
    } else {
      if (activeVideoItem) {
        setActiveVideoItem(null);
        setIsLoading(false);
      }
    }
  }, [currentTimeMs, currentProject]);

  // Sync seek position when playhead changes manually (when not playing)
  useEffect(() => {
    if (!isPlaying && videoRef.current && activeVideoItem) {
      const clipTimeMs = currentTimeMs - activeVideoItem.startOffsetMs;
      const seekTimeMs = activeVideoItem.startCutMs + clipTimeMs * (activeVideoItem.speed || 1.0);
      videoRef.current.setStatusAsync({
        positionMillis: Math.max(0, Math.round(seekTimeMs)),
        shouldPlay: false,
      });
    }
  }, [currentTimeMs, activeVideoItem, isPlaying]);

  // Seamlessly transition video playback when entering a new clip while playing
  useEffect(() => {
    if (isPlaying && videoRef.current && activeVideoItem) {
      const clipTimeMs = currentTimeMsRef.current - activeVideoItem.startOffsetMs;
      const seekTimeMs = activeVideoItem.startCutMs + clipTimeMs * (activeVideoItem.speed || 1.0);
      videoRef.current.setStatusAsync({
        positionMillis: Math.max(0, Math.round(seekTimeMs)),
        shouldPlay: true,
        rate: activeVideoItem.speed || 1.0,
        shouldCorrectPitch: true,
      });
    }
  }, [activeVideoItem, isPlaying]);

  // Master Playback Loop (runs smoothly at 60fps whenever isPlaying is true)
  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = Date.now();

      const tick = () => {
        if (!isPlayingRef.current) return;

        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        const project = currentProjectRef.current;
        const maxDuration = project ? project.durationMs : 0;
        const nextTime = currentTimeMsRef.current + delta;

        if (maxDuration > 0 && nextTime >= maxDuration) {
          dispatch(setCurrentTime(maxDuration));
          dispatch(setPlaying(false));
          if (videoRef.current) {
            videoRef.current.setStatusAsync({ shouldPlay: false });
          }
          return;
        }

        dispatch(setCurrentTime(Math.round(nextTime)));
        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.setStatusAsync({ shouldPlay: false });
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish && isPlayingRef.current) {
      const project = currentProjectRef.current;
      if (project && currentTimeMsRef.current >= project.durationMs) {
        dispatch(setPlaying(false));
      }
    }
  };

  // Collect all currently active overlay items (Text, Stickers, Overlays)
  const activeOverlays = currentProject
    ? currentProject.tracks
        .filter((t: any) => t.type !== "video" && t.type !== "audio")
        .flatMap((t: any) =>
          t.items.filter(
            (itm: TrackItem) =>
              currentTimeMs >= itm.startOffsetMs &&
              currentTimeMs <= itm.startOffsetMs + itm.durationMs
          )
        )
    : [];

  return (
    <View style={styles.container}>
      {activeVideoItem ? (
        <View style={styles.playerWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: activeVideoItem.sourceUri || "" }}
            style={[
              styles.videoPlayer,
              // Apply basic styling filters
              {
                opacity: activeVideoItem.opacity,
              },
            ]}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying}
            progressUpdateIntervalMillis={50}
            isMuted={activeVideoItem.volume === 0}
            volume={activeVideoItem.volume}
            rate={activeVideoItem.speed || 1.0}
            shouldCorrectPitch={true}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
          />

          {/* Render Active Overlays */}
          {activeOverlays.map((item: TrackItem) => {
            const relativeTime = currentTimeMs - item.startOffsetMs;
            
            // Evaluate Keyframes
            const animatedProps = evaluateKeyframes(item.keyframes, relativeTime, {
              x: item.x,
              y: item.y,
              scale: item.scale,
              rotation: item.rotation,
              opacity: item.opacity,
            });

            const transformStyle = {
              transform: [
                { translateX: animatedProps.x },
                { translateY: animatedProps.y },
                { scale: animatedProps.scale },
                { rotate: `${animatedProps.rotation}deg` },
              ],
              opacity: animatedProps.opacity,
            };

            if (item.type === "text" && item.textStyle) {
              const { textStyle } = item;
              return (
                <View
                  key={item.id}
                  style={[styles.overlayItem, transformStyle, { zIndex: 100 }]}
                >
                  <Text
                    style={{
                      fontFamily: textStyle.fontFamily === "default" ? undefined : textStyle.fontFamily,
                      fontSize: textStyle.fontSize,
                      color: textStyle.color,
                      backgroundColor: textStyle.backgroundColor || "transparent",
                      textAlign: textStyle.alignment,
                      letterSpacing: textStyle.tracking,
                      padding: 4,
                      fontWeight: "700",
                    }}
                  >
                    {textStyle.text}
                  </Text>
                </View>
              );
            }

            if (item.type === "sticker") {
              return (
                <View
                  key={item.id}
                  style={[styles.overlayItem, transformStyle, { zIndex: 90 }]}
                >
                  <Ionicons name="happy-outline" size={60} color={colors.warning} />
                </View>
              );
            }

            if (item.type === "overlay" && item.sourceUri) {
              return (
                <View
                  key={item.id}
                  style={[styles.overlayItem, transformStyle, { zIndex: 80 }]}
                >
                  {/* Pip Image overlay */}
                  <Image
                    source={{ uri: item.sourceUri }}
                    style={{ width: 120, height: 90, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
              );
            }

            return null;
          })}

          {isLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="film-outline" size={48} color={colors.textSoft} />
          <Text style={styles.placeholderText}>No Video at Playhead</Text>
          <Text style={styles.placeholderSub}>
            Import a clip or drag clips into the timeline to preview.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  playerWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  overlayItem: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  placeholderText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  placeholderSub: {
    color: colors.textSoft,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 200,
  },
});
