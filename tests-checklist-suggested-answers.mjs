import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SEED } from './src/lib/checklistSeed.js';
import { CHECKLIST_SUGGESTED_ANSWERS as catalog, suggestedAnswers, hasSuggestedAnswers, applySuggestedAnswer } from './src/lib/checklistSuggestedAnswers.js';
import { EMERGENCY_SUGGESTED_ANSWERS as emergency, suggestedAnswers as emergencyAnswers } from './src/lib/emergencySuggestedAnswers.js';
const statuses = ['Normal','Important','Emergency','Unable to Check','N/A'];
for (const [visitType,names] of Object.entries(SEED)) {
 for (const name of names) {
  assert.ok(hasSuggestedAnswers(visitType,name),`${visitType}: ${name}`);
  for (const status of statuses) assert.ok(suggestedAnswers(visitType,name,status).length,`${name}: ${status}`);
 }
}
for (const [name,set] of Object.entries(catalog)) {
 for (const key of ['normal','concern','unable']) {
  assert.ok(set[key]?.length,`${name}: ${key}`);
  for (const {label,text} of set[key]) {
   assert.ok(label && text && !text.includes('\n'));
   assert.doesNotMatch(text,/\[[^\]]*\]|all systems safe|guaranteed|certified safe/i);
  }
 }
 assert.deepEqual(suggestedAnswers('Any',name,'Not Checked'),[]);
}
for (const name of Object.keys(emergency)) for(const status of statuses) assert.deepEqual(suggestedAnswers('Emergency Visit',name,status),emergencyAnswers('Emergency Visit',name,status));
const legacy=['Gates','Doors','Windows','Roof','Pool','Garden','Irrigation','Water leaks','Electrical','Air conditioning','Internet','Security system','Humidity','Appliances','General condition'];
for (const name of legacy) for(const [old,current] of [['Pass','Normal'],['Needs Attention','Important'],['Critical','Emergency']]) assert.deepEqual(suggestedAnswers('Inspection',name,old),suggestedAnswers('Inspection',name,current));
assert.equal(Object.keys(catalog).filter(n=>n.startsWith('ONBOARDING · ')).length,18);
for (const name of ['Confirm scope of today\'s work','Contractor / crew present','Work area inspected','Work completed since previous visit','Work matches agreed scope','Materials on site','Materials appear correct','Visible workmanship quality','Measurements / dimensions checked where applicable','Progress compared with schedule','Unfinished work','Defects / concerns','Damage to existing property','Safety / site condition','Changes requested by contractor','Changes requiring owner approval','Additional cost / variation mentioned','Receipts / invoices received','Photos of progress','Photos of concerns / defects','Next contractor actions','Expected next visit / milestone','Owner decision required','Owner progress update prepared']) assert.ok(hasSuggestedAnswers('Owner Representative Site Visit',name),name);
for(const name of ['Unknown owner question','toString','__proto__']) assert.deepEqual(suggestedAnswers('Custom Visit',name,'Normal'),[]);
const item={name:'Gates',status:'Important',notes:'Private observation',owner_visible:false,photos:['private:existing'],action_taken:'Unchanged'};
const text=suggestedAnswers('Visit',item.name,item.status)[0].text;
const updated=applySuggestedAnswer(item,text);
assert.equal(updated.notes,item.notes+'\n'+text);assert.equal(updated.owner_visible,false);assert.equal(updated.status,item.status);assert.deepEqual(updated.photos,item.photos);assert.equal(updated.action_taken,item.action_taken);assert.equal(item.notes,'Private observation');assert.deepEqual(applySuggestedAnswer(updated,text),updated);
const picker=fs.readFileSync('src/components/visits/SuggestedAnswerPicker.jsx','utf8');
assert.ok(picker.includes('Custom — write your own'));assert.ok(!picker.includes("visitType !== 'Emergency Visit'"));
for(const file of ['src/components/visits/VisitChecklistItem.jsx','src/components/visits/guided/GuidedItemCard.jsx','src/pages/Inspections.jsx']) assert.ok(fs.readFileSync(file,'utf8').includes('<SuggestedAnswerPicker'),file);
console.log(`PASS: ${Object.keys(catalog).length} supported question names, all built-in visit types, 18 onboarding items, 24 owner-representative items, 15 legacy items, five statuses, Emergency compatibility, unknown-question fallback and immutable/private note preservation.`);
