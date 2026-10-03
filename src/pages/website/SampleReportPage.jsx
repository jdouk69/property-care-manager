import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, AlertCircle } from "lucide-react";
import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";
import SampleReportDocument from "@/components/website/SampleReportDocument";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import usePageMeta from "@/lib/seo";
import { buildSampleVisit } from "@/lib/sampleReport";
import { generateVisitReportPdf } from "@/lib/visitReport";

// Public sample visit report page: an accessible HTML preview of the sample
// report plus a downloadable PDF. Everything on this page is fixed
// illustrative content — never a real visit or customer record.
export default function SampleReportPage() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [busy, setBusy] = useState(false);
  usePageMeta({
    title: "Sample Visit Report | Property Care Crete",
    description: el
      ? "Υποδειγματική αναφορά επίσκεψης φροντίδας ακινήτου — τι παρατηρούμε και τεκμηριώνουμε κατά τις επισκέψεις μας στα Χανιά."
      : "An illustrative sample property-care visit report — what we observe and document during visits in Chania.",
  });

  const download = async () => {
    setBusy(true);
    try {
      const { visit, ctx } = buildSampleVisit(lang);
      await generateVisitReportPdf(visit, ctx);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="website-theme min-h-screen bg-background">
      <WebsiteHeader />
      <main className="py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4">
          <Link to="/landing-page" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            {el ? "Πίσω στην αρχική" : "Back to homepage"}
          </Link>

          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-foreground">
            {el ? "Υποδειγματική Αναφορά Επίσκεψης" : "Sample Visit Report"}
          </h1>

          <div className="mt-4 rounded-xl border border-report-gold/50 bg-report-cream p-4 space-y-1.5">
            <p className="flex items-start gap-2 text-sm font-semibold text-report-navy">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-report-gold" />
              {el
                ? "Υποδειγματικό παράδειγμα μόνο — δεν αφορά πραγματική επίσκεψη ή στοιχείο πελάτη."
                : "Illustrative example only—not a real visit or customer record."}
            </p>
            <p className="pl-6 text-sm font-semibold text-report-navy">
              {el
                ? "Εικόνες που δημιουργήθηκαν από τεχνητή νοημοσύνη — δεν αφορά ακίνητο πελάτη."
                : "AI-generated demonstration images—not a client's property."}
            </p>
          </div>

          <div className="mt-5 space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            <p>
              {el
                ? "Φωτογραφίες και αναφορές προς τον ιδιοκτήτη περιλαμβάνονται στα πακέτα Φροντίδα Ακινήτου και Πλήρης Φροντίδα, όχι στον Γρήγορο Έλεγχο. Οι επισκέψεις μας είναι πρακτικοί οπτικοί έλεγχοι — όχι επαγγελματικές επιθεωρήσεις κτιρίων."
                : "Photos and customer-facing reports are included with Property Care and Complete Care, but not with Quick Check. Our visits are practical visual checks—not professional building inspections."}
            </p>
            <p>
              {el
                ? "Η αναφορά καταγράφει οπτικές παρατηρήσεις σε προσβάσιμους χώρους τη στιγμή της επίσκεψης. Δεν αποτελεί επαγγελματική επιθεώρηση κτιρίου, μηχανική αξιολόγηση, πιστοποίηση ή εγγύηση ότι δεν υπάρχουν κρυφές ατέλειες."
                : "This report records visual observations in accessible areas at the time of the visit. It is not a professional building inspection, engineering evaluation, certification or guarantee that no hidden defects exist."}
            </p>
          </div>

          <div className="mt-6">
            <Button onClick={download} disabled={busy} size="lg" className="rounded-full h-11 px-7 gap-2">
              {busy ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
              {busy ? (el ? "Δημιουργία PDF…" : "Creating PDF…") : (el ? "Λήψη PDF" : "Download PDF")}
            </Button>
          </div>

          <div className="mt-8">
            <SampleReportDocument />
          </div>
        </div>
      </main>
      <WebsiteFooter />
    </div>
  );
}