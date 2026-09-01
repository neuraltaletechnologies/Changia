const { z } = require("zod");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");
const db = require("../../db");

const donorService = require("../donor/service");
const poolService = require("../donor-pool/service");
const donationService = require("../donation/service");
const payoutService = require("../payout/service");
const campaignService = require("../campaign/service");
const auditService = require("../audit/service");
const approvalService = require("../approval/service");

/**
 * The data-transfer registry. Each dataset owns:
 *   export: { roles, columns, fetch(req) -> flat row objects }
 *   import: { roles, templateFields, toInput(rawRow), schema, insert(input, req) }
 *
 * `columns` / `templateFields` double as the CSV/XLSX header contract and (for
 * imports) the downloadable starter template. Every fetch/insert delegates to
 * the feature service that already owns that table's business rules + scoping.
 */

const BIG_LIMIT = 100000;

const ALL = ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"];
// Donors / pools / pool memberships are org-scoped day-to-day work — ORG_ADMIN
// is platform-level with no organisation, so it's excluded here (mirrors
// ORG_WORKSPACE_ROLES in the frontend permissions module).
const ORG_WORKSPACE = ["SUPER_ADMIN", "CAMPAIGN_MANAGER"];

function has(roles, role) {
  return roles.includes(role);
}

// ─── column helpers ────────────────────────────────────────────────────────
const col = (key, header, type = "text") => ({ key, header, type });

// ─── donors ────────────────────────────────────────────────────────────────
const donors = {
  filename: "donors",
  sheetName: "Donors",
  export: {
    roles: ALL,
    columns: [
      col("id", "id", "number"),
      col("firstName", "first_name"),
      col("lastName", "last_name"),
      col("email", "email"),
      col("phone", "phone"),
      col("location", "location"),
      col("gender", "gender"),
      col("position", "position"),
      col("status", "status"),
      col("consentStatus", "consent_status"),
      col("preferredChannel", "preferred_channel"),
      col("tags", "tags"),
      col("totalPaid", "total_paid", "money"),
      col("donationCount", "donation_count", "number"),
      col("createdAt", "created_at", "date"),
    ],
    async fetch(req) {
      const { donors: rows } = await donorService.listDonors(
        req.user.organizationId,
        { ...req.query, page: 1, limit: BIG_LIMIT },
        req.user
      );
      return rows;
    },
  },
  import: {
    roles: ["SUPER_ADMIN"],
    templateFields: [
      { field: "phone", required: true, help: "Tanzanian number, e.g. +255712345678" },
      { field: "first_name" },
      { field: "last_name" },
      { field: "email" },
      { field: "location" },
      { field: "gender", values: ["MALE", "FEMALE", "UNSPECIFIED"] },
      { field: "position" },
      { field: "status", values: ["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"] },
      { field: "consent_status", values: ["CONSENTED", "PENDING", "WITHDRAWN"] },
      { field: "preferred_channel", values: ["SMS", "WHATSAPP", "EMAIL", "PHONE"] },
      { field: "tags", help: "Semicolon-separated, e.g. vip;alumni" },
      { field: "notes", help: "Free-text context about this donor" },
    ],
    toInput: (r) => {
      const pick = (v, allowed, fallback) => {
        const up = String(v || "").toUpperCase();
        return allowed.includes(up) ? up : fallback;
      };
      return {
        phone: r.phone || "",
        firstName: r.first_name || undefined,
        lastName: r.last_name || undefined,
        email: r.email || undefined,
        location: r.location || undefined,
        gender: pick(r.gender, ["MALE", "FEMALE", "UNSPECIFIED"], undefined),
        position: r.position || undefined,
        status: pick(r.status, ["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"], undefined),
        consentStatus: pick(r.consent_status, ["CONSENTED", "PENDING", "WITHDRAWN"], undefined),
        preferredChannel: pick(
          r.preferred_channel,
          ["SMS", "WHATSAPP", "EMAIL", "PHONE"],
          undefined
        ),
        tags: r.tags
          ? r.tags.split(";").map((t) => t.trim()).filter(Boolean)
          : undefined,
        notes: r.notes || undefined,
      };
    },
    schema: z.object({
      phone: z.string().regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number"),
      firstName: z.string().max(120).optional(),
      lastName: z.string().max(120).optional(),
      email: z.string().email("Invalid email").optional(),
      location: z.string().max(160).optional(),
      gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).optional(),
      position: z.string().max(160).optional(),
      status: z.enum(["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"]).optional(),
      consentStatus: z.enum(["CONSENTED", "PENDING", "WITHDRAWN"]).optional(),
      preferredChannel: z.enum(["SMS", "WHATSAPP", "EMAIL", "PHONE"]).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().max(5000).optional(),
    }),
    async insert(input, req) {
      await donorService.createDonor(req.user.organizationId, input, req.user);
    },
    duplicateCode: "DONOR_EXISTS",
  },
};

