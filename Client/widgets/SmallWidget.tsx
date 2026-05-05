/**
 * SmallWidget.tsx — 2×1 cell quick-glance widget.
 *
 * FlexWidgetStyle constraints:
 *  - No 'gap' (use marginRight/marginBottom)
 *  - No flex on TextWidget
 *  - No rgba() colors
 */

import React from "react";
import { FlexWidget, TextWidget, ImageWidget } from "react-native-android-widget";

import {
  WidgetData,
  formatWidgetCurrency,
  getWidgetColors,
} from "@/lib/widgetData";
import { NotLoggedIn } from "./shared";

interface SmallWidgetProps extends WidgetData {
  width: number;
  height: number;
}

export function SmallWidget({ isLoggedIn, summary, isDark, width, height }: SmallWidgetProps) {
  const c = getWidgetColors(isDark);

  if (!isLoggedIn || !summary) {
    return <NotLoggedIn c={c} width={width} height={height} />;
  }

  const monthlyLabel = formatWidgetCurrency(summary.monthlyTotal, summary.currency);
  const activeLabel = `${summary.activeCount} langganan aktif`;

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        backgroundColor: c.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
      clickAction="OPEN_APP"
    >
      {/* Icon + label row */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <ImageWidget
          image={require("../assets/images/icon.png")}
          imageWidth={16}
          imageHeight={16}
          radius={8}
          style={{ marginRight: 6 }}
        />
        <TextWidget
          text="Pengeluaran Bulanan"
          style={{
            fontSize: 11,
            color: c.textMuted,
            fontWeight: "500",
          }}
          maxLines={1}
        />
      </FlexWidget>

      {/* Main value */}
      <TextWidget
        text={monthlyLabel}
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: c.text,
        }}
        maxLines={1}
        truncate="END"
      />

      {/* Subtitle */}
      <TextWidget
        text={activeLabel}
        style={{
          fontSize: 11,
          color: c.textSecondary,
          marginTop: 2,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}
