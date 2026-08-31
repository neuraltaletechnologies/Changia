const { z } = require("zod");

const amount = z.number().int().positive().max(1_000_000_000_000);
const tzPhone = z
  .string()
  .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number");

const listSchema = z.object({
  status: z.enum(["REQUESTED", "REVIEWED", "APPROVED", "PAID", "REJECTED"]).optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// A payout request now carries its mobile-money destination up front — the
// requester fills amount + reason + provider/phone/accountName in one form, and
// confirms the release once both approvals clear. (Bank payouts are not offered
// yet — everything settles through the ClickPesa mobile-money payout.)
const createSchema = z.object({
  amount,
  campaignId: z.union([z.string(), z.number()]).optional(),
  // Required for a CAMPAIGN_MANAGER request — enforced in the service since
  // it depends on the caller's role, not on the shape of the body alone.
  reason: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  // Mobile-money payout destination.
  provider: z.string().trim().min(2, "Choose the mobile money provider").max(40),
  phone: tzPhone,
  accountName: z.string().trim().min(2, "Enter the account holder's name").max(120),
});

const decisionSchema = z.object({ notes: z.string().max(2000).optional() });

// The requesting manager's final release confirmation — this executes the
// gateway transfer, so it only carries an optional note.
const confirmSchema = z.object({ notes: z.string().max(2000).optional() });

module.exports = { listSchema, createSchema, decisionSchema, confirmSchema };
