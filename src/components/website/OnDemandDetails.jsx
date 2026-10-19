import React from "react";
import ServiceDetailsDialog from "@/components/website/ServiceDetailsDialog";
import { Check, X } from "lucide-react";
import { billingUnitLabel, formatPrice } from "@/lib/website/serviceTerms";

const DETAILS = {
  quick_check_one_time: {
    en: {
      name: "On-Demand Quick Check",
      choice: "Choose this when you want a brief general visual check of your property, with photos and a brief visit report.",
      includes: [
        "One brief visual visit, 15–30 minutes.",
        "A look for obvious leaks or water issues, visible moisture, damage, signs of forced entry, damaged doors or windows, and other clearly unusual conditions.",
        "Photos and a brief visit report are included. Any unusual findings are documented and brought to your attention.",
      ],
      excludes: [
        "Monthly repeat visits.",
        "A detailed report beyond the brief visit report.",
        "Repairs, maintenance, contractor coordination, or a professional building inspection.",
      ],
      priceNote: "One visit; no monthly subscription.",
    },
    el: {
      name: "Quick Check κατ’ Απαίτηση",
      choice: "Επιλέξτε αυτή την υπηρεσία για έναν σύντομο γενικό οπτικό έλεγχο του ακινήτου σας, με φωτογραφίες και σύντομη αναφορά επίσκεψης.",
      includes: [
        "Μία σύντομη οπτική επίσκεψη, 15–30 λεπτά.",
        "Έλεγχος για εμφανείς διαρροές ή προβλήματα νερού, ορατή υγρασία, ζημιές, ενδείξεις παραβίασης, φθαρμένες πόρτες ή παράθυρα και άλλες ασυνήθιστες ενδείξεις.",
        "Περιλαμβάνονται φωτογραφίες και σύντομη αναφορά επίσκεψης. Τυχόν ασυνήθιστα ευρήματα καταγράφονται και σας γνωστοποιούνται.",
      ],
      excludes: [
        "Μηνιαίες επαναλαμβανόμενες επισκέψεις.",
        "Αναλυτική αναφορά πέρα από τη σύντομη αναφορά επίσκεψης.",
        "Επισκευές, συντήρηση, συντονισμό τεχνιτών ή επαγγελματική επιθεώρηση κτιρίου.",
      ],
      priceNote: "Μία επίσκεψη, χωρίς μηνιαία συνδρομή.",
    },
  },
  on_demand_property_assistance: {
    en: {
      name: "On-Demand Property Assistance",
      choice: "Choose this when you need help with one specific task, such as checking whether the stove is off, closing shutters or taking a requested photo.",
      includes: [
        "One specific, reasonable property-related request defined by you in advance.",
        "Examples: check a concern or after a storm, take requested photos, open or secure the villa, provide access for a technician or delivery, retrieve an item, close shutters, or perform a basic non-specialist reset.",
        "The visit fee covers the first 30 minutes; additional time is shown below.",
      ],
      excludes: [
        "A full property inspection or scheduled care-plan checklist.",
        "Repairs, licensed trade work, technical diagnosis, or work outside the agreed request.",
        "Any work that has not been approved by you in advance.",
      ],
      priceNote: "First 30 minutes included; additional time €{hourly}/hour. One-time service, with no recurring agreement.",
    },
    el: {
      name: "Υποστήριξη Ακινήτου κατ’ Απαίτηση",
      choice: "Επιλέξτε αυτή την υπηρεσία για βοήθεια σε ένα συγκεκριμένο αίτημα, όπως έλεγχο αν η κουζίνα είναι σβηστή, κλείσιμο παντζουριών ή λήψη φωτογραφίας που ζητήσατε.",
      includes: [
        "Ένα συγκεκριμένο και εύλογο αίτημα για το ακίνητο, όπως το ορίζετε εκ των προτέρων.",
        "Παραδείγματα: έλεγχος ενός ζητήματος ή μετά από κακοκαιρία, φωτογραφίες που ζητήσατε, άνοιγμα ή ασφάλιση της βίλας, πρόσβαση τεχνικού ή παράδοσης, παραλαβή αντικειμένου, κλείσιμο παντζουριών ή μια απλή μη εξειδικευμένη επαναφορά.",
        "Η χρέωση επίσκεψης καλύπτει τα πρώτα 30 λεπτά· ο επιπλέον χρόνος αναφέρεται παρακάτω.",
      ],
      excludes: [
        "Πλήρη επιθεώρηση ακινήτου ή λίστα ελέγχου προγραμματισμένου πακέτου.",
        "Επισκευές, αδειοδοτημένες τεχνικές εργασίες, τεχνική διάγνωση ή εργασία εκτός του συμφωνημένου αιτήματος.",
        "Εργασία που δεν έχει εγκριθεί εκ των προτέρων από εσάς.",
      ],
      priceNote: "Περιλαμβάνονται τα πρώτα 30 λεπτά· επιπλέον χρόνος €{hourly}/ώρα. Εφάπαξ υπηρεσία, χωρίς επαναλαμβανόμενη συμφωνία.",
    },
  },
  seasonal_opening: {
    en: {
      name: "Seasonal Opening",
      includes: [
        "A visual walk-through after a period away and airing the villa as appropriate.",
        "The simple opening steps you approved for this visit in advance.",
        "A record of visible concerns and an update if something needs your attention.",
      ],
      excludes: [
        "Starting or adjusting utilities, pool equipment, alarms, or other systems without your specific recorded instructions.",
        "Plumbing, electrical, pool winterization, repairs, or licensed technical work.",
        "Unapproved tasks or time beyond the included allowance.",
      ],
      priceNote: "Up to 60 minutes on site; agreed additional time €{hourly}/hour.",
    },
    el: {
      name: "Εποχιακό Άνοιγμα",
      includes: [
        "Οπτικός έλεγχος μετά από περίοδο απουσίας και αερισμός της βίλας, όπου χρειάζεται.",
        "Τα απλά βήματα ανοίγματος που εγκρίνατε εκ των προτέρων για τη συγκεκριμένη επίσκεψη.",
        "Καταγραφή ορατών ζητημάτων και ενημέρωση αν κάτι χρειάζεται την προσοχή σας.",
      ],
      excludes: [
        "Ενεργοποίηση ή ρύθμιση παροχών, εξοπλισμού πισίνας, συναγερμών ή άλλων συστημάτων χωρίς συγκεκριμένες καταγεγραμμένες οδηγίες σας.",
        "Υδραυλικές, ηλεκτρολογικές, τεχνικές εργασίες πισίνας, επισκευές ή αδειοδοτημένες τεχνικές εργασίες.",
        "Μη εγκεκριμένες εργασίες ή χρόνο πέρα από το περιλαμβανόμενο όριο.",
      ],
      priceNote: "Έως 60 λεπτά επιτόπου· συμφωνημένος επιπλέον χρόνος €{hourly}/ώρα.",
    },
  },
  seasonal_closing: {
    en: {
      name: "Seasonal Closing",
      includes: [
        "The closing steps you approved for this visit in advance.",
        "A visual check of doors and shutters and securing the villa as instructed.",
        "Key return or storage according to your recorded instructions, plus an update about visible concerns.",
      ],
      excludes: [
        "Pool winterization, draining pipes, water-heater work, electrical or plumbing work, alarm work, or repairs.",
        "Licensed technical services; these can be coordinated with an appropriate provider if authorized.",
        "Unapproved tasks or time beyond the included allowance.",
      ],
      priceNote: "Up to 60 minutes on site; agreed additional time €{hourly}/hour.",
    },
    el: {
      name: "Εποχιακό Κλείσιμο",
      includes: [
        "Τα βήματα κλεισίματος που εγκρίνατε εκ των προτέρων για τη συγκεκριμένη επίσκεψη.",
        "Οπτικό έλεγχο πορτών και παντζουριών και ασφάλιση της βίλας σύμφωνα με τις οδηγίες σας.",
        "Επιστροφή ή φύλαξη κλειδιών σύμφωνα με τις καταγεγραμμένες οδηγίες σας και ενημέρωση για ορατά ζητήματα.",
      ],
      excludes: [
        "Εργασίες χειμερινής προετοιμασίας πισίνας, άδειασμα σωληνώσεων, θερμοσίφωνας, ηλεκτρολογικά ή υδραυλικά, συναγερμοί ή επισκευές.",
        "Αδειοδοτημένες τεχνικές υπηρεσίες· μπορούν να συντονιστούν με κατάλληλο επαγγελματία, εφόσον εγκριθεί.",
        "Μη εγκεκριμένες εργασίες ή χρόνο πέρα από το περιλαμβανόμενο όριο.",
      ],
      priceNote: "Έως 60 λεπτά επιτόπου· συμφωνημένος επιπλέον χρόνος €{hourly}/ώρα.",
    },
  },
  owner_representative_site_visit: {
    en: {
      name: "Contractor & Delivery Visit",
      choice: "Choose this when you need someone to attend on your behalf, meet a contractor or service provider, document visible progress or concerns, and report back to you.",
      includes: [
        "Attend the villa or project on your behalf and provide agreed access.",
        "Document observable progress or concerns with photos or video.",
        "Reasonable communication with the contractor or service provider and an update/report to you.",
      ],
      excludes: [
        "Certifying workmanship, construction supervision, engineering or architectural inspection, or code-compliance review.",
        "Licensed technical work, repairs, materials, or contractor charges.",
        "Extra time beyond the included allowance unless agreed.",
      ],
      priceNote: "First 60 minutes included; agreed additional time €{hourly}/hour.",
    },
    el: {
      name: "Επίσκεψη για Εργολάβο & Παραδόσεις",
      choice: "Επιλέξτε αυτή την υπηρεσία όταν χρειάζεστε κάποιον να παρευρεθεί εκ μέρους σας, να συναντήσει εργολάβο ή πάροχο υπηρεσιών, να καταγράψει την ορατή πρόοδο ή ζητήματα και να σας ενημερώσει.",
      includes: [
        "Παρουσία στη βίλα ή στο έργο εκ μέρους σας και παροχή της συμφωνημένης πρόσβασης.",
        "Καταγραφή ορατής προόδου ή ζητημάτων με φωτογραφίες ή βίντεο.",
        "Εύλογη επικοινωνία με εργολάβο ή πάροχο υπηρεσιών και ενημέρωση/αναφορά προς εσάς.",
      ],
      excludes: [
        "Πιστοποίηση εργασιών, επίβλεψη κατασκευής, μηχανικό ή αρχιτεκτονικό έλεγχο ή έλεγχο συμμόρφωσης με κανονισμούς.",
        "Αδειοδοτημένες τεχνικές εργασίες, επισκευές, υλικά ή χρεώσεις εργολάβων.",
        "Επιπλέον χρόνο πέρα από το περιλαμβανόμενο όριο, εκτός αν συμφωνηθεί.",
      ],
      priceNote: "Περιλαμβάνονται τα πρώτα 60 λεπτά· συμφωνημένος επιπλέον χρόνος €{hourly}/ώρα.",
    },
  },
  grocery_stocking: {
    en: {
      name: "Grocery Stocking",
      includes: [
        "Shop from the list and instructions you provide.",
        "Deliver the groceries to the short-term rental villa and put away the basics.",
        "Confirm the shopping and separate the grocery purchase from the service fee.",
      ],
      excludes: [
        "The cost of groceries, which is paid separately by the owner.",
        "Large or complex orders, unless the scope and any extra time are agreed in advance.",
        "Cleaning, extensive setup, or other arrival-preparation tasks.",
      ],
      priceNote: "The service fee is shown above; groceries are billed separately. Agreed additional service time €{hourly}/hour.",
    },
    el: {
      name: "Προμήθεια Τροφίμων",
      includes: [
        "Αγορές βάσει της λίστας και των οδηγιών που μας δίνετε.",
        "Παράδοση των προϊόντων στη βίλα βραχυχρόνιας μίσθωσης και τακτοποίηση των βασικών ειδών.",
        "Επιβεβαίωση της αγοράς· το κόστος των τροφίμων διαχωρίζεται από την αμοιβή υπηρεσίας.",
      ],
      excludes: [
        "Το κόστος των τροφίμων, το οποίο πληρώνεται ξεχωριστά από τον ιδιοκτήτη.",
        "Μεγάλες ή σύνθετες παραγγελίες, εκτός αν συμφωνηθούν εκ των προτέρων το εύρος και τυχόν επιπλέον χρόνος.",
        "Καθαρισμό, εκτεταμένη προετοιμασία ή άλλες εργασίες προετοιμασίας άφιξης.",
      ],
      priceNote: "Η αμοιβή υπηρεσίας εμφανίζεται παραπάνω· τα τρόφιμα χρεώνονται χωριστά. Συμφωνημένος επιπλέον χρόνος €{hourly}/ώρα.",
    },
  },
  emergency_visit: {
    en: {
      name: "Emergency Visit",
      includes: [
        "Urgent attendance for a reported concern such as a leak, intrusion, storm damage, or power issue.",
        "The first-hour on-site response, photos, an immediate owner update, and reasonable coordination while there.",
      ],
      excludes: [
        "Repairs, materials, contractor labor, specialist or licensed technical work, and third-party charges.",
        "Automatic approval for spending or repairs; we contact you for instructions unless a separate authorization is in place.",
        "Time beyond the first hour; additional time is charged at the rate shown below in 30-minute increments.",
      ],
      priceNote: "First 60 minutes included; additional time €{hourly}/hour, billed in 30-minute increments.",
    },
    el: {
      name: "Επείγουσα Επίσκεψη",
      includes: [
        "Άμεση παρουσία για αναφερόμενο ζήτημα, όπως διαρροή, παραβίαση, ζημιά από κακοκαιρία ή πρόβλημα ρεύματος.",
        "Ανταπόκριση επιτόπου για την πρώτη ώρα, φωτογραφίες, άμεση ενημέρωση του ιδιοκτήτη και εύλογο συντονισμό κατά την παρουσία μας.",
      ],
      excludes: [
        "Επισκευές, υλικά, εργασία εργολάβου, εξειδικευμένες ή αδειοδοτημένες τεχνικές εργασίες και χρεώσεις τρίτων.",
        "Αυτόματη έγκριση δαπάνης ή επισκευής· επικοινωνούμε μαζί σας για οδηγίες, εκτός αν υπάρχει ξεχωριστή εξουσιοδότηση.",
        "Χρόνο πέρα από την πρώτη ώρα· ο επιπλέον χρόνος χρεώνεται με την παρακάτω τιμή σε βήματα των 30 λεπτών.",
      ],
      priceNote: "Περιλαμβάνονται τα πρώτα 60 λεπτά· επιπλέον χρόνος €{hourly}/ώρα, σε βήματα των 30 λεπτών.",
    },
  },
};

