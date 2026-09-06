export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const STRIPE_DONATE_URL = process.env.NEXT_PUBLIC_STRIPE_DONATE_URL || "";

export const CREATOR = {
  name: "Ondřej Huk",
  studio: "Czech Th!s",
  url: "https://czech-this.com",
  email: "ondrej.huk@gmail.com",
  /**
   * Registered business details for the privacy policy (GDPR art. 13 asks for
   * the controller's identity). Left blank until the real values are supplied —
   * the policy simply omits the line rather than printing a placeholder.
   */
  ico: "88259081",
  address: "Bendova 28, 301 00 Plzeň",
};

/** Retention published in the privacy policy — enforced in db.ts. */
export const RETENTION = {
  reportDays: 365,
  leadDays: 365 * 3,
};
