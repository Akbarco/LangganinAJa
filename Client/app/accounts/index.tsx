import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { Subscription, SubscriptionAccount } from "@/types";

type AccountItem = {
  account: SubscriptionAccount;
  subscription: Subscription;
};
type FilterType = "all" | "active" | "inactive";
type AccountSortType = "newest" | "name" | "service" | "price_asc" | "price_desc";

const STATUS_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Nonaktif" },
];

const ACCOUNT_SORT_OPTIONS: {
  key: AccountSortType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "newest", label: "Terbaru", icon: "time-outline" },
  { key: "name", label: "Nama Akun A-Z", icon: "person-outline" },
  { key: "service", label: "Nama Langganan", icon: "albums-outline" },
  { key: "price_asc", label: "Harga Termurah", icon: "trending-down-outline" },
  { key: "price_desc", label: "Harga Termahal", icon: "trending-up-outline" },
];

const getSafeTimestamp = (value?: string) => {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

function AccountCard({
  item,
  colors,
  isDark,
}: {
  item: AccountItem;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const { account, subscription } = item;
  const isActive = account.status === "ACTIVE";
  const s = useMemo(() => cardStyles(colors, isDark), [colors, isDark]);

  return (
    <TouchableOpacity
      style={[s.card, !isActive && s.cardInactive]}
      onPress={() => router.push(`/accounts/${account.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={s.topRow}>
        <View style={[s.avatar, !isActive && s.avatarInactive]}>
          <Ionicons
            name="person-outline"
            size={18}
            color={isActive ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={[s.statusPill, isActive ? s.statusActive : s.statusInactive]}>
          <Text style={[s.statusText, { color: isActive ? colors.success : colors.danger }]}>
            {isActive ? "Aktif" : "Nonaktif"}
          </Text>
        </View>
      </View>
      <Text style={s.name} numberOfLines={1}>{account.name}</Text>
      <Text style={s.email} numberOfLines={1}>{account.email || "Email Gmail belum diisi"}</Text>
      <Text style={s.service} numberOfLines={1}>{subscription.name}</Text>
      <Text style={s.price} numberOfLines={1}>{formatCurrency(subscription.price)} / akun</Text>
    </TouchableOpacity>
  );
}

export default function AccountsScreen() {
  const { token } = useAuthStore();
  const {
    subscriptions,
    accountsBySubscriptionId,
    fetchSubscriptions,
    fetchSubscriptionAccounts,
    isLoading,
    refresh,
    isRefreshing,
  } = useSubscriptionStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [activeSort, setActiveSort] = React.useState<AccountSortType>("newest");
  const [isFilterModalVisible, setIsFilterModalVisible] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      if (subscriptions.length === 0) fetchSubscriptions();
    }, [token, fetchSubscriptions, subscriptions.length]),
  );

  React.useEffect(() => {
    if (!token || subscriptions.length === 0) return;
    subscriptions.forEach((subscription) => {
      if (accountsBySubscriptionId[subscription.id] === undefined) {
        fetchSubscriptionAccounts(subscription.id);
      }
    });
  }, [accountsBySubscriptionId, token, subscriptions, fetchSubscriptionAccounts]);

  const accountItems = useMemo<AccountItem[]>(() => {
    return subscriptions
      .flatMap((subscription) =>
        (accountsBySubscriptionId[subscription.id] || []).map((account) => ({
          account,
          subscription,
        })),
      )
  }, [subscriptions, accountsBySubscriptionId]);
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = accountItems.filter(({ account, subscription }) => {
      if (activeFilter === "active" && account.status !== "ACTIVE") return false;
      if (activeFilter === "inactive" && account.status !== "INACTIVE") return false;
      if (!q) return true;
      return [
        account.name,
        account.email,
        account.holderName,
        account.notes,
        subscription.name,
      ].some((value) => value?.toLowerCase().includes(q));
    });

    return [...result].sort((a, b) => {
      if (activeFilter === "all" && a.account.status !== b.account.status) {
        return a.account.status === "ACTIVE" ? -1 : 1;
      }
      switch (activeSort) {
        case "name":
          return a.account.name.localeCompare(b.account.name);
        case "service":
          return a.subscription.name.localeCompare(b.subscription.name);
        case "price_asc":
          return a.subscription.price - b.subscription.price;
        case "price_desc":
          return b.subscription.price - a.subscription.price;
        case "newest":
        default:
          return (
            (getSafeTimestamp(b.account.updatedAt) || getSafeTimestamp(b.account.createdAt)) -
            (getSafeTimestamp(a.account.updatedAt) || getSafeTimestamp(a.account.createdAt))
          );
      }
    });
  }, [accountItems, activeFilter, activeSort, searchQuery]);
  const hasActiveControls =
    searchQuery.trim().length > 0 || activeFilter !== "all" || activeSort !== "newest";
  const activeFilterCount =
    (activeFilter !== "all" ? 1 : 0) + (activeSort !== "newest" ? 1 : 0);
  const activeFilterLabel =
    STATUS_FILTERS.find((item) => item.key === activeFilter)?.label ?? "Semua";
  const activeSortLabel =
    ACCOUNT_SORT_OPTIONS.find((item) => item.key === activeSort)?.label ?? "Terbaru";
  const clearControls = () => {
    setSearchQuery("");
    setActiveFilter("all");
    setActiveSort("newest");
    setIsFilterModalVisible(false);
  };

  if (isLoading && subscriptions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsFilterModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Akun</Text>
                <Text style={styles.modalSubtitle}>Atur status dan urutan daftar.</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Status</Text>
              {STATUS_FILTERS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.modalOption,
                    activeFilter === item.key && styles.modalOptionActive,
                  ]}
                  onPress={() => setActiveFilter(item.key)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      activeFilter === item.key && styles.modalOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {activeFilter === item.key && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Urutkan Berdasarkan</Text>
              {ACCOUNT_SORT_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.modalOption,
                    activeSort === item.key && styles.modalOptionActive,
                  ]}
                  onPress={() => setActiveSort(item.key)}
                >
                  <View style={styles.modalOptionLeft}>
                    <Ionicons
                      name={item.icon}
                      size={17}
                      color={activeSort === item.key ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalOptionText,
                        activeSort === item.key && styles.modalOptionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {activeSort === item.key && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={clearControls}>
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
        data={filteredAccounts}
        numColumns={2}
        keyExtractor={(item) => item.account.id}
        renderItem={({ item }) => (
          <AccountCard item={item} colors={colors} isDark={isDark} />
        )}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        refreshing={isRefreshing}
        onRefresh={refresh}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Semua Akun</Text>
                <Text style={styles.subtitle}>{filteredAccounts.length} akun dari semua langganan</Text>
              </View>
              <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterModalVisible(true)}>
                <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.searchPanel}>
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari akun atau email..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {!!searchQuery.trim() && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.filterSummaryRow}>
                <Text style={styles.filterSummaryText}>
                  Status: {activeFilterLabel} — Urutkan: {activeSortLabel}
                </Text>
                {hasActiveControls && (
                  <TouchableOpacity style={styles.resetChip} onPress={clearControls}>
                    <Text style={styles.resetChipText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name={hasActiveControls ? "search-outline" : "people-outline"} size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>{hasActiveControls ? "Akun tidak ditemukan" : "Belum ada akun"}</Text>
            <Text style={styles.emptyText}>
              {hasActiveControls
                ? "Coba kata kunci lain atau reset filter."
                : "Buka detail langganan untuk menambahkan akun atau profil."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: Spacing.lg, paddingBottom: 120 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: { color: c.text, fontSize: FontSize.xxl, fontWeight: "700" },
    subtitle: { color: c.textMuted, fontSize: FontSize.sm, marginTop: 3 },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterBadge: {
      position: "absolute",
      top: 5,
      right: 5,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      backgroundColor: c.primary,
    },
    filterBadgeText: { color: c.white, fontSize: 10, fontWeight: "700" },
    searchPanel: { marginBottom: Spacing.md, gap: Spacing.sm },
    searchInputWrap: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: BorderRadius.md,
      backgroundColor: c.surface,
      paddingHorizontal: Spacing.md,
    },
    searchInput: { flex: 1, color: c.text, fontSize: FontSize.md, paddingVertical: Spacing.sm },
    filterSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    filterSummaryText: { flex: 1, color: c.textMuted, fontSize: FontSize.xs, lineHeight: 18 },
    resetChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: c.primaryLight,
    },
    resetChipText: { color: c.primary, fontSize: FontSize.xs, fontWeight: "700" },
    gridRow: { gap: Spacing.sm },
    emptyCard: {
      alignItems: "center",
      padding: Spacing.xl,
      borderRadius: BorderRadius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      gap: Spacing.sm,
    },
    emptyTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
    emptyText: { color: c.textSecondary, fontSize: FontSize.sm, textAlign: "center", lineHeight: 20 },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.overlay,
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
    modalTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
    modalSubtitle: { color: c.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
    modalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceLight,
    },
    modalSection: { gap: Spacing.sm },
    modalSectionTitle: { color: c.text, fontSize: FontSize.sm, fontWeight: "700" },
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
    modalOptionActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
    modalOptionLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1 },
    modalOptionText: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "600" },
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
    modalSecondaryBtnText: { color: c.textSecondary, fontWeight: "700" },
    modalPrimaryBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: BorderRadius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
    },
    modalPrimaryBtnText: { color: c.white, fontWeight: "700" },
  });

const cardStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 162,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 7,
    },
    cardInactive: {
      backgroundColor: isDark ? "#13131F" : "#F3F4F6",
      borderColor: isDark ? "#1E1E30" : "#E2E4E8",
    },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primaryLight,
    },
    avatarInactive: { backgroundColor: isDark ? "#202034" : "#E8EAEE" },
    statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
    statusActive: { backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.1)" },
    statusInactive: { backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.1)" },
    statusText: { fontSize: FontSize.xs - 1, fontWeight: "700" },
    name: { color: c.text, fontSize: FontSize.md, fontWeight: "700", marginTop: 2 },
    email: { color: c.textMuted, fontSize: FontSize.xs },
    service: { color: c.textSecondary, fontSize: FontSize.xs },
    price: { color: c.primary, fontSize: FontSize.xs, fontWeight: "700", marginTop: "auto" },
  });