function formatNote(template, hourly) {
  if (!template) return null;
  return template.replace("{hourly}", hourly == null ? "" : formatPrice(hourly));
}

export default function OnDemandDetails({ services, lang }) {
  const el = lang === "el";
  const copy = (lang === "el") ? "el" : "en";
  const entries = (services || []).filter((service) => DETAILS[service?.service_key]);
  if (!entries.length) return null;

  return (
    <section id="on-demand-details" className="scroll-mt-24 mt-7 rounded-3xl border border-primary/25 bg-primary/[0.035] p-4 sm:p-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {el ? "Αναλυτικά οι υπηρεσίες" : "Service details"}
        </p>
        <h4 className="mt-2 font-heading text-xl font-bold text-foreground sm:text-2xl">
          {el ? "Τι περιλαμβάνει κάθε εφάπαξ υπηρεσία" : "What each one-time service includes"}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {el
            ? "Οι παρακάτω υπηρεσίες αφορούν βίλες βραχυχρόνιας μίσθωσης. Οι εσωτερικές επισκέψεις συμφωνούνται εκ των προτέρων και γίνονται μόνο όταν έχει επιβεβαιωθεί ότι το ακίνητο είναι κενό και δεν διαμένει κανείς εκεί. Σε ιδιωτικές κατοικίες όπου παραμένουν τα προσωπικά αντικείμενα του ιδιοκτήτη, προσφέρουμε μόνο εξωτερικές επισκέψεις."
            : "The services below are for short-term rentals. Interior visits are agreed in advance and take place only when the property is confirmed vacant and no one is staying there. Private homes where the owner's personal belongings remain are exterior-only; we do not enter."}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {entries.map((service) => {
          const item = DETAILS[service.service_key][copy];
          const hourly = service.hourly_rate;
          return (
            <ServiceDetailsDialog key={service.service_key} title={item.name} lang={lang} trigger={
              <button type="button" className="flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5">
                <span className="min-w-0"><span className="block font-semibold leading-snug text-foreground">{item.name}</span><span className="mt-1 block text-sm font-semibold text-primary">€{formatPrice(service.price)} <span className="font-normal text-muted-foreground">{billingUnitLabel(service.billing_unit, lang)}</span></span>{item.choice && <span className="mt-2 block max-w-2xl text-sm font-normal leading-relaxed text-muted-foreground">{item.choice}</span>}</span>
                <span className="shrink-0 text-sm font-semibold text-primary">{el ? "Παροχές" : "View details"}</span>
              </button>
            }>
              <p className="mb-4 text-xl font-bold text-primary">€{formatPrice(service.price)} <span className="text-sm font-normal">{billingUnitLabel(service.billing_unit, lang)} · {el ? "με ΦΠΑ" : "VAT included"}</span></p>
              {item.choice && <p className="mb-4 rounded-xl bg-primary/5 p-4 text-sm font-semibold leading-relaxed">{item.choice}</p>}
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{el ? "Εσωτερική πρόσβαση μόνο σε επιβεβαιωμένα κενά ακίνητα βραχυχρόνιας μίσθωσης, κατόπιν συμφωνίας. Ιδιωτικές κατοικίες με προσωπικά αντικείμενα ιδιοκτήτη: αποκλειστικά εξωτερική επίσκεψη." : "Interior access is by agreement at confirmed vacant short-term rentals only. Private homes with the owner's personal belongings receive exterior-only visits."}</p>
              <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <h5 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      {el ? "Περιλαμβάνει" : "Included"}
                    </h5>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/80 marker:text-primary">
                      {item.includes.map((text) => <li key={text}>{text}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {el ? "Δεν περιλαμβάνει" : "Not included"}
                    </h5>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground">
                      {item.excludes.map((text) => <li key={text}>{text}</li>)}
                    </ul>
                  </div>
                </div>
                {item.priceNote && (
                  <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
                    {formatNote(item.priceNote, hourly)}
                  </p>
                )}
              </div>
            </ServiceDetailsDialog>
          );
        })}
      </div>
    </section>
  );
}
