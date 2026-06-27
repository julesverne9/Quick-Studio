import React from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";

import { colors, spacing } from "../../theme/tokens";
import {
  bannerStyles,
  iconRowStyles,
  layout,
  templateStyles,
} from "../../styles/styles";
import { createProject, deleteProject } from "../../store/videoEditorSlice";
import { Track, VideoProject } from "../types";

interface EditorHomeProps {
  onSelectProject: (id: string) => void;
  onClose: () => void;
}

export default function EditorHome({ onSelectProject, onClose }: EditorHomeProps) {
  const dispatch = useDispatch();
  
  // Read projects from Redux
  const projects = useSelector((state: any) => state.videoEditor.projects);

  const startNewProject = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Gallery Access Needed",
        "Please allow access to your photos and videos to import clips into the timeline."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    // We take the first asset as the initial clip
    const firstAsset = result.assets[0];
    const projectName = `Project ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    dispatch(
      createProject({
        name: projectName,
        initialAsset: {
          uri: firstAsset.uri,
          name: firstAsset.fileName || "Imported Clip",
          durationMs: firstAsset.duration ? firstAsset.duration * 1000 : 5000, // fallback to 5s for static images
        },
      })
    );
  };

  const handleDeleteProject = (id: string, name: string) => {
    Alert.alert(
      "Delete Draft",
      `Are you sure you want to permanently delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => dispatch(deleteProject(id)),
        },
      ]
    );
  };

  const renderDraftItem = ({ item }: { item: VideoProject }) => {
    const formattedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Helper to calculate total clip count
    const totalClips = item.tracks.reduce((sum: number, t: Track) => sum + t.items.length, 0);

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: spacing.sm,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Cover thumbnail */}
        <Pressable
          onPress={() => onSelectProject(item.id)}
          style={{
            width: 72,
            height: 72,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            overflow: "hidden",
            marginRight: spacing.md,
          }}
        >
          {item.coverUri ? (
            <Image
              source={{ uri: item.coverUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="film-outline" size={24} color={colors.textSoft} />
            </View>
          )}
        </Pressable>

        {/* Project Info */}
        <Pressable
          onPress={() => onSelectProject(item.id)}
          style={{ flex: 1 }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: "700",
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {totalClips} clip{totalClips !== 1 ? "s" : ""} · {Math.round(item.durationMs / 1000)}s
          </Text>
          <Text
            style={{
              color: colors.textSoft,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            Edited {formattedDate}
          </Text>
        </Pressable>

        {/* Actions */}
        <Pressable
          onPress={() => handleDeleteProject(item.id, item.name)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surfaceSoft,
          }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={layout.screenContainer}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>

        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          Video Studio
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* New Project Banner */}
        <Pressable onPress={startNewProject}>
          <View style={bannerStyles.container}>
            <View style={bannerStyles.background}>
              <View style={bannerStyles.orbLeft} />
              <View style={bannerStyles.orbRight} />

              <View style={bannerStyles.iconCircle}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <Text style={bannerStyles.title}>Create Video Project</Text>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: 12,
                  marginTop: 4,
                  fontWeight: "600",
                }}
              >
                Import multiple clips & audios into a multi-layer timeline
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Feature quick row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iconRowStyles.scrollContent}
        >
          <View style={iconRowStyles.item}>
            <Pressable onPress={startNewProject} style={iconRowStyles.iconBox}>
              <Ionicons name="camera-outline" size={22} color={colors.accent} />
            </Pressable>
            <Text style={iconRowStyles.label}>Camera</Text>
          </View>

          <View style={iconRowStyles.item}>
            <Pressable style={iconRowStyles.iconBox}>
              <Ionicons name="recording-outline" size={22} color={colors.success} />
            </Pressable>
            <Text style={iconRowStyles.label}>Record</Text>
          </View>

          <View style={iconRowStyles.item}>
            <Pressable style={iconRowStyles.iconBox}>
              <Ionicons name="cloud-done-outline" size={22} color={colors.warning} />
            </Pressable>
            <Text style={iconRowStyles.label}>Cloud Sync</Text>
          </View>

          <View style={iconRowStyles.item}>
            <View style={iconRowStyles.iconBox}>
              <Ionicons name="sparkles-outline" size={22} color={colors.danger} />
              <View style={iconRowStyles.badge}>
                <Text style={iconRowStyles.badgeText}>Pro</Text>
              </View>
            </View>
            <Text style={iconRowStyles.label}>AI Templates</Text>
          </View>
        </ScrollView>

        {/* Recent Drafts section */}
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: "800",
              marginBottom: spacing.md,
            }}
          >
            Recent Projects
          </Text>

          {projects.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: "dashed",
              }}
            >
              <Ionicons name="folder-open-outline" size={32} color={colors.textSoft} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  marginTop: spacing.sm,
                  fontWeight: "600",
                }}
              >
                No projects yet
              </Text>
              <Text
                style={{
                  color: colors.textSoft,
                  fontSize: 12,
                  marginTop: 4,
                  textAlign: "center",
                  maxWidth: 200,
                }}
              >
                Start a new project by picking files from your gallery.
              </Text>
            </View>
          ) : (
            <FlatList
              data={projects}
              renderItem={renderDraftItem}
              keyExtractor={(item: VideoProject) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Video templates suggestion section */}
        <View style={[templateStyles.section, { marginBottom: 40 }]}>
          <View style={templateStyles.header}>
            <Text style={templateStyles.title}>Weekly Top Templates</Text>
            <Text style={templateStyles.viewMore}>See all</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={templateStyles.scrollContent}>
            {[
              { id: "t1", title: "Cinematic Intro", duration: "12s" },
              { id: "t2", title: "TikTok Beat Sync", duration: "15s" },
              { id: "t3", title: "Vlog Transition", duration: "8s" },
              { id: "t4", title: "Travel Montage", duration: "24s" },
            ].map((item, idx) => (
              <View key={item.id} style={templateStyles.card}>
                <View style={templateStyles.cardThumb}>
                  <Ionicons name="play" size={20} color="#fff" />
                  <View
                    style={{
                      position: "absolute",
                      bottom: spacing.xs,
                      right: spacing.xs,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {item.duration}
                    </Text>
                  </View>
                </View>
                <Text style={templateStyles.cardLabel} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
