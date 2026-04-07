import React, { useState, useMemo } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export default function Input({
  label,
  error,
  icon,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? colors.primary : colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { marginBottom: Spacing.md },
    label: { color: c.textSecondary, fontSize: FontSize.sm, fontWeight: "600", marginBottom: Spacing.xs + 2 },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: Spacing.md,
    },
    inputFocused: { 
      borderColor: c.primary, 
      backgroundColor: c.surfaceElevated,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    inputError: { borderColor: c.danger },
    icon: { marginRight: Spacing.sm },
    input: { flex: 1, color: c.text, fontSize: FontSize.md, paddingVertical: Spacing.md - 2 },
    error: { color: c.danger, fontSize: FontSize.xs, marginTop: Spacing.xs, marginLeft: Spacing.xs },
  });
