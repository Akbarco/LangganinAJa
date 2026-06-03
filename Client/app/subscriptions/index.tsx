import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SubscriptionCard from "@/components/SubscriptionCard";
import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { Subscription } from "@/types";

export default function SubscriptionsScreen() {
  const { token } = useAuthStore();
  const {
    subscriptions,
    accountsBySubscriptionId,
    fetchSubscriptions,
    fetchSummary,
    fetchSubscriptionAccounts,
    toggleActive,
    deleteSubscription,
    isLoading,
    isRefreshing,
    refresh,
  } = useSubscriptionStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Subscription | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      if (subscriptions.length === 0) fetchSubscriptions();
      fetchSummary();
    }, [token, fetchSubscriptions, fetchSummary, subscriptions.length]),
  );

  React.useEffect(() => {
    if (!token || subscriptions.length === 0) return;
    subscriptions.forEach((subscription) => {
      if (accountsBySubscriptionId[subscription.id] === undefined) {
        fetchSubscriptionAccounts(subscription.id);
      }
    });
  }, [accountsBySubscriptionId, token, subscriptions, fetchSubscriptionAccounts]);

  const getActiveAccountCount = useCallback(
    (subscriptionId: string) =>
      (accountsBySubscriptionId[subscriptionId] || []).filter(
        (account) => account.status === "ACTIVE",
      ).length,
    [accountsBySubscriptionId],
  );

  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [subscriptions]);

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
      <FlatList
        data={sortedSubscriptions}
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
        refreshing={isRefreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Semua Langganan</Text>
              <Text style={styles.subtitle}>{sortedSubscriptions.length} langganan tercatat</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="albums-outline" size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Belum ada langganan</Text>
            <Text style={styles.emptyText}>Tambahkan langganan pertama untuk mulai mengelola pembayaran.</Text>
          </View>
        }
      />
      <ConfirmDialog
        visible={!!pendingDelete}
        title="Hapus Langganan"
        message={pendingDelete ? `Yakin ingin menghapus "${pendingDelete.name}"?` : ""}
        icon="trash-outline"
        onClose={() => setPendingDelete(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setPendingDelete(null) },
          { label: "Hapus", variant: "danger", onPress: confirmDelete },
        ]}
      />
      <ConfirmDialog
        visible={!!pendingToggle}
        title={pendingToggle?.isActive ? "Nonaktifkan Langganan" : "Aktifkan Langganan"}
        message={pendingToggle ? `Yakin ingin ${pendingToggle.isActive ? "menonaktifkan" : "mengaktifkan"} "${pendingToggle.name}"?` : ""}
        icon={pendingToggle?.isActive ? "pause-circle-outline" : "play-circle-outline"}
        onClose={() => setPendingToggle(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setPendingToggle(null) },
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

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { paddingTop: Spacing.lg, paddingBottom: 120 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      marginHorizontal: Spacing.lg,
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
    emptyCard: {
      alignItems: "center",
      marginHorizontal: Spacing.lg,
      padding: Spacing.xl,
      borderRadius: BorderRadius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      gap: Spacing.sm,
    },
    emptyTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
    emptyText: { color: c.textSecondary, fontSize: FontSize.sm, textAlign: "center", lineHeight: 20 },
  });
