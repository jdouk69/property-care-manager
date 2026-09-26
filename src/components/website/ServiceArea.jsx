import React from "react";
import { MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ServiceArea() {
  const { lang } = useLanguage();
  const el = lang === "el";

  const areas = el
    ? ["Χανιά (πόλη)", "Ακρωτήρι", "Πλατανιάς", "Κολυμβάρι", "Αποκόρωνας", "Κίσσαμος"]
    : ["Chania (town)", "Akrotiri", "Platanias", "Kolymvari", "Apokoronas", "Kissamos"];

  return (
    <section id="area" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Περιοχή εξυπηρέτησης" : "Service area"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Με έδρα την ευρύτερη περιοχή των Χανίων." : "Based in the greater Chania area."}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {el
              ? "Καλύπτουμε την πόλη των Χανίων και τις γύρω περιοχές της Δυτικής Κρήτης. Αν το ακίνητό σας βρίσκεται πιο μακριά, ρωτήστε μας — το εξετάζουμε κατά την αξιολόγηση."
              : "We cover the town of Chania and the surrounding areas of western Crete. If your property lies further afield, just ask — we review it during the assessment."}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {areas.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" /> {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}