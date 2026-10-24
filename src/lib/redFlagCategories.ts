/**
 * The nine governance red-flag categories, in one place. The landing-page
 * radar card and the Research Pro Red Flags section both read their names
 * from here, so they cannot drift apart. Keys and labels mirror the API
 * (red_flag_ask.py CATEGORY_LABELS); descriptions are short and factual.
 */
/** The Red Flags card heading, used by the landing radar card and Research Pro. */
export const RED_FLAG_RADAR_TITLE = "Governance & Red Flag Radar";

export const RED_FLAG_CATEGORIES: { key: string; label: string; desc: string }[] = [
  { key: "auditor_qualification", label: "Auditor Qualification", desc: "Qualified or adverse opinions, emphasis of matter, key audit matters" },
  { key: "internal_control_weakness", label: "Internal Control Weakness", desc: "Material weaknesses or gaps in internal financial controls" },
  { key: "regulatory_action", label: "Regulatory Action", desc: "Notices, orders or penalties from SEBI, exchanges or other regulators" },
  { key: "contingent_liability", label: "Contingent Liability", desc: "Pending litigation, guarantees given, disputed tax demands" },
  { key: "related_party_transaction", label: "Related-Party Transaction", desc: "Disclosed dealings with promoter or related entities" },
  { key: "default_or_covenant", label: "Default / Covenant Breach", desc: "Loan defaults, covenant breaches, overdue statutory dues" },
  { key: "fraud_or_investigation", label: "Fraud / Investigation", desc: "Fraud reports, forensic audits, official investigations" },
  { key: "management_governance", label: "Management & Board Governance", desc: "Board and key-management changes, conflicts of interest" },
  { key: "promoter_pledge", label: "Promoter Share Pledge", desc: "Shares pledged or released against promoter holdings" },
];

export const RED_FLAG_CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(RED_FLAG_CATEGORIES.map((c) => [c.key, c.label])),
  // Display-only heading the API uses for disputed tax / statutory dues under appeal (not a loan default).
  statutory_dues_dispute: "Statutory dues in dispute",
};
