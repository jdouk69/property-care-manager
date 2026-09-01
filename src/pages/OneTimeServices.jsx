import React from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Eye, Wrench, MapPin, ClipboardList, ArrowRight } from "lucide-react";

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
    to: "/visits?schedule=1",
    icon: Eye,
    color: "bg-sky-500",
  },
  {
    label: "Emergency Visit",
    desc: "Urgent one-time visit.",
    to: "/visits?schedule=1",
    icon: MapPin,
    color: "bg-rose-500",
  },
  {
    label: "Owner-Rep Site Visit",
    desc: "Owner-representative construction / site visit report.",
    to: "/visits?schedule=1",
    icon: ClipboardList,
    color: "bg-amber-500",
  },
];

export default function OneTimeServices() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/" className="mb-3" />
        <h1 className="text-2xl font-semibold tracking-tight">One-Time Service</h1>
        <p className="text-sm text-muted-foreground mb-4">
          No recurring setup — choose a service to schedule or start now.
        </p>
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