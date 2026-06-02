/* ── Quick‑action icons for the Home screen icon row ──────────────── */
export const quickActionIcons = [
  { id: "beats-clips", label: "BeatsClips", icon: "musical-notes", badge: null },
  {
    id: "create-template",
    label: "Create\nTemplate",
    icon: "color-palette-outline",
    badge: null,
  },
  { id: "overlay", label: "Overlay", icon: "layers-outline", badge: null },
  { id: "stories", label: "Stories", icon: "grid-outline", badge: null },
  {
    id: "teleprompter",
    label: "Teleprompter",
    icon: "reader-outline",
    badge: "New",
  },
];

/* ── Quick‑action cards (workspace browse / home grid) ────────────── */
export const quickActions = [
  {
    id: "new-project",
    title: "New Project",
    description: "Start with a blank mobile canvas.",
  },
  {
    id: "stories",
    title: "Stories",
    description: "Vertical-ready layouts for creators.",
  },
  {
    id: "overlay",
    title: "Overlay",
    description: "Layer text, stickers, and motion.",
  },
  {
    id: "teleprompter",
    title: "Teleprompter",
    description: "Draft guided talking-head videos.",
  },
];

/* ── Feature pills for the landing page ───────────────────────────── */
export const featureHighlights = [
  { id: "ads", label: "No ads" },
  { id: "watermarks", label: "No watermarks" },
  { id: "guest", label: "Guest editing" },
  { id: "export", label: "Export later" },
];

/* ── Tutorials card items ─────────────────────────────────────────── */
export const tutorialItems = [
  "Newbie tutorials and usage guides",
  "Template creation tutorial",
];

/* ── Inspiration / template categories ────────────────────────────── */
export const inspirationSections = [
  {
    id: "reels",
    title: "Instagram Reels",
    count: 117,
  },
  {
    id: "ultra-wide",
    title: "Ultra-Wide Screen",
    count: 13,
    hasBlankTemplate: true,
  },
  {
    id: "story-video",
    title: "Instagram Story Video",
    count: 39,
  },
];

/* ── Editing toolbar chips ────────────────────────────────────────── */
export const editingTools = [
  "Trim",
  "Canvas",
  "Text",
  "Filters",
  "Overlay",
  "Audio",
];

/* ── Timeline placeholder cards ───────────────────────────────────── */
export const timelineCards = [
  { id: "clip-1", label: "Scene 01", accent: "#60a5fa" },
  { id: "clip-2", label: "Cutaway", accent: "#a78bfa" },
  { id: "clip-3", label: "Subtitle", accent: "#34d399" },
  { id: "clip-4", label: "Outro", accent: "#f59e0b" },
];

/* ── Landing page feature pills with icons ────────────────────────── */
export const landingFeatures = [
  { id: "no-ads", label: "No Ads", icon: "shield-checkmark-outline", color: "accent" },
  { id: "no-watermarks", label: "No Watermarks", icon: "water-outline", color: "accent" },
  { id: "hd-export", label: "HD Export", icon: "cloud-upload-outline", color: "success" },
  { id: "pro-tools", label: "Pro Editing", icon: "color-wand-outline", color: "success" },
  { id: "timeline", label: "Timeline Editor", icon: "film-outline", color: "accent" },
  { id: "multi-layer", label: "Multi-Layer", icon: "layers-outline", color: "success" },
];
