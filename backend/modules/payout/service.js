const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { assertCampaignAccess } = require("../campaign/service");
const clickPesa = require("../../utils/clickPesa");

function serialize(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name || null,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    requestedBy: row.requested_by_id,
    approvedBy: row.approved_by_id,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    gatewayRef: row.gateway_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT p.*, c.name AS campaign_name
  FROM payouts p
  LEFT JOIN campaigns c ON c.id = p.campaign_id
`;

/**
 * Org-level payouts (SUPER_ADMIN/ORG_ADMIN) see everything in their org; a
 * CAMPAIGN_MANAGER only ever sees their own requests.
 */
async function listPayouts(organizationId, filters, user) {
  const where = ["p.organization_id = ?"];
  const values = [organizationId];
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

/** Unscoped fetch for internal use (decide/markPaid are already admin-gated
 *  at the router, so no manager-ownership check applies there). */
async function getPayoutRow(organizationId, id) {
  const rows = await db.query(`${SELECT} WHERE p.id = ? AND p.organization_id = ?`, [id, organizationId]);
  if (!rows[0]) throw ApiError.notFound("Payout not found");
  return rows[0];
}

async function getPayout(organizationId, id, user) {
  const payout = await getPayoutRow(organizationId, id);
  if (user && user.role === "CAMPAIGN_MANAGER" && Number(payout.requested_by_id) !== Number(user.id)) {
    throw ApiError.notFound("Payout not found");
  }
  return serialize(payout);
}

/**
 * An admin (SUPER_ADMIN/ORG_ADMIN) can request an org-level payout with no
 * campaign attached. A CAMPAIGN_MANAGER must attach one of their assigned
 * campaigns and explain why (`reason`) — and can't have two open requests
 * for the same campaign at once.
 */
async function createPayout(organizationId, user, data) {
  let campaignId = data.campaignId ? Number(data.campaignId) : null;

  if (user.role === "CAMPAIGN_MANAGER") {
    if (!campaignId) {
      throw ApiError.badRequest("A campaign manager must specify which campaign this payout is for", "CAMPAIGN_REQUIRED");
    }
    if (!data.reason || !data.reason.trim()) {
      throw ApiError.badRequest("Explain why you're requesting this payout", "REASON_REQUIRED");
    }
    await assertCampaignAccess(organizationId, user, campaignId);

    const pending = await db.query(
      "SELECT id FROM payouts WHERE campaign_id = ? AND requested_by_id = ? AND status = 'REQUESTED'",
      [campaignId, user.id]
    );
    if (pending.length > 0) {
      throw ApiError.conflict(
        "You already have a payout request pending for this campaign",
        "PAYOUT_REQUEST_PENDING"
      );
    }
  } else if (campaignId) {
    // Admin requesting on behalf of a specific campaign — just confirm it's theirs.
    await assertCampaignAccess(organizationId, user, campaignId);
  }

  const result = await db.execute(
    `INSERT INTO payouts (organization_id, campaign_id, amount, reason, status, requested_by_id, notes)
     VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?)`,
    [organizationId, campaignId, data.amount, data.reason || null, user.id, data.notes || null]
  );
  return getPayout(organizationId, result.insertId, user);
}

async function decidePayout(organizationId, user, id, approved, data = {}) {
  const payout = await getPayoutRow(organizationId, id);
  if (payout.status !== "REQUESTED") {
    throw ApiError.conflict("Only requested payouts can be decided", "PAYOUT_ALREADY_DECIDED");
  }
  await db.execute(
    `UPDATE payouts SET status = ?, approved_by_id = ?, approved_at = NOW(), notes = COALESCE(?, notes)
     WHERE id = ? AND organization_id = ?`,
    [approved ? "APPROVED" : "REJECTED", user.id, data.notes || null, id, organizationId]
  );
  return getPayoutRow(organizationId, id).then(serialize);
}

// ─── ClickPesa Payout Integration ───────────────────────────────────────────

/**
 * Previews a ClickPesa mobile money payout. Shows the fee breakdown
 * before the admin confirms the actual payout.
 */
async function previewPayout(organizationId, id, phoneNumber) {
  const payout = await getPayoutRow(organizationId, id);
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
async function markPaid(organizationId, id, data) {
  const payout = await getPayoutRow(organizationId, id);
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
    "UPDATE payouts SET status = 'PAID', paid_at = NOW(), gateway_ref = ?, notes = COALESCE(?, notes) WHERE id = ? AND organization_id = ?",
    [gatewayRef, data.notes || null, id, organizationId]
  );

  const updated = await getPayoutRow(organizationId, id);
  const serialized = serialize(updated);
  if (clickPesaResult) {
    serialized.clickPesa = clickPesaResult;
  }
  return serialized;
}

module.exports = { listPayouts, getPayout, createPayout, decidePayout, previewPayout, markPaid };
