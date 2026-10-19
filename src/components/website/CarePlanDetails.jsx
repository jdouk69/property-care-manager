import React from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/website/serviceTerms";

const PLANS = {
  quick_check: {
    en: {name: "Quick Check", schedule: "One visit per month · 15–30 minutes", best: "Choose this when you want a brief general visual check of your property, with photos and a brief visit report.", includes: [
      "Quick exterior walk-around and, where agreed and permitted, an interior walk-through.",
      "Observe whether doors, gates and windows appear secure; look for obvious damage, vandalism or signs of forced entry.",
      "Look for obvious water leaks, moisture or water intrusion and pest activity encountered during the visit.",
      "Observe whether electricity appears available where reasonably observable; visually check accessible grounds, balconies and the pool where applicable.",
      "Notify you of concerning problems and take problem photographs when a problem is found.",
      "Confirm the property is secured before leaving. Every visit is recorded internally."
    ], reports: "Photos and a brief visit report after every scheduled Quick Check visit, with problem photographs and notification when a concern is found.", excludes: "Detailed monitoring, operating appliances, repairs and professional building inspections are not included."},
    el: {name: "Γρήγορος Έλεγχος", schedule: "Μία επίσκεψη τον μήνα · 15–30 λεπτά", best: "Επιλέξτε αυτή την υπηρεσία για έναν σύντομο γενικό οπτικό έλεγχο του ακινήτου σας, με φωτογραφίες και σύντομη αναφορά επίσκεψης.", includes: [
      "Σύντομος εξωτερικός έλεγχος και εσωτερική περιήγηση μόνο όπου έχει συμφωνηθεί και επιτρέπεται.",
      "Οπτικός έλεγχος ασφάλισης θυρών, πυλών και παραθύρων, για εμφανείς ζημιές, βανδαλισμό ή ενδείξεις παραβίασης.",
      "Παρατήρηση εμφανών διαρροών, υγρασίας ή εισροής νερού και ενδείξεων παρασίτων που συναντούμε κατά την επίσκεψη.",
      "Παρατήρηση διαθεσιμότητας ρεύματος όπου είναι εύλογα ορατή, και οπτικός έλεγχος προσβάσιμων εξωτερικών χώρων, μπαλκονιών και πισίνας, όπου υπάρχει.",
      "Ενημέρωσή σας και φωτογράφιση του προβλήματος όταν εντοπιστεί ανησυχητικό ζήτημα.",
      "Επιβεβαίωση ασφάλισης πριν την αναχώρηση. Κάθε επίσκεψη καταγράφεται εσωτερικά."
    ], reports: "Φωτογραφίες και σύντομη αναφορά μετά από κάθε προγραμματισμένη επίσκεψη Quick Check, με φωτογραφίες προβλημάτων και ενημέρωση όταν εντοπιστεί ανησυχητικό ζήτημα.", excludes: "Δεν περιλαμβάνονται αναλυτική παρακολούθηση, λειτουργία συσκευών, επισκευές ή επαγγελματικές επιθεωρήσεις κτιρίων."}
  },
  property_care: {
    en: {name: "Property Care", schedule: "One visit per month · 30–45 minutes", best: "More thorough visual checks, your selected priorities, photos and a report.", includes: [
      "More complete exterior visual check and, where permitted, an interior walk-through.",
      "Check visible security of doors, gates and windows; observe damage, vandalism, water leaks and pest signs.",
      "Observe accessible grounds, balconies and pool condition where applicable, and whether electricity appears available where reasonably observable.",
      "Look for visible moisture or mold and obvious leaks under accessible sinks.",
      "Monitor the specific areas and visible concerns agreed with you during onboarding.",
      "Take routine property photos, document concerns and photograph problems where applicable; provide a written visit report and notify you when necessary.",
      "Confirm the property is secured before leaving."
    ], reports: "Routine photos and a written report after the scheduled visit, with concerns documented.", excludes: "The Complete Care appliance and fixture checks and a second monthly follow-up visit are not included."},
    el: {name: "Φροντίδα Ακινήτου", schedule: "Μία επίσκεψη τον μήνα · 30–45 λεπτά", best: "Πιο διεξοδικοί οπτικοί έλεγχοι, οι προτεραιότητές σας, φωτογραφίες και αναφορά.", includes: [
      "Πιο ολοκληρωμένος εξωτερικός οπτικός έλεγχος και εσωτερική περιήγηση όπου επιτρέπεται.",
      "Οπτικός έλεγχος ασφάλισης θυρών, πυλών και παραθύρων, ζημιών, βανδαλισμού, διαρροών και ενδείξεων παρασίτων.",
      "Παρατήρηση προσβάσιμων εξωτερικών χώρων, μπαλκονιών, πισίνας όπου υπάρχει και διαθεσιμότητας ρεύματος όπου είναι εύλογα ορατή.",
      "Παρατήρηση ορατής υγρασίας ή μούχλας και εμφανών διαρροών κάτω από προσβάσιμους νεροχύτες και νιπτήρες.",
      "Παρακολούθηση συγκεκριμένων σημείων και ορατών ζητημάτων που συμφωνήθηκαν κατά την έναρξη.",
      "Τακτικές φωτογραφίες ακινήτου, καταγραφή ζητημάτων και φωτογράφιση προβλημάτων όπου χρειάζεται, γραπτή αναφορά και ενημέρωσή σας όταν είναι απαραίτητο.",
      "Επιβεβαίωση ασφάλισης πριν την αναχώρηση."
    ], reports: "Τακτικές φωτογραφίες και γραπτή αναφορά μετά την προγραμματισμένη επίσκεψη, με καταγραφή ζητημάτων.", excludes: "Δεν περιλαμβάνονται οι έλεγχοι λειτουργίας συσκευών του Complete Care ή δεύτερη μηνιαία επίσκεψη."}
  },
  complete_care: {
    en: {name: "Complete Care", schedule: "Two visits per month · one full visit up to 60 minutes + one follow-up up to 30 minutes", best: "Detailed visual care, agreed practical checks and a second monthly follow-up.", includes: [
      "All Property Care visual checks, with a more detailed review of accessible exterior and permitted interior areas, grounds, balconies and pool condition.",
      "Expanded owner-selected monitoring priorities, more detailed photo documentation and a detailed written report after the full visit.",
      "Run agreed faucets, flush selected toilets and operate selected lights.",
      "Check whether the agreed refrigerator, freezer or other selected appliances appear to operate, and briefly operate agreed AC units.",
      "Visually observe pool equipment condition where applicable. These are basic observations, not technical tests or servicing.",
      "Recheck previously identified concerns, track unresolved issues and give them priority attention within the agreed service.",
      "Document problems, notify you when needed and confirm the property is secured before leaving.",
      "A second, brief follow-up visit with a short dated photo update; this is not a second full checklist visit."
    ], reports: "Routine photos and a detailed report after the full visit, plus a short dated photo update after the brief follow-up.", excludes: "Repairs, appliance servicing, pool maintenance and professional technical diagnosis are not included."},
    el: {name: "Πλήρης Φροντίδα", schedule: "Δύο επισκέψεις τον μήνα · μία πλήρης έως 60 λεπτά + ένας επανέλεγχος έως 30 λεπτά", best: "Αναλυτική οπτική φροντίδα, συμφωνημένοι πρακτικοί έλεγχοι και δεύτερος μηνιαίος επανέλεγχος.", includes: [
      "Όλοι οι οπτικοί έλεγχοι του Property Care, με πιο αναλυτική παρατήρηση προσβάσιμων εξωτερικών και επιτρεπόμενων εσωτερικών χώρων, μπαλκονιών και πισίνας.",
      "Διευρυμένες προτεραιότητες που επιλέγετε, αναλυτικότερη φωτογραφική τεκμηρίωση και λεπτομερής γραπτή αναφορά μετά την πλήρη επίσκεψη.",
      "Άνοιγμα συμφωνημένων βρυσών, χρήση επιλεγμένων καζανακίων και λειτουργία επιλεγμένων φώτων.",
      "Παρατήρηση αν το συμφωνημένο ψυγείο, ο καταψύκτης ή άλλες επιλεγμένες συσκευές φαίνονται να λειτουργούν και σύντομη λειτουργία συμφωνημένων κλιματιστικών.",
      "Οπτική παρατήρηση εξοπλισμού πισίνας όπου υπάρχει. Πρόκειται για βασικές παρατηρήσεις, όχι τεχνικές δοκιμές ή συντήρηση.",
      "Επανέλεγχος γνωστών ζητημάτων, παρακολούθηση εκκρεμοτήτων και προτεραιότητα σε αυτά εντός της συμφωνημένης υπηρεσίας.",
      "Καταγραφή προβλημάτων, ενημέρωσή σας όταν χρειάζεται και επιβεβαίωση ασφάλισης πριν την αναχώρηση.",
      "Δεύτερος σύντομος επανέλεγχος με φωτογραφική ενημέρωση με ημερομηνία· δεν αποτελεί δεύτερη πλήρη επίσκεψη."
    ], reports: "Τακτικές φωτογραφίες και αναλυτική αναφορά μετά την πλήρη επίσκεψη, συν σύντομη φωτογραφική ενημέρωση με ημερομηνία μετά τον επανέλεγχο.", excludes: "Δεν περιλαμβάνονται επισκευές, συντήρηση συσκευών ή πισίνας και επαγγελματική τεχνική διάγνωση."}
  }
};

