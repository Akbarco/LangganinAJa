/**
 * index.ts — Custom entry point untuk Expo Router + Android Widget.
 *
 * Mengapa file ini diperlukan:
 *   - package.json "main" sebelumnya mengarah ke "expo-router/entry"
 *     yang tidak bisa di-extend untuk mendaftarkan widget task handler.
 *   - File ini tetap me-load expo-router secara normal, tapi juga
 *     mendaftarkan widgetTaskHandler via registerWidgetTaskHandler().
 *
 * Catatan: File ini TIDAK mengubah behavior app normal sama sekali.
 *   expo-router/entry sudah di-re-export dari sini.
 */

import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./widget-task-handler";

// Register widget handler — wajib dipanggil di entry point
// supaya Android system bisa menemukan handler saat widget lifecycle event
registerWidgetTaskHandler(widgetTaskHandler);
