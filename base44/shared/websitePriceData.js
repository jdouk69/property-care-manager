// Single source for the public website's price data, used by both
// websitePrices (the public site's own feed) and websitePriceFeed (the
// key-protected feed for external consumers). Reading the records directly
// here — instead of one function calling the other — means the public site
// can never be served an older deployed copy of the feed.
//
// Only the nine approved services are ever exposed, matched by stable record
// ID. Prices, hourly rates, time allowances and availability are read LIVE
// from the service records. Services flagged live_description also return the
// record's customer-facing description live; all other copy is curated here.
// Nothing else from any record is returned.
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
    live_description: true,
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
    record_id: '6aad8b50a7fd40c49fdc79ff',
    service_key: 'seasonal_opening',
    name: 'Seasonal Opening',
    billing_unit: 'visit',
    description: "Get your home ready after a period away. We air it, look for obvious visible problems, and carry out the simple opening steps you've agreed with us in advance — up to 60 minutes included.",
  },
  {
    record_id: '6aad8b703263310ebb1dc6e8',
    service_key: 'seasonal_closing',
    name: 'Seasonal Closing',
    billing_unit: 'visit',
    description: 'Prepare your home for a period away. We carry out the closing steps you have agreed with us in advance, check doors and shutters, and secure the property as instructed — up to 60 minutes included.',
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

// Returns { services, owner_profile } using the service role.
export async function buildWebsitePriceData(base44) {
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
      description: cfg.live_description ? (rec.description || null) : cfg.description,
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

  return { services, owner_profile };
}