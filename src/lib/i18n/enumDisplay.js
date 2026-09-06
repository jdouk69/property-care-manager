// Central bilingual display map for stored enum / status / category values.
// Same display-only pattern as visitTypeLabels.js: stored values are NEVER
// translated or written back to the database. English display = the stored
// value itself; Greek display = the mapped label (falls back to the stored
// value when no entry exists).
//
// Include a value here ONLY if it means the same thing everywhere it is
// displayed. Context-specific values (e.g. workflow statuses that differ by
// entity) get their own context keys, not entries here.
//
// Consumers render via the shared t(value) helper, which merges this map into
// the single translation dictionary — t() is the authoritative display
// function; badge tones and all comparisons keep using the raw stored value.

export const ENUM_EL = {
  // Account / client statuses
  "Active": "Ενεργό",
  "Inactive": "Ανενεργό",

  // Generic workflow statuses — same business meaning across entities
  "Pending": "Σε εκκρεμότητα",
  "Completed": "Ολοκληρώθηκε",
  "Cancelled": "Ακυρώθηκε",
  "Overdue": "Εκπρόθεσμα",
  "Open": "Ανοιχτό",
  "Closed": "Κλειστό",

  // Property occupancy statuses
  "Vacant": "Κενό",
  "Owner Occupied": "Κατοικείται από Ιδιοκτήτη",
  "Guest Occupied": "Κατοικείται από Επισκέπτες",
  "Rental Occupied": "Κατοικείται από Ενοικιαστές",
  "Preparing for Arrival": "Προετοιμασία για Άφιξη",
  "Preparing for Departure": "Προετοιμασία για Αναχώρηση",
  "Under Maintenance": "Σε Συντήρηση",
  "Emergency": "Επείγον",

  // Property types
  "Villa": "Βίλα",
  "Apartment": "Διαμέρισμα",
  "House": "Μονοκατοικία",
  "Studio": "Στούντιο",
  "Cottage": "Εξοχικό",
  "Commercial": "Επαγγελματικό",

  // Property condition (feminine — κατάσταση)
  "Excellent": "Άριστη",
  "Good": "Καλή",
  "Needs Attention": "Χρειάζεται Προσοχή",
  "Poor": "Κακή",

  // Contractor trades
  "Plumber": "Υδραυλικός",
  "Electrician": "Ηλεκτρολόγος",
  "Pool Technician": "Τεχνικός Πισίνας",
  "Gardener": "Κηπουρός",
  "Cleaner": "Καθαριστής",
  "Locksmith": "Κλειδαράς",
  "HVAC": "Τεχνικός Κλιματισμού",
  "Pest Control": "Απολυμάνσεις",
  "Roofer": "Τεχνικός Στεγών",
  "Painter": "Ελαιοχρωματιστής",
  "General Handyman": "Γενικός Τεχνικός",
  "Appliance Repair": "Επισκευή Συσκευών",
  "Internet / Telecom": "Internet / Τηλεπικοινωνίες",
  "Other": "Άλλο",

  // Delivery purposes & completion
  "Furniture": "Έπιπλα",
  "Appliance": "Συσκευή",
  "Parcel": "Δέμα",
  "Building materials": "Δομικά Υλικά",
  "Contractor access": "Πρόσβαση Εργολάβου",
  "Utility technician": "Τεχνικός Ρεύματος/Νερού",
  "Internet technician": "Τεχνικός Internet",
  "Cleaning": "Καθάρισμα",
  "Issue": "Πρόβλημα",

  // Document categories
  "Quotes": "Προσφορές",
  "Contracts": "Συμβόλαια",
  "Warranties": "Εγγυήσεις",
  "Manuals": "Εγχειρίδια",
  "Insurance Documents": "Έγγραφα Ασφάλισης",
  "Utility Documents": "Έγγραφα Παρόχων",
  "Floor Plans": "Κατόψεις",
  "Miscellaneous Files": "Διάφορα Αρχεία",

  // Communication types & languages (WhatsApp, Email, SMS stay as-is)
  "In-person": "Δια Ζώσης",
  "English": "Αγγλικά",
  "Greek": "Ελληνικά",

  // Derived expense badge values (render-only; tone map stays keyed on English)
  "reimbursed": "Επιστράφηκε",
  "pending": "Σε εκκρεμότητα",
};