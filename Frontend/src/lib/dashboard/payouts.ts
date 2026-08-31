/** Tanzanian mobile-money providers offered on the payout request form. */
export const MOBILE_MONEY_PROVIDERS = [
  "M-Pesa",
  "Airtel Money",
  "Tigo Pesa (Mixx by Yas)",
  "HaloPesa",
  "Azam Pesa",
  "T-Pesa",
] as const;

/** Max "proof of use" photos a manager may attach to a payout request. */
export const MAX_PAYOUT_PROOF_IMAGES = 5;

export const PAYOUT_PROOF_ACCEPT = "image/jpeg,image/png,image/webp";

/** Human labels for a payout's status (the raw enum is terse / ALL-CAPS). */
export const PAYOUT_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "In first review",
  REVIEWED: "Awaiting final approval",
  APPROVED: "Approved — on hold, confirm to release",
  PAID: "Released",
  REJECTED: "Rejected",
};
