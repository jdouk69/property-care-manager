import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSectionContent } from "@/components/website/WebsiteContentContext";

// Copy comes from the website content model (published via the admin
// editor), falling back to the built-in defaults when nothing is published.
export default function FaqSection() {
  const c = useSectionContent("faqs");
  const faqs = Array.isArray(c.items) ? c.items : [];

  return (
    <section id="faq" className="scroll-mt-20 py-10 sm:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.kicker}</p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {c.heading}
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm sm:text-base">{f.q}</AccordionTrigger>
              {/* forceMount keeps the answer text in the rendered DOM even
                  while closed — crawlable without a click. display:none while
                  closed restores the visual collapse and correct aria-expanded
                  semantics; the height animation still plays on expand. */}
              <AccordionContent
                forceMount
                className="text-sm leading-relaxed text-muted-foreground data-[state=closed]:hidden"
              >
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}