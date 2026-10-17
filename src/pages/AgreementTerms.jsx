import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ResourceListPage from '@/components/resource/ResourceListPage';
import { FileText } from 'lucide-react';

function TermsSections({ values, setField }) {
  const sections = Array.isArray(values.body) ? values.body : [];
  const change = (index, patch) => setField('body', sections.map((section, i) => i === index ? { ...section, ...patch } : section));
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Names, prices and dates in double braces fill from each agreement. Review the customer preview to see the completed document.</p>
    {sections.map((section, index) => <details key={section.id || index} className="rounded-xl border p-3">
      <summary className="cursor-pointer font-medium text-sm">{index + 1}. {section.heading || 'Untitled section'}</summary>
      <div className="space-y-3 pt-3">
        <label className="block text-xs">Heading<input className="mt-1 w-full rounded-md border bg-background p-2 text-sm" value={section.heading || ''} onChange={event => change(index, { heading: event.target.value })} /></label>
        {(section.paragraphs || []).map((paragraph, pIndex) => <label key={pIndex} className="block text-xs">Paragraph {pIndex + 1}<textarea className="mt-1 w-full min-h-40 rounded-md border bg-background p-2 text-sm" value={paragraph} onChange={event => change(index, { paragraphs: section.paragraphs.map((p, i) => i === pIndex ? event.target.value : p) })} /></label>)}
        <button type="button" className="text-sm text-primary underline" onClick={() => change(index, { paragraphs: [...(section.paragraphs || []), ''] })}>Add paragraph</button>
      </div>
    </details>)}
    <button type="button" className="text-sm text-primary underline" onClick={() => setField('body', [...sections, { id: crypto.randomUUID(), heading: '', paragraphs: [''] }])}>Add section</button>
  </div>;
}

const fields = [
  { name: 'name', label: 'Template Name', type: 'text', required: true },
  { name: 'version', label: 'Version', type: 'number' },
  { name: 'language', label: 'Language', type: 'select', options: ['English', 'Greek'] },
  { name: 'effective_date', label: 'Effective Date', type: 'date' },
  { name: 'body', type: 'custom', render: (values, setField) => <TermsSections values={values} setField={setField} /> },
  { name: 'active', label: 'Active', type: 'boolean' },
  { name: 'legal_approved', label: 'Previously approved for customer use', type: 'boolean' },
];
export default function AgreementTerms() {
  return <AppLayout>
    <div className="mx-4 mt-4 rounded-xl border bg-muted p-4 text-sm">
      <p className="font-medium">Agreement wording recovered from your uploaded PDF</p>
      <p className="mt-1 text-muted-foreground">The recovered template is a draft for testing. Its original approval status is unchanged. Customer details and signatures fill separately for each agreement.</p>
    </div>
    <ResourceListPage entityName="AgreementTermsTemplate" title="Agreement Terms" subtitle="Set up once, reuse for each customer" icon={FileText} fields={fields} columns={[{ key: 'name', label: 'Template', primary: true }, { key: 'version', label: 'Version' }, { key: 'language', label: 'Language' }]} defaultValues={{ version: 1, language: 'English', body: [], active: false, legal_approved: false }} addItemLabel="Add Existing Terms" archivable />
  </AppLayout>;
}
