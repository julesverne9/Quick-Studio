import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  quickActionIcons,
  tutorialItems,
  inspirationSections,
} from "../data/mockContent";
import { colors, spacing } from "../theme/tokens";
import {
  topBarStyles,
  iconRowStyles,
  bannerStyles,
  tutorialsStyles,
  templateStyles,
  layout,
} from "../styles/styles";

/* ──────────────────────────────────────────────────────────────────── */

export default function HomeScreen({ onBack, onNewProject }) {
  return (
    <View style={layout.screenContainer}>
      {/* ── Top bar ──────────────────────────────────────── */}
      <View style={topBarStyles.container}>
        <Pressable onPress={onBack} style={topBarStyles.iconButton}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable style={topBarStyles.iconButton}>
          <Ionicons name="help-circle-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* ── Scrollable content ───────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Quick‑action icon row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iconRowStyles.scrollContent}
        >
          {quickActionIcons.map((item) => (
            <View key={item.id} style={iconRowStyles.item}>
              <View style={iconRowStyles.iconBox}>
                <Ionicons name={item.icon} size={24} color={colors.text} />
                {item.badge ? (
                  <View style={iconRowStyles.badge}>
                    <Text style={iconRowStyles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={iconRowStyles.label}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* New Project banner */}
        <Pressable onPress={onNewProject}>
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

        {/* Tutorials card */}
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
              <Text style={tutorialsStyles.bullet}>·</Text>
              <Text style={tutorialsStyles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Template category sections */}
        {inspirationSections.map((section) => (
          <View key={section.id} style={templateStyles.section}>
            {/* Section header */}
            <View style={templateStyles.header}>
              <View style={templateStyles.titleRow}>
                <Text style={templateStyles.title}>{section.title}</Text>
                <Text style={templateStyles.count}>({section.count})</Text>
              </View>
              <Pressable style={layout.row}>
                <Text style={templateStyles.viewMore}>View More </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Blank template card (ultra-wide section) */}
            {section.hasBlankTemplate ? (
              <View style={templateStyles.blankCard}>
                <Text style={templateStyles.blankLabel}>Blank Template</Text>
                <View style={templateStyles.blankPlayButton}>
                  <Ionicons name="play" size={14} color="#fff" />
                </View>
              </View>
            ) : null}

            {/* Thumbnail scroll row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                templateStyles.scrollContent,
                { marginTop: section.hasBlankTemplate ? spacing.sm : 0 },
              ]}
            >
              {[1, 2, 3, 4].map((card) => (
                <View key={`${section.id}-${card}`} style={templateStyles.card}>
                  <View style={templateStyles.cardThumb}>
                    {/* Film‑strip borders */}
                    <View style={[templateStyles.filmBorder, { left: 0 }]}>
                      {[1, 2, 3, 4, 5].map((h) => (
                        <View key={h} style={templateStyles.filmHole} />
                      ))}
                    </View>
                    <View style={[templateStyles.filmBorder, { right: 0 }]}>
                      {[1, 2, 3, 4, 5].map((h) => (
                        <View key={h} style={templateStyles.filmHole} />
                      ))}
                    </View>

                    {/* Play button */}
                    <View style={templateStyles.playButton}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
