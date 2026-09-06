// A stable, presentable client-facing reference (e.g. "Q-202609-A1B2C3") —
// derived from existing data rather than a new sequential-counter column,
// which would need its own race-safe schema support.
export function formatQuotationNumber(quotation: { id: string; createdAt: Date | string }) {
  const date = new Date(quotation.createdAt);
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `Q-${yearMonth}-${quotation.id.slice(-6).toUpperCase()}`;
}

export function formatCurrency(value: number | string | null | undefined, currency = "INR") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

// For pre-filling an <input type="datetime-local"> from a stored Date.
export function toDatetimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiff(value: Date) {
  return Math.round((startOfDay(value).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
}

// "Today" / "Yesterday" / "3 days ago" / "in 2 days", falling back to formatDate beyond a week.
export function formatRelativeTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const diff = dayDiff(date);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff < 0 && diff >= -6) return `${-diff} days ago`;
  if (diff > 0 && diff <= 6) return `in ${diff} days`;
  return formatDate(date);
}
