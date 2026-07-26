import styled from "styled-components";

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

export const Wrapper = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${(props) => props.theme.mainBg};

  @media (max-width: 820px) {
    display: block;
  }
`;

export const VisualPane = styled.div`
  flex: 1;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 20% 20%,
      rgba(255, 255, 255, 0.18),
      transparent 35%
    ),
    linear-gradient(
      145deg,
      ${(props) => props.theme.primary},
      #0f172a
    );
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.08;
  font-weight: 750;
  letter-spacing: -0.04em;

  @media (max-width: 820px) {
    display: none;
  }
`;

export const FormPane = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${(props) => props.theme.mainBg};

  @media (max-width: 520px) {
    padding: 1rem;
  }
`;

export const FormBox = styled.div`
  width: 100%;
  max-width: 430px;
  padding: 2.25rem;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: ${(props) => props.theme.radiusLg};
  box-shadow: ${(props) => props.theme.shadowMd};

  @media (max-width: 520px) {
    padding: 1.5rem;
  }
`;

export const Title = styled.h2`
  margin: 0 0 1.75rem;
  color: ${(props) => props.theme.text};
  text-align: center;
  font-size: 1.6rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.025em;
`;

export const ToggleText = styled.p`
  margin: 1.5rem 0 0;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.9rem;
`;

export type ThemeType = typeof lightTheme;
