/**
 * widgetSync.tsx  (harus .tsx karena ada JSX)
 *
 * Utility untuk trigger update semua widget secara programatik dari dalam app.
 * Dipanggil setiap kali data berubah supaya widget langsung reflect data terbaru.
 *
 * FIX: loadWidgetData() harus dipanggil SEBELUM requestWidgetUpdate, bukan di
 * dalam renderWidget callback. SQLite (NativeDatabase.execAsync) tidak bisa
 * dipanggil dari dalam widget render context → menyebabkan error "rejected".
 */

import React from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { loadWidgetData } from "./widgetData";

const WIDGET_SYNC_DELAY_MS = 800;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;

const canUseAndroidWidgets = () =>
  Platform.OS === "android" && Constants.appOwnership !== "expo";

/**
 * Trigger update untuk semua 3 widget (Small, Medium, Large) sekaligus.
 * Data di-fetch DULU dari SQLite, baru dikirim ke renderWidget.
 * Fire-and-forget — errors di-swallow supaya tidak crash app user.
 */
export async function syncAllWidgets(): Promise<void> {
  // Widget hanya ada di native Android build. Expo Go tidak punya native module-nya.
  if (!canUseAndroidWidgets()) return;
  if (syncInFlight) return syncInFlight;

  syncInFlight = syncAllWidgetsNow().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export function scheduleWidgetSync(delayMs: number = WIDGET_SYNC_DELAY_MS): void {
  if (!canUseAndroidWidgets()) return;
  if (syncTimer) clearTimeout(syncTimer);

  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncAllWidgets();
  }, delayMs);
}

async function syncAllWidgetsNow(): Promise<void> {
  try {
    const [
      { requestWidgetUpdate },
      { SmallWidget },
      { MediumWidget },
      { LargeWidget },
    ] = await Promise.all([
      import("react-native-android-widget"),
      import("@/widgets/SmallWidget"),
      import("@/widgets/MediumWidget"),
      import("@/widgets/LargeWidget"),
    ]);

    // Load data after app writes settle, then render all widgets from a snapshot.
    const largeData = await loadWidgetData(3);
    const smallData = {
      ...largeData,
      upcoming: largeData.upcoming.slice(0, 1),
    };

    await requestWidgetUpdate({
      widgetName: "SmallSummary",
      renderWidget: (widgetInfo) => (
        <SmallWidget
          {...smallData}
          width={widgetInfo.width}
          height={widgetInfo.height}
        />
      ),
      widgetNotFound: () => {},
    });

    await requestWidgetUpdate({
      widgetName: "MediumSummary",
      renderWidget: (widgetInfo) => (
        <MediumWidget
          {...smallData}
          width={widgetInfo.width}
          height={widgetInfo.height}
        />
      ),
      widgetNotFound: () => {},
    });

    await requestWidgetUpdate({
      widgetName: "LargeDashboard",
      renderWidget: (widgetInfo) => (
        <LargeWidget
          {...largeData}
          width={widgetInfo.width}
          height={widgetInfo.height}
        />
      ),
      widgetNotFound: () => {},
    });
  } catch (e) {
    // Jangan crash app hanya karena widget sync gagal
    console.warn("[widgetSync] syncAllWidgets error:", e);
  }
}
