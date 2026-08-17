import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";

import {
  quickActionIcons,
  tutorialItems,
} from "../data/mockContent";
import ProfileModal from "../components/ProfileModal";
import { useAuth } from "../context/AuthContext";
import { templateSections } from "../data/templates";
import { colors, spacing } from "../theme/tokens";
import {
  topBarStyles,
  iconRowStyles,
  bannerStyles,
  tutorialsStyles,
  templateStyles,
  modalStyles,
  layout,
} from "../styles/styles";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function HomeScreen({ navigation }) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isAccountBusy, setIsAccountBusy] = useState(false);
  const { isAuthenticated, user, logout, deleteAccount } = useAuth();

  const profileInitial = user?.name?.trim()?.charAt(0)?.toUpperCase();

  const openEditor = (tool, extraParams = {}) => {
    navigation.navigate("Editor", { tool, ...extraParams });
  };

  const resetToGuestHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
  };

  const handleHeaderAccountPress = () => {
    if (isAuthenticated) {
      setShowProfileModal(true);
      return;
    }

    navigation.navigate("Auth", {
      mode: "signIn",
      returnTo: { name: "Home" },
    });
  };

  const handleLogout = async () => {
    setIsAccountBusy(true);
    await logout();
    setIsAccountBusy(false);
    setShowProfileModal(false);
    resetToGuestHome();
  };

  const handleDeleteAccount = async () => {
    setIsAccountBusy(true);
    const result = await deleteAccount();
    setIsAccountBusy(false);

    if (!result.success) {
      Alert.alert("Delete Failed", result.message);
      return;
    }

    setShowProfileModal(false);
    resetToGuestHome();
  };

  return (
    <View style={layout.screenContainer}>
      <View style={topBarStyles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={topBarStyles.iconButton}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          style={topBarStyles.iconButton}
          hitSlop={HIT_SLOP}
          onPress={handleHeaderAccountPress}
        >
          {isAuthenticated && profileInitial ? (
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
              {profileInitial}
            </Text>
          ) : (
            <Ionicons
              name={isAuthenticated ? "person" : "person-circle-outline"}
              size={22}
              color={colors.text}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iconRowStyles.scrollContent}
        >
          {quickActionIcons.map((item) => (
            <Pressable
              key={item.id}
              style={iconRowStyles.item}
              hitSlop={HIT_SLOP}
              onPress={() => openEditor(item.id, { source: "quick-action" })}
            >
              <View style={iconRowStyles.iconBox}>
                <Ionicons name={item.icon} size={24} color={colors.text} />
                {item.badge ? (
                  <View style={iconRowStyles.badge}>
                    <Text style={iconRowStyles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={iconRowStyles.label}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={() => setShowTypeSelector(true)}
          hitSlop={HIT_SLOP}
        >
          <View style={bannerStyles.container}>
            <View style={bannerStyles.background}>
              <View style={bannerStyles.orbLeft} />
              <View style={bannerStyles.orbRight} />

              <View style={bannerStyles.iconCircle}>
                <Ionicons name="cut-outline" size={22} color="#fff" />
              </View>
              <Text style={bannerStyles.title}>New Project</Text>
            </View>
          </View>
        </Pressable>

        <View style={tutorialsStyles.container}>
          <View style={tutorialsStyles.header}>
            <Ionicons
              name="compass-outline"
              size={22}
              color={colors.text}
            />
            <Text style={tutorialsStyles.title}>Tutorials</Text>
          </View>

          {tutorialItems.map((item, index) => (
            <View key={index} style={tutorialsStyles.item}>
              <Text style={tutorialsStyles.bullet}>.</Text>
              <Text style={tutorialsStyles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {templateSections.map((section) => (
          <View key={section.id} style={templateStyles.section}>
            <View style={templateStyles.header}>
              <View style={templateStyles.titleRow}>
                <Text style={templateStyles.title}>{section.title}</Text>
                <Text style={templateStyles.count}>({section.count})</Text>
              </View>
              <Pressable
                style={layout.row}
                hitSlop={HIT_SLOP}
                onPress={() =>
                  openEditor(section.id, {
                    source: "view-more",
                    sectionTitle: section.title,
                  })
                }
              >
                <Text style={templateStyles.viewMore}>View More </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {section.hasBlankTemplate ? (
              <Pressable
                style={templateStyles.blankCard}
                hitSlop={HIT_SLOP}
                onPress={() =>
                  openEditor("blank-template", {
                    source: "blank-template",
                    sectionId: section.id,
                  })
                }
              >
                <Text style={templateStyles.blankLabel}>Blank Template</Text>
                <View style={templateStyles.blankPlayButton}>
                  <Ionicons name="play" size={14} color="#fff" />
                </View>
              </Pressable>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                templateStyles.scrollContent,
                { marginTop: section.hasBlankTemplate ? spacing.sm : 0 },
              ]}
            >
              {section.templates.map((template, index) => (
                <Pressable
                  key={template.id}
                  style={templateStyles.card}
                  hitSlop={HIT_SLOP}
                  onPress={() =>
                    openEditor(template.id, {
                      source: "template-card",
                      sectionId: section.id,
                      templateIndex: index + 1,
                    })
                  }
                >
                  <View style={templateStyles.cardThumb}>
                    <Image
                      source={{ uri: template.thumbnail }}
                      resizeMode="cover"
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                      }}
                    />
                    <View style={[templateStyles.filmBorder, { left: 0 }]}>
                      {[1, 2, 3, 4, 5].map((hole) => (
                        <View key={hole} style={templateStyles.filmHole} />
                      ))}
                    </View>
                    <View style={[templateStyles.filmBorder, { right: 0 }]}>
                      {[1, 2, 3, 4, 5].map((hole) => (
                        <View key={hole} style={templateStyles.filmHole} />
                      ))}
                    </View>

                    <View style={templateStyles.playButton}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={showTypeSelector}
        onRequestClose={() => setShowTypeSelector(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.sheetEyebrow}>Create New Project</Text>
            <Text style={modalStyles.sheetTitle}>
              Select the workspace tool to begin editing your media
            </Text>

            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <Pressable
                onPress={() => {
                  setShowTypeSelector(false);
                  navigation.navigate("VideoEditor", {
                    tool: "new-project-video",
                  });
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surfaceSoft,
                  padding: spacing.md,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                }}
                hitSlop={HIT_SLOP}
              >
                <Ionicons
                  name="film"
                  size={24}
                  color={colors.accent}
                  style={{ marginRight: spacing.md }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                  >
                    Video Editor
                  </Text>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Multi-track timeline, keyframes, transitions, filters, and
                    speed curves.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowTypeSelector(false);
                  openEditor("new-project-photo", {
                    source: "project-type-selector",
                  });
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surfaceSoft,
                  padding: spacing.md,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                }}
                hitSlop={HIT_SLOP}
              >
                <Ionicons
                  name="image"
                  size={24}
                  color={colors.success}
                  style={{ marginRight: spacing.md }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                  >
                    Photo Editor
                  </Text>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Apply filters and adjust brightness, contrast, and
                    saturation.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setShowTypeSelector(false)}
                style={{
                  backgroundColor: colors.surfaceAlt,
                  padding: spacing.md,
                  borderRadius: 16,
                  alignItems: "center",
                  marginTop: spacing.sm,
                }}
                hitSlop={HIT_SLOP}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ProfileModal
        visible={showProfileModal}
        user={user}
        loading={isAccountBusy}
        onClose={() => setShowProfileModal(false)}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
      />
    </View>
  );
}
