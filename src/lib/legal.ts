/** Facts used by the legal pages, About & Contact and the sign-up consent step (11 Nov 2026). One place, so they cannot drift apart. */
export const LEGAL = {
  operator: "Ajay Chouhan",
  address: "PB-197-SF, BPTP Pride, Sector 77, Faridabad, Haryana 121004, India",
  email: "support@redixfi.com",
  grievanceOfficer: "Ajay Chouhan",
  acknowledgeWithin: "48 hours",
  resolveWithin: "one month",
  court: "Faridabad, Haryana",
  /** Same value as the API's TERMS_VERSION setting; a sign-up records the version it accepted. */
  termsVersion: "2026-11-11",
  updated: "11 November 2026",
} as const;

export const LEGAL_LINKS = [
  { href: "/more/terms", label: "Terms" },
  { href: "/more/privacy", label: "Privacy" },
  { href: "/more/refund-policy", label: "Refund policy" },
] as const;
