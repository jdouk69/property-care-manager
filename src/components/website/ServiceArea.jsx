import React from "react";
import { MapPin } from "lucide-react";
import { useSectionContent } from "@/components/website/WebsiteContentContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Image } from "@/components/ui/image";

// Illustrative harbour scene beside the intro + location pills (approved mockup).
const HARBOUR_IMAGE = "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/31baddd84_47888091-B0B3-4DB4-886F-DA489ACA9AAD.png";

// Prominent travel-charge notice wording (no amounts, thresholds or
// calculation method are stated). The emergency-availability statement stays
// content-driven from the website editor (see the travel notice below).
const TRAVEL_NOTICE = {
  en: {
    heading: "Additional travel charges may apply",
    body:
      "Travel within our core service area is included. Properties outside this area may incur an additional travel charge. We confirm the charge during your property assessment and agree it with you in writing before service begins.",
    monthly:
      "For monthly plans, your quote will show the total monthly cost, including any agreed travel charges.",
  },
  el: {
    heading: "Ενδέχεται να ισχύει επιπλέον χρέωση μετακίνησης",
    body:
      "Η μετακίνηση εντός του βασικού μας χώρου εξυπηρέτησης περιλαμβάνεται. Για ακίνητα εκτός αυτής της περιοχής μπορεί να ισχύει επιπλέον χρέωση μετακίνησης. Επιβεβαιώνουμε τη χρέωση κατά την αξιολόγηση του ακινήτου σας και τη συμφωνούμε γραπτώς μαζί σας πριν ξεκινήσει η υπηρεσία.",
    monthly:
      "Για τα μηνιαία πακέτα, η προσφορά σας θα δείχνει το συνολικό μηνιαίο κόστος, συμπεριλαμβανομένων τυχόν συμφωνημένων χρεώσεων μετακίνησης.",
  },
};

// Copy comes from the website content model (published via the admin
// editor), falling back to the built-in defaults when nothing is published.
export default function ServiceArea() {
  const c = useSectionContent("service_area");
  const areas = Array.isArray(c.areas) ? c.areas : [];
  const travelNotes = Array.isArray(c.travel_notes) ? c.travel_notes : [];
  const { lang } = useLanguage();

  return (
    <section id="area" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {c.kicker}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {c.heading}
          </h2>
        </div>
        {/* Intro + location pills on the left, illustrative harbour scene on
            the right (desktop); stacked on mobile. ~4:3 crop, ratio reserved
            to prevent layout shift. Lazy-loaded. */}
        <div className="mt-6 grid items-start gap-6 sm:gap-8 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground leading-relaxed">{c.intro}</p>
            <div className="mt-6 flex flex-wrap gap-2">
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
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src={HARBOUR_IMAGE}
              alt={lang === "el"
                ? "Εικονογράφηση ενός μεσογειακού λιμανιού"
                : "Illustration of a Mediterranean harbour scene"}
              className="h-full w-full"
              fittingType="fill"
              loading="lazy"
            />
          </div>
        </div>
        {/* Prominent travel-charge notice: brass icon + bold heading, brass
            left border and subtle brass tint; always visible (no accordion /
            tooltip / small print). The emergency-availability statement
            follows as its own paragraph. */}
        <div className="mt-6 rounded-xl border border-border border-l-4 border-l-primary bg-accent/60 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
              {TRAVEL_NOTICE[lang].heading}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            {TRAVEL_NOTICE[lang].body}
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground">
            {TRAVEL_NOTICE[lang].monthly}
          </p>
          {travelNotes.length > 0 && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {travelNotes[travelNotes.length - 1]}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}