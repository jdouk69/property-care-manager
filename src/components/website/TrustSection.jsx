import React from "react";
import { FileCheck, Camera, BadgeEuro, UserCheck, KeySquare, ShieldCheck } from "lucide-react";
import { useSectionContent } from "@/components/website/WebsiteContentContext";

// Copy comes from the website content model (published via the admin
// editor), falling back to the built-in defaults when nothing is published.
// Icons stay fixed per card position (part of the design, not the copy).
const ICONS = [FileCheck, Camera, BadgeEuro, UserCheck, KeySquare, ShieldCheck];

export default function TrustSection() {
  const c = useSectionContent("why_us");
  const items = (Array.isArray(c.items) ? c.items : []).map((item, i) => ({
    title: item?.title || "",
    text: item?.text || "",
    icon: ICONS[i % ICONS.length],
  }));

  return (
    <section id="trust" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {c.kicker}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {c.heading}
          </h2>
        </div>
        <div className="mt-6 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.title} className="flex gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <i.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">{i.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}