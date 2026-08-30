// Agreement terms resolver + snapshot builder — BACKEND-AUTHORITATIVE single source.
// Pure, deterministic, no platform deps. Imported by:
//   - the authenticated agreementSend backend function (base44/functions/agreementSend/entry.ts)
//   - the frontend staff preview (src/lib/agreementTerms.js re-exports this module)
// This guarantees the invariant: STAFF PREVIEW = FROZEN SENT SNAPSHOT = future
// customer view = future signed PDF, because every path runs the SAME code.
//
// SECURITY: this module NEVER emits property access secrets (gate codes, lockbox
// codes, alarm PINs, key locations, Wi-Fi passwords, camera/door credentials).

// Access secrets that must never be resolved into the agreement/snapshot, and
// whose values are scanned for defensively before a snapshot is frozen.
export const SECRET_FIELDS = [
  "gate_code",
  "lockbox_code",
  "alarm_instructions",
  "alarm_company",
  "security_camera",
  "security_system",
  "key_location",
  "wifi_ssid",
  "wifi_password",
  "electricity_account",
  "water_account",
  "internet_account",
  "utility_shutoff",
];

/**
 * Render VAT wording from the configured VAT treatment.
 * @param {string} vatSetting - ServicePackage.vat_setting
 * @param {number} vatRate - BusinessSettings.vat_rate (e.g. 24)
 * @returns {string}
 */
export function renderVatWording(vatSetting, vatRate) {
  if (vatSetting === "Included") return "Price includes applicable VAT.";
  if (vatSetting === "Exempt") return "VAT is not applicable to this service.";
  const rate = typeof vatRate === "number" && !isNaN(vatRate) ? vatRate : 24;
  return `Applicable VAT will be added to the stated price at the current rate (${rate}%).`;
}

/**
 * Render an optional charge value. Empty/0/missing -> safe fallback wording.
 * @param {number|string} value
 * @param {string} mode - "not_applicable" (default) | "quoted"
 * @returns {string}
 */
export function renderOptionalCharge(value, mode = "not_applicable") {
  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !(typeof value === "number" && value === 0);
  if (hasValue) {
    return typeof value === "number" ? `€${value.toFixed(2)}` : String(value);
  }
  return mode === "quoted"
    ? "Quoted separately with owner approval"
    : "Not applicable";
}

/**
 * Render the emergency pre-approved spending limit as a clean customer-facing
 * phrase. Never produces malformed text such as "up to  per incident".
 * @param {number|string|null} amount
 * @returns {string}
 */
export function renderEmergencyMaxAmount(amount) {
  if (amount === undefined || amount === null || amount === "") return "Not yet confirmed";
  const n = Number(amount);
  if (isNaN(n)) return "Not yet confirmed";
  if (n === 0) return "No spending pre-approved without owner contact";
  return `up to €${n.toFixed(2)} per incident`;
}

/**
 * Replace approved dynamic placeholders of the form {{field}} within a string.
 * Only allowlisted keys resolve; secret keys and unknown keys resolve to "".
 * @param {string} text
 * @param {object} fields - resolved dynamic values
 */
