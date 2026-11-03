import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { revisedAgreementTerms } from '@/lib/revisedAgreementTerms.js';
import { formatAgreementHeading } from '@/lib/agreementHeadings.js';
import AppLayout from '@/components/layout/AppLayout';
import ResourceListPage from '@/components/resource/ResourceListPage';
import { FileText } from 'lucide-react';

function TermsSections({ values, setField }) {
  const sections = Array.isArray(values.body) ? values.body : [];
  const change = (index, patch) => setField('body', sections.map((section, i) => i === index ? { ...section, ...patch } : section));
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Names, prices and dates in double braces fill from each agreement. Review the customer preview to see the completed document.</p>
    {sections.map((section, index) => <details key={section.id || index} className="rounded-xl border p-3">
      <summary className="cursor-pointer font-medium text-sm">{formatAgreementHeading(section, index)}</summary>
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
  const [preparing, setPreparing] = useState(false);
  const [reviewId, setReviewId] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const prepareReview = async () => {
    if (preparing) return;
    setPreparing(true); setError('');
    try {
      const templates = await base44.entities.AgreementTermsTemplate.list('-version', 500);
      const name = 'Property Care Standard Terms — Revised Draft';
      const existing = templates.find(template => [name, 'Property Care Standard Terms — Revised'].includes(template.name) && !template.archived);
      if (existing) { setReviewId(existing.id); setReload(value => value + 1); return; }
      const source = templates.find(template => template.name === 'Property Care Standard Terms' && template.language === 'English' && !template.archived);
      if (!source) throw new Error('The English Property Care Standard Terms template could not be found.');
      const version = Math.max(...templates.filter(template => template.language === 'English' && template.name?.startsWith('Property Care Standard Terms')).map(template => Number(template.version) || 1)) + 1;
      const draft = await base44.entities.AgreementTermsTemplate.create({name, version, language:'English', effective_date:'', body:revisedAgreementTerms(source.body), active:false, legal_approved:false, archived:false});
      setReviewId(draft.id); setReload(value => value + 1);
    } catch (e) { setError(e.message); } finally { setPreparing(false); }
  };
  return <AppLayout>
    <div className="mx-4 mt-4 rounded-xl border bg-muted p-4 text-sm">
      <p className="font-medium">Agreement wording recovered from your uploaded PDF</p>
      <p className="mt-1 text-muted-foreground">The recovered template is a draft for testing. Its original approval status is unchanged. Customer details and signatures fill separately for each agreement.</p>
      <div className="mt-4 space-y-2"><Button variant="outline" onClick={prepareReview} disabled={preparing}>{preparing ? 'Preparing…' : 'Open or prepare revised terms'}</Button><p className="text-muted-foreground">Opens your existing revision, including one already approved for customer use. If no revision exists, creates a separate, unapproved draft. Existing templates and sent/signed agreements are preserved. Customer-use approval does not record that a lawyer reviewed the terms. Consumer early-start requests and any legally required online withdrawal function need a separate process before using the terms for those cases.</p>{error && <p role="alert" className="text-destructive">{error}</p>}</div>
    </div>
    <ResourceListPage key={reviewId || 'terms'} autoOpenEditId={reviewId} reloadSignal={reload} entityName="AgreementTermsTemplate" title="Agreement Terms" subtitle="Set up once, reuse for each customer" icon={FileText} fields={fields} columns={[{ key: 'name', label: 'Template', primary: true }, { key: 'version', label: 'Version' }, { key: 'language', label: 'Language' }]} defaultValues={{ version: 1, language: 'English', body: [], active: false, legal_approved: false }} addItemLabel="Add Existing Terms" archivable />
  </AppLayout>;
}