export default function CarePlanDetails({ services, lang, single = false }) {
  const el = lang === "el";
  return <div className="space-y-6">
    {!single && <nav aria-label={el ? "Επιλογή πακέτου" : "Choose a plan"} className="flex flex-wrap gap-2">{services.map(s => <a key={s.service_key} href={`#${s.service_key}`} className="inline-flex min-h-11 items-center rounded-full border border-primary/30 px-4 text-sm font-semibold text-primary">{PLANS[s.service_key][el ? "el" : "en"].name}</a>)}</nav>}
    {services.map(s => { const p = PLANS[s.service_key][el ? "el" : "en"]; return <article key={s.service_key} id={s.service_key} className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 sm:p-7">
      <h2 className="font-heading text-2xl font-bold text-foreground">{p.name}</h2>
      <p className="mt-2 text-2xl font-bold text-primary">€{formatPrice(s.price)} <span className="text-sm font-normal">{el ? "τον μήνα · με ΦΠΑ" : "per month · VAT included"}</span></p>
      <p className="mt-3 font-semibold">{p.schedule}</p><p className="mt-2 text-muted-foreground">{p.best}</p>
      <h3 className="mt-5 font-semibold">{el ? "Τι περιλαμβάνεται" : "What is included"}</h3>
      <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-relaxed">{p.includes.map(t => <li key={t}>{t}</li>)}</ul>
      <div className="mt-5 rounded-xl bg-primary/5 p-4"><h3 className="font-semibold">{el ? "Φωτογραφίες και αναφορές" : "Photos and reports"}</h3><p className="mt-2 text-sm leading-relaxed">{p.reports}</p></div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.excludes}</p>
      {s.hourly_rate != null && s.service_key !== "quick_check" && <p className="mt-3 text-sm">{el ? "Συμφωνημένος επιπλέον χρόνος:" : "Agreed extra time:"} €{formatPrice(s.hourly_rate)}/{el ? "ώρα" : "hour"}.</p>}
    </article>; })}
    <aside className="rounded-2xl border border-border p-5 text-sm leading-relaxed"><h2 className="font-semibold">{el ? "Όρια που ισχύουν για όλα τα πακέτα" : "Limits that apply to every plan"}</h2><p className="mt-2">{el ? "Οι εργασίες συμφωνούνται εκ των προτέρων ανάλογα με το ακίνητο, την πρόσβαση και τον διαθέσιμο χρόνο. Εσωτερικές εργασίες γίνονται μόνο όπου επιτρέπεται. Σε ιδιωτικές κατοικίες με προσωπικά αντικείμενα ιδιοκτήτη, οι επισκέψεις είναι αποκλειστικά εξωτερικές. Δεν περιλαμβάνονται επαγγελματική επιθεώρηση κτιρίου, πιστοποίηση, επισκευές, τεχνική συντήρηση, διαχείριση κατασκευών ή εγγύηση εντοπισμού κάθε προβλήματος. Τυχόν πρόσθετες εργασίες ή έξοδα απαιτούν προηγούμενη συμφωνία." : "The applicable tasks are agreed for your property, access and included visit time. Interior tasks apply only where interior access is permitted. Private homes with the owner's personal belongings receive exterior-only visits. No plan includes a professional building inspection, certification, repairs, trade maintenance, construction management or a guarantee that every problem will be detected. Additional work or spending requires prior agreement."}</p></aside>
    {!single && <Link to="/service-details" className="inline-flex min-h-11 items-center font-semibold text-primary underline">{el ? "Δείτε Εφάπαξ Υπηρεσίες & Τιμές" : "Explore One-Time Services & Prices"}</Link>}
  </div>;
}
