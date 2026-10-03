import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { buildWebsitePriceData } from '../../shared/websitePriceData.js';

// Server-side price data for the public website. Reads the approved services
// and live prices directly through the shared websitePriceData module — it no
// longer calls the websitePriceFeed function, so the site can never receive
// an older deployed copy of that feed.
// Fail-closed: on any failure it returns a generic error — there are NO
// hard-coded fallback prices, so the site can never show stale prices.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { services, owner_profile } = await buildWebsitePriceData(base44);
    return Response.json({ services, ownerProfile: owner_profile });
  } catch (error) {
    return Response.json({ error: 'Pricing temporarily unavailable' }, { status: 502 });
  }
}