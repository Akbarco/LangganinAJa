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
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";

import { LargeWidget } from "@/widgets/LargeWidget";
import { MediumWidget } from "@/widgets/MediumWidget";
import { SmallWidget } from "@/widgets/SmallWidget";
import { loadWidgetData } from "./widgetData";

/**
 * Trigger update untuk semua 3 widget (Small, Medium, Large) sekaligus.
 * Data di-fetch DULU dari SQLite, baru dikirim ke renderWidget.
 * Fire-and-forget — errors di-swallow supaya tidak crash app user.
 */
export async function syncAllWidgets(): Promise<void> {
  // Widget hanya ada di Android — skip platform lain
  if (Platform.OS !== "android") return;

  try {
    // ✅ Load data SEBELUM requestWidgetUpdate, bukan di dalamnya.
    // Ini menghindari SQLite dipanggil di wrong context → NativeDatabase error.
    const [smallData, largeData] = await Promise.all([
      loadWidgetData(1),
      loadWidgetData(3),
    ]);

    await Promise.all([
      requestWidgetUpdate({
        widgetName: "SmallSummary",
        renderWidget: (widgetInfo) => (
          <SmallWidget
            {...smallData}
            width={widgetInfo.width}
            height={widgetInfo.height}
          />
        ),
        widgetNotFound: () => {
          // Tidak ada widget SmallSummary di home screen — no-op
        },
      }),

      requestWidgetUpdate({
        widgetName: "MediumSummary",
        renderWidget: (widgetInfo) => (
          <MediumWidget
            {...smallData}
            width={widgetInfo.width}
            height={widgetInfo.height}
          />
        ),
        widgetNotFound: () => {
          // Tidak ada widget MediumSummary di home screen — no-op
        },
      }),

      requestWidgetUpdate({
        widgetName: "LargeDashboard",
        renderWidget: (widgetInfo) => (
          <LargeWidget
            {...largeData}
            width={widgetInfo.width}
            height={widgetInfo.height}
          />
        ),
        widgetNotFound: () => {
          // Tidak ada widget LargeDashboard di home screen — no-op
        },
      }),
    ]);
  } catch (e) {
    // Jangan crash app hanya karena widget sync gagal
    console.warn("[widgetSync] syncAllWidgets error:", e);
  }
}
