import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

const SECRET_NAME = 'WEBSITE_PRICE_FEED_KEY';
const KEY_HEADER = 'x-website-price-feed-key';

// Read-only price feed for the separate public website app.
// Only the seven approved services are ever exposed, matched by stable record
// ID. Prices, hourly rates, time allowances and availability are read LIVE
// from the service records, so updating a price in this app updates the
// website automatically. Nothing else from any record is returned.
// Fail-closed: until the WEBSITE_PRICE_FEED_KEY secret is set in this app's
// Secrets settings, EVERY request is denied, and the response never reveals
// whether the secret is configured.
const APPROVED_SERVICES = [
  {
    record_id: '6a626bd947df156e4c466653',
    service_key: 'quick_check',
    name: 'Quick Check',
    billing_unit: 'month',
    description: 'A quick monthly visual check of your property: obvious leaks or water issues, visible damage, signs of forced entry, and anything clearly unusual. Every visit is recorded.',
  },
  {
    record_id: '6a626bd947df156e4c466654',
    service_key: 'property_care',
    name: 'Property Care',
    billing_unit: 'month',
    description: 'A more thorough monthly property-care visit covering leaks, moisture, visible damage, doors and windows, plus your selected monitoring priorities and a visit report.',
  },
  {
    record_id: '6a626bd947df156e4c466655',
    service_key: 'complete_care',
    name: 'Complete Care',
    billing_unit: 'month',
    description: 'The most comprehensive monthly package: a detailed visit of up to 60 minutes covering your chosen priorities, with photos and a full visit report.',
  },
  {
    record_id: '6a626bd947df156e4c466656',
    service_key: 'emergency_visit',
    name: 'Emergency Visit',
    billing_unit: 'visit',
    description: 'Urgent attendance for concerns such as a water leak, intrusion, storm or power issue — first 60 minutes included.',
  },
  {
    record_id: '6a626bd947df156e4c466657',
    service_key: 'owner_arrival_preparation',
    name: 'Owner Arrival Preparation',
    billing_unit: 'visit',
    description: 'Pre-arrival visual check and airing of the property so everything is in order for your arrival — up to 60 minutes included.',
  },
  {
    record_id: '6a626bd947df156e4c466658',
    service_key: 'grocery_stocking',
    name: 'Grocery Stocking',
    billing_unit: 'visit',
    description: 'Send us your shopping list and we shop, deliver to the property, and put the basics away before you arrive.',
  },
  {
    record_id: '6a626bd947df156e4c466659',
    service_key: 'owner_representative_site_visit',
    name: 'Owner-Representative Site Visit',
    billing_unit: 'visit',
    description: 'We attend your property or project on your behalf, document observable progress and concerns with photos, and report back — first 60 minutes included.',
  },
];

function keysMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function(req) {
  try {
    const configured = secrets.get(SECRET_NAME);
    let provided = req.headers.get(KEY_HEADER);
    if (!provided) {
      try {
        const body = await req.json();
        if (body && typeof body.key === 'string') provided = body.key;
      } catch (e) {}
    }
    if (!configured || !provided || !keysMatch(provided, configured)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const packages = await base44.asServiceRole.entities.ServicePackage.list();
    const byId = {};
    for (const p of packages) byId[p.id] = p;

    const services = [];
    for (const cfg of APPROVED_SERVICES) {
      const rec = byId[cfg.record_id];
      if (!rec || rec.active === false) continue;
      services.push({
        service_key: cfg.service_key,
        name: cfg.name,
        description: cfg.description,
        price: rec.standard_price,
        billing_unit: cfg.billing_unit,
        hourly_rate: rec.hourly_charge != null ? rec.hourly_charge : null,
        time_allowance: rec.visit_duration || null,
      });
    }

    // Owner profile for the landing page 'Meet your local contact' section.
    // Strict field allowlisting — only the owner_profile_* fields below are
    // ever exposed. A settings read failure leaves the profile null (the
    // website keeps its placeholders) without affecting prices.
    let owner_profile = null;
    try {
      const settingsList = await base44.asServiceRole.entities.BusinessSettings.list('-created_date', 10);
      const s = settingsList && settingsList[0];
      if (s) {
        owner_profile = {
          name: s.owner_profile_name || null,
          photo: s.owner_profile_photo || null,
          intro_en: s.owner_profile_intro_en || null,
          intro_el: s.owner_profile_intro_el || null,
          phone: s.owner_profile_phone || null,
          email: s.owner_profile_email || null,
          whatsapp: s.owner_profile_whatsapp || null,
          viber: s.owner_profile_viber || null,
          local_photo: s.owner_profile_local_photo || null,
        };
      }
    } catch (e) {}

    return Response.json({ services, owner_profile });
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}