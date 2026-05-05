/**
 * LargeWidget.tsx — 4×3 cell full-dashboard widget.
 * FlexWidgetStyle: no gap, no flex on TextWidget, no rgba colors.
 */

import React from "react";
import { FlexWidget, TextWidget, ImageWidget } from "react-native-android-widget";

import {
  WidgetData,
  formatWidgetCurrency,
  getWidgetColors,
} from "@/lib/widgetData";
import { BudgetBar, NotLoggedIn, PaymentRow, Separator } from "./shared";

interface LargeWidgetProps extends WidgetData {
  width: number;
  height: number;
}

export function LargeWidget({
  isLoggedIn,
  summary,
  upcoming,
  isDark,
  width,
  height,
}: LargeWidgetProps) {
  const c = getWidgetColors(isDark);

  if (!isLoggedIn || !summary) {
    return <NotLoggedIn c={c} width={width} height={height} />;
  }

  const monthlyLabel = formatWidgetCurrency(summary.monthlyTotal, summary.currency);
  const yearlyLabel = formatWidgetCurrency(summary.yearlyTotal, summary.currency);

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        backgroundColor: c.background,
        borderRadius: 20,
        paddingVertical: 4,
      }}
      clickAction="OPEN_APP"
    >
      {/* ── Header section ─────────────────────────────────────────────────── */}
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          alignItems: "flex-start",
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 6,
        }}
      >
        {/* Left: brand + label */}
        <FlexWidget
          style={{ flexDirection: "column" }}
        >
          <FlexWidget
            style={{ flexDirection: "row", alignItems: "center" }}
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
          <TextWidget
            text="Pengeluaran Bulanan"
            style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}
            maxLines={1}
          />
        </FlexWidget>

        {/* Spacer */}
        <FlexWidget style={{ flex: 1 }} />

        {/* Right: yearly total */}
        <FlexWidget style={{ flexDirection: "column", alignItems: "flex-end" }}>
          <TextWidget
            text={yearlyLabel}
            style={{ fontSize: 11, color: c.textSecondary, fontWeight: "600" }}
            maxLines={1}
          />
          <TextWidget
            text="per tahun"
            style={{ fontSize: 9, color: c.textMuted, marginTop: 1 }}
            maxLines={1}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Monthly total ───────────────────────────────────────────────────── */}
      <TextWidget
        text={monthlyLabel}
        style={{
          fontSize: 26,
          fontWeight: "bold",
          color: c.text,
          paddingHorizontal: 14,
        }}
        maxLines={1}
        truncate="END"
      />

      {/* ── Budget bar ──────────────────────────────────────────────────────── */}
      <FlexWidget style={{ marginTop: 8, marginBottom: 4, width: "match_parent" }}>
        <BudgetBar c={c} summary={summary} isDark={isDark} />
      </FlexWidget>

      <Separator c={c} />

      {/* ── Upcoming payments section ───────────────────────────────────────── */}
      <TextWidget
        text="📅 Tagihan Terdekat"
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: c.text,
          paddingHorizontal: 14,
          paddingTop: 6,
          paddingBottom: 4,
        }}
        maxLines={1}
      />

      {upcoming.length > 0 ? (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
          }}
        >
          {upcoming.map((payment, index) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              c={c}
              isDark={isDark}
              showBorder={index < upcoming.length - 1}
            />
          ))}
        </FlexWidget>
      ) : (
        <TextWidget
          text="Tidak ada tagihan aktif"
          style={{
            fontSize: 12,
            color: c.textMuted,
            paddingHorizontal: 14,
          }}
          maxLines={1}
        />
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <Separator c={c} />
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          paddingHorizontal: 14,
          paddingVertical: 8,
          alignItems: "center",
        }}
      >
        <TextWidget
          text={`✓ ${summary.activeCount} aktif`}
          style={{ fontSize: 11, color: c.success, fontWeight: "600", marginRight: 14 }}
          maxLines={1}
        />
        {summary.inactiveCount > 0 && (
          <TextWidget
            text={`○ ${summary.inactiveCount} nonaktif`}
            style={{ fontSize: 11, color: c.textMuted, marginRight: 8 }}
            maxLines={1}
          />
        )}
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget
          text="Ketuk untuk buka →"
          style={{ fontSize: 9, color: c.textMuted }}
          maxLines={1}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
