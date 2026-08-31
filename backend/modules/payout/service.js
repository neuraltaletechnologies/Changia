const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { assertCampaignAccess } = require("../campaign/service");
const notificationService = require("../notification/service");
const clickPesa = require("../../utils/clickPesa");

function serialize(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name || null,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    requestedBy: row.requested_by_id,
    firstApprovedBy: row.first_approved_by_id,
    firstApprovedAt: row.first_approved_at,
    approvedBy: row.approved_by_id,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    gatewayRef: row.gateway_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fire-and-forget notification — never lets a notify failure break the flow. */
async function notifySafe(recipients, payload) {
  try {
    const ids = typeof recipients?.then === "function" ? await recipients : recipients;
    await notificationService.notify(ids, payload);
  } catch (err) {
    console.error("[payout-notify] failed:", err.message);
  }
}

const STAGE1_ROLES = ["REVIEWER", "SUPER_ADMIN"];
const STAGE2_ROLES = ["ORG_ADMIN", "SUPER_ADMIN"];

/**
 * Two-person payout approval, mirroring assertApprovalStage in
 * modules/campaign/service.js: the requester can't approve, and stage 2 must be
 * a different person than stage 1.
 */
function assertPayoutStage({ actor, stage, requestedById, firstApprovedById }) {
  const roles = stage === 1 ? STAGE1_ROLES : STAGE2_ROLES;
  if (!roles.includes(actor.role)) {
    throw ApiError.forbidden(
      stage === 1
        ? "The first approval must come from a reviewer"
        : "The final approval must come from an organisation admin",
      stage === 1 ? "NEEDS_REVIEWER" : "NEEDS_ORG_ADMIN"
    );
  }
  if (requestedById && Number(requestedById) === Number(actor.id)) {
    throw ApiError.badRequest("You can't approve a payout you requested", "SAME_AS_REQUESTER");
  }
  if (stage === 2 && firstApprovedById && Number(firstApprovedById) === Number(actor.id)) {
    throw ApiError.badRequest("A different person must give the final approval", "SAME_APPROVER");
  }
}

const SELECT = `
  SELECT p.*, c.name AS campaign_name
  FROM payouts p
  LEFT JOIN campaigns c ON c.id = p.campaign_id
`;

/**
 * Visibility:
 *   - SUPER_ADMIN / ORG_ADMIN  → every org's payouts (platform-level: the
 *     org admin gives the final approval across the whole platform).
 *   - REVIEWER (platform-level, no org) → every org's payouts that are in the
 *     approval chain (REQUESTED / REVIEWED) plus any they've acted on.
 *   - CAMPAIGN_MANAGER          → only their own requests.
 */
async function listPayouts(organizationId, filters, user) {
  const isReviewer = user && user.role === "REVIEWER";
  const isPlatformAdmin = user && (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN");
  const where = [];
  const values = [];

  if (isReviewer) {
    // Reviewers are platform-level — every org's payouts in the approval chain.
    where.push("(p.status IN ('REQUESTED','REVIEWED') OR p.first_approved_by_id = ?)");
    values.push(user.id);
  } else if (isPlatformAdmin) {
    // Super admins + org admins vet / approve / pay across every org — no filter.
    where.push("1 = 1");
  } else {
    where.push("p.organization_id = ?");
    values.push(organizationId);
  }
  if (filters.status) {
    where.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.campaignId) {
    where.push("p.campaign_id = ?");
    values.push(filters.campaignId);
  }
  if (user && user.role === "CAMPAIGN_MANAGER") {
    where.push("p.requested_by_id = ?");
    values.push(user.id);
  }
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;
  const whereSql = where.join(" AND ");
  const payouts = await db.query(
    `${SELECT} WHERE ${whereSql} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const count = await db.query(`SELECT COUNT(*) AS total FROM payouts p WHERE ${whereSql}`, values);
  return {
    payouts: payouts.map(serialize),
    pagination: { page, limit, total: count[0].total, totalPages: Math.ceil(count[0].total / limit) },
  };
}

/** Internal fetch. Pass a null organizationId to skip org-scoping (a platform
 *  REVIEWER has no org); decide/markPaid are already role-gated at the router. */
async function getPayoutRow(organizationId, id) {
  const orgSql = organizationId ? " AND p.organization_id = ?" : "";
  const params = organizationId ? [id, organizationId] : [id];
  const rows = await db.query(`${SELECT} WHERE p.id = ?${orgSql}`, params);
  if (!rows[0]) throw ApiError.notFound("Payout not found");
  return rows[0];
}

async function getPayout(organizationId, id, user) {
  const platformWide =
    user && (user.role === "REVIEWER" || user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN");
  const payout = await getPayoutRow(platformWide ? null : organizationId, id);
  if (user && user.role === "CAMPAIGN_MANAGER" && Number(payout.requested_by_id) !== Number(user.id)) {
    throw ApiError.notFound("Payout not found");
  }
  return serialize(payout);
}

/**
 * Only campaign-creating roles request payouts, and every request is tied to a
 * specific campaign with a reason. It then clears the two-stage approval chain
 * (REVIEWER -> ORG_ADMIN) before a SUPER_ADMIN marks it paid.
 *   - CAMPAIGN_MANAGER: one of their assigned campaigns.
 *   - ORG_ADMIN:        any campaign in their org.
 * A requester can't have another open request (REQUESTED/REVIEWED) for the
 * same campaign.
 */
async function createPayout(organizationId, user, data) {
  const campaignId = data.campaignId ? Number(data.campaignId) : null;

  if (!campaignId) {
    throw ApiError.badRequest("Select which campaign this payout is for", "CAMPAIGN_REQUIRED");
  }
  if (!data.reason || !data.reason.trim()) {
    throw ApiError.badRequest("Explain why you're requesting this payout", "REASON_REQUIRED");
  }
  await assertCampaignAccess(organizationId, user, campaignId);
  const owned = await db.query(
    "SELECT id, status FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
  );
  if (owned.length === 0) throw ApiError.notFound("Campaign not found");

  // Funds can only be withdrawn once a campaign is actually raising (or has
  // finished) — a DRAFT/PENDING/REVIEWED/CANCELLED campaign has nothing to pay
  // out. Mirrors the campaigns-list "Request payout" gate.
  const PAYABLE_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"];
  if (!PAYABLE_STATUSES.includes(owned[0].status)) {
    throw ApiError.badRequest(
      "Payouts can only be requested for an active, paused or completed campaign",
      "CAMPAIGN_NOT_PAYABLE"
    );
  }

  const open = await db.query(
    "SELECT id FROM payouts WHERE campaign_id = ? AND requested_by_id = ? AND status IN ('REQUESTED','REVIEWED')",
    [campaignId, user.id]
  );
  if (open.length > 0) {
    throw ApiError.conflict(
      "You already have a payout request in review for this campaign",
      "PAYOUT_REQUEST_PENDING"
    );
  }

  const result = await db.execute(
    `INSERT INTO payouts (organization_id, campaign_id, amount, reason, status, requested_by_id, notes)
     VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?)`,
    [organizationId, campaignId, data.amount, data.reason || null, user.id, data.notes || null]
  );

  const payout = await getPayout(organizationId, result.insertId, user);
  await notifySafe(notificationService.platformReviewers(), {
    type: "payout",
    title: "Payout awaiting first review",
    body: `A ${Number(payout.amount).toLocaleString()} TZS payout for "${payout.campaignName}" needs a first review.`,
    link: "/dashboard/payouts",
    resource: "payout",
    resourceId: payout.id,
    organizationId,
  });
  return payout;
}

/**
 * Stage-aware decision. The router allows REVIEWER / ORG_ADMIN / SUPER_ADMIN
 * here; which stage applies is chosen from the payout's current status.
 *   REQUESTED + approve -> REVIEWED  (stage 1)
 *   REVIEWED  + approve -> APPROVED  (stage 2)
 *   REQUESTED/REVIEWED + reject -> REJECTED
 */
async function decidePayout(organizationId, user, id, approved, data = {}) {
  const scopeOrg =
    user.role === "REVIEWER" || user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN"
      ? null
      : organizationId;
  const payout = await getPayoutRow(scopeOrg, id);
  const orgId = payout.organization_id;

  if (payout.status !== "REQUESTED" && payout.status !== "REVIEWED") {
    throw ApiError.conflict("This payout is no longer awaiting a decision", "PAYOUT_ALREADY_DECIDED");
  }
  const stage = payout.status === "REQUESTED" ? 1 : 2;
  assertPayoutStage({
    actor: user,
    stage,
    requestedById: payout.requested_by_id,
    firstApprovedById: payout.first_approved_by_id,
  });

  if (!approved) {
    await db.execute(
      `UPDATE payouts SET status = 'REJECTED', notes = COALESCE(?, notes) WHERE id = ?`,
      [data.notes || null, id]
    );
    await notifySafe([payout.requested_by_id], {
      type: "payout",
      title: "Payout request rejected",
      body: `Your payout request for "${payout.campaign_name || "your campaign"}" was rejected.`,
      link: "/dashboard/payouts",
      resource: "payout",
      resourceId: id,
      organizationId: orgId,
    });
    return getPayoutRow(scopeOrg, id).then(serialize);
  }

  if (stage === 1) {
    await db.execute(
      `UPDATE payouts SET status = 'REVIEWED', first_approved_by_id = ?, first_approved_at = NOW(),
         notes = COALESCE(?, notes) WHERE id = ?`,
      [user.id, data.notes || null, id]
    );
    await notifySafe(notificationService.orgAdmins(orgId), {
      type: "payout",
      title: "Payout ready for final approval",
      body: `A payout for "${payout.campaign_name || "a campaign"}" passed first review and needs an admin's final approval.`,
      link: "/dashboard/payouts",
      resource: "payout",
      resourceId: id,
      organizationId: orgId,
    });
  } else {
    await db.execute(
      `UPDATE payouts SET status = 'APPROVED', approved_by_id = ?, approved_at = NOW(),
         notes = COALESCE(?, notes) WHERE id = ?`,
      [user.id, data.notes || null, id]
    );
    await notifySafe(
      [payout.requested_by_id, ...(await notificationService.superAdmins())],
      {
        type: "payout",
        title: "Payout approved",
        body: `The payout for "${payout.campaign_name || "a campaign"}" is fully approved and ready to be paid.`,
        link: "/dashboard/payouts",
        resource: "payout",
        resourceId: id,
        organizationId: orgId,
      }
    );
  }
  return getPayoutRow(scopeOrg, id).then(serialize);
}

