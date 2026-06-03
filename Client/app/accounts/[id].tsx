import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency, formatDate, getBillingLabel } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const {
    subscriptions,
    accountsBySubscriptionId,
    fetchSubscriptions,
    fetchSubscriptionAccounts,
    toggleSubscriptionAccount,
    updateSubscriptionAccount,
    isLoading,
  } = useSubscriptionStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [isEditVisible, setIsEditVisible] = React.useState(false);
  const [isToggleDialogVisible, setIsToggleDialogVisible] = React.useState(false);
  const [accountName, setAccountName] = React.useState("");
  const [accountEmail, setAccountEmail] = React.useState("");
  const [accountHolderName, setAccountHolderName] = React.useState("");
  const [accountNotes, setAccountNotes] = React.useState("");

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      fetchSubscriptions();
    }, [token, fetchSubscriptions]),
  );

  React.useEffect(() => {
    if (!token || subscriptions.length === 0) return;
    subscriptions.forEach((subscription) => {
      fetchSubscriptionAccounts(subscription.id);
    });
  }, [token, subscriptions, fetchSubscriptionAccounts]);

  const accountData = useMemo(() => {
    for (const subscription of subscriptions) {
      const account = (accountsBySubscriptionId[subscription.id] || []).find(
        (item) => item.id === id,
      );
      if (account) return { account, subscription };
    }
    return null;
  }, [accountsBySubscriptionId, id, subscriptions]);
  const areAccountBucketsLoaded =
    subscriptions.length === 0 ||
    subscriptions.every((subscription) => accountsBySubscriptionId[subscription.id] !== undefined);

  const openEditModal = () => {
    if (!accountData) return;
    setAccountName(accountData.account.name);
    setAccountEmail(accountData.account.email || "");
    setAccountHolderName(accountData.account.holderName || "");
    setAccountNotes(accountData.account.notes || "");
    setIsEditVisible(true);
  };

  const submitEditAccount = async () => {
    if (!accountData) return;
    const name = accountName.trim();
    const email = accountEmail.trim().toLowerCase();

    if (!name) {
      Toast.show({ type: "error", text1: "Nama akun wajib diisi" });
      return;
    }
    if (!email) {
      Toast.show({ type: "error", text1: "Email Gmail wajib diisi" });
      return;
    }
    if (!/^[^\s@]+@gmail\.com$/.test(email)) {
      Toast.show({ type: "error", text1: "Email harus menggunakan @gmail.com" });
      return;
    }

    try {
      await updateSubscriptionAccount(
        accountData.subscription.id,
        accountData.account.id,
        {
          name,
          email,
          holderName: accountHolderName,
          notes: accountNotes,
        },
      );
      setIsEditVisible(false);
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal menyimpan akun", text2: e.message });
    }
  };

  const confirmToggleAccount = async () => {
    if (!accountData) return;
    setIsToggleDialogVisible(false);
    try {
      await toggleSubscriptionAccount(
        accountData.subscription.id,
        accountData.account.id,
        accountData.account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      );
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal mengubah status akun", text2: e.message });
    }
  };

  if (!accountData && (isLoading || !areAccountBucketsLoaded)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!accountData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={34} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Akun tidak ditemukan</Text>
          <Button title="Kembali" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const { account, subscription } = accountData;
  const isActive = account.status === "ACTIVE";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Akun</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={openEditModal}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
            <Ionicons
              name="person-outline"
              size={36}
              color={isActive ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.name}>{account.name}</Text>
          <Text style={styles.email}>{account.email || "Email Gmail belum diisi"}</Text>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.danger }]} />
            <Text style={[styles.statusText, { color: isActive ? colors.success : colors.danger }]}>
              {isActive ? "Aktif" : "Nonaktif"}
            </Text>
          </View>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Nominal Akun</Text>
          <Text style={styles.priceValue}>{formatCurrency(subscription.price, subscription.currency)}</Text>
          <Text style={styles.priceSub}>{subscription.name} • {getBillingLabel(subscription.billingCycle)}</Text>
        </View>

        <View style={styles.infoGrid}>
          <InfoCard label="Nama Akun / Profil" value={account.name} icon="person-outline" colors={colors} />
          <InfoCard label="Email Gmail" value={account.email || "-"} icon="mail-outline" colors={colors} />
          <InfoCard label="Pemakai" value={account.holderName || "-"} icon="people-outline" colors={colors} />
          <InfoCard label="Langganan" value={subscription.name} icon="albums-outline" colors={colors} />
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{isActive ? "Aktif" : "Nonaktif"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Siklus Tagihan</Text>
            <Text style={styles.detailValue}>{getBillingLabel(subscription.billingCycle)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dibuat</Text>
            <Text style={styles.detailValue}>{formatDate(account.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Terakhir update</Text>
            <Text style={styles.detailValue}>{formatDate(account.updatedAt)}</Text>
          </View>
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Catatan</Text>
          <Text style={styles.notesText}>{account.notes || "Belum ada catatan untuk akun ini."}</Text>
        </View>

        <View style={styles.actionStack}>
          <Button
            title={isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
            onPress={() => setIsToggleDialogVisible(true)}
            variant="secondary"
            size="lg"
            icon={<Ionicons name={isActive ? "pause-circle-outline" : "play-circle-outline"} size={20} color={colors.text} />}
          />
          <Button
            title="Buka Langganan"
            onPress={() => router.push(`/detail/${subscription.id}` as any)}
            size="lg"
            icon={<Ionicons name="open-outline" size={20} color={colors.white} />}
          />
        </View>
      </ScrollView>
      <Modal visible={isEditVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Akun</Text>
                <TouchableOpacity onPress={() => setIsEditVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Nama Akun / Profil</Text>
              <TextInput
                style={styles.input}
                placeholder="contoh: Akun Utama"
                placeholderTextColor={colors.textMuted}
                value={accountName}
                onChangeText={setAccountName}
              />
              <Text style={styles.inputLabel}>Email Gmail</Text>
              <TextInput
                style={styles.input}
                placeholder="contoh: user@gmail.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={accountEmail}
                onChangeText={setAccountEmail}
              />
              <Text style={styles.inputLabel}>Pemakai (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="contoh: Adik / Teman / Akun kerja"
                placeholderTextColor={colors.textMuted}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />
              <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="contoh: profil anak, khusus film, dll"
                placeholderTextColor={colors.textMuted}
                value={accountNotes}
                onChangeText={setAccountNotes}
                multiline
              />
              <View style={styles.modalActions}>
                <Button title="Batal" onPress={() => setIsEditVisible(false)} variant="secondary" size="md" style={{ flex: 1 }} />
                <Button title="Simpan" onPress={submitEditAccount} size="md" style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmDialog
        visible={isToggleDialogVisible}
        title={isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
        message={`Yakin ingin ${isActive ? "menonaktifkan" : "mengaktifkan"} akun "${account.name}"?`}
        icon={isActive ? "pause-circle-outline" : "play-circle-outline"}
        onClose={() => setIsToggleDialogVisible(false)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setIsToggleDialogVisible(false) },
          {
            label: isActive ? "Nonaktifkan" : "Aktifkan",
            variant: isActive ? "danger" : "success",
            onPress: confirmToggleAccount,
          },
        ]}
      />
    </SafeAreaView>
  );
}

function InfoCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
}) {
  return (
    <View style={infoStyles(colors).card}>
      <View style={infoStyles(colors).iconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={infoStyles(colors).label}>{label}</Text>
      <Text style={infoStyles(colors).value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, padding: Spacing.lg },
    scroll: { padding: Spacing.lg, paddingBottom: 120 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.lg,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
    hero: { alignItems: "center", marginBottom: Spacing.xl },
    avatar: {
      width: 82,
      height: 82,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primaryLight,
      marginBottom: Spacing.md,
    },
    avatarInactive: { backgroundColor: isDark ? "#202034" : "#E8EAEE" },
    name: { color: c.text, fontSize: FontSize.xxl, fontWeight: "800", textAlign: "center" },
    email: { color: c.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderRadius: BorderRadius.full,
      marginTop: Spacing.md,
    },
    statusActive: { backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.1)" },
    statusInactive: { backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.1)" },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: FontSize.sm, fontWeight: "700" },
    priceCard: {
      alignItems: "center",
      borderRadius: BorderRadius.lg,
      backgroundColor: c.primary,
      padding: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    priceLabel: { color: "rgba(255,255,255,0.72)", fontSize: FontSize.sm, fontWeight: "600" },
    priceValue: { color: c.white, fontSize: FontSize.hero, fontWeight: "800", marginTop: Spacing.xs },
    priceSub: { color: "rgba(255,255,255,0.72)", fontSize: FontSize.sm, marginTop: Spacing.xs },
    infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg },
    detailCard: {
      borderRadius: BorderRadius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      gap: Spacing.md,
    },
    detailRow: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
    detailLabel: { color: c.textMuted, fontSize: FontSize.sm },
    detailValue: { color: c.text, fontSize: FontSize.sm, fontWeight: "700", textAlign: "right", flex: 1 },
    notesCard: {
      borderRadius: BorderRadius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
    },
    notesLabel: { color: c.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.xs },
    notesText: { color: c.text, fontSize: FontSize.md, lineHeight: 22 },
    actionStack: { gap: Spacing.sm },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    modalScroll: { flexGrow: 1, justifyContent: "center", padding: Spacing.lg },
    modalCard: {
      backgroundColor: c.background,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.md,
    },
    modalTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
    inputLabel: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "600", marginBottom: Spacing.xs },
    input: {
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.md,
      fontSize: FontSize.md,
    },
    notesInput: { minHeight: 88, textAlignVertical: "top" },
    modalActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
    emptyTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
  });

const infoStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: "48.5%",
      minHeight: 122,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: Spacing.md,
      gap: 6,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primaryLight,
      marginBottom: 2,
    },
    label: { color: c.textMuted, fontSize: FontSize.xs },
    value: { color: c.text, fontSize: FontSize.sm, fontWeight: "700", lineHeight: 19 },
  });
