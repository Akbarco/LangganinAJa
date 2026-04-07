import { Platform } from "react-native";
import Constants from "expo-constants";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getExpoHost = () => {
  const fromExpoConfig = (
    Constants as { expoConfig?: { hostUri?: string | null } }
  ).expoConfig?.hostUri;
  const fromManifest2 = (
    Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }
  ).manifest2?.extra?.expoGo?.debuggerHost;
  const fromManifest = (
    Constants as { manifest?: { debuggerHost?: string } }
  ).manifest?.debuggerHost;

  const hostUri = fromExpoConfig || fromManifest2 || fromManifest;
  if (!hostUri || typeof hostUri !== "string") return null;

  return hostUri.split(":")[0];
};

const resolveApiUrl = () => {
  const envUrl =
    typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL.trim()
      : "";
  if (envUrl) return trimTrailingSlash(envUrl);

  if (Platform.OS === "web") return "http://localhost:3000/api";

  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:3000/api`;

  if (Platform.OS === "android") return "http://192.168.1.17:3000/api";

  return "http://192.168.1.17:3000/api";
};

export const API_URL = resolveApiUrl();

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  warning: string;
  danger: string;
  success: string;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  white: string;
  black: string;
  overlay: string;
}

// ── Light Theme (default) ──
export const LightColors: ThemeColors = {
  primary: "#2563EB",
  primaryLight: "#DBEAFE",
  primaryDark: "#1D4ED8",

  accent: "#059669",
  accentLight: "#D1FAE5",
  warning: "#D97706",
  danger: "#DC2626",
  success: "#16A34A",

  background: "#EFF1F5",
  surface: "#FFFFFF",
  surfaceLight: "#F5F6F8",
  surfaceElevated: "#E8EAF0",

  text: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",

  border: "#D1D5DB",
  borderLight: "#E5E7EB",

  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.4)",
};

// ── Dark Theme (original design) ──
export const DarkColors: ThemeColors = {
  primary: "#6C5CE7",
  primaryLight: "#A29BFE",
  primaryDark: "#4A3DB8",

  accent: "#00CEC9",
  accentLight: "#81ECEC",
  warning: "#FDCB6E",
  danger: "#FF6B6B",
  success: "#00B894",

  background: "#0F0F1A",
  surface: "#1A1A2E",
  surfaceLight: "#252542",
  surfaceElevated: "#2D2D4A",

  text: "#FFFFFF",
  textSecondary: "#A0A0C0",
  textMuted: "#6B6B8D",

  border: "#2A2A45",
  borderLight: "#3A3A5C",

  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.5)",
};

// Static fallback for non-component code (utils, etc.)
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 24,
  hero: 32,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export * from "./brands";
