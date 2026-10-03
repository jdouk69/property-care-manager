import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { buildWebsitePriceData } from '../../shared/websitePriceData.js';

const SECRET_NAME = 'WEBSITE_PRICE_FEED_KEY';
const KEY_HEADER = 'x-website-price-feed-key';

// Key-protected, read-only price feed for external consumers. The data itself
// (nine approved services, live prices, allowlisted owner profile) comes from
// the shared websitePriceData module, the same source the public site uses.
// Fail-closed: until the WEBSITE_PRICE_FEED_KEY secret is set, EVERY request
// is denied, and the response never reveals whether the secret is configured.
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
    const { services, owner_profile } = await buildWebsitePriceData(base44);
    return Response.json({ services, owner_profile });
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}