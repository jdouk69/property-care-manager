// Editable website copy — single model for the public homepage sections.
//
// DEFAULT_CONTENT mirrors the copy that was previously hard-coded in the
// section components. It serves as (a) the initial value in the website
// editor and (b) the resilience fallback on the public page when a section
// has never been published or the content feed fails — so the site can never
// go blank. Once an admin publishes a section, the published record is the
// live source and these defaults no longer reach visitors for that section.
//
// Every field is bilingual: content = { en: {...}, el: {...} }.
// NO price, hourly rate, or package data lives here — those come live from
// ServicePackage records through the secure pricing feed. The public wording
// for all seven service cards lives in services.<lang>.cards (title,
// description, inclusions, extra-time note); {price} and {hourly}
// placeholders inside that wording are filled with the LIVE amounts from
// the feed at display time, so no editable copy can carry a stale amount.

export const SECTION_META = [
  { key: "hero", label: "Hero" },
  { key: "services", label: "Services" },
  { key: "add_on_services", label: "Add-on Services" },
  { key: "service_area", label: "Service Area" },
  { key: "how_it_works", label: "How It Works" },
  { key: "why_us", label: "Why Us" },
  { key: "faqs", label: "FAQs" },
  { key: "contact", label: "Contact" },
];

export const DEFAULT_CONTENT = {
  hero: {
    en: {
      badge: "Chania · Western Crete",
      title: "Your home in Crete, cared for as if it were our own.",
      subtitle:
        "Whether you're away for a few weeks or most of the year, Property Care Crete gives you a dependable local presence in Chania and Western Crete. We carry out scheduled property visits, document what we see, keep you informed, and help coordinate the right professionals when something needs attention.",
      ctaPrimary: "Request a Property Assessment",
      ctaSecondary: "Services & Prices",
    },
    el: {
      badge: "Χανιά · Δυτική Κρήτη",
      title: "Το σπίτι σας στην Κρήτη, με φροντίδα σαν να ήταν δικό μας.",
      subtitle:
        "Είτε λείπετε για λίγες εβδομάδες είτε για το μεγαλύτερο μέρος του χρόνου, το Property Care Crete σας προσφέρει μια αξιόπιστη τοπική παρουσία στα Χανιά και τη Δυτική Κρήτη. Πραγματοποιούμε προγραμματισμένες επισκέψεις στο ακίνητό σας, καταγράφουμε όσα βλέπουμε, σας κρατάμε ενήμερους και σας βοηθάμε να συντονίσετε τους κατάλληλους επαγγελματίες όταν κάτι χρειάζεται προσοχή.",
      ctaPrimary: "Ζητήστε Αξιολόγηση Ακινήτου",
      ctaSecondary: "Υπηρεσίες & Τιμές",
    },
  },
  services: {
    en: {
      kicker: "Services & Pricing",
      heading: "Clear prices and agreed work.",
      intro:
        "These are our current service prices. After a property assessment, we agree any proposed work and its price with you before we proceed.",
      groupHeading: "Recurring Care Plans — scheduled visits every month",
      note: "The exact work and final price for your property are always agreed with you in writing before we start.",
      // Public wording for the seven service cards. The seed values mirror
      // exactly what the cards showed when this content became editable.
      // {price} / {hourly} placeholders are filled LIVE from the pricing
      // feed — never edit an amount into this text.
      cards: {
        quick_check: {
          name: "Quick Check",
          desc: "A documented monthly visual visit that keeps an eye on your home while you're away: obvious leaks or water issues, visible damage, signs of forced entry, and anything clearly unusual.",
          included: "One scheduled visit per month (up to 15 minutes). Every visit is recorded, and anything unusual is reported to you promptly.",
          extras: "Routine photos and a customer-facing visit report are part of the Property Care plan.",
        },
        property_care: {
          name: "Property Care",
          desc: "A thorough monthly visit covering leaks, moisture, visible damage, doors and windows — plus the specific areas or visible issues you ask us to keep an eye on, agreed with you during onboarding.",
          included: "One scheduled visit per month (30–45 minutes), including photos and a visit report.",
          extras: "If a visit needs more time than its included allowance, agreed extra time is charged at €{hourly}/hour.",
        },
        complete_care: {
          name: "Complete Care",
          desc: "Our most comprehensive care, with two visits each month.",
          included: "One full visit (up to 60 minutes) covering your chosen priorities, with photos and a detailed report. Plus one brief follow-up check (up to 15 minutes) with a short dated photo update.",
          extras: "If a visit needs more time than its included allowance, agreed extra time is charged at €{hourly}/hour.",
        },
        owner_arrival_preparation: {
          name: "Owner Arrival Preparation",
          desc: "A pre-arrival visual check and airing of the property so everything is in order when you arrive.",
          included: "Includes up to 60 minutes on site.",
          extras: "If a visit needs more time than its included allowance, agreed extra time is charged at €{hourly}/hour.",
        },
        seasonal_opening: {
          name: "Seasonal Opening",
          desc: "Get your home ready after a period away. We air it, look for obvious visible problems, and carry out the simple opening steps you've agreed to in writing.",
          included: "Includes up to 60 minutes on site.",
          extras: "Agreed extra time: €{hourly}/hour.",
        },
        seasonal_closing: {
          name: "Seasonal Closing",
          desc: "Prepare your home for a period away. We carry out your agreed closing steps, check doors and shutters, and secure the property as instructed.",
          included: "Includes up to 60 minutes on site.",
          extras: "Agreed extra time: €{hourly}/hour.",
        },
        owner_representative_site_visit: {
          name: "Owner Representative Site Visit",
          desc: "Can't be there when a contractor, delivery or service provider arrives? We can meet them at the property, provide access, document the visit and keep you informed.",
          included: "Includes the first 60 minutes on site.",
          extras: "If a visit needs more time than its included allowance, agreed extra time is charged at €{hourly}/hour.",
        },
        grocery_stocking: {
          name: "Grocery Stocking",
          desc: "We shop for your groceries and stock the property before you or your guests arrive.",
          included: "Includes up to 15 minutes of shopping.",
          extras: "If your order needs more shopping time than included, agreed extra time is charged at €{hourly}/hour. Groceries are charged separately.",
        },
        emergency_visit: {
          name: "Emergency Visit",
          desc: "Urgent attendance for concerns such as a water leak, intrusion, storm or power issue at your property.",
          included: "€{price} covers the first hour on site.",
          extras: "Time beyond the first hour is charged at €{hourly}/hour.",
        },
      },
    },
    el: {
      kicker: "Υπηρεσίες & Τιμές",
      heading: "Ξεκάθαρες τιμές και συμφωνημένη εργασία.",
      intro:
        "Αυτές είναι οι τρέχουσες τιμές των υπηρεσιών μας. Μετά την αξιολόγηση του ακινήτου, συμφωνούμε μαζί σας κάθε προτεινόμενη εργασία και την τιμή της πριν προχωρήσουμε.",
      groupHeading: "Μηνιαία Πακέτα Φροντίδας — προγραμματισμένες επισκέψεις κάθε μήνα",
      note: "Η ακριβής εργασία και η τελική τιμή για το ακίνητό σας συμφωνούνται πάντα γραπτώς μαζί σας πριν ξεκινήσουμε.",
      cards: {
        quick_check: {
          name: "Γρήγορος Έλεγχος",
          desc: "Καταγεγραμμένη μηνιαία οπτική επίσκεψη που κρατά το βλέμμα στο σπίτι σας όσο λείπετε: εμφανείς διαρροές ή προβλήματα νερού, ορατές ζημιές, ενδείξεις παραβίασης και οτιδήποτε προφανώς ασυνήθιστο.",
          included: "Μια προγραμματισμένη επίσκεψη τον μήνα (έως 15 λεπτά). Κάθε επίσκεψη καταγράφεται και οτιδήποτε ασυνήθιστο σας αναφέρεται άμεσα.",
          extras: "Τακτικές φωτογραφίες και αναφορά επίσκεψης περιλαμβάνονται στο πακέτο Φροντίδα Ακινήτου.",
        },
        property_care: {
          name: "Φροντίδα Ακινήτου",
          desc: "Μια διεξοδική μηνιαία επίσκεψη για διαρροές, υγρασία, ορατές ζημιές, πόρτες και παράθυρα — καθώς και τις συγκεκριμένες περιοχές ή ζητήματα που επιλέγετε να παρακολουθούμε οπτικά, συμφωνημένα μαζί σας κατά την έναρξη της συνεργασίας.",
          included: "Μια προγραμματισμένη επίσκεψη τον μήνα (30–45 λεπτά), με φωτογραφίες και αναφορά επίσκεψης.",
          extras: "Αν μια επίσκεψη χρειαστεί περισσότερο χρόνο από τον συμφωνημένο, ο επιπλέον χρόνος που συμφωνείται μαζί σας χρεώνεται με €{hourly}/ώρα.",
        },
        complete_care: {
          name: "Πλήρης Φροντίδα",
          desc: "Η πιο ολοκληρωμένη φροντίδα μας, με δύο επισκέψεις τον μήνα.",
          included: "Μια πλήρης επίσκεψη τον μήνα (έως 60 λεπτά) για τις προτεραιότητες που έχετε επιλέξει, με φωτογραφίες και αναλυτική αναφορά, καθώς και ένας σύντομος συμπληρωματικός έλεγχος (έως 15 λεπτά) με φωτογραφική ενημέρωση με ημερομηνία.",
          extras: "Αν μια επίσκεψη χρειαστεί περισσότερο χρόνο από τον συμφωνημένο, ο επιπλέον χρόνος που συμφωνείται μαζί σας χρεώνεται με €{hourly}/ώρα.",
        },
        owner_arrival_preparation: {
          name: "Προετοιμασία Πριν την Άφιξη Ιδιοκτήτη",
          desc: "Οπτικός έλεγχος και αερισμός του ακινήτου πριν την άφιξή σας, ώστε όλα να είναι σε τάξη.",
          included: "Περιλαμβάνει έως 60 λεπτά επιτόπου.",
          extras: "Αν μια επίσκεψη χρειαστεί περισσότερο χρόνο από τον συμφωνημένο, ο επιπλέον χρόνος που συμφωνείται μαζί σας χρεώνεται με €{hourly}/ώρα.",
        },
        seasonal_opening: {
          name: "Εποχιακό Άνοιγμα",
          desc: "Ετοιμάζουμε το σπίτι σας μετά από περίοδο απουσίας. Το αερίζουμε, ελέγχουμε για εμφανή προβλήματα και εκτελούμε τα απλά βήματα ανοίγματος που έχετε συμφωνήσει μαζί μας γραπτώς.",
          included: "Περιλαμβάνει έως 60 λεπτά επιτόπου.",
          extras: "Συμφωνημένος επιπλέον χρόνος: €{hourly}/ώρα.",
        },
        seasonal_closing: {
          name: "Εποχιακό Κλείσιμο",
          desc: "Ετοιμάζουμε το σπίτι σας για περίοδο απουσίας. Εκτελούμε τα συμφωνημένα βήματα κλεισίματος, ελέγχουμε πόρτες και παντζούρια και ασφαλίζουμε το ακίνητο σύμφωνα με τις οδηγίες σας.",
          included: "Περιλαμβάνει έως 60 λεπτά επιτόπου.",
          extras: "Συμφωνημένος επιπλέον χρόνος: €{hourly}/ώρα.",
        },
        owner_representative_site_visit: {
          name: "Επίσκεψη Εκπροσώπου Ιδιοκτήτη",
          desc: "Δεν μπορείτε να βρίσκεστε εκεί όταν φτάνει εργολάβος, παράδοση ή πάροχος υπηρεσιών; Μπορούμε να τον συναντήσουμε στο ακίνητο, να δώσουμε πρόσβαση, να καταγράψουμε την επίσκεψη και να σας κρατήσουμε ενήμερους.",
          included: "Περιλαμβάνει τα πρώτα 60 λεπτά επιτόπου.",
          extras: "Αν μια επίσκεψη χρειαστεί περισσότερο χρόνο από τον συμφωνημένο, ο επιπλέον χρόνος που συμφωνείται μαζί σας χρεώνεται με €{hourly}/ώρα.",
        },
        grocery_stocking: {
          name: "Προμήθεια Τροφίμων",
          desc: "Αγοράζουμε τα είδη διατροφής σας και εφοδιάζουμε το ακίνητο πριν φτάσετε εσείς ή οι επισκέπτες σας.",
          included: "Περιλαμβάνει έως 15 λεπτά αγορών.",
          extras: "Αν η παραγγελία σας χρειαστεί περισσότερο χρόνο αγορών από τον συμφωνημένο, ο επιπλέον χρόνος χρεώνεται με €{hourly}/ώρα. Τα τρόφιμα χρεώνονται ξεχωριστά.",
        },
        emergency_visit: {
          name: "Επείγουσα Επίσκεψη",
          desc: "Επείγουσα προσέλευση για ζητήματα όπως διαρροή νερού, παραβίαση, καταιγίδα ή πρόβλημα ρεύματος στο ακίνητό σας.",
          included: "Τα €{price} καλύπτουν την πρώτη ώρα επιτόπου.",
          extras: "Ο χρόνος πέρα από την πρώτη ώρα χρεώνεται με €{hourly}/ώρα.",
        },
      },
    },
  },
  add_on_services: {
    en: { heading: "On-Demand Services" },
    el: { heading: "Υπηρεσίες κατ' Απαίτηση" },
  },
  how_it_works: {
    en: {
      kicker: "How it works",
      heading: "Simple steps, full transparency.",
      steps: [
        "You request a property assessment and tell us a little about your home.",
        "We assess the property and agree the care plan and price with you.",
        "We carry out scheduled visits, using a detailed checklist for each visit type.",
        "You receive photos and a detailed visit report after each full scheduled visit. On the Complete Care plan, the brief monthly follow-up visit includes a short dated photo update.",
        "If anything needs attention, we let you know and proceed only with your approval.",
      ],
    },
    el: {
      kicker: "Πώς λειτουργεί",
      heading: "Απλά βήματα, πλήρης διαφάνεια.",
      steps: [
        "Ζητάτε αξιολόγηση ακινήτου και μας λέτε λίγα λόγια για το σπίτι σας.",
        "Επιθεωρούμε το ακίνητο και συμφωνούμε το πλάνο φροντίδας και την τιμή μαζί σας.",
        "Εκτελούμε προγραμματισμένες επισκέψεις με λεπτομερή λίστα ελέγχου για κάθε τύπο επίσκεψης.",
        "Μετά από κάθε πλήρη προγραμματισμένη επίσκεψη λαμβάνετε φωτογραφίες και αναλυτική αναφορά επίσκεψης. Στο πακέτο Πλήρης Φροντίδα, η σύντομη μηνιαία συμπληρωματική επίσκεψη περιλαμβάνει μια σύντομη φωτογραφική ενημέρωση με ημερομηνία.",
        "Εάν κάτι χρειάζεται προσοχή, σας ενημερώνουμε και προχωράμε μόνο με την έγκρισή σας.",
      ],
    },
  },
  why_us: {
    en: {
      kicker: "How we earn your trust",
      heading: "Documentation, not promises.",
      items: [
        {
          title: "Documented visits",
          text: "Every scheduled visit is recorded internally with date, time, checklist, and observations.",
        },
        {
          title: "Photos & reports",
          text: "Routine photos and a customer-facing visit report are included only with Property Care and Complete Care — not with Quick Check.",
        },
        {
          title: "Clear prices, agreed work",
          text: "You see our current prices up front, and we agree the work and the price with you in writing before we start.",
        },
        {
          title: "One local point of contact",
          text: "You know your local point of contact by name — and every visit record shows who attended.",
        },
        {
          title: "Careful key handling",
          text: "Keys and access details are kept in our protected records and used only for visits you have agreed to.",
        },
        {
          title: "Clear role limits",
          text: "We state plainly what we do and what we do not do — no exaggeration, no vague promises.",
        },
      ],
    },
    el: {
      kicker: "Πώς κερδίζουμε την εμπιστοσύνη σας",
      heading: "Τεκμηρίωση, όχι υποσχέσεις.",
      items: [
        {
          title: "Καταγεγραμμένες επισκέψεις",
          text: "Κάθε προγραμματισμένη επίσκεψη καταγράφεται εσωτερικά με ημερομηνία, ώρα, λίστα ελέγχου και παρατηρήσεις.",
        },
        {
          title: "Φωτογραφίες & αναφορές",
          text: "Οι τακτικές φωτογραφίες και η αναφορά προς τον ιδιοκτήτη περιλαμβάνονται μόνο στα πακέτα Φροντίδας και Πλήρους Φροντίδας — όχι στον Γρήγορο Έλεγχο.",
        },
        {
          title: "Ξεκάθαρες τιμές, συμφωνημένη εργασία",
          text: "Βλέπετε τις τρέχουσες τιμές μας εκ των προτέρων και συμφωνούμε την εργασία και την τιμή γραπτώς πριν ξεκινήσουμε.",
        },
        {
          title: "Ένας τοπικός επαφής",
          text: "Γνωρίζετε εξ ονόματος τον τοπικό σας επαφή — και κάθε επίσκεψη καταγράφει ποιος παρευρέθηκε στο ακίνητο.",
        },
        {
          title: "Ασφαλής διαχείριση κλειδιών",
          text: "Τα κλειδιά και τα στοιχεία πρόσβασης φυλάσσονται στα προστατευμένα αρχεία μας και χρησιμοποιούνται μόνο για επισκέψεις που έχετε συμφωνήσει.",
        },
        {
          title: "Σαφή όρια ρόλου",
          text: "Λέμε καθαρά τι κάνουμε και τι δεν κάνουμε — χωρίς υπερβολές ή ασαφείς υποσχέσεις.",
        },
      ],
    },
  },
  service_area: {
    en: {
      kicker: "Service area",
      heading: "Based in the greater Chania area.",
      intro:
        "We cover the town of Chania and the surrounding areas of western Crete. If your property lies further afield, just ask — we review it during the assessment.",
      areas: ["Chania (town)", "Akrotiri", "Platanias", "Kolymvari", "Apokoronas", "Kissamos"],
      travel_notes: [
        "We serve Chania and surrounding areas of Western Crete. Travel within our core service area is included. Properties outside that area may have an additional travel charge, confirmed during the assessment and agreed in writing before service begins.",
        "For recurring plans, your quote will show the total monthly cost, including any agreed travel charges.",
        "Emergency attendance is subject to availability and prior agreement. We do not guarantee round-the-clock availability or a specific response time.",
      ],
    },
    el: {
      kicker: "Περιοχή εξυπηρέτησης",
      heading: "Με έδρα την ευρύτερη περιοχή των Χανίων.",
      intro:
        "Καλύπτουμε την πόλη των Χανίων και τις γύρω περιοχές της Δυτικής Κρήτης. Αν το ακίνητό σας βρίσκεται πιο μακριά, ρωτήστε μας — το εξετάζουμε κατά την αξιολόγηση.",
      areas: ["Χανιά (πόλη)", "Ακρωτήρι", "Πλατανιάς", "Κολυμβάρι", "Αποκόρωνας", "Κίσσαμος"],
      travel_notes: [
        "Εξυπηρετούμε τα Χανιά και τις γύρω περιοχές της Δυτικής Κρήτης. Η μετακίνηση εντός του βασικού μας χώρου εξυπηρέτησης περιλαμβάνεται. Για ακίνητα εκτός της περιοχής μπορεί να ισχύει επιπλέον χρέωση μετακίνησης, που επιβεβαιώνεται κατά την αξιολόγηση και συμφωνείται γραπτώς πριν ξεκινήσει η υπηρεσία.",
        "Για τα μηνιαία πακέτα, η προσφορά σας θα δείχνει το συνολικό μηνιαίο κόστος, συμπεριλαμβανομένων τυχόν συμφωνημένων χρεώσεων μετακίνησης.",
        "Η επείγουσα προσέλευση εξαρτάται από διαθεσιμότητα και προηγούμενη συμφωνία. Δεν εγγυόμαστε συνεχή διαθεσιμότητα ή συγκεκριμένο χρόνο ανταπόκρισης.",
      ],
    },
  },
  faqs: {
    en: {
      kicker: "FAQ",
      heading: "Frequently asked questions",
      items: [
        {
          q: "Will I receive photos and a report after each visit?",
          a: "Property Care includes photos and a visit report after every scheduled visit. Complete Care includes a detailed report after the full monthly visit, while the brief monthly follow-up visit includes a short dated photo update. Quick Check does not include routine photos or a report — every visit is still recorded.",
        },
        {
          q: "What happens if you notice a problem?",
          a: "We notify you immediately with what we observed. Any work or spending proceeds only with your approval, or in line with the written emergency authorization you have given us.",
        },
        {
          q: "Can you let in tradespeople or accept deliveries?",
          a: "Yes — arranged in advance and on your instruction. Every such visit is documented and charged as an on-demand service.",
        },
        {
          q: "How do I pay?",
          a: "Monthly plans are billed per month and on-demand services per visit. Payment details are agreed in writing before we start.",
        },
        {
          q: "Do I need to give you keys?",
          a: "Yes, for visits that require access. Keys and access details are kept in our protected records and used only for visits you have agreed to.",
        },
        {
          q: "Are your visits a property inspection?",
          a: "No. Our visits document visual observations — they are not a professional building inspection, engineering evaluation, or certification. See our role and limits section.",
        },
      ],
    },
    el: {
      kicker: "FAQ",
      heading: "Συχνές ερωτήσεις",
      items: [
        {
          q: "Θα λάβω φωτογραφίες και αναφορά μετά από κάθε επίσκεψη;",
          a: "Το πακέτο Φροντίδα Ακινήτου περιλαμβάνει φωτογραφίες και αναφορά μετά από κάθε προγραμματισμένη επίσκεψη. Το πακέτο Πλήρης Φροντίδα περιλαμβάνει αναλυτική αναφορά μετά την πλήρη μηνιαία επίσκεψη, ενώ η σύντομη μηνιαία συμπληρωματική επίσκεψη περιλαμβάνει μια σύντομη φωτογραφική ενημέρωση με ημερομηνία. Ο Γρήγορος Έλεγχος δεν περιλαμβάνει τακτικές φωτογραφίες ή αναφορά — κάθε επίσκεψη όμως καταγράφεται.",
        },
        {
          q: "Τι γίνεται αν παρατηρήσετε κάποιο πρόβλημα;",
          a: "Σας ενημερώνουμε αμέσως με τις παρατηρήσεις μας. Κάθε εργασία ή δαπάνη προχωρά μόνο με την έγκρισή σας ή σύμφωνα με την γραπτή εξουσιοδότηση έκτακτης ανάγκης που έχετε δώσει.",
        },
        {
          q: "Μπορείτε να δεχτείτε τεχνικούς ή παραλαβές;",
          a: "Ναι — κατόπιν συνεννόησης και εντολής σας. Κάθε τέτοια εξυπηρέτηση καταγράφεται και χρεώνεται ως υπηρεσία κατ' απαίτηση.",
        },
        {
          q: "Πώς πληρώνω;",
          a: "Τα μηνιαία πακέτα χρεώνονται ανά μήνα και οι υπηρεσίες κατ' απαίτηση ανά επίσκεψη. Οι λεπτομέρειες πληρωμής συμφωνούν γραπτώς πριν ξεκινήσουμε.",
        },
        {
          q: "Χρειάζεται να σας δώσω κλειδιά;",
          a: "Ναι, για τις επισκέψεις που το απαιτούν. Τα κλειδιά και τα στοιχεία πρόσβασης φυλάσσονται στα προστατευμένα αρχεία μας και χρησιμοποιούνται μόνο για επισκέψεις που έχετε συμφωνήσει.",
        },
        {
          q: "Είναι οι επισκέψεις σας επιθεώρηση ακινήτου;",
          a: "Όχι. Οι επισκέψεις μας τεκμηριώνουν οπτικές παρατηρήσεις — δεν αποτελούν επαγγελματική επιθεώρηση κτιρίου, μηχανική αξιολόγηση ή πιστοποίηση. Δείτε την ενότητα «Ο ρόλος μας και τα όριά μας».",
        },
      ],
    },
  },
  contact: {
    en: {
      kicker: "Meet your local contact",
      heading: "One person you know by name.",
    },
    el: {
      kicker: "Ο τοπικός σας επαφή",
      heading: "Ένα πρόσωπο που γνωρίζετε εξ ονόματός σας.",
    },
  },
};

