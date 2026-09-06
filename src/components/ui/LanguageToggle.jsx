import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

// Compact EN | ΕΛ segmented toggle for the shared app headers.
export default function LanguageToggle({ className }) {
  const { lang, setLang } = useLanguage();
  const options = [
    { code: "en", label: "EN" },
    { code: "el", label: "ΕΛ" },
  ];
  return (
    <div
      role="group"
      aria-label="Interface language"
      className={cn("flex items-center rounded-full border border-border p-0.5 shrink-0", className)}
    >
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLang(o.code)}
          aria-pressed={lang === o.code}
          title={o.code === "en" ? "English" : "Ελληνικά"}
          className={cn(
            "h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors",
            lang === o.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}