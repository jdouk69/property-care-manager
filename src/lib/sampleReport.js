// Fixed sample data for the PUBLIC "Sample Visit Report" preview and PDF.
//
// This is illustrative demonstration content ONLY — it is never sent to a
// customer, never stored as a visit, and its photos are AI-generated
// demonstration images (not a client's property). The real customer report
// pipeline (buildOwnerReportModel + the PDF builder) renders this fixture so
// the sample looks exactly like a real report; a `sample: true` flag in the
// context switches on the sample labeling and the example-only blocks.

const IMG_DOOR = "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/0d7826f12_generated_image.png";
const IMG_SINK = "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/eaab12f9d_generated_image.png";
const IMG_PATIO = "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/22e1418f0_generated_image.png";

export const SAMPLE_IMAGES = { door: IMG_DOOR, sink: IMG_SINK, patio: IMG_PATIO };

// Starts/ends 35 minutes apart so the recorded-duration logic produces 35.
const START = "2026-06-15T10:00:00+03:00";
const END = "2026-06-15T10:35:00+03:00";

export function buildSampleVisit(lang = "en") {
  const el = lang === "el";
  const visit = {
    visit_type: "Property Care Inspection",
    start_time: START,
    end_time: END,
    summary: el
      ? "Η προγραμματισμένη οπτική επίσκεψη ολοκληρώθηκε. Παρατηρήθηκαν φύλλα δίπλα στη σιφόνι της βεράντας. Παρακαλούμε ενημερώστε μας αν θέλετε να κανονίσουμε το καθάρισμα· τυχόν χρέωση θα συμφωνηθεί πριν από την εργασία."
      : "The scheduled visual visit is complete. Leaves were noted beside the patio drain. Please let us know whether you would like clearing arranged; any charge will be agreed before work proceeds.",
    checklist: [
      {
        name: el ? "Πόρτες και παράθυρα" : "Doors and windows",
        status: "Normal",
        owner_visible: true,
        notes: el ? "Τα προσβάσιμα ανοίγματα φαίνονταν κλειστά." : "Accessible openings appeared closed.",
        photos: [IMG_DOOR],
      },
      {
        name: el ? "Ορατά προβλήματα νερού" : "Visible water issues",
        status: "Normal",
        owner_visible: true,
        notes: el ? "Δεν φαινόταν προφανής συσσώρευση νερού στους ελεγμένους χώρους." : "No obvious pooling in the areas viewed.",
        photos: [IMG_SINK],
      },
      {
        name: el ? "Σιφόνι βεράντας" : "Patio drain area",
        status: "Important",
        owner_visible: true,
        notes: el ? "Φύλλα ορατά δίπλα στη σιφόνι." : "Leaves visible beside the drain.",
        recommendation: el ? "Ζητήθηκε η έγκριση του ιδιοκτήτη πριν από το καθάρισμα." : "Owner approval requested before clearing.",
        photos: [IMG_PATIO],
      },
    ],
  };

  const property = {
    name: el ? "Υποδειγματικό Ακίνητο" : "Example Property",
    monitoring_priorities: [
      { area: el ? "Πόρτες και παράθυρα" : "Doors and windows", active: true },
      { area: el ? "Ορατά προβλήματα νερού" : "Visible water issues", active: true },
    ],
  };

  const client = {
    name: el ? "Ιδιοκτήτης (Υποδειγματικό)" : "Example Owner",
    preferred_language: el ? "Greek" : "English",
  };

  const business = {
    business_name: "Property Care Crete",
    phone: "+30 694 154 4475",
    website: "propertycarecrete.com",
  };

  const ctx = {
    business,
    property,
    client,
    sample: true,
    sampleInfo: {
      subtitle: el
        ? "Υποδειγματικό παράδειγμα μόνο — δεν αφορά πραγματική επίσκεψη ή στοιχεία πελάτη."
        : "Illustrative example only — no real visit or customer details.",
      plan: el ? "Φροντίδα Ακινήτου" : "Property Care",
      area: el ? "Χανιά, Κρήτη" : "Chania, Crete",
      visitLabel: el ? "Υποδειγματική μηνιαία επίσκεψη" : "Example monthly visit",
      duration: el ? "35 λεπτά (παράδειγμα)" : "35 minutes (example)",
      canIncludeHeading: el ? "ΤΙ ΜΠΟΡΕΙ ΝΑ ΠΕΡΙΛΑΜΒΑΝΕΙ Η ΑΝΑΦΟΡΑ ΣΑΣ" : "WHAT YOUR REPORT CAN INCLUDE",
      canIncludeText: el
        ? "Οι προτεραιότητες που έχετε επιλέξει, πρακτικές οπτικές παρατηρήσεις, φωτογραφίες και η συμφωνημένη παρακολούθηση."
        : "Your selected priorities, visual observations, photos and agreed follow-up.",
      observationsHeading: el ? "ΥΠΟΔΕΙΓΜΑΤΙΚΕΣ ΟΠΤΙΚΕΣ ΠΑΡΑΤΗΡΗΣΕΙΣ" : "EXAMPLE VISUAL OBSERVATIONS",
      summaryHeading: el ? "ΕΝΗΜΕΡΩΣΗ ΙΔΙΟΚΤΗΤΗ — ΥΠΟΔΕΙΓΜΑ" : "OWNER UPDATE — EXAMPLE",
      photoNote: el
        ? "Εικόνες που δημιουργήθηκαν από τεχνητή νοημοσύνη — δεν αφορά ακίνητο πελάτη."
        : "AI-generated demonstration images — not a client's property.",
      photosReportsHeading: el ? "ΦΩΤΟΓΡΑΦΙΕΣ & ΑΝΑΦΟΡΕΣ" : "PHOTOS & REPORTS",
      photosReportsText: el
        ? "Περιλαμβάνονται στα πακέτα Φροντίδα Ακινήτου και Πλήρης Φροντίδα. Ο Γρήγορος Έλεγχος δεν περιλαμβάνει τακτικές φωτογραφίες ή αναφορά προς τον ιδιοκτήτη."
        : "Included with Property Care and Complete Care. Quick Check does not include routine photos or a customer-facing visit report.",
      ourRoleHeading: el ? "Ο ΡΟΛΟΣ ΜΑΣ" : "OUR ROLE",
      ourRoleText: el
        ? "Μόνο οπτικές παρατηρήσεις σε προσβάσιμους χώρους τη στιγμή της επίσκεψης. Δεν αποτελεί επιθεώρηση κτιρίου, μηχανική αξιολόγηση, πιστοποίηση ή εγγύηση ότι δεν υπάρχουν κρυφές ατέλειες."
        : "Visual observations only in accessible areas at the time of the visit. Not a building inspection, engineering evaluation, certification or guarantee that no hidden defects exist.",
    },
  };

  return { visit, ctx };
}