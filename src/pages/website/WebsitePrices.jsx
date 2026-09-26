import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TriangleAlert, Clock, Euro } from "lucide-react";

// Public website pricing page. Prices are fetched LIVE from the operational
// app via the server-side websitePrices function (the access key stays
// server-side). There are no hard-coded prices — if the feed is down the
// page shows an "unavailable" state instead of stale numbers.

const MONTHLY_KEYS = ["quick_check", "property_care", "complete_care"];
const VISIT_KEYS = [
  "owner_arrival_preparation",
  "grocery_stocking",
  "owner_representative_site_visit",
  "emergency_visit",
];

const priceLabel = (service) => {
  const price = service.price != null ? `€${service.price}` : "Ask us";
  const unit = service.billing_unit === "month" ? "/ month" : "per visit";
  return `${price} ${unit}`;
};

function ServiceCard({ service, highlight }) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-3 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div>
        <h3 className="text-lg font-semibold font-heading text-foreground">{service.name}</h3>
        <p className="text-2xl font-bold text-primary mt-1 font-heading">{priceLabel(service)}</p>
      </div>
      {service.time_allowance && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" /> {service.time_allowance}
        </p>
      )}
      {service.hourly_rate != null && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Euro className="w-4 h-4 shrink-0" /> €{service.hourly_rate}/hour for additional time
        </p>
      )}
      {service.description && (
        <p className="text-sm text-foreground/80 leading-relaxed">{service.description}</p>
      )}
    </div>
  );
}

export default function WebsitePrices() {
  const [services, setServices] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    base44.functions
      .invoke("websitePrices", {})
      .then((res) => {
        if (!active) return;
        if (res.data && Array.isArray(res.data.services) && res.data.services.length > 0) {
          setServices(res.data.services);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const byKey = {};
  (services || []).forEach((s) => {
    if (s && s.service_key) byKey[s.service_key] = s;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">
            Property Care Crete
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold font-heading text-foreground mt-2">
            Our Services & Prices
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Transparent, fixed pricing for professional property care in Crete. All prices are
            fetched live from our service records — no outdated numbers.
          </p>
        </div>

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
            <TriangleAlert className="w-8 h-8 text-amber-500" />
            <p className="text-foreground font-medium">Prices are temporarily unavailable.</p>
            <p className="text-sm text-muted-foreground">
              Please check back shortly or contact us directly for a personal quote.
            </p>
          </div>
        )}

        {!error && !services && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading current prices…</p>
          </div>
        )}

        {services && !error && (
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold font-heading text-foreground mb-4">
                Recurring Care Plans
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MONTHLY_KEYS.map((key) =>
                  byKey[key] ? (
                    <ServiceCard key={key} service={byKey[key]} highlight={key === "complete_care"} />
                  ) : null
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold font-heading text-foreground mb-4">
                On-Demand & One-Time Services
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {VISIT_KEYS.map((key) =>
                  byKey[key] ? <ServiceCard key={key} service={byKey[key]} /> : null
                )}
              </div>
            </section>

            <p className="text-xs text-muted-foreground text-center">
              Prices are synchronized automatically from our service records and may be confirmed at
              the time of booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}