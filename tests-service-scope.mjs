import test from 'node:test';
import assert from 'node:assert/strict';
import { isReportExcludedVisit, QUICK_CHECK_TYPE, COMPLETE_CARE_FOLLOWUP_TYPE } from './src/lib/visitTypeLabels.js';
import { buildRecommendation } from './src/lib/servicePricing.js';
test('Quick Check includes a customer report while the Complete Care follow-up keeps its photo update', () => {
  assert.equal(isReportExcludedVisit({visit_type: QUICK_CHECK_TYPE}), false);
  assert.equal(isReportExcludedVisit({visit_type: COMPLETE_CARE_FOLLOWUP_TYPE}), true);
});
test('A 30-minute Quick Check estimate fits its allowance without changing its price', () => {
  const result = buildRecommendation({tier:'Basic',purchaseType:'Recurring',basePrice:55,assessment:{assessment_visit_time:'15–30 minutes'}});
  assert.equal(result.recommendedPrice,55);
  assert.ok(!result.reasons.some(r=>r.includes('exceeds')));
});

test('Public service renames preserve stable keys and live prices', async () => {
  const { buildWebsitePriceData } = await import('./base44/shared/websitePriceData.js');
  const pkgs = [
    {id:'6a626bd947df156e4c466653',name:'Quick Check',standard_price:55,one_time_price:65,visit_duration:'15–30 minutes'},
    {id:'6a626bd947df156e4c466659',name:'Contractor & Delivery Visit',standard_price:110,hourly_charge:45,visit_duration:'Up to 60 minutes'}
  ];
  const result = await buildWebsitePriceData({asServiceRole:{entities:{ServicePackage:{list:async()=>pkgs},BusinessSettings:{list:async()=>[]}}}});
  const oneTime = result.services.find(s=>s.service_key==='quick_check_one_time');
  assert.equal(oneTime.name,'On-Demand Quick Check');
  assert.equal(oneTime.price,65);
  const monthly = result.services.find(s=>s.service_key==='quick_check');
  assert.equal(monthly.name,'Quick Check');
  assert.equal(monthly.price,55);
  const attendance = result.services.find(s=>s.service_key==='owner_representative_site_visit');
  assert.equal(attendance.name,'Contractor & Delivery Visit');
  assert.equal(attendance.price,110);
});
