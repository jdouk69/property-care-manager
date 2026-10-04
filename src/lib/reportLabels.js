// Bilingual (EN/EL) wording for the customer-facing visit report.
//
// The report language follows the CLIENT's preferred language
// (Client.preferred_language), not the staff member's UI language — the owner
// receives the report, so the owner chooses the language. All section
// headings, status/priority labels, table columns, the scope statement and the
// generated summary wording live here so the on-screen preview and the
// downloaded PDF always say the same thing.
//
// Dynamic content (observations, notes, summaries written by staff) is shown
// exactly as recorded — it is never translated or reworded into a claim.

export function reportLangFromClient(client) {
  return client && client.preferred_language === "Greek" ? "el" : "en";
}

export function reportLabelsFor(lang) {
  return lang === "el" ? EL : EN;
}

const EN = {
  lang: "en",
  reportTitle: "PROPERTY CARE VISIT REPORT",
  plan: "Plan",
  area: "Area",
  property: "Property",
  owner: "Owner",
  visitDate: "Visit date",
  visitWindow: "Visit window",
  serviceType: "Service type",
  duration: "Duration",
  visitShort: "Visit",
  minutes: (m) => `${m} minute${m === 1 ? "" : "s"}`,
  prioritiesHeading: "Your monitoring priorities",
  observationsHeading: "Visit Observations",
  colPriority: "Priority",
  colObservation: "Observation",
  colFollowUp: "Follow-up",
  noActionNoted: "No action noted",
  whatWeObserved: "What we observed:",
  actionTaken: "Action taken:",
  recommendedNextStep: "Recommended next step:",
  visitSummary: "Visit Summary",
  summaryNextSteps: "Summary & Next Steps",
  routineChecksHeading: "Routine Checks",
  unableShort: "UNABLE TO CHECK",
  naShort: "N/A",
  notCheckedShort: "NOT CHECKED",
  reason: "Reason:",
  routinePhotos: "Routine Visit Photos",
  routinePhotosSub: "Documentation photos showing general property conditions during this visit.",
  photoUnavailable: "[photo unavailable]",
  scopeStatement:
    "This report records visual observations in accessible areas at the time of the visit. It is not a professional building inspection, engineering evaluation, certification or guarantee that no hidden defects exist.",
  generated: (d) => `Generated ${d}`,
  pageOf: (p, n) => `Page ${p} of ${n}`,
  statusLabels: {
    urgent: "Urgent Attention Required",
    attention: "Attention Required",
    monitor: "Observations Noted",
    ok: "No Concerns Noted",
    // Some checklist items were left Not Checked / Unable to Check — never
    // presented as a fully completed "no concerns" visit.
    incomplete: "No Concerns Noted · Some Items Not Checked",
  },
  sampleTitle: "SAMPLE VISIT REPORT",
  maintenanceItem: "Maintenance item",
  resultUrgent: "Urgent attention required.",
  resultAttention: "Attention required.",
  resultObservations: "Observations noted.",
  resultIncomplete: "No concerns noted; some items were not checked.",
  resultNoConcerns: "No concerns noted.",
  summaryIncomplete: "The scheduled visit was completed. Some checklist items were not checked; they are listed below.",
  priorityLabels: { urgent: "Urgent", attention: "Attention Recommended", monitor: "Monitor" },
  unableDisplay: "Unable to check",
  naDisplay: "Not applicable",
  notCheckedDisplay: "Not checked",
  maintenance: (n) => `${n} maintenance item${n === 1 ? "" : "s"} recorded — we will coordinate as agreed.`,
  followUps: (n) => `${n} follow-up task${n === 1 ? "" : "s"} scheduled.`,
  nextScheduled: (d) => `Next scheduled visit: ${d}.`,
  noNextSteps: "No additional next steps recorded.",
  summaryAllClear: "All routine checks were completed with no concerns noted during this visit.",
  summaryLead: "The scheduled visit was completed.",
  summaryObservations: "Observations from this visit are documented in the sections below.",
  summaryReview: "Please review the urgent and attention observations and let us know how you would like to proceed.",
  concernIntro: (a, u) => {
    const bits = [];
    if (a) bits.push(`${a} item${a === 1 ? "" : "s"} requiring attention`);
    if (u) bits.push(`${u} urgent condition${u === 1 ? "" : "s"}`);
    const listed = bits.length === 1 ? bits[0] : `${bits[0]} and ${bits[1]}`;
    const verb = a + u === 1 ? "was" : "were";
    return `${listed} ${verb} documented during this visit. Please review the observations above for details.`;
  },
  routineNoConcernLine: (n) => `${n} routine check${n === 1 ? "" : "s"} completed — no concerns noted`,
  routineDone: (n) => `${n} routine check${n === 1 ? "" : "s"} completed with no concerns noted`,
  attentionBits: (n) => `${n} item${n === 1 ? "" : "s"} require${n === 1 ? "s" : ""} attention`,
  urgentBits: (n) => `${n} urgent condition${n === 1 ? " was" : "s were"} documented`,
  naLine: (n) => `${n} checklist item${n === 1 ? "" : "s"} not applicable to this property`,
};

