import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, PieChart } from "react-native-gifted-charts";

import { BorderRadius, FontSize, Spacing, ThemeColors } from "@/constants";
import { useTheme } from "@/hooks/useTheme";
import { getCategoryInfo } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { CategoryType, Subscription } from "@/types";

const WEEK_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type CategoryAnalytics = {
  category: CategoryType;
  count: number;
  totalAmount: number;
};

const toMonthlyAmount = (subscription: Subscription) =>
  subscription.billingCycle === "YEARLY"
    ? Math.round(subscription.price / 12)
    : subscription.price;

const addMonths = (date: Date, count: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
};

const isSameMonthYear = (a: Date, b: Date) =>
  a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const isValidDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime());
};

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    subscriptions,
    summary,
    fetchSubscriptions,
    fetchSummary,
    isLoading,
  } = useSubscriptionStore();
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchSubscriptions();
        await fetchSummary();
      } catch {
        // ignore
      }
    };
    loadData();
  }, [fetchSubscriptions, fetchSummary]);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((item) => item.isActive && isValidDate(item.nextPaymentDate)),
    [subscriptions],
  );

  const categoryData = useMemo(() => {
    const map = new Map<CategoryType, CategoryAnalytics>();
    activeSubscriptions.forEach((subscription) => {
      const category = (subscription.category || "OTHER") as CategoryType;
      const existing = map.get(category);
      const value = toMonthlyAmount(subscription);
      if (existing) {
        existing.count += 1;
        existing.totalAmount += value;
      } else {
        map.set(category, {
          category,
          count: 1,
          totalAmount: value,
        });
      }
    });
    return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [activeSubscriptions]);

  const totalExpense = categoryData.reduce((acc, item) => acc + item.totalAmount, 0);
  const pieData = categoryData.map((item) => {
    const catInfo = getCategoryInfo(item.category, isDark);
    const percent = totalExpense > 0 ? Math.round((item.totalAmount / totalExpense) * 100) : 0;
    return {
      value: item.totalAmount,
      color: catInfo.color,
      text: `${percent}%`,
    };
  });

  const budgetProgress = useMemo(() => {
    const monthlyBudget = summary?.monthlyBudget ?? 0;
    const monthlyTotal = summary?.monthlyTotal ?? totalExpense;
    if (monthlyBudget <= 0) return 0;
    return Math.min((monthlyTotal / monthlyBudget) * 100, 200);
  }, [summary, totalExpense]);

  const budgetInsight = useMemo(() => {
    if (!summary?.monthlyBudget || summary.monthlyBudget <= 0) {
      return {
        type: "neutral" as const,
        title: "Budget belum diatur",
        message: "Set budget bulanan di profil supaya warning bisa aktif otomatis.",
      };
    }
    if (budgetProgress >= 100) {
      return {
        type: "danger" as const,
        title: "Budget terlampaui",
        message: `Pengeluaran sudah ${Math.round(budgetProgress)}% dari budget.`,
      };
    }
    if (budgetProgress >= 80) {
      return {
        type: "warning" as const,
        title: "Warning budget >80%",
        message: `Pengeluaran sudah ${Math.round(budgetProgress)}% dari budget bulan ini.`,
      };
    }
    return {
      type: "safe" as const,
      title: "Budget aman",
      message: `Pengeluaran baru ${Math.round(budgetProgress)}% dari budget.`,
    };
  }, [budgetProgress, summary?.monthlyBudget]);

  const topExpensive = useMemo(
    () =>
      [...activeSubscriptions]
        .sort((a, b) => toMonthlyAmount(b) - toMonthlyAmount(a))
        .slice(0, 3),
    [activeSubscriptions],
  );

  const trendData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), index);
      const amount = activeSubscriptions.reduce((acc, subscription) => {
        const dueDate = new Date(subscription.nextPaymentDate);
        if (isSameMonthYear(monthDate, dueDate)) {
          return acc + toMonthlyAmount(subscription);
        }
        return acc;
      }, 0);

      return {
        value: amount,
        label: MONTH_NAMES[monthDate.getMonth()].slice(0, 3),
        dataPointText: amount > 0 ? `${Math.round(amount / 1000)}K` : "",
      };
    });
    return months;
  }, [activeSubscriptions]);

  const selectedMonthDate = useMemo(
    () => addMonths(new Date(new Date().getFullYear(), new Date().getMonth(), 1), monthOffset),
    [monthOffset],
  );

  const dueMap = useMemo(() => {
    const result = new Map<number, Subscription[]>();
    activeSubscriptions.forEach((subscription) => {
      const dueDate = new Date(subscription.nextPaymentDate);
      if (!isSameMonthYear(dueDate, selectedMonthDate)) return;
      const day = dueDate.getDate();
      const existing = result.get(day) || [];
      existing.push(subscription);
      result.set(day, existing);
    });
    return result;
  }, [activeSubscriptions, selectedMonthDate]);

  const calendarCells = useMemo(() => {
    const totalDays = new Date(
      selectedMonthDate.getFullYear(),
      selectedMonthDate.getMonth() + 1,
      0,
    ).getDate();
    const firstDayWeekIndex = new Date(
      selectedMonthDate.getFullYear(),
      selectedMonthDate.getMonth(),
      1,
    ).getDay();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDayWeekIndex; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(day);
    }
    return cells;
  }, [selectedMonthDate]);

  const dueList = useMemo(() => {
    const rows: Array<{ date: string; total: number; count: number }> = [];
    [...dueMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([day, items]) => {
        const total = items.reduce((acc, item) => acc + toMonthlyAmount(item), 0);
        rows.push({
          date: `${day} ${MONTH_NAMES[selectedMonthDate.getMonth()]}`,
          total,
          count: items.length,
        });
      });
    return rows;
  }, [dueMap, selectedMonthDate]);

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
      <Text style={styles.title}>Statistik</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.insightCard,
            budgetInsight.type === "danger" && styles.insightDanger,
            budgetInsight.type === "warning" && styles.insightWarning,
            budgetInsight.type === "safe" && styles.insightSafe,
          ]}
        >
          <View style={styles.insightHeader}>
            <Ionicons
              name={
                budgetInsight.type === "danger"
                  ? "warning"
                  : budgetInsight.type === "warning"
                    ? "alert-circle"
                    : "checkmark-circle"
              }
              size={20}
              color={colors.text}
            />
            <Text style={styles.insightTitle}>{budgetInsight.title}</Text>
          </View>
          <Text style={styles.insightText}>{budgetInsight.message}</Text>
          {summary?.monthlyBudget ? (
            <Text style={styles.insightSubText}>
              {formatCurrency(summary.monthlyTotal, summary.currency)} /{" "}
              {formatCurrency(summary.monthlyBudget, summary.currency)}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kalender Tagihan (Lokal)</Text>
          <View style={styles.monthSwitchRow}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setMonthOffset((prev) => Math.max(prev - 1, 0))}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[selectedMonthDate.getMonth()]} {selectedMonthDate.getFullYear()}
            </Text>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setMonthOffset((prev) => Math.min(prev + 1, 11))}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((day) => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const itemCount = dueMap.get(day)?.length || 0;
              return (
                <View key={`${day}-${index}`} style={styles.dayCell}>
                  <View style={[styles.dayBadge, itemCount > 0 && styles.dayBadgeActive]}>
                    <Text style={[styles.dayText, itemCount > 0 && styles.dayTextActive]}>
                      {day}
                    </Text>
                  </View>
                  {itemCount > 0 ? <Text style={styles.dayCount}>{itemCount}</Text> : null}
                </View>
              );
            })}
          </View>

          <View style={styles.agenda}>
            {dueList.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada tagihan di bulan ini.</Text>
            ) : (
              dueList.map((item) => (
                <View key={item.date} style={styles.agendaRow}>
                  <Text style={styles.agendaDate}>{item.date}</Text>
                  <Text style={styles.agendaAmount}>
                    {formatCurrency(item.total)} • {item.count} item
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Termahal (Bulanan)</Text>
          {topExpensive.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada langganan aktif.</Text>
          ) : (
            topExpensive.map((item, index) => (
              <View key={item.id} style={styles.topRow}>
                <Text style={styles.topIndex}>#{index + 1}</Text>
                <View style={styles.topInfo}>
                  <Text style={styles.topName}>{item.name}</Text>
                  <Text style={styles.topMeta}>
                    {item.billingCycle === "YEARLY" ? "Tahunan" : "Bulanan"}
                  </Text>
                </View>
                <Text style={styles.topPrice}>{formatCurrency(toMonthlyAmount(item))}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tren Jatuh Tempo 6 Bulan</Text>
          <LineChart
            data={trendData}
            color={colors.primary}
            thickness={3}
            dataPointsColor={colors.primary}
            startFillColor={colors.primary}
            startOpacity={0.2}
            endOpacity={0.02}
            spacing={44}
            initialSpacing={12}
            noOfSections={4}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
            hideRules={false}
            rulesColor={colors.border}
          />
        </View>

        {categoryData.length > 0 ? (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Rincian Kategori</Text>
              <View style={styles.chartContainer}>
                <PieChart
                  donut
                  innerRadius={66}
                  radius={102}
                  data={pieData}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieAmount}>
                        {formatCurrency(totalExpense, "IDR").replace("Rp", "").trim()}
                      </Text>
                      <Text style={styles.pieLabel}>Estimasi/Bulan</Text>
                    </View>
                  )}
                  showText
                  textColor={colors.white}
                  fontWeight="bold"
                  textSize={11}
                />
              </View>
            </View>

            <View style={styles.breakdownList}>
              {categoryData.map((item) => {
                const catInfo = getCategoryInfo(item.category, isDark);
                const percent = totalExpense > 0 ? Math.round((item.totalAmount / totalExpense) * 100) : 0;
                return (
                  <View key={item.category} style={styles.categoryItem}>
                    <View style={[styles.catIcon, { backgroundColor: catInfo.bgColor }]}>
                      <Ionicons name={catInfo.icon as any} size={20} color={catInfo.color} />
                    </View>
                    <View style={styles.catInfo}>
                      <Text style={styles.catName}>{catInfo.label}</Text>
                      <Text style={styles.catCount}>{item.count} langganan</Text>
                    </View>
                    <View style={styles.catValue}>
                      <Text style={styles.catAmount}>{formatCurrency(item.totalAmount, "IDR")}</Text>
                      <Text style={styles.catPercent}>{percent}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Belum ada data pengeluaran</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: {
      color: c.text,
      fontSize: FontSize.xxl,
      fontWeight: "600",
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 140,
      gap: Spacing.md,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    insightCard: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: Spacing.xs,
    },
    insightSafe: {
      borderColor: "rgba(22,163,74,0.35)",
      backgroundColor: "rgba(22,163,74,0.08)",
    },
    insightWarning: {
      borderColor: "rgba(217,119,6,0.35)",
      backgroundColor: "rgba(217,119,6,0.08)",
    },
    insightDanger: {
      borderColor: "rgba(220,38,38,0.35)",
      backgroundColor: "rgba(220,38,38,0.08)",
    },
    insightHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    insightTitle: {
      color: c.text,
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    insightText: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      lineHeight: 20,
    },
    insightSubText: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "600",
      marginTop: 2,
    },
    cardTitle: {
      color: c.text,
      fontSize: FontSize.md,
      fontWeight: "600",
      marginBottom: Spacing.md,
    },
    monthSwitchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.md,
    },
    monthButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    monthTitle: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    weekHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.sm,
    },
    weekText: {
      width: "14.2%",
      textAlign: "center",
      color: c.textMuted,
      fontSize: FontSize.xs,
      fontWeight: "500",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 10,
      marginBottom: Spacing.md,
    },
    dayCell: {
      width: "14.2%",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      gap: 4,
    },
    dayBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceLight,
    },
    dayBadgeActive: {
      backgroundColor: c.primary,
    },
    dayText: {
      color: c.textSecondary,
      fontSize: FontSize.xs,
      fontWeight: "600",
    },
    dayTextActive: {
      color: c.white,
    },
    dayCount: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: "600",
    },
    agenda: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
    },
    agendaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    agendaDate: {
      color: c.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: "500",
    },
    agendaAmount: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    topIndex: {
      width: 28,
      color: c.textMuted,
      fontSize: FontSize.sm,
      fontWeight: "700",
    },
    topInfo: {
      flex: 1,
    },
    topName: {
      color: c.text,
      fontSize: FontSize.md,
      fontWeight: "500",
    },
    topMeta: {
      color: c.textMuted,
      fontSize: FontSize.xs,
      marginTop: 2,
    },
    topPrice: {
      color: c.text,
      fontSize: FontSize.sm,
      fontWeight: "700",
    },
    chartCard: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    chartContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xs,
    },
    pieCenter: {
      justifyContent: "center",
      alignItems: "center",
    },
    pieAmount: {
      color: c.text,
      fontWeight: "600",
      fontSize: 18,
    },
    pieLabel: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    breakdownList: { gap: Spacing.sm },
    categoryItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: Spacing.md,
    },
    catInfo: { flex: 1 },
    catName: { color: c.text, fontSize: FontSize.md, fontWeight: "500" },
    catCount: { color: c.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    catValue: { alignItems: "flex-end" },
    catAmount: { color: c.text, fontSize: FontSize.md, fontWeight: "600" },
    catPercent: { color: c.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 64,
    },
    emptyText: {
      color: c.textMuted,
      marginTop: Spacing.sm,
      fontSize: FontSize.sm,
    },
  });
