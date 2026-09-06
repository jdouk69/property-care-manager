// Display-only Greek labels for KNOWN BUILT-IN checklist items — the exact
// seeds in src/lib/checklistSeed.js. Keyed by the EXACT canonical English
// item name:
// - Exact match only: no fuzzy/partial matching, so custom or admin-edited
//   item names always fall back to the original text, unchanged.
// - Stored item names are NEVER modified: visit records, templates, tasks,
//   notifications and reports keep the original English text. This map only
//   affects what the staff member sees on the checklist execution screen.
// - Kept separate from the main t() dictionary because several seed names
//   ("Windows", "Kitchen", "Heating"…) are generic words that also appear as
//   UI strings elsewhere; a dedicated map avoids cross-context collisions.

export const CHECKLIST_ITEM_EL = {
  // Monthly Property Watch
  "Gates": "Πύλες",
  "Fences": "Φράχτες",
  "Doors": "Πόρτες",
  "Windows": "Παράθυρα",
  "Shutters": "Περσίδες",
  "Roof": "Σκεπή",
  "Balconies": "Μπαλκόνια",
  "Exterior walls": "Εξωτερικοί τοίχοι",
  "Drainage": "Αποχέτευση ομβρίων",
  "Storm damage": "Καταστροφές από καταιγίδα",
  "Signs of forced entry": "Σημάδια παραβίασης",
  "Water leaks": "Διαρροές νερού",
  "Humidity": "Υγρασία",
  "Mold": "Μούχλα",
  "Unusual odors": "Ασυνήθιστες οσμές",
  "Electrical supply": "Παροχή ρεύματος",
  "Lights": "Φωτισμός",
  "Air conditioning": "Κλιματισμός",
  "Heating": "Θέρμανση",
  "Appliances": "Ηλεκτρικές συσκευές",
  "Internet": "Διαδίκτυο",
  "Security system": "Σύστημα ασφαλείας",
  "Insects or pests": "Έντομα ή παράσιτα",
  "Cleanliness": "Καθαριότητα",
  "General condition": "Γενική κατάσταση",
  "Pool water level": "Στάθμη νερού πισίνας",
  "Pool clarity": "Διαύγεια νερού πισίνας",
  "Pool equipment": "Εξοπλισμός πισίνας",
  "Irrigation": "Άρδευση",
  "Garden condition": "Κατάσταση κήπου",
  "Outdoor lighting": "Εξωτερικός φωτισμός",
  "Electricity meter": "Μετρητής ρεύματος",
  "Water meter": "Μετρητής νερού",
  "Water pressure": "Πίεση νερού",
  "Hot water": "Ζεστό νερό",

  // Owner / Guest Arrival Preparation
  "Open and air out property": "Άνοιγμα και αερισμός ακινήτου",
  "Turn on electricity": "Ενεργοποίηση ρεύματος",
  "Turn on water": "Άνοιγμα νερού",
  "Turn on hot water": "Άνοιγμα ζεστού νερού",
  "Start air conditioning": "Εκκίνηση κλιματισμού",
  "Check refrigerator": "Έλεγχος ψυγείου",
  "Check Wi-Fi": "Έλεγχος Wi-Fi",
  "Test lights": "Δοκιμή φωτισμού",
  "Inspect bathrooms": "Επιθεώρηση μπάνιων",
  "Inspect bedrooms": "Επιθεώρηση υπνοδωματίων",
  "Prepare linens": "Προετοιμασία λευκών ειδών",
  "Confirm cleaning": "Επιβεβαίωση καθαρισμού",
  "Check pool": "Έλεγχος πισίνας",
  "Check garden": "Έλεγχος κήπου",
  "Place welcome items": "Τοποθέτηση ειδών υποδοχής",
  "Confirm keys": "Επιβεβαίωση κλειδιών",
  "Final photo": "Τελική φωτογραφία",

  // Departure Inspection
  "Check property after departure": "Έλεγχος ακινήτου μετά την αναχώρηση",
  "Close windows and shutters": "Κλείσιμο παραθύρων και περσίδων",
  "Turn off selected utilities": "Κλείσιμο επιλεγμένων παροχών",
  "Check air conditioning": "Έλεγχος κλιματισμού",
  "Remove rubbish": "Αφαίρεση απορριμμάτων",
  "Inspect for damage": "Επιθεώρηση για ζημιές",
  "Secure doors and gates": "Ασφάλιση πορτών και πυλών",
  "Check alarm": "Έλεγχος συναγερμού",
  "Record keys": "Καταγραφή κλειδιών",
  "Take final photos": "Λήψη τελικών φωτογραφιών",

  // Seasonal Opening
  "Turn on main water": "Άνοιγμα κεντρικού νερού",
  "Check water heater": "Έλεγχος θερμοσίφωνα",
  "Start pool system": "Εκκίνηση συστήματος πισίνας",
  "Start irrigation": "Εκκίνηση άρδευσης",
  "Test AC units": "Δοκιμή μονάδων κλιματισμού",
  "Check appliances": "Έλεγχος συσκευών",
  "Inspect for winter damage": "Επιθεώρηση για χειμερινές ζημιές",
  "Clean and air property": "Καθάρισμα και αερισμός ακινήτου",
  "Test security system": "Δοκιμή συστήματος ασφαλείας",

  // Seasonal Closing
  "Drain pipes if needed": "Αποστράγγιση σωληνώσεων αν χρειάζεται",
  "Turn off water": "Κλείσιμο νερού",
  "Set AC to frost protection": "Ρύθμιση κλιματισμού σε προστασία από παγετό",
  "Close shutters": "Κλείσιμο περσίδων",
  "Lock all doors and gates": "Κλείδωμα όλων των πορτών και πυλών",
  "Empty refrigerator": "Άδειασμα ψυγείου",
  "Secure outdoor furniture": "Ασφάλιση εξωτερικών επίπλων",
  "Leave keys with caretaker": "Παράδοση κλειδιών στον φροντιστή",

  // Owner Representative Construction Visit
  "Record arrival time and site access": "Καταγραφή ώρας άφιξης και πρόσβασης στον χώρο",
  "Contractors present": "Παρόντες εργολάβοι",
  "Materials delivered": "Παραδομένα υλικά",
  "Work expected": "Αναμενόμενες εργασίες",
  "Work observed": "Παρατηρούμενες εργασίες",
  "Workmanship concerns": "Παρατηρήσεις ποιότητας εργασιών",
  "Incomplete work": "Ημιτελείς εργασίες",
  "Photos of progress": "Φωτογραφίες προόδου",
  "Questions for owner decision": "Θέματα προς απόφαση ιδιοκτήτη",
  "Record departure time": "Καταγραφή ώρας αναχώρησης",

  // Home Watch Inspection
  "Exterior — obvious leaks or water issues (pooling, drips, outdoor plumbing)":
    "Εξωτερικός χώρος — εμφανή σημεία διαρροής ή προβλήματα νερού (συσσώρευση, στάγδην, εξωτερικές υδραυλικές εγκαταστάσεις)",
  "Visible moisture, dampness or humidity concerns":
    "Ορατά προβλήματα υγρασίας ή συμπύκνωσης",
  "Obvious visible damage — walls, roof, terrace, gates, fences":
    "Εμφανείς ορατές ζημιές — τοίχοι, σκεπή, βεράντα, πύλες, φράχτες",
  "Obvious signs of forced entry or security concerns":
    "Εμφανή σημάδια παραβίασης ή ζητήματα ασφαλείας",
  "Doors — visibly open, damaged or broken; locks intact":
    "Πόρτες — εμφανώς ανοιχτές, κατεστραμμένες ή σπασμένες· κλειδαριές άθικτες",
  "Windows and shutters — visibly open, damaged or broken":
    "Παράθυρα και περσίδες — εμφανώς ανοιχτά, κατεστραμμένα ή σπασμένα",
  "Other clearly unusual conditions (odors, pests, storm debris, mail buildup)":
    "Λοιπες σαφώς ασυνήθιστες καταστάσεις (οσμές, παράσιτα, συντρίμμια καταιγίδας, συσσώρευση αλληλογραφίας)",

  // Property Care Inspection
  "Exterior condition": "Εξωτερική κατάσταση",
  "Gates and fences": "Πύλες και φράχτες",
  "Doors and locks": "Πόρτες και κλειδαριές",
  "Security systems": "Συστήματα ασφαλείας",
  "Exterior lighting": "Εξωτερικός φωτισμός",
  "Roof / visible exterior damage": "Σκεπή / ορατές εξωτερικές ζημιές",
  "Visible leaks / plumbing concerns": "Ορατές διαρροές / υδραυλικά ζητήματα",
  "Electrical power": "Ηλεκτρική ενέργεια",
  "Electrical supply appears on": "Η παροχή ρεύματος φαίνεται ενεργή",
  "Air conditioning / heating": "Κλιματισμός / θέρμανση",
  "Humidity / dampness": "Υγρασία / υγρές επιφάνειες",
  "Mold / odors": "Μούχλα / οσμές",
  "Ceilings": "Οροφές",
  "Walls": "Τοίχοι",
  "Floors": "Δάπεδα",
  "Kitchen": "Κουζίνα",
  "Bathrooms": "Μπάνια",
  "Pool condition": "Κατάσταση πισίνας",
  "Pool visible condition / water level": "Ορατή κατάσταση πισίνας / στάθμη νερού",
  "Garden / landscaping": "Κήπος / διαμόρφωση εξωτερικού χώρου",
  "Pest activity": "Δραστηριότητα παρασίτων",
  "Cleaning condition": "Κατάσταση καθαρισμού",
  "Maintenance items": "Σημεία συντήρησης",
  "Contractor work requiring follow-up": "Εργασίες εργολάβου που απαιτούν παρακολούθηση",
  "Meter readings": "Ενδείξεις μετρητών",
  "General property condition": "Γενική κατάσταση ακινήτου",
  "Photos / documentation": "Φωτογραφίες / τεκμηρίωση",
  "Owner update required": "Απαιτείται ενημέρωση ιδιοκτήτη",

  // Grocery Stocking
  "Confirm owner shopping list and budget": "Επιβεβαίωση λίστας αγορών και προϋπολογισμού ιδιοκτήτη",
  "Purchase requested groceries": "Αγορά ζητηθέντων ειδών",
  "Deliver groceries to the property": "Παράδοση ειδών στο ακίνητο",
  "Put away / stock basics": "Τακτοποίηση / απόθεμα βασικών ειδών",
  "Record grocery cost and attach receipt photo": "Καταγραφή κόστους αγορών και επισύναψη φωτογραφίας απόδειξης",
  "Send owner update with photos": "Αποστολή ενημέρωσης στον ιδιοκτήτη με φωτογραφίες",
};

// Returns the Greek display label for a known built-in item, or the original
// name unchanged for anything unknown/custom. `lang` is the current UI
// language ("el" shows the map; anything else shows the original text).
export function checklistItemDisplay(name, lang) {
  if (!name) return "";
  if (lang === "el" && CHECKLIST_ITEM_EL[name]) return CHECKLIST_ITEM_EL[name];
  return name;
}