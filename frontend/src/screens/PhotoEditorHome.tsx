import React, { useEffect, useRef } from "react";
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

import { colors, spacing } from "../theme/tokens";
import {
  bannerStyles,
  iconRowStyles,
  layout,
  templateStyles,
} from "../styles/styles";
import { deleteProject } from "../store/photoEditorSlice";

interface PhotoProject {
  id: string;
  name: string;
  assetUri: string;
  assetType: 'photo' | 'video';
  preset: string;
  adjustments: { brightness: number; contrast: number; saturation: number };
  createdAt: string;
  updatedAt: string;
}

interface PhotoEditorHomeProps {
  onSelectProject: (id: string) => void;
  onStartNew: (assetUri: string, assetName: string) => void;
  onClose: () => void;
}

export default function PhotoEditorHome({ onSelectProject, onStartNew, onClose }: PhotoEditorHomeProps) {
  const dispatch = useDispatch();
  
  // Read projects from Redux
  const projects = useSelector((state: any) => state.photoEditor.projects);
  const hasPromptedRef = useRef(false);

  // On mount, if there's a recent project, ask if user wants to continue it
  useEffect(() => {
    if (hasPromptedRef.current || projects.length === 0) return;
    hasPromptedRef.current = true;

    // Find the most recently updated project
    const sorted = [...projects].sort(
      (a: PhotoProject, b: PhotoProject) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const recent = sorted[0];

    Alert.alert(
      "Continue Previous Project?",
      `Would you like to continue editing "${recent.name}"?`,
      [
        {
          text: "New Project",
          style: "cancel",
        },
        {
          text: "Continue",
          onPress: () => onSelectProject(recent.id),
        },
      ]
    );
  }, []);

  const startNewProject = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Gallery Access Needed",
        "Please allow access to your photos to edit them."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    const firstAsset = result.assets[0];
    const projectName = `Photo ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    onStartNew(firstAsset.uri, firstAsset.fileName || projectName);
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

  const renderDraftItem = ({ item }: { item: PhotoProject }) => {
    const formattedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

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
          {item.assetUri ? (
            <Image
              source={{ uri: item.assetUri }}
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
              <Ionicons name="image-outline" size={24} color={colors.textSoft} />
            </View>
          )}
        </Pressable>

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
              color: colors.textSoft,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            Edited {formattedDate}
          </Text>
        </Pressable>

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
          Photo Studio
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={startNewProject}>
          <View style={bannerStyles.container}>
            <View style={bannerStyles.background}>
              <View style={bannerStyles.orbLeft} />
              <View style={bannerStyles.orbRight} />

              <View style={bannerStyles.iconCircle}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <Text style={bannerStyles.title}>Create Photo Project</Text>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: 12,
                  marginTop: 4,
                  fontWeight: "600",
                }}
              >
                Apply filters, adjust colors, and crop your photos
              </Text>
            </View>
          </View>
        </Pressable>

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
            <View style={iconRowStyles.iconBox}>
              <Ionicons name="color-wand-outline" size={22} color={colors.danger} />
              <View style={iconRowStyles.badge}>
                <Text style={iconRowStyles.badgeText}>Pro</Text>
              </View>
            </View>
            <Text style={iconRowStyles.label}>AI Enhance</Text>
          </View>
        </ScrollView>

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
              <Ionicons name="image-outline" size={32} color={colors.textSoft} />
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
                Start a new project by picking a photo from your gallery.
              </Text>
            </View>
          ) : (
            <FlatList
              data={projects}
              renderItem={renderDraftItem}
              keyExtractor={(item: PhotoProject) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
