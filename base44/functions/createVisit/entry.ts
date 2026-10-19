import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { propertyScopeError, EXTERIOR_ONLY_VISIT_TYPES } from '../../shared/propertyScope.js';

// Guarded creation of property visits.
//
// Seasonal Opening / Seasonal Closing can never be started or scheduled
// without a saved, visit-specific owner approval (approved via + approved
// steps for this visit). The check runs HERE — at creation — so no booking
// path (Add Service, the visit wizard, an agreement's automatic first visit,
// or a direct API call) can create such a visit without it. All other visit
// types are created unchanged with the exact payload they were given.
const SEASONAL_TYPES = ['Seasonal Opening', 'Seasonal Closing'];
const EXTERIOR_CHECKLIST = [
  'Exterior walls, visible damage or vandalism',
  'Grounds, paths and visible drainage',
  'Gates, fences and exterior access points',
  'Exterior doors and shutters — visible condition',
  'Windows — visible condition from outside only',
  'Visible signs of water leaks or storm damage outside',
  'Garden, balcony or pool areas visible from outside',
  'Photographs of exterior observations only',
  'Confirm no entry into the home or interior areas',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const visit = body && typeof body === 'object' ? body : null;
    if (!visit || !visit.property_id || !visit.visit_type) {
      return Response.json({ error: 'property_id and visit_type are required' }, { status: 400 });
    }

    const property = await base44.entities.Property.get(visit.property_id).catch(() => null);
    if (!property) return Response.json({ error: 'Property not found.' }, { status: 404 });
    const scopeError = propertyScopeError(property, visit.visit_type);
    if (scopeError) return Response.json({ error: scopeError }, { status: 422 });

    const payload = { ...visit };
    if (EXTERIOR_ONLY_VISIT_TYPES.includes(visit.visit_type)) {
      payload.checklist = EXTERIOR_CHECKLIST.map((name) => ({
        name,
        status: 'Not Checked',
        notes: '',
        recommendation: '',
        action_taken: '',
        owner_visible: true,
        photos: [],
      }));
    }
    if (SEASONAL_TYPES.includes(visit.visit_type)) {
      const a = visit.owner_approval && typeof visit.owner_approval === 'object'
        ? visit.owner_approval : null;
      const valid = !!(a && a.approved_via && a.approved_tasks && String(a.approved_tasks).trim());
      if (!valid) {
        return Response.json({
          error: 'OWNER_APPROVAL_REQUIRED',
          message: 'A saved, visit-specific owner approval (approved via + approved steps) is required before scheduling or starting a Seasonal Opening / Seasonal Closing visit.',
        }, { status: 422 });
      }
      payload.owner_approval = {
        ...a,
        approved_tasks: String(a.approved_tasks).trim(),
        ...(a.approved_at ? {} : { approved_at: new Date().toISOString() }),
        ...(a.recorded_by ? {} : { recorded_by: user.full_name || user.email || '' }),
      };
    }

    const created = await base44.entities.PropertyVisit.create(payload);
    return Response.json({ visit: created });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}