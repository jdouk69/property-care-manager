// Service & Pricing Assessment (V1) — pure constants + pricing recommendation
// logic. No imports, no side effects: the recommendation ADVISES staff, it never
// dictates the final price. Final prices always require manual staff approval
// and are stored on the agreement/visit at creation time, so later package
// price changes never reprice existing customers.
// NOTE: "+ VAT" is a V1 pricing DISPLAY treatment only — no VAT accounting.

export const SIZE_OPTIONS = ["Under 100 m²", "100–200 m²", "200–300 m²", "300+ m²"];
export const COMPLEXITY_OPTIONS = ["Simple", "Standard", "Complex"];
export const VISIT_TIME_OPTIONS = ["Up to 15 minutes", "30–45 minutes", "Up to 60 minutes", "More than 60 minutes"];
export const SERVICE_AREA_OPTIONS = ["Within normal service area", "Outside normal service area / review required"];

// Assessment indicators only — NEVER automatic individual surcharges.
export const CHARACTERISTICS = [
  { key: "assessment_pool_spa", label: "Pool / spa" },
  { key: "assessment_multiple_floors", label: "Multiple floors" },
  { key: "assessment_outbuilding", label: "Detached substantial outbuilding" },
  { key: "assessment_extensive_grounds", label: "Extensive exterior / grounds" },
  { key: "assessment_difficult_access", label: "Difficult / unusual access" },
  { key: "assessment_special_monitoring", label: "Special owner monitoring requirements" },
];

export const UNIT_CHARGE = 40; // + VAT per additional separately checked residence/unit

export const PRICING_NOTE =
  "Base pricing applies to standard properties within the normal service area. Larger or more complex properties, additional residences/units, or special monitoring requirements may require adjusted pricing. Final pricing is confirmed after the initial property assessment.";

// Included visit time (minutes) per service tier — used ONLY to judge whether
// the staff-estimated visit time exceeds the selected package's allowance.
export const TIER_ALLOWANCE_MINUTES = { Basic: 15, Standard: 45, Premium: 60 };

const ESTIMATED_MINUTES = {
  "Up to 15 minutes": 15,
  "30–45 minutes": 45,
  "Up to 60 minutes": 60,
  "More than 60 minutes": 75,
};

export function formatPricePlusVat(price, { perMonth = false } = {}) {
  const n = Math.round((Number(price) || 0) * 100) / 100;
  const str = Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2)}`;
  return `${str}${perMonth ? "/month" : ""} + VAT`;
}

// Build the pricing recommendation for one (tier, purchase type) combination.
// Returns { status: "recommended" | "custom_review", basePrice, additionalUnits,
// unitAdjustment, recommendedPrice, reasons }.
export function buildRecommendation({ tier, purchaseType, basePrice, oneTimePrice, assessment = {} }) {
  const base = purchaseType === "One-time" ? (oneTimePrice ?? basePrice ?? 0) : (basePrice ?? 0);
  const units = Math.max(0, Math.round(Number(assessment.assessment_additional_units) || 0));
  const unitAdjustment = units * UNIT_CHARGE;

  const reasons = [];
  if (assessment.assessment_interior_size === "300+ m²") {
    reasons.push("Property is 300+ m²");
  }
  if (assessment.assessment_complexity === "Complex") {
    reasons.push("Property is marked Complex");
  }
  const est = ESTIMATED_MINUTES[assessment.assessment_visit_time] || 0;
  const allowance = TIER_ALLOWANCE_MINUTES[tier] || 0;
  if (est > allowance) {
    reasons.push(`Estimated visit time (${assessment.assessment_visit_time}) exceeds the ${tier} included visit time`);
  }
  if (units >= 3) {
    reasons.push("Multiple additional units create substantial additional work");
  }
  if (assessment.assessment_service_area === "Outside normal service area / review required") {
    reasons.push("Property is outside the normal service area");
  }
  if (assessment.assessment_special_monitoring === true) {
    reasons.push("Special monitoring requirements create substantial additional work");
  }

  return {
    status: reasons.length ? "custom_review" : "recommended",
    basePrice: base,
    additionalUnits: units,
    unitAdjustment,
    recommendedPrice: base + unitAdjustment,
    reasons,
  };
}