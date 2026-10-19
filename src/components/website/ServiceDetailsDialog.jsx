import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

export default function ServiceDetailsDialog({ title, lang, trigger, children }) {
  const el = lang === "el";
  return <Dialog>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="website-theme flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0 text-foreground">
      <header className="shrink-0 border-b border-border px-5 pb-4 pt-6 pr-12 sm:px-6 sm:pr-12">
        <DialogTitle className="font-heading text-xl font-bold leading-snug">{title}</DialogTitle>
        <DialogDescription className="mt-2">{el ? "Τι περιλαμβάνεται, χρόνος επίσκεψης και εξαιρέσεις." : "What is included, visit time and exclusions."}</DialogDescription>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>
      <footer className="shrink-0 border-t border-border bg-background px-5 py-3"><DialogClose asChild><button type="button" className="min-h-11 w-full rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground sm:w-auto">{el ? "Κλείσιμο" : "Close"}</button></DialogClose></footer>
    </DialogContent>
  </Dialog>;
}
