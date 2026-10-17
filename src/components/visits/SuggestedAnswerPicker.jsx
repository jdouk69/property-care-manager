import React from 'react';
import { suggestedAnswers } from '@/lib/checklistSuggestedAnswers';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SuggestedAnswerPicker({ visitType, item, onChoose, onCustom, ownerVisibilityManaged = true }) {
 const { t } = useLanguage();
 const options = suggestedAnswers(visitType, item.name, item.status);
 if (['Not Checked', '', null, undefined].includes(item.status)) return <p className="text-sm text-muted-foreground">{t('Choose a status to see suggested descriptions, or write your own note.')}</p>;
 return (
  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
   <p className="text-sm font-medium">{t('Suggested descriptions')}</p>
   <p className="text-xs text-muted-foreground">{t(options.length ? 'Select only what you confirmed. Your description stays editable; add the location and relevant details.' : 'Write a description specific to this question. Include what you observed and any relevant location or limitation.')}</p>
   <div className="flex flex-wrap gap-2">
    {options.map(option => {
     const added = (item.notes || '').split('\n').some(line => line.trim() === option.text);
     return <button key={option.text} type="button" aria-pressed={added} onClick={() => onChoose(option.text)} className={`min-h-11 rounded-lg border px-3 py-2 text-sm text-left transition ${added ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:bg-muted'}`}>{t(option.label)}</button>;
    })}
    <button type="button" onClick={onCustom} className="min-h-11 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5">{t('Custom — write your own')}</button>
   </div>
   {(item.notes || '').trim() && <p className="text-xs text-muted-foreground">{t('Selections add to your current description. Review it for accuracy and remove wording that no longer applies.')}</p>}
   {ownerVisibilityManaged && (item.notes || '').trim() && !item.owner_visible && <p className="text-xs text-muted-foreground">{t('This description is currently private. Use the Owner-visible control below if it should appear in the customer report.')}</p>}
  </div>
 );
}
