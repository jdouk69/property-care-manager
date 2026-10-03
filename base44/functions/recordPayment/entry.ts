// Payment recording & corrections — the ONLY path that changes payment state
// on a BillingCharge or Invoice. Payments are ALWAYS manually confirmed by
// staff through this function; nothing is ever inferred from a QR scan,
// payment screenshot or invoice send.
//
// - "record": appends one audit-trail entry (amount, date, method, optional
//   bank reference, recorded_by/recorded_at). Partial payments allowed —
//   the stored status only becomes Paid when the balance reaches zero.
// - "void": marks an existing entry voided with a required reason. The entry
//   STAYS visible (voided_at/voided_by/void_reason) — the audit trail is
//   never rewritten. Voiding can correct a wrong amount/method/date or a
//   duplicated entry; balance and statuses are recomputed after every action.
//
// Legacy records (status Paid, no stored entries) are adopted as one legacy
// entry on first touch so the trail reflects real history.
//
// Concurrency guard: after each write the record is re-read and the balance
// re-verified; if a concurrent payment slipped in and overpaid the balance,
// the just-recorded entry is automatically voided (with an explanatory
// reason) and a conflict is returned.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  paymentEntries, legacyPaymentEntry, paidTotal, balanceOf, round2, PAYMENT_EPS,
} from '../../shared/payments.js';

