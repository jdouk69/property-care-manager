import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import {
  Eye, Wrench, MapPin, ClipboardList, ArrowRight, ShoppingBasket, Loader2, Search, Home as HomeIcon, ClipboardCheck,
} from "lucide-react";

// Tiered one-time property care — routes into the EXISTING governed
// Service & Pricing Assessment flow (no second pricing system). Prices shown
// are the current package base prices; the assessment (+€40 units,
// custom-review rules, manual staff approval) always confirms the final price.
const TIERS = [
  { tier: "Basic", label: "Basic One-Time Property Check", price: 85, duration: "up to 15 minutes" },
  { tier: "Standard", label: "Standard One-Time Property Care Visit", price: 150, duration: "30–45 minutes" },
  { tier: "Premium", label: "Premium One-Time Property Care Visit", price: 175, duration: "up to 60 minutes" },
];

const SERVICES = [
  {
    label: "Property Assistance",
    desc: "Small one-time request — camera, shutters, deliveries, resets.",
    to: "/property-assistance",
    icon: Wrench,
    color: "bg-violet-500",
  },
  {
    label: "On-Demand Property Care Visit",
    desc: "One-time visual property check while the owner is away.",
    to: "/visits?schedule=1&visit_type=Property%20Care%20Inspection",
    icon: Eye,
    color: "bg-sky-500",
  },
  {
    label: "Grocery Stocking",
    desc: "From €45 + VAT — shopping, delivery, basic putting-away. Groceries paid separately by the owner.",
    to: "/visits?schedule=1&visit_type=Grocery%20Stocking",
    icon: ShoppingBasket,
    color: "bg-emerald-500",
  },
  {
    label: "Emergency Visit",
    desc: "Urgent one-time visit.",
    to: "/visits?schedule=1&visit_type=Emergency%20Visit",
    icon: MapPin,
    color: "bg-rose-500",
  },
  {
    label: "Owner-Rep Site Visit",
    desc: "Owner-representative construction / site visit report.",
    to: "/visits?schedule=1&visit_type=Owner%20Representative%20Site%20Visit",
    icon: ClipboardList,
    color: "bg-amber-500",
  },
];

export default function OneTimeServices() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [query, setQuery] = useState("");

  // Load properties once a tier is chosen — the tier selection then routes
  // into the existing per-property Service Setup (assessment) flow.
  useEffect(() => {
    if (!selectedTier) return;
    let cancelled = false;
    setLoadingProps(true);
    base44.entities.Property.list("-created_date", 500)
      .then((list) => { if (!cancelled) setProperties((list || []).filter((p) => !p.archived)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingProps(false); });
    return () => { cancelled = true; };
  }, [selectedTier]);

  const filteredProps = properties.filter((p) =>
    !query.trim() || (p.name || "").toLowerCase().includes(query.trim().toLowerCase()) ||
    (p.address || "").toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/" className="mb-3" />
        <h1 className="text-2xl font-semibold tracking-tight">One-Time Service</h1>
        <p className="text-sm text-muted-foreground mb-4">
          No recurring setup — choose a service to schedule or start now.
        </p>

        {/* Tiered one-time property care — reuses the governed assessment flow */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">One-Time Property Care Visit</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Selecting a level opens the existing Service &amp; Pricing Assessment for the property — size, complexity and
            additional units (+€40 each) are reviewed, custom-pricing rules still apply, and the final price always
            requires staff approval. Exactly one visit is created; no recurring agreement.
          </p>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <button
                key={t.tier}
                onClick={() => setSelectedTier(t.tier === selectedTier ? null : t.tier)}
                className={`w-full text-left rounded-2xl border p-3.5 transition-colors ${
                  selectedTier === t.tier ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{t.label}</span>
                  <span className="text-sm font-semibold text-primary shrink-0">From €{t.price} + VAT</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">One visit · {t.duration}</p>
              </button>
            ))}
          </div>

          {selectedTier && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-3">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <HomeIcon className="w-3.5 h-3.5 text-primary" /> Select property for the {TIERS.find((t) => t.tier === selectedTier).label}
              </p>
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search properties…" className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
              </div>
              {loadingProps ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {filteredProps.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/properties/${p.id}/service-setup?purchase=One-time&tier=${selectedTier}`)}
                      className="w-full text-left px-3 py-3 hover:bg-muted/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.address || ""}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                  {filteredProps.length === 0 && (
                    <p className="px-3 py-3 text-sm text-muted-foreground">No properties found.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {SERVICES.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition"
            >
              <span className={`w-10 h-10 rounded-xl ${s.color} text-white flex items-center justify-center shrink-0`}>
                <s.icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}