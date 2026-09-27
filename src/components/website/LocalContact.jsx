import React, { useEffect, useState } from "react";
import { User, Phone, Mail, MessageCircle, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Image } from "@/components/ui/image";

// 'Meet your local contact' — reads the owner profile from the server-side
// websitePrices function (key stays server-side; only owner_profile_* fields
// are exposed). Any empty field keeps the placeholder look, so the section
// degrades gracefully until the owner fills it in Settings.
export default function LocalContact() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;
    base44.functions
      .invoke("websitePrices", {})
      .then((res) => {
        if (!active) return;
        const p = res?.data?.ownerProfile;
        if (p && typeof p === "object") setProfile(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const name = profile?.name || null;
  const photo = profile?.photo || null;
  const localPhoto = profile?.local_photo || null;
  const intro = el
    ? profile?.intro_el || profile?.intro_en || null
    : profile?.intro_en || profile?.intro_el || null;

  const contacts = [
    { icon: Phone, kind: "phone", value: profile?.phone || null, placeholder: "[Phone]" },
    { icon: Mail, kind: "email", value: profile?.email || null, placeholder: "[Email]" },
    { icon: MessageCircle, kind: "whatsapp", value: profile?.whatsapp || null, placeholder: "[WhatsApp]" },
  ].filter((c) => c.value || !name);
  const showPlaceholderNote = !name && !photo && !intro && !localPhoto && contacts.every((c) => !c.value);

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
          {photo ? (
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border">
              <Image src={photo} alt={name || "Owner"} className="h-full w-full" fittingType="fill" />
            </div>
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground">
              <User className="w-10 h-10" />
            </div>
          )}
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              {name || (el ? "[Όνομα / Name]" : "[Name]")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {intro ||
                (el
                  ? "[Σύντομη προσωπική παρουσίαση — ποιος είστε, πόσο καιρό ζείτε και εργάζεστε στην περιοχή των Χανίων και γιατί ξεκινήσατε τη φροντίδα ακινήτων.]"
                  : "[A short personal introduction — who you are, how long you have lived and worked in the Chania area, and why you started caring for properties.]")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {contacts.map((c) => {
                const cls =
                  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";
                const inner = (
                  <>
                    <c.icon className="w-3.5 h-3.5" /> {c.value || c.placeholder}
                  </>
                );
                // Placeholder chips (no value yet) stay inert spans; real values
                // become actionable links. Content and appearance are unchanged.
                if (!c.value) {
                  return (
                    <span key={c.placeholder} className={cls}>
                      {inner}
                    </span>
                  );
                }
                if (c.kind === "phone") {
                  return (
                    <a key={c.placeholder} href={`tel:${c.value.replace(/\s+/g, "")}`} className={cls}>
                      {inner}
                    </a>
                  );
                }
                if (c.kind === "email") {
                  return (
                    <a key={c.placeholder} href={`mailto:${c.value}`} className={cls}>
                      {inner}
                    </a>
                  );
                }
                const digits = c.value.replace(/\D/g, "");
                if (!digits) {
                  return (
                    <span key={c.placeholder} className={cls}>
                      {inner}
                    </span>
                  );
                }
                return (
                  <a
                    key={c.placeholder}
                    href={`https://wa.me/${digits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cls}
                  >
                    {inner}
                  </a>
                );
              })}
            </div>
            {showPlaceholderNote && (
              <p className="mt-3 text-xs italic text-muted-foreground">
                {el
                  ? "Προσωρινό πεδίο — τα πραγματικά στοιχεία θα τοποθετηθούν πριν τη δημοσίευση."
                  : "Placeholder — the real details will be provided by the owner before publication."}
              </p>
            )}
          </div>
        </div>
        {localPhoto ? (
          <div className="mt-4 aspect-[3/2] sm:aspect-[21/10] lg:aspect-[12/5] w-full overflow-hidden rounded-2xl border border-border">
            <Image src={localPhoto} alt={el ? "Τοπική φωτογραφία" : "Local photo"} className="h-full w-full" fittingType="fill" focalPointY={0.55} />
          </div>
        ) : (
          <div className="mt-4 flex aspect-[3/2] sm:aspect-[21/10] lg:aspect-[12/5] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <p className="px-4 text-center text-xs">
              {el
                ? "[Πραγματική τοπική φωτογραφία / φωτογραφία ακινήτου — θα παρασχεθεί από τον ιδιοκτήτη]"
                : "[Genuine local / property photo — to be provided by the owner]"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}