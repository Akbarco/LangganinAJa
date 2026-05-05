/**
 * shared.tsx — Shared building blocks for all widget sizes.
 *
 * Uses FlexWidget / TextWidget from react-native-android-widget.
 * FlexWidgetStyle does NOT support: gap (use marginRight/marginBottom instead),
 * flex on TextWidget, or percentage widths on inner views.
 * rgba() colors are also NOT supported — use hex with opacity workaround.
 */

import React from "react";
import { FlexWidget, TextWidget, ImageWidget } from "react-native-android-widget";

import {
  UpcomingPayment,
  WidgetSummary,
  WidgetThemeColors,
  calcDaysUntil,
  daysLabel,
  formatWidgetCurrency,
  urgencyColor,
} from "@/lib/widgetData";

// ─── Not-logged-in fallback ───────────────────────────────────────────────────

interface NotLoggedInProps {
  c: WidgetThemeColors;
  width: number;
  height: number;
}

export function NotLoggedIn({ c, width, height }: NotLoggedInProps) {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.background,
        borderRadius: 20,
        padding: 16,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="🔒"
        style={{ fontSize: 28, color: c.text }}
      />
      <TextWidget
        text="Login dulu di"
        style={{
          fontSize: 13,
          color: c.textSecondary,
          marginTop: 8,
        }}
        maxLines={1}
      />
      <TextWidget
        text="Langganinaja"
        style={{
          fontSize: 14,
          fontWeight: "bold",
          color: c.primary,
          marginTop: 2,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

// ─── Widget header bar ────────────────────────────────────────────────────────

interface HeaderBarProps {
  c: WidgetThemeColors;
}

export function HeaderBar({ c }: HeaderBarProps) {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 6,
      }}
    >
      <ImageWidget
        image={require("../assets/images/icon.png")}
        imageWidth={18}
        imageHeight={18}
        radius={9}
        style={{ marginRight: 6 }}
      />
      <TextWidget
        text="Langganinaja"
        style={{
          fontSize: 13,
          fontWeight: "bold",
          color: c.primary,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

// ─── Budget progress bar ──────────────────────────────────────────────────────

interface BudgetBarProps {
  c: WidgetThemeColors;
  summary: WidgetSummary;
  isDark: boolean;
}

export function BudgetBar({ c, summary, isDark }: BudgetBarProps) {
  const hasBudget = (summary.monthlyBudget ?? 0) > 0;
  const rawProgress = hasBudget
    ? Math.min((summary.monthlyTotal / summary.monthlyBudget!) * 100, 100)
    : 0;
  const progress = Math.round(rawProgress);

  const barColor: string = !hasBudget
    ? c.textMuted
    : summary.monthlyTotal > summary.monthlyBudget!
    ? c.danger
    : summary.monthlyTotal > summary.monthlyBudget! * 0.8
    ? c.warning
    : c.success;

  const budgetLabel = hasBudget
    ? `${progress}% budget`
    : "Budget belum diatur";

  // Track background: use hex colors only (no rgba support in widget styles)
  const trackBg: string = isDark ? "#2A2A45" : "#E5E7EB";

  // Clamp fill width so it's never 0 (invisible) and never > track
  const fillWidth = Math.max(4, Math.min(progress, 100));

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "column",
        paddingHorizontal: 14,
      }}
    >
      {/* Progress bar track */}
      <FlexWidget
        style={{
          width: "match_parent",
          height: 5,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: trackBg as any,
          borderRadius: 3,
        }}
      >
        {/* Progress fill: flex ratio trick since % widths are unsupported */}
        {hasBudget && (
          <FlexWidget
            style={{
              height: "match_parent",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              backgroundColor: barColor as any,
              borderRadius: 3,
              flex: fillWidth,
            }}
          />
        )}
        {/* Empty remainder */}
        {hasBudget && fillWidth < 100 && (
          <FlexWidget
            style={{
              height: "match_parent",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              backgroundColor: trackBg as any,
              flex: 100 - fillWidth,
            }}
          />
        )}
      </FlexWidget>
      <TextWidget
        text={budgetLabel}
        style={{
          fontSize: 10,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          color: (hasBudget ? barColor : c.textMuted) as any,
          marginTop: 3,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

// ─── Separator line ───────────────────────────────────────────────────────────

interface SeparatorProps {
  c: WidgetThemeColors;
}

export function Separator({ c }: SeparatorProps) {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: 1,
        backgroundColor: c.separator,
        marginHorizontal: 14,
        marginVertical: 4,
      }}
    />
  );
}

// ─── Upcoming payment row ─────────────────────────────────────────────────────

interface PaymentRowProps {
  payment: UpcomingPayment;
  c: WidgetThemeColors;
  isDark: boolean;
  showBorder?: boolean;
}

export function PaymentRow({ payment, c, isDark, showBorder = false }: PaymentRowProps) {
  const days = calcDaysUntil(payment.nextPaymentDate);
  const dayColor: string = urgencyColor(days, isDark);
  const label = daysLabel(days);

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: c.separator,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ subscriptionId: payment.id }}
    >
      {/* Urgency dot */}
      <FlexWidget
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: dayColor as any,
          marginRight: 8,
        }}
      />
      {/* Name */}
      <TextWidget
        text={payment.name}
        style={{
          fontSize: 12,
          fontWeight: "bold",
          color: c.text,
          marginRight: 8,
        }}
        maxLines={1}
        truncate="END"
      />
      {/* Price */}
      <TextWidget
        text={formatWidgetCurrency(payment.price, payment.currency)}
        style={{
          fontSize: 11,
          color: c.textSecondary,
          marginRight: 6,
        }}
        maxLines={1}
      />
      {/* Days badge */}
      <TextWidget
        text={label}
        style={{
          fontSize: 10,
          fontWeight: "bold",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          color: dayColor as any,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}
