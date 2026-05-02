import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SubscriptionCard from "@/components/SubscriptionCard";
import { Spacing, FontSize, BorderRadius, ThemeColors } from "@/constants";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useTheme } from "@/hooks/useTheme";
import { Subscription } from "@/types";

export default function ArchivedScreen() {
  const { subscriptions, deleteSubscription, toggleActive, fetchSummary } = useSubscriptionStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pendingDelete, setPendingDelete] = React.useState<Subscription | null>(null);
  const [pendingActivate, setPendingActivate] = React.useState<Subscription | null>(null);

  const archivedSubscriptions = useMemo(() => subscriptions.filter((s) => !s.isActive), [subscriptions]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const sub = pendingDelete;
    setPendingDelete(null);
    try { await deleteSubscription(sub.id); await fetchSummary(); Toast.show({ type: "success", text1: "Dihapus Permanen", text2: `${sub.name} telah dihapus` }); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal menghapus", text2: e.message }); }
  };
  const confirmActivate = async () => {
    if (!pendingActivate) return;
    const sub = pendingActivate;
    setPendingActivate(null);
    try { await toggleActive(sub.id, true); await fetchSummary(); Toast.show({ type: "success", text1: "Diaktifkan Kembali", text2: `${sub.name} kini aktif lagi` }); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}><Ionicons name="archive-outline" size={32} color={colors.textMuted} /></View>
      <Text style={styles.emptyTitle}>Arsip Kosong</Text>
      <Text style={styles.emptySubtitle}>Semua langgananmu sedang aktif. Langganan yang dinonaktifkan akan muncul di sini.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Histori Langganan</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList data={archivedSubscriptions} keyExtractor={(item) => item.id}
        renderItem={({ item }) => (<SubscriptionCard subscription={item} onPress={() => router.push(`/detail/${item.id}` as any)} onEdit={() => router.push(`/edit/${item.id}` as any)} onDelete={() => setPendingDelete(item)} onToggle={() => setPendingActivate(item)} />)}
        ListEmptyComponent={renderEmpty} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
      />
      <ConfirmDialog
        visible={!!pendingDelete}
        title="Hapus Permanen"
        message={pendingDelete ? `Yakin ingin menghapus permanen "${pendingDelete.name}" dari histori?` : ""}
        icon="trash-outline"
        onClose={() => setPendingDelete(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setPendingDelete(null) },
          { label: "Hapus", variant: "danger", onPress: confirmDelete },
        ]}
      />
      <ConfirmDialog
        visible={!!pendingActivate}
        title="Aktifkan Langganan"
        message={pendingActivate ? `Yakin ingin mengaktifkan kembali "${pendingActivate.name}"?` : ""}
        icon="play-circle-outline"
        onClose={() => setPendingActivate(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setPendingActivate(null) },
          { label: "Aktifkan", variant: "success", onPress: confirmActivate },
        ]}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: c.border },
  backButton: { padding: Spacing.xs },
  title: { color: c.text, fontSize: FontSize.lg, fontWeight: "600" },
  listContent: { paddingBottom: Spacing.xxl * 2, paddingTop: Spacing.md },
  emptyContainer: { alignItems: "center", paddingVertical: Spacing.xxl * 2, paddingHorizontal: Spacing.xl },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  emptyTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "600", marginBottom: Spacing.sm },
  emptySubtitle: { color: c.textMuted, fontSize: FontSize.sm, textAlign: "center" },
});
