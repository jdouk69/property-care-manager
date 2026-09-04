// Built-in default checklist items per visit type.
// Shared between ChecklistTemplates (seed/restore) and VisitWizard (fallback when no template record exists).
// CORE FALLBACK SAFETY: the two core visit types (Home Watch Inspection,
// Property Care Inspection) ALWAYS have a built-in fallback here — if their
// master template is ever missing or archived, a new visit can never silently
// start with an empty checklist. These mirror the approved master templates:
// Home Watch = the finalized 7-item visual checklist; Property Care = the
// approved 35-item checklist. (The old 31-item Basic list and the archived
// 35-item Monthly Property Watch list are intentionally NOT restored.)
export const SEED = {
  "Monthly Property Watch": ["Gates","Fences","Doors","Windows","Shutters","Roof","Balconies","Exterior walls","Drainage","Storm damage","Signs of forced entry","Water leaks","Humidity","Mold","Unusual odors","Electrical supply","Lights","Air conditioning","Heating","Appliances","Internet","Security system","Insects or pests","Cleanliness","General condition","Pool water level","Pool clarity","Pool equipment","Irrigation","Garden condition","Outdoor lighting","Electricity meter","Water meter","Water pressure","Hot water"],
  "Owner Arrival Preparation": ["Open and air out property","Turn on electricity","Turn on water","Turn on hot water","Start air conditioning","Check refrigerator","Check Wi-Fi","Test lights","Inspect bathrooms","Inspect bedrooms","Prepare linens","Confirm cleaning","Check pool","Check garden","Place welcome items","Confirm keys","Final photo"],
  "Guest Arrival Preparation": ["Open and air out property","Turn on electricity","Turn on water","Turn on hot water","Start air conditioning","Check refrigerator","Check Wi-Fi","Test lights","Inspect bathrooms","Inspect bedrooms","Prepare linens","Confirm cleaning","Check pool","Check garden","Place welcome items","Confirm keys","Final photo"],
  "Departure Inspection": ["Check property after departure","Close windows and shutters","Turn off selected utilities","Check air conditioning","Remove rubbish","Check refrigerator","Confirm cleaning","Inspect for damage","Secure doors and gates","Check alarm","Record keys","Take final photos"],
  "Seasonal Opening": ["Turn on main water","Turn on electricity","Check water heater","Start pool system","Start irrigation","Test AC units","Check appliances","Inspect for winter damage","Clean and air property","Test security system"],
  "Seasonal Closing": ["Drain pipes if needed","Turn off water","Set AC to frost protection","Close shutters","Lock all doors and gates","Empty refrigerator","Secure outdoor furniture","Check alarm","Leave keys with caretaker"],
  "Owner Representative Construction Visit": ["Record arrival time and site access","Contractors present","Materials delivered","Work expected","Work observed","Workmanship concerns","Incomplete work","Photos of progress","Questions for owner decision","Record departure time"],
  "Home Watch Inspection": ["Exterior — obvious leaks or water issues (pooling, drips, outdoor plumbing)","Visible moisture, dampness or humidity concerns","Obvious visible damage — walls, roof, terrace, gates, fences","Obvious signs of forced entry or security concerns","Doors — visibly open, damaged or broken; locks intact","Windows and shutters — visibly open, damaged or broken","Other clearly unusual conditions (odors, pests, storm debris, mail buildup)"],
  "Property Care Inspection": ["Exterior condition","Gates and fences","Doors and locks","Windows","Shutters","Security systems","Exterior lighting","Roof / visible exterior damage","Water leaks","Visible leaks / plumbing concerns","Electrical power","Electrical supply appears on","Air conditioning / heating","Humidity / dampness","Mold / odors","Ceilings","Walls","Floors","Kitchen","Appliances","Bathrooms","Water pressure","Hot water","Pool condition","Pool visible condition / water level","Garden / landscaping","Irrigation","Pest activity","Cleaning condition","Maintenance items","Contractor work requiring follow-up","Meter readings","General property condition","Photos / documentation","Owner update required"],
  "Grocery Stocking": ["Confirm owner shopping list and budget","Purchase requested groceries","Deliver groceries to the property","Put away / stock basics","Record grocery cost and attach receipt photo","Send owner update with photos"],
};

export const VISIT_TYPES = [
  "Monthly Property Watch", "Owner Arrival Preparation", "Guest Arrival Preparation",
  "Departure Inspection", "Seasonal Opening", "Seasonal Closing", "Owner Representative Construction Visit",
  "Home Watch Inspection", "Property Care Inspection", "Emergency Visit", "Owner Representative Site Visit",
  "Initial Property Onboarding Inspection", "Grocery Stocking",
];