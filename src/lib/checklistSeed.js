// Built-in default checklist items per visit type.
// Shared between ChecklistTemplates (seed/restore) and VisitWizard (fallback when no template record exists).
export const SEED = {
  "Monthly Property Watch": ["Gates","Fences","Doors","Windows","Shutters","Roof","Balconies","Exterior walls","Drainage","Storm damage","Signs of forced entry","Water leaks","Humidity","Mold","Unusual odors","Electrical supply","Lights","Air conditioning","Heating","Appliances","Internet","Security system","Insects or pests","Cleanliness","General condition","Pool water level","Pool clarity","Pool equipment","Irrigation","Garden condition","Outdoor lighting","Electricity meter","Water meter","Water pressure","Hot water"],
  "Owner Arrival Preparation": ["Open and air out property","Turn on electricity","Turn on water","Turn on hot water","Start air conditioning","Check refrigerator","Check Wi-Fi","Test lights","Inspect bathrooms","Inspect bedrooms","Prepare linens","Confirm cleaning","Check pool","Check garden","Buy groceries","Place welcome items","Confirm keys","Final photo"],
  "Guest Arrival Preparation": ["Open and air out property","Turn on electricity","Turn on water","Turn on hot water","Start air conditioning","Check refrigerator","Check Wi-Fi","Test lights","Inspect bathrooms","Inspect bedrooms","Prepare linens","Confirm cleaning","Check pool","Check garden","Place welcome items","Confirm keys","Final photo"],
  "Departure Inspection": ["Check property after departure","Close windows and shutters","Turn off selected utilities","Check air conditioning","Remove rubbish","Check refrigerator","Confirm cleaning","Inspect for damage","Secure doors and gates","Check alarm","Record keys","Take final photos"],
  "Seasonal Opening": ["Turn on main water","Turn on electricity","Check water heater","Start pool system","Start irrigation","Test AC units","Check appliances","Inspect for winter damage","Clean and air property","Test security system"],
  "Seasonal Closing": ["Drain pipes if needed","Turn off water","Set AC to frost protection","Close shutters","Lock all doors and gates","Empty refrigerator","Secure outdoor furniture","Check alarm","Leave keys with caretaker"],
  "Owner Representative Construction Visit": ["Record arrival time and site access","Contractors present","Materials delivered","Work expected","Work observed","Workmanship concerns","Incomplete work","Photos of progress","Questions for owner decision","Record departure time"],
};

export const VISIT_TYPES = [
  "Monthly Property Watch", "Owner Arrival Preparation", "Guest Arrival Preparation",
  "Departure Inspection", "Seasonal Opening", "Seasonal Closing", "Owner Representative Construction Visit",
  "Home Watch Inspection", "Property Care Inspection", "Emergency Visit", "Owner Representative Site Visit",
];