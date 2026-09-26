import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";

// Display-only reference descriptions for the dictation recording screen.
// PURE PRESENTATION: nothing here reads or writes checklist statuses, notes,
// completion state, or any inspection/visit record — it only derives short
// guidance text from the checklist item's TITLE for the staff member to read
// while dictating.

// Ordered keyword rules. Wording stays strictly within property-care /
// home-watch scope: visual and operational checks only — never structural,
// electrical, plumbing, engineering, code-compliance or licensed-inspection
// language.
const RULES = [
  [/gate|entrance|entry|driveway/i,
    "Look for visible damage, debris, signs of forced entry, water issues, or anything unusual around the entrance."],
  [/fence/i,
    "Look along accessible fence lines for obvious damage, leaning sections, or anything unusual."],
  [/door|lock|key|access|shut ?off|shutoff/i,
    "Check that accessible doors and windows appear secure, closed properly, and show no obvious damage."],
  [/window|shutter|pergol/i,
    "Check that accessible windows and shutters appear closed and secure, and note any obvious damage or anything unusual."],
  [/roof|ceiling/i,
    "Look from the ground for obvious missing tiles, debris, sagging, or anything unusual overhead — no climbing required."],
  [/water leak|leak|flood|puddle|humid|damp|moist|mold|mould|odor|odour|smell/i,
    "Look for staining, puddles, dampness, unusual odors, or visible signs of water intrusion."],
  [/storm|hail|wind damage/i,
    "Look for obvious storm damage, scattered debris, or anything unusual after recent weather."],
  [/meter|reading/i,
    "Read the meter if accessible, note the value, and confirm the installation appears intact."],
  [/electr|power|light|lamp/i,
    "Confirm the supply and lights appear to work normally, and note anything unusual — no technical testing."],
  [/air ?con|cooling|hvac|heating|boiler|radiator/i,
    "Confirm the unit appears intact and clean around it, and note anything unusual — no technical servicing."],
  [/appliance|fridge|freezer|oven|washer|dishwasher|washing machine/i,
    "Confirm accessible appliances appear in place and working normally, and note anything unusual."],
  [/internet|wi-?fi|router|network|tv/i,
    "Confirm the equipment appears powered and in place, and note anything unusual."],
  [/pool|spa|jacuzzi/i,
    "Check the water level and look for debris, discoloration, or anything unusual in and around the pool."],
  [/garden|plant|lawn|grass|irrigation|sprinkler|tree|hedge/i,
    "Look for obvious wilting, debris, broken sprinkler heads, or anything unusual in the garden."],
  [/pest|insect|rodent|dropping|ant|wasp|mouse|rat/i,
    "Look for obvious signs of insects, rodents, or droppings, and note anything unusual."],
  [/clean|tidy|dirt|clutter|bin|trash|rubbish|garbage|mail|post/i,
    "Check for visible dirt, clutter, or collected mail and debris, and note the general level of cleanliness."],
  [/secur|alarm|camera|forced entry|break-?in/i,
    "Look for visible damage, tampering, or signs of forced entry around entrances, windows and equipment."],
  [/balcon|terrace|patio|deck|furniture|outdoor/i,
    "Check the surface is clear of debris and note anything unusual with furniture, railings or tiles."],
  [/drain|gutter|septic|tank|well|pump/i,
    "Look for obvious blockages, overflow marks, or anything unusual around drains, tanks and pumps."],
  [/wall|paint|crack|floor|tile|ceiling stain/i,
    "Look for obvious cracks, stains, peeling paint, or anything unusual on accessible surfaces."],
  [/utilit|provider|account|bill/i,
    "Confirm the provider details on file match what is found at the property, and note anything unusual."],
  [/emergency|contact|instruction|review|confirm|onboard|baseline|overall|general condition|starting condition|summary/i,
    "Confirm this was reviewed with the owner, and note anything unusual or still open."],
  [/photo|picture|document/i,
    "Take or review the reference photo, and note anything unusual for the record."],
];

// Fallback for items no rule matches — still safe, scope-appropriate wording.
const FALLBACK =
  "Note anything unusual and confirm it appears normal and well-kept.";

// All-caps category prefix used in templates (e.g. "ONBOARDING · ", "MONTHLY · ")
// is display noise in the reference guide — strip it for display only.
const cleanTitle = (name) => {
  const cleaned = String(name || "").replace(/^\s*[A-Z][A-Z\s&/()'-]{1,25}·\s*/, "").trim();
  return cleaned || String(name || "");
};

// Prefer an existing description/help/instructions field on the item when one
// is present; otherwise generate the display-only guidance from the title.
export function referenceDescriptionFor(item) {
  const existing = [item?.description, item?.help_text, item?.instructions]
    .map((s) => (s || "").trim())
    .find(Boolean);
  if (existing) return existing;
  const name = typeof item === "string" ? item : item?.name || "";
  const rule = RULES.find(([re]) => re.test(name));
  return rule ? rule[1] : FALLBACK;
}

// Build the full read-only reference list from the SAME checklist the
// inspection/visit workflow passed in — no re-fetching, no template changes.
export function referenceItemsFromChecklist(checklist, lang) {
  return (checklist || []).map((it) => {
    const item = typeof it === "string" ? { name: it } : it || {};
    return {
      title: checklistItemDisplay(cleanTitle(item.name), lang) || item.name,
      description: referenceDescriptionFor(item),
    };
  });
}