const METHODS = ["Bank Transfer", "IRIS", "Cash", "Wise", "Revolut", "Other"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden — admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const entity = String(body.entity || "");
    const id = String(body.id || "");
    const action = String(body.action || "");
    if (!["BillingCharge", "Invoice"].includes(entity)) {
      return Response.json({ error: "Unsupported entity" }, { status: 400 });
    }
    if (!id) return Response.json({ error: "Missing record id" }, { status: 400 });
    if (!["record", "void"].includes(action)) {
      return Response.json({ error: "Unsupported action" }, { status: 400 });
    }

    const rec = await base44.entities[entity].get(id);
    if (!rec) return Response.json({ error: "Record not found" }, { status: 404 });
    if (rec.archived) return Response.json({ error: "This record is archived" }, { status: 400 });

    const isCharge = entity === "BillingCharge";
    const amountField = isCharge ? "amount" : "total";
    const baseAmount = round2(Number(rec[amountField] ?? 0));
    if (isCharge && rec.status === "Waived") {
      return Response.json({ error: "Waived charges cannot receive payments" }, { status: 400 });
    }
    if (!isCharge && rec.status === "Cancelled") {
      return Response.json({ error: "Cancelled invoices cannot receive payments" }, { status: 400 });
    }

    // Adopt a legacy full payment so the audit trail starts from real history.
    let payments = Array.isArray(rec.payments) ? rec.payments.map((p) => ({ ...p })) : [];
    if (payments.length === 0 && rec.status === "Paid") {
      const legacy = legacyPaymentEntry(rec, amountField);
      if (legacy) payments.push(legacy);
    }

    let appendedIndex = -1; // for the concurrency rollback
    if (action === "record") {
      const p = body.payment || {};
      const amount = round2(Number(p.amount));
      const date = String(p.date || "").slice(0, 10);
      const method = String(p.method || "");
      const reference = String(p.reference || "").slice(0, 300);
      if (!(amount > 0)) {
        return Response.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json({ error: "A payment date is required" }, { status: 400 });
      }
      if (!METHODS.includes(method)) {
        return Response.json({ error: "Unsupported payment method" }, { status: 400 });
      }
      const balance = balanceOf({ ...rec, payments }, amountField);
      if (balance <= PAYMENT_EPS) {
        return Response.json({ error: "This item is already fully paid" }, { status: 400 });
      }
      if (amount > balance + PAYMENT_EPS) {
        return Response.json({ error: "The amount exceeds the remaining balance" }, { status: 400 });
      }
      appendedIndex = payments.length;
      payments.push({
        amount,
        date,
        method,
        reference,
        recorded_by: user.full_name || user.email || "",
        recorded_at: new Date().toISOString(),
      });
    } else {
      const idx = Number(body.voidIndex);
      const reason = String(body.voidReason || "").trim();
      if (!Number.isInteger(idx) || idx < 0 || idx >= payments.length) {
        return Response.json({ error: "Payment entry not found" }, { status: 400 });
      }
      if (payments[idx].voided) {
        return Response.json({ error: "This entry is already voided" }, { status: 400 });
      }
      if (!reason) {
        return Response.json({ error: "A correction reason is required" }, { status: 400 });
      }
      payments[idx] = {
        ...payments[idx],
        voided: true,
        voided_at: new Date().toISOString(),
        voided_by: user.full_name || user.email || "",
        void_reason: reason,
      };
    }

    const applyPatch = (extra = {}) => {
      const paid = paidTotal(paymentEntries({ payments }));
      const balance = round2(baseAmount - paid);
      const active = paymentEntries({ payments });
      const latest = active.length ? active[active.length - 1] : null;
      const patch = { payments, ...extra };
      if (isCharge) {
        if (balance <= PAYMENT_EPS) {
          patch.status = "Paid";
          if (latest) {
            patch.paid_date = latest.date;
            patch.payment_method = latest.method;
            patch.payment_reference = latest.reference || "";
          }
        } else if (rec.status === "Paid") {
          // A correction voided part of a previously "fully paid" charge —
          // reopen it so the balance is visible again.
          patch.status = "Due";
        }
        return { patch, paid, balance };
      }
      patch.amount_paid = paid;
      if (balance <= PAYMENT_EPS && baseAmount > 0) {
        patch.status = "Paid";
        if (latest) patch.payment_date = latest.date;
      } else if (paid > PAYMENT_EPS) {
        patch.status = "Partially Paid";
      } else {
        // All payments voided — return to the pre-payment document state.
        patch.status = rec.sent_at ? "Sent" : "Draft";
      }
      return { patch, paid, balance };
    };

    const { patch, paid, balance } = applyPatch();
    const updated = await base44.entities[entity].update(id, patch);

    // Concurrency guard: re-read and confirm nothing overpaid the balance.
    const recheck = await base44.entities[entity].get(id);
    const recheckBalance = balanceOf(recheck, amountField);
    if (recheckBalance < -PAYMENT_EPS) {
      if (appendedIndex >= 0) {
        const rolled = (recheck.payments || []).map((p, i) => (
          i === appendedIndex && !p.voided
            ? {
                ...p,
                voided: true,
                voided_at: new Date().toISOString(),
                voided_by: "system",
                void_reason: "Automatic reversal — a concurrent payment already covered this balance",
              }
            : p
        ));
        await base44.entities[entity].update(id, { payments: rolled });
      }
      return Response.json({
        error: "A concurrent payment was just recorded — nothing was double-counted. Please refresh and try again.",
      }, { status: 409 });
    }

    // Invoice fully paid → one-way sync to its linked ledger charges
    // (same behavior as the previous full-amount mark-paid flow).
    if (!isCharge && recheckBalance <= PAYMENT_EPS && Array.isArray(recheck.charge_ids)) {
      for (const cid of recheck.charge_ids) {
        if (!cid) continue;
        const ch = await base44.entities.BillingCharge.get(cid).catch(() => null);
        if (ch && ch.status === "Due" && !ch.archived) {
          const active = paymentEntries(recheck);
          const latest = active.length ? active[active.length - 1] : null;
          await base44.entities.BillingCharge.update(cid, {
            status: "Paid",
            paid_date: latest ? latest.date : undefined,
          }).catch(() => {});
        }
      }
    }

    // Diagnostic automation log (app preference).
    await base44.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: action === "record" ? "payment-record" : "payment-correction",
      record_created: `${entity} ${id} — ${action === "record" ? `recorded €${round2(Number(body.payment?.amount))} (${body.payment?.method})` : `voided payment entry #${Number(body.voidIndex)} — ${String(body.voidReason || "").slice(0, 120)}`} · balance €${balance} of €${baseAmount}`,
      status: "success",
    }).catch(() => {});

    return Response.json({ ok: true, record: updated, paid, balance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}