// ─── donor pools ───────────────────────────────────────────────────────────
const donorPools = {
  filename: "donor-pools",
  sheetName: "Donor Pools",
  export: {
    roles: ORG_WORKSPACE,
    columns: [
      col("id", "id", "number"),
      col("name", "name"),
      col("description", "description"),
      col("category", "category"),
      col("status", "status"),
      col("isSystem", "is_system"),
      col("memberCount", "member_count", "number"),
      col("expectedTotal", "expected_total", "money"),
      col("paidTotal", "paid_total", "money"),
      col("createdByEmail", "created_by_email"),
      col("createdAt", "created_at", "date"),
    ],
    async fetch(req) {
      const { pools } = await poolService.listPools(req.user.organizationId, req.user, {
        ...req.query,
        page: 1,
        limit: BIG_LIMIT,
      });
      return pools.map((p) => ({ ...p, createdByEmail: p.createdBy ? p.createdBy.email : "" }));
    },
  },
};

// ─── donor pool members ────────────────────────────────────────────────────
const poolMembers = {
  filename: "pool-members",
  sheetName: "Pool Members",
  export: {
    roles: ORG_WORKSPACE,
    columns: [
      col("donorId", "donor_id", "number"),
      col("firstName", "first_name"),
      col("lastName", "last_name"),
      col("email", "email"),
      col("phone", "phone"),
      col("location", "location"),
      col("gender", "gender"),
      col("position", "position"),
      col("status", "status"),
      col("consentStatus", "consent_status"),
      col("preferredChannel", "preferred_channel"),
      col("expectedAmount", "expected_amount", "money"),
      col("paidAmount", "paid_amount", "money"),
      col("donationCount", "donation_count", "number"),
      col("addedAt", "added_at", "date"),
    ],
    async fetch(req) {
      if (!req.query.poolId) throw ApiError.badRequest("poolId is required", "POOL_ID_REQUIRED");
      const pool = await poolService.getPool(req.user.organizationId, req.user, req.query.poolId);
      return (pool.members || []).map((m) => ({
        donorId: m.donor.id,
        firstName: m.donor.firstName,
        lastName: m.donor.lastName,
        email: m.donor.email,
        phone: m.donor.phone,
        location: m.donor.location,
        gender: m.donor.gender,
        position: m.donor.position,
        status: m.donor.status,
        consentStatus: m.donor.consentStatus,
        preferredChannel: m.donor.preferredChannel,
        expectedAmount: m.expectedAmount,
        paidAmount: m.paidAmount,
        donationCount: m.donationCount,
        addedAt: m.addedAt,
      }));
    },
  },
  import: {
    roles: ORG_WORKSPACE,
    requiresQuery: ["poolId"],
    // A row links an existing donor by phone; any extra donor fields are used to
    // create the donor first when no donor with that phone exists yet.
    templateFields: [
      { field: "donor_phone", required: true, help: "Tanzanian number, e.g. +255712345678" },
      { field: "expected_amount", help: "Optional TZS amount this donor is expected to give" },
      { field: "first_name", help: "Used only when creating a new donor" },
      { field: "last_name" },
      { field: "email" },
      { field: "location" },
      { field: "gender", values: ["MALE", "FEMALE", "UNSPECIFIED"] },
      { field: "position" },
      { field: "status", values: ["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"] },
      { field: "consent_status", values: ["CONSENTED", "PENDING", "WITHDRAWN"] },
      { field: "preferred_channel", values: ["SMS", "WHATSAPP", "EMAIL", "PHONE"] },
      { field: "notes" },
    ],
    toInput: (r) => {
      const pick = (v, allowed, fallback) => {
        const up = String(v || "").toUpperCase();
        return allowed.includes(up) ? up : fallback;
      };
      return {
        phone: r.donor_phone || "",
        expectedAmount: r.expected_amount ? Number(r.expected_amount) : null,
        firstName: r.first_name || undefined,
        lastName: r.last_name || undefined,
        email: r.email || undefined,
        location: r.location || undefined,
        gender: pick(r.gender, ["MALE", "FEMALE", "UNSPECIFIED"], undefined),
        position: r.position || undefined,
        status: pick(r.status, ["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"], undefined),
        consentStatus: pick(r.consent_status, ["CONSENTED", "PENDING", "WITHDRAWN"], undefined),
        preferredChannel: pick(r.preferred_channel, ["SMS", "WHATSAPP", "EMAIL", "PHONE"], undefined),
        notes: r.notes || undefined,
      };
    },
    schema: z.object({
      phone: z.string().regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number"),
      expectedAmount: z.number().int().nonnegative().nullable().optional(),
      firstName: z.string().max(120).optional(),
      lastName: z.string().max(120).optional(),
      email: z.string().email("Invalid email").optional(),
      location: z.string().max(160).optional(),
      gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).optional(),
      position: z.string().max(160).optional(),
      status: z.enum(["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"]).optional(),
      consentStatus: z.enum(["CONSENTED", "PENDING", "WITHDRAWN"]).optional(),
      preferredChannel: z.enum(["SMS", "WHATSAPP", "EMAIL", "PHONE"]).optional(),
      notes: z.string().max(5000).optional(),
    }),
    async insert(input, req) {
      const phone = normalizePhone(input.phone);
      const rows = await db.query(
        "SELECT id FROM donors WHERE organization_id = ? AND phone = ?",
        [req.user.organizationId, phone]
      );

      if (rows.length > 0) {
        const donorId = rows[0].id;
        const body = { donorIds: [donorId] };
        if (input.expectedAmount != null) body.expectedAmounts = { [donorId]: input.expectedAmount };
        await poolService.addMembers(req.user.organizationId, req.user, req.query.poolId, body);
        return;
      }

      // No donor with this phone — create one from the extra columns, then link.
      const { expectedAmount, ...donorFields } = input;
      const body = { donors: [{ ...donorFields, phone }] };
      await poolService.addMembers(req.user.organizationId, req.user, req.query.poolId, body);
      if (expectedAmount != null) {
        const created = await db.query(
          "SELECT id FROM donors WHERE organization_id = ? AND phone = ?",
          [req.user.organizationId, phone]
        );
        if (created.length > 0) {
          await poolService.setMemberExpected(
            req.user.organizationId,
            req.user,
            req.query.poolId,
            created[0].id,
            expectedAmount
          );
        }
      }
    },
    duplicateCode: "DONOR_EXISTS",
  },
};

