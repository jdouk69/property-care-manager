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

  // ---- Wave 6: Tasks & Maintenance ----
  // Task / visit / maintenance workflow statuses (same meaning across entities)
  "In Progress": "Σε εξέλιξη",
  "Scheduled": "Προγραμματισμένο",

  // Priorities (feminine — προτεραιότητα; also fits ειδοποίηση)
  "Low": "Χαμηλή",
  "Medium": "Μεσαία",
  "High": "Υψηλή",
  "Routine": "Τυπική",

  // Maintenance issue workflow statuses
  "Reported": "Αναφέρθηκε",
  "Awaiting Owner Approval": "Σε αναμονή έγκρισης ιδιοκτήτη",
  "Approved": "Εγκεκριμένο",
  "Rejected": "Απορρίφθηκε",
  "Contractor Contacted": "Επικοινωνήθηκε με εργολάβο",
  "Waiting for Parts": "Σε αναμονή ανταλλακτικών",
  "Waiting for Payment": "Σε αναμονή πληρωμής",

  // Payment statuses
  "Unpaid": "Απλήρωτο",
  "Partially Paid": "Μερικώς πληρωμένο",
  "Paid": "Πληρωμένο",

  // Maintenance categories
  "Plumbing": "Υδραυλικά",
  "Electrical": "Ηλεκτρολογικά",
  "Pool": "Πισίνα",
  "Irrigation": "Άρδευση",
  "Garden": "Κήπος",
  "Air conditioning": "Κλιματισμός",
  "Security": "Ασφάλεια",
  "Painting": "Βαφή",
  "Building repair": "Επισκευή κτιρίου",
  "Pest control": "Απολυμάνσεις",
  "Storm damage": "Ζημιές από καταιγίδα",

  // Task types
  "Maintenance follow-up": "Παρακολούθηση Συντήρησης",
  "Contractor Meeting": "Συνάντηση με Εργολάβο",
  "Delivery": "Παράδοση",
  "Owner Request": "Αίτημα Ιδιοκτήτη",
  "Arrival preparation": "Προετοιμασία Άφιξης",
  "Departure inspection": "Επιθεώρηση Αναχώρησης",
  "Shopping": "Αγορές",
  "Utility payment": "Πληρωμή Λογαριασμών",
  "Report": "Αναφορά",
  "Key return": "Επιστροφή Κλειδιού",
  "Phone call": "Τηλεφωνική Κλήση",
  "Owner-representative visit": "Επίσκεψη Εκπροσώπου Ιδιοκτήτη",
  "Custom": "Προσαρμοσμένο",

  // Recurrence frequencies & series statuses (stored values; display only)
  "Daily": "Ημερησίως",
  "Weekly": "Εβδομαδιαία",
  "Monthly": "Μηνιαία",
  "Quarterly": "Τριμηνιαία",
  "Yearly": "Ετήσια",
  "active": "Ενεργή",
  "paused": "Σε παύση",
  "skipped": "Παραλείφθηκε",
  "ended": "Ολοκληρώθηκε",
};