// ─── Payout review history / timeline ──────────────────────────────────────
//
// Every payout state change is written to audit_logs (resource='payout') by
// modules/payout/controller.js. This surfaces the full chronological trail —
// requested / first-reviewed / approved / rejected (with reason) / paid (with
// gateway ref) — to anyone who can see the payout, mirroring the campaign
// history endpoint.

const PAYOUT_HISTORY_LABELS = {
  "payout.requested": "Payout requested",
  "payout.first_approved": "Passed first review",
  "payout.approved": "Final approval given",
  "payout.rejected": "Rejected",
  "payout.paid": "Marked paid",
};

function parseDetails(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

async function getPayoutHistory(organizationId, id, user) {
  // Enforce the same visibility as GET /payouts/:id (throws notFound otherwise).
  await getPayout(organizationId, id, user);

  const rows = await db.query(
    `SELECT al.id, al.action, al.details, al.severity, al.created_at,
            al.actor_email, u.id AS actor_id, u.first_name, u.last_name, u.role AS actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
      WHERE al.resource = 'payout' AND al.resource_id = ?
      ORDER BY al.created_at ASC, al.id ASC`,
    [String(id)]
  );

  return rows.map((r) => {
    const details = parseDetails(r.details);
    return {
      id: r.id,
      action: r.action,
      label:
        PAYOUT_HISTORY_LABELS[r.action] ||
        r.action.replace(/^payout\./, "").replace(/[._]/g, " "),
      severity: r.severity,
      notes: typeof details.notes === "string" && details.notes ? details.notes : null,
      fields: null,
      actor: r.actor_id
        ? {
            id: r.actor_id,
            name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.actor_email,
            email: r.actor_email,
            role: r.actor_role,
          }
        : r.actor_email
          ? { id: null, name: r.actor_email, email: r.actor_email, role: null }
          : null,
      createdAt: r.created_at,
    };
  });
}

// ─── ClickPesa Payout Integration ───────────────────────────────────────────

/**
 * Previews a ClickPesa mobile money payout. Shows the fee breakdown
 * before the admin confirms the actual payout.
 */
async function previewPayout(organizationId, id, phoneNumber, user) {
  const scopeOrg = user && user.role === "SUPER_ADMIN" ? null : organizationId;
  const payout = await getPayoutRow(scopeOrg, id);
  if (payout.status !== "APPROVED") {
    throw ApiError.badRequest("Only approved payouts can be previewed", "PAYOUT_NOT_APPROVED");
  }

  if (!clickPesa.CLICKPESA.enabled) {
    // Dev mode — return a mock preview
    const platformFee = Math.round(Number(payout.amount) * 0.06);
    return {
      payoutId: payout.id,
      amount: Number(payout.amount),
      phoneNumber: clickPesa.normalizePhone(phoneNumber),
      providerFee: 0,
      platformFee,
      totalDeduction: Number(payout.amount) + platformFee,
      channelProvider: "MOBILE MONEY (dev)",
      receiverAccountNumber: clickPesa.normalizePhone(phoneNumber),
      previewOnly: true,
    };
  }

  const orderReference = clickPesa.generateOrderReference("Payout");
  const cpResponse = await clickPesa.previewPayout({
    amount: Number(payout.amount),
    phoneNumber,
    orderReference,
  });

  if (cpResponse.status >= 400) {
    throw ApiError.badRequest(
      cpResponse.data?.message || `ClickPesa preview failed: ${cpResponse.status}`,
      "CLICKPESA_PREVIEW_FAILED"
    );
  }

  return {
    payoutId: payout.id,
    amount: Number(payout.amount),
    phoneNumber: clickPesa.normalizePhone(phoneNumber),
    providerFee: cpResponse.data.fee || 0,
    platformFee: 0,
    totalDeduction: (cpResponse.data.amount || Number(payout.amount)),
    channelProvider: cpResponse.data.channelProvider || "MOBILE MONEY",
    orderReference,
    receiverAccountNumber: cpResponse.data.receiver?.accountNumber || clickPesa.normalizePhone(phoneNumber),
    receiverAccountName: cpResponse.data.receiver?.accountName || null,
  };
}

/**
 * Marks a payout as paid and initiates the ClickPesa payout if enabled.
 * In dev mode (ClickPesa disabled), it just records the payout as paid.
 */
async function markPaid(organizationId, id, data, user) {
  const scopeOrg = user && user.role === "SUPER_ADMIN" ? null : organizationId;
  const payout = await getPayoutRow(scopeOrg, id);
  if (payout.status !== "APPROVED") {
    throw ApiError.badRequest("Only approved payouts can be marked paid", "PAYOUT_NOT_APPROVED");
  }

  let gatewayRef = data.gatewayRef || null;
  let clickPesaResult = null;

  if (clickPesa.CLICKPESA.enabled && data.phoneNumber) {
    // Initiate actual ClickPesa payout
    const orderReference = clickPesa.generateOrderReference("Payout");

    try {
      const cpResponse = await clickPesa.createPayout({
        amount: Number(payout.amount),
        phoneNumber: data.phoneNumber,
        orderReference,
      });

      if (cpResponse.status >= 200 && cpResponse.status < 300 && cpResponse.data?.id) {
        gatewayRef = cpResponse.data.id;
        clickPesaResult = {
          id: cpResponse.data.id,
          status: cpResponse.data.status,
          fee: cpResponse.data.fee,
          channelProvider: cpResponse.data.channelProvider,
        };
      } else {
        throw new Error(
          cpResponse.data?.message || `ClickPesa payout creation failed: ${cpResponse.status}`
        );
      }
    } catch (err) {
      throw ApiError.badRequest(
        `Payment transfer failed: ${err.message}`,
        "CLICKPESA_PAYOUT_FAILED"
      );
    }
  }

  await db.execute(
    "UPDATE payouts SET status = 'PAID', paid_at = NOW(), gateway_ref = ?, notes = COALESCE(?, notes) WHERE id = ?",
    [gatewayRef, data.notes || null, id]
  );

  const updated = await getPayoutRow(scopeOrg, id);
  const serialized = serialize(updated);
  if (clickPesaResult) {
    serialized.clickPesa = clickPesaResult;
  }
  return serialized;
}

module.exports = {
  listPayouts,
  getPayout,
  getPayoutHistory,
  createPayout,
  decidePayout,
  previewPayout,
  markPaid,
};
