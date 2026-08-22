const sharedTheme = {
  radiusSm: "8px",
  radiusMd: "12px",
  radiusLg: "18px",
  shadowSm: "0 1px 2px rgba(15, 23, 42, 0.05)",
  shadowMd:
    "0 14px 32px rgba(15, 23, 42, 0.08)",
  transition: "160ms ease",
};

export const lightTheme = {
  ...sharedTheme,

  mode: "light",

  background: "#f5f7fb",
  mainBg: "#f5f7fb",

  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  cardBg: "#ffffff",

  text: "#172033",
  textMuted: "#697386",
  muted: "#697386",

  sidebarBg: "#111827",
  sidebarText: "#f8fafc",
  sidebarMuted: "#94a3b8",
  sidebarBorder: "#273449",

  border: "#dde3ec",
  borderStrong: "#c7d0dd",

  inputBg: "#ffffff",

  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  primarySoft: "#eff6ff",

  accent: "#2563eb",

  buttonBg: "#2563eb",
  buttonHover: "#1d4ed8",
  buttonText: "#ffffff",

  hoverBg: "#f1f5f9",

  success: "#15803d",
  successSoft: "#f0fdf4",

  warning: "#b45309",
  warningSoft: "#fffbeb",

  danger: "#dc2626",
  dangerSoft: "#fef2f2",

  focusRing: "rgba(37, 99, 235, 0.32)",
  selectionBg: "rgba(37, 99, 235, 0.18)",
};

export const darkTheme = {
  ...sharedTheme,

  mode: "dark",

  background: "#0b1120",
  mainBg: "#0b1120",

  surface: "#111827",
  surfaceRaised: "#162033",
  cardBg: "#111827",

  text: "#f8fafc",
  textMuted: "#9ba8ba",
  muted: "#9ba8ba",

  sidebarBg: "#070d19",
  sidebarText: "#f8fafc",
  sidebarMuted: "#94a3b8",
  sidebarBorder: "#1e293b",

  border: "#263449",
  borderStrong: "#3a4a61",

  inputBg: "#0f172a",

  primary: "#60a5fa",
  primaryHover: "#93c5fd",
  primarySoft: "#172554",

  accent: "#60a5fa",

  buttonBg: "#3b82f6",
  buttonHover: "#60a5fa",
  buttonText: "#ffffff",

  hoverBg: "#1e293b",

  success: "#4ade80",
  successSoft: "#052e16",

  warning: "#fbbf24",
  warningSoft: "#422006",

  danger: "#f87171",
  dangerSoft: "#450a0a",

  focusRing: "rgba(96, 165, 250, 0.38)",
  selectionBg: "rgba(96, 165, 250, 0.22)",
};

export type ThemeType = typeof lightTheme;
