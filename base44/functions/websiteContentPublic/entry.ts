import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Public, read-only delivery of PUBLISHED homepage section content for
// visitors who are not signed in. Draft content is NEVER returned — the
// public site changes only when an admin explicitly publishes.
// Only the eight approved section keys pass through, and only the en/el
// language blocks inside each published object; anything else stored on a
// record is dropped. Prices are NOT served here — they come from the
// websitePrices function, which reads them live from ServicePackage records.
const ALLOWED_KEYS = new Set([
  'hero',
  'services',
  'add_on_services',
  'how_it_works',
  'why_us',
  'service_area',
  'faqs',
  'contact',
]);

function sanitizePublished(pub) {
  if (!pub || typeof pub !== 'object' || Array.isArray(pub)) return null;
  const out = {};
  for (const lang of ['en', 'el']) {
    const block = pub[lang];
    if (block && typeof block === 'object' && !Array.isArray(block)) out[lang] = block;
  }
  return Object.keys(out).length ? out : null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const records = await base44.asServiceRole.entities.WebsiteSection.list();
    const sections = {};
    for (const r of records || []) {
      if (!r || !ALLOWED_KEYS.has(r.section_key)) continue;
      const pub = sanitizePublished(r.published);
      if (pub) sections[r.section_key] = pub;
    }
    return Response.json({ sections });
  } catch (error) {
    return Response.json({ error: 'Website content temporarily unavailable' }, { status: 503 });
  }
}