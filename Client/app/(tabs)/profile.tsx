import React, { useMemo } from "react";
import { View, Text, StyleSheet, Switch, Modal, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Spacing, FontSize, BorderRadius, ThemeColors } from "@/constants";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useTheme } from "@/hooks/useTheme";
import { formatDate, formatRupiahInput, parseRupiahInput } from "@/lib/utils";
import { exportLocalDatabase } from "@/lib/localDb";

export default function ProfileScreen() {
  const { user, logout, isLoading, isAppLockEnabled, toggleAppLock, appPin, setAppPin, updateProfile, changePassword, setBudget } = useAuthStore();
  const { subscriptions } = useSubscriptionStore();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [isExporting, setIsExporting] = React.useState(false);
  const [isExportingDb, setIsExportingDb] = React.useState(false);
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = React.useState(false);
  const [showPinModal, setShowPinModal] = React.useState(false);
  const [tempPin, setTempPin] = React.useState("");
  const [pinError, setPinError] = React.useState("");

  const [isEditProfileVisible, setIsEditProfileVisible] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);

  const [isBudgetVisible, setIsBudgetVisible] = React.useState(false);
  const [tempBudget, setTempBudget] = React.useState("");
  const [isSavingBudget, setIsSavingBudget] = React.useState(false);

  const openEditProfile = () => { setEditName(user?.name || ""); setEditEmail(user?.email || ""); setIsEditProfileVisible(true); };
  const handleUpdateProfile = async () => { if (!editName.trim() || !editEmail.trim()) { Toast.show({ type: "error", text1: "Nama dan Email wajib diisi" }); return; } setIsSavingProfile(true); try { await updateProfile(editName, editEmail); setIsEditProfileVisible(false); Toast.show({ type: "success", text1: "Profil berhasil diperbarui" }); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); } finally { setIsSavingProfile(false); } };
  const handleUpdatePassword = async () => { if (!oldPassword || newPassword.length < 6) { Toast.show({ type: "error", text1: "Password lama wajib diisi", text2: "Password baru minimal 6 karakter" }); return; } setIsSavingPassword(true); try { await changePassword(oldPassword, newPassword); setIsPasswordVisible(false); setOldPassword(""); setNewPassword(""); Toast.show({ type: "success", text1: "Password berhasil diganti" }); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); } finally { setIsSavingPassword(false); } };
  const openBudgetModal = () => { setTempBudget(formatRupiahInput(user?.monthlyBudget)); setIsBudgetVisible(true); };
  const handleSetBudget = async () => { setIsSavingBudget(true); try { await setBudget(parseRupiahInput(tempBudget) ?? null); setIsBudgetVisible(false); Toast.show({ type: "success", text1: "Batas pengeluaran diperbarui" }); } catch (e: any) { Toast.show({ type: "error", text1: "Gagal", text2: e.message }); } finally { setIsSavingBudget(false); } };
  const handleToggleLock = async (value: boolean) => { if (value) { setTempPin(""); setPinError(""); setShowPinModal(true); } else { await toggleAppLock(false); await setAppPin(null); Toast.show({ type: "success", text1: "Kunci Aplikasi Dinonaktifkan" }); } };
  const handleSavePin = async () => { if (tempPin.length !== 4) { setPinError("PIN harus 4 digit angka"); return; } await setAppPin(tempPin); await toggleAppLock(true); setShowPinModal(false); Toast.show({ type: "success", text1: "Berhasil", text2: "Kunci Aplikasi Diaktifkan" }); };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const activeSubs = subscriptions.filter((s) => s.isActive);
      const bgColor = isDark ? "#1A1A2E" : "#FFFFFF";
      const textColor = isDark ? "#FFFFFF" : "#111827";
      const mutedColor = isDark ? "#A0A0C0" : "#6B7280";
      const borderColor = isDark ? "#2A2A45" : "#E5E7EB";
      const html = `<html><head><style>body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:40px;background:${bgColor};color:${textColor}}h1{margin-bottom:5px}p{color:${mutedColor};margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid ${borderColor};padding:12px;text-align:left}th{background-color:${isDark ? "#252542" : "#F9FAFB"};font-weight:600}.total{margin-top:30px;font-size:18px;font-weight:600;text-align:right;padding-top:20px;border-top:2px solid ${textColor}}</style></head><body><h1>Laporan Daftar Langganan</h1><p>Tanggal Cetak: ${formatDate(new Date().toISOString())}</p><table><tr><th>Nama</th><th>Siklus</th><th>Tgl Bayar</th><th>Harga</th></tr>${activeSubs.map(s => `<tr><td>${s.name}</td><td>${s.billingCycle === "MONTHLY" ? "Bulanan" : "Tahunan"}</td><td>${formatDate(s.nextPaymentDate)}</td><td>Rp ${s.price.toLocaleString("id-ID")}</td></tr>`).join("")}</table><div class="total">Estimasi Bulanan: Rp ${activeSubs.reduce((a, c) => c.billingCycle === "MONTHLY" ? a + c.price : a + Math.round(c.price / 12), 0).toLocaleString("id-ID")}</div></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (e: any) { Toast.show({ type: "error", text1: "Gagal Export", text2: e.message }); }
    finally { setIsExporting(false); }
  };

  const handleExportDatabase = async () => {
    setIsExportingDb(true);
    try {
      const uri = await exportLocalDatabase();
      await Sharing.shareAsync(uri, {
        UTI: "public.database",
        mimeType: "application/vnd.sqlite3",
      });
      Toast.show({
        type: "success",
        text1: "Database siap dibuka",
        text2: "File .db bisa dicek di Navicat atau DB Browser SQLite.",
      });
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Gagal Export DB", text2: e.message });
    } finally {
      setIsExportingDb(false);
    }
  };

  const confirmLogout = async () => {
    setIsLogoutDialogVisible(false);
    try {
      await logout();
      Toast.show({ type: "success", text1: "Sampai jumpa" });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U"}</Text></View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfile}>
            <Ionicons name="pencil" size={14} color={colors.white} /><Text style={styles.editProfileText}>Edit Profil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}><Ionicons name="person-outline" size={18} color={colors.primary} /></View>
              <View style={styles.infoText}><Text style={styles.infoLabel}>Nama</Text><Text style={styles.infoValue}>{user?.name || "-"}</Text></View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: isDark ? "rgba(0,206,201,0.18)" : "rgba(5,150,105,0.08)" }]}><Ionicons name="mail-outline" size={18} color={colors.accent} /></View>
              <View style={styles.infoText}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{user?.email || "-"}</Text></View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: isDark ? "rgba(253,203,110,0.18)" : "rgba(217,119,6,0.08)" }]}><Ionicons name="calendar-outline" size={18} color={colors.warning} /></View>
              <View style={styles.infoText}><Text style={styles.infoLabel}>Bergabung</Text><Text style={styles.infoValue}>{user?.createdAt ? formatDate(user.createdAt) : "-"}</Text></View>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Pengaturan</Text>
          <View style={styles.infoCard}>
            {/* Theme Toggle */}
            <View style={[styles.infoRow, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                <View style={[styles.infoIcon, { backgroundColor: isDark ? "rgba(162,155,254,0.18)" : "rgba(37,99,235,0.08)" }]}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Tema Aplikasi</Text>
                  <Text style={[styles.infoValue, { fontSize: FontSize.sm }]}>{isDark ? "Gelap" : "Terang"}</Text>
                </View>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>
            <View style={styles.divider} />

            {/* App Lock */}
            <View style={[styles.infoRow, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                <View style={[styles.infoIcon, { backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.08)" }]}><Ionicons name="lock-closed" size={18} color={colors.danger} /></View>
                <View><Text style={styles.infoLabel}>Kunci Aplikasi (PIN)</Text><Text style={[styles.infoValue, { fontSize: FontSize.sm }]}>Minta PIN setiap buka aplikasi</Text></View>
              </View>
              <Switch value={isAppLockEnabled} onValueChange={handleToggleLock} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>
            <View style={styles.divider} />

            {/* Budget */}
            <TouchableOpacity style={[styles.infoRow, { justifyContent: "space-between" }]} onPress={openBudgetModal}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                <View style={[styles.infoIcon, { backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.08)" }]}><Ionicons name="wallet" size={18} color={colors.success} /></View>
                <View><Text style={styles.infoLabel}>Batas Anggaran Bulanan</Text><Text style={[styles.infoValue, { fontSize: FontSize.sm }]}>{user?.monthlyBudget ? `Rp ${user.monthlyBudget.toLocaleString("id-ID")}` : "Belum diatur"}</Text></View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionSection}>
          <Button title="Riwayat Langganan (Inaktif)" onPress={() => router.push("/archived" as any)} variant="secondary" icon={<Ionicons name="time-outline" size={20} color={colors.primary} />} />
          <Button title="Export Daftar ke PDF" onPress={handleExportPDF} variant="secondary" isLoading={isExporting} icon={<Ionicons name="document-text-outline" size={20} color={colors.accent} />} />
          <Button title="Export Database (.db)" onPress={handleExportDatabase} variant="secondary" isLoading={isExportingDb} icon={<Ionicons name="server-outline" size={20} color={colors.primary} />} />
          <Button title="Ganti Password" onPress={() => setIsPasswordVisible(true)} variant="secondary" icon={<Ionicons name="key-outline" size={20} color={colors.warning} />} />
        </View>

        <Button title="Keluar" onPress={() => setIsLogoutDialogVisible(true)} variant="danger" size="lg" isLoading={isLoading} icon={<Ionicons name="log-out-outline" size={22} color={colors.white} />} />
        <Text style={styles.version}>Langganinaja v1.0.0</Text>
      </ScrollView>

      {/* PIN Modal */}
      <Modal visible={showPinModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Buat PIN Keamanan</Text><Text style={styles.modalSubtitle}>Masukkan 4 digit PIN rahasia untuk mengunci aplikasi ini.</Text>
          <TextInput style={styles.pinInput} keyboardType="numeric" secureTextEntry maxLength={4} value={tempPin} onChangeText={(v) => { setTempPin(v.replace(/[^0-9]/g, "")); setPinError(""); }} placeholder="****" placeholderTextColor={colors.textMuted} autoFocus />
          {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPinModal(false)}><Text style={styles.modalBtnCancelText}>Batal</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSave} onPress={handleSavePin}><Text style={styles.modalBtnSaveText}>Simpan PIN</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={isEditProfileVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit Profil</Text><Text style={styles.modalSubtitle}>Perbarui informasi dasar akun kamu</Text></View>
          <View style={styles.inputContainer}><Text style={styles.inputLabel}>Nama Lengkap</Text><TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Masukkan nama lengkap" placeholderTextColor={colors.textMuted} /></View>
          <View style={styles.inputContainer}><Text style={styles.inputLabel}>Email</Text><TextInput style={styles.modalInput} value={editEmail} onChangeText={setEditEmail} placeholder="Masukkan email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textMuted} /></View>
          <View style={styles.modalActions}><Button title="Batal" onPress={() => setIsEditProfileVisible(false)} variant="ghost" style={{ flex: 1 }} /><Button title="Simpan" onPress={handleUpdateProfile} isLoading={isSavingProfile} style={{ flex: 1 }} /></View>
        </View></View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={isPasswordVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Ganti Password</Text><Text style={styles.modalSubtitle}>Gunakan password yang kuat dan aman</Text></View>
          <View style={styles.inputContainer}><Text style={styles.inputLabel}>Password Lama</Text><TextInput style={styles.modalInput} value={oldPassword} onChangeText={setOldPassword} placeholder="Masukkan password saat ini" secureTextEntry placeholderTextColor={colors.textMuted} /></View>
          <View style={styles.inputContainer}><Text style={styles.inputLabel}>Password Baru</Text><TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} placeholder="Minimal 6 karakter" secureTextEntry placeholderTextColor={colors.textMuted} /></View>
          <View style={styles.modalActions}><Button title="Batal" onPress={() => setIsPasswordVisible(false)} variant="ghost" style={{ flex: 1 }} /><Button title="Simpan" onPress={handleUpdatePassword} isLoading={isSavingPassword} style={{ flex: 1 }} /></View>
        </View></View>
      </Modal>

      {/* Budget Modal */}
      <Modal visible={isBudgetVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Batas Anggaran</Text><Text style={styles.modalSubtitle}>Estimasi total pengeluaran bulanan</Text></View>
          <View style={styles.inputContainer}><Text style={styles.inputLabel}>Nominal (Rp)</Text><TextInput style={styles.modalInput} value={tempBudget} onChangeText={(value) => setTempBudget(formatRupiahInput(value))} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} /><Text style={styles.inputHelp}>Kosongkan jika tidak ingin membatasi</Text></View>
          <View style={styles.modalActions}><Button title="Batal" onPress={() => setIsBudgetVisible(false)} variant="ghost" style={{ flex: 1 }} /><Button title="Simpan" onPress={handleSetBudget} isLoading={isSavingBudget} style={{ flex: 1 }} /></View>
        </View></View>
      </Modal>
      <ConfirmDialog
        visible={isLogoutDialogVisible}
        title="Keluar"
        message="Yakin ingin keluar dari akun ini?"
        icon="log-out-outline"
        onClose={() => setIsLogoutDialogVisible(false)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setIsLogoutDialogVisible(false) },
          { label: "Keluar", variant: "danger", onPress: confirmLogout },
        ]}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: 140 },
  title: { color: c.text, fontSize: FontSize.xxl, fontWeight: "600", marginBottom: Spacing.lg },
  avatarSection: { alignItems: "center", marginBottom: Spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  avatarText: { color: c.white, fontSize: FontSize.xxl, fontWeight: "600" },
  userName: { color: c.text, fontSize: FontSize.xl, fontWeight: "600" },
  userEmail: { color: c.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.xs },
  editProfileButton: { flexDirection: "row", alignItems: "center", backgroundColor: c.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.md, gap: Spacing.xs },
  editProfileText: { color: c.white, fontSize: FontSize.sm, fontWeight: "500" },
  infoSection: { marginBottom: Spacing.lg },
  infoCard: { backgroundColor: c.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border, padding: Spacing.md },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, gap: Spacing.md },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1 },
  infoLabel: { color: c.textMuted, fontSize: FontSize.xs },
  infoValue: { color: c.text, fontSize: FontSize.md, fontWeight: "500", marginTop: 2 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: Spacing.xs },
  settingsSection: { marginBottom: Spacing.lg },
  sectionTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "600", marginBottom: Spacing.md },
  actionSection: { marginBottom: Spacing.lg, gap: Spacing.sm },
  version: { color: c.textMuted, fontSize: FontSize.xs, textAlign: "center", marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "center", padding: Spacing.xl },
  modalContent: { backgroundColor: c.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: c.border },
  modalHeader: { marginBottom: Spacing.lg },
  modalTitle: { color: c.text, fontSize: FontSize.lg, fontWeight: "600", marginBottom: 4 },
  modalSubtitle: { color: c.textSecondary, fontSize: FontSize.sm },
  inputContainer: { marginBottom: Spacing.md },
  inputLabel: { color: c.text, fontSize: FontSize.sm, fontWeight: "500", marginBottom: Spacing.xs + 2, marginLeft: 4 },
  modalInput: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.border, borderRadius: BorderRadius.sm, color: c.text, fontSize: FontSize.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2 },
  inputHelp: { color: c.textMuted, fontSize: FontSize.xs, marginTop: Spacing.xs, marginLeft: 4 },
  pinInput: { backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.border, borderRadius: BorderRadius.sm, color: c.text, fontSize: FontSize.xxl, textAlign: "center", letterSpacing: 10, paddingVertical: Spacing.md, marginBottom: Spacing.md },
  errorText: { color: c.danger, fontSize: FontSize.xs, marginBottom: Spacing.md, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  modalBtnCancel: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  modalBtnCancelText: { color: c.textSecondary, fontWeight: "500" },
  modalBtnSave: { backgroundColor: c.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm },
  modalBtnSaveText: { color: c.white, fontWeight: "600" },
});
