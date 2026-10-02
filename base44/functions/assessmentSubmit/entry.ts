import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { waitUntil } from 'base44:runtime';

// Public endpoint for the website's "Request a Property Assessment" form.
// Anyone can reach it, so input is strictly validated and a honeypot field
// silently absorbs bots. Records are created with the service role; the
// AssessmentRequest entity itself is readable ONLY by website administrators.
export default async function (req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const clean = (v, max) => String(v ?? '').trim().slice(0, max);
    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    const phone = clean(body.phone, 60);
    const property_location = clean(body.property_location, 200);
    const property_type = clean(body.property_type, 60);
    const notes = clean(body.notes, 2000);
    const language = body.language === 'Greek' ? 'Greek' : 'English';

    // Honeypot: real visitors never fill this. Pretend success, store nothing.
    if (clean(body.company_field, 200)) {
      return Response.json({ ok: true });
    }

    if (name.length < 2 || !email.includes('@') || email.includes(' ')) {
      return Response.json({ error: 'Invalid details' }, { status: 400 });
    }
    if (!property_location || notes.length < 5) {
      return Response.json({ error: 'Missing information' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.AssessmentRequest.create({
      name,
      email,
      phone,
      property_location,
      property_type,
      notes,
      language,
      status: 'New',
    });

    // Non-critical: notify registered admin users by email after the response.
    waitUntil((async () => {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const admins = (users || []).filter((u) => u.role === 'admin' && u.email);
        const el = language === 'Greek';
        const subject = el
          ? 'Νέο αίτημα αξιολόγησης ακινήτου — ' + name
          : 'New property assessment request — ' + name;
        const body = (el
          ? [
              'Υπάρχει νέο αίτημα αξιολόγησης από την ιστοσελίδα.',
              '',
              'Ονοματεπώνυμο: ' + name,
              'Email: ' + email,
              'Τηλέφωνο: ' + (phone || '—'),
              'Τοποθεσία ακινήτου: ' + property_location,
              'Τύπος ακινήτου: ' + (property_type || '—'),
              '',
              'Μήνυμα:',
              notes,
              '',
              'Δείτε το στο app: https://propertycarecrete.com/assessment-requests',
            ]
          : [
              'A new assessment request was submitted from the website.',
              '',
              'Name: ' + name,
              'Email: ' + email,
              'Phone: ' + (phone || '—'),
              'Property location: ' + property_location,
              'Property type: ' + (property_type || '—'),
              '',
              'Message:',
              notes,
              '',
              'View it in the app: https://propertycarecrete.com/assessment-requests',
            ]).join('\n');
        for (const admin of admins) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject,
            body,
          });
        }
      } catch (error) {
        // Email failure must never affect the customer's submission.
      }
    })());

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Unable to submit request' }, { status: 500 });
  }
}