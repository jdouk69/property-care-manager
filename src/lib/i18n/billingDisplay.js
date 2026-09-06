// Language-aware display helpers for the billing monthly ledger.
// Display-only: stored charge/billing_period values are never touched, and
// month matching (e.g. stripMonthSuffix in lib/billing.js) keeps using the
// ENGLISH monthLabel so suffixes written into stored descriptions still match.
const LOCALES = { en: "en-GB", el: "el-GR" };

// "2026-10" -> "October 2026" / "Οκτωβρίου 2026"-style month-year label.
export function localizedMonthLabel(key, lang = "en") {
  const [y, m] = String(key || "").split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return "";
  return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.en, {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

// "2026-10-15" -> "15 Oct" / "15 Οκτ" (short day-month, no year).
export function localizedShortDate(dateStr, lang = "en") {
  const [y, m, d] = String(dateStr || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.en, {
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}