import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Send, CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Public "Request a Property Assessment" form. Submissions go through the
// assessmentSubmit backend function; results are stored in AssessmentRequest,
// which only website administrators can read.
export default function AssessmentForm() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    property_location: "",
    property_type: "",
    notes: "",
    company_field: "", // honeypot — hidden from humans, catches bots
  });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await base44.functions.invoke("assessmentSubmit", form);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
    }
  };

  const types = el
    ? ["Βίλα", "Διαμέρισμα", "Μονοκατοικία", "Στούντιο", "Κottage"]
    : ["Villa", "Apartment", "House", "Studio", "Cottage"];

  if (status === "sent") {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
        <CheckCircle2 className="w-10 h-10 text-primary" />
        <p className="font-semibold text-foreground">
          {el ? "Ευχαριστούμε! Το αίτημά σας στάλθηκε." : "Thank you! Your request has been sent."}
        </p>
        <p className="text-sm text-muted-foreground">
          {el ? "Θα επικοινωνήσουμε μαζί σας σύντομα." : "We will be in touch with you shortly."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="af-name">{el ? "Ονοματεπώνυμο *" : "Full name *"}</Label>
          <Input id="af-name" required value={form.name} onChange={set("name")} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-email">Email *</Label>
          <Input id="af-email" required type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-phone">{el ? "Τηλέφωνο (προαιρετικό)" : "Phone (optional)"}</Label>
          <Input id="af-phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-type">{el ? "Τύπος ακινήτου" : "Property type"}</Label>
          <select
            id="af-type"
            value={form.property_type}
            onChange={set("property_type")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{el ? "Επιλέξτε…" : "Select…"}</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="af-location">{el ? "Τοποθεσία ακινήτου *" : "Property location *"}</Label>
        <Input id="af-location" required value={form.property_location} onChange={set("property_location")}
          placeholder={el ? "π.χ. Αλμυρίδα, Αποκόρωνας" : "e.g. Almyrida, Apokoronas"} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="af-notes">{el ? "Πώς μπορούμε να σας βοηθήσουμε; *" : "How can we help you? *"}</Label>
        <Textarea id="af-notes" required value={form.notes} onChange={set("notes")} rows={4}
          placeholder={el ? "Λίγα λόγια για το ακίνητο και τις ανάγκες σας…" : "A few words about the property and what you need…"} />
      </div>
      {/* Honeypot: visually hidden; humans never fill it */}
      <input
        type="text"
        name="company_field"
        value={form.company_field}
        onChange={set("company_field")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {status === "error" && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="w-4 h-4 shrink-0" />
          {el
            ? "Κάτι πήγε στραβά — δοκιμάστε ξανά ή στείλτε μας μήνυμα απευθείας."
            : "Something went wrong — please try again, or reach us directly."}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {el
            ? "Οι αιτήσεις είναι ορατές μόνο στον διαχειριστή του ιστότοπου."
            : "Submissions are visible only to the website administrator."}
        </p>
        <Button type="submit" disabled={status === "sending"} className="rounded-full h-11 px-6">
          {status === "sending" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {el ? "Αποστολή Αιτήματος" : "Send Request"}
        </Button>
      </div>
    </form>
  );
}