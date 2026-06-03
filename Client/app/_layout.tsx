import { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import "react-native-reanimated";

import { useAuthStore } from "@/store/authStore";
import { useReceiptStore } from "@/store/receiptStore";
import { useThemeStore } from "@/store/themeStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeColors, Spacing, BorderRadius } from "@/constants";
import { requestNotificationPermissions } from "@/lib/notifications";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isReady, logout, isAppLockEnabled, appPin } = useAuthStore();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    if (isReady && (!isAppLockEnabled || !appPin)) {
      setIsUnlocked(true);
    }
  }, [isReady, isAppLockEnabled, appPin]);

  useEffect(() => {
    if (enteredPin.length === 4) {
      if (enteredPin === appPin) {
        setIsUnlocked(true);
        setPinError(false);
      } else {
        setPinError(true);
        setEnteredPin("");
      }
    }
  }, [enteredPin, appPin]);

  const handlePressNumber = (num: string) => {
    if (enteredPin.length < 4) {
      setEnteredPin((prev) => prev + num);
      setPinError(false);
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && isUnlocked && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [token, isReady, segments, isUnlocked]);

  const styles = useMemo(() => createPinStyles(colors), [colors]);

  if (token && isAppLockEnabled && !isUnlocked) {
    return (
      <View style={styles.pinContainer}>
        <View style={styles.pinIconWrap}>
          <Ionicons name="lock-closed" size={28} color={colors.primary} />
        </View>
        <Text style={styles.pinTitle}>Masukkan PIN</Text>
        <Text style={[styles.pinSubtitle, pinError && { color: colors.danger }]}>
          {pinError ? "PIN salah, coba lagi." : "Masukkan 4 digit PIN keamanan aplikasi."}
        </Text>

        <View style={styles.pinDotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                { backgroundColor: enteredPin.length > i ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>

        <View style={styles.numpadGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity key={num} style={styles.numpadBtn} onPress={() => handlePressNumber(num.toString())}>
              <Text style={styles.numpadText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.numpadBtn, { backgroundColor: "transparent" }]} />
          <TouchableOpacity style={styles.numpadBtn} onPress={() => handlePressNumber("0")}>
            <Text style={styles.numpadText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.numpadBtn, { backgroundColor: "transparent" }]} onPress={handleDelete}>
            <Ionicons name="backspace-outline" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{ marginTop: 40, padding: 12 }} onPress={() => logout()}>
          <Text style={{ color: colors.danger, fontWeight: "500", fontSize: 14 }}>Lupa PIN? (Logout)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { initialize, isReady } = useAuthStore();
  const initReceipts = useReceiptStore((s) => s.initialize);
  const isReceiptReady = useReceiptStore((s) => s.isReady);
  const initTheme = useThemeStore((s) => s.initialize);
  const isThemeReady = useThemeStore((s) => s.isReady);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    requestNotificationPermissions();
    Promise.all([initialize(), initReceipts(), initTheme()]).finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  if (!isReady || !isReceiptReady || !isThemeReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthGuard>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(auth)" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="detail/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="edit/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="accounts/index" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="accounts/[id]" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="subscriptions/index" options={{ animation: "slide_from_right" }} />
        </Stack>
      </AuthGuard>
      <Toast />
    </GestureHandlerRootView>
  );
}

const createPinStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pinContainer: { flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center", padding: 24 },
    pinIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: c.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    pinTitle: { color: c.text, fontSize: 20, fontWeight: "600" },
    pinSubtitle: { marginTop: 8, color: c.textMuted, fontSize: 14 },
    pinDotsRow: { flexDirection: "row", gap: 16, marginVertical: 40 },
    pinDot: { width: 14, height: 14, borderRadius: 7 },
    numpadGrid: { width: 280, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
    numpadBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center" },
    numpadText: { color: c.text, fontSize: 26, fontWeight: "500" },
  });
