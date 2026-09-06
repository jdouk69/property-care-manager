import React from "react";
import { HardHat, Phone, Star } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const TRADES = ["Plumber", "Electrician", "Pool Technician", "Gardener", "Cleaner", "Locksmith", "HVAC", "Pest Control", "Roofer", "Painter", "General Handyman", "Appliance Repair", "Internet / Telecom", "Other"];

const fields = [
  { name: "company", label: "Business Name", type: "text", required: true, placeholder: "e.g. Marina Pool Services" },
  { name: "contact_person", label: "Contact Person", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "whatsapp", label: "WhatsApp", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "trade", label: "Category", type: "select", options: TRADES },
  { name: "service_area", label: "Service Area", type: "text", placeholder: "e.g. Apokoronas" },
  { name: "languages", label: "Languages Spoken", type: "text" },
  { name: "availability", label: "Availability", type: "text" },
  { name: "emergency_availability", label: "Emergency Availability", type: "text", placeholder: "e.g. 24/7 for clients" },
  { name: "trusted_rating", label: "Trusted Rating (1-5)", type: "number" },
  { name: "linked_jobs", label: "Linked Jobs", type: "number" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "company", label: "Contractor", primary: true },
  { key: "contact_person", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "trade", label: "Category", badge: true },
  { key: "emergency_availability", label: "Emergency" },
];

export default function Contractors() {
  const { t } = useLanguage();
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Contractor"
        title="Contractors"
        subtitle="Emergency & service directory"
        icon={HardHat}
        fields={fields}
        columns={columns}
        searchKeys={["company", "contact_person", "phone", "service_area", "trade"]}
        addItemLabel="Add Contractor"
        archivable
        defaultValues={{ trade: "Other", trusted_rating: 5, linked_jobs: 0 }}
        renderSummary={(items) => {
          const emergency = items.filter((c) => c.emergency_availability && c.emergency_availability.toLowerCase().includes("24"));
          if (!emergency.length) return null;
          return (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-rose-600" /><h3 className="font-medium text-sm text-rose-700 dark:text-rose-400">{t("Emergency Contacts (24/7)")}</h3></div>
              <div className="flex flex-wrap gap-2">
                {emergency.slice(0, 8).map((c) => (
                  <span key={c.id} className="text-xs px-2.5 py-1 rounded-full border border-border bg-card flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-500" /> {c.company} · {c.phone}
                  </span>
                ))}
              </div>
            </div>
          );
        }}
      />
    </AppLayout>
  );
}