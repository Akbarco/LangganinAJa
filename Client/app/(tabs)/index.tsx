import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
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
import { Subscription, SubscriptionAccount } from "@/types";
import { daysUntil, formatCurrency } from "@/lib/utils";

type FilterType = "all" | "active" | "inactive";
type SortType = "newest" | "name" | "price_asc" | "price_desc" | "due_soon";
type AccountSortType = "newest" | "name" | "service" | "price_asc" | "price_desc";
type HomeTab = "subscriptions" | "accounts";

const SUBSCRIPTION_PREVIEW_LIMIT = 6;
const ACCOUNT_PREVIEW_LIMIT = 12;

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

const getGreetingMessage = () => {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
};

function AccountPreviewCard({
  account,
  subscription,
  onPress,
  colors,
  isDark,
  fullWidth = false,
}: {
  account: SubscriptionAccount;
  subscription: Subscription;
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
  fullWidth?: boolean;
}) {
  const isActive = account.status === "ACTIVE";
  const s = stylesAccountPreview(colors, isDark);
  return (
    <TouchableOpacity
      style={[
        s.card,
        fullWidth && s.cardFull,
        !isActive && s.cardInactive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={s.topRow}>
        <View style={s.avatar}>
          <Ionicons
            name="person-outline"
            size={17}
            color={isActive ? colors.primary : colors.textMuted}
          />
        </View>
        <View
          style={[
            s.statusPill,
            isActive
              ? s.statusActive
              : s.statusInactive,
          ]}
        >
          <Text
            style={[
              s.statusText,
              { color: isActive ? colors.success : colors.danger },
            ]}
          >
            {isActive ? "Aktif" : "Nonaktif"}
          </Text>
        </View>
      </View>
      <Text style={s.name} numberOfLines={1}>
        {account.name}
      </Text>
      <Text style={s.service} numberOfLines={1}>
        {subscription.name}
      </Text>
      <Text style={s.email} numberOfLines={1}>
        {account.email || "Email Gmail belum diisi"}
      </Text>
      <Text style={s.price} numberOfLines={1}>
        {formatCurrency(subscription.price)} / akun
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user, token } = useAuthStore();
  const {
    subscriptions,
    accountsBySubscriptionId,
    summary,
    fetchSubscriptions,
    fetchSummary,
    fetchSubscriptionAccounts,
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
  const [accountSearchQuery, setAccountSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<FilterType>("all");
  const [accountSort, setAccountSort] = useState<AccountSortType>("newest");
  const [activeHomeTab, setActiveHomeTab] = useState<HomeTab>("subscriptions");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Subscription | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      fetchSubscriptions();
      fetchSummary();
    }, [token, fetchSubscriptions, fetchSummary]),
  );

  React.useEffect(() => {
    if (!token || subscriptions.length === 0) return;
    subscriptions.forEach((subscription) => {
      fetchSubscriptionAccounts(subscription.id);
    });
  }, [token, subscriptions, fetchSubscriptionAccounts]);

  const getActiveAccountCount = useCallback(
    (subscriptionId: string) =>
      (accountsBySubscriptionId[subscriptionId] || []).filter(
        (account) => account.status === "ACTIVE",
      ).length,
    [accountsBySubscriptionId],
  );

  const getDisplayPrice = useCallback(
    (subscription: Subscription) => {
      const activeAccountCount = getActiveAccountCount(subscription.id);
      return subscription.price * (activeAccountCount > 0 ? activeAccountCount : 1);
    },
    [getActiveAccountCount],
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
          return getDisplayPrice(a) - getDisplayPrice(b);
        });
        break;
      case "price_desc":
        result.sort((a, b) => {
          const o = cmp(a, b);
          if (o) return o;
          return getDisplayPrice(b) - getDisplayPrice(a);
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
  }, [subscriptions, searchQuery, activeFilter, activeSort, getDisplayPrice]);

  const accountPreview = useMemo(() => {
    return subscriptions
      .flatMap((subscription) =>
        (accountsBySubscriptionId[subscription.id] || []).map((account) => ({
          account,
          subscription,
        })),
      );
  }, [subscriptions, accountsBySubscriptionId]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearchQuery.trim().toLowerCase();
    const result = accountPreview.filter(({ account, subscription }) => {
      if (accountFilter === "active" && account.status !== "ACTIVE") return false;
      if (accountFilter === "inactive" && account.status !== "INACTIVE") return false;
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
      if (accountFilter === "all" && a.account.status !== b.account.status) {
        return a.account.status === "ACTIVE" ? -1 : 1;
      }
      switch (accountSort) {
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
  }, [accountFilter, accountPreview, accountSearchQuery, accountSort]);

  const visibleAccountPreview = filteredAccounts.slice(0, ACCOUNT_PREVIEW_LIMIT);
  const visibleSubscriptions = filteredSubscriptions.slice(0, SUBSCRIPTION_PREVIEW_LIMIT);

  const isAccountsTab = activeHomeTab === "accounts";
  const hasActiveControls =
    isAccountsTab
      ? accountSearchQuery.trim().length > 0 ||
        accountFilter !== "all" ||
        accountSort !== "newest"
      : searchQuery.trim().length > 0 ||
        activeFilter !== "all" ||
        activeSort !== "newest";
  const activeFilterCount =
    isAccountsTab
      ? (accountFilter !== "all" ? 1 : 0) + (accountSort !== "newest" ? 1 : 0)
      : (activeFilter !== "all" ? 1 : 0) + (activeSort !== "newest" ? 1 : 0);
  const activeFilterLabel =
    STATUS_FILTERS.find((f) => f.key === (isAccountsTab ? accountFilter : activeFilter))?.label ?? "Semua";
  const activeSortLabel =
    isAccountsTab
      ? ACCOUNT_SORT_OPTIONS.find((s) => s.key === accountSort)?.label ?? "Terbaru"
      : SORT_OPTIONS.find((s) => s.key === activeSort)?.label ?? "Terbaru";
  const currentSortOptions = isAccountsTab ? ACCOUNT_SORT_OPTIONS : SORT_OPTIONS;

  const clearControls = () => {
    if (isAccountsTab) {
      setAccountSearchQuery("");
      setAccountFilter("all");
      setAccountSort("newest");
    } else {
      setSearchQuery("");
      setActiveFilter("all");
      setActiveSort("newest");
    }
    setIsFilterModalVisible(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const sub = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteSubscription(sub.id);
      await fetchSummary();
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
              placeholder={isAccountsTab ? "Cari akun atau email..." : "Cari langganan..."}
              placeholderTextColor={colors.textMuted}
              value={isAccountsTab ? accountSearchQuery : searchQuery}
              onChangeText={isAccountsTab ? setAccountSearchQuery : setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              blurOnSubmit={false}
              returnKeyType="search"
            />
            {(isAccountsTab ? accountSearchQuery : searchQuery).trim() && (
              <TouchableOpacity
                onPress={() => (isAccountsTab ? setAccountSearchQuery("") : setSearchQuery(""))}
                hitSlop={8}
              >
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
          {hasActiveControls && (
            <TouchableOpacity style={styles.resetChip} onPress={clearControls}>
              <Text style={styles.resetChipText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {summary && <SummaryCards summary={summary} />}
      <View style={styles.listLabelRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeHomeTab === "subscriptions" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveHomeTab("subscriptions")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeHomeTab === "subscriptions" && styles.tabButtonTextActive,
            ]}
          >
            Daftar Langganan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeHomeTab === "accounts" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveHomeTab("accounts")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeHomeTab === "accounts" && styles.tabButtonTextActive,
            ]}
          >
            Daftar Akun
          </Text>
        </TouchableOpacity>
      </View>
      {activeHomeTab === "subscriptions" ? (
        <View style={styles.sectionMetaRow}>
          <Text style={styles.accountsPreviewSubtitle}>
            {filteredSubscriptions.length} langganan ditemukan
          </Text>
          {filteredSubscriptions.length > SUBSCRIPTION_PREVIEW_LIMIT && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push("/subscriptions" as any)}
            >
              <Text style={styles.viewAllButtonText}>Lihat semua</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.accountsPreviewSection}>
          <View style={styles.sectionMetaRow}>
            <Text style={styles.accountsPreviewSubtitle}>
              {filteredAccounts.length > 0
                ? `${filteredAccounts.filter((item) => item.account.status === "ACTIVE").length} aktif dari ${filteredAccounts.length} akun`
                : "Akun dari langganan akan tampil di sini"}
            </Text>
            {filteredAccounts.length > ACCOUNT_PREVIEW_LIMIT && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/accounts" as any)}
              >
                <Text style={styles.viewAllButtonText}>Lihat semua</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {filteredAccounts.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyAccountsPreview}
              onPress={() => {
                if (hasActiveControls) {
                  clearControls();
                  return;
                }
                router.push("/add" as any);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={hasActiveControls ? "search-outline" : "people-outline"} size={20} color={colors.primary} />
              <Text style={styles.emptyAccountsPreviewText}>
                {hasActiveControls
                  ? "Akun tidak ditemukan. Tap untuk reset pencarian."
                  : "Tambahkan akun lewat detail langganan setelah paket dibuat."}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.accountsPreviewGrid}>
              {visibleAccountPreview.map(({ account, subscription }) => (
                <AccountPreviewCard
                  key={account.id}
                  account={account}
                  subscription={subscription}
                  onPress={() => router.push(`/accounts/${account.id}` as any)}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </View>
          )}
        </View>
      )}
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
                <Text style={styles.modalTitle}>
                  {isAccountsTab ? "Filter Akun" : "Filter Langganan"}
                </Text>
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
                    (isAccountsTab ? accountFilter : activeFilter) === f.key && styles.modalOptionActive,
                  ]}
                  onPress={() =>
                    isAccountsTab ? setAccountFilter(f.key) : setActiveFilter(f.key)
                  }
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      (isAccountsTab ? accountFilter : activeFilter) === f.key && styles.modalOptionTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                  {(isAccountsTab ? accountFilter : activeFilter) === f.key && (
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
              {currentSortOptions.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.modalOption,
                    (isAccountsTab ? accountSort : activeSort) === s.key && styles.modalOptionActive,
                  ]}
                  onPress={() =>
                    isAccountsTab
                      ? setAccountSort(s.key as AccountSortType)
                      : setActiveSort(s.key as SortType)
                  }
                >
                  <View style={styles.modalOptionLeft}>
                    <Ionicons
                      name={s.icon}
                      size={17}
                      color={
                        (isAccountsTab ? accountSort : activeSort) === s.key
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.modalOptionText,
                        (isAccountsTab ? accountSort : activeSort) === s.key && styles.modalOptionTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </View>
                  {(isAccountsTab ? accountSort : activeSort) === s.key && (
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
        data={activeHomeTab === "subscriptions" ? visibleSubscriptions : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            activeAccountCount={getActiveAccountCount(item.id)}
            onPress={() => router.push(`/detail/${item.id}` as any)}
            onEdit={() => router.push(`/edit/${item.id}` as any)}
            onDelete={() => setPendingDelete(item)}
            onToggle={() => setPendingToggle(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={activeHomeTab === "subscriptions" ? emptyState : null}
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
      alignItems: "center",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.xs,
    },
    listLabel: { color: c.text, fontSize: FontSize.lg, fontWeight: "600" },
    tabButton: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: Spacing.sm,
    },
    tabButtonActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    tabButtonText: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: "700",
    },
    tabButtonTextActive: {
      color: c.white,
    },
    sectionMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    viewAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      minHeight: 34,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
      backgroundColor: c.primaryLight,
    },
    viewAllButtonText: {
      color: c.primary,
      fontSize: FontSize.xs,
      fontWeight: "700",
    },
    accountsPreviewSection: {
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    accountsPreviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.lg,
      gap: Spacing.md,
    },
    accountsPreviewSubtitle: {
      color: c.textMuted,
      fontSize: FontSize.xs,
      marginTop: 4,
    },
    accountsPreviewAdd: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      minHeight: 36,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.sm,
      backgroundColor: c.primary,
    },
    accountsPreviewAddText: {
      color: c.white,
      fontSize: FontSize.xs,
      fontWeight: "600",
    },
    emptyAccountsPreview: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      minHeight: 58,
      marginHorizontal: Spacing.lg,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    emptyAccountsPreviewText: {
      flex: 1,
      color: c.textSecondary,
      fontSize: FontSize.xs,
      lineHeight: 18,
    },
    accountsPreviewGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    accountsSheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: c.overlay,
    },
    accountsSheet: {
      maxHeight: "78%",
      backgroundColor: c.background,
      borderTopLeftRadius: BorderRadius.lg,
      borderTopRightRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    accountsSheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    accountsSheetTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
    accountsSheetSubtitle: {
      color: c.textMuted,
      fontSize: FontSize.xs,
      marginTop: 4,
    },
    accountsSheetList: { gap: Spacing.sm, paddingBottom: Spacing.lg },
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

const stylesAccountPreview = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      width: "48.5%",
      minHeight: 146,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 7,
    },
    cardFull: {
      width: "100%",
      minHeight: 122,
    },
    cardInactive: {
      backgroundColor: isDark ? "#13131F" : "#F3F4F6",
      borderColor: isDark ? "#1E1E30" : "#E2E4E8",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primaryLight,
    },
    statusPill: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    statusActive: {
      backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.1)",
    },
    statusInactive: {
      backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.1)",
    },
    statusText: {
      fontSize: FontSize.xs - 1,
      fontWeight: "700",
    },
    name: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "700",
      marginTop: 2,
    },
    service: {
      color: c.textSecondary,
      fontSize: FontSize.xs,
    },
    email: {
      color: c.textMuted,
      fontSize: FontSize.xs,
    },
    price: {
      color: c.primary,
      fontSize: FontSize.xs,
      fontWeight: "700",
      marginTop: "auto",
    },
  });
