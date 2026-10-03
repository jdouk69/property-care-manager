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

        const appUrl = 'https://propertycarecrete.com/assessment-requests';
        // Escape customer-entered text before it touches the HTML email.
        const esc = (v) => String(v ?? '')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        const rows = el ? [
          ['Ονοματεπώνυμο', name],
          ['Email', email],
          ['Τηλέφωνο', phone || '—'],
          ['Τοποθεσία ακινήτου', property_location],
          ['Τύπος ακινήτου', property_type || '—'],
        ] : [
          ['Name', name],
          ['Email', email],
          ['Phone', phone || '—'],
          ['Property location', property_location],
          ['Property type', property_type || '—'],
        ];

        // Plain-text version: labeled lines, line breaks preserved.
        const text = [
          el ? 'Υπάρχει νέο αίτημα αξιολόγησης από την ιστοσελίδα.' : 'A new assessment request was submitted from the website.',
          '',
          ...rows.map(([label, value]) => `${label}: ${value}`),
          '',
          el ? 'Μήνυμα:' : 'Message:',
          notes,
          '',
          el ? `Δείτε το στο app: ${appUrl}` : `View it in the app: ${appUrl}`,
        ].join('\n');

        // Mobile-friendly HTML version: labeled rows, escaped values, app button.
        const labelStyle = 'padding:6px 12px 6px 0;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;';
        const valueStyle = 'padding:6px 0;color:#111827;font-size:14px;vertical-align:top;word-break:break-word;';
        const rowsHtml = rows.map(([label, value]) =>
          `<tr><td style="${labelStyle}"><strong style="font-weight:600;">${esc(label)}</strong></td><td style="${valueStyle}">${esc(value)}</td></tr>`
        ).join('');
        const heading = el ? 'Υπάρχει νέο αίτημα αξιολόγησης από την ιστοσελίδα.' : 'A new assessment request was submitted from the website.';
        const messageLabel = el ? 'Μήνυμα' : 'Message';
        const buttonLabel = el ? 'Δείτε το στο app' : 'View request in app';
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
    <tr><td style="padding:20px 24px 8px;font-size:15px;color:#374151;">${esc(heading)}</td></tr>
    <tr><td style="padding:8px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
    </td></tr>
    <tr><td style="padding:16px 24px 4px;font-size:14px;font-weight:600;color:#111827;">${esc(messageLabel)}</td></tr>
    <tr><td style="padding:0 24px;font-size:14px;line-height:1.6;color:#111827;word-break:break-word;">${esc(notes).replace(/\n/g, '<br>')}</td></tr>
    <tr><td style="padding:24px;">
      <a href="${appUrl}" style="display:inline-block;background:#1a262e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${esc(buttonLabel)}</a>
    </td></tr>
  </table>
</div></body></html>`;

        for (const admin of admins) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject,
            html,
            text,
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