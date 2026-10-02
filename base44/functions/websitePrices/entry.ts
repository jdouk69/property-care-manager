import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Server-side price fetch for the public website.
// Calls this app's own read-only websitePriceFeed function through the SDK —
// no hostname is hardcoded, so a change to the app's web address can never
// break the price feed again. The feed key is read from this app's
// server-side secret and NEVER reaches browser code, responses, or logs.
// Fail-closed: on any failure it returns a generic error — there are NO
// hard-coded fallback prices, so the site can never show stale prices.
export default async function(req) {
  try {
    const feedKey = secrets.get('WEBSITE_PRICE_FEED_KEY');
    if (!feedKey || typeof feedKey !== 'string' || feedKey.length === 0) {
      return Response.json({ error: 'Pricing temporarily unavailable' }, { status: 503 });
    }
    const base44 = createClientFromRequest(req);
    const res = await base44.asServiceRole.functions.invoke('websitePriceFeed', { key: feedKey });
    const data = res && res.data;
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