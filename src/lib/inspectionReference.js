import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";
import { EXACT_EL, RULES_EL } from "@/lib/inspectionReferenceEl";

// Display-only reference descriptions for the dictation recording screen.
// PURE PRESENTATION: nothing here reads or writes checklist statuses, notes,
// completion state, or any inspection/visit record — it only derives short
// guidance text from the checklist item's TITLE for the staff member to read
// while dictating.

// 1) EXACT matches for known built-in checklist items (lowercase, cleaned
// title). Wording stays strictly within property-care / home-watch scope:
// visual and operational checks only — never structural, electrical,
// plumbing, engineering, code-compliance or licensed-inspection language.
const EXACT = {
  // — General watch checks —
  "gates": "Open gates if accessible, and look for visible damage, leaning, rust, or anything unusual.",
  "fences": "Look along accessible fence lines for obvious damage, leaning sections, or gaps, and note anything unusual.",
  "doors": "Check that accessible doors appear closed, secure, and free from obvious damage.",
  "windows": "Check that accessible windows appear closed and secure, and note any obvious damage.",
  "shutters": "Check that shutters appear closed or positioned as agreed, and note any obvious damage.",
  "roof": "Look from the ground for obvious missing tiles, debris, sagging, or anything unusual overhead — no climbing required.",
  "balconies": "Check the surface is clear of debris and note anything unusual with tiles, railings, or furniture.",
  "exterior walls": "Look for obvious cracks, stains, peeling paint, or anything unusual on exterior walls.",
  "drainage": "Look for obvious blockages, overflow marks, or debris in drains, gutters, and downspouts.",
  "storm damage": "Look for obvious storm damage, scattered debris, or anything unusual after recent weather.",
  "signs of forced entry": "Look for visible damage, tampering, or signs of unauthorized entry around doors, windows, and gates.",
  "water leaks": "Look for staining, puddles, dampness, or visible signs of water intrusion.",
  "humidity": "Look for condensation, damp surfaces, or musty smells that suggest excess moisture.",
  "mold": "Look for visible mold spots or discoloration on walls, ceilings, and around windows.",
  "unusual odors": "Note any unexpected smells — musty, gas-like, smoke, or rot — and where they seem strongest.",
  "electrical supply": "Confirm lights and outlets appear to work normally in ordinary use — no technical testing.",
  "lights": "Operate selected lights and confirm they appear to work.",
  "outdoor lighting": "Check that exterior lights appear in place and working, and note any that are out.",
  "air conditioning": "Operate agreed units briefly and confirm they start, cool, and appear in good order.",
  "heating": "Operate the heating briefly if applicable and confirm it appears to warm normally.",
  "hot water": "Run a hot tap briefly and confirm hot water arrives as expected.",
  "water heater": "Confirm the water heater appears intact, with no visible leaks, rust, or staining around it.",
  "check water heater": "Confirm the water heater appears intact, with no visible leaks, rust, or staining around it.",
  "appliances": "Confirm accessible appliances appear in place and operate normally — no technical servicing.",
  "internet": "Confirm the router and equipment appear powered, and check Wi-Fi works on your phone.",
  "security system": "Confirm the alarm panel appears powered and note any warning lights or unusual messages.",
  "insects or pests": "Look for obvious signs of insects, rodents, or droppings, and note where activity is found.",
  "cleanliness": "Check for visible dirt, dust, or clutter, and note the general level of cleanliness.",
  "general condition": "Note the overall condition and anything that changed since the last visit.",
  "electricity meter": "Read the electricity meter if accessible, note the value, and confirm the installation appears intact.",
  "water meter": "Read the water meter if accessible, note the value, and confirm the installation appears intact.",
  "water pressure": "Run a tap briefly and confirm the pressure appears normal throughout.",
  // — Pool / garden —
  "pool water level": "Check the water level is within its normal range and note anything unusual.",
  "pool clarity": "Look at the water color and clarity, and note anything unusual.",
  "pool equipment": "Visually observe the pool equipment while it runs for obvious leaks, noise, or damage — no servicing.",
  "check pool": "Look at the pool overall — water level, clarity, equipment — and note anything unusual.",
  "start pool system": "Start the pool system as agreed and confirm it runs without obvious leaks or unusual noise.",
  "garden condition": "Walk the garden and look for wilting, debris, broken sprinkler heads, or anything unusual.",
  "check garden": "Walk the garden and look for wilting, debris, broken sprinkler heads, or anything unusual.",
  "irrigation": "Confirm the irrigation runs as agreed and look for broken heads or obvious leaks.",
  "start irrigation": "Start the system as agreed and check each zone runs without obvious leaks or blockages.",
  // — Operational / seasonal —
  "check air conditioning": "Operate agreed units briefly and confirm they start, cool, and appear in good order.",
  "test ac units": "Operate agreed units briefly and confirm they start and cool normally.",
  "briefly operate agreed ac units": "Operate agreed units briefly and confirm they start and cool normally.",
  "start air conditioning": "Start the agreed AC units and confirm they begin cooling normally.",
  "set ac to frost protection": "Set the agreed AC units to frost protection mode and confirm the setting on the display.",
  "check appliances": "Confirm accessible appliances appear in place and operate normally — no technical servicing.",
  "check refrigerator": "Confirm the refrigerator/freezer appears operational and items needing cold storage are stored correctly.",
  "check whether agreed refrigerator/freezer or other agreed appliances appear to operate": "Confirm the agreed appliances appear to operate normally — no technical servicing.",
  "check wi-fi": "Confirm the Wi-Fi network works on your phone and note the signal where applicable.",
  "check alarm": "Confirm the alarm panel appears powered and note any warning lights or unusual messages.",
  "test security system": "Confirm the alarm panel appears powered and note any warning lights or unusual messages.",
  "operate selected lights": "Operate the selected lights and confirm they appear to work.",
  "test lights": "Operate the selected lights and confirm they appear to work.",
  "turn on electricity": "Turn on the electricity as agreed and confirm lights and outlets respond.",
  "turn on main water": "Open the main water valve slowly and confirm there are no obvious leaks.",
  "turn on water": "Open the main water valve slowly and confirm there are no obvious leaks.",
  "turn off water": "Close the main water valve as agreed and confirm no taps run.",
  "turn off selected utilities": "Turn off the agreed utilities and confirm they are off before leaving.",
  "turn on hot water": "Turn on the hot water system as agreed and confirm hot water arrives at a tap.",
  "empty refrigerator": "Empty and unplug the refrigerator/freezer as agreed, and leave it clean and open to air.",
  "flush agreed/selected toilets": "Flush the agreed toilets and confirm they fill and flush normally.",
  "run agreed/selected faucets": "Run the agreed faucets briefly and confirm water flows and drains normally.",
  "drain pipes if needed": "Drain the agreed pipes as needed for cold weather, and confirm water is off to them.",
  "visual checks under accessible sinks": "Look under accessible sinks for visible moisture, dripping, staining, odors, or cabinet damage.",
  "visual checks under accessible sinks for obvious leaks": "Look under accessible sinks for visible moisture, dripping, staining, odors, or cabinet damage.",
  "confirm keys": "Confirm keys are with the agreed person or lockbox, and record where they were left.",
  "record keys": "Confirm keys are with the agreed person or lockbox, and record where they were left.",
  "leave keys with caretaker": "Confirm the keys were left with the agreed caretaker, and record the handover.",
  "lock all doors and gates": "Lock all doors and gates and confirm they are secured before leaving.",
  "secure doors and gates": "Lock all doors and gates and confirm they are secured before leaving.",
  "close windows and shutters": "Close all windows and shutters and confirm they are shut securely.",
  "close shutters": "Close all shutters and confirm they are shut securely.",
  "secure outdoor furniture": "Store or secure outdoor furniture against wind or weather as agreed.",
  "confirm property is secured before leaving": "Do a final round: doors, windows, gates, and alarms all secured before you leave.",
  "open and air out property": "Open windows to air the property and confirm it is fresh for arrival.",
  "clean and air property": "Open windows to air the property and confirm it is clean and fresh for arrival.",
  "prepare linens": "Prepare beds and towels with fresh linens as agreed for arrival.",
  "place welcome items": "Set out the agreed welcome items in their planned locations.",
  "confirm cleaning": "Walk the property and confirm the agreed cleaning was completed to standard.",
  "remove rubbish": "Remove rubbish and recycling as agreed and leave the bins tidy.",
  "confirm electricity appears available where reasonably observable": "Confirm lights and outlets respond where reasonably observable — no technical testing.",
  "electricity appears available where reasonably observable": "Confirm lights and outlets respond where reasonably observable — no technical testing.",
  "check property after departure": "After the departure, check the property is in good order and secured.",
  // — Grocery Stocking —
  "confirm owner shopping list and budget": "Review requested items, quantities, preferred brands or substitutions, and the owner's spending limit.",
  "purchase requested groceries": "Confirm the requested items were purchased, quantities are correct, and substitutions or unavailable items are noted.",
  "deliver groceries to the property": "Put groceries in the appropriate refrigerator, freezer, pantry, or requested location, and confirm perishables are stored correctly.",
  "record grocery cost and attach receipt photo": "Record the actual grocery cost and attach a clear photo of the receipt.",
  "put away / stock basics": "Stock the agreed basics in their usual places and confirm they are stored correctly.",
  "send owner update with photos": "Confirm the owner receives the completion update with photos, substitutions, receipts, or concerns when applicable.",
  // — Visual walk-throughs —
  "quick exterior walk-around": "Walk around the exterior and look for visible damage, debris, water issues, or anything noticeably different.",
  "more complete exterior visual check": "Walk around the exterior and look for visible damage, debris, water issues, or anything noticeably different.",
  "more detailed exterior visual review": "Walk around the exterior and look closely for damage, debris, water issues, or anything noticeably different.",
  "quick interior walk-through": "Walk through the interior and look for damage, moisture, odors, or anything noticeably different.",
  "more complete interior visual walk-through": "Walk through the interior and look for damage, moisture, odors, or anything noticeably different.",
  "more detailed interior visual review": "Walk through the interior and look closely for damage, moisture, odors, or anything noticeably different.",
  "quick visual check of grounds/balconies": "Look over the grounds and balconies for debris, damage, or anything unusual.",
  "grounds/balconies visual condition": "Look over the grounds and balconies for debris, damage, or anything unusual.",
  "detailed grounds/balcony visual condition": "Check the grounds and balconies closely for damage, debris, or anything unusual.",
  "quick visual check of pool condition where applicable": "Glance over the pool — water level, clarity, obvious debris — and note anything unusual.",
  "pool visual condition where applicable": "Look at the pool area overall — water, tiles, equipment — and note anything unusual.",
  "detailed pool visual condition where applicable": "Check the pool closely — water, tiles, equipment — and note anything unusual.",
  "visually observe pool equipment condition": "Look at the pool equipment for obvious leaks, noise, or damage while it runs — no servicing.",
  "doors/gates/windows visibly secure": "Confirm doors, gates, and windows are closed, locked, and show no signs of tampering.",
  "inspect bathrooms": "Walk the bathrooms and look for leaks, damage, odors, or anything unusual.",
  "inspect bedrooms": "Walk the bedrooms and look for damage, odors, damp, or anything unusual.",
  "inspect for damage": "Walk the property and look for obvious damage or anything unusual — nothing technical.",
  "inspect for winter damage": "Look for obvious winter damage — burst lines, storm debris, cracked tiles — and note what you find.",
  "look for obvious damage or vandalism": "Walk the property and look for obvious damage or vandalism — nothing technical.",
  "look for obvious damage/vandalism": "Walk the property and look for obvious damage or vandalism — nothing technical.",
  "damage/vandalism observations": "Note any damage or vandalism found, with photos where possible.",
  "look for visible water/leaks": "Look for staining, puddles, dampness, or visible signs of water intrusion.",
  "look for obvious visible water/leaks": "Look for staining, puddles, dampness, or visible signs of water intrusion.",
  "visible water/leak observations": "Look for staining, puddles, dampness, or visible signs of water intrusion.",
  "visible moisture/mold observations": "Look for visible moisture, staining, or mold on walls, ceilings, and around windows.",
  "observe obvious moisture/water intrusion encountered during walk-through": "As you walk through, look for obvious moisture, staining, or water intrusion and note where it is found.",
  "look for obvious pest activity": "Look for obvious signs of insects, rodents, or droppings, and note where activity is found.",
  "look for pest concerns/signs": "Look for obvious signs of insects, rodents, or droppings, and note where activity is found.",
  "pest concerns/signs": "Look for obvious signs of insects, rodents, or droppings, and note where activity is found.",
  // — Photos / documentation / reporting —
  "take final photos": "Take clear photos showing the completed service for the owner.",
  "final photo": "Take a final photo of the completed visit as agreed.",
  "routine property photos": "Take the agreed routine photos of key areas for the owner's records.",
  "more detailed photo documentation": "Photograph each area thoroughly so the owner can see the condition found.",
  "photos of progress": "Photograph the work observed so the owner can follow the progress.",
  "problem photographs when applicable": "When a problem is found, photograph it clearly so the owner can see what you saw.",
  "take photos of a problem when a problem is discovered": "When a problem is found, photograph it clearly so the owner can see what you saw.",
  "notify owner if a concerning problem is discovered": "If something concerning is found, notify the owner through the agreed channel and record it.",
  "owner notification when necessary": "Notify the owner through the agreed channel when the situation calls for it, and record what was sent.",
  "written visit report": "Complete the written report of what was observed and done during this visit.",
  "detailed written visit report": "Complete a detailed written report of what was observed and done during this visit.",
  "documentation of concerns": "Document any concerns clearly — what was found, where, and what you recommend.",
  "record arrival time and site access": "Record when you arrived and how you accessed the property.",
  "record departure time": "Record when you left the property.",
  "owner-selected monitoring priorities": "Check each owner-selected priority area and note its condition.",
  "expanded owner-selected monitoring priorities": "Check each owner-selected priority area and note its condition in detail.",
  "give priority attention/assistance to identified concerns": "Give the agreed priority attention to the identified concern areas and note what was done.",
  "recheck previously identified concerns": "Recheck each previously identified concern and note whether it is unchanged, better, or worse.",
  "track unresolved concerns": "Note any concern that is still unresolved and what the next step is.",
  "questions for owner decision": "Note any questions that need the owner's decision.",
  // — Owner-rep construction visits —
  "work expected": "Note what work was expected at this point per the project plan.",
  "work observed": "Note what work is actually visible on site, compared to what was expected.",
  "workmanship concerns": "Note any visible concerns about how the finished work looks — finish, alignment, materials. Nothing technical.",
  "incomplete work": "Note work that appears incomplete or paused, and anything that could cause delay.",
  "materials delivered": "Note the materials on site, their condition, and whether they match what was planned.",
  "contractors present": "Note which contractors were on site, what they were doing, and the site conditions.",
};

