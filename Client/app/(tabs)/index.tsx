import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SummaryCards from "@/components/SummaryCards";
import SubscriptionCard from "@/components/SubscriptionCard";
import { Spacing, FontSize, BorderRadius, ThemeColors } from "@/constants";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useTheme } from "@/hooks/useTheme";
import { Subscription } from "@/types";
import { daysUntil } from "@/lib/utils";

type FilterType = "all" | "active" | "inactive";
type SortType = "newest" | "name" | "price_asc" | "price_desc" | "due_soon";

const SORT_OPTIONS: {
  key: SortType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "newest", label: "Terbaru", icon: "time-outline" },
  { key: "due_soon", label: "Pembayaran Terdekat", icon: "alarm-outline" },
  { key: "name", label: "Nama A-Z", icon: "text-outline" },
  { key: "price_asc", label: "Harga Termurah", icon: "trending-down-outline" },
  { key: "price_desc", label: "Harga Termahal", icon: "trending-up-outline" },
];

const STATUS_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Nonaktif" },
];

const getSafeTimestamp = (value?: string) => {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getGreetingMessage = () => {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
};

export default function HomeScreen() {
  const { user, token } = useAuthStore();
  const {
    subscriptions,
    summary,
    fetchSubscriptions,
    fetchSummary,
    toggleActive,
    deleteSubscription,
    isLoading,
    isRefreshing,
    refresh,
  } = useSubscriptionStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("newest");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Subscription | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      fetchSubscriptions();
      fetchSummary();
    }, [token]),
  );

  const filteredSubscriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = subscriptions.filter((s) => {
      if (activeFilter === "active" && !s.isActive) return false;
      if (activeFilter === "inactive" && s.isActive) return false;
      if (!q) return true;
      return [s.name, s.category].some((f) => f?.toLowerCase().includes(q));
    });
    result = [...result];
    const cmp = (a: Subscription, b: Subscription) => {
      if (activeFilter !== "all" || a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    };
    switch (activeSort) {
      case "newest":
        result.sort((a, b) => {
          const o = cmp(a, b);
          if (o) return o;
          return (
            (getSafeTimestamp(b.updatedAt) || getSafeTimestamp(b.createdAt)) -
            (getSafeTimestamp(a.updatedAt) || getSafeTimestamp(a.createdAt))
          );
        });
        break;
      case "name":
        result.sort((a, b) => {
          const o = cmp(a, b);
          if (o) return o;
          return a.name.localeCompare(b.name);
        });
        break;
      case "price_asc":
        result.sort((a, b) => {
          const o = cmp(a, b);
          if (o) return o;
          return a.price - b.price;
        });
        break;
      case "price_desc":
        result.sort((a, b) => {
          const o = cmp(a, b);
          if (o) return o;
          return b.price - a.price;
        });
        break;
      case "due_soon":
        result.sort((a, b) => {
          const o = cmp(a, b);
          if (o) return o;
          return daysUntil(a.nextPaymentDate) - daysUntil(b.nextPaymentDate);
        });
        break;
    }
    return result;
  }, [subscriptions, searchQuery, activeFilter, activeSort]);

  const hasActiveControls =
    searchQuery.trim().length > 0 ||
    activeFilter !== "all" ||
    activeSort !== "newest";
  const activeFilterCount =
    (activeFilter !== "all" ? 1 : 0) + (activeSort !== "newest" ? 1 : 0);
  const activeFilterLabel =
    STATUS_FILTERS.find((f) => f.key === activeFilter)?.label ?? "Semua";
  const activeSortLabel =
    SORT_OPTIONS.find((s) => s.key === activeSort)?.label ?? "Terbaru";

  const clearControls = () => {
    setSearchQuery("");
    setActiveFilter("all");
    setActiveSort("newest");
    setIsFilterModalVisible(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const sub = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteSubscription(sub.id);
      await fetchSummary();
      Toast.show({
        type: "success",
        text1: "Berhasil",
        text2: `${sub.name} telah dihapus`,
      });
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: e.message });
    }
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const sub = pendingToggle;
    setPendingToggle(null);
    try {
      await toggleActive(sub.id, !sub.isActive);
      await fetchSummary();
      Toast.show({
        type: "success",
        text1: sub.isActive ? "Dinonaktifkan" : "Diaktifkan",
        text2: sub.name,
      });
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: e.message });
    }
  };

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>{getGreetingMessage()}</Text>
        <Text style={styles.userName}>{user?.name || "User"}</Text>
      </View>
      <View style={styles.filterPanel}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari langganan..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              blurOnSubmit={false}
              returnKeyType="search"
            />
            {!!searchQuery.trim() && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={colors.textSecondary}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.filterSummaryRow}>
          <Text style={styles.filterSummaryText}>
            Status: {activeFilterLabel} — Urutkan: {activeSortLabel}
          </Text>
          {(activeFilter !== "all" || activeSort !== "newest") && (
            <TouchableOpacity style={styles.resetChip} onPress={clearControls}>
              <Text style={styles.resetChipText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {summary && <SummaryCards summary={summary} />}
      <View style={styles.listLabelRow}>
        <Text style={styles.listLabel}>Daftar Langganan</Text>
      </View>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="search-outline" size={24} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>
        {hasActiveControls ? "Hasil tidak ditemukan" : "Belum ada langganan"}
      </Text>
      <Text style={styles.emptyText}>
        {hasActiveControls
          ? "Coba kata kunci lain atau reset filter biar hasilnya muncul lagi."
          : "Tambahkan langganan pertama kamu supaya dashboard ini mulai terisi."}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => {
          if (hasActiveControls) {
            clearControls();
            return;
          }
          router.push("/add" as any);
        }}
      >
        <Text style={styles.emptyButtonText}>
          {hasActiveControls ? "Reset pencarian" : "Tambah langganan"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && subscriptions.length === 0)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsFilterModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Langganan</Text>
                <Text style={styles.modalSubtitle}>
                  Atur status dan urutan daftar.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Ionicons
                  name="close-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Status</Text>
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.modalOption,
                    activeFilter === f.key && styles.modalOptionActive,
                  ]}
                  onPress={() => setActiveFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      activeFilter === f.key && styles.modalOptionTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                  {activeFilter === f.key && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Urutkan Berdasarkan</Text>
              {SORT_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.modalOption,
                    activeSort === s.key && styles.modalOptionActive,
                  ]}
                  onPress={() => setActiveSort(s.key)}
                >
                  <View style={styles.modalOptionLeft}>
                    <Ionicons
                      name={s.icon}
                      size={17}
                      color={
                        activeSort === s.key
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.modalOptionText,
                        activeSort === s.key && styles.modalOptionTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </View>
                  {activeSort === s.key && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={clearControls}
              >
                <Text style={styles.modalSecondaryBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text style={styles.modalPrimaryBtnText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            onPress={() => router.push(`/detail/${item.id}` as any)}
            onEdit={() => router.push(`/edit/${item.id}` as any)}
            onDelete={() => setPendingDelete(item)}
            onToggle={() => setPendingToggle(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      <ConfirmDialog
        visible={!!pendingDelete}
        title="Hapus Langganan"
        message={
          pendingDelete
            ? `Yakin ingin menghapus "${pendingDelete.name}"? Data pembayaran terkait juga ikut terhapus.`
            : ""
        }
        icon="trash-outline"
        onClose={() => setPendingDelete(null)}
        actions={[
          {
            label: "Batal",
            variant: "secondary",
            onPress: () => setPendingDelete(null),
          },
          { label: "Hapus", variant: "danger", onPress: confirmDelete },
        ]}
      />
      <ConfirmDialog
        visible={!!pendingToggle}
        title={
          pendingToggle?.isActive ? "Nonaktifkan Langganan" : "Aktifkan Langganan"
        }
        message={
          pendingToggle
            ? `Yakin ingin ${
                pendingToggle.isActive ? "menonaktifkan" : "mengaktifkan"
              } "${pendingToggle.name}"?`
            : ""
        }
        icon={pendingToggle?.isActive ? "pause-circle-outline" : "play-circle-outline"}
        onClose={() => setPendingToggle(null)}
        actions={[
          {
            label: "Batal",
            variant: "secondary",
            onPress: () => setPendingToggle(null),
          },
          {
            label: pendingToggle?.isActive ? "Nonaktifkan" : "Aktifkan",
            variant: pendingToggle?.isActive ? "danger" : "success",
            onPress: confirmToggle,
          },
        ]}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingBottom: Spacing.md, gap: Spacing.md },
    greetingContainer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      gap: 2,
    },
    greeting: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: "500",
    },
    userName: { color: c.text, fontSize: FontSize.xxl, fontWeight: "600" },
    filterPanel: { marginHorizontal: Spacing.lg, gap: Spacing.sm },
    searchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    searchInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: Spacing.sm,
      minHeight: 48,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.sm,
      color: c.text,
      fontSize: FontSize.md,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      backgroundColor: c.primary,
    },
    filterBadgeText: { color: c.white, fontSize: 10, fontWeight: "600" },
    filterSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    filterSummaryText: {
      flex: 1,
      color: c.textMuted,
      fontSize: FontSize.xs,
      lineHeight: 18,
    },
    resetChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: isDark
        ? "rgba(255,107,107,0.15)"
        : "rgba(220,38,38,0.06)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,107,107,0.3)" : "rgba(220,38,38,0.15)",
    },
    resetChipText: {
      color: c.danger,
      fontSize: FontSize.xs,
      fontWeight: "500",
    },
    listLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.xs,
    },
    listLabel: { color: c.text, fontSize: FontSize.lg, fontWeight: "600" },
    listContent: { paddingBottom: 110 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
    },
    emptyContainer: {
      alignItems: "center",
      marginHorizontal: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.xxl,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primaryLight,
      marginBottom: Spacing.md,
    },
    emptyTitle: {
      color: c.text,
      fontSize: FontSize.lg,
      fontWeight: "600",
      marginBottom: Spacing.xs,
      textAlign: "center",
    },
    emptyText: {
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: Spacing.lg,
      fontSize: FontSize.sm,
    },
    emptyButton: {
      backgroundColor: c.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
      borderRadius: BorderRadius.sm,
    },
    emptyButtonText: {
      color: c.white,
      fontWeight: "600",
      fontSize: FontSize.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      paddingHorizontal: Spacing.lg,
    },
    modalCard: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: Spacing.md,
    },
    modalTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "600" },
    modalSubtitle: {
      color: c.textSecondary,
      fontSize: FontSize.xs,
      marginTop: 4,
    },
    modalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceLight,
    },
    modalSection: { gap: Spacing.sm },
    modalSectionTitle: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    modalOption: {
      minHeight: 44,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceLight,
      paddingHorizontal: Spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    modalOptionActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    modalOptionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      flex: 1,
    },
    modalOptionText: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: "500",
    },
    modalOptionTextActive: { color: c.text },
    modalActions: { flexDirection: "row", gap: Spacing.sm },
    modalSecondaryBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: BorderRadius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalSecondaryBtnText: { color: c.textSecondary, fontWeight: "600" },
    modalPrimaryBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: BorderRadius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
    },
    modalPrimaryBtnText: { color: c.white, fontWeight: "600" },
  });
