const db = require("../../db");
const { env } = require("../../config");
const { ApiError } = require("../../utils/ApiError");
const { assertCampaignAccess } = require("../campaign/service");
const { deleteUploadedFiles } = require("../../middlewares/upload");
const notificationService = require("../notification/service");
const clickPesa = require("../../utils/clickPesa");

/** "/uploads/..." web path -> absolute URL the frontend can load. */
function toAbsoluteImageUrl(webPath) {
  if (!webPath) return null;
  if (webPath.startsWith("/uploads/")) return `${env.API_PUBLIC_URL}${webPath}`;
  return webPath;
}

/** Passes a stored "/uploads/..." web path straight through to
 *  deleteUploadedFiles(), which routes it to whichever store backs it (local
 *  disk or Cloudflare R2). */
function uploadWebPathToDiskPath(webPath) {
  return webPath;
}

function serialize(row, proofImages = []) {
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
    confirmedBy: row.confirmed_by_id,
    confirmedAt: row.confirmed_at,
    paidAt: row.paid_at,
    gatewayRef: row.gateway_ref,
    proofImages,
    // Mobile-money payout destination, captured with the request.
    disbursement: row.disbursement_method
      ? {
          method: row.disbursement_method,
          provider: row.disbursement_provider,
          accountName: row.disbursement_account_name,
          accountNumber: row.disbursement_account_number,
          phone: row.disbursement_phone,
          bankName: row.disbursement_bank_name,
          branch: row.disbursement_branch,
          submittedAt: row.disbursement_submitted_at,
          submittedBy: row.disbursement_submitted_by_id,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** { [payoutId]: [{ id, url }] } proof-of-use photos for the given payouts. */
async function loadPayoutImages(payoutIds) {
  if (!payoutIds || payoutIds.length === 0) return {};
  const rows = await db.query(
    `SELECT id, payout_id, image_path FROM payout_images
     WHERE payout_id IN (?) ORDER BY sort_order ASC, id ASC`,
    [payoutIds]
  );
  const byId = {};
  for (const r of rows) {
    if (!byId[r.payout_id]) byId[r.payout_id] = [];
    byId[r.payout_id].push({ id: r.id, url: toAbsoluteImageUrl(r.image_path) });
  }
  return byId;
}

/** serialize() + its proof photos, in one round-trip. */
async function serializeWithImages(row) {
  const byId = await loadPayoutImages([row.id]);
  return serialize(row, byId[row.id] || []);
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
  const imagesById = await loadPayoutImages(payouts.map((p) => p.id));
  return {
    payouts: payouts.map((p) => serialize(p, imagesById[p.id] || [])),
    pagination: { page, limit, total: count[0].total, totalPages: Math.ceil(count[0].total / limit) },
  };
}

/** Internal fetch. Pass a null organizationId to skip org-scoping (a platform
 *  REVIEWER has no org); decide/confirm are already role-gated at the router. */
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
  return serializeWithImages(payout);
}

/**
 * Only campaign-creating roles request payouts, and every request is tied to a
 * specific campaign with a reason and a mobile-money destination
 * (provider + phone + account name). It then clears the two-stage approval chain
 * (REVIEWER -> ORG_ADMIN) before the requesting manager confirms the release.
 *   - CAMPAIGN_MANAGER: one of their assigned campaigns.
 *   - ORG_ADMIN:        any campaign in their org.
 * Only one payout per campaign may be in flight — a new request is blocked while
 * any payout for the campaign is not yet PAID or REJECTED, regardless of who
 * requested it.
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
    "SELECT id, status, raised_amount FROM campaigns WHERE id = ? AND organization_id = ?",
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

  // One payout at a time per campaign — anything not PAID / REJECTED blocks a
  // new request (mirrors loadOpenPayoutRequests in modules/campaign/service.js).
  const open = await db.query(
    `SELECT id FROM payouts
      WHERE campaign_id = ?
        AND status IN ('REQUESTED','REVIEWED','APPROVED')`,
    [campaignId]
  );
  if (open.length > 0) {
    throw ApiError.conflict(
      "A payout for this campaign is already in progress",
      "PAYOUT_REQUEST_PENDING"
    );
  }

  // Compute the maximum withdrawable amount: raised − platform fee − already paid out.
  const [campRow] = await db.query(
    `SELECT COALESCE(raised_amount, 0) AS raised,
            COALESCE(service_fee_amount, 0) AS fee
       FROM campaigns WHERE id = ?`,
    [campaignId]
  );
  const [paidRow] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalPaid
       FROM payouts WHERE campaign_id = ? AND status = 'PAID'`,
    [campaignId]
  );
  const maxPayout = Math.max(0, Number(campRow.raised) - Number(campRow.fee) - Number(paidRow.totalPaid));
  if (Number(data.amount) > maxPayout) {
    throw ApiError.badRequest(
      `The requested amount (${Number(data.amount).toLocaleString()} TZS) exceeds the available balance of ${maxPayout.toLocaleString()} TZS (raised minus platform fee minus already paid out).`,
      "PAYOUT_EXCEEDS_BALANCE"
    );
  }

  const result = await db.execute(
    `INSERT INTO payouts (
       organization_id, campaign_id, amount, reason, status, requested_by_id, notes,
       disbursement_method, disbursement_provider, disbursement_account_name,
       disbursement_phone, disbursement_submitted_at, disbursement_submitted_by_id
     )
     VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?, 'MOBILE_MONEY', ?, ?, ?, NOW(), ?)`,
    [
      organizationId,
      campaignId,
      data.amount,
      data.reason || null,
      user.id,
      data.notes || null,
      data.provider,
      data.accountName,
      clickPesa.normalizePhone(data.phone),
      user.id,
    ]
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

// ─── Proof-of-use photos ─────────────────────────────────────────────────────
//
// The requesting CAMPAIGN_MANAGER may attach up to 5 optional photos
// (invoices, receipts, delivery/site photos) so the reviewer and org admin can
// see why the money is needed. Editable only while the request is still in the
// approval chain (REQUESTED / REVIEWED) — once APPROVED / PAID / REJECTED the
// evidence is frozen.

const MAX_PROOF_IMAGES = 5;
const PROOF_EDITABLE_STATUSES = ["REQUESTED", "REVIEWED"];

/** Loads the payout and asserts the actor is its requester (managers only
 *  touch their own) and it's still in a state where proof can change. */
async function getEditableOwnPayout(organizationId, user, id) {
  const payout = await getPayoutRow(organizationId, id);
  if (Number(payout.requested_by_id) !== Number(user.id)) {
    throw ApiError.notFound("Payout not found");
  }
  if (!PROOF_EDITABLE_STATUSES.includes(payout.status)) {
    throw ApiError.conflict(
      "You can only change the proof while the request is still under review",
      "PAYOUT_PROOF_LOCKED"
    );
  }
  return payout;
}

/** Attaches proof photos to a payout request. `files` is multer's `.array()`
 *  output (req.files). */
async function attachProofImages(organizationId, user, id, files) {
  const list = Array.isArray(files) ? files : [];
  if (list.length === 0) throw ApiError.badRequest("No images were uploaded", "NO_IMAGES");

  const payout = await getEditableOwnPayout(organizationId, user, id);

  const [{ count }] = await db.query(
    "SELECT COUNT(*) AS count FROM payout_images WHERE payout_id = ?",
    [id]
  );
  if (Number(count) + list.length > MAX_PROOF_IMAGES) {
    throw ApiError.badRequest(
      `A payout request can have at most ${MAX_PROOF_IMAGES} proof photos`,
      "TOO_MANY_IMAGES"
    );
  }

  const [{ maxOrder }] = await db.query(
    "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM payout_images WHERE payout_id = ?",
    [id]
  );
  let order = Number(maxOrder) + 1;
  for (const file of list) {
    await db.execute(
      "INSERT INTO payout_images (payout_id, image_path, sort_order) VALUES (?, ?, ?)",
      [id, `/uploads/payouts/${payout.id}/${file.filename}`, order]
    );
    order++;
  }

  return serializeWithImages(await getPayoutRow(organizationId, id));
}

/** Removes one proof photo (DB row + file on disk). */
async function removeProofImage(organizationId, user, id, imageId) {
  await getEditableOwnPayout(organizationId, user, id);

  const rows = await db.query(
    "SELECT image_path FROM payout_images WHERE id = ? AND payout_id = ?",
    [imageId, id]
  );
  if (rows.length === 0) throw ApiError.notFound("Image not found");

  await db.execute("DELETE FROM payout_images WHERE id = ?", [imageId]);
  deleteUploadedFiles([{ path: uploadWebPathToDiskPath(rows[0].image_path) }]);

  return serializeWithImages(await getPayoutRow(organizationId, id));
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
    return getPayoutRow(scopeOrg, id).then(serializeWithImages);
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
    // Stage 2 cleared — the funds sit on hold until the requesting manager
    // confirms the release (which fires the gateway transfer).
    await db.execute(
      `UPDATE payouts SET status = 'APPROVED', approved_by_id = ?, approved_at = NOW(),
         notes = COALESCE(?, notes) WHERE id = ?`,
      [user.id, data.notes || null, id]
    );
    await notifySafe([payout.requested_by_id], {
      type: "payout",
      title: "Payout approved — confirm to release the funds",
      body: `Your payout for "${payout.campaign_name || "your campaign"}" is approved and on hold. Confirm it in the Payout tab to send the money.`,
      link: payout.campaign_id ? `/dashboard/campaigns/${payout.campaign_id}` : "/dashboard/payouts",
      resource: "payout",
      resourceId: id,
      organizationId: orgId,
    });
  }
  return getPayoutRow(scopeOrg, id).then(serializeWithImages);
}

