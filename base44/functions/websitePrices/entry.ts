import { secrets } from 'base44:runtime';

// Server-side price fetch for the public website.
// POSTs to the operational app's read-only price feed with the
// x-website-price-feed-key header. The key is read from this app's
// server-side secret and NEVER reaches browser code, responses, or logs.
// Fail-closed: on any failure it returns a generic error — there are NO
// hard-coded fallback prices, so the site can never show stale prices.
const FEED_URL = 'https://propertycarecrete.base44.app/functions/websitePriceFeed';

export default async function(req) {
  try {
    const feedKey = secrets.get('WEBSITE_PRICE_FEED_KEY');
    if (!feedKey || typeof feedKey !== 'string' || feedKey.length === 0) {
      return Response.json({ error: 'Pricing temporarily unavailable' }, { status: 503 });
    }
    const feedRes = await fetch(FEED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-website-price-feed-key': feedKey
      }
    });
    if (!feedRes.ok) {
      return Response.json({ error: 'Pricing temporarily unavailable' }, { status: 502 });
    }
    const data = await feedRes.json();
    const services = Array.isArray(data && data.services) ? data.services : [];
    const ownerProfile =
      data && typeof data.owner_profile === 'object' && data.owner_profile !== null
        ? data.owner_profile
        : null;
    return Response.json({ services, ownerProfile });
  } catch (error) {
    return Response.json({ error: 'Pricing temporarily unavailable' }, { status: 502 });
  }
}