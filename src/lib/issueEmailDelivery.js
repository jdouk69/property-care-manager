const SENDER = "propertycarecrete@gmail.com";

export async function getIssueEmailDeliveries(base44, issueId) {
  return base44.entities.IssueEmailDelivery.filter({ maintenance_issue_id: issueId }, "-created_date", 100);
}

export async function sendIssueEmail(base44, { issue, client, kind, subject, body, attachments = [], amount, retryOfId = "" }) {
  const previous = await getIssueEmailDeliveries(base44, issue.id);
  const attemptNumber = previous.filter((row) => row.kind === kind)
    .reduce((max, row) => Math.max(max, Number(row.attempt_number) || 0), 0) + 1;
  const attempt = await base44.entities.IssueEmailDelivery.create({
    maintenance_issue_id: issue.id,
    client_id: client?.id || "",
    property_id: issue.property_id || "",
    kind,
    status: "Sending",
    attempt_number: attemptNumber,
    ...(Number.isFinite(Number(amount)) ? { amount: Number(amount) } : {}),
    retry_of_id: retryOfId,
    recipient: client?.email || "",
    sender: SENDER,
    subject,
    body,
    attachments,
  });

  try {
    const result = await base44.integrations.Core.SendEmail({
      to: client.email,
      subject,
      body,
      from_name: "Property Care Crete",
      attachments: attachments.length ? attachments : undefined,
    });
    const sentAt = new Date().toISOString();
    const messageId = result?.id || result?.message_id || "";
    const accepted = await base44.entities.IssueEmailDelivery.update(attempt.id, {
      status: "Accepted by email service",
      provider_message_id: messageId,
      sent_at: sentAt,
      error: "",
    });
    return { ...accepted, sentAt, messageId };
  } catch (error) {
    const statusCode = Number(error?.response?.status || error?.status || 0);
    const status = !statusCode || statusCode >= 500 ? "Delivery uncertain" : "Failed";
    const message = error?.message || "The email service did not confirm the message.";
    await base44.entities.IssueEmailDelivery.update(attempt.id, { status, error: message }).catch(() => {});
    const failure = new Error(status === "Delivery uncertain"
      ? "The email may have been accepted. Check sent mail before trying again."
      : message);
    failure.delivery = attempt;
    failure.deliveryUncertain = status === "Delivery uncertain";
    throw failure;
  }
}

export function issueEmailStatusText(delivery) {
  if (delivery.status === "Accepted by email service") return "Accepted by email service";
  if (delivery.status === "Failed") return "Failed — safe to retry";
  if (delivery.status === "Delivery uncertain") return "Delivery uncertain — check sent mail before retrying";
  return "Sending — refresh to check status";
}
