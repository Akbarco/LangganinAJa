import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { Subscription } from "@/types";
import { formatCurrency, formatDate, getDaysLabel, getUrgencyColor, getBillingLabel } from "@/lib/utils";
import { getCategoryInfo } from "@/lib/categories";
import { getBrandVisuals } from "@/constants/brands";

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

export default function SubscriptionCard({ subscription, onPress, onEdit, onDelete, onToggle }: SubscriptionCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const catInfo = getCategoryInfo(subscription.category, isDark);
  const brandVisuals = getBrandVisuals(subscription.name);
  
  const urgencyColor = getUrgencyColor(subscription.nextPaymentDate);
  const daysLabel = getDaysLabel(subscription.nextPaymentDate);
  const billingLabel = getBillingLabel(subscription.billingCycle);
  const isActive = subscription.isActive;

  // Inactive: everything gray except "Nonaktif" badge
  const grayedIcon = isDark ? "#4A4A5A" : "#C0C4CC";
  const grayedText = isDark ? "#555568" : "#B0B5BF";
  const grayedDot = isDark ? "#3A3A4A" : "#D0D3D9";

  return (
    <TouchableOpacity
      style={[styles.card, !isActive && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Avatar: gray when inactive */}
        <View style={[styles.avatar, { backgroundColor: isActive ? (brandVisuals ? `${brandVisuals.color}25` : catInfo.bgColor) : (isDark ? "#1E1E30" : "#ECEDF0") }]}>
          {brandVisuals ? (
            brandVisuals.iconFamily === "MaterialCommunityIcons" ? (
              <MaterialCommunityIcons name={brandVisuals.iconName as any} size={24} color={isActive ? brandVisuals.color : grayedIcon} />
            ) : brandVisuals.iconFamily === "FontAwesome5" ? (
              <FontAwesome5 name={brandVisuals.iconName as any} size={20} color={isActive ? brandVisuals.color : grayedIcon} />
            ) : (
              <Ionicons name={brandVisuals.iconName as any} size={22} color={isActive ? brandVisuals.color : grayedIcon} />
            )
          ) : (
            <Ionicons name={catInfo.icon as any} size={22} color={isActive ? catInfo.color : grayedIcon} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, !isActive && { color: grayedText }]} numberOfLines={1}>
              {subscription.name}
            </Text>
            <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
              {isActive && <View style={[styles.statusDot, { backgroundColor: colors.success }]} />}
              {!isActive && <View style={[styles.statusDot, { backgroundColor: colors.danger }]} />}
              <Text style={[styles.statusBadgeText, isActive ? styles.activeBadgeText : styles.inactiveBadgeText]}>
                {isActive ? "Aktif" : "Nonaktif"}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, !isActive && { backgroundColor: isDark ? "#1E1E30" : "#ECEDF0" }]}>
              <Text style={[styles.categoryBadgeText, !isActive && { color: grayedText }]}>{catInfo.label}</Text>
            </View>
            <View style={[styles.dot, !isActive && { backgroundColor: grayedDot }]} />
            <Text style={[styles.billing, !isActive && { color: grayedText }]}>{billingLabel}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.urgencyBadge, { backgroundColor: isActive ? `${urgencyColor}15` : "transparent" }]}>
              <View style={[styles.urgencyDot, { backgroundColor: isActive ? urgencyColor : grayedDot }]} />
              <Text style={[styles.urgencyText, { color: isActive ? urgencyColor : grayedText }]}>{daysLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={[styles.price, !isActive && { color: grayedText }]}>
            {formatCurrency(subscription.price)}
          </Text>
          <Text style={[styles.priceLabel, !isActive && { color: grayedDot }]}>/{billingLabel.toLowerCase()}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.nextPaymentWrap}>
          <Ionicons name="calendar-outline" size={14} color={isActive ? colors.textMuted : grayedDot} />
          <Text style={[styles.nextPaymentText, !isActive && { color: grayedText }]}>
            Bayar berikutnya {formatDate(subscription.nextPaymentDate)}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, !isActive && styles.actionBtnInactive]} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color={isActive ? colors.primary : grayedIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, !isActive && styles.actionBtnInactive]} onPress={onToggle}>
            <Ionicons
              name={isActive ? "pause-circle-outline" : "play-circle-outline"}
              size={20}
              color={isActive ? colors.warning : colors.success}
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, !isActive && styles.actionBtnInactive]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={isActive ? colors.danger : grayedIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      overflow: "hidden",
    },
    cardInactive: {
      backgroundColor: isDark ? "#13131F" : "#F3F4F6",
      borderColor: isDark ? "#1E1E30" : "#E2E4E8",
    },
    cardContent: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.md, gap: Spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    info: { flex: 1, gap: 4 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
    name: { color: c.text, fontSize: FontSize.md, fontWeight: "600", flexShrink: 1 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
    activeBadge: { backgroundColor: isDark ? "rgba(0,184,148,0.18)" : "rgba(22,163,74,0.1)" },
    inactiveBadge: { backgroundColor: isDark ? "rgba(255,107,107,0.18)" : "rgba(220,38,38,0.1)" },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontSize: FontSize.xs - 1, fontWeight: "600" },
    activeBadgeText: { color: c.success },
    inactiveBadgeText: { color: c.danger },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: Spacing.xs, gap: Spacing.sm },
    billing: { color: c.textMuted, fontSize: FontSize.xs },
    categoryBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: c.surfaceLight },
    categoryBadgeText: { color: c.textSecondary, fontSize: FontSize.xs - 1, fontWeight: "500" },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.textMuted },
    urgencyBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
    urgencyDot: { width: 7, height: 7, borderRadius: 3.5 },
    urgencyText: { fontSize: FontSize.xs, fontWeight: "600" },
    priceContainer: { alignItems: "flex-end", paddingTop: 2 },
    price: { color: c.text, fontSize: FontSize.md, fontWeight: "600" },
    priceLabel: { color: c.textMuted, fontSize: FontSize.xs - 1, marginTop: 2 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.md },
    nextPaymentWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
    nextPaymentText: { color: c.textMuted, fontSize: FontSize.xs },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm },
    actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceLight, borderWidth: 1, borderColor: c.border },
    actionBtnInactive: { backgroundColor: isDark ? "#1A1A2A" : "#ECEDF0", borderColor: isDark ? "#252538" : "#DDDFE3" },
  });
