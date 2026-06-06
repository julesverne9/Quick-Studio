import { Dimensions, Platform, StatusBar, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";

/* ──────────────────────────── Constants ──────────────────────────── */

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight || 40 : 0;

const BOTTOM_INSET = Platform.select({ ios: 34, android: 24 });

export { SCREEN_WIDTH, STATUS_BAR_HEIGHT, BOTTOM_INSET };

/* ──────────────────────────── Layout ─────────────────────────────── */

export const layout = StyleSheet.create({
  /* Outermost safe wrapper — pushes content below status bar / notch */
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: STATUS_BAR_HEIGHT + 8,
  },

  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },

  centeredFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  spaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionGap: {
    marginTop: spacing.xl,
  },
});

/* ──────────────────────────── Typography ─────────────────────────── */

export const textStyles = StyleSheet.create({
  /* Landing */
  appTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 2,
    textAlign: "center",
  },

  appSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
    marginTop: spacing.sm,
  },

  /* Section headers */
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },

  sectionMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  /* Eyebrow */
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent,
  },

  /* Body */
  body: {
    ...typography.body,
    color: colors.textMuted,
  },

  /* Card labels */
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  cardMeta: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 4,
  },
});

/* ──────────────────────────── Top Bar ────────────────────────────── */

export const topBarStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
  },

  brand: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  brandMeta: {
    ...typography.eyebrow,
    color: colors.textSoft,
    textAlign: "center",
    marginTop: 4,
  },
});

/* ──────────────────────────── Landing Page ───────────────────────── */

export const landingStyles = StyleSheet.create({
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },

  accentLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  tagline: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 26,
    marginTop: spacing.md,
    maxWidth: 300,
  },

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: spacing.xl,
    gap: 10,
  },

  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },

  featureText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  ctaDock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: BOTTOM_INSET + 8,
    backgroundColor: "rgba(2, 6, 23, 0.94)",
  },
});

/* ──────────────────────────── Icon Row (Home) ────────────────────── */

export const iconRowStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 16,
  },

  item: {
    alignItems: "center",
    width: 72,
  },

  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 14,
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.accentStrong,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 24,
    alignItems: "center",
  },

  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
  },
});

/* ──────────────────────────── New Project Banner ─────────────────── */

export const bannerStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    overflow: "hidden",
    position: "relative",
  },

  background: {
    paddingVertical: spacing.xl + 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentStrong,
  },

  /* Decorative orbs */
  orbLeft: {
    position: "absolute",
    left: -30,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(96, 165, 250, 0.35)",
  },

  orbRight: {
    position: "absolute",
    right: -20,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.4)",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

/* ──────────────────────────── Tutorials Card ─────────────────────── */

export const tutorialsStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: 8,
  },

  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },

  bullet: {
    color: colors.textSoft,
    fontSize: 18,
    lineHeight: 22,
  },

  itemText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
});

/* ──────────────────────────── Template Sections ──────────────────── */

export const templateStyles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },

  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  count: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },

  viewMore: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: 10,
  },

  card: {
    width: 120,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardThumb: {
    height: 130,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Film-strip style border overlay */
  filmBorder: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 6,
  },

  filmHole: {
    width: 6,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  playButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 8,
    left: 8,
  },

  cardLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    padding: spacing.xs,
  },

  /* Blank template card variant */
  blankCard: {
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.md,
  },

  blankLabel: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  blankPlayButton: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});

/* ──────────────────────────── Workspace / Editor ─────────────────── */

export const editorStyles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingBottom: spacing.xs,
  },

  /* ── Preview area ──────────────────────────────────────────────── */

  previewSurface: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  assetPreview: {
    width: "100%",
    height: "100%",
  },

  videoPlaceholder: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },

  videoPlayButton: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },

  videoPlayButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  videoPlaceholderTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },

  videoPlaceholderBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  /* ── Toolbar container ─────────────────────────────────────────── */

  toolbarSurface: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_INSET,
  },

  /* ── Tab bar ───────────────────────────────────────────────────── */

  tabBar: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 3,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.sm - 3,
  },

  tabItemActive: {
    backgroundColor: colors.accentStrong,
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSoft,
  },

  tabLabelActive: {
    color: "#fff",
  },

  /* ── Presets panel ─────────────────────────────────────────────── */

  presetsScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 12,
  },

  presetItem: {
    alignItems: "center",
    width: 72,
  },

  presetThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: "transparent",
  },

  presetThumbActive: {
    borderColor: colors.accentStrong,
  },

  presetThumbImage: {
    width: "100%",
    height: "100%",
  },

  presetLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },

  presetLabelActive: {
    color: colors.accent,
    fontWeight: "700",
  },

  /* ── Adjustments panel ─────────────────────────────────────────── */

  adjustPanel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },

  sliderRow: {
    marginBottom: spacing.sm,
  },

  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },

  sliderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },

  sliderValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    minWidth: 36,
    textAlign: "right",
  },

  slider: {
    width: "100%",
    height: 36,
  },

  resetButton: {
    alignSelf: "center",
    marginTop: spacing.xs,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
  },

  resetLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
});

/* ──────────────────────────── Auth Modal / Bottom Sheet ──────────── */

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2, 6, 23, 0.7)",
  },

  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: BOTTOM_INSET + spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },

  handle: {
    width: 44,
    height: 5,
    alignSelf: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },

  sheetEyebrow: {
    ...typography.eyebrow,
    color: colors.accent,
  },

  sheetTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    marginTop: spacing.sm,
  },

  input: {
    minHeight: 54,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },

  halfButton: {
    width: "48%",
  },
});

/* ──────────────────────────── Browse / No-Asset State ─────────────── */

export const browseStyles = StyleSheet.create({
  newProjectCard: {
    padding: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  selectButton: {
    marginTop: spacing.lg,
  },
});
