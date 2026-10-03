import React from "react";
import { Plane, Sun, KeyRound } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Image } from "@/components/ui/image";

// Illustrative AI images (not customer properties or completed work).
const CARD_IMAGES = [
  "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/24476e684_AB05FDF8-05A5-4638-89B6-23EAC5C60B48.png",
  "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/56041a325_59775554-9E6B-40AC-9DDE-10B7FB5906ED.png",
  "https://media.base44.com/images/public/6a6261eafdd1874f2f1eb998/1ee6e8819_62F5CBA7-90D2-478A-BA60-82E6D8AEEFE3.png",
];

export default function WhoWeHelp() {
  const { lang } = useLanguage();
  const el = lang === "el";

  const cards = [
    {
      icon: Plane,
      title: el ? "Απώντες ιδιοκτήτες" : "Absent owners",
      text: el
        ? "Ζείτε στο εξωτερικό ή μακριά από την Κρήτη; Το ακίνητό σας ελέγχεται τακτικά και ενημερώνεστε για οτιδήποτε αξίζει προσοχή."
        : "You live abroad or far from Crete. Your property is checked on a regular schedule, and you hear about anything that needs attention.",
    },
    {
      icon: Sun,
      title: el ? "Εποχιακοί κάτοικοι" : "Seasonal residents",
      text: el
        ? "Έρχεστε για λίγους μήνες τον χρόνο; Φροντίζουμε το ακίνητό σας όσο λείπετε και το ετοιμάζουμε πριν την άφιξή σας."
        : "You spend part of the year here. We look after the property while you are away and prepare it before you arrive.",
    },
    {
      icon: KeyRound,
      title: el ? "Ενοικίαση & επισκέπτες" : "Rentals & guests",
      text: el
        ? "Υποδέχεστε ενοικιαστές ή επισκέπτες; Κατόπιν εντολής σας, ετοιμάζουμε το ακίνητο πριν από κάποια άφιξη."
        : "You host tenants or guests. On your instruction, we prepare the property before an arrival.",
    },
  ];

  return (
    <section id="who-we-help" className="scroll-mt-20 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Ποιους βοηθάμε" : "Who we help"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el
              ? "Κάθε ιδιοκτήτης που θέλει να ξέρει ότι το ακίνητό του είναι σε καλά χέρια."
              : "Any owner who wants to know their property is in good hands."}
          </h2>
        </div>
        <div className="mt-6 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-3">
          {cards.map((c, i) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              {/* 16:9 illustrative image, cover-cropped; aspect ratio reserved to prevent layout shift. */}
              <div className="aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image
                  src={CARD_IMAGES[i]}
                  alt={c.title}
                  className="h-full w-full"
                  fittingType="fill"
                  loading="lazy"
                />
              </div>
              <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                <c.icon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}