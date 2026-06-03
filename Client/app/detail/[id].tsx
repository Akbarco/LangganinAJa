import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Image } from "react-native";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Spacing, FontSize, BorderRadius, ThemeColors } from "@/constants";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useReceiptStore } from "@/store/receiptStore";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency, formatDate, getUrgencyColor, getBillingLabel, daysUntil } from "@/lib/utils";
import { getCategoryInfo } from "@/lib/categories";
import { getBrandVisuals } from "@/constants/brands";
import { SubscriptionAccount } from "@/types";

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    subscriptions,
    accountsBySubscriptionId,
    deleteSubscription,
    toggleActive,
    fetchSummary,
    markAsPaid,
    fetchPaymentHistory,
    paymentHistory,
    fetchSubscriptionAccounts,
    createSubscriptionAccount,
    updateSubscriptionAccount,
    deleteSubscriptionAccount,
    toggleSubscriptionAccount,
  } = useSubscriptionStore();
  const { receipts } = useReceiptStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [isPaying, setIsPaying] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [activeDialog, setActiveDialog] = React.useState<"pay" | "delete" | "toggle" | "accountDelete" | null>(null);
  const [accountModalMode, setAccountModalMode] = React.useState<"create" | "edit" | null>(null);
  const [editingAccount, setEditingAccount] = React.useState<SubscriptionAccount | null>(null);
  const [pendingAccount, setPendingAccount] = React.useState<SubscriptionAccount | null>(null);
  const [accountName, setAccountName] = React.useState("");
  const [accountEmail, setAccountEmail] = React.useState("");
  const [accountHolderName, setAccountHolderName] = React.useState("");
  const [accountNotes, setAccountNotes] = React.useState("");

  const sub = subscriptions.find((s) => s.id === id);
  const receiptUri = sub ? receipts[sub.id] : undefined;
  const accounts = sub ? accountsBySubscriptionId[sub.id] || [] : [];
  const activeAccounts = accounts.filter((account) => account.status === "ACTIVE");
  const totalAccounts = accounts.length;
  const accountMultiplier = activeAccounts.length > 0 ? activeAccounts.length : 1;
  const totalPrice = sub ? sub.price * accountMultiplier : 0;

  React.useEffect(() => { if (!sub) return; fetchPaymentHistory(sub.id); }, [fetchPaymentHistory, sub]);
  React.useEffect(() => { if (!sub) return; fetchSubscriptionAccounts(sub.id); }, [fetchSubscriptionAccounts, sub]);

  if (!sub) return <SafeAreaView style={styles.container}><View style={styles.center}><Text style={styles.emptyText}>Langganan tidak ditemukan</Text><Button title="Kembali" onPress={() => router.back()} variant="ghost" /></View></SafeAreaView>;

  const catInfo = getCategoryInfo(sub.category, isDark);
  const brandVisuals = getBrandVisuals(sub.name);
  const urgencyColor = getUrgencyColor(sub.nextPaymentDate);
  const days = daysUntil(sub.nextPaymentDate);
  const getUrgencyLabel = () => { if (days === 0) return "Hari ini"; if (days < 0) return `Terlambat ${Math.abs(days)} hari`; if (days === 1) return "Besok"; return `${days} hari lagi`; };

  const confirmMarkPaid = async () => { setIsPaying(true); try { await markAsPaid(sub.id); await fetchPaymentHistory(sub.id); setActiveDialog(null); Toast.show({ type: "success", text1: "Berhasil", text2: "Pembayaran tercatat & jadwal digeser" }); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); } finally { setIsPaying(false); } };
  const confirmDelete = async () => { setActiveDialog(null); try { await deleteSubscription(sub.id); await fetchSummary(); router.back(); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); } };
  const confirmToggle = async () => { setActiveDialog(null); try { await toggleActive(sub.id, !sub.isActive); await fetchSummary(); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); } };
  const handleEdit = () => { router.push(`/edit/${sub.id}` as any); };
  const accountUsageLabel = sub.accountLimit
    ? `${totalAccounts}/${sub.accountLimit} slot terisi • ${activeAccounts.length} aktif`
    : `${totalAccounts} akun tercatat • ${activeAccounts.length} aktif`;
  const isAccountLimitFull = !!sub.accountLimit && totalAccounts >= sub.accountLimit;
  const resetAccountForm = () => { setAccountName(""); setAccountEmail(""); setAccountHolderName(""); setAccountNotes(""); setEditingAccount(null); };
  const openCreateAccount = () => {
    if (isAccountLimitFull) return;
    resetAccountForm();
    setAccountModalMode("create");
  };
  const openEditAccount = (account: SubscriptionAccount) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountEmail(account.email || "");
    setAccountHolderName(account.holderName || "");
    setAccountNotes(account.notes || "");
    setAccountModalMode("edit");
  };
  const closeAccountModal = () => { setAccountModalMode(null); resetAccountForm(); };
  const submitAccount = async () => {
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
    if (accountModalMode === "create" && isAccountLimitFull) {
      Toast.show({ type: "error", text1: "Slot akun sudah penuh" });
      return;
    }

    try {
      if (accountModalMode === "edit" && editingAccount) {
        await updateSubscriptionAccount(sub.id, editingAccount.id, {
          name,
          email,
          holderName: accountHolderName,
          notes: accountNotes,
        });
      } else {
        await createSubscriptionAccount(sub.id, {
          name,
          email,
          holderName: accountHolderName,
          notes: accountNotes,
        });
      }
      closeAccountModal();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal menyimpan akun", text2: e.message });
    }
  };
  const confirmDeleteAccount = async () => {
    if (!pendingAccount) return;
    try {
      await deleteSubscriptionAccount(sub.id, pendingAccount.id);
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal menghapus akun", text2: e.message });
    } finally {
      setPendingAccount(null);
      setActiveDialog(null);
    }
  };
  const handleToggleAccount = async (account: SubscriptionAccount) => {
    try {
      await toggleSubscriptionAccount(
        sub.id,
        account.id,
        account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      );
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal mengubah status akun", text2: e.message });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Detail</Text>
          <TouchableOpacity onPress={handleEdit} style={styles.editHeaderBtn}><Ionicons name="create-outline" size={22} color={colors.primary} /></TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={[styles.heroAvatar, { backgroundColor: brandVisuals ? `${brandVisuals.color}25` : catInfo.bgColor }]}>
            {brandVisuals ? (
              brandVisuals.iconFamily === "MaterialCommunityIcons" ? (
                <MaterialCommunityIcons name={brandVisuals.iconName as any} size={36} color={brandVisuals.color} />
              ) : brandVisuals.iconFamily === "FontAwesome5" ? (
                <FontAwesome5 name={brandVisuals.iconName as any} size={32} color={brandVisuals.color} />
              ) : (
                <Ionicons name={brandVisuals.iconName as any} size={32} color={brandVisuals.color} />
              )
            ) : (
              <Ionicons name={catInfo.icon as any} size={32} color={catInfo.color} />
            )}
          </View>
          <Text style={styles.heroName}>{sub.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, sub.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <View style={[styles.statusDot, { backgroundColor: sub.isActive ? colors.success : colors.danger }]} />
              <Text style={[styles.statusText, { color: sub.isActive ? colors.success : colors.danger }]}>{sub.isActive ? "Aktif" : "Nonaktif"}</Text>
            </View>
            <Text style={styles.billingBadge}>{getBillingLabel(sub.billingCycle)}</Text>
          </View>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Total Harga</Text>
          <Text style={styles.priceValue}>{formatCurrency(totalPrice, sub.currency)}</Text>
          <Text style={styles.priceSub}>
            {activeAccounts.length > 0
              ? `${formatCurrency(sub.price, sub.currency)} x ${activeAccounts.length} akun aktif`
              : sub.billingCycle === "MONTHLY"
                ? "per bulan"
                : "per tahun"}
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}><View style={[styles.infoIcon, { backgroundColor: `${urgencyColor}15` }]}><Ionicons name="calendar-outline" size={20} color={urgencyColor} /></View><Text style={styles.infoLabel}>Pembayaran Berikutnya</Text><Text style={styles.infoValue}>{formatDate(sub.nextPaymentDate)}</Text><Text style={[styles.infoSub, { color: urgencyColor }]}>{getUrgencyLabel()}</Text></View>
          <View style={styles.infoCard}><View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}><Ionicons name="flag-outline" size={20} color={colors.primary} /></View><Text style={styles.infoLabel}>Mulai Berlangganan</Text><Text style={styles.infoValue}>{formatDate(sub.startDate)}</Text></View>
        </View>

        <View style={styles.timestampSection}><View style={styles.timestampRow}><Text style={styles.timestampLabel}>Dibuat</Text><Text style={styles.timestampValue}>{formatDate(sub.createdAt)}</Text></View><View style={styles.timestampRow}><Text style={styles.timestampLabel}>Terakhir diupdate</Text><Text style={styles.timestampValue}>{formatDate(sub.updatedAt)}</Text></View></View>

        <View style={styles.accountsSection}>
          <View style={styles.accountsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Akun / Slot Langganan</Text>
              <Text style={[styles.accountUsageText, isAccountLimitFull && styles.accountUsageFull]}>
                {accountUsageLabel}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addAccountButton, isAccountLimitFull && styles.addAccountButtonDisabled]}
              onPress={openCreateAccount}
              disabled={isAccountLimitFull}
              activeOpacity={0.8}
            >
              <Ionicons name={isAccountLimitFull ? "lock-closed-outline" : "add"} size={18} color={isAccountLimitFull ? colors.textMuted : colors.white} />
              <Text style={[styles.addAccountText, isAccountLimitFull && styles.addAccountTextDisabled]}>
                {isAccountLimitFull ? "Slot penuh" : "Tambah"}
              </Text>
            </TouchableOpacity>
          </View>
          {accounts.length === 0 ? (
            <View style={styles.emptyAccountsCard}>
              <Ionicons name="people-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyAccountsTitle}>Belum ada akun tercatat</Text>
              <Text style={styles.emptyAccountsText}>Tambahkan profil atau email yang memakai paket ini.</Text>
            </View>
          ) : (
            accounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountTopRow}>
                  <View style={styles.accountIdentity}>
                    <View style={[styles.accountAvatar, account.status === "ACTIVE" ? styles.accountAvatarActive : styles.accountAvatarInactive]}>
                      <Ionicons name="person-outline" size={18} color={account.status === "ACTIVE" ? colors.primary : colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={[styles.accountMeta, !account.email && styles.accountMetaMissing]}>
                        {account.email || "Email Gmail belum diisi"}
                      </Text>
                      {account.holderName ? <Text style={styles.accountMeta}>Pemakai: {account.holderName}</Text> : null}
                    </View>
                  </View>
                  <View style={[styles.accountStatusBadge, account.status === "ACTIVE" ? styles.accountStatusActive : styles.accountStatusInactive]}>
                    <Text style={[styles.accountStatusText, { color: account.status === "ACTIVE" ? colors.success : colors.danger }]}>
                      {account.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>
                {account.notes ? <Text style={styles.accountNotes}>{account.notes}</Text> : null}
                <View style={styles.accountActions}>
                  <TouchableOpacity style={styles.accountActionButton} onPress={() => openEditAccount(account)}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.accountActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accountActionButton} onPress={() => handleToggleAccount(account)}>
                    <Ionicons name={account.status === "ACTIVE" ? "pause-circle-outline" : "play-circle-outline"} size={16} color={colors.primary} />
                    <Text style={styles.accountActionText}>{account.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accountActionButton} onPress={() => { setPendingAccount(account); setActiveDialog("accountDelete"); }}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.accountActionText, { color: colors.danger }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {receiptUri ? (<View style={styles.receiptSection}><Text style={styles.sectionTitle}>Bukti Pembayaran</Text><TouchableOpacity style={styles.receiptContainer} onPress={() => setIsFullscreen(true)} activeOpacity={0.8}><Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" /><View style={styles.zoomOverlay}><Ionicons name="scan-outline" size={32} color="white" /></View></TouchableOpacity></View>) : null}

        {sub.isActive && (<TouchableOpacity style={styles.payButton} onPress={() => setActiveDialog("pay")} activeOpacity={0.8} disabled={isPaying}><Ionicons name="checkmark-circle" size={24} color={colors.white} /><Text style={styles.payButtonText}>{isPaying ? "Memproses..." : "Tandai Sudah Bayar"}</Text></TouchableOpacity>)}

        {paymentHistory.length > 0 && (<View style={styles.historySection}><Text style={styles.sectionTitle}>Riwayat Pembayaran</Text>{paymentHistory.map((p, i) => (<View key={p.id} style={styles.historyItem}><View style={styles.historyDot}><Ionicons name="checkmark" size={12} color={colors.white} /></View>{i < paymentHistory.length - 1 && <View style={styles.historyLine} />}<View style={styles.historyContent}><Text style={styles.historyDate}>{formatDate(p.paidAt)}</Text><Text style={styles.historyAmount}>{formatCurrency(p.amount, sub.currency)}</Text></View></View>))}</View>)}

        <View style={styles.actionSection}>
          <Button title="Edit Langganan" onPress={handleEdit} size="lg" icon={<Ionicons name="create-outline" size={20} color={colors.white} />} />
          <Button title={sub.isActive ? "Nonaktifkan" : "Aktifkan"} onPress={() => setActiveDialog("toggle")} variant="secondary" size="md" icon={<Ionicons name={sub.isActive ? "pause-circle-outline" : "play-circle-outline"} size={20} color={colors.text} />} />
          <Button title="Hapus Langganan" onPress={() => setActiveDialog("delete")} variant="danger" size="md" icon={<Ionicons name="trash-outline" size={20} color={colors.white} />} />
        </View>
      </ScrollView>

      <Modal visible={accountModalMode !== null} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.accountModalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.accountModalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.accountModal}>
            <View style={styles.accountModalHeader}>
              <Text style={styles.accountModalTitle}>{accountModalMode === "edit" ? "Edit Akun" : "Tambah Akun"}</Text>
              <TouchableOpacity onPress={closeAccountModal}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.accountInputLabel}>Nama Akun / Profil</Text>
            <TextInput style={styles.accountInput} placeholder="contoh: Akun Utama" placeholderTextColor={colors.textMuted} value={accountName} onChangeText={setAccountName} />
            <Text style={styles.accountInputLabel}>Email Gmail</Text>
            <TextInput
              style={styles.accountInput}
              placeholder="contoh: user@gmail.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={accountEmail}
              onChangeText={setAccountEmail}
            />
            <Text style={styles.accountInputLabel}>Pemakai (Opsional)</Text>
            <TextInput style={styles.accountInput} placeholder="contoh: Adik / Teman / Akun kerja" placeholderTextColor={colors.textMuted} value={accountHolderName} onChangeText={setAccountHolderName} />
            <Text style={styles.accountInputLabel}>Catatan (Opsional)</Text>
            <TextInput style={[styles.accountInput, styles.accountNotesInput]} placeholder="contoh: profil anak, khusus film, dll" placeholderTextColor={colors.textMuted} value={accountNotes} onChangeText={setAccountNotes} multiline />
            <View style={styles.accountModalActions}>
              <Button title="Batal" onPress={closeAccountModal} variant="secondary" size="md" style={{ flex: 1 }} />
              <Button title="Simpan" onPress={submitAccount} size="md" style={{ flex: 1 }} />
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isFullscreen} transparent animationType="fade"><View style={styles.fullscreenContainer}><TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setIsFullscreen(false)}><Ionicons name="close" size={32} color="white" /></TouchableOpacity><Image source={{ uri: receiptUri }} style={styles.fullscreenImage} resizeMode="contain" /></View></Modal>
      <ConfirmDialog
        visible={activeDialog === "pay"}
        title="Konfirmasi Pembayaran"
        message={`Tandai ${sub.name} sudah dibayar bulan ini? Jatuh tempo berikutnya akan digeser otomatis.`}
        icon="checkmark-circle-outline"
        onClose={() => setActiveDialog(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setActiveDialog(null) },
          { label: "Sudah Bayar", variant: "success", onPress: confirmMarkPaid },
        ]}
      />
      <ConfirmDialog
        visible={activeDialog === "toggle"}
        title={sub.isActive ? "Nonaktifkan Langganan" : "Aktifkan Langganan"}
        message={`Yakin ingin ${sub.isActive ? "menonaktifkan" : "mengaktifkan"} "${sub.name}"?`}
        icon={sub.isActive ? "pause-circle-outline" : "play-circle-outline"}
        onClose={() => setActiveDialog(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setActiveDialog(null) },
          {
            label: sub.isActive ? "Nonaktifkan" : "Aktifkan",
            variant: sub.isActive ? "danger" : "success",
            onPress: confirmToggle,
          },
        ]}
      />
      <ConfirmDialog
        visible={activeDialog === "delete"}
        title="Hapus Langganan"
        message={`Yakin ingin menghapus "${sub.name}"? Data pembayaran terkait juga ikut terhapus.`}
        icon="trash-outline"
        onClose={() => setActiveDialog(null)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setActiveDialog(null) },
          { label: "Hapus", variant: "danger", onPress: confirmDelete },
        ]}
      />
      <ConfirmDialog
        visible={activeDialog === "accountDelete"}
        title="Hapus Akun"
        message={`Yakin ingin menghapus "${pendingAccount?.name || "akun ini"}" dari ${sub.name}?`}
        icon="trash-outline"
        onClose={() => { setActiveDialog(null); setPendingAccount(null); }}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => { setActiveDialog(null); setPendingAccount(null); } },
          { label: "Hapus", variant: "danger", onPress: confirmDeleteAccount },
        ]}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  emptyText: { color: c.textMuted, fontSize: FontSize.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  backButton: { width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
  headerTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "600" },
  editHeaderBtn: { width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: c.primaryLight, alignItems: "center", justifyContent: "center" },
  heroSection: { alignItems: "center", marginBottom: Spacing.xl },
  heroAvatar: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  heroName: { color: c.text, fontSize: FontSize.xxl, fontWeight: "600", textAlign: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.sm },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  activeBadge: { backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.08)" },
  inactiveBadge: { backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.08)" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FontSize.xs, fontWeight: "600" },
  billingBadge: { color: c.textMuted, fontSize: FontSize.xs, fontWeight: "500", backgroundColor: c.surfaceLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, overflow: "hidden" },
  priceCard: { backgroundColor: c.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: "center", marginBottom: Spacing.lg },
  priceLabel: { color: "rgba(255,255,255,0.7)", fontSize: FontSize.sm, fontWeight: "500" },
  priceValue: { color: c.white, fontSize: FontSize.hero, fontWeight: "700", letterSpacing: -1, marginTop: Spacing.xs },
  priceSub: { color: "rgba(255,255,255,0.5)", fontSize: FontSize.sm, marginTop: Spacing.xs },
  infoGrid: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  infoCard: { flex: 1, backgroundColor: c.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: c.border },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  infoLabel: { color: c.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.xs },
  infoValue: { color: c.text, fontSize: FontSize.md, fontWeight: "600" },
  infoSub: { fontSize: FontSize.xs, fontWeight: "500", marginTop: Spacing.xs },
  timestampSection: { backgroundColor: c.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: c.border, marginBottom: Spacing.xl, gap: Spacing.sm },
  timestampRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timestampLabel: { color: c.textMuted, fontSize: FontSize.sm },
  timestampValue: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "500" },
  accountsSection: { marginBottom: Spacing.xl },
  accountsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.md, marginBottom: Spacing.md },
  accountUsageText: { color: c.textMuted, fontSize: FontSize.sm, marginTop: -Spacing.xs },
  accountUsageFull: { color: c.warning, fontWeight: "600" },
  addAccountButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.primary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addAccountButtonDisabled: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.border },
  addAccountText: { color: c.white, fontSize: FontSize.sm, fontWeight: "600" },
  addAccountTextDisabled: { color: c.textMuted },
  emptyAccountsCard: { alignItems: "center", backgroundColor: c.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border, padding: Spacing.lg, gap: Spacing.xs },
  emptyAccountsTitle: { color: c.text, fontSize: FontSize.md, fontWeight: "600" },
  emptyAccountsText: { color: c.textMuted, fontSize: FontSize.sm, textAlign: "center" },
  accountCard: { backgroundColor: c.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border, padding: Spacing.md, marginBottom: Spacing.sm },
  accountTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm },
  accountIdentity: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  accountAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  accountAvatarActive: { backgroundColor: c.primaryLight },
  accountAvatarInactive: { backgroundColor: c.surfaceLight },
  accountName: { color: c.text, fontSize: FontSize.md, fontWeight: "600" },
  accountMeta: { color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  accountMetaMissing: { color: c.warning, fontWeight: "600" },
  accountStatusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  accountStatusActive: { backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.08)" },
  accountStatusInactive: { backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.08)" },
  accountStatusText: { fontSize: FontSize.xs, fontWeight: "700" },
  accountNotes: { color: c.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.sm },
  accountActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.md },
  accountActionButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  accountActionText: { color: c.primary, fontSize: FontSize.xs, fontWeight: "600" },
  accountModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  accountModalScroll: { flexGrow: 1, justifyContent: "center", padding: Spacing.lg },
  accountModal: { backgroundColor: c.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: c.border },
  accountModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md },
  accountModalTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "700" },
  accountInputLabel: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "500", marginBottom: Spacing.xs },
  accountInput: { color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.md, fontSize: FontSize.md },
  accountNotesInput: { minHeight: 82, textAlignVertical: "top" },
  accountModalActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  actionSection: { gap: Spacing.sm },
  sectionTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "600", marginBottom: Spacing.md },
  receiptSection: { marginBottom: Spacing.xl },
  receiptContainer: { backgroundColor: c.surface, borderRadius: BorderRadius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  receiptImage: { width: "100%", height: 200, backgroundColor: c.surfaceLight },
  zoomOverlay: { position: "absolute", right: 16, bottom: 16, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, padding: 8 },
  fullscreenContainer: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.95)", justifyContent: "center", alignItems: "center" },
  fullscreenImage: { width: "100%", height: "100%" },
  closeFullscreenBtn: { position: "absolute", top: 50, right: 24, zIndex: 10, padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  payButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: c.success, borderRadius: BorderRadius.sm, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  payButtonText: { color: c.white, fontSize: FontSize.md, fontWeight: "600" },
  historySection: { marginBottom: Spacing.lg },
  historyItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.md, position: "relative" },
  historyDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.success, alignItems: "center", justifyContent: "center", marginRight: Spacing.md, zIndex: 1 },
  historyLine: { position: "absolute", left: 11, top: 24, bottom: -Spacing.md, width: 2, backgroundColor: c.border },
  historyContent: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.surface, borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: c.border },
  historyDate: { color: c.textSecondary, fontSize: FontSize.sm },
  historyAmount: { color: c.success, fontSize: FontSize.md, fontWeight: "600" },
});
