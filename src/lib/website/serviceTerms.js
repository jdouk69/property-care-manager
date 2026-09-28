// Customer-facing terms for the seven approved website services, EN + EL.
// The WORDING here is static, but every euro amount (price, hourly rate) and
// the billing unit come LIVE from the price feed. Nothing in this module can
// serve as a price fallback — if a live amount is missing, the caller must
// show the unavailable state, never a number from here.
// Exception: services in LIVE_DESC_KEYS take their English copy LIVE from
// the backend record's description through the feed (the Greek wording below
// is the static translation). The copy here stays as their fail-safe fallback.

const TERMS = {
  quick_check: {
    name_el: "Γρήγορος Έλεγχος",
    desc: {
      en: "A quick monthly visual check of your property: obvious leaks or water issues, visible damage, signs of forced entry, and anything clearly unusual.",
      el: "Ένας γρήγορος μηνιαίος οπτικός έλεγχος του ακινήτου σας: εμφανή διαρροή ή προβλήματα νερού, ορατές ζημιές, ενδείξεις παραβίασης και οτιδήποτε προφανώς ασυνήθιστο.",
    },
    included: {
      en: "One scheduled visit per month (up to 15 minutes). Every visit is recorded.",
      el: "Μια προγραμματισμένη επίσκεψη τον μήνα (έως 15 λεπτά). Κάθε επίσκεψη καταγράφεται.",
    },
    extras: {
      en: "Does not include routine photos or a customer-facing visit report.",
      el: "Δεν περιλαμβάνει τακτικές φωτογραφίες ή αναφορά επίσκεψης προς τον ιδιοκτήτη.",
    },
  },
  property_care: {
    name_el: "Φροντίδα Ακινήτου",
    desc: {
      en: "A thorough monthly visit covering leaks, moisture, visible damage, doors and windows, plus your selected monitoring priorities.",
      el: "Μια διεξοδική μηνιαία επίσκεψη για διαρροές, υγρασία, ορατές ζημιές, πόρτες και παράθυρα, καθώς και τις προτεραιότητες παρακολούθησης που έχετε επιλέξει.",
    },
    included: {
      en: "One scheduled visit per month (30–45 minutes), including photos and a visit report.",
      el: "Μια προγραμματισμένη επίσκεψη τον μήνα (30–45 λεπτά), με φωτογραφίες και αναφορά επίσκεψης.",
    },
    extras: {
      en: "Additional time is charged at €{hourly}/hour.",
      el: "Ο επιπλέον χρόνος χρεώνεται με €{hourly}/ώρα.",
    },
  },
  complete_care: {
    name_el: "Πλήρης Φροντίδα",
    desc: {
      en: "Our most comprehensive care, with two visits each month.",
      el: "Η πιο ολοκληρωμένη φροντίδα μας, με δύο επισκέψεις τον μήνα.",
    },
    included: {
      en: "One full visit per month (up to 60 minutes) covering your chosen priorities, with photos and a detailed report, plus one brief follow-up check (up to 15 minutes) with a photo update.",
      el: "Μια πλήρης επίσκεψη τον μήνα (έως 60 λεπτά) για τις προτεραιότητες που έχετε επιλέξει, με φωτογραφίες και αναλυτική αναφορά, καθώς και ένας σύντομος πρόσθετος έλεγχος (έως 15 λεπτά) με φωτογραφική ενημέρωση.",
    },
    extras: {
      en: "Additional time is charged at €{hourly}/hour.",
      el: "Ο επιπλέον χρόνος χρεώνεται με €{hourly}/ώρα.",
    },
  },
  owner_arrival_preparation: {
    name_el: "Προετοιμασία Πριν την Άφιξη Ιδιοκτήτη",
    desc: {
      en: "A pre-arrival visual check and airing of the property so everything is in order when you arrive.",
      el: "Οπτικός έλεγχος και αερισμός του ακινήτου πριν την άφιξή σας, ώστε όλα να είναι σε τάξη.",
    },
    included: {
      en: "Includes up to 60 minutes on site.",
      el: "Περιλαμβάνει έως 60 λεπτά επιτόπου.",
    },
    extras: {
      en: "Additional time is charged at €{hourly}/hour.",
      el: "Ο επιπλέον χρόνος χρεώνεται με €{hourly}/ώρα.",
    },
  },
  owner_representative_site_visit: {
    name_el: "Επίσκεψη Εκπροσώπου Ιδιοκτήτη",
    desc: {
      en: "Can't be there when a contractor, delivery or service provider arrives? We can meet them at the property, provide access, document the visit and keep you informed.",
      el: "Δεν μπορείτε να βρίσκεστε εκεί όταν φτάνει εργολάβος, παράδοση ή πάροχος υπηρεσιών; Μπορούμε να τον συναντήσουμε στο ακίνητο, να δώσουμε πρόσβαση, να καταγράψουμε την επίσκεψη και να σας κρατήσουμε ενήμερους.",
    },
    included: {
      en: "Includes the first 60 minutes on site.",
      el: "Περιλαμβάνει τα πρώτα 60 λεπτά επιτόπου.",
    },
    extras: {
      en: "Additional time is charged at €{hourly}/hour.",
      el: "Ο επιπλέον χρόνος χρεώνεται με €{hourly}/ώρα.",
    },
  },
  grocery_stocking: {
    name_el: "Προμήθεια Τροφίμων",
    desc: {
      en: "We shop for your groceries and stock the property before you or your guests arrive.",
      el: "Αγοράζουμε τα είδη διατροφής σας και εφοδιάζουμε το ακίνητο πριν φτάσετε εσείς ή οι επισκέπτες σας.",
    },
    included: {
      en: "Includes up to 15 minutes of shopping.",
      el: "Περιλαμβάνει έως 15 λεπτά αγορών.",
    },
    extras: {
      en: "Additional time is charged at €{hourly}/hour. Groceries are charged separately.",
      el: "Ο επιπλέον χρόνος χρεώνεται με €{hourly}/ώρα. Τα τρόφιμα χρεώνονται ξεχωριστά.",
    },
  },
  emergency_visit: {
    name_el: "Επείγουσα Επίσκεψη",
    desc: {
      en: "Urgent attendance for concerns such as a water leak, intrusion, storm or power issue at your property.",
      el: "Επείγουσα προσέλευση για ζητήματα όπως διαρροή νερού, παραβίαση, καταιγίδα ή πρόβλημα ρεύματος στο ακίνητό σας.",
    },
    included: {
      en: "€{price} covers the first hour on site.",
      el: "Τα €{price} καλύπτουν την πρώτη ώρα επιτόπου.",
    },
    extras: {
      en: "Time beyond the first hour is charged at €{hourly}/hour.",
      el: "Ο χρόνος πέρα από την πρώτη ώρα χρεώνεται με €{hourly}/ώρα.",
    },
  },
};