export function resolvePlaceholders(text, fields) {
  if (typeof text !== "string") return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) => {
    if (SECRET_FIELDS.includes(key)) return "";
    const v = fields ? fields[key] : undefined;
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

/**
 * Resolve a structured template body into rendered sections.
 * Each section: { id, heading, paragraphs: string[] }.
 * @param {Array} body - template.body
 * @param {object} fields
 * @returns {Array} resolved sections
 */
export function resolveSections(body, fields) {
  if (!Array.isArray(body)) return [];
  return body.map((section) => ({
    id: section.id,
    heading: resolvePlaceholders(section.heading || "", fields),
    paragraphs: (section.paragraphs || []).map((p) => resolvePlaceholders(p, fields)),
  }));
}

/**
 * Build the customer-facing sent_snapshot (the frozen agreement content).
 * NO access secrets are included. Commercial + legal + identity + versions only.
 *
 * @param {object} ctx - { business, client, property, servicePackage, agreement, template, vatRate }
 * @returns {object} snapshot
 */
export function buildSentSnapshot(ctx) {
  const {
    business = {},
    client = {},
    property = {},
    servicePackage = {},
    agreement = {},
    template = {},
    vatRate,
  } = ctx || {};

  const fields = {
    business_name: business.business_name || "",
    business_address: business.address || "",
    business_email: business.email || "",
    business_phone: business.phone || "",
    business_whatsapp: business.whatsapp || "",
    business_owner_name: business.owner_name || "",
    customer_full_name: client.name || "",
    customer_email: client.email || "",
    property_name: property.name || "",
    property_address: property.address || "",
    property_type: property.property_type || "",
    service_package_name: servicePackage.name || "",
    service_description: servicePackage.description || "",
    included_services: [
      servicePackage.description || "",
      agreement.included_services_override || "",
    ]
      .filter(Boolean)
      .join("\n"),
    inspection_frequency: agreement.inspection_frequency || "",
    visit_duration: servicePackage.visit_duration || "",
    default_visit_type: servicePackage.default_visit_type || "",
    agreed_price:
      typeof agreement.agreed_price === "number"
        ? agreement.agreed_price.toFixed(2)
        : "",
    billing_frequency: agreement.billing_type || "",
    vat_wording: renderVatWording(servicePackage.vat_setting, vatRate),
    hourly_charge: renderOptionalCharge(servicePackage.hourly_charge, "quoted"),
    travel_charge: renderOptionalCharge(servicePackage.travel_charge, "quoted"),
    emergency_surcharge: renderOptionalCharge(
      servicePackage.emergency_surcharge,
      "quoted"
    ),
    start_date: agreement.start_date || "",
    renewal_date: agreement.renewal_date || "",
    next_invoice_date: agreement.next_invoice_date || "",
    additional_terms: agreement.additional_terms || "",
    emergency_authorization: agreement.emergency_authorization || "",
    emergency_max_amount: renderEmergencyMaxAmount(agreement.emergency_max_amount),
    emergency_unreachable_instructions:
      agreement.emergency_unreachable_instructions || "",
    agreement_version: String(agreement.agreement_version ?? 1),
    terms_version: String(template.version ?? ""),
  };

  // Defense in depth: strip any secret key that somehow landed in fields.
  for (const key of SECRET_FIELDS) {
    if (key in fields) fields[key] = undefined;
  }

  const resolvedSections = resolveSections(template.body || [], fields);

  return {
    agreement_version: agreement.agreement_version ?? 1,
    terms_template_id: template.id || "",
    terms_version: String(template.version ?? ""),
    language: template.language || "English",
    business_identity: {
      name: fields.business_name,
      owner_name: fields.business_owner_name,
      address: fields.business_address,
      phone: fields.business_phone,
      whatsapp: fields.business_whatsapp,
      email: fields.business_email,
    },
    customer: {
      full_name: fields.customer_full_name,
      email: fields.customer_email,
    },
    property: {
      name: fields.property_name,
      address: fields.property_address,
      type: fields.property_type,
    },
    service: {
      package_name: fields.service_package_name,
      description: fields.service_description,
      included_services: fields.included_services,
      inspection_frequency: fields.inspection_frequency,
      visit_duration: fields.visit_duration,
      default_visit_type: fields.default_visit_type,
    },
    fees: {
      agreed_price: fields.agreed_price,
      billing_frequency: fields.billing_frequency,
      vat_wording: fields.vat_wording,
      hourly_charge: fields.hourly_charge,
      travel_charge: fields.travel_charge,
      emergency_surcharge: fields.emergency_surcharge,
    },
    schedule: {
      start_date: fields.start_date,
      renewal_date: fields.renewal_date,
      next_invoice_date: fields.next_invoice_date,
    },
    emergency_authorization: {
      text: fields.emergency_authorization,
      max_amount: fields.emergency_max_amount,
      unreachable_instructions: fields.emergency_unreachable_instructions,
    },
    additional_terms: fields.additional_terms,
    sections: resolvedSections,
  };
}

/**
 * Deterministic canonical JSON for hashing.
 * Removes undefined values and sorts object keys recursively, so key ordering
 * never creates false hash differences.
 */
export function canonicalize(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  if (typeof obj === "object") {
    const out = {};
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        const v = obj[k];
        if (v === undefined) return;
        out[k] = canonicalize(v);
      });
    return out;
  }
  return obj;
}

/**
 * SHA-256 hash of the canonical snapshot (Web Crypto, async). Returns hex.
 * Same canonical content always produces the same hash.
 */
export async function snapshotHash(snapshot) {
  const canonical = canonicalize(snapshot);
  const text = JSON.stringify(canonical);
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Defensive secret scan: returns the list of property secret field keys whose
 * non-empty values appear anywhere in the serialized snapshot. Empty array =
 * clean. Used by the backend before freezing — any leak aborts the send.
 * @param {object} snapshot
 * @param {object} property
 * @returns {string[]}
 */
export function scanSnapshotForSecrets(snapshot, property) {
  const text = JSON.stringify(snapshot || {});
  const leaked = [];
  for (const key of SECRET_FIELDS) {
    const val = property && property[key];
    if (val !== undefined && val !== null && String(val).trim() && text.includes(String(val).trim())) {
      leaked.push(key);
    }
  }
  return leaked;
}

/**
 * Generate a cryptographically strong, unpredictable public token (64 hex chars
 * from 32 random bytes). Never derives from ids/sequentials.
 * Uses global crypto.getRandomValues (browser, Deno, Workers, Node 18+).
 * @returns {string}
 */
export function generatePublicToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}