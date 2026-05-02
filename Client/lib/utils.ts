/**
 * Format number to IDR currency string.
 * e.g. 54000 → "Rp 54.000"
 */
export function formatCurrency(amount: number | null | undefined, currency: string = "IDR"): string {
  const safeAmount = amount ?? 0;
  if (currency === "IDR") {
    return `Rp ${safeAmount.toLocaleString("id-ID")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(safeAmount);
}

export function parseRupiahInput(value: string): number | undefined {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : undefined;
}

export function formatRupiahInput(amount: number | string | null | undefined): string {
  const digits = String(amount ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

/**
 * Format ISO date string to readable format.
 * e.g. "2026-04-01T00:00:00.000Z" → "1 Apr 2026"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculate days until next payment.
 * Returns negative number if overdue.
 */
export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get a label for days until payment.
 * e.g. "3 hari lagi", "Hari ini!", "Terlambat 2 hari"
 */
export function getDaysLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return "Hari ini!";
  if (days === 1) return "Besok";
  if (days > 0) return `${days} hari lagi`;
  return `Terlambat ${Math.abs(days)} hari`;
}

/**
 * Get urgency color based on days until payment.
 * Green = safe (>7 days), Yellow = soon (<7 days), Red = urgent (H-1, today, overdue)
 */
export function getUrgencyColor(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days <= 1) return "#EF4444";   // red — urgent (today, tomorrow, overdue)
  if (days <= 7) return "#F59E0B";   // amber — soon
  return "#22C55E";                  // green — safe
}

/**
 * Get billing cycle label in Indonesian.
 */
export function getBillingLabel(cycle: string): string {
  return cycle === "MONTHLY" ? "Bulanan" : "Tahunan";
}

/**
 * Generate initials from a name. e.g. "Netflix" → "NE", "Google One" → "GO"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return name.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Predefined colors for subscription card avatars.
 * Balanced tones that work on both light and dark backgrounds.
 */
const avatarColors = [
  "#2563EB", "#059669", "#DC2626", "#D97706",
  "#7C3AED", "#EA580C", "#0891B2", "#4F46E5",
  "#DB2777", "#16A34A", "#0284C7", "#C2410C",
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
