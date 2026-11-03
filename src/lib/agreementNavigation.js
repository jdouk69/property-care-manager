// Resume assessed drafts at service confirmation; preserve sent/signed review.
export function agreementStartStep(agreement) {
  if (["Sent", "Viewed", "Signed"].includes(agreement?.signing_status) || agreement?.status === "Active") return 3;
  return agreement?.signing_status === "Draft" && agreement?.price_approved_at && agreement?.property_id && agreement?.service_package_id ? 2 : 1;
}
