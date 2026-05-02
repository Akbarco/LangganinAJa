import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";

type DialogVariant = "primary" | "secondary" | "danger" | "success";

export type ConfirmDialogAction = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: DialogVariant;
};

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actions: ConfirmDialogAction[];
  onClose: () => void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  icon = "alert-circle-outline",
  actions,
  onClose,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getActionStyle = (variant: DialogVariant = "primary") => {
    if (variant === "danger") return styles.dangerAction;
    if (variant === "success") return styles.successAction;
    if (variant === "secondary") return styles.secondaryAction;
    return styles.primaryAction;
  };

  const getActionTextStyle = (variant: DialogVariant = "primary") => {
    if (variant === "secondary") return styles.secondaryActionText;
    return styles.filledActionText;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.action, getActionStyle(action.variant)]}
                activeOpacity={0.8}
                onPress={async () => {
                  await action.onPress();
                }}
              >
                <Text style={getActionTextStyle(action.variant)}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      padding: Spacing.xl,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.lg,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      backgroundColor: c.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.md,
    },
    title: {
      color: c.text,
      fontSize: FontSize.lg,
      fontWeight: "700",
      marginBottom: Spacing.xs,
    },
    message: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      lineHeight: 20,
    },
    actions: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginTop: Spacing.lg,
    },
    action: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.md,
    },
    primaryAction: { backgroundColor: c.primary },
    successAction: { backgroundColor: c.success },
    dangerAction: { backgroundColor: c.danger },
    secondaryAction: {
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    filledActionText: {
      color: c.white,
      fontSize: FontSize.sm,
      fontWeight: "700",
      textAlign: "center",
    },
    secondaryActionText: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: "700",
      textAlign: "center",
    },
  });
