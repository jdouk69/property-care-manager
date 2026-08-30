import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public (unauthenticated) intake endpoint.
// Authenticity = the secure_token. The function ONLY ever touches the single
// CustomerIntake record whose secure_token matches, and returns no other data.
// It never reads or writes Client / Property / Agreement / any other entity.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) { body = {}; }

    const { token, action, payload } = body || {};

    if (!token || typeof token !== "string" || token.length < 8) {
      return Response.json({ error: "Invalid link" }, { status: 400 });
    }
    if (!["get", "save", "submit"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const found = await base44.asServiceRole.entities.CustomerIntake.filter({ secure_token: token });
    const intake = found && found[0];
    if (!intake) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // GET — always allowed, returns only safe fields.
    if (action === "get") {
      return Response.json({
        status: intake.status,
        payload: intake.payload || {},
        submitted_at: intake.submitted_at || null,
      });
    }

    // SAVE / SUBMIT — only allowed before the form is submitted.
    const submitted = ["Received", "Reviewed", "Applied"].includes(intake.status) || intake.archived;
    if (submitted) {
      return Response.json({
        error: "already_submitted",
        status: intake.status,
        submitted_at: intake.submitted_at || null,
      }, { status: 409 });
    }

    const update = { payload: (payload && typeof payload === "object") ? payload : {} };
    if (action === "submit") {
      update.status = "Received";
      update.submitted_at = new Date().toISOString();
    }

    const updated = await base44.asServiceRole.entities.CustomerIntake.update(intake.id, update);
    return Response.json({
      status: updated.status,
      submitted_at: updated.submitted_at || null,
    });
  } catch (error) {
    return Response.json({ error: error.message || "Server error" }, { status: 500 });
  }
}