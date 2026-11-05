import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail, Send, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPrivateFileRef, uploadPrivatePhoto } from "@/lib/photoStorage";
import { getIssueEmailDeliveries, sendIssueEmail } from "@/lib/issueEmailDelivery";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const RESPONSES = ["Owner will handle it", "Please coordinate", "Declined"];
const CHANNELS = ["Email", "WhatsApp", "SMS", "Phone", "In-person"];
const NO_CONTRACTOR_VALUE = "__none__";

function euro(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `€${amount.toFixed(2)}` : "—";
}

export default function IssueNextStepCard({ issue, property, client, contractor, staff, onIssueUpdated, emailDeliveries = [], onEmailDeliveriesUpdated, returnPath }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [fee, setFee] = useState(issue.coordination_fee == null ? "" : String(issue.coordination_fee));
  const [choice, setChoice] = useState("");
  const [editingChoice, setEditingChoice] = useState(false);
  const [channel, setChannel] = useState("Email");
  const [responseNote, setResponseNote] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [workDescription, setWorkDescription] = useState(issue.repair_work_description || issue.description || "");
  const [proposedMax, setProposedMax] = useState(issue.proposed_max_spend != null ? String(issue.proposed_max_spend) : issue.approved_max_spend == null ? "" : String(issue.approved_max_spend));
  const [repairReply, setRepairReply] = useState("");
  const [repairReplyChannel, setRepairReplyChannel] = useState("Email");
  const [repairApprovalConfirmed, setRepairApprovalConfirmed] = useState(false);
  const [feeReply, setFeeReply] = useState("");
  const [feeReplyChannel, setFeeReplyChannel] = useState("Email");
  const [feeApprovalConfirmed, setFeeApprovalConfirmed] = useState(false);
  const [revisedFeeMode, setRevisedFeeMode] = useState(false);
  const [quote, setQuote] = useState(issue.contractor_quotation == null ? "" : String(issue.contractor_quotation));
  const [capEdited, setCapEdited] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [savingContractor, setSavingContractor] = useState(false);
  const [uploadingQuote, setUploadingQuote] = useState(false);
  const [quoteSaveMessage, setQuoteSaveMessage] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    base44.entities.Contractor.list("-created_date", 500)
      .then((rows) => setContractors((rows || []).filter((row) => !row.archived)))
      .catch(() => setContractors([]));
  }, []);

  const selectedContractor = issue.contractor_id
    ? contractors.find((row) => row.id === issue.contractor_id) || (contractor?.id === issue.contractor_id ? contractor : null)
    : null;

  const saveQuoteDetails = async () => {
    setError(""); setSaving(true); setQuoteSaveMessage("");
    try {
      await updateIssue({
        repair_work_description: workDescription.trim(),
        contractor_quotation: Number(quote) || null,
        cost_estimate: Number(quote) || null,
        proposed_max_spend: Number(proposedMax) || null,
      });
      setQuoteSaveMessage(t("Quote details saved."));
    } catch (e) { setError(e?.message || t("Could not save quote details.")); }
    finally { setSaving(false); }
  };

  const saveSelectedContractor = async (contractorId) => {
    setSavingContractor(true); setError("");
    try { await updateIssue({ contractor_id: contractorId || "" }); }
    catch (e) { setError(e?.message || t("Could not save the contractor selection.")); }
    finally { setSavingContractor(false); }
  };

  const uploadContractorQuote = async (file) => {
    if (!file) return;
    setUploadingQuote(true); setError(""); setQuoteSaveMessage("");
    try {
      const fileUri = await uploadPrivatePhoto(file);
      await updateIssue({
        contractor_quote_file: fileUri,
        contractor_quote_file_name: file.name,
        contractor_quote_file_size: file.size,
        contractor_quote_file_type: file.type || (file.name.split(".").pop() || "").toUpperCase(),
      });
      setQuoteSaveMessage(t("Contractor quote uploaded and saved."));
    } catch (e) { setError(e?.message || t("Unable to upload contractor quote. Please try again.")); }
    finally { setUploadingQuote(false); }
  };

  const removeContractorQuote = async () => {
    setUploadingQuote(true); setError(""); setQuoteSaveMessage("");
    try {
      await updateIssue({ contractor_quote_file: "", contractor_quote_file_name: "", contractor_quote_file_size: null, contractor_quote_file_type: "" });
      setQuoteSaveMessage(t("Contractor quote removed."));
    } catch (e) { setError(e?.message || t("Could not remove the contractor quote.")); }
    finally { setUploadingQuote(false); }
  };

  const resolved = ["Completed", "Cancelled"].includes(issue.status) || issue.archived;
  const reportSent = !!issue.owner_report_sent_at;
  const ownerAction = issue.owner_action || "";
  const feeOfferCurrent = !!issue.coordination_fee_offer_sent_at
    && Number(issue.coordination_fee_offer_amount ?? issue.coordination_fee) === Number(issue.coordination_fee);
  const feeApprovalCurrent = issue.coordination_fee_approved === true
    && issue.coordination_fee_decision === "Approved"
    && Number(issue.coordination_fee_approved_amount) === Number(issue.coordination_fee)
    && feeOfferCurrent;
  const repairApprovalReady = issue.owner_approval_status === "Approved"
    && Number(issue.approved_max_spend) > 0
    && !!String(issue.repair_approval_note || "").trim()
    && ["Email", "WhatsApp", "SMS"].includes(issue.repair_approval_channel);
  const photoAttachments = useMemo(() => (issue.before_photos || [])
    .filter(isPrivateFileRef)
    .map((file_url, i) => ({ file_url, filename: `issue-${issue.id}-photo-${i + 1}.jpg` })), [issue.before_photos, issue.id]);

  const updateIssue = async (patch) => {
    const updated = await base44.entities.MaintenanceIssue.update(issue.id, patch);
    onIssueUpdated(updated);
    return updated;
  };

  const refreshEmailHistory = async () => {
    const rows = await getIssueEmailDeliveries(base44, issue.id);
    onEmailDeliveriesUpdated?.(rows);
    return rows;
  };

  const sendTracked = async (payload) => {
    try {
      const result = await sendIssueEmail(base44, { issue, client, ...payload });
      await refreshEmailHistory();
      return result;
    } catch (error) {
      await refreshEmailHistory().catch(() => {});
      throw error;
    }
  };

  const showNextStep = () => {
    window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const sendReport = async () => {
    setError("");
    if (!client?.email) {
      setError(t("The owner’s email is missing. Add it to the client record, then return here."));
      return;
    }
    const parsedFee = fee.trim() === "" ? null : Number(fee);
    if (parsedFee != null && (!Number.isFinite(parsedFee) || parsedFee <= 0)) {
      setError(t("Enter a positive coordination fee, or leave the field blank to send a report without offering coordination yet."));
      return;
    }
    if (reportSent && !window.confirm(t("This issue report was already emailed. Send it again?"))) return;
    setSending(true);
    let emailSent = false;
    try {
      const subject = `Property issue: ${issue.title}`;
      const body = [
        `Hello ${client.name || ""},`.trim(),
        "",
        `I found an issue at ${property?.name || "your property"}: ${issue.title}`,
        issue.category ? `Category: ${issue.category}` : "",
        issue.priority ? `Priority: ${issue.priority}` : "",
        issue.description ? `Details: ${issue.description}` : "",
        "",
        parsedFee != null
          ? `I can coordinate the repair for a separate service fee of ${euro(parsedFee)}. This email is not approval of that fee or of repair work. If you choose coordination, I will send the fee for your written approval before contacting contractors. After that, I will send the contractor quote and spending limit for separate written approval before booking work.`
          : "If you choose coordination, I will send my service fee for your written approval before contacting contractors. After that, I will send the contractor quote and spending limit for separate written approval before booking work.",
        "",
        "Please reply with exactly one of these:",
        "OWNER WILL HANDLE IT — I will arrange the repair myself.",
        "PLEASE COORDINATE — Send me your coordination fee for approval. This does not approve the fee or repair work.",
        "DECLINED — I do not want to proceed with this issue.",
        "",
        "This report does not authorize repair work or contractor spending.",
        "",
        "Property Care Crete",
      ].filter((line) => line !== undefined).join("\n");
      const delivery = await sendTracked({
        kind: "Issue report",
        subject,
        body,
        attachments: photoAttachments,
      });
      emailSent = true;

      const sentAt = delivery.sentAt;
      const updated = await updateIssue({
        ...(parsedFee != null ? { coordination_fee: parsedFee } : {}),
        owner_report_sent_at: sentAt,
        owner_report_sent_to: client.email,
        owner_report_message_id: delivery.messageId || "",
        owner_approval_status: "Pending",
        status: issue.status === "Reported" ? "Awaiting Owner Approval" : issue.status,
      });
      try {
        await base44.entities.OwnerCommunication.create({
          client_id: client.id || "", property_id: property?.id || issue.property_id,
          date: sentAt.slice(0, 10), communication_type: "Email", subject,
          message: body, related_maintenance_id: issue.id,
          template_used: "Open Issues — report and coordination choice",
          follow_up_required: true,
        });
      } catch (logError) {
        setError(t("The email was sent, but its communication log could not be saved. The issue was updated."));
      }
      onIssueUpdated(updated);
    } catch (e) {
      setError(emailSent
        ? t("The email service accepted the report, but the issue status could not be updated. Check Email history and Sent mail before trying again.")
        : (e?.message || t("Could not send the issue report.")));
    } finally {
      setSending(false);
    }
  };

  const confirmReportAlreadySent = async () => {
    setError(""); setSaving(true);
    try {
      const at = new Date().toISOString();
      const updated = await updateIssue({ owner_report_sent_at: at, owner_report_sent_to: client?.email || "", owner_approval_status: "Pending", status: issue.status === "Reported" ? "Awaiting Owner Approval" : issue.status });
      onIssueUpdated(updated);
    } catch (e) { setError(e?.message || t("Could not save the sent status.")); }
    finally { setSaving(false); }
  };

  const sendRepairApprovalRequest = async () => {
    setError("");
    if (!client?.email) { setError(t("The owner’s email is missing. Add it to the client record, then return here.")); return; }
    const quoteAmount = Number(quote);
    const cap = Number(proposedMax);
    const minimumCap = quoteAmount + Number(issue.coordination_fee || 0);
    if (!workDescription.trim() || !(quoteAmount > 0) || !(cap > 0)) { setError(t("Add the exact proposed work, contractor quote, and maximum total spend first.")); return; }
    if (cap < minimumCap) { setError(t("The maximum must cover the contractor quote plus your coordination fee.")); return; }
    if (!feeApprovalCurrent) { setError(t("The recorded fee approval does not match the current coordination fee. Send the fee proposal again for approval.")); return; }
    if (issue.repair_approval_request_sent_at && !window.confirm(t("A repair approval request was already sent. Send it again?"))) return;
    setSending(true); let emailSent = false;
    try {
      await updateIssue({ repair_work_description: workDescription.trim(), contractor_quotation: quoteAmount, cost_estimate: quoteAmount, proposed_max_spend: cap });
      const contractorName = selectedContractor?.company;
      const subject = `Repair approval needed: ${issue.title}`;
      const body = [
        `Hello ${client.name || ""},`.trim(), "",
        `For ${property?.name || "your property"}: ${issue.title}`,
        `Proposed work: ${workDescription.trim()}`,
        ...(contractorName ? [`Contractor: ${contractorName}`] : []),
        `Contractor quote: ${euro(quoteAmount)}`,
        `Property Care Crete coordination fee: ${euro(issue.coordination_fee)}`,
        `Maximum total authorization requested: ${euro(cap)}`,
        "",
        `To approve this exact work and maximum total of ${euro(cap)}, reply exactly: APPROVE REPAIR UP TO ${euro(cap)}.`,
        "To decline, reply exactly: DECLINE REPAIR.",
        "No repair will be booked until your written approval is recorded. Any change or amount above this limit will need your separate approval.",
        "", "Property Care Crete",
      ].join("\n");
      const attachments = issue.contractor_quote_file && isPrivateFileRef(issue.contractor_quote_file)
        ? [{ file_url: issue.contractor_quote_file, filename: issue.contractor_quote_file_name || `quote-${issue.id}.pdf` }]
        : [];
      const delivery = await sendTracked({ kind: "Repair approval", subject, body, attachments });
      emailSent = true;
      const at = delivery.sentAt;
      const updated = await updateIssue({ repair_approval_request_sent_at: at, repair_approval_request_sent_to: client.email, repair_approval_request_message_id: delivery.messageId || "", owner_approval_status: "Pending" });
      try { await base44.entities.OwnerCommunication.create({ client_id:client.id || "", property_id:property?.id || issue.property_id, date:at.slice(0,10), communication_type:"Email", subject, message:body, related_maintenance_id:issue.id, template_used:"Open Issues — repair quote approval", follow_up_required:true }); } catch (logError) { setError(t("The approval email was sent and issue details were saved, but its communication log could not be saved.")); }
      onIssueUpdated(updated);
    } catch (e) { setError(emailSent ? t("The email service accepted the approval request, but the issue status could not be updated. Check Email history and Sent mail before trying again.") : (e?.message || t("Could not send the repair approval request."))); }
    finally { setSending(false); }
  };

  const recordRepairDecision = async (approved) => {
    setError("");
    if (!repairReply.trim() || !["Email", "WhatsApp", "SMS"].includes(repairReplyChannel)) { setError(t("Record the owner’s written reply and how it arrived.")); return; }
    if (approved && !repairApprovalConfirmed) { setError(t("Confirm that the owner’s written reply approves this exact work and maximum amount.")); return; }
    setSaving(true);
    try {
      const at = new Date().toISOString();
      const updated = await updateIssue({ owner_approval_status: approved ? "Approved" : "Rejected", ...(approved ? { approved_max_spend: Number(issue.proposed_max_spend || proposedMax) } : {}), repair_approval_channel:repairReplyChannel, repair_approval_note:repairReply.trim(), owner_action_at:at, status:approved ? "Approved" : "Awaiting Owner Approval" });
      try { await base44.entities.OwnerCommunication.create({ client_id:client?.id || "", property_id:property?.id || issue.property_id, date:at.slice(0,10), communication_type:repairReplyChannel, subject:`Repair approval response: ${issue.title}`, message:repairReply.trim(), owner_response:repairReply.trim(), related_maintenance_id:issue.id, template_used:"Open Issues — repair approval decision", follow_up_required:false }); } catch (logError) { setError(t("The owner’s decision was saved on the issue, but the communication log could not be saved.")); }
      onIssueUpdated(updated); setRepairReply(""); setRepairApprovalConfirmed(false); showNextStep();
    } catch(e) { setError(e?.message || t("Could not save the owner’s repair decision.")); }
    finally { setSaving(false); }
  };

  const sendFeeOffer = async () => {
    setError("");
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("Enter a positive coordination fee before sending it for approval."));
      return;
    }
    if (!client?.email) {
      setError(t("The owner’s email is missing. Add it to the client record, then return here."));
      return;
    }
    setSending(true);
    let emailSent = false;
    try {
      const subject = `Coordination fee approval: ${issue.title}`;
      const body = [
        `Hello ${client.name || ""},`.trim(),
        "",
        "ISSUE",
        `${property?.name || "Your property"} — ${issue.title}`,
        "",
        "COORDINATION FEE",
        `${euro(amount)} for coordination only. The contractor’s repair cost is separate.`,
        "",
        "TO APPROVE",
        "Reply exactly: APPROVE COORDINATION FEE",
        "",
        "TO DECLINE",
        "Reply exactly: DECLINE COORDINATION FEE",
        "",
        "I will not contact a contractor until you approve this fee in writing.",
        "",
        "After I obtain a quote, I will send the proposed work and maximum total for your separate written approval before booking a repair.",
        "",
        "Property Care Crete",
      ].join("\n");
      const delivery = await sendTracked({ kind: "Coordination fee", subject, body, amount });
      emailSent = true;
      const sentAt = delivery.sentAt;
      const updated = await updateIssue({
        coordination_fee: amount,
        coordination_fee_offer_sent_at: sentAt,
        coordination_fee_offer_amount: amount,
        coordination_fee_offer_sent_to: client.email,
        coordination_fee_offer_message_id: delivery.messageId || "",
        coordination_fee_decision: "Pending",
        coordination_fee_approved: false,
      });
      try {
        await base44.entities.OwnerCommunication.create({
          client_id: client.id || "", property_id: property?.id || issue.property_id,
          date: sentAt.slice(0, 10), communication_type: "Email", subject, message: body,
          related_maintenance_id: issue.id, template_used: "Open Issues — coordination fee approval",
          follow_up_required: true,
        });
      } catch (logError) {
        setError(t("The email was sent, but its communication log could not be saved. The issue was updated."));
      }
      onIssueUpdated(updated);
    } catch (e) {
      setError(emailSent
        ? t("The email service accepted the fee request, but the issue status could not be updated. Check Email history and Sent mail before trying again.")
        : (e?.message || t("Could not send the fee approval request.")));
    } finally {
      setSending(false);
    }
  };

  const recordFeeDecision = async (approved) => {
    setError("");
    if (!issue.coordination_fee_offer_sent_at) {
      setError(t("Send the fee proposal before recording approval."));
      return;
    }
    if (!feeOfferCurrent) {
      setError(t("The fee changed after the last proposal. Send the updated fee and wait for the owner’s written response."));
      return;
    }
    if (!feeReply.trim() || !["Email", "WhatsApp", "SMS"].includes(feeReplyChannel)) {
      setError(t("Paste or summarize the owner’s written reply and choose how it arrived."));
      return;
    }
    if (approved && !feeApprovalConfirmed) {
      setError(t("Confirm that the owner’s written reply explicitly approves this coordination fee."));
      return;
    }
    setSaving(true);
    try {
      const at = new Date().toISOString();
      const updated = await updateIssue({
        coordination_fee_decision: approved ? "Approved" : "Declined",
        coordination_fee_approved: approved,
        coordination_fee_approved_amount: approved ? Number(issue.coordination_fee) : 0,
        coordination_fee_approval_channel: feeReplyChannel,
        coordination_fee_approval_note: feeReply.trim(),
      });
      try {
        await base44.entities.OwnerCommunication.create({
          client_id: client?.id || "",
          property_id: property?.id || issue.property_id,
          date: at.slice(0, 10),
          communication_type: feeReplyChannel,
          subject: `Coordination fee decision: ${issue.title}`,
          message: feeReply.trim(),
          owner_response: feeReply.trim(),
          related_maintenance_id: issue.id,
          template_used: "Open Issues — coordination fee decision",
          follow_up_required: false,
        });
      } catch (logError) {
        setError(t("The fee decision was saved on the issue, but its communication log could not be saved."));
      }
      onIssueUpdated(updated);
      setFeeReply("");
      setFeeApprovalConfirmed(false);
      showNextStep();
    } catch (e) {
      setError(e?.message || t("Could not save the coordination fee decision."));
    } finally {
      setSaving(false);
    }
  };

  const recordResponse = async () => {
    setError("");
    if (!choice || !responseNote.trim()) {
      setError(t("Choose the owner’s response and record what they said."));
      return;
    }
    if (choice === "Please coordinate" && !["Email", "WhatsApp", "SMS"].includes(channel)) {
      setError(t("Record the coordination request from a written message before treating it as approved."));
      return;
    }
    setSaving(true);
    try {
      const at = new Date().toISOString();
      const approval = choice === "Declined" ? "Rejected" : "Pending";
      const updated = await updateIssue({
        owner_action: choice,
        owner_action_at: at,
        owner_action_by: staff || "Staff",
        owner_action_channel: channel,
        owner_action_note: responseNote.trim(),
        ...(choice === "Please coordinate" ? { coordination_fee_decision: "Pending", coordination_fee_approved: false } : {}),
        owner_approval_status: approval,
        ...(["Declined", "Owner will handle it"].includes(choice) ? { status: "Reported" } : {}),
      });
      try {
        await base44.entities.OwnerCommunication.create({
          client_id: client?.id || "", property_id: property?.id || issue.property_id,
          date: at.slice(0, 10), communication_type: channel,
          subject: `Owner response: ${issue.title}`, message: responseNote.trim(),
          owner_response: responseNote.trim(), related_maintenance_id: issue.id,
          template_used: "Open Issues — owner decision", follow_up_required: choice === "Please coordinate",
        });
      } catch (logError) {
        setError(t("The owner’s decision was saved on the issue, but the communication log could not be saved."));
      }
      onIssueUpdated(updated);
      setChoice(""); setResponseNote(""); setEditingChoice(false);
      showNextStep();
    } catch (e) {
      setError(e?.message || t("Could not save the owner’s response."));
    } finally {
      setSaving(false);
    }
  };

  const card = "rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 mb-4 shadow-sm";

  if (resolved) return null;
  if (ownerAction === "Owner will handle it" || ownerAction === "Declined") {
    return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
      <div className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /><div>
        <h2 className="font-semibold text-sm">{ownerAction === "Declined" ? t("Owner declined coordination") : t("Owner will handle the repair")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("No contractor work is assigned to you. Keep the issue open and record any new owner direction here.")}</p>
        {issue.owner_action_note && <p className="text-xs mt-2">{issue.owner_action_channel || ""} · {issue.owner_action_note}</p>}
      </div></div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => { setEditingChoice((v) => !v); setChoice(""); setResponseNote(""); }}> {t(editingChoice ? "Cancel" : "Record a new owner response")} </Button>
      {editingChoice && choice === "" && <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">{RESPONSES.map((v) => <Button key={v} variant="outline" onClick={() => setChoice(v)}>{t(v)}</Button>)}</div>}
      {choice && <ResponseForm {...{t, choice, setChoice, channel, setChannel, responseNote, setResponseNote, saving, error, recordResponse}} />}
    </section>;
  }

  if (!reportSent) return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
    <div className="flex items-start gap-2"><Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Next step")}</p>
      <h2 className="font-semibold mt-0.5">{t("Send the report and ask the owner what they want to do")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("The email includes this issue and its photos. It offers owner-handled repair or paid coordination; it does not approve repair work or spending.")}</p>
    </div></div>
    <div className="mt-3 max-w-sm">
      <Label htmlFor="issue-coordination-fee" className="text-xs">{t("Coordination fee to offer (€)")}</Label>
      <Input id="issue-coordination-fee" type="number" min="0.01" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. 50" className="mt-1" />
      <p className="text-xs text-muted-foreground mt-1">{t("Leave blank to send a report only. If the owner asks you to coordinate, set a fee and get written approval before contacting contractors.")}</p>
    </div>
    {!client?.email && <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm">{t("The owner’s email is missing.")} {client?.id && <Button variant="link" className="h-auto p-0" onClick={() => navigate(`/clients?edit=${encodeURIComponent(client.id)}&focus=email&returnTo=${encodeURIComponent(`/maintenance/${issue.id}`)}`)}>{t("Add owner email")}</Button>}</div>}
    {error && <p role="alert" className="text-sm text-destructive mt-3">{error}</p>}
    {issue.status === "Reported" && <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs">{t("If you previously saw ‘email sent, issue could not be updated’, verify the message in your sent mail, then use this to prevent a duplicate.")} <Button variant="link" className="h-auto p-0 ml-1" disabled={saving} onClick={confirmReportAlreadySent}>{t("I confirmed it was sent")}</Button></div>}
    <Button onClick={sendReport} disabled={sending || !client?.email || (fee.trim() !== "" && !(Number(fee) > 0))} className="mt-3 rounded-xl gap-2">
      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{t(reportSent ? "Resend report" : "Email owner report")}
    </Button>
  </section>;

  if (!ownerAction) return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
    <div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /><div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Next step")}</p>
      <h2 className="font-semibold mt-0.5 text-slate-950">{t("Record the owner’s reply")}</h2>
      <p className="text-sm font-medium text-slate-800 mt-1">{t("The report was sent to {email}. This form records how the owner replied; saving it does not send an email or approve a fee or repair cost.", {email: issue.owner_report_sent_to || client?.email || "the owner"})}</p>
    </div></div>
    {choice === "" ? <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">{RESPONSES.map((v) => <Button key={v} variant={v === "Please coordinate" ? "default" : "outline"} onClick={() => setChoice(v)}>{t(v)}</Button>)}</div> : <ResponseForm {...{t, choice, setChoice, channel, setChannel, responseNote, setResponseNote, saving, error, recordResponse}} />}
  </section>;

  if (ownerAction === "Please coordinate" && issue.coordination_fee_decision === "Declined") return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
      <h2 className="font-bold text-slate-950">{t("The owner declined the coordination fee")}</h2>
      <p className="text-sm font-medium text-slate-800 mt-1">{t("Do not contact a contractor or incur costs. Ask the owner whether they want to discuss a different fee, or leave the issue open.")}</p>
    </div>
    {!revisedFeeMode ? <Button variant="outline" className="mt-3" onClick={()=>setRevisedFeeMode(true)}>{t("Offer a different coordination fee")}</Button> : <div className="mt-3 max-w-sm space-y-2"><Label htmlFor="issue-revised-coordination-fee">{t("New coordination fee (€)")}</Label><Input id="issue-revised-coordination-fee" type="number" min="0.01" step="0.01" value={fee} onChange={e=>setFee(e.target.value)}/>{error&&<p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}<Button onClick={sendFeeOffer} disabled={sending||!client?.email||!(Number(fee)>0)}>{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}{t("Email revised fee for approval")}</Button></div>}
  </section>;

  if (ownerAction === "Please coordinate" && !feeApprovalCurrent) return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
    <div className="flex items-start gap-2"><ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Next step")}</p>
      <h2 className="font-semibold mt-0.5 text-slate-950">{t(feeOfferCurrent ? "Record the owner’s fee decision" : "Next: email your coordination fee for approval")}</h2>
      <p className="text-sm font-medium text-slate-800 mt-1">{t(feeOfferCurrent ? "The fee proposal was accepted by the email service for {email}. This only confirms the email service accepted it for sending. Record the owner’s written approval of the exact fee below. Do not contact contractors until it is approved." : "The owner asked you to coordinate. Enter your coordination fee and press Email fee for approval below. Saving the owner’s reply did not send this email. Do not contact a contractor until the owner approves the exact fee in writing.", {email: issue.coordination_fee_offer_sent_to || client?.email || "the owner"})}</p>
    </div></div>
    {!feeOfferCurrent ? <div className="mt-3 max-w-sm">
      <Label htmlFor="issue-coordination-fee" className="text-xs">{t("Coordination fee (€)")}</Label>
      <Input id="issue-coordination-fee" type="number" min="0.01" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1" />
      {error && <p role="alert" className="text-sm font-semibold text-red-800 mt-2">{error}</p>}
      <Button onClick={sendFeeOffer} disabled={sending || !client?.email || !(Number(fee) > 0)} className="mt-3 rounded-xl gap-2">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{t("Email fee for approval")}</Button>
    </div> : <div className="mt-3 space-y-3 rounded-xl border-2 border-slate-300 bg-white p-3">
      <p className="text-sm font-bold text-slate-900">{t("The owner must approve the coordination fee itself. “Please coordinate” was only permission to send this proposal.")}</p>
      <div><Label className="text-sm font-semibold text-slate-900">{t("Paste or summarize the owner’s written fee response")}</Label><Textarea value={feeReply} onChange={(e) => setFeeReply(e.target.value)} rows={3} className="mt-1" placeholder={t("Example: I approve the €{amount} coordination fee.", {amount: euro(issue.coordination_fee)})} /></div>
      <div><Label className="text-sm font-semibold text-slate-900">{t("How did the owner reply?")}</Label><Select value={feeReplyChannel} onValueChange={setFeeReplyChannel}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{["Email","WhatsApp","SMS"].map((v) => <SelectItem key={v} value={v}>{t(v)}</SelectItem>)}</SelectContent></Select></div>
      <label className="flex items-start gap-3 text-sm font-semibold text-slate-900">
        <Checkbox checked={feeApprovalConfirmed} onCheckedChange={(checked) => setFeeApprovalConfirmed(checked === true)} />
        <span>{t("I verified that the owner’s written message explicitly approves this fee of {amount}.", {amount: euro(issue.coordination_fee)})}</span>
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={() => recordFeeDecision(true)} disabled={saving || !feeReply.trim() || !feeApprovalConfirmed}>{t("Record fee approval")}</Button><Button variant="outline" onClick={() => recordFeeDecision(false)} disabled={saving || !feeReply.trim()}>{t("Record fee declined")}</Button></div>
    </div>}
  </section>;

  if (ownerAction === "Please coordinate" && !repairApprovalReady) return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
    <div className="flex items-start gap-2"><ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Next step")}</p>
      <h2 className="font-semibold mt-0.5">{t(issue.repair_approval_request_sent_at ? "Wait for written repair approval" : "Send quote and get repair approval")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t(issue.repair_approval_request_sent_at ? "The quote and spending limit were emailed to {email}. Record the owner’s exact written reply here. Do not schedule work until approved." : "Add the quote and exact work details, then send the owner the quote, your fee, and requested maximum. Nothing is booked until they approve in writing.", {email:issue.repair_approval_request_sent_to || client?.email || "the owner"})}</p>
      <p className="text-xs mt-2">{t("Coordination fee")}: {euro(issue.coordination_fee)} · {t("Contractor quote")}: {euro(issue.contractor_quotation)}</p>
    </div></div>
    {!issue.repair_approval_request_sent_at ? <div className="mt-3 space-y-3">
      <div className="rounded-xl border-2 border-sky-300 bg-sky-50 p-3 text-sm font-semibold text-slate-900">{t("Your coordination fee is approved. Contact the contractor only to obtain a written quote. Do not authorize or schedule paid repair work yet. After you enter the quote below, this form emails the exact work and total limit to the owner for separate approval.")}</div>
      <div><Label className="text-xs">{t("Exact work proposed")}</Label><Textarea value={workDescription} onChange={e=>setWorkDescription(e.target.value)} rows={3} className="mt-1" placeholder={t("Describe the repair from the contractor’s quote")}/></div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div>
          <Label className="text-sm font-semibold">{t("Contractor (optional)")}</Label>
          <Select value={issue.contractor_id || ""} onValueChange={(value) => saveSelectedContractor(value === NO_CONTRACTOR_VALUE ? "" : value)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder={t("Select a contractor (optional)")} /></SelectTrigger>
            <SelectContent><SelectItem value={NO_CONTRACTOR_VALUE}>{t("No contractor selected")}</SelectItem>{contractors.map((row) => <SelectItem key={row.id} value={row.id}>{row.company || row.contact_person || t("Contractor")}</SelectItem>)}</SelectContent>
          </Select>
          {savingContractor && <p className="text-xs text-muted-foreground mt-1">{t("Saving contractor…")}</p>}
        </div>
        <div>
          <Label className="text-sm font-semibold">{t("Contractor quote attachment (optional)")}</Label>
          {issue.contractor_quote_file_name && <div className="flex items-center justify-between gap-2 mt-2 rounded-lg border bg-slate-50 p-2"><span className="min-w-0 truncate text-sm">{issue.contractor_quote_file_name}</span><Button type="button" variant="ghost" size="icon" aria-label={t("Remove quote")} onClick={removeContractorQuote} disabled={uploadingQuote}><X className="h-4 w-4" /></Button></div>}
          <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-sky-700 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 hover:bg-sky-100">
            {uploadingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>{uploadingQuote ? t("Uploading and saving…") : issue.contractor_quote_file ? t("Replace contractor quote") : t("Attach or upload contractor quote")}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx" className="sr-only" disabled={uploadingQuote} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadContractorQuote(file); event.target.value = ""; }} />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">{t("Your upload is saved to this issue as soon as it finishes.")}</p>
        </div>
      </div>
      <div className="max-w-sm"><Label className="text-xs">{t("Contractor quote (€)")}</Label><Input type="number" min="0.01" step="0.01" value={quote} onChange={e=>{const value=e.target.value;setQuote(value);setQuoteSaveMessage("");if(!capEdited){const next=Number(value)+Number(issue.coordination_fee||0);setProposedMax(value&&Number.isFinite(next)?next.toFixed(2):"");}}} className="mt-1" placeholder="e.g. 250"/><p className="text-xs text-muted-foreground mt-1">{t("Enter the contractor’s written quote amount. The uploaded quote is attached to the owner’s approval email.")}</p></div>
      <div className="max-w-sm"><Label className="text-xs">{t("Maximum total spending requested (€)")}</Label><Input type="number" min="0.01" step="0.01" value={proposedMax} onChange={e=>{setCapEdited(true);setProposedMax(e.target.value);}} className="mt-1" placeholder={quote ? (Number(quote)+Number(issue.coordination_fee||0)).toFixed(2) : ""}/><p className="text-xs text-muted-foreground mt-1">{t("Include the contractor quote and coordination fee. This is the most the owner would authorize if they approve.")}</p></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {quoteSaveMessage && <p role="status" className="text-sm font-semibold text-emerald-700">{quoteSaveMessage}</p>}
      <Button type="button" variant="outline" className="w-full" onClick={saveQuoteDetails} disabled={saving || uploadingQuote || savingContractor}>{saving ? t("Saving…") : t("Save quote details")}</Button>
      <Button className="gap-2" onClick={sendRepairApprovalRequest} disabled={sending||!client?.email||!(Number(quote)>0)||!(Number(proposedMax)>0)}>{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}{t("Email quote for approval")}</Button>
    </div> : <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-medium text-slate-800">{t("The approval request was accepted by the email service for {email}; this does not confirm it reached the inbox. Record the owner’s exact written reply here. Do not schedule work until approved.", {email:issue.repair_approval_request_sent_to || client?.email || "the owner"})}</p>
      <div><Label className="text-sm font-semibold text-slate-900">{t("Owner’s written reply")}</Label><Textarea value={repairReply} onChange={e=>setRepairReply(e.target.value)} rows={3} className="mt-1" placeholder={t("Paste or summarize their reply approving this work and amount")}/></div>
      <div><Label className="text-xs">{t("Reply received by")}</Label><Select value={repairReplyChannel} onValueChange={setRepairReplyChannel}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{["Email","WhatsApp","SMS"].map(v=><SelectItem key={v} value={v}>{t(v)}</SelectItem>)}</SelectContent></Select></div>
      <label className="flex items-start gap-3 text-sm font-semibold text-slate-900"><Checkbox checked={repairApprovalConfirmed} onCheckedChange={checked=>setRepairApprovalConfirmed(checked===true)}/><span>{t("I verified the owner’s written message explicitly approves this exact work and the maximum total of {amount}.", {amount:euro(issue.proposed_max_spend || proposedMax)})}</span></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={()=>recordRepairDecision(true)} disabled={saving||!repairReply.trim()}>{t("Record approval")}</Button><Button variant="outline" onClick={()=>recordRepairDecision(false)} disabled={saving||!repairReply.trim()}>{t("Record declined")}</Button></div>
    </div>}
  </section>;

  return <section ref={cardRef} id="issue-next-step-card" className={card + " scroll-mt-24"}>
    <div className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /><div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Next step")}</p>
      <h2 className="font-semibold mt-0.5">{t("Repair work is approved")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("Schedule the approved contractor work, keep the invoice and completion photos with this issue, then mark it resolved.")}</p>
      <p className="text-xs mt-2">{t("Approved maximum")}: {euro(issue.approved_max_spend)} · {t("Coordination fee")}: {euro(issue.coordination_fee)}</p>
    </div></div>
    <Button variant="outline" className="mt-3" onClick={() => navigate(`/visits?schedule=1&property=${encodeURIComponent(issue.property_id)}&issue=${encodeURIComponent(issue.id)}&visit_type=${encodeURIComponent("Owner Representative Site Visit")}`)}>{t("Schedule Contractor & Delivery Visit")}</Button>
  </section>;
}

function ResponseForm({ t, choice, setChoice, channel, setChannel, responseNote, setResponseNote, saving, error, recordResponse }) {
  return <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-3">
    <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-950">{t("Record owner reply")}</p><Button variant="ghost" size="sm" onClick={() => setChoice("")}>{t("Change")}</Button></div>
    <p className="text-xs text-muted-foreground">{t(choice)}</p>
    <div><Label className="text-sm font-semibold text-slate-900">{t("How did the owner reply?")}</Label><Select value={channel} onValueChange={setChannel}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CHANNELS.map((v) => <SelectItem key={v} value={v}>{t(v)}</SelectItem>)}</SelectContent></Select></div>
    <div><Label className="text-sm font-semibold text-slate-900">{t("Enter the owner’s actual reply")}</Label><Textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={3} className="mt-1" placeholder={t("Type or paste the owner’s message…")} /></div>
    {choice === "Please coordinate" && <p className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-slate-900">{t("This records the owner’s request to coordinate. It does not approve your fee or repair costs and it does not send an email. After saving, the next step is to email your fee for the owner’s approval.")}</p>}
    {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
    <Button onClick={recordResponse} disabled={saving || !responseNote.trim()} className="w-full rounded-xl">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t("Save owner reply")}</Button>
  </div>;
}
