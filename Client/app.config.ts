/**
 * app.config.ts — Expo Config dengan react-native-android-widget plugin.
 *
 * Menggantikan app.json. Semua nilai dari app.json sudah dipindahkan ke sini.
 * Tambahan: konfigurasi 3 widget (SmallSummary, MediumSummary, LargeDashboard).
 */

import type { ConfigContext, ExpoConfig } from "expo/config";
import type { WithAndroidWidgetsParams } from "react-native-android-widget";

const widgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    // ── 1. Small: 2×1 — Quick Glance ──────────────────────────────────────
    {
      name: "SmallSummary",
      label: "Langganinaja — Ringkas",
      description: "Lihat total pengeluaran bulanan sekilas",
      minWidth: "130dp",
      minHeight: "50dp",
      targetCellWidth: 2,
      targetCellHeight: 1,
      maxResizeWidth: "250dp",
      maxResizeHeight: "100dp",
      resizeMode: "horizontal",
      previewImage: "./assets/widget-preview/small.png",
      updatePeriodMillis: 1800000, // 30 menit (minimum Android)
    },

    // ── 2. Medium: 3×2 — Summary Card ─────────────────────────────────────
    {
      name: "MediumSummary",
      label: "Langganinaja — Summary",
      description: "Pengeluaran, budget progress, dan tagihan terdekat",
      minWidth: "180dp",
      minHeight: "100dp",
      targetCellWidth: 3,
      targetCellHeight: 2,
      maxResizeWidth: "400dp",
      maxResizeHeight: "220dp",
      resizeMode: "horizontal|vertical",
      previewImage: "./assets/widget-preview/medium.png",
      updatePeriodMillis: 1800000,
    },

    // ── 3. Large: 4×3 — Full Dashboard ─────────────────────────────────────
    {
      name: "LargeDashboard",
      label: "Langganinaja — Dashboard",
      description: "Dashboard lengkap: pengeluaran, budget, 3 tagihan terdekat",
      minWidth: "250dp",
      minHeight: "180dp",
      targetCellWidth: 4,
      targetCellHeight: 3,
      maxResizeWidth: "500dp",
      maxResizeHeight: "450dp",
      resizeMode: "horizontal|vertical",
      previewImage: "./assets/widget-preview/large.png",
      updatePeriodMillis: 1800000,
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  // ── Identity ─────────────────────────────────────────────────────────────
  name: "Langganinaja",
  slug: "Client",
  owner: "akbar13",
  version: "1.0.0",

  // ── Orientation & theme ───────────────────────────────────────────────────
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "langganinaja",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  // ── Splash ────────────────────────────────────────────────────────────────
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  // ── iOS ───────────────────────────────────────────────────────────────────
  ios: {
    supportsTablet: true,
  },

  // ── Android ───────────────────────────────────────────────────────────────
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.akbar13.langganinaja",
  },

  // ── Web ───────────────────────────────────────────────────────────────────
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    "expo-router",
    "@react-native-community/datetimepicker",
    "expo-secure-store",
    "expo-sqlite",
    // Widget plugin — generates AndroidManifest entries & XML files at prebuild
    ["react-native-android-widget", widgetConfig],
  ],

  // ── Experiments ───────────────────────────────────────────────────────────
  experiments: {
    typedRoutes: true,
  },

  // ── Extra ─────────────────────────────────────────────────────────────────
  extra: {
    router: {},
    eas: {
      projectId: "dd68d8a3-50eb-4a73-913d-29c5ce872290",
    },
  },
});
