import React from "react";
import { MapPin } from "lucide-react";
import { useSectionContent } from "@/components/website/WebsiteContentContext";

// Copy comes from the website content model (published via the admin
// editor), falling back to the built-in defaults when nothing is published.
export default function ServiceArea() {
  const c = useSectionContent("service_area");
  const areas = Array.isArray(c.areas) ? c.areas : [];

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
          <p className="mt-3 text-muted-foreground leading-relaxed">{c.intro}</p>
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