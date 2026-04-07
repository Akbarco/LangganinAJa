import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  Spacing,
  FontSize,
  ThemeColors,
} from "@/constants";
import { loginSchema, LoginInput } from "@/schemas/auth.schema";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/hooks/useTheme";

export default function LoginScreen() {
  const { login, isLoading } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
      router.replace("/(tabs)");
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Login Gagal", text2: error.message || "Terjadi kesalahan" });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="card-outline" size={28} color={colors.white} />
          </View>
          <Text style={styles.title}>Selamat Datang</Text>
          <Text style={styles.subtitle}>Masuk untuk kelola langgananmu</Text>
        </View>

        <View style={styles.form}>
          <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Email" icon="mail-outline" placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Password" icon="lock-closed-outline" placeholder="Masukkan password" isPassword onChangeText={onChange} onBlur={onBlur} value={value} error={errors.password?.message} />
          )} />
          <Button title="Masuk" onPress={handleSubmit(onSubmit)} isLoading={isLoading} size="lg" style={{ marginTop: Spacing.md }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Belum punya akun?</Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.footerLink}> Daftar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: Spacing.lg },
  header: { alignItems: "center", marginBottom: Spacing.xxl },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg },
  title: { color: c.text, fontSize: FontSize.xxl, fontWeight: "600" },
  subtitle: { color: c.textSecondary, fontSize: FontSize.md, marginTop: Spacing.xs },
  form: { marginBottom: Spacing.xl },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.borderLight },
  dividerText: { color: c.textMuted, fontSize: FontSize.sm },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: c.textMuted, fontSize: FontSize.sm },
  footerLink: { color: c.primary, fontSize: FontSize.sm, fontWeight: "600" },
});
