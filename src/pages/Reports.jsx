import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import ReportDeliveryQueue from "@/components/reports/ReportDeliveryQueue";
import PropertySummaryExport from "@/components/reports/PropertySummaryExport";

export default function Reports() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/" className="mb-3" />

        {/* Customer report delivery queue (centralized operational area) */}
        <ReportDeliveryQueue />

        {/* Secondary: one-off property summary PDF export (preserved) */}
        <div className="mt-8">
          <PropertySummaryExport />
        </div>
      </div>
    </AppLayout>
  );
}