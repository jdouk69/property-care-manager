import React from "react";
import { MapPin, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArchMotif from "@/components/website/ArchMotif";
import { useSectionContent } from "@/components/website/WebsiteContentContext";

// Copy comes from the website content model (published via the admin
// editor), falling back to the built-in defaults when nothing is published.
export default function WebsiteHero() {
  const c = useSectionContent("hero");

  return (
    <section id="top" className="website-navy relative overflow-hidden">
      <ArchMotif className="pointer-events-none absolute -bottom-8 left-1/2 w-[720px] max-w-none -translate-x-1/2 text-white/10" />
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 sm:pt-24 sm:pb-28 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
          <MapPin className="w-3.5 h-3.5" />
          {c.badge}
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-3xl sm:text-5xl font-bold leading-tight text-white">
          {c.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/75 leading-relaxed">
          {c.subtitle}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="w-full sm:w-auto rounded-lg h-12 px-7">
            <a href="#assessment">
              <ClipboardCheck className="w-4 h-4" />
              {c.ctaPrimary}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-lg h-12 px-7 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <a href="#services">{c.ctaSecondary}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}