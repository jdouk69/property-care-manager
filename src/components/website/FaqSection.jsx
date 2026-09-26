import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function FaqSection() {
  const { lang } = useLanguage();
  const el = lang === "el";

  const faqs = [
    {
      q: el ? "Θα λάβω φωτογραφίες και αναφορά μετά από κάθε επίσκεψη;" : "Will I receive photos and a report after each visit?",
      a: el
        ? "Τα πακέτα Φροντίδα Ακινήτου και Πλήρης Φροντίδα περιλαμβάνουν φωτογραφίες και αναφορά επίσκεψης μετά από κάθε επίσκεψη. Ο Γρήγορος Έλεγχος δεν περιλαμβάνει τακτικές φωτογραφίες ή αναφορά προς τον ιδιοκτήτη — κάθε επίσκεψη όμως καταγράφεται."
        : "Property Care and Complete Care plans include photos and a visit report after every visit. Quick Check does not include routine photos or a customer-facing report — but every visit is still recorded.",
    },
    {
      q: el ? "Τι γίνεται αν παρατηρήσετε κάποιο πρόβλημα;" : "What happens if you notice a problem?",
      a: el
        ? "Σας ενημερώνουμε αμέσως με τις παρατηρήσεις μας. Κάθε εργασία ή δαπάνη προχωρά μόνο με την έγκρισή σας ή σύμφωνα με την γραπτή εξουσιοδότηση έκτακτης ανάγκης που έχετε δώσει."
        : "We notify you immediately with what we observed. Any work or spending proceeds only with your approval, or in line with the written emergency authorization you have given us.",
    },
    {
      q: el ? "Μπορείτε να δεχτείτε τεχνικούς ή παραλαβές;" : "Can you let in tradespeople or accept deliveries?",
      a: el
        ? "Ναι — κατόπιν συνεννόησης και εντολής σας. Κάθε τέτοια εξυπηρέτηση καταγράφεται και χρεώνεται ως υπηρεσία κατ' απαίτηση."
        : "Yes — arranged in advance and on your instruction. Every such visit is documented and charged as an on-demand service.",
    },
    {
      q: el ? "Πώς πληρώνω;" : "How do I pay?",
      a: el
        ? "Τα μηνιαία πακέτα χρεώνονται ανά μήνα και οι υπηρεσίες κατ' απαίτηση ανά επίσκεψη. Οι λεπτομέρειες πληρωμής συμφωνούν γραπτώς πριν ξεκινήσουμε."
        : "Monthly plans are billed per month and on-demand services per visit. Payment details are agreed in writing before we start.",
    },
    {
      q: el ? "Χρειάζεται να σας δώσω κλειδιά;" : "Do I need to give you keys?",
      a: el
        ? "Ναι, για τις επισκέψεις που το απαιτούν. Τα κλειδιά και οι κωδικοί φυλάσσονται με ασφάλεια, και κάθε χρήση τους καταγράφεται."
        : "Yes, for visits that require access. Keys and codes are stored securely, and every use is logged.",
    },
    {
      q: el ? "Είναι οι επισκέψεις σας επιθεώρηση ακινήτου;" : "Are your visits a property inspection?",
      a: el
        ? "Όχι. Οι επισκέψεις μας τεκμηριώνουν οπτικές παρατηρήσεις — δεν αποτελούν επαγγελματική επιθεώρηση κτιρίου, μηχανική αξιολόγηση ή πιστοποίηση. Δείτε την ενότητα «Ο ρόλος μας και τα όριά μας»."
        : "No. Our visits document visual observations — they are not a professional building inspection, engineering evaluation, or certification. See our role and limits section.",
    },
  ];

  return (
    <section id="faq" className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Συχνές ερωτήσεις" : "Frequently asked questions"}
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm sm:text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}