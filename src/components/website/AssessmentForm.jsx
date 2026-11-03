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
    property_use: "",
    notes: "",
    company_field: "", // honeypot — hidden from humans, catches bots
  });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPropertyUse = (e) => {
    const property_use = e.target.value;
    setForm((f) => ({
      ...f,
      property_use,
      property_type: property_use === "Short-term rental villa" ? "Villa" : "",
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      // Send the active interface language so the stored request and the admin
      // notification use the language the visitor was reading (entity enum:
      // English / Greek).
      await base44.functions.invoke("assessmentSubmit", {
        ...form,
        language: el ? "Greek" : "English",
      });
      setStatus("sent");
    } catch (err) {
      setStatus("error");
    }
  };

  const types = el
    ? ["Βίλα", "Διαμέρισμα", "Μονοκατοικία", "Στούντιο", "Εξοχικό"]
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
          <Label htmlFor="af-use">{el ? "Χρήση ακινήτου και είδος επίσκεψης *" : "Property use and visit scope *"}</Label>
          <select
            id="af-use"
            required
            value={form.property_use}
            onChange={setPropertyUse}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{el ? "Επιλέξτε…" : "Select…"}</option>
            <option value="Short-term rental villa">
              {el ? "Βίλα βραχυχρόνιας μίσθωσης" : "Short-term rental villa"}
            </option>
            <option value="Owner-occupied home">
              {el ? "Ιδιωτική κατοικία με προσωπικά αντικείμενα — μόνο εξωτερικά" : "Private home with personal belongings — exterior-only"}
            </option>
          </select>
        </div>
        {form.property_use === "Short-term rental villa" && (
          <div className="space-y-1.5">
            <Label>{el ? "Τύπος ακινήτου" : "Property type"}</Label>
            <p className="flex h-9 items-center rounded-md border border-input px-3 text-sm text-muted-foreground">
              {el ? "Βίλα" : "Villa"}
            </p>
          </div>
        )}
        {form.property_use === "Owner-occupied home" && (
          <div className="space-y-1.5">
            <Label htmlFor="af-type">{el ? "Τύπος κατοικίας (προαιρετικό)" : "Home type (optional)"}</Label>
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
        )}
      </div>
      {form.property_use === "Owner-occupied home" && (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          {el
            ? "Όταν τα προσωπικά αντικείμενα του ιδιοκτήτη παραμένουν στο σπίτι, οι επισκέψεις είναι μόνο εξωτερικές. Δεν εισερχόμαστε στο εσωτερικό."
            : "For private homes where the owner's personal belongings remain, visits are exterior-only. We do not enter the property."}
        </p>
      )}
      {form.property_use === "Short-term rental villa" && (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          {el
            ? "Οι εσωτερικές επισκέψεις σε βίλες βραχυχρόνιας μίσθωσης γίνονται μόνο κατόπιν προηγούμενης συμφωνίας και όταν έχει επιβεβαιωθεί ότι το ακίνητο είναι κενό και δεν διαμένει κανείς εκεί."
            : "Interior visits at short-term rentals are agreed in advance and take place only when the property is confirmed vacant and no one is staying there."}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="af-location">{el ? "Τοποθεσία ακινήτου *" : "Property location *"}</Label>
        <Input id="af-location" required value={form.property_location} onChange={set("property_location")}
          placeholder={el ? "π.χ. Αλμυρίδα, Αποκόρωνας" : "e.g. Almyrida, Apokoronas"} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="af-notes">{el ? "Πώς μπορούμε να σας βοηθήσουμε; *" : "How can we help you? *"}</Label>
        <Textarea id="af-notes" required value={form.notes} onChange={set("notes")} rows={4}
          placeholder={form.property_use === "Owner-occupied home"
            ? (el ? "Ποια εξωτερική περιοχή ή ζήτημα θέλετε να ελέγξουμε;…" : "Which exterior area or concern would you like us to check?…")
            : (el ? "Λίγα λόγια για τη βίλα και τη βοήθεια που χρειάζεστε…" : "A few words about the villa and the help you need…")} />
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
            ? "Το αίτημά σας φτάνει απευθείας σε εμάς και χρησιμοποιείται μόνο για να σας απαντήσουμε."
            : "Your enquiry goes directly to us and is used only to respond to you."}
        </p>
        <Button type="submit" disabled={status === "sending"} className="rounded-lg h-11 px-6">
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
