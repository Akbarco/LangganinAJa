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
import Constants from "expo-constants";
import { Platform } from "react-native";

const isExpoGo = Constants.appOwnership === "expo";

// Register widget handler only in native builds. Expo Go does not include the
// react-native-android-widget native module, so importing it there crashes CRUD tests.
if (Platform.OS === "android" && !isExpoGo) {
  void Promise.all([
    import("react-native-android-widget"),
    import("./widget-task-handler"),
  ])
    .then(([widgetModule, handlerModule]) => {
      widgetModule.registerWidgetTaskHandler(handlerModule.widgetTaskHandler);
    })
    .catch((error) => {
      console.warn("[Widget] Failed to register task handler:", error);
    });
}
