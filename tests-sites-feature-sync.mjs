import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resourcePatch} from './src/lib/resourcePatch.mjs';
import {audioFileExtension} from './src/lib/audio-format.mjs';
import {checklistReportResult} from './src/lib/checklistReportResult.js';
assert.deepEqual(resourcePatch({id:'a',name:'Old',archived:false},{id:'b',name:'New',archived:false,updated_date:'now'}),{name:'New'});
assert.equal(audioFileExtension('audio/mp4;codecs=mp4a.40.2'),'m4a');
assert.equal(audioFileExtension('audio/webm;codecs=opus'),'webm');
assert.ok(checklistReportResult('Close windows and shutters','Normal','en'));
assert.ok(!checklistReportResult('Close windows and shutters','Unable to Check','en'));
const source=fs.readFileSync('base44/functions/recordPayment/entry.ts','utf8')
 .replace(/import \{ createClientFromRequest \} from '[^']+';/,'const createClientFromRequest = () => globalThis.__paymentTestClient;')
 .replace("'../../shared/payments.js'",JSON.stringify(pathToFileURL(process.cwd()+'/base44/shared/payments.js').href));
const handler=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const payment={amount:100,date:'2026-10-16',method:'Cash'};
let invoice,charges,writes,role='admin';
function reset(charge={id:'c',amount:100,status:'Due',payments:[]},inv={id:'i',total:100,status:'Sent',charge_ids:['c'],payments:[]}) {
 invoice=structuredClone(inv);charges={c:structuredClone(charge)};writes=0;role='admin';
 globalThis.__paymentTestClient={
  auth:{me:async()=>({role,email:'test@example.invalid'})},
  entities:{
   Invoice:{get:async()=>structuredClone(invoice),update:async(id,p)=>{writes++;invoice={...invoice,...p};return structuredClone(invoice);}},
   BillingCharge:{get:async id=>structuredClone(charges[id]),update:async(id,p)=>{writes++;charges[id]={...charges[id],...p};return structuredClone(charges[id]);}}
  }
 };
}
async function call(body){const r=await handler(new Request('https://test.invalid/recordPayment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:'Invoice',id:'i',...body})}));return {status:r.status,data:await r.json()};}
reset();
let r=await call({action:'record',payment});assert.equal(r.status,200,JSON.stringify(r.data));
assert.equal(charges.c.status,'Paid');assert.equal(charges.c.paid_invoice_id,'i');
r=await call({action:'void',voidIndex:0,voidReason:'Simulation correction'});
assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(charges.c.status,'Due');assert.equal(charges.c.paid_invoice_id,'');assert.equal(invoice.payments[0].voided,true);
reset({id:'c',amount:100,status:'Due',payments:[{...payment,amount:25}]});
r=await call({action:'record',payment});assert.equal(r.status,200);assert.equal(charges.c.status,'Due');assert.equal(charges.c.payments[0].amount,25);assert.ok(r.data.ledger_warnings.length);
reset({id:'c',amount:100,status:'Paid',payments:[]},{id:'i',total:100,status:'Paid',charge_ids:['c'],payments:[payment]});
r=await call({action:'void',voidIndex:0,voidReason:'Simulation correction'});assert.equal(r.status,200);assert.equal(charges.c.status,'Paid');assert.ok(r.data.ledger_warnings.length);
reset();r=await call({action:'record',payment:{...payment,amount:101}});assert.equal(r.status,400);assert.equal(writes,0);
reset();role='user';r=await call({action:'record',payment});assert.equal(r.status,403);assert.equal(writes,0);
const schema=JSON.parse(fs.readFileSync('base44/entities/BillingCharge.jsonc','utf8'));assert.equal(schema.properties.paid_invoice_id.type,'string');
const app=fs.readFileSync('src/App.jsx','utf8');assert.ok(app.includes('<Route path="/agreement-terms" element={<AgreementTerms />} />'));
console.log('PASS: edited-field saves, Safari audio format, report status wording, simulated invoice payment and void, independent/historical payments preserved, overpayment and staff access blocked. No live records used.');