// ─── donations / transactions / contributions ──────────────────────────────
const donations = {
  filename: "transactions",
  sheetName: "Transactions",
  export: {
    roles: ALL,
    columns: [
      col("id", "id", "number"),
      col("receiptNumber", "receipt_number"),
      col("campaignName", "campaign_name"),
      col("donorId", "donor_id", "number"),
      col("donorName", "donor_name"),
      col("donorPhone", "donor_phone"),
      col("amount", "amount", "money"),
      col("method", "method"),
      col("status", "status"),
      col("isAnonymous", "is_anonymous"),
      col("gatewayRef", "gateway_ref"),
      col("createdAt", "created_at", "date"),
      col("confirmedAt", "confirmed_at", "date"),
    ],
    async fetch(req) {
      const { donations: rows } = await donationService.listDonations(
        req.user.organizationId,
        { ...req.query, page: 1, limit: BIG_LIMIT },
        req.user
      );
      return rows.map((d) => ({
        id: d.id,
        receiptNumber: d.receipt_number,
        campaignName: d.campaign ? d.campaign.name : "",
        donorId: d.donor_id,
        donorName: d.donor_name,
        donorPhone: d.donor_phone,
        amount: d.amount,
        method: d.method,
        status: d.status,
        isAnonymous: d.isAnonymous,
        gatewayRef: d.gateway_ref,
        createdAt: d.created_at,
        confirmedAt: d.confirmed_at,
      }));
    },
  },
  import: {
    // The campaign row determines the organisation, so a platform-level
    // ORG_ADMIN can import here too even though it has no org of its own.
    roles: ["SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"],
    templateFields: [
      { field: "campaign_id", required: true, help: "Numeric campaign id (must be ACTIVE)" },
      { field: "amount", required: true, help: "Whole TZS amount" },
      { field: "donor_phone", help: "Links the contribution to an existing donor" },
      { field: "donor_name" },
      { field: "is_anonymous", values: ["true", "false"] },
    ],
    toInput: (r) => ({
      campaignId: r.campaign_id ? Number(r.campaign_id) : NaN,
      amount: r.amount ? Number(r.amount) : NaN,
      donorPhone: r.donor_phone || undefined,
      donorName: r.donor_name || undefined,
      isAnonymous: /^(true|1|yes)$/i.test(r.is_anonymous || ""),
    }),
    schema: z.object({
      campaignId: z.number({ message: "campaign_id must be a number" }).int().positive(),
      amount: z.number({ message: "amount must be a number" }).int().positive(),
      donorPhone: z
        .string()
        .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
        .optional(),
      donorName: z.string().max(150).optional(),
      isAnonymous: z.boolean().optional(),
    }),
    async insert(input, req) {
      const campRows = await db.query(
        "SELECT organization_id FROM campaigns WHERE id = ?",
        [input.campaignId]
      );
      if (!campRows[0]) {
        throw new ApiError(422, "No campaign with that id", "CAMPAIGN_NOT_FOUND");
      }
      const orgId = campRows[0].organization_id;

      // A CAMPAIGN_MANAGER may only import into their own org + assigned campaigns.
      if (req.user.role === "CAMPAIGN_MANAGER") {
        if (String(orgId) !== String(req.user.organizationId)) {
          throw new ApiError(422, "That campaign isn't in your organisation", "CAMPAIGN_FORBIDDEN");
        }
        await campaignService.assertCampaignAccess(
          req.user.organizationId,
          req.user,
          input.campaignId
        );
      }

      let donorId;
      if (input.donorPhone) {
        const rows = await db.query(
          "SELECT id FROM donors WHERE organization_id = ? AND phone = ?",
          [orgId, normalizePhone(input.donorPhone)]
        );
        donorId = rows[0] ? rows[0].id : undefined;
      }
      await donationService.recordManualDonation(orgId, {
        campaignId: input.campaignId,
        donorId,
        donorName: input.donorName,
        amount: input.amount,
        isAnonymous: input.isAnonymous || false,
      });
    },
  },
};

