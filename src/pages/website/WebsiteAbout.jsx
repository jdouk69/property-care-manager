import React from "react";
import { Button } from "@/components/ui/button";
import WebsiteHashLink from "@/components/website/WebsiteHashLink";
import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import usePageMeta from "@/lib/seo";

// Public About page — static, bilingual copy describing the service,
// who it is for, and who owns/operates it.
export default function WebsiteAbout() {
  const { lang } = useLanguage();
  const el = lang === "el";
  usePageMeta({
    title: "About | Property Care Crete",
    description:
      "Learn about Property Care Crete and our practical home watch, property care and owner support services in Chania and Western Crete.",
  });

  return (
    <div className="website-theme min-h-screen bg-background">
      <WebsiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {el ? "Ποιοι είμαστε" : "Who we are"}
        </p>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-foreground">
          {el ? "Σχετικά με το Property Care Crete" : "About Property Care Crete"}
        </h1>

        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          <p>
            {el
              ? "Το Property Care Crete προσφέρει προγραμματισμένες επισκέψεις φροντίδας κατοικιών στα Χανιά και τη Δυτική Κρήτη. Ελέγχουμε προσβάσιμους χώρους, καταγράφουμε όσα παρατηρούμε και σας ενημερώνουμε όταν κάτι χρειάζεται προσοχή. Τα Property Care και Complete Care περιλαμβάνουν τακτικές φωτογραφίες και αναφορά προς τον πελάτη. Το Quick Check είναι μια σύντομη επίσκεψη χωρίς αυτές τις τακτικές παροχές."
              : "Property Care Crete provides scheduled home watch and property care in Chania and Western Crete. We check accessible areas, record visible observations and contact you when something needs attention. Property Care and Complete Care include routine photos and a customer visit report; Quick Check is a brief visit without those routine deliverables."}
          </p>
          <p>
            {el
              ? "Βοηθάμε ιδιοκτήτες βιλών, διαμερισμάτων και εξοχικών να γνωρίζουν τι παρατηρήθηκε στο σπίτι τους όσο λείπουν. Μπορούμε να οργανώσουμε προετοιμασία άφιξης, προμήθειες τροφίμων, φύλαξη κλειδιών και πρόσβαση εγκεκριμένων επαγγελματιών. Το αντικείμενο κάθε υπηρεσίας συμφωνείται εκ των προτέρων."
              : "We help owners of villas, apartments and holiday homes stay informed while they are away. Arrival preparation, grocery stocking, key holding and access for approved contractors can be arranged. The scope of each service is agreed with you in advance."}
          </p>
          <p>
            {el
              ? "Είμαι ο Δημήτριος, ο άνθρωπός σας στο Property Care Crete. Η πρακτική μου εμπειρία στις κατασκευές και στις εργασίες εργοταξίου με βοηθά να παρατηρώ τι μπορεί να χρειάζεται προσοχή. Καταγράφω όσα είναι ορατά και βοηθώ στον συντονισμό κατάλληλων επαγγελματιών. Οι επισκέψεις είναι οπτικοί έλεγχοι και δεν αποτελούν τεχνική επιθεώρηση ή αξιολόγηση μηχανικού."
              : "I’m Demetrios, your local contact at Property Care Crete. My hands-on background in construction and site work informs my practical approach to looking after homes. I document what is visible and help coordinate the right professionals when needed. Visits are visual checks, not building inspections or engineering assessments."}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <WebsiteHashLink href="#assessment">
              {el ? "Μιλήστε με τον Δημήτριο" : "Talk to Demetrios"}
            </WebsiteHashLink>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <WebsiteHashLink href="#services">
              {el ? "Δείτε τις Υπηρεσίες & Τιμές" : "See Services & Pricing"}
            </WebsiteHashLink>
          </Button>
        </div>
      </main>
      <WebsiteFooter />
    </div>
  );
}