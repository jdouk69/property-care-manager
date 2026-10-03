// Resolution layer between the live pricing feed and the editable card wording.
//
// ALL customer-facing card wording (title, short description, what's
// included, extra-time note — English and Greek) is managed in the website
// editor's Services tab and stored in the WebsiteSection "services" content,
// where the defaults live in contentModel.js. This module contains NO copy
// of its own; it only substitutes the LIVE euro amounts into that copy:
// {price} -> the service's live price, {hourly} -> the live hourly rate.
// Fail-closed: a missing live price, or an {hourly} placeholder with no live
// hourly rate, makes the card show the unavailable state — never an invented
// or stale amount.

// Price display: whole euros without decimals (€65), real cents preserved
// (€45.50). Applied to the LIVE feed value only — never a fallback number.
export function formatPrice(n) {
  if (n == null) return "";
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// Returns the display terms for a live feed service, or null when the copy
// depends on live amounts that are missing (fail-closed — never a fallback).
// `cards` is the language-resolved services.cards wording, already merged
// over the defaults by the website content context.
export function serviceTerms(service, lang, cards) {
  const card = cards?.[service?.service_key];
  if (!card || service.price == null) return null;
  const priceText = formatPrice(service.price);
  const hourlyText = service.hourly_rate == null ? null : formatPrice(service.hourly_rate);
  const needsHourly = (s) => typeof s === "string" && s.includes("{hourly}");
  if ((needsHourly(card.extras) || needsHourly(card.included) || needsHourly(card.desc)) && hourlyText == null) {
    return null;
  }
  const sub = (s) =>
    typeof s !== "string" || !s.trim()
      ? null
      : s.split("{price}").join(priceText).split("{hourly}").join(hourlyText || "");
  return {
    name: (typeof card.name === "string" && card.name.trim()) || service.name,
    desc: sub(card.desc),
    included: sub(card.included),
    extras: sub(card.extras),
  };
}

// Billing-unit label for the price headline, from the FEED's billing_unit.
export function billingUnitLabel(billingUnit, lang) {
  if (billingUnit === "month") return lang === "el" ? "τον μήνα" : "per month";
  return lang === "el" ? "ανά επίσκεψη" : "per visit";
}

export const MONTHLY_KEYS = ["quick_check", "property_care", "complete_care"];
export const ON_DEMAND_KEYS = [
  "owner_arrival_preparation",
  "seasonal_opening",
  "seasonal_closing",
  "owner_representative_site_visit",
  "grocery_stocking",
  "emergency_visit",
];
export const REQUIRED_KEYS = [...MONTHLY_KEYS, ...ON_DEMAND_KEYS];