const pick = (o, lang) => (o ? (lang === "el" ? o.el : o.en) : null);

// Services whose customer-facing description flows LIVE from the backend
// record through the price feed (English only — Greek is the static
// translation above).
const LIVE_DESC_KEYS = new Set(["complete_care"]);
// A description paragraph that only states the hourly charge is never shown —
// the card's clock line renders the LIVE hourly_rate, so that amount can
// never go stale inside the description text.
const HOURLY_SENTENCE = /^additional time\b[\s\S]*€\s*\d[\s\S]*\/\s*hour\.?$/i;

// Price display: whole euros without decimals (€65), real cents preserved
// (€45.50). Applied to the LIVE feed value only — never a fallback number.
export function formatPrice(n) {
  if (n == null) return "";
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// Returns the display terms for a live feed service, or null when the live
// amounts this wording depends on are missing (fail-closed — never a fallback).
export function serviceTerms(service, lang) {
  const def = TERMS[service?.service_key];
  if (!def || service.price == null) return null;
  const sub = (s) =>
    s.split("{price}").join(service.price).split("{hourly}").join(service.hourly_rate);
  let extras = pick(def.extras, lang);
  if (extras && extras.includes("{hourly}") && service.hourly_rate == null) return null;
  let desc = pick(def.desc, lang);
  let included = sub(pick(def.included, lang));
  // Live English copy: the record's description paragraphs map onto the card
  // (paragraph 1 -> intro, paragraph 2 -> the included line).
  if (lang !== "el" && LIVE_DESC_KEYS.has(service?.service_key) && service.description) {
    const paras = String(service.description)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p && !HOURLY_SENTENCE.test(p));
    if (paras[0]) desc = paras[0];
    if (paras[1]) included = paras[1];
  }
  return {
    name: lang === "el" ? def.name_el : service.name,
    desc,
    included,
    extras: extras ? sub(extras) : null,
  };
}

// Billing-unit label for the price headline, from the FEED's billing_unit.
export function billingUnitLabel(billingUnit, lang) {
  if (billingUnit === "month") return lang === "el" ? "τον μήνα" : "per month";
  return lang === "el" ? "ανά επίσκεψη" : "per visit";
}

export const MONTHLY_KEYS = ["quick_check", "property_care", "complete_care"];
export const ON_DEMAND_KEYS = [
  "owner_arrival_preparation",
  "owner_representative_site_visit",
  "grocery_stocking",
  "emergency_visit",
];
export const REQUIRED_KEYS = [...MONTHLY_KEYS, ...ON_DEMAND_KEYS];