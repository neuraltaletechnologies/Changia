const { z } = require("zod");

const bools = z.object({ notifyOnDonation: z.boolean().optional(), notifyOnCampaignStatus: z.boolean().optional(), notifyOnUserInvite: z.boolean().optional() });
const security = z.object({ twoFactorEnabled: z.boolean().optional(), loginAlerts: z.boolean().optional() });
const updateOrgSchema = z.object({
  orgName: z.string().min(2).max(150).optional(), brandName: z.string().max(150).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")), registrationNumber: z.string().max(100).nullable().optional(),
  primaryEmail: z.string().email().optional(), phone: z.string().max(32).optional(),
  defaultChannel: z.enum(["SMS", "WHATSAPP", "EMAIL"]).optional(), currency: z.enum(["TZS", "USD", "EUR", "GBP"]).optional(),
  language: z.enum(["en", "sw"]).optional(), timezone: z.enum(["eat", "utc"]).optional(), dateFormat: z.enum(["dmy", "mdy", "ymd"]).optional(),
  notifications: bools.optional(), security: security.optional(),
});
module.exports = { updateOrgSchema };
