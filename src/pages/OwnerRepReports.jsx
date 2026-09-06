import React from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const DISCLAIMER = "This report documents visual observations only. It does not constitute engineering approval, construction supervision, building certification, contractor management, or technical inspection. Observations are communicated to assist the owner's decision-making.";

const fields = [
  { name: "project_name", label: "Project Name", type: "text", required: true, placeholder: "e.g. Pool house extension" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "contractor_id", label: "Contractor", type: "entity-select", entity: "Contractor" },
  { name: "visit_date", label: "Visit Date", type: "date" },
  { name: "status", label: "Status", type: "select", options: ["Draft", "Sent"] },
  { name: "expected_work", label: "Expected Work", type: "textarea" },
  { name: "observed_progress", label: "Observed Progress", type: "textarea" },
  { name: "work_completed", label: "Work Completed", type: "textarea" },
  { name: "visible_concerns", label: "Visible Concerns", type: "textarea" },
  { name: "delays", label: "Delays", type: "textarea" },
  { name: "questions_for_owner", label: "Questions for Owner", type: "textarea" },
  { name: "questions_for_contractor", label: "Questions for Contractor", type: "textarea" },
  { name: "recommendations", label: "Recommendations", type: "textarea" },
  { name: "before_photos", label: "Before Photos", type: "images" },
  { name: "during_photos", label: "During Photos", type: "images" },
  { name: "after_photos", label: "After Photos", type: "images" },
];

const columns = [
  { key: "project_name", label: "Project", primary: true },
  { key: "property_id", label: "Property" },
  { key: "contractor_id", label: "Contractor" },
  { key: "visit_date", label: "Date" },
  { key: "status", label: "Status", badge: true },
];

export default function OwnerRepReports() {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const openId = searchParams.get("open") || undefined;
  return (
    <AppLayout>
      <ResourceListPage
        entityName="OwnerRepReport"
        title="Owner-Rep Reports"
        subtitle="Construction progress observations for owners"
        icon={ClipboardList}
        fields={fields}
        columns={columns}
        searchKeys={["project_name", "observed_progress", "visible_concerns", "recommendations"]}
        addItemLabel="New Report"
        autoOpenEditId={openId}
        archivable
        defaultValues={{ status: "Draft", visit_date: new Date().toISOString().slice(0, 10) }}
        dictation={{ label: "Dictate", fields: ["project_name", "expected_work", "observed_progress", "work_completed", "visible_concerns", "delays", "questions_for_owner", "questions_for_contractor", "recommendations"] }}
        renderSummary={() => (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
            <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">{t(DISCLAIMER)}</p>
          </div>
        )}
      />
    </AppLayout>
  );
}