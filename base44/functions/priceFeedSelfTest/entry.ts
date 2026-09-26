import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

// TEMPORARY server-side self-test for the websitePriceFeed authorization.
// Reads WEBSITE_PRICE_FEED_KEY only inside the function environment and
// invokes the feed server-to-server. The key never appears in any response,
// log, or browser code. Deleted after verification.
export default async function(req) {
  try {
    const configured = secrets.get('WEBSITE_PRICE_FEED_KEY');
    if (!configured || typeof configured !== 'string' || configured.length === 0) {
      return Response.json({ error: 'Secret not configured in function environment' }, { status: 500 });
    }
    const base44 = createClientFromRequest(req);
    const res = await base44.functions.invoke('websitePriceFeed', { key: configured });
    const services = (res.data && res.data.services) || [];
    const expectedKeys = ['complete_care','emergency_visit','grocery_stocking','owner_arrival_preparation','owner_representative_site_visit','property_care','quick_check'].sort();
    const expectedFields = ['billing_unit','description','hourly_rate','name','price','service_key','time_allowance'];
    const keysMatch = JSON.stringify(services.map(s => s.service_key).sort()) === JSON.stringify(expectedKeys);
    const fieldsMatch = services.length > 0 && services.every(s => JSON.stringify(Object.keys(s).sort()) === JSON.stringify(expectedFields));
    const summary = {};
    services.forEach(s => { summary[s.service_key] = { price: s.price, billing_unit: s.billing_unit, hourly_rate: s.hourly_rate, time_allowance: s.time_allowance }; });
    return Response.json({ status: res.status, count: services.length, keysMatch, fieldsMatch, summary });
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}