const EL = {
  lang: "el",
  reportTitle: "ΑΝΑΦΟΡΑ ΕΠΙΣΚΕΨΗΣ ΦΡΟΝΤΙΔΑΣ ΑΚΙΝΗΤΟΥ",
  plan: "Πλάνο",
  area: "Περιοχή",
  property: "Ακίνητο",
  owner: "Ιδιοκτήτης",
  visitDate: "Ημερομηνία επίσκεψης",
  visitWindow: "Ώρα επίσκεψης",
  serviceType: "Τύπος υπηρεσίας",
  duration: "Διάρκεια",
  visitShort: "Επίσκεψη",
  minutes: (m) => (m === 1 ? "1 λεπτό" : `${m} λεπτά`),
  prioritiesHeading: "Οι προτεραιότητες παρακολούθησής σας",
  observationsHeading: "Παρατηρήσεις Επίσκεψης",
  colPriority: "Προτεραιότητα",
  colObservation: "Παρατήρηση",
  colFollowUp: "Ενέργεια παρακολούθησης",
  noActionNoted: "Καμία καταγεγραμμένη ενέργεια",
  whatWeObserved: "Τι παρατηρήσαμε:",
  actionTaken: "Ενέργεια που έγινε:",
  recommendedNextStep: "Προτεινόμενη επόμενη ενέργεια:",
  visitSummary: "Σύνοψη Επίσκεψης",
  summaryNextSteps: "Σύνοψη & Επόμενα Βήματα",
  routineChecksHeading: "Τακτικοί Έλεγχοι",
  unableShort: "ΑΔΥΝΑΤΟΣ ΕΛΕΓΧΟΣ",
  naShort: "ΔΕΝ ΕΦΑΡΜΟΣΕΤΑΙ",
  notCheckedShort: "ΔΕΝ ΕΛΕΧΘΗΚΕ",
  reason: "Λόγος:",
  routinePhotos: "Φωτογραφίες Επίσκεψης",
  routinePhotosSub: "Φωτογραφίες τεκμηρίωσης με τις γενικές συνθήκες του ακινήτου κατά την επίσκεψη.",
  photoUnavailable: "[η φωτογραφία δεν είναι διαθέσιμη]",
  scopeStatement:
    "Η αναφορά καταγράφει οπτικές παρατηρήσεις σε προσβάσιμους χώρους τη στιγμή της επίσκεψης. Δεν αποτελεί επαγγελματική επιθεώρηση κτιρίου, μηχανική αξιολόγηση, πιστοποίηση ή εγγύηση ότι δεν υπάρχουν κρυφές ατέλειες.",
  generated: (d) => `Δημιουργήθηκε ${d}`,
  pageOf: (p, n) => `Σελίδα ${p} από ${n}`,
  statusLabels: {
    urgent: "ΑΠΑΙΤΕΙΤΑΙ ΕΠΕΙΓΟΥΣΑ ΠΡΟΣΟΧΗ",
    attention: "ΑΠΑΙΤΕΙΤΑΙ ΠΡΟΣΟΧΗ",
    monitor: "ΠΑΡΑΤΗΡΗΣΕΙΣ ΚΑΤΑΓΡΑΦΗΚΑΝ",
    ok: "ΧΩΡΙΣ ΔΙΑΠΙΣΤΩΜΕΝΑ ΠΡΟΒΛΗΜΑΤΑ",
    incomplete: "ΧΩΡΙΣ ΠΡΟΒΛΗΜΑΤΑ · ΟΡΙΣΜΕΝΑ ΣΗΜΕΙΑ ΔΕΝ ΕΛΕΧΘΗΚΑΝ",
  },
  sampleTitle: "ΥΠΟΔΕΙΓΜΑΤΙΚΗ ΑΝΑΦΟΡΑ ΕΠΙΣΚΕΨΗΣ",
  maintenanceItem: "Εργασία συντήρησης",
  resultUrgent: "Απαιτείται επείγουσα προσοχή.",
  resultAttention: "Απαιτείται προσοχή.",
  resultObservations: "Καταγράφηκαν παρατηρήσεις.",
  resultIncomplete: "Χωρίς διαπιστωμένα προβλήματα· ορισμένα σημεία δεν ελέγχθηκαν.",
  resultNoConcerns: "Χωρίς διαπιστωμένα προβλήματα.",
  summaryIncomplete: "Η προγραμματισμένη επίσκεψη ολοκληρώθηκε. Ορισμένα σημεία της λίστας ελέγχου δεν ελέγχθηκαν· παρατίθενται παρακάτω.",
  priorityLabels: { urgent: "Επείγον", attention: "Χρήζει Προσοχής", monitor: "Παρακολούθηση" },
  unableDisplay: "Αδύνατος έλεγχος",
  naDisplay: "Δεν εφαρμόζεται",
  notCheckedDisplay: "Δεν ελέγχθηκε",
  maintenance: (n) =>
    n === 1
      ? "1 εργασία συντήρησης καταγράφηκε — θα συντονίσουμε όπως συμφωνήθηκε."
      : `${n} εργασίες συντήρησης καταγράφηκαν — θα συντονίσουμε όπως συμφωνήθηκε.`,
  followUps: (n) =>
    n === 1 ? "1 εργασία παρακολούθησης προγραμματίστηκε." : `${n} εργασίες παρακολούθησης προγραμματίστηκαν.`,
  nextScheduled: (d) => `Επόμενη προγραμματισμένη επίσκεψη: ${d}.`,
  noNextSteps: "Δεν καταγράφηκαν επιπλέον επόμενα βήματα.",
  summaryAllClear: "Όλοι οι τακτικοί έλεγχοι ολοκληρώθηκαν χωρίς διαπιστωμένα προβλήματα κατά την επίσκεψη.",
  summaryLead: "Η προγραμματισμένη επίσκεψη ολοκληρώθηκε.",
  summaryObservations: "Οι παρατηρήσεις της επίσκεψης καταγράφονται στις παρακάτω ενότητες.",
  summaryReview:
    "Παρακαλούμε δείτε τις επείγουσες παρατηρήσεις και εκείνες που χρήζουν προσοχής και ενημερώστε μας πώς θέλετε να προχωρήσουμε.",
  concernIntro: (a, u) => {
    const bits = [];
    if (a) bits.push(a === 1 ? "1 σημείο που χρήζει προσοχής" : `${a} σημεία που χρήζουν προσοχής`);
    if (u) bits.push(u === 1 ? "1 επείγουσα κατάσταση" : `${u} επείγουσες καταστάσεις`);
    const listed = bits.length === 1 ? bits[0] : `${bits[0]} και ${bits[1]}`;
    return `${listed} καταγράφηκαν κατά την επίσκεψη. Παρακαλούμε δείτε τις παρατηρήσεις παραπάνω για λεπτομέρειες.`;
  },
  routineNoConcernLine: (n) =>
    n === 1
      ? "1 τακτικός έλεγχος ολοκληρώθηκε — χωρίς διαπιστωμένα προβλήματα"
      : `${n} τακτικοί έλεγχοι ολοκληρώθηκαν — χωρίς διαπιστωμένα προβλήματα`,
  routineDone: (n) =>
    n === 1
      ? "1 τακτικός έλεγχος ολοκληρώθηκε χωρίς διαπιστωμένα προβλήματα"
      : `${n} τακτικοί έλεγχοι ολοκληρώθηκαν χωρίς διαπιστωμένα προβλήματα`,
  attentionBits: (n) => (n === 1 ? "1 σημείο χρήζει προσοχής" : `${n} σημεία χρήζουν προσοχής`),
  urgentBits: (n) => (n === 1 ? "1 επείγουσα κατάσταση καταγράφηκε" : `${n} επείγουσες καταστάσεις καταγράφηκαν`),
  naLine: (n) =>
    n === 1
      ? "1 σημείο της λίστας ελέγχου δεν εφαρμόζεται σε αυτό το ακίνητο"
      : `${n} σημεία της λίστας ελέγχου δεν εφαρμόζονται σε αυτό το ακίνητο`,
};