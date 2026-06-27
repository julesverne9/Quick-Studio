export const colors = {
  background: "#020617",
  backgroundElevated: "#0f172a",
  backgroundMuted: "#111827",
  surface: "#0b1220",
  surfaceAlt: "#121a2b",
  surfaceSoft: "#172033",
  border: "#1f2937",
  borderStrong: "#334155",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  textSoft: "#64748b",
  primary: "#e2e8f0",
  primaryText: "#020617",
  accent: "#60a5fa",
  accentStrong: "#3b82f6",
  success: "#34d399",
  warning: "#f59e0b",
  danger: "#fb7185"
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32
} as const;

export const radius = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999
} as const;

export const typography = {
  eyebrow: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.3,
    textTransform: "uppercase" as const
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const
  },
  body: {
    fontSize: 15,
    lineHeight: 22
  }
} as const;
