/**
 * MediumWidget.tsx — 3×2 cell summary card widget.
 * FlexWidgetStyle: no gap, no flex on TextWidget, no rgba colors.
 */

import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

import {
  WidgetData,
  formatWidgetCurrency,
  getWidgetColors,
} from "@/lib/widgetData";
import { BudgetBar, HeaderBar, NotLoggedIn, PaymentRow, Separator } from "./shared";

interface MediumWidgetProps extends WidgetData {
  width: number;
  height: number;
}

export function MediumWidget({
  isLoggedIn,
  summary,
  upcoming,
  isDark,
  width,
  height,
}: MediumWidgetProps) {
  const c = getWidgetColors(isDark);

  if (!isLoggedIn || !summary) {
    return <NotLoggedIn c={c} width={width} height={height} />;
  }

  const nearestPayment = upcoming[0] ?? null;
  const monthlyLabel = formatWidgetCurrency(summary.monthlyTotal, summary.currency);
  const yearlyLabel = `${formatWidgetCurrency(summary.yearlyTotal, summary.currency)} / tahun`;

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        justifyContent: "flex-start",
        backgroundColor: c.background,
        borderRadius: 20,
        paddingVertical: 4,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <HeaderBar c={c} />

      {/* Main spending value */}
      <FlexWidget
        style={{
          paddingHorizontal: 14,
          paddingBottom: 8,
          flexDirection: "column",
        }}
      >
        <TextWidget
          text={monthlyLabel}
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: c.text,
          }}
          maxLines={1}
          truncate="END"
        />
        <TextWidget
          text={yearlyLabel}
          style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}
          maxLines={1}
        />
      </FlexWidget>

      {/* Budget progress bar */}
      <BudgetBar c={c} summary={summary} isDark={isDark} />

      <Separator c={c} />

      {/* Upcoming payment section */}
      {nearestPayment ? (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
          }}
        >
          <TextWidget
            text="🔔 Tagihan Terdekat"
            style={{
              fontSize: 10,
              color: c.textMuted,
              paddingHorizontal: 14,
              paddingTop: 6,
              paddingBottom: 2,
              fontWeight: "600",
            }}
            maxLines={1}
          />
          <PaymentRow payment={nearestPayment} c={c} isDark={isDark} />
        </FlexWidget>
      ) : (
        <TextWidget
          text="Tidak ada tagihan terdekat"
          style={{
            fontSize: 11,
            color: c.textMuted,
            paddingHorizontal: 14,
            paddingTop: 8,
          }}
          maxLines={1}
        />
      )}

      {/* Footer: active / inactive count */}
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingBottom: 10,
          paddingTop: 6,
        }}
      >
        <TextWidget
          text={`✓ ${summary.activeCount} aktif`}
          style={{ fontSize: 10, color: c.success, fontWeight: "600", marginRight: 12 }}
          maxLines={1}
        />
        {summary.inactiveCount > 0 && (
          <TextWidget
            text={`○ ${summary.inactiveCount} nonaktif`}
            style={{ fontSize: 10, color: c.textMuted }}
            maxLines={1}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
