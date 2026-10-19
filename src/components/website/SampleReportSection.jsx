import React from "react";
import { Link } from "react-router-dom";
import { FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Homepage section introducing the sample visit report. The sample itself is
// fixed illustrative content (see src/lib/sampleReport.js) — never real visit
// records, and its photos are AI-generated demonstration images.
export default function SampleReportSection() {
  const { lang } = useLanguage();
  const el = lang === "el";

  return (
    <section id="sample-report" className="scroll-mt-20 py-10 sm:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Αναφορές Επισκέψεων" : "Visit Reports"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el
              ? "Δείτε τι μπορεί να περιλαμβάνει μια αναφορά επίσκεψης φροντίδας ακινήτου"
              : "See what a property-care visit report can include"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground leading-relaxed">
            {el
              ? "Μάθετε τι παρατηρήθηκε ενώ λείπατε: τις προτεραιότητες παρακολούθησης που έχετε επιλέξει, πρακτικές οπτικές παρατηρήσεις, φωτογραφίες και τυχόν ενέργειες παρακολούθησης που απαιτούν την έγκρισή σας."
              : "Know what was observed while you were away: your selected monitoring priorities, practical visual observations, photographs and any follow-up requiring your approval."}
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button asChild size="lg" className="rounded-full h-11 px-7 w-full max-w-xs sm:w-auto">
            <Link to="/sample-report">
              <FileText className="w-4 h-4" />
              {el ? "Δείτε Υποδειγματική Αναφορά" : "View Sample Report"}
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 max-w-md text-center">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
            {el
              ? "Υποδειγματικό παράδειγμα μόνο — δεν αφορά πραγματική επίσκεψη ή στοιχείο πελάτη. Οι εικόνες δημιουργήθηκαν από τεχνητή νοημοσύνη — δεν αφορά ακίνητο πελάτη."
              : "Illustrative example only — not a real visit or customer record. AI-generated demonstration images — not a client's property."}
          </p>
        </div>

        <p className="mt-6 mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground leading-relaxed">
          {el
            ? "Ο Γρήγορος Έλεγχος περιλαμβάνει φωτογραφίες και σύντομη αναφορά. Η Φροντίδα Ακινήτου περιλαμβάνει φωτογραφίες και γραπτή αναφορά, ενώ η Πλήρης Φροντίδα αναλυτική αναφορά μετά την πλήρη επίσκεψη και σύντομη φωτογραφική ενημέρωση μετά τον επανέλεγχο. Οι επισκέψεις μας είναι πρακτικοί οπτικοί έλεγχοι — όχι επαγγελματικές επιθεωρήσεις κτιρίων."
            : "Quick Check includes photos and a brief visit report. Property Care includes photos and a written report; Complete Care includes a detailed report after the full visit and a short dated photo update after the brief follow-up. Our visits are practical visual checks—not professional building inspections."}
        </p>
      </div>
    </section>
  );
}