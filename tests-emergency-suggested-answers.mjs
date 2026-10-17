import assert from 'node:assert/strict';
import { EMERGENCY_SUGGESTED_ANSWERS, suggestedAnswers, applySuggestedAnswer } from './src/lib/emergencySuggestedAnswers.js';
const names = Object.keys(EMERGENCY_SUGGESTED_ANSWERS);
assert.equal(names.length, 21);
for (const name of names) {
 for (const status of ['Normal','Important','Emergency','Unable to Check','N/A']) {
  const choices = suggestedAnswers('Emergency Visit', name, status);
  assert.ok(choices.length > 0 && choices.length <= 3, `${name}: ${status}`);
  for (const choice of choices) {
   assert.ok(choice.label && choice.text);
   assert.doesNotMatch(choice.text, /\[[^\]]+\]|must be|should be|accompanying notes/);
  }
 }
 assert.deepEqual(suggestedAnswers('Emergency Visit', name, 'Not Checked'), []);
}
assert.deepEqual(suggestedAnswers('Property Care Inspection','Property access / security','Normal'), []);
assert.deepEqual(suggestedAnswers('Emergency Visit','Custom template question','Normal'), []);
assert.deepEqual(suggestedAnswers('Emergency Visit','toString','Normal'), []);
const text = suggestedAnswers('Emergency Visit','Property access / security','Emergency')[0].text;
const base = {name:'Property access / security',status:'Emergency',notes:'',photos:['private:photo'],owner_visible:false,recommendation:'Call responder',action_taken:'Gate opened'};
const original = structuredClone(base);
const first = applySuggestedAnswer(base,text);
assert.equal(first.notes,text);assert.equal(first.owner_visible,true);
assert.equal(first.status,'Emergency');assert.deepEqual(first.photos,base.photos);
assert.equal(first.recommendation,base.recommendation);assert.equal(first.action_taken,base.action_taken);
assert.deepEqual(base,original);
assert.deepEqual(applySuggestedAnswer(first,text),first,'Repeated selection must not duplicate text');
const privateItem = {...base,notes:'Private staff observation'};
const appended = applySuggestedAnswer(privateItem,text);
assert.equal(appended.notes,'Private staff observation\n'+text);
assert.equal(appended.owner_visible,false,'Existing private text must not be exposed by a preset');
assert.equal(privateItem.notes,'Private staff observation');
const visible = {...privateItem,owner_visible:true};
assert.equal(applySuggestedAnswer(visible,text).owner_visible,true);
console.log('PASS: 21 question-specific option sets; status/scope restrictions; editable description merge; no repeated inserts; existing notes, private visibility, photos and status preserved.');
