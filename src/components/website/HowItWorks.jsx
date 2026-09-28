import React from "react";
import { useSectionContent } from "@/components/website/WebsiteContentContext";

// Copy comes from the website content model (published via the admin
// editor), falling back to the built-in defaults when nothing is published.
export default function HowItWorks() {
  const c = useSectionContent("how_it_works");
  const steps = Array.isArray(c.steps) ? c.steps : [];

  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {c.kicker}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {c.heading}
          </h2>
        </div>
        <ol className="mt-6 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{s}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}