// 2) Ordered keyword rules for custom / property-specific items and the long
// onboarding item names. Same property-care scope as the exact matches.
const RULES = [
  [/shopping list|budget/i,
    "Review requested items, quantities, preferred brands or substitutions, and the owner's spending limit."],
  [/grocer|supermarket|purchas/i,
    "Confirm the requested items were purchased, quantities are correct, and substitutions or unavailable items are noted."],
  [/deliver groceries|stocking|stock basics|put away/i,
    "Put groceries or agreed items in the appropriate refrigerator, freezer, pantry, or requested location, and confirm perishables are stored correctly."],
  [/receipt|grocery cost/i,
    "Record the actual cost and attach a clear photo of the receipt."],
  [/refrigerator|freezer|fridge/i,
    "Confirm the refrigerator/freezer appears operational and items needing cold storage are stored correctly."],
  [/gate|entrance|entry|driveway/i,
    "Look for visible damage, debris, water issues, signs of unauthorized entry, or anything noticeably different around the entrance."],
  [/fence/i,
    "Look along accessible fence lines for obvious damage, leaning sections, or gaps, and note anything unusual."],
  [/door|lock|key/i,
    "Check that accessible doors appear closed, secure, and free from obvious damage."],
  [/window|shutter/i,
    "Check that accessible windows and shutters appear closed and secure, and note any obvious damage."],
  [/roof|ceiling stain/i,
    "Look from the ground for obvious missing tiles, debris, sagging, or anything unusual overhead — no climbing required."],
  [/water leak|leak|flood|puddle|under (accessible )?sink|humid|damp|moist|mold|mould|odor|odour|smell/i,
    "Look for staining, puddles, dampness, unusual odors, or visible signs of water intrusion."],
  [/storm|hail|winter damage/i,
    "Look for obvious storm damage, scattered debris, or anything unusual after recent weather."],
  [/meter|reading/i,
    "Read the meter if accessible, note the value, and confirm the installation appears intact."],
  [/electric|power|light|lamp/i,
    "Confirm lights and outlets appear to work normally in ordinary use — no technical testing."],
  [/air ?con|cooling|hvac|heating|boiler|radiator|frost protection/i,
    "Operate the agreed unit briefly and confirm it appears to work normally — no technical servicing."],
  [/appliance|fridge|oven|washer|dishwasher|washing machine/i,
    "Confirm accessible appliances appear in place and operate normally — no technical servicing."],
  [/internet|wi-?fi|router|network/i,
    "Confirm the equipment appears powered and the connection works on your phone."],
  [/pool|spa|jacuzzi/i,
    "Check the water level and look for debris, discoloration, or anything unusual in and around the pool."],
  [/garden|plant|lawn|grass|irrigation|sprinkler|tree|hedge/i,
    "Look for obvious wilting, debris, broken sprinkler heads, or anything unusual in the garden."],
  [/pest|insect|rodent|dropping|ant|wasp|mouse|rat/i,
    "Look for obvious signs of insects, rodents, or droppings, and note where activity is found."],
  [/clean|tidy|dirt|clutter|bin|trash|rubbish|garbage|mail|post/i,
    "Check for visible dirt, clutter, or collected mail and debris, and note the general level of cleanliness."],
  [/secur|alarm|camera|forced entry|break-?in|vandal/i,
    "Look for visible damage, tampering, or signs of unauthorized entry around entrances, windows, and equipment."],
  [/balcon|terrace|patio|deck|furniture|outdoor/i,
    "Check the surface is clear of debris and note anything unusual with furniture, railings, or tiles."],
  [/drain|gutter|septic|tank|well|pump|faucet|toilet/i,
    "Look for obvious blockages, leaks, or anything unusual around drains, tanks, pumps, and fixtures."],
  [/wall|paint|crack|floor|tile/i,
    "Look for obvious cracks, stains, peeling paint, or anything unusual on accessible surfaces."],
  [/shut ?off|shutoff|utilit|provider|account/i,
    "Confirm the agreed utilities are on or off as requested, and note anything unusual with providers or shutoffs."],
  [/photo|picture|baseline/i,
    "Take or review the reference photos, and note anything unusual for the record."],
  [/send owner|owner update|notify|notification|report/i,
    "Confirm the owner receives the update with what was done, substitutions, receipts, or concerns when applicable."],
  [/emergency|contact|instruction|monitoring|onboard/i,
    "Confirm the owner's instructions and selections were reviewed, and note anything still open."],
  [/follow-?up|concern|question|summary|starting condition|general condition|overall/i,
    "Note the condition found, anything that changed, and what still needs the owner's attention."],
];

// All-caps category prefix used in templates (e.g. "ONBOARDING · ") is
// display noise in the reference guide — stripped for display only.
const cleanTitle = (name) => {
  const cleaned = String(name || "").replace(/^\s*[A-Z][A-Z\s&/()'-]{1,25}·\s*/, "").trim();
  return cleaned || String(name || "");
};

// Prefer an existing description/help/instructions field on the item when one
// is present — user-authored text is shown exactly as authored in BOTH
// languages (there is no Greek field or translation helper for custom
// checklist text, and none is invented here). Otherwise match the cleaned
// title against the exact map, then the keyword rules; the last resort
// references the item title itself. With lang = "el" the Greek twins of the
// built-in descriptions, keyword rules and fallback are shown; English
// fallbacks appear only where no Greek version exists (e.g. custom items
// matched by no rule cannot be auto-translated).
export function referenceDescriptionFor(item, lang = "en") {
  const existing = [item?.description, item?.help_text, item?.instructions]
    .map((s) => (s || "").trim())
    .find(Boolean);
  if (existing) return existing;
  const name = typeof item === "string" ? item : item?.name || "";
  const key = cleanTitle(name).toLowerCase().replace(/\s+/g, " ").trim();
  if (lang === "el" && EXACT_EL[key]) return EXACT_EL[key];
  if (EXACT[key]) return EXACT[key];
  const idx = RULES.findIndex(([re]) => re.test(name));
  if (idx >= 0) {
    if (lang === "el" && RULES_EL[idx]) return RULES_EL[idx];
    return RULES[idx][1];
  }
  const title = cleanTitle(name);
  if (lang === "el") {
    const displayTitle = checklistItemDisplay(title, "el") || title;
    return displayTitle
      ? `Εργαστείτε στο «${displayTitle}» όπως συμφωνήθηκε για αυτή την επίσκεψη, και σημειώστε οτιδήποτε ξεχωρίζει ή χρειάζεται ακόμη την προσοχή του ιδιοκτήτη.`
      : "Εργαστείτε σε αυτό το σημείο όπως συμφωνήθηκε για αυτή την επίσκεψη, και σημειώστε οτιδήποτε ξεχωρίζει ή χρειάζεται ακόμη την προσοχή του ιδιοκτήτη.";
  }
  return title
    ? `Work through “${title}” as agreed for this visit, and note anything that stands out or still needs the owner's attention.`
    : "Work through this item as agreed for this visit, and note anything that stands out or still needs the owner's attention.";
}

// Build the full read-only reference list from the SAME checklist the
// inspection/visit workflow passed in — no re-fetching, no template changes.
export function referenceItemsFromChecklist(checklist, lang) {
  return (checklist || []).map((it) => {
    const item = typeof it === "string" ? { name: it } : it || {};
    return {
      title: checklistItemDisplay(cleanTitle(item.name), lang) || item.name,
      description: referenceDescriptionFor(item, lang),
    };
  });
}