/**
 * widget-preview.tsx — Halaman preview widget di dalam app.
 *
 * Berguna untuk melihat tampilan widget tanpa harus rebuild APK setiap kali.
 * Pakai komponen WidgetPreview dari react-native-android-widget.
 *
 * Akses via: Settings atau route langsung /widget-preview (dev only).
 */

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WidgetPreview } from "react-native-android-widget";

import {
  WidgetData,
  getSystemIsDark,
  loadWidgetData,
} from "@/lib/widgetData";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, FontSize, BorderRadius } from "@/constants";

import { SmallWidget } from "@/widgets/SmallWidget";
import { MediumWidget } from "@/widgets/MediumWidget";
import { LargeWidget } from "@/widgets/LargeWidget";

export default function WidgetPreviewScreen() {
  const { colors, isDark } = useTheme();
  const systemColorScheme = useColorScheme();

  const [isLoading, setIsLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  // Allow toggling dark mode independently for preview
  const [previewDark, setPreviewDark] = useState(getSystemIsDark());

  useEffect(() => {
    loadWidgetData(3)
      .then((data) => setWidgetData(data))
      .finally(() => setIsLoading(false));
  }, []);

  const data: WidgetData = widgetData
    ? { ...widgetData, isDark: previewDark }
    : {
        isLoggedIn: false,
        summary: null,
        upcoming: [],
        isDark: previewDark,
      };

  const s = styles(colors, isDark);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Widget Preview</Text>
          <Text style={s.headerSub}>Tampilan widget di home screen</Text>
        </View>
        {/* Dark mode toggle */}
        <View style={s.toggleWrap}>
          <Ionicons
            name={previewDark ? "moon" : "sunny"}
            size={16}
            color={colors.textSecondary}
          />
          <Switch
            value={previewDark}
            onValueChange={setPreviewDark}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Memuat data widget...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info banner */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={s.infoText}>
              Preview ini menampilkan data real dari database lokal kamu. Toggle tema di kanan atas untuk test light/dark.
            </Text>
          </View>

          {/* ── Small Widget ─────────────────────────────────────────────── */}
          <PreviewCard
            title="Small Widget"
            subtitle="2×1 cell — Quick Glance"
            colors={colors}
            isDark={isDark}
          >
            <WidgetPreview
              renderWidget={() => <SmallWidget {...data} width={160} height={80} />}
              width={160}
              height={80}
            />
          </PreviewCard>

          {/* ── Medium Widget ────────────────────────────────────────────── */}
          <PreviewCard
            title="Medium Widget"
            subtitle="3×2 cell — Summary Card"
            colors={colors}
            isDark={isDark}
          >
            <WidgetPreview
              renderWidget={() => <MediumWidget {...data} width={260} height={150} />}
              width={260}
              height={150}
            />
          </PreviewCard>

          {/* ── Large Widget ─────────────────────────────────────────────── */}
          <PreviewCard
            title="Large Widget"
            subtitle="4×3 cell — Full Dashboard"
            colors={colors}
            isDark={isDark}
          >
            <WidgetPreview
              renderWidget={() => <LargeWidget {...data} width={340} height={260} />}
              width={340}
              height={260}
            />
          </PreviewCard>

          {/* How-to note */}
          <View style={s.noteBanner}>
            <Text style={s.noteTitle}>📱 Cara pasang widget di HP:</Text>
            <Text style={s.noteStep}>1. Long-press home screen</Text>
            <Text style={s.noteStep}>2. Pilih "Widgets"</Text>
            <Text style={s.noteStep}>3. Cari "Langganinaja"</Text>
            <Text style={s.noteStep}>4. Drag & drop ke home screen</Text>
            <Text style={s.noteStep}>5. Drag tepi widget untuk resize ukuran</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Preview card wrapper ─────────────────────────────────────────────────────

function PreviewCard({
  title,
  subtitle,
  children,
  colors,
  isDark,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        marginBottom: Spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <View
        style={{
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm + 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: FontSize.md,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      {/* Widget preview centered */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: Spacing.lg,
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = (c: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: Spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.sm,
      backgroundColor: c.surfaceLight,
    },
    headerCenter: { flex: 1 },
    headerTitle: { color: c.text, fontSize: FontSize.md, fontWeight: "600" },
    headerSub: { color: c.textMuted, fontSize: FontSize.xs },
    toggleWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, paddingBottom: 40 },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.md,
    },
    loadingText: { color: c.textSecondary, fontSize: FontSize.sm },
    infoBanner: {
      flexDirection: "row",
      gap: Spacing.sm,
      backgroundColor: c.primaryLight,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      alignItems: "flex-start",
    },
    infoText: {
      flex: 1,
      color: c.text,
      fontSize: FontSize.xs,
      lineHeight: 18,
    },
    noteBanner: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      gap: 4,
    },
    noteTitle: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "600",
      marginBottom: 4,
    },
    noteStep: { color: c.textSecondary, fontSize: FontSize.sm },
  });