// ─── Release: the requesting manager confirms, the money goes ───────────────
//
// Once a request clears both approvals it sits in APPROVED ("on hold"). The
// requesting CAMPAIGN_MANAGER then confirms the release, which — atomically —
// fires the ClickPesa mobile-money payout to the destination captured with the
// request and moves the row to PAID. A gateway failure rolls the whole thing
// back, leaving the payout APPROVED so the manager can retry.

async function confirmPayout(organizationId, user, id, data = {}) {
  // Managers are org-scoped; only the requester may confirm their own payout.
  const pre = await getPayoutRow(organizationId, id);
  if (Number(pre.requested_by_id) !== Number(user.id)) {
    throw ApiError.notFound("Payout not found");
  }
  if (pre.status !== "APPROVED") {
    throw ApiError.conflict(
      "This payout isn't waiting for your confirmation",
      "PAYOUT_NOT_AWAITING_CONFIRMATION"
    );
  }
  if (!pre.disbursement_phone) {
    throw ApiError.badRequest(
      "This payout has no mobile-money destination on file",
      "PAYOUT_NO_DESTINATION"
    );
  }

  const result = await db.withTransaction(async (tx) => {
    // Claim the row so a double-click / concurrent confirm can't run twice.
    const rows = await tx.query("SELECT * FROM payouts WHERE id = ? FOR UPDATE", [id]);
    const row = rows[0];
    if (!row) throw ApiError.notFound("Payout not found");
    if (row.status !== "APPROVED") {
      throw ApiError.conflict(
        "This payout has already been confirmed",
        "PAYOUT_ALREADY_CONFIRMED"
      );
    }

    let gatewayRef = null;
    let clickPesaResult = null;

    if (clickPesa.CLICKPESA.enabled) {
      // Use SEPARATE order references for preview and create — ClickPesa
      // rejects a reused reference with "Order reference already used".
      const previewRef = clickPesa.generateOrderReference("Pv");
      const createRef = clickPesa.generateOrderReference("Py");

      // Step 1: Preview the payout (validates phone, amount, balance)
      let previewResponse;
      try {
        previewResponse = await clickPesa.previewPayout({
          amount: Number(row.amount),
          phoneNumber: row.disbursement_phone,
          orderReference: previewRef,
        });
        console.log(`[payout] ClickPesa preview: HTTP ${previewResponse.status}`, JSON.stringify(previewResponse.data).substring(0, 300));
      } catch (err) {
        console.error(`[payout] ClickPesa preview network error:`, err.message);
        throw ApiError.badRequest(`Payout preview failed: ${err.message}`, "CLICKPESA_PREVIEW_FAILED");
      }
      // Check both HTTP status AND response body for errors
      if (previewResponse.status < 200 || previewResponse.status >= 300) {
        console.error(`[payout] ClickPesa preview rejected:`, JSON.stringify(previewResponse.data).substring(0, 300));
        throw ApiError.badRequest(
          `Payout preview failed: ${previewResponse.data?.message || `HTTP ${previewResponse.status}`}`,
          "CLICKPESA_PREVIEW_FAILED"
        );
      }
      // Even on HTTP 200, ClickPesa may return an error message
      if (previewResponse.data?.message && !previewResponse.data?.receiver) {
        console.error(`[payout] ClickPesa preview body error:`, previewResponse.data.message);
        throw ApiError.badRequest(
          `Payout preview failed: ${previewResponse.data.message}`,
          "CLICKPESA_PREVIEW_FAILED"
        );
      }
      console.log(`[payout] Preview OK — provider=${previewResponse.data?.channelProvider}, fee=${previewResponse.data?.fee}`);

      // Step 2: Create the payout (sends money to recipient)
      let cpResponse;
      try {
        cpResponse = await clickPesa.createPayout({
          amount: Number(row.amount),
          phoneNumber: row.disbursement_phone,
          orderReference: createRef,
        });
        console.log(`[payout] ClickPesa create: HTTP ${cpResponse.status}`, JSON.stringify(cpResponse.data).substring(0, 300));
      } catch (err) {
        console.error(`[payout] ClickPesa create network error:`, err.message);
        throw ApiError.badRequest(`Payment transfer failed: ${err.message}`, "CLICKPESA_PAYOUT_FAILED");
      }
      // Check HTTP status first
      if (cpResponse.status < 200 || cpResponse.status >= 300) {
        console.error(`[payout] ClickPesa create rejected:`, JSON.stringify(cpResponse.data).substring(0, 300));
        throw ApiError.badRequest(
          `Payment transfer failed: ${cpResponse.data?.message || `ClickPesa payout creation failed: HTTP ${cpResponse.status}`}`,
          "CLICKPESA_PAYOUT_FAILED"
        );
      }
      // On success ClickPesa returns an id; verify it exists
      if (cpResponse.data?.id) {
        gatewayRef = cpResponse.data.id;
        clickPesaResult = {
          id: cpResponse.data.id,
          status: cpResponse.data.status,
          fee: cpResponse.data.fee,
          channelProvider: cpResponse.data.channelProvider,
          amount: cpResponse.data.amount,
          beneficiary: cpResponse.data.beneficiary,
        };
        console.log(`[payout] ClickPesa payout created: id=${cpResponse.data.id} status=${cpResponse.data.status} channel=${cpResponse.data.channelProvider}`);

        // Wait 2 seconds then query the payout status to check if it was
        // actually completed or if ClickPesa reversed it (e.g. low balance).
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const queryResult = await clickPesa.queryPayout(createRef);
          if (queryResult) {
            console.log(`[payout] ClickPesa query: status=${queryResult.status}`);
            clickPesaResult.status = queryResult.status;
            if (queryResult.status === "REVERSED" || queryResult.status === "FAILED") {
              console.error(`[payout] ClickPesa payout was ${queryResult.status}:`, queryResult.message || "No details");
              throw ApiError.badRequest(
                `The payout was ${queryResult.status.toLowerCase()} by the payment provider. ${queryResult.message || "Please check your ClickPesa balance and try again."}`,
                "CLICKPESA_PAYOUT_REVERSED"
              );
            }
          }
        } catch (queryErr) {
          // If it's our own ApiError, re-throw it
          if (queryErr.code) throw queryErr;
          // Otherwise log but don't fail — the create succeeded
          console.error(`[payout] ClickPesa query failed (non-fatal):`, queryErr.message);
        }
      } else {
        console.error(`[payout] ClickPesa create missing id:`, JSON.stringify(cpResponse.data).substring(0, 300));
        throw ApiError.badRequest(
          `Payment transfer failed: ${cpResponse.data?.message || `ClickPesa returned no payout id (HTTP ${cpResponse.status})`}`,
          "CLICKPESA_PAYOUT_FAILED"
        );
      }
    } else {
      // Dev mode — no live gateway. Record a mock reference.
      gatewayRef = `DEV-${clickPesa.generateOrderReference("Payout")}`;
    }

    await tx.execute(
      `UPDATE payouts SET status = 'PAID', paid_at = NOW(), gateway_ref = ?,
         confirmed_by_id = ?, confirmed_at = NOW(), notes = COALESCE(?, notes)
       WHERE id = ?`,
      [gatewayRef, user.id, data.notes || null, id]
    );
    return { clickPesaResult };
  });

  const orgId = pre.organization_id;
  await notifySafe(
    Promise.all([notificationService.superAdmins(), notificationService.orgAdmins(orgId)]).then(
      ([a, b]) => [...a, ...b]
    ),
    {
      type: "payout",
      title: "Payout released",
      body: `The ${Number(pre.amount).toLocaleString()} TZS payout for "${pre.campaign_name || "a campaign"}" was confirmed and sent.`,
      link: "/dashboard/payouts",
      resource: "payout",
      resourceId: id,
      organizationId: orgId,
    }
  );

  const serialized = await serializeWithImages(await getPayoutRow(organizationId, id));
  if (result.clickPesaResult) serialized.clickPesa = result.clickPesaResult;
  return serialized;
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
  "payout.proof_added": "Proof of use attached",
  "payout.proof_removed": "Proof of use removed",
  "payout.first_approved": "Passed first review",
  "payout.approved": "Final approval given",
  "payout.confirmed": "Released by the campaign manager",
  "payout.rejected": "Rejected",
  "payout.paid": "Transfer completed",
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

module.exports = {
  listPayouts,
  getPayout,
  getPayoutHistory,
  createPayout,
  attachProofImages,
  removeProofImage,
  decidePayout,
  confirmPayout,
};
