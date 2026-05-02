import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Spacing, FontSize, BorderRadius, ThemeColors } from "@/constants";
import { subscriptionSchema, SubscriptionInput } from "@/schemas/auth.schema";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useReceiptStore } from "@/store/receiptStore";
import { useTheme } from "@/hooks/useTheme";
import { BillingType, CategoryType } from "@/types";
import { formatDate, formatRupiahInput, parseRupiahInput } from "@/lib/utils";
import { getCategories } from "@/lib/categories";

const PREDEFINED_TEMPLATES = [
  { name: "Netflix", price: 153000, icon: "film-outline" },
  { name: "Spotify", price: 54990, icon: "musical-notes-outline" },
  { name: "YouTube Premium", price: 59000, icon: "logo-youtube" },
  { name: "ChatGPT Plus", price: 320000, icon: "chatbubble-ellipses-outline" },
];

export default function AddSubscriptionScreen() {
  const { createSubscription } = useSubscriptionStore();
  const { setReceipt } = useReceiptStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categories = useMemo(() => getCategories(isDark), [isDark]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);
  const [tempReceiptUri, setTempReceiptUri] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("OTHER");
  const [isReceiptSourceVisible, setIsReceiptSourceVisible] = useState(false);

  const handleAttachReceipt = () => setIsReceiptSourceVisible(true);
  const openCamera = async () => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { Toast.show({ type: "error", text1: "Izin Ditolak", text2: "Butuh akses kamera." }); return; } const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 }); if (!r.canceled) setTempReceiptUri(r.assets[0].uri); };
  const openGallery = async () => { const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!p.granted) { Toast.show({ type: "error", text1: "Izin Ditolak", text2: "Butuh akses galeri." }); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 }); if (!r.canceled) setTempReceiptUri(r.assets[0].uri); };

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema as any),
    defaultValues: { name: "", price: undefined as any, billingCycle: "MONTHLY", startDate: new Date().toISOString(), nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), currency: "IDR" },
  });

  const billingCycle = watch("billingCycle");
  const startDate = watch("startDate");
  const nextPaymentDate = watch("nextPaymentDate");

  const onSubmit = async (data: SubscriptionInput) => {
    setIsSubmitting(true);
    try {
      const newSub = await createSubscription({ name: data.name, price: Number(data.price), billingCycle: data.billingCycle, category: selectedCategory, startDate: data.startDate, nextPaymentDate: data.nextPaymentDate, currency: data.currency });
      if (tempReceiptUri && newSub && newSub.id) await setReceipt(newSub.id, tempReceiptUri);
      Toast.show({ type: "success", text1: "Berhasil", text2: `${data.name} telah ditambahkan` });
      reset(); setTempReceiptUri(null); setSelectedCategory("OTHER"); router.navigate("/(tabs)");
    } catch (e: any) { Toast.show({ type: "error", text1: "Gagal menambahkan", text2: e.message }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Text style={styles.title}>Tambah Langganan</Text><Text style={styles.subtitle}>Masukkan detail langganan baru</Text></View>

          <View style={styles.templateSection}>
            <Text style={styles.templateLabel}>Pilih Cepat:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
              {PREDEFINED_TEMPLATES.map((item, i) => (
                <TouchableOpacity key={i} style={styles.templateCard} onPress={() => { setValue("name", item.name); setValue("price", item.price); }} activeOpacity={0.7}>
                  <View style={styles.templateIcon}><Ionicons name={item.icon as any} size={20} color={colors.textSecondary} /></View>
                  <Text style={styles.templateName}>{item.name}</Text>
                  <Text style={styles.templatePrice}>Rp {item.price.toLocaleString("id-ID")}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View>
            <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (<Input label="Nama Langganan" icon="pricetag-outline" placeholder="contoh: Netflix, Spotify" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.name?.message} />)} />
            <Controller control={control} name="price" render={({ field: { onChange, onBlur, value } }) => (<Input label="Harga (IDR)" icon="cash-outline" placeholder="contoh: 54.000" keyboardType="numeric" onChangeText={(t) => onChange(parseRupiahInput(t))} onBlur={onBlur} value={formatRupiahInput(value)} error={errors.price?.message} />)} />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Siklus Tagihan</Text>
              <View style={styles.cycleRow}>
                {(["MONTHLY", "YEARLY"] as BillingType[]).map((c) => (
                  <TouchableOpacity key={c} style={[styles.cycleOption, billingCycle === c && styles.cycleOptionActive]} onPress={() => setValue("billingCycle", c)} activeOpacity={0.7}>
                    <Ionicons name={c === "MONTHLY" ? "calendar-outline" : "calendar-number-outline"} size={20} color={billingCycle === c ? colors.white : colors.textMuted} />
                    <Text style={[styles.cycleText, billingCycle === c && styles.cycleTextActive]}>{c === "MONTHLY" ? "Bulanan" : "Tahunan"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.billingCycle && <Text style={styles.error}>{errors.billingCycle.message}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Kategori</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat.key} style={[styles.categoryOption, selectedCategory === cat.key && { borderColor: cat.color, backgroundColor: cat.bgColor }]} onPress={() => setSelectedCategory(cat.key)} activeOpacity={0.7}>
                    <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                    <Text style={[styles.categoryText, selectedCategory === cat.key && { color: cat.color }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Tanggal Mulai</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                <Text style={styles.dateText}>{startDate ? formatDate(startDate) : "Pilih tanggal"}</Text>
              </TouchableOpacity>
              {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}
            </View>
            {showStartDatePicker && <DateTimePicker value={startDate ? new Date(startDate) : new Date()} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(_, d) => { setShowStartDatePicker(false); if (d) setValue("startDate", d.toISOString()); }} themeVariant={isDark ? "dark" : "light"} />}

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pembayaran Berikutnya</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowNextDatePicker(true)}>
                <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                <Text style={styles.dateText}>{nextPaymentDate ? formatDate(nextPaymentDate) : "Pilih tanggal"}</Text>
              </TouchableOpacity>
              {errors.nextPaymentDate && <Text style={styles.error}>{errors.nextPaymentDate.message}</Text>}
            </View>
            {showNextDatePicker && <DateTimePicker value={nextPaymentDate ? new Date(nextPaymentDate) : new Date()} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(_, d) => { setShowNextDatePicker(false); if (d) setValue("nextPaymentDate", d.toISOString()); }} themeVariant={isDark ? "dark" : "light"} />}

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Bukti Pembayaran (Opsional)</Text>
              {tempReceiptUri ? (
                <View style={styles.receiptContainer}>
                  <Image source={{ uri: tempReceiptUri }} style={styles.receiptImage} resizeMode="cover" />
                  <View style={styles.receiptActions}>
                    <Button title="Ganti" onPress={handleAttachReceipt} variant="secondary" size="md" style={{ flex: 1 }} />
                    <Button title="Hapus" onPress={() => setTempReceiptUri(null)} variant="danger" size="md" icon={<Ionicons name="trash" size={16} color="white" />} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.attachBtn} onPress={handleAttachReceipt}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  <Text style={styles.attachBtnText}>Lampirkan Bukti (Kamera/Galeri)</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button title="Tambah Langganan" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} size="lg" style={{ marginTop: Spacing.lg }} icon={<Ionicons name="add-circle" size={22} color={colors.white} />} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={isReceiptSourceVisible}
        title="Bukti Pembayaran"
        message="Pilih sumber foto bukti pembayaran."
        icon="camera-outline"
        onClose={() => setIsReceiptSourceVisible(false)}
        actions={[
          { label: "Batal", variant: "secondary", onPress: () => setIsReceiptSourceVisible(false) },
          { label: "Kamera", onPress: () => { setIsReceiptSourceVisible(false); openCamera(); } },
          { label: "Galeri", onPress: () => { setIsReceiptSourceVisible(false); openGallery(); } },
        ]}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: Spacing.lg, paddingBottom: 140 },
  header: { marginBottom: Spacing.xl },
  title: { color: c.text, fontSize: FontSize.xxl, fontWeight: "600" },
  subtitle: { color: c.textSecondary, fontSize: FontSize.md, marginTop: Spacing.xs },
  templateSection: { marginBottom: Spacing.xl },
  templateLabel: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "500", marginBottom: Spacing.sm },
  templateScroll: { gap: Spacing.sm },
  templateCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: BorderRadius.md, padding: Spacing.md, minWidth: 120, alignItems: "center", justifyContent: "center" },
  templateIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  templateName: { color: c.text, fontSize: FontSize.sm, fontWeight: "600", marginBottom: 4, textAlign: "center" },
  templatePrice: { color: c.textMuted, fontSize: FontSize.xs, textAlign: "center" },
  fieldContainer: { marginBottom: Spacing.md },
  label: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "500", marginBottom: Spacing.xs + 2 },
  cycleRow: { flexDirection: "row", gap: Spacing.md },
  cycleOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  cycleOptionActive: { borderColor: c.primary, backgroundColor: c.primary },
  cycleText: { color: c.textMuted, fontSize: FontSize.sm, fontWeight: "500" },
  cycleTextActive: { color: c.white },
  dateButton: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: c.surface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  dateText: { color: c.text, fontSize: FontSize.md },
  error: { color: c.danger, fontSize: FontSize.xs, marginTop: Spacing.xs, marginLeft: Spacing.xs },
  attachBtn: { backgroundColor: c.primaryLight, borderWidth: 1, borderStyle: "dashed", borderColor: c.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  attachBtnText: { color: c.primary, fontSize: FontSize.sm, fontWeight: "500" },
  receiptContainer: { backgroundColor: c.surface, borderRadius: BorderRadius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  receiptImage: { width: "100%", height: 200, backgroundColor: c.surfaceLight },
  receiptActions: { flexDirection: "row", padding: Spacing.md, justifyContent: "space-between", gap: Spacing.sm },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  categoryOption: { width: "31%", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: Spacing.xs },
  categoryText: { color: c.textMuted, fontSize: FontSize.xs, fontWeight: "500" },
});
