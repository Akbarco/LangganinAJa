/**
 * widget-task-handler.tsx
 *
 * Central lifecycle handler untuk semua Android Home Screen Widget.
 * Dipanggil oleh Android system sebagai headless task — bukan bagian dari
 * React component tree normal. TIDAK bisa pakai hooks atau Zustand store.
 *
 * Supported events:
 *   WIDGET_ADDED     → Render widget pertama kali saat ditambahkan ke home screen
 *   WIDGET_UPDATE    → Scheduled update (setiap 30 menit) atau manual request
 *   WIDGET_RESIZED   → User resize widget → re-render dengan dimensi baru
 *   WIDGET_DELETED   → Widget dihapus dari home screen (no-op untuk app ini)
 *   WIDGET_CLICK     → User tap widget / item di dalam widget
 */

import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { getSystemIsDark, loadWidgetData, WidgetData } from "@/lib/widgetData";

import { LargeWidget } from "./widgets/LargeWidget";
import { MediumWidget } from "./widgets/MediumWidget";
import { SmallWidget } from "./widgets/SmallWidget";

// ─── Widget name → component mapping ─────────────────────────────────────────

const WIDGET_MAP = {
  SmallSummary: SmallWidget,
  MediumSummary: MediumWidget,
  LargeDashboard: LargeWidget,
} as const;

type WidgetName = keyof typeof WIDGET_MAP;

// ─── Upcoming count per widget size ──────────────────────────────────────────

const UPCOMING_LIMIT: Record<WidgetName, number> = {
  SmallSummary: 1,
  MediumSummary: 1,
  LargeDashboard: 3,
};

const getFallbackWidgetData = (): WidgetData => ({
  isLoggedIn: false,
  summary: null,
  upcoming: [],
  isDark: getSystemIsDark(),
});

// ─── Task handler ─────────────────────────────────────────────────────────────

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;

  const widgetName = widgetInfo.widgetName as WidgetName;
  const Widget = WIDGET_MAP[widgetName];

  if (!Widget) {
    console.warn(`[WidgetTaskHandler] Unknown widget: "${widgetName}"`);
    return;
  }

  const limit = UPCOMING_LIMIT[widgetName];
  const { width, height } = widgetInfo;

  const renderCurrentWidget = async () => {
    try {
      const data = await loadWidgetData(limit);
      renderWidget(<Widget {...data} width={width} height={height} />);
    } catch (error) {
      console.warn("[WidgetTaskHandler] Render fallback:", error);
      renderWidget(<Widget {...getFallbackWidgetData()} width={width} height={height} />);
    }
  };

  switch (widgetAction) {
    // ── Widget ditambahkan ke home screen ──────────────────────────────────
    case "WIDGET_ADDED": {
      await renderCurrentWidget();
      break;
    }

    // ── Scheduled update (tiap 30 menit) atau manual update ───────────────
    case "WIDGET_UPDATE": {
      await renderCurrentWidget();
      break;
    }

    // ── User resize widget → re-render dengan dimensi baru ────────────────
    case "WIDGET_RESIZED": {
      await renderCurrentWidget();
      break;
    }

    // ── Widget tap (buka app) ──────────────────────────────────────────────
    // Tap action OPEN_APP dan OPEN_DETAIL sudah handle via clickAction prop
    // di masing-masing widget component. Handler ini hanya untuk kasus
    // custom WIDGET_CLICK yang butuh refresh data setelah aksi.
    case "WIDGET_CLICK": {
      // Refresh data setelah click (biar data selalu fresh saat user balik)
      await renderCurrentWidget();
      break;
    }

    // ── Widget dihapus dari home screen ───────────────────────────────────
    case "WIDGET_DELETED": {
      // Tidak ada resource yang perlu di-cleanup untuk app ini
      break;
    }

    default:
      break;
  }
}
