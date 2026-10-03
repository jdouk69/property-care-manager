import React from "react";
import { Image as UIImage } from "@/components/ui/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildOwnerReportModel } from "@/lib/visitReport";
import { buildSampleVisit } from "@/lib/sampleReport";

// The SAMPLE visit report document, rendered as accessible HTML (real text,
// headings, table semantics and alt-texted images) exactly like the sample
// design. Built from the SAME report model as the downloadable PDF and the
// real customer reports, so the sample always mirrors the real report's
// structure. It uses fixed illustrative data — never real visit records.
export default function SampleReportDocument() {
  const { lang } = useLanguage();
  const { visit, ctx } = buildSampleVisit(lang);
  const si = ctx.sampleInfo;
  const m = buildOwnerReportModel(visit, ctx);
  const L = m.labels;

  return (
    <div className="bg-report-cream text-report-navy shadow-lg rounded-lg overflow-hidden border border-report-gold/40">
      {/* Masthead */}
      <div className="bg-report-navy text-report-cream px-5 sm:px-8 py-4">
        <p className="font-serif text-lg sm:text-2xl font-bold tracking-wide">Property Care Crete</p>
        <p className="text-xs text-report-cream/80 mt-0.5">+30 694 154 4475</p>
      </div>
      <div className="h-1 bg-report-gold" />

      <div className="px-5 sm:px-8 py-6 space-y-5">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-report-navy">SAMPLE VISIT REPORT</h2>
          <p className="text-xs sm:text-sm text-report-gold font-medium mt-1">{si.subtitle}</p>
        </div>

        {/* Info panel */}
        <div className="bg-white/80 border border-report-gold/30 rounded-lg px-4 py-3 text-xs sm:text-sm space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <p><span className="font-semibold">{L.plan}:</span> {si.plan}</p>
            <p><span className="font-semibold">{L.area}:</span> {si.area}</p>
            <p><span className="font-semibold">{L.visitShort}:</span> {si.visitLabel}</p>
            <p><span className="font-semibold">{L.duration}:</span> {si.duration}</p>
          </div>
        </div>

        {/* What the report can include */}
        <div>
          <h3 className="font-serif text-sm sm:text-base font-bold tracking-wide text-report-navy">{si.canIncludeHeading}</h3>
          <p className="text-xs sm:text-sm text-report-navy/80 mt-1">{si.canIncludeText}</p>
        </div>

        {/* Observations table */}
        <div>
          <h3 className="font-serif text-sm sm:text-base font-bold tracking-wide text-report-navy">{si.observationsHeading}</h3>
          <div className="mt-2 overflow-x-auto rounded-lg border border-report-gold/40">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-report-navy text-report-cream">
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colPriority}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colObservation}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colFollowUp}</th>
                </tr>
              </thead>
              <tbody>
                {m.findings.map((f, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-white/60" : "bg-transparent"}>
                    <td className="px-3 py-2 align-top text-report-gold font-semibold text-[11px] sm:text-xs">{f.priorityLabel}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-semibold">{f.title}</span>
                      {f.observed && <span className="text-report-navy/80"> — {f.observed}</span>}
                    </td>
                    <td className="px-3 py-2 align-top text-report-navy/80">{(f.recommendation || "").trim() || (f.actionTaken || "").trim() || L.noActionNoted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Captioned photo grid — AI-generated demonstration images */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {m.findingPhotos.map((dp, i) => (
              <figure key={i}>
                <UIImage
                  src={dp.url}
                  alt={lang === "el"
                    ? "Υποδειγματική φωτογραφία που δημιουργήθηκε από τεχνητή νοημοσύνη"
                    : "Sample photo created with AI — not a client's property"}
                  className="w-full aspect-[4/3] rounded-md overflow-hidden"
                  fittingType="fill"
                />
                <figcaption className="text-[11px] text-report-navy/70 mt-1">{dp.caption}</figcaption>
              </figure>
            ))}
          </div>
          <p className="text-[11px] sm:text-xs text-report-gold font-medium mt-2">{si.photoNote}</p>
        </div>

        {/* Owner update */}
        <div>
          <h3 className="font-serif text-sm sm:text-base font-bold tracking-wide text-report-navy">{si.summaryHeading}</h3>
          <p className="text-xs sm:text-sm text-report-navy/90 mt-1 leading-relaxed">{visit.summary}</p>
        </div>

        {/* Photos & reports */}
        <div>
          <h3 className="font-serif text-sm sm:text-base font-bold tracking-wide text-report-navy">{si.photosReportsHeading}</h3>
          <p className="text-xs sm:text-sm text-report-navy/80 mt-1">{si.photosReportsText}</p>
        </div>

        {/* Our role */}
        <div>
          <h3 className="font-serif text-sm sm:text-base font-bold tracking-wide text-report-navy">{si.ourRoleHeading}</h3>
          <p className="text-xs sm:text-sm text-report-navy/80 mt-1">{si.ourRoleText}</p>
        </div>

        <p className="text-[11px] text-report-navy/70 leading-relaxed border-t border-report-gold/40 pt-3">
          {L.scopeStatement}
        </p>
      </div>

      {/* Footer */}
      <div className="bg-report-navy text-report-cream text-xs px-5 sm:px-8 py-2.5 flex flex-wrap gap-x-3 justify-between">
        <span>propertycarecrete.com</span>
        <span>+30 694 154 4475</span>
      </div>
    </div>
  );
}