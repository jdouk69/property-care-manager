import React from "react";
import { User, Phone, Mail, MessageCircle, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// PLACEHOLDER SECTION — deliberately not final. The owner must provide the
// real name, photo, short introduction, phone, email and WhatsApp before
// launch, plus a genuine local/property photo. Nothing here is invented.
export default function LocalContact() {
  const { lang } = useLanguage();
  const el = lang === "el";

  return (
    <section id="local-contact" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Ο τοπικός σας επαφή" : "Meet your local contact"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Ένα πρόσωπο που γνωρίζετε εξ ονόματός σας." : "One person you know by name."}
          </h2>
        </div>
        <div className="mt-6 sm:mt-10 grid gap-6 rounded-2xl border border-border bg-card p-4 sm:p-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">[Όνομα / Name]</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {el
                ? "[Σύντομη προσωπική παρουσίαση — ποιος είστε, πόσο καιρό ζείτε και εργάζεστε στην περιοχή των Χανίων και γιατί ξεκινήσατε τη φροντίδα ακινήτων.]"
                : "[A short personal introduction — who you are, how long you have lived and worked in the Chania area, and why you started caring for properties.]"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Phone, label: "[Phone]" },
                { icon: Mail, label: "[Email]" },
                { icon: MessageCircle, label: "[WhatsApp]" },
              ].map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  <c.icon className="w-3.5 h-3.5" /> {c.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs italic text-muted-foreground">
              {el
                ? "Προσωρινό πεδίο — τα πραγματικά στοιχεία θα τοποθετηθούν πριν τη δημοσίευση."
                : "Placeholder — the real details will be provided by the owner before publication."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex h-40 sm:h-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card text-muted-foreground">
          <ImageIcon className="w-8 h-8" />
          <p className="px-4 text-center text-xs">
            {el
              ? "[Πραγματική τοπική φωτογραφία / φωτογραφία ακινήτου — θα παρασχεθεί από τον ιδιοκτήτη]"
              : "[Genuine local / property photo — to be provided by the owner]"}
          </p>
        </div>
      </div>
    </section>
  );
}