// ---- Merge / resolve ------------------------------------------------------

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// Merges stored section content over the defaults. Objects merge per field;
// arrays replace the default whenever present (an explicitly emptied list is
// respected); null/undefined values fall back to the default.
export function mergeSection(defaults, stored) {
  if (!isPlainObject(stored) || !isPlainObject(defaults)) return defaults;
  const out = { ...defaults };
  for (const k of Object.keys(stored)) {
    const s = stored[k];
    if (s == null) continue;
    const d = defaults[k];
    if (isPlainObject(s) && isPlainObject(d)) out[k] = mergeSection(d, s);
    else out[k] = s;
  }
  return out;
}

// Language-resolved content for one section. `sections` is the raw published
// map from the feed (or null), falling back to DEFAULT_CONTENT.
export function sectionContent(sections, key, lang) {
  const merged = mergeSection(DEFAULT_CONTENT[key], sections && sections[key]);
  return lang === "el" ? merged.el : merged.en;
}

// ---- Editor field schema --------------------------------------------------

// Field types: "text" | "textarea" | "stringList" | "steps" | "trustItems" | "faqs"
// elOnly fields render a single Greek input (their English counterpart comes
// from elsewhere — e.g. the Complete Care service record).
export const EDITOR_SCHEMA = {
  hero: {
    label: "Hero",
    fields: [
      { key: "badge", label: "Location badge", type: "text" },
      { key: "title", label: "Headline", type: "text" },
      { key: "subtitle", label: "Intro paragraph", type: "textarea", rows: 5 },
      { key: "ctaPrimary", label: "Primary button", type: "text" },
      { key: "ctaSecondary", label: "Secondary button", type: "text" },
    ],
  },
  services: {
    label: "Services",
    info:
      "Prices, hourly rates, time allowances and visit counts are never edited here — they come live from your Service Package records via the secure pricing feed. " +
      "This tab manages the public wording of all seven service cards. In the wording you can use the placeholders {price} and {hourly}; they are replaced with the live amounts when the page is viewed, so the text can never show a stale price.",
    fields: [
      { key: "kicker", label: "Small label above the heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro paragraph", type: "textarea", rows: 3 },
      { key: "groupHeading", label: "Recurring plans — group heading", type: "text" },
      { key: "note", label: "Bottom note", type: "textarea", rows: 2 },
      { key: "cards", label: "Service card wording", type: "serviceCards" },
    ],
  },
  add_on_services: {
    label: "Add-on Services",
    info: "Heading for the On-Demand Services group inside the pricing section. The services and their prices come live from the pricing feed.",
    fields: [{ key: "heading", label: "Group heading", type: "text" }],
  },
  how_it_works: {
    label: "How It Works",
    fields: [
      { key: "kicker", label: "Small label above the heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "steps", label: "Steps (in order)", type: "steps" },
    ],
  },
  why_us: {
    label: "Why Us",
    fields: [
      { key: "kicker", label: "Small label above the heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "items", label: "Trust cards", type: "trustItems" },
    ],
  },
  service_area: {
    label: "Service Area",
    fields: [
      { key: "kicker", label: "Small label above the heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro paragraph", type: "textarea", rows: 3 },
      { key: "areas", label: "Area chips", type: "stringList" },
      {
        key: "travel_notes",
        label: "Travel & emergency notes",
        type: "stringList",
        info: "Travel wording and emergency-availability limits shown beneath the area chips. No amounts or fees may be entered here — charges are only agreed per property, in writing.",
      },
    ],
  },
  faqs: {
    label: "FAQs",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "items", label: "Questions", type: "faqs" },
    ],
  },
  contact: {
    label: "Contact",
    info: "This tab edits the section's display text. The contact details, profile photo and local photo are managed in Settings → Owner Profile and appear on the website live via the secure feed.",
    fields: [
      { key: "kicker", label: "Small label above the heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
    ],
  },
};