// ─── payouts ───────────────────────────────────────────────────────────────
const payouts = {
  filename: "payouts",
  sheetName: "Payouts",
  export: {
    roles: ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"],
    columns: [
      col("id", "id", "number"),
      col("campaignName", "campaign_name"),
      col("amount", "amount", "money"),
      col("status", "status"),
      col("reason", "reason"),
      col("requestedBy", "requested_by_id", "number"),
      col("firstApprovedBy", "first_approved_by_id", "number"),
      col("approvedBy", "approved_by_id", "number"),
      col("disbursementMethod", "disbursement_method"),
      col("disbursementProvider", "disbursement_provider"),
      col("disbursementAccountName", "disbursement_account_name"),
      col("gatewayRef", "gateway_ref"),
      col("paidAt", "paid_at", "date"),
      col("createdAt", "created_at", "date"),
    ],
    async fetch(req) {
      const { payouts: rows } = await payoutService.listPayouts(
        req.user.organizationId,
        { ...req.query, page: 1, limit: BIG_LIMIT },
        req.user
      );
      return rows.map((p) => ({
        ...p,
        disbursementMethod: p.disbursement ? p.disbursement.method : "",
        disbursementProvider: p.disbursement ? p.disbursement.provider : "",
        disbursementAccountName: p.disbursement ? p.disbursement.accountName : "",
      }));
    },
  },
};

// ─── campaigns ─────────────────────────────────────────────────────────────
const campaigns = {
  filename: "campaigns",
  sheetName: "Campaigns",
  export: {
    roles: ALL,
    columns: [
      col("id", "id", "number"),
      col("name", "name"),
      col("slug", "slug"),
      col("category", "category"),
      col("status", "status"),
      col("goalAmount", "goal_amount", "money"),
      col("serviceFeePercent", "service_fee_percent", "number"),
      col("serviceFeeAmount", "service_fee_amount", "money"),
      col("publicTarget", "public_target", "money"),
      col("raisedAmount", "raised_amount", "money"),
      col("donorCount", "donor_count", "number"),
      col("minimumAmount", "minimum_amount", "money"),
      col("startDate", "start_date", "date"),
      col("endDate", "end_date", "date"),
      col("isPublic", "is_public"),
      col("contactPhone", "contact_phone"),
      col("organizationName", "organization_name"),
      col("createdAt", "created_at", "date"),
    ],
    async fetch(req) {
      const { campaigns: rows } = await campaignService.listCampaigns(
        req.user.organizationId,
        { ...req.query, page: 1, limit: BIG_LIMIT },
        req.user
      );
      return rows;
    },
  },
  import: {
    roles: ["ORG_ADMIN", "CAMPAIGN_MANAGER"],
    templateFields: [
      { field: "name", required: true },
      { field: "goal_amount", required: true, help: "Whole TZS amount, greater than zero" },
      { field: "category" },
      { field: "story", help: "Campaign description / narrative" },
      { field: "minimum_amount", help: "Minimum single contribution (defaults to 1000)" },
      { field: "start_date", help: "YYYY-MM-DD" },
      { field: "end_date", help: "YYYY-MM-DD" },
      { field: "contact_phone" },
    ],
    toInput: (r) => ({
      name: r.name || "",
      goalAmount: r.goal_amount ? Number(r.goal_amount) : NaN,
      category: r.category || undefined,
      story: r.story || undefined,
      minimumAmount: r.minimum_amount ? Number(r.minimum_amount) : undefined,
      startDate: r.start_date || undefined,
      endDate: r.end_date || undefined,
      contactPhone: r.contact_phone || undefined,
    }),
    schema: z.object({
      name: z.string().min(3).max(200),
      goalAmount: z.number({ message: "goal_amount must be a number" }).int().positive(),
      category: z.string().max(80).optional(),
      story: z.string().max(20000).optional(),
      minimumAmount: z.number().int().positive().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      contactPhone: z.string().max(40).optional(),
    }),
    async insert(input, req) {
      await campaignService.createCampaign(
        req.user.organizationId,
        { ...input, asDraft: true },
        req.user
      );
    },
  },
};

// ─── audit logs ────────────────────────────────────────────────────────────
const auditLogs = {
  filename: "audit-logs",
  sheetName: "Audit Logs",
  export: {
    roles: ["SUPER_ADMIN"],
    columns: [
      col("id", "id", "number"),
      col("action", "action"),
      col("resource", "resource"),
      col("resourceId", "resource_id"),
      col("actorEmail", "actor_email"),
      col("severity", "severity"),
      col("ipAddress", "ip_address"),
      col("details", "details"),
      col("createdAt", "created_at", "date"),
    ],
    async fetch(req) {
      const logs = await auditService.exportAuditLogs(req.user.organizationId, {
        ...req.query,
        limit: BIG_LIMIT,
      });
      return logs;
    },
  },
};

// ─── approvals (my review decisions) ───────────────────────────────────────
const approvals = {
  filename: "approvals",
  sheetName: "Approvals",
  export: {
    roles: ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"],
    columns: [
      col("id", "id", "number"),
      col("action", "action"),
      col("label", "label"),
      col("resource", "resource"),
      col("resourceId", "resource_id"),
      col("resourceName", "resource_name"),
      col("notes", "notes"),
      col("severity", "severity"),
      col("createdAt", "created_at", "date"),
    ],
    async fetch(req) {
      const { items } = await approvalService.myApprovalHistory(req.user, {
        ...req.query,
        page: 1,
        limit: BIG_LIMIT,
      });
      return items;
    },
  },
};

const REGISTRY = {
  donors,
  "donor-pools": donorPools,
  "pool-members": poolMembers,
  donations,
  transactions: donations, // alias
  payouts,
  campaigns,
  "audit-logs": auditLogs,
  approvals,
};

module.exports = { REGISTRY };
