const path = require("path");
const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { env } = require("../../config");
const { deleteUploadedFiles } = require("../../middlewares/upload");
const { sendEmail, buildCampaignLinkEmail } = require("../../utils/email");
const { translateFields } = require("../../utils/translate");
const notificationService = require("../notification/service");

// ─── Strict ordered approval chain ──────────────────────────────────────────
// Every campaign (and every material edit to a live one) clears the same two
// stages, and neither stage may be the campaign's creator:
//   stage 1 ("review")  — a REVIEWER (or SUPER_ADMIN)
//   stage 2 ("final")    — an ORG_ADMIN (or SUPER_ADMIN), different person
const STAGE1_ROLES = ["REVIEWER", "SUPER_ADMIN"];
const STAGE2_ROLES = ["ORG_ADMIN", "SUPER_ADMIN"];

// Editing any of these on an already-live campaign parks the change in
// campaign_change_requests and re-runs the chain. Anything else (Swahili
// translations, gallery photos, the featured flag) applies immediately.
const MATERIAL_FIELDS = [
  "name",
  "story",
  "scope",
  "acceptance",
  "goalAmount",
  "serviceFeePercent",
  "category",
  "startDate",
  "endDate",
  "minimumAmount",
  "contactPhone",
];

const LIVE_STATUSES = ["ACTIVE", "PAUSED"];

function assertApprovalStage({ actor, stage, firstApprovedBy, creatorId }) {
  const roles = stage === 1 ? STAGE1_ROLES : STAGE2_ROLES;
  if (!roles.includes(actor.role)) {
    throw ApiError.forbidden(
      stage === 1
        ? "The first approval must come from a reviewer"
        : "The final approval must come from an organisation admin",
      stage === 1 ? "NEEDS_REVIEWER" : "NEEDS_ORG_ADMIN"
    );
  }
  if (creatorId && Number(creatorId) === Number(actor.id)) {
    throw ApiError.badRequest("You can't approve a campaign you created", "SAME_AS_CREATOR");
  }
  if (stage === 2 && firstApprovedBy && Number(firstApprovedBy) === Number(actor.id)) {
    throw ApiError.badRequest(
      "A different person must give the final approval",
      "SAME_APPROVER"
    );
  }
}

/** Fire-and-forget notification — never lets a notify failure break the flow. */
async function notifySafe(recipients, payload) {
  try {
    const ids = typeof recipients?.then === "function" ? await recipients : recipients;
    await notificationService.notify(ids, payload);
  } catch (err) {
    console.error("[campaign-notify] failed:", err.message);
  }
}

function campaignLink(campaignId) {
  return `/dashboard/campaigns/${campaignId}`;
}

// English → Swahili is an automatic process: whenever a campaign's English
// name/story/category/scope/acceptance is written, we machine-translate it and
// keep the matching *_sw column in sync. Best-effort — with no Google
// Translate key configured, or on any failure, the *_sw column is left as-is
// and the public /sw pages fall back to the English text.
const SWAHILI_COLUMN = {
  name: "name_sw",
  story: "story_sw",
  category: "category_sw",
  scope: "scope_sw",
  acceptance: "acceptance_sw",
};

/** Awaited, but never throws: translate whichever English fields are supplied
 *  (non-empty) and write them onto the campaign's *_sw columns. */
async function syncSwahiliTranslations(campaignId, english) {
  try {
    const translated = await translateFields(english);
    const fields = [];
    const values = [];
    for (const [key, col] of Object.entries(SWAHILI_COLUMN)) {
      if (translated[key] === undefined) continue;
      fields.push(`${col} = ?`);
      values.push(translated[key]);
    }
    if (fields.length === 0) return;
    values.push(campaignId);
    await db.execute(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`, values);
  } catch (err) {
    console.warn(`[campaign-translate] #${campaignId}: ${err.message}`);
  }
}

/** Converts a stored "/uploads/..." web path back to an absolute disk path,
 *  so a superseded completion-report photo can be removed from disk. */
function uploadWebPathToDiskPath(webPath) {
  const segments = webPath.split("/").filter(Boolean);
  return path.join(__dirname, "..", "..", ...segments);
}

function toAbsoluteImageUrl(webPath) {
  if (!webPath) return null;
  if (webPath.startsWith("/uploads/")) return `${env.API_PUBLIC_URL}${webPath}`;
  return webPath;
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "campaign";
}

/**
 * Platform-level roles are not tied to one organisation: SUPER_ADMIN, REVIEWER
 * (stage-1 "first review" on every org's campaigns) and ORG_ADMIN (stage-2
 * "final approval" on every org's campaigns + payouts). CAMPAIGN_MANAGER is the
 * only org-scoped role — placed under the organisation created at registration.
 */
const PLATFORM_ROLES = ["SUPER_ADMIN", "REVIEWER", "ORG_ADMIN"];
function isPlatformRole(user) {
  return !!user && PLATFORM_ROLES.includes(user.role);
}

/**
 * Returns [sqlFragment, ...params] for org-scoping queries. Platform-level
 * roles see every org; a CAMPAIGN_MANAGER is limited to their own.
 */
function orgScope(organizationId, user) {
  if (isPlatformRole(user)) {
    return ["", []];
  }
  if (!organizationId && organizationId !== 0) return ["", []];
  return [" AND organization_id = ?", [organizationId]];
}

const PLATFORM_ORG_SLUG = "changia-platform";

/**
 * SUPER_ADMIN users have no organization_id (they're platform-wide), but
 * `campaigns.organization_id` is NOT NULL. Campaigns a SUPER_ADMIN creates
 * belong to a dedicated "Changia Platform" organization, found or created
 * lazily on first use.
 */
async function getOrCreatePlatformOrganizationId() {
  const existing = await db.query("SELECT id FROM organizations WHERE slug = ?", [
    PLATFORM_ORG_SLUG,
  ]);
  if (existing.length > 0) return existing[0].id;

  const result = await db.execute(
    `INSERT INTO organizations (name, slug, description, status)
     VALUES ('Changia Platform', ?, 'Official campaigns run by the Changia platform itself.', 'ACTIVE')`,
    [PLATFORM_ORG_SLUG]
  );
  return result.insertId;
}

async function uniqueSlug(name) {
  const base = slugify(name);
  const existing = await db.query("SELECT id FROM campaigns WHERE slug = ?", [base]);
  if (existing.length === 0) return base;
  let suffix = 2;
  while (true) {
    const candidate = `${base}-${suffix}`;
    const found = await db.query("SELECT id FROM campaigns WHERE slug = ?", [candidate]);
    if (found.length === 0) return candidate;
    suffix += 1;
  }
}

/**
 * Campaign-level service fee: the fee is added ON TOP of the goal.
 * Public target = goal + fee. Donations are credited at full face value.
 */
function computeFees(goalAmount, serviceFeePercent) {
  const percent = serviceFeePercent ?? env.DEFAULT_SERVICE_FEE_PERCENT;
  const fee = Math.round(goalAmount * (percent / 100));
  return {
    serviceFeePercent: percent,
    serviceFeeAmount: fee,
    publicTarget: goalAmount + fee,
  };
}

/**
 * The org's own default service-fee % (editable by ORG_ADMIN/SUPER_ADMIN on
 * the organization settings page) — falls back to the platform-wide
 * DEFAULT_SERVICE_FEE_PERCENT when the org has none set. A campaign creator
 * who doesn't pass an explicit `serviceFeePercent` gets this rate applied
 * automatically.
 */
async function getOrgDefaultFeePercent(organizationId) {
  if (!organizationId && organizationId !== 0) return env.DEFAULT_SERVICE_FEE_PERCENT;
  const rows = await db.query(
    "SELECT default_service_fee_percent FROM organizations WHERE id = ?",
    [organizationId]
  );
  if (rows.length === 0 || rows[0].default_service_fee_percent === null) {
    return env.DEFAULT_SERVICE_FEE_PERCENT;
  }
  return Number(rows[0].default_service_fee_percent);
}

function num(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function mapCampaign(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    story: c.story,
    nameSw: c.name_sw,
    storySw: c.story_sw,
    categorySw: c.category_sw,
    scope: c.scope ?? null,
    acceptance: c.acceptance ?? null,
    scopeSw: c.scope_sw ?? null,
    acceptanceSw: c.acceptance_sw ?? null,
    imageUrl: toAbsoluteImageUrl(c.image_url),
    category: c.category,
    goalAmount: num(c.goal_amount),
    serviceFeePercent: num(c.service_fee_percent),
    serviceFeeAmount: num(c.service_fee_amount),
    publicTarget: num(c.public_target),
    // Custom fee proposal state (null proposed = nothing pending).
    proposedServiceFeePercent:
      c.proposed_service_fee_percent === null || c.proposed_service_fee_percent === undefined
        ? null
        : num(c.proposed_service_fee_percent),
    feeStatus: c.fee_status || "NONE",
    feeReviewedBy: c.fee_reviewed_by ?? null,
    feeReviewedAt: c.fee_reviewed_at ?? null,
    feeReviewNotes: c.fee_review_notes ?? null,
    minimumAmount: num(c.minimum_amount),
    startDate: c.start_date,
    endDate: c.end_date,
    status: c.status,
    isPublic: Boolean(c.is_public),
    contactPhone: c.contact_phone,
    raisedAmount: num(c.raised_amount),
    donorCount: c.donor_count,
    isFeatured: Boolean(c.is_featured),
    featuredAt: c.featured_at,
    // Two-stage approval: firstApprovedBy/At is the first (PENDING -> REVIEWED)
    // sign-off; approvedBy/At is the second, decisive one (REVIEWED -> ACTIVE).
    firstApprovedBy: c.first_approved_by ?? null,
    firstApprovedAt: c.first_approved_at ?? null,
    approvedBy: c.approved_by,
    approvedAt: c.approved_at,
    createdBy: c.created_by_id ?? null,
    // Last reject / "request changes" feedback from a reviewer/admin, and
    // whether the manager still needs to act on it. hasPendingChanges = an
    // open campaign_change_requests row is waiting (see `changeRequest`).
    reviewNotes: c.review_notes ?? null,
    reviewState: c.review_state || "NONE",
    hasPendingChanges: Boolean(c.has_pending_changes),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    // The owning organisation's name — campaigns are branded with it, and
    // cross-org viewers (SUPER_ADMIN / REVIEWER) need it to tell campaigns apart.
    organizationId: c.organization_id ?? null,
    organizationName: c.organization_name || null,
  };
}

/**
 * Public-facing shape: no internal/org-management fields. `locale` picks the
 * Swahili translation when present, falling back to English when a campaign
 * hasn't been translated yet.
 */
function mapPublicCampaign(c, locale = "en") {
  const raised = num(c.raised_amount);
  const target = num(c.public_target);
  const sw = locale === "sw";
  return {
    id: c.id,
    name: (sw && c.name_sw) || c.name,
    slug: c.slug,
    story: (sw && c.story_sw) || c.story,
    scope: (sw && c.scope_sw) || c.scope || null,
    acceptance: (sw && c.acceptance_sw) || c.acceptance || null,
    imageUrl: toAbsoluteImageUrl(c.image_url),
    category: (sw && c.category_sw) || c.category,
    goalAmount: num(c.goal_amount),
    serviceFeePercent: num(c.service_fee_percent),
    serviceFeeAmount: num(c.service_fee_amount),
    publicTarget: target,
    minimumAmount: num(c.minimum_amount),
    startDate: c.start_date,
    endDate: c.end_date,
    status: c.status,
    raisedAmount: raised,
    donorCount: c.donor_count,
    isFeatured: Boolean(c.is_featured),
    remaining: Math.max(0, target - raised),
    progressPercent: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
    organizationName: c.organization_name || null,
    createdAt: c.created_at,
  };
}

async function assertCampaignAccess(organizationId, user, campaignId) {
  // Platform-level roles (SUPER_ADMIN, REVIEWER, ORG_ADMIN) act on every org's
  // campaigns and are never added to campaign_assignments, so they'd otherwise
  // be locked out of every campaign they can review / approve / manage.
  if (!user || isPlatformRole(user)) {
    return;
  }
  const rows = await db.query(
    `SELECT c.id FROM campaigns c JOIN campaign_assignments ca ON ca.campaign_id = c.id
     WHERE c.id = ? AND c.organization_id = ? AND ca.user_id = ?`,
    [campaignId, organizationId, user.id]
  );
  if (rows.length === 0) throw ApiError.notFound("Campaign not found");
}

/**
 * Content edits (name / story / goal / dates / translations / photos) belong to
 * the people who build the campaign: its creator, an assigned CAMPAIGN_MANAGER
 * (assignment already enforced by assertCampaignAccess), or a SUPER_ADMIN.
 *
 * An ORG_ADMIN runs the approval chain — approve, send back, pause, feature —
 * but does NOT edit a campaign somebody else created. If it needs work they
 * send it back with "Request changes" so the manager makes the change and it
 * re-enters review. This keeps the reviewer/approver separate from the author.
 */
function assertOrgAdminMayEdit(campaign, actor) {
  if (!actor || actor.role !== "ORG_ADMIN") return;
  const creatorId = campaign.created_by_id ?? null;
  if (Number(creatorId) !== Number(actor.id)) {
    throw ApiError.forbidden(
      'You can only edit campaigns you created. Send this one back to its manager with "Request changes" if it needs work.',
      "NOT_CAMPAIGN_EDITOR"
    );
  }
}

async function listCampaigns(organizationId, filters, user) {
  const where = [];
  const values = [];

  // Platform-level roles (SUPER_ADMIN, REVIEWER, ORG_ADMIN) see every org's
  // campaigns. Only a CAMPAIGN_MANAGER is scoped to their own organisation.
  if (user && !isPlatformRole(user)) {
    where.push("organization_id = ?");
    values.push(organizationId);
  }

  if (user && user.role === "CAMPAIGN_MANAGER") {
    where.push("id IN (SELECT campaign_id FROM campaign_assignments WHERE user_id = ?)");
    values.push(user.id);
  }

  if (filters.status) {
    where.push("status = ?");
    values.push(filters.status);
  }
  if (filters.search) {
    where.push("(name LIKE ? OR slug LIKE ?)");
    const like = `%${filters.search}%`;
    values.push(like, like);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const campaigns = await db.query(
    `SELECT id, organization_id, name, slug, story, name_sw, story_sw, category_sw,
            scope, acceptance, scope_sw, acceptance_sw, image_url, category, goal_amount,
            service_fee_percent, service_fee_amount, public_target,
            proposed_service_fee_percent, fee_status, fee_reviewed_by, fee_reviewed_at, fee_review_notes,
            minimum_amount, start_date, end_date,
            status, is_public, contact_phone, raised_amount, donor_count, is_featured, featured_at,
            first_approved_by, first_approved_at, approved_by, approved_at,
            created_by_id, review_notes, review_state, has_pending_changes, created_at, updated_at,
            (SELECT name FROM organizations WHERE id = campaigns.organization_id) AS organization_name
     FROM campaigns ${whereSql}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    values
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM campaigns ${whereSql}`, values)
    .then((rows) => [rows]);

  // Assignments for the returned campaigns
  const ids = campaigns.map((c) => c.id);
  let assignments = [];
  if (ids.length > 0) {
    assignments = await db.query(
      `SELECT ca.campaign_id, u.id, u.first_name, u.last_name, u.email
       FROM campaign_assignments ca
       JOIN users u ON u.id = ca.user_id
       WHERE ca.campaign_id IN (?)`,
      [ids]
    );
  }
  const byCampaign = {};
  for (const a of assignments) {
    if (!byCampaign[a.campaign_id]) byCampaign[a.campaign_id] = [];
    byCampaign[a.campaign_id].push({
      user: { id: a.id, firstName: a.first_name, lastName: a.last_name, email: a.email },
    });
  }

  const completedIds = campaigns.filter((c) => c.status === "COMPLETED").map((c) => c.id);
  const allIds = campaigns.map((c) => c.id);
  const [
    reportByCampaign,
    imagesByCampaign,
    closureByCampaign,
    changeReqByCampaign,
    payoutReqByCampaign,
  ] = await Promise.all([
    loadCompletionReportSummaries(completedIds),
    loadCampaignImages(allIds),
    loadLatestClosureRequests(allIds),
    loadOpenChangeRequests(allIds),
    loadOpenPayoutRequests(allIds),
  ]);

  return {
    campaigns: campaigns.map((c) => ({
      ...mapCampaign(c),
      assignments: byCampaign[c.id] || [],
      completionReport: reportByCampaign[c.id] || null,
      images: imagesByCampaign[c.id] || [],
      latestClosureRequest: closureByCampaign[c.id] || null,
      changeRequest: changeReqByCampaign.byId[c.id] || null,
      editRequest: changeReqByCampaign.editById[c.id] || null,
      statusRequest: changeReqByCampaign.statusById[c.id] || null,
      openPayoutRequest: payoutReqByCampaign[c.id] || null,
    })),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function getCampaign(organizationId, campaignId, user) {
  await assertCampaignAccess(organizationId, user, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(
    `SELECT id, organization_id, name, slug, story, name_sw, story_sw, category_sw,
            scope, acceptance, scope_sw, acceptance_sw, image_url, category, goal_amount,
            service_fee_percent, service_fee_amount, public_target,
            proposed_service_fee_percent, fee_status, fee_reviewed_by, fee_reviewed_at, fee_review_notes,
            minimum_amount, start_date, end_date,
            status, is_public, contact_phone, raised_amount, donor_count, is_featured, featured_at,
            first_approved_by, first_approved_at, approved_by, approved_at,
            created_by_id, review_notes, review_state, has_pending_changes, created_at, updated_at,
            (SELECT name FROM organizations WHERE id = campaigns.organization_id) AS organization_name
     FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

  const [donations, assignments] = await Promise.all([
    db.query(
      `SELECT id, amount, donor_name, is_anonymous, method, receipt_number, confirmed_at, created_at
       FROM donations
       WHERE campaign_id = ? AND status = 'CONFIRMED'
       ORDER BY created_at DESC LIMIT 10`,
      [campaignId]
    ),
    db.query(
      `SELECT ca.campaign_id, u.id, u.first_name, u.last_name, u.email
       FROM campaign_assignments ca
       JOIN users u ON u.id = ca.user_id
       WHERE ca.campaign_id = ?`,
      [campaignId]
    ),
  ]);

  const raised = num(campaign.raised_amount);
  const target = num(campaign.public_target);
  const [
    reportByCampaign,
    imagesByCampaign,
    closureByCampaign,
    changeReqByCampaign,
    payoutReqByCampaign,
  ] = await Promise.all([
    campaign.status === "COMPLETED" ? loadCompletionReportSummaries([campaign.id]) : {},
    loadCampaignImages([campaign.id]),
    loadLatestClosureRequests([campaign.id]),
    loadOpenChangeRequests([campaign.id]),
    loadOpenPayoutRequests([campaign.id]),
  ]);

  return {
    ...mapCampaign(campaign),
    assignments: assignments.map((a) => ({
      user: { id: a.id, firstName: a.first_name, lastName: a.last_name, email: a.email },
    })),
    completionReport: reportByCampaign[campaign.id] || null,
    images: imagesByCampaign[campaign.id] || [],
    latestClosureRequest: closureByCampaign[campaign.id] || null,
    changeRequest: changeReqByCampaign.byId[campaign.id] || null,
    editRequest: changeReqByCampaign.editById[campaign.id] || null,
    statusRequest: changeReqByCampaign.statusById[campaign.id] || null,
    openPayoutRequest: payoutReqByCampaign[campaign.id] || null,
    donations: donations.map((d) => ({
      id: d.id,
      amount: num(d.amount),
      donorName: d.donor_name,
      isAnonymous: Boolean(d.is_anonymous),
      method: d.method,
      receiptNumber: d.receipt_number,
      confirmedAt: d.confirmed_at,
      createdAt: d.created_at,
    })),
    remaining: Math.max(0, target - raised),
    progressPercent:
      target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
  };
}

async function createCampaign(organizationId, data, actor) {
  if (data.goalAmount <= 0) {
    throw ApiError.badRequest("Campaign goal must be greater than zero");
  }

  // The service-fee % starts from the org default. A CAMPAIGN_MANAGER may
  // PROPOSE a different rate — it is parked as a pending proposal (see below)
  // and doesn't take effect until a reviewer/admin approves it. An
  // ORG_ADMIN/SUPER_ADMIN/REVIEWER who sets a rate applies it immediately.

  // Platform-level roles (SUPER_ADMIN / ORG_ADMIN / REVIEWER) have no
  // organization_id — a campaign they create belongs to the dedicated
  // "Changia Platform" organization.
  const resolvedOrgId =
    organizationId || (isPlatformRole(actor) ? await getOrCreatePlatformOrganizationId() : organizationId);
  if (!resolvedOrgId) {
    throw ApiError.badRequest("No organization to create this campaign under");
  }

  // A manager can't start a new campaign while a campaign assigned to them is
  // COMPLETED without an approved completion-proof report ("unfilled").
  if (actor.role === "CAMPAIGN_MANAGER") {
    const blocking = await db.query(
      `SELECT c.id, c.name FROM campaigns c
       JOIN campaign_assignments ca ON ca.campaign_id = c.id
       LEFT JOIN campaign_completion_reports r
         ON r.campaign_id = c.id AND r.status = 'APPROVED'
       WHERE ca.user_id = ? AND c.status = 'COMPLETED' AND r.id IS NULL
       LIMIT 1`,
      [actor.id]
    );
    if (blocking.length > 0) {
      throw ApiError.conflict(
        `Submit the completion proof for "${blocking[0].name}" (and get it approved) before creating a new campaign`,
        "CAMPAIGN_PROOF_REQUIRED"
      );
    }
  }
  // Fee resolution + proposal handling.
  //   - Manager passing a custom rate → keep the org default active, park the
  //     custom rate as a PENDING proposal for a reviewer/admin to approve.
  //   - Admin/reviewer passing a rate → apply it immediately (fee_status stays
  //     NONE — no approval needed, they ARE the approver).
  const isPrivilegedFeeSetter = actor.role !== "CAMPAIGN_MANAGER";
  const orgDefaultFeePercent = await getOrgDefaultFeePercent(resolvedOrgId);
  let effectiveFeePercent = orgDefaultFeePercent;
  let proposedFeePercent = null;
  let feeStatus = "NONE";
  if (data.serviceFeePercent !== undefined) {
    if (isPrivilegedFeeSetter) {
      effectiveFeePercent = data.serviceFeePercent;
    } else if (data.serviceFeePercent !== orgDefaultFeePercent) {
      // Manager proposed a rate that differs from the default → pending review.
      proposedFeePercent = data.serviceFeePercent;
      feeStatus = "PENDING";
    }
  }
  const { serviceFeePercent, serviceFeeAmount, publicTarget } = computeFees(
    data.goalAmount,
    effectiveFeePercent
  );
  const slug = await uniqueSlug(data.name);

  // Two ways in:
  //   - asDraft → stored as DRAFT. The creator keeps working on it (details,
  //     cover photo, donor pools) and later calls POST /:id/submit, which moves
  //     it to PENDING and notifies the reviewers.
  //   - otherwise → straight to PENDING, exactly as before (creating already IS
  //     "submitting for review").
  // Either way there is NO self-approval and it stays unlisted (is_public = 0)
  // until it clears the strict two-stage chain — stage 1 by a REVIEWER, stage 2
  // by an ORG_ADMIN, neither being the creator (see approveCampaign for
  // PENDING -> REVIEWED -> ACTIVE).
  const startAsDraft = data.asDraft === true;
  const initialStatus = startAsDraft ? "DRAFT" : "PENDING";
  const result = await db.execute(
    `INSERT INTO campaigns
       (organization_id, created_by_id, name, slug, story, name_sw, story_sw, category_sw,
        scope, acceptance, image_url, category,
        goal_amount, service_fee_percent, service_fee_amount, public_target,
        proposed_service_fee_percent, fee_status, minimum_amount,
        start_date, end_date, contact_phone, status, is_public, approved_by, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resolvedOrgId,
      actor.id,
      data.name,
      slug,
      data.story || null,
      data.nameSw || null,
      data.storySw || null,
      data.categorySw || null,
      data.scope || null,
      data.acceptance || null,
      data.imageUrl || null,
      data.category || null,
      data.goalAmount,
      serviceFeePercent,
      serviceFeeAmount,
      publicTarget,
      proposedFeePercent,
      feeStatus,
      data.minimumAmount ?? 1000,
      data.startDate ? new Date(data.startDate) : null,
      data.endDate ? new Date(data.endDate) : null,
      data.contactPhone || null,
      initialStatus,
      0,
      null,
      null,
    ]
  );
  const campaignId = result.insertId;

  // A manager must be able to continue managing the campaign they created.
  if (actor.role === "CAMPAIGN_MANAGER") {
    await db.execute(
      "INSERT IGNORE INTO campaign_assignments (campaign_id, user_id) VALUES (?, ?)",
      [campaignId, actor.id]
    );
  }

  if (data.managerIds && data.managerIds.length > 0) {
    for (const userId of data.managerIds) {
      await db.execute(
        `INSERT IGNORE INTO campaign_assignments (campaign_id, user_id) VALUES (?, ?)`,
        [campaignId, userId]
      );
    }
  }

  // Import donor pools into the campaign at creation time.
  if (data.poolIds && data.poolIds.length > 0) {
    await importPools(resolvedOrgId, { role: "ORG_ADMIN", id: actor.id, email: actor.email }, campaignId, {
      poolIds: data.poolIds,
      expectedAmounts: data.expectedAmounts,
    });
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.created', 'campaign', ?, 'INFO')`,
    [resolvedOrgId, actor.id, actor.email, String(campaignId)]
  );

  await syncSwahiliTranslations(campaignId, {
    name: data.name,
    story: data.story,
    category: data.category,
    scope: data.scope,
    acceptance: data.acceptance,
  });

  // A draft isn't in the approval queue yet — the reviewers are notified only
  // once the creator submits it (see submitCampaign).
  if (!startAsDraft) {
    await notifySafe(notificationService.orgReviewersAndAdmins(resolvedOrgId), {
      type: "campaign",
      title: "New campaign awaiting review",
      body: `"${data.name}" was submitted and needs a reviewer's first approval.`,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId: resolvedOrgId,
    });
  }

  return getCampaign(resolvedOrgId, campaignId, actor);
}

async function updateCampaign(organizationId, campaignId, data, actor) {
  // A CAMPAIGN_MANAGER may propose a custom serviceFeePercent — it is parked
  // as a pending proposal below rather than applied. ORG_ADMIN/SUPER_ADMIN/
  // REVIEWER apply it immediately. (No hard block on managers anymore.)
  const isManager = actor.role === "CAMPAIGN_MANAGER";

  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT * FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  assertOrgAdminMayEdit(campaign, actor);

  // Campaigns activate immediately on creation, so "editable" now means any
  // live/ongoing status — only the archival end states (COMPLETED/CANCELLED)
  // are locked. The goal/fee themselves are additionally frozen once a
  // campaign has taken its first donation, so the public target never moves
  // out from under donors who already gave against it.
  if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
    throw ApiError.badRequest("Completed or cancelled campaigns can't be edited", "CAMPAIGN_LOCKED");
  }
  if (
    num(campaign.raised_amount) > 0 &&
    (data.goalAmount !== undefined || data.serviceFeePercent !== undefined)
  ) {
    throw ApiError.badRequest(
      "The goal amount can't change once a campaign has received donations",
      "GOAL_LOCKED"
    );
  }

  // ── Live campaign (ACTIVE / PAUSED): a material edit is NOT applied to the
  //    row — it is parked in campaign_change_requests and must clear the
  //    two-stage chain again. The campaign keeps serving its last-approved
  //    values meanwhile. Non-material fields (translations / cover URL /
  //    is_public) still apply immediately below.
  const isLive = LIVE_STATUSES.includes(campaign.status);
  if (isLive) {
    const materialChanges = collectMaterialChanges(campaign, data);
    if (Object.keys(materialChanges).length > 0) {
      await upsertChangeRequest(campaign, actor, materialChanges, undefined);
      await applyImmediateFields(campaignId, data);
      await db.execute(
        `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
         VALUES (?, ?, ?, 'campaign.change_request.submitted', 'campaign', ?, 'INFO')`,
        [organizationId, actor.id, actor.email, String(campaignId)]
      );
      await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
        type: "campaign",
        title: "Campaign changes awaiting review",
        body: `"${campaign.name}" has edits that need a reviewer's approval before they show publicly.`,
        link: campaignLink(campaignId),
        resource: "campaign",
        resourceId: campaignId,
        organizationId,
      });
      return getCampaign(organizationId, campaignId, actor);
    }
  }

  let feeData = null;
  // A manager's serviceFeePercent is a PROPOSAL, not an applied change; only an
  // admin/reviewer's rate feeds into the effective computation.
  const privilegedFeeChange = !isManager && data.serviceFeePercent !== undefined;
  let proposalUpdate; // undefined = no change; a number = new pending proposal
  if (data.goalAmount !== undefined && data.goalAmount !== num(campaign.goal_amount)) {
    // Recomputing off a new goal: an admin/reviewer may override the rate in
    // the same call; otherwise keep the campaign's current (approved) rate so a
    // manager's goal edit never silently shifts the fee.
    const percent = privilegedFeeChange
      ? data.serviceFeePercent
      : num(campaign.service_fee_percent);
    feeData = computeFees(data.goalAmount, percent);
  } else if (privilegedFeeChange) {
    feeData = computeFees(num(campaign.goal_amount), data.serviceFeePercent);
  }
  if (
    isManager &&
    data.serviceFeePercent !== undefined &&
    data.serviceFeePercent !== num(campaign.service_fee_percent)
  ) {
    // Manager proposed a rate different from the active one → pending review.
    proposalUpdate = data.serviceFeePercent;
  }

  const fields = [];
  const values = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.story !== undefined) { fields.push("story = ?"); values.push(data.story); }
  if (data.scope !== undefined) { fields.push("scope = ?"); values.push(data.scope || null); }
  if (data.acceptance !== undefined) { fields.push("acceptance = ?"); values.push(data.acceptance || null); }
  if (data.nameSw !== undefined) { fields.push("name_sw = ?"); values.push(data.nameSw || null); }
  if (data.storySw !== undefined) { fields.push("story_sw = ?"); values.push(data.storySw || null); }
  if (data.categorySw !== undefined) { fields.push("category_sw = ?"); values.push(data.categorySw || null); }
  if (data.imageUrl !== undefined) { fields.push("image_url = ?"); values.push(data.imageUrl); }
  if (data.category !== undefined) { fields.push("category = ?"); values.push(data.category); }
  if (data.goalAmount !== undefined) { fields.push("goal_amount = ?"); values.push(data.goalAmount); }
  if (data.minimumAmount !== undefined) { fields.push("minimum_amount = ?"); values.push(data.minimumAmount); }
  if (data.startDate !== undefined) {
    fields.push("start_date = ?");
    values.push(data.startDate ? new Date(data.startDate) : null);
  }
  if (data.endDate !== undefined) {
    fields.push("end_date = ?");
    values.push(data.endDate ? new Date(data.endDate) : null);
  }
  if (data.contactPhone !== undefined) { fields.push("contact_phone = ?"); values.push(data.contactPhone); }
  if (data.isPublic !== undefined) { fields.push("is_public = ?"); values.push(data.isPublic ? 1 : 0); }
  if (feeData) {
    fields.push("service_fee_percent = ?");
    fields.push("service_fee_amount = ?");
    fields.push("public_target = ?");
    values.push(feeData.serviceFeePercent, feeData.serviceFeeAmount, feeData.publicTarget);
  }
  if (privilegedFeeChange) {
    // Admin/reviewer set the rate directly — it's approved by their authority;
    // clear any pending proposal and record them as the reviewer.
    fields.push("proposed_service_fee_percent = ?");
    fields.push("fee_status = ?");
    fields.push("fee_reviewed_by = ?");
    fields.push("fee_reviewed_at = NOW()");
    values.push(null, "APPROVED", actor.id);
  } else if (proposalUpdate !== undefined) {
    // Manager proposed a new rate → mark PENDING, awaiting a reviewer/admin.
    fields.push("proposed_service_fee_percent = ?");
    fields.push("fee_status = ?");
    fields.push("fee_reviewed_by = ?");
    fields.push("fee_reviewed_at = ?");
    fields.push("fee_review_notes = ?");
    values.push(proposalUpdate, "PENDING", null, null, null);
  }

  // Editing a not-yet-live campaign resets its place in the chain so a review
  // always covers the latest content: a REVIEWED campaign drops back to
  // PENDING and its stage-1 sign-off is cleared; a "changes requested" flag is
  // lifted now that the manager has acted.
  if (campaign.status === "REVIEWED") {
    fields.push("status = ?", "first_approved_by = NULL", "first_approved_at = NULL");
    values.push("PENDING");
  }
  if (campaign.review_state === "CHANGES_REQUESTED") {
    fields.push("review_state = 'NONE'");
  }

  if (fields.length > 0) {
    values.push(campaignId);
    await db.execute(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  // Record which fields the edit touched so the campaign history / review
  // timeline can show a reviewer exactly what changed since the last round.
  const editedFields = Object.keys(data).filter(
    (k) =>
      data[k] !== undefined &&
      !["managerIds", "poolIds", "expectedAmounts", "asDraft"].includes(k)
  );
  const resubmitted =
    campaign.status === "REVIEWED" || campaign.review_state === "CHANGES_REQUESTED";
  await writeAudit(
    organizationId,
    actor,
    resubmitted ? "campaign.resubmitted" : "campaign.updated",
    campaignId,
    "INFO",
    editedFields.length > 0 ? { fields: editedFields } : undefined
  );

  if (resubmitted) {
    await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
      type: "campaign",
      title: "Campaign re-submitted for review",
      body: `"${campaign.name}" was updated and needs a reviewer's first approval again.`,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
  }

  // Auto-refresh the Swahili columns for whichever English fields changed —
  // unless the caller explicitly supplied that field's own *Sw override.
  await syncSwahiliTranslations(campaignId, {
    name: data.nameSw === undefined ? data.name : undefined,
    story: data.storySw === undefined ? data.story : undefined,
    category: data.categorySw === undefined ? data.category : undefined,
    scope: data.scope,
    acceptance: data.acceptance,
  });

  return getCampaign(organizationId, campaignId, actor);
}

// ─── Campaign change requests (material edits to a live campaign) ─────────────
//
// A material edit (see MATERIAL_FIELDS) to an ACTIVE/PAUSED campaign is parked
// here as a JSON payload and must clear the SAME strict two-stage chain
// (REVIEWER -> ORG_ADMIN) before it is written onto the campaign. The live
// campaign keeps serving its last-approved values until then. Only one open
// request (PENDING / REVIEWED / CHANGES_REQUESTED) exists per campaign.

const CHANGE_REQUEST_OPEN = ["PENDING", "REVIEWED", "CHANGES_REQUESTED"];

async function writeAudit(organizationId, actor, action, resourceId, severity = "INFO", details) {
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, details, severity)
     VALUES (?, ?, ?, ?, 'campaign', ?, ?, ?)`,
    [
      organizationId,
      actor.id,
      actor.email,
      action,
      String(resourceId),
      details ? JSON.stringify(details) : null,
      severity,
    ]
  );
}

function parsePayload(raw) {
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

function mapChangeRequest(r) {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    status: r.status,
    // 'EDIT' (parked field changes) or 'STATUS' (a manager's suspend/resume).
    kind: r.request_kind || "EDIT",
    statusAction: r.status_action || null,
    payload: parsePayload(r.payload),
    hasStagedCover: Boolean(r.staged_cover_path),
    stagedCoverUrl: r.staged_cover_path ? toAbsoluteImageUrl(r.staged_cover_path) : null,
    submittedBy: r.submitted_by_id ?? null,
    firstApprovedBy: r.first_approved_by ?? null,
    firstApprovedAt: r.first_approved_at ?? null,
    approvedBy: r.approved_by ?? null,
    approvedAt: r.approved_at ?? null,
    reviewNotes: r.review_notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    decidedAt: r.decided_at ?? null,
  };
}

/**
 * Open change requests per campaign. A campaign can have an open EDIT (parked
 * field changes) *and* an open STATUS (a manager's suspend/resume ask) at the
 * same time, so we return them split out as well as the newest-of-any-kind:
 *   - byId       — newest open request, any kind (legacy `changeRequest`)
 *   - editById   — newest open EDIT request
 *   - statusById — newest open STATUS request
 */
async function loadOpenChangeRequests(campaignIds) {
  const result = { byId: {}, editById: {}, statusById: {} };
  if (!campaignIds || campaignIds.length === 0) return result;
  const rows = await db.query(
    `SELECT * FROM campaign_change_requests
     WHERE campaign_id IN (?) AND status IN ('PENDING','REVIEWED','CHANGES_REQUESTED')
     ORDER BY id DESC`,
    [campaignIds]
  );
  const { byId, editById, statusById } = result;
  for (const r of rows) {
    const mapped = mapChangeRequest(r);
    if (!byId[r.campaign_id]) byId[r.campaign_id] = mapped;
    const bucket = mapped.kind === "STATUS" ? statusById : editById;
    if (!bucket[r.campaign_id]) bucket[r.campaign_id] = mapped;
  }
  return result;
}

/**
 * { [campaignId]: { id, status, amount, requestedBy } } — the newest payout
 * still in the approval chain (REQUESTED/REVIEWED) per campaign. Lets the
 * campaigns list flag "a payout is already in review" instead of offering the
 * action and having createPayout reject it.
 */
async function loadOpenPayoutRequests(campaignIds) {
  if (!campaignIds || campaignIds.length === 0) return {};
  const rows = await db.query(
    `SELECT campaign_id, id, status, amount, requested_by_id
       FROM payouts
      WHERE campaign_id IN (?) AND status IN ('REQUESTED','REVIEWED')
      ORDER BY id DESC`,
    [campaignIds]
  );
  const byId = {};
  for (const r of rows) {
    if (!byId[r.campaign_id]) {
      byId[r.campaign_id] = {
        id: r.id,
        status: r.status,
        amount: Number(r.amount),
        requestedBy: r.requested_by_id ?? null,
      };
    }
  }
  return byId;
}

async function getOpenChangeRequestRow(campaignId, kind = "EDIT") {
  const rows = await db.query(
    `SELECT * FROM campaign_change_requests
     WHERE campaign_id = ? AND request_kind = ?
       AND status IN ('PENDING','REVIEWED','CHANGES_REQUESTED')
     ORDER BY id DESC LIMIT 1`,
    [campaignId, kind]
  );
  return rows[0] || null;
}

/** Which MATERIAL_FIELDS in `data` actually differ from the campaign row. */
function collectMaterialChanges(campaign, data) {
  const currentTime = (v) => (v ? new Date(v).getTime() : null);
  const changes = {};
  for (const key of MATERIAL_FIELDS) {
    if (data[key] === undefined) continue;
    const raw = data[key];
    if (key === "startDate" || key === "endDate") {
      const col = key === "startDate" ? campaign.start_date : campaign.end_date;
      if (currentTime(raw) !== currentTime(col)) changes[key] = raw || null;
    } else if (key === "goalAmount") {
      if (Number(raw) !== num(campaign.goal_amount)) changes[key] = Number(raw);
    } else if (key === "serviceFeePercent") {
      if (Number(raw) !== num(campaign.service_fee_percent)) changes[key] = Number(raw);
    } else if (key === "minimumAmount") {
      if (Number(raw) !== num(campaign.minimum_amount)) changes[key] = Number(raw);
    } else {
      // Remaining MATERIAL_FIELDS are plain text columns — compare against the
      // matching campaign column by name.
      const TEXT_COL = {
        name: campaign.name,
        story: campaign.story,
        scope: campaign.scope,
        acceptance: campaign.acceptance,
        category: campaign.category,
        contactPhone: campaign.contact_phone,
      };
      const col = TEXT_COL[key];
      const v = raw === "" ? null : raw ?? null;
      if (v !== (col ?? null)) changes[key] = v;
    }
  }
  return changes;
}

/** Applies only the non-material (immediately-editable) fields of an edit. */
async function applyImmediateFields(campaignId, data) {
  const fields = [];
  const values = [];
  if (data.nameSw !== undefined) { fields.push("name_sw = ?"); values.push(data.nameSw || null); }
  if (data.storySw !== undefined) { fields.push("story_sw = ?"); values.push(data.storySw || null); }
  if (data.categorySw !== undefined) { fields.push("category_sw = ?"); values.push(data.categorySw || null); }
  if (data.imageUrl !== undefined) { fields.push("image_url = ?"); values.push(data.imageUrl || null); }
  if (data.isPublic !== undefined) { fields.push("is_public = ?"); values.push(data.isPublic ? 1 : 0); }
  if (fields.length === 0) return;
  values.push(campaignId);
  await db.execute(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`, values);
}

/**
 * Upserts the single open change request for a campaign with `materialChanges`
 * merged into its payload, resetting it to PENDING (a fresh review).
 * `stagedCoverPath`: undefined = leave the staged cover untouched; a string =
 * set/replace it.
 */
async function upsertChangeRequest(campaign, actor, materialChanges, stagedCoverPath) {
  const setStagedCover = stagedCoverPath !== undefined;
  const open = await getOpenChangeRequestRow(campaign.id);

  if (open) {
    const merged = { ...parsePayload(open.payload), ...materialChanges };
    if (
      setStagedCover &&
      open.staged_cover_path &&
      open.staged_cover_path !== stagedCoverPath &&
      open.staged_cover_path.startsWith("/uploads/campaigns/")
    ) {
      deleteUploadedFiles([{ path: uploadWebPathToDiskPath(open.staged_cover_path) }]);
    }
    const sets = [
      "payload = ?",
      "submitted_by_id = ?",
      "status = 'PENDING'",
      "first_approved_by = NULL",
      "first_approved_at = NULL",
      "approved_by = NULL",
      "approved_at = NULL",
      "review_notes = NULL",
      "decided_at = NULL",
    ];
    const params = [JSON.stringify(merged), actor.id];
    if (setStagedCover) {
      sets.push("staged_cover_path = ?");
      params.push(stagedCoverPath);
    }
    params.push(open.id);
    await db.execute(
      `UPDATE campaign_change_requests SET ${sets.join(", ")} WHERE id = ?`,
      params
    );
  } else {
    await db.execute(
      `INSERT INTO campaign_change_requests
         (campaign_id, organization_id, submitted_by_id, payload, staged_cover_path, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [
        campaign.id,
        campaign.organization_id,
        actor.id,
        JSON.stringify(materialChanges),
        setStagedCover ? stagedCoverPath : null,
      ]
    );
  }

  await db.execute(
    "UPDATE campaigns SET has_pending_changes = 1, review_state = 'NONE' WHERE id = ?",
    [campaign.id]
  );
}

/** Writes an approved change-request payload onto the campaign row. */
async function applyChangeRequestPayload(campaign, payload, stagedCoverPath) {
  const p = payload || {};
  const fields = [];
  const values = [];
  if (p.name !== undefined) { fields.push("name = ?"); values.push(p.name); }
  if (p.story !== undefined) { fields.push("story = ?"); values.push(p.story); }
  if (p.scope !== undefined) { fields.push("scope = ?"); values.push(p.scope); }
  if (p.acceptance !== undefined) { fields.push("acceptance = ?"); values.push(p.acceptance); }
  if (p.category !== undefined) { fields.push("category = ?"); values.push(p.category); }
  if (p.minimumAmount !== undefined) { fields.push("minimum_amount = ?"); values.push(p.minimumAmount); }
  if (p.contactPhone !== undefined) { fields.push("contact_phone = ?"); values.push(p.contactPhone); }
  if (p.startDate !== undefined) {
    fields.push("start_date = ?");
    values.push(p.startDate ? new Date(p.startDate) : null);
  }
  if (p.endDate !== undefined) {
    fields.push("end_date = ?");
    values.push(p.endDate ? new Date(p.endDate) : null);
  }

  const goalChanged = p.goalAmount !== undefined;
  const feeChanged = p.serviceFeePercent !== undefined;
  if (goalChanged || feeChanged) {
    const goal = goalChanged ? Number(p.goalAmount) : num(campaign.goal_amount);
    const percent = feeChanged ? Number(p.serviceFeePercent) : num(campaign.service_fee_percent);
    const fee = computeFees(goal, percent);
    fields.push("goal_amount = ?", "service_fee_percent = ?", "service_fee_amount = ?", "public_target = ?");
    values.push(goal, fee.serviceFeePercent, fee.serviceFeeAmount, fee.publicTarget);
    if (feeChanged) {
      fields.push("proposed_service_fee_percent = NULL", "fee_status = 'APPROVED'", "fee_reviewed_at = NOW()");
    }
  }

  if (stagedCoverPath) {
    if (campaign.image_url && campaign.image_url.startsWith("/uploads/campaigns/")) {
      deleteUploadedFiles([{ path: uploadWebPathToDiskPath(campaign.image_url) }]);
    }
    fields.push("image_url = ?");
    values.push(stagedCoverPath);
  }

  if (fields.length > 0) {
    values.push(campaign.id);
    await db.execute(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  // The parked edit is now the live English content — re-translate the fields
  // it touched so the Swahili pages stay in step.
  await syncSwahiliTranslations(campaign.id, {
    name: p.name,
    story: p.story,
    category: p.category,
    scope: p.scope,
    acceptance: p.acceptance,
  });
}

async function listChangeRequests(organizationId, campaignId, user) {
  await assertCampaignAccess(organizationId, user, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");
  const rows = await db.query(
    "SELECT * FROM campaign_change_requests WHERE campaign_id = ? ORDER BY created_at DESC, id DESC",
    [campaignId]
  );
  return rows.map(mapChangeRequest);
}

/**
 * A CAMPAIGN_MANAGER asks to suspend (PAUSE) or resume (RESUME) a campaign.
 * The ask is parked as a STATUS change request that clears the same two-stage
 * chain as a parked edit — a REVIEWER first, then an ORG_ADMIN — and only the
 * final approval actually flips the campaign's status (via decideChangeRequest,
 * which calls changeCampaignStatus).
 */
async function requestCampaignStatusChange(organizationId, campaignId, actor, data) {
  const action = data.action; // 'PAUSE' | 'RESUME'
  const reason = (data.reason || "").trim();

  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const rows = await db.query(
    `SELECT id, name, status, organization_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = rows[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  organizationId = campaign.organization_id ?? organizationId;

  if (action === "PAUSE" && campaign.status !== "ACTIVE") {
    throw ApiError.badRequest("Only an active campaign can be suspended", "CAMPAIGN_NOT_ACTIVE");
  }
  if (action === "RESUME" && campaign.status !== "PAUSED") {
    throw ApiError.badRequest("Only a suspended campaign can be resumed", "CAMPAIGN_NOT_PAUSED");
  }

  const open = await getOpenChangeRequestRow(campaignId, "STATUS");
  if (open) {
    throw ApiError.conflict(
      "There's already a suspend/resume request awaiting review for this campaign",
      "STATUS_REQUEST_OPEN"
    );
  }

  await db.execute(
    `INSERT INTO campaign_change_requests
       (campaign_id, organization_id, submitted_by_id, request_kind, status_action, payload, status)
     VALUES (?, ?, ?, 'STATUS', ?, ?, 'PENDING')`,
    [campaignId, organizationId, actor.id, action, JSON.stringify(reason ? { reason } : {})]
  );

  const label = action === "PAUSE" ? "suspend" : "resume";
  await writeAudit(
    organizationId,
    actor,
    `campaign.status_request.submitted`,
    campaignId,
    "INFO",
    { action, reason: reason || undefined }
  );
  await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
    type: "campaign",
    title: `Request to ${label} a campaign`,
    body: `A manager asked to ${label} "${campaign.name}" — needs a reviewer's first approval.`,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return getCampaign(organizationId, campaignId, actor);
}

/**
 * A REVIEWER/ORG_ADMIN/SUPER_ADMIN decides an open change request.
 *   action: 'approve' | 'request_changes' | 'reject'
 *   - approve @ PENDING  -> REVIEWED   (stage-1, must be a REVIEWER/SUPER_ADMIN, not the creator)
 *   - approve @ REVIEWED -> APPLIED    (stage-2, must be an ORG_ADMIN/SUPER_ADMIN, a different
 *                                       person, not the creator) — payload written onto the campaign
 *   - request_changes    -> CHANGES_REQUESTED (mandatory note; manager re-edits)
 *   - reject             -> REJECTED   (mandatory reason; live campaign keeps its values)
 */
async function decideChangeRequest(organizationId, campaignId, requestId, actor, data) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(`SELECT * FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  // A platform REVIEWER carries no organization_id — fall back to the
  // campaign's own org for audit rows and org-admin notifications.
  organizationId = campaign.organization_id ?? organizationId;

  const rows = await db.query(
    "SELECT * FROM campaign_change_requests WHERE id = ? AND campaign_id = ?",
    [requestId, campaignId]
  );
  const request = rows[0];
  if (!request) throw ApiError.notFound("Change request not found");
  if (!["PENDING", "REVIEWED"].includes(request.status)) {
    throw ApiError.badRequest("This change request can no longer be decided", "CHANGE_REQUEST_CLOSED");
  }

  const action = data.action;
  const notes = (data.notes || "").trim();
  if ((action === "reject" || action === "request_changes") && notes.length < 10) {
    throw ApiError.badRequest("A reason of at least 10 characters is required", "REASON_REQUIRED");
  }

  // 'STATUS' rows are a manager's suspend/resume ask; 'EDIT' rows are parked
  // field changes. The two-stage chain is identical — only what "approve"
  // finally does, and the wording, differ.
  const isStatus = request.request_kind === "STATUS";
  const statusVerb = request.status_action === "PAUSE" ? "suspend" : "resume";
  const noun = isStatus ? `request to ${statusVerb} "${campaign.name}"` : `edits to "${campaign.name}"`;
  // Who may not approve their own submission: the campaign creator for a parked
  // edit, but for a STATUS ask it's whoever actually raised the request.
  const originatorId = isStatus ? request.submitted_by_id : campaign.created_by_id;

  if (action === "approve" && request.status === "PENDING") {
    assertApprovalStage({ actor, stage: 1, creatorId: originatorId });
    await db.execute(
      `UPDATE campaign_change_requests
       SET status = 'REVIEWED', first_approved_by = ?, first_approved_at = NOW(), review_notes = NULL
       WHERE id = ?`,
      [actor.id, requestId]
    );
    await writeAudit(organizationId, actor, "campaign.change_request.first_approved", campaignId);
    await notifySafe(notificationService.orgAdmins(organizationId), {
      type: "campaign",
      title: isStatus
        ? `Campaign ${statusVerb} request ready for final approval`
        : "Campaign changes ready for final approval",
      body: `The ${noun} passed first review.`,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
    await notifySafe(notificationService.campaignManagerAudience(campaignId), {
      type: "campaign",
      title: isStatus
        ? `Your ${statusVerb} request passed first review`
        : "Your campaign edits passed first review",
      body: `The ${noun} now needs a final approval from an admin.`,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
  } else if (action === "approve") {
    // request.status === 'REVIEWED'
    assertApprovalStage({
      actor,
      stage: 2,
      firstApprovedBy: request.first_approved_by,
      creatorId: originatorId,
    });
    await db.execute(
      `UPDATE campaign_change_requests
       SET status = 'APPLIED', approved_by = ?, approved_at = NOW(), decided_at = NOW()
       WHERE id = ?`,
      [actor.id, requestId]
    );
    await writeAudit(organizationId, actor, "campaign.change_request.approved", campaignId);

    if (isStatus) {
      // Flip the campaign's status now — changeCampaignStatus writes its own
      // audit row and notifies the manager audience.
      const target = request.status_action === "PAUSE" ? "PAUSED" : "ACTIVE";
      await changeCampaignStatus(organizationId, campaignId, target, actor);
    } else {
      await applyChangeRequestPayload(campaign, parsePayload(request.payload), request.staged_cover_path);
      await db.execute(
        "UPDATE campaigns SET has_pending_changes = 0, review_state = 'NONE', review_notes = NULL WHERE id = ?",
        [campaignId]
      );
      await notifySafe(notificationService.campaignManagerAudience(campaignId), {
        type: "campaign",
        title: "Your campaign changes are live",
        body: `The approved edits to "${campaign.name}" are now public.`,
        link: campaignLink(campaignId),
        resource: "campaign",
        resourceId: campaignId,
        organizationId,
      });
    }
  } else if (action === "request_changes") {
    await db.execute(
      `UPDATE campaign_change_requests
       SET status = 'CHANGES_REQUESTED', first_approved_by = NULL, first_approved_at = NULL, review_notes = ?
       WHERE id = ?`,
      [notes, requestId]
    );
    // The campaign's own review_state banner is for parked EDITs only.
    if (!isStatus) {
      await db.execute(
        "UPDATE campaigns SET review_state = 'CHANGES_REQUESTED', review_notes = ? WHERE id = ?",
        [notes, campaignId]
      );
    }
    await writeAudit(organizationId, actor, "campaign.change_request.changes_requested", campaignId, "INFO", { notes });
    await notifySafe(notificationService.campaignManagerAudience(campaignId), {
      type: "campaign",
      title: isStatus
        ? `Changes requested on your ${statusVerb} request`
        : "Changes requested on your campaign edit",
      body: notes,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
  } else if (action === "reject") {
    if (request.staged_cover_path && request.staged_cover_path.startsWith("/uploads/campaigns/")) {
      deleteUploadedFiles([{ path: uploadWebPathToDiskPath(request.staged_cover_path) }]);
    }
    await db.execute(
      `UPDATE campaign_change_requests
       SET status = 'REJECTED', review_notes = ?, decided_at = NOW()
       WHERE id = ?`,
      [notes, requestId]
    );
    if (!isStatus) {
      await db.execute(
        "UPDATE campaigns SET has_pending_changes = 0, review_state = 'NONE', review_notes = ? WHERE id = ?",
        [notes, campaignId]
      );
    }
    await writeAudit(organizationId, actor, "campaign.change_request.rejected", campaignId, "WARNING", { notes });
    await notifySafe(notificationService.campaignManagerAudience(campaignId), {
      type: "campaign",
      title: isStatus ? `Your ${statusVerb} request was rejected` : "Campaign edit rejected",
      body: notes,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
  } else {
    throw ApiError.badRequest("Unknown decision", "INVALID_ACTION");
  }

  return getCampaign(organizationId, campaignId, actor);
}

/**
 * Adds/edits the Swahili translation of a campaign's name/story/category.
 * Unlike updateCampaign, this is allowed at any campaign status — content
 * translation carries none of the financial-integrity risk that locks the
 * rest of the campaign once it goes live.
 */
async function setTranslations(organizationId, campaignId, data, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, created_by_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  assertOrgAdminMayEdit(existing[0], actor);

  await db.execute(
    "UPDATE campaigns SET name_sw = ?, story_sw = ?, category_sw = ? WHERE id = ?",
    [data.nameSw || null, data.storySw || null, data.categorySw || null, campaignId]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.translated', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  return getCampaign(organizationId, campaignId, actor);
}

async function submitCampaign(organizationId, campaignId, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT status, image_url, contact_phone, start_date, end_date FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  const draft = existing[0];
  // DRAFT is the first submission; REJECTED is a re-submission after a hard
  // reject — the manager has (presumably) addressed the feedback and it goes
  // straight back to the reviewer queue at stage 1.
  const isResubmit = draft.status === "REJECTED";
  if (draft.status !== "DRAFT" && !isResubmit) {
    throw ApiError.badRequest("Only draft or rejected campaigns can be submitted for approval");
  }
  // The same essentials the one-step (non-draft) create flow always required —
  // enforced here so a bare draft can't reach a reviewer half-finished.
  const missing = [];
  if (!draft.image_url) missing.push("a cover photo");
  if (!draft.contact_phone) missing.push("a contact phone");
  if (!draft.start_date || !draft.end_date) missing.push("start and end dates");
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `Add ${missing.join(", ")} before submitting this campaign for approval`,
      "CAMPAIGN_INCOMPLETE"
    );
  }

  await db.execute(
    `UPDATE campaigns
     SET status = 'PENDING', review_state = 'NONE',
         first_approved_by = NULL, first_approved_at = NULL,
         review_notes = ${isResubmit ? "NULL" : "review_notes"}
     WHERE id = ?`,
    [campaignId]
  );
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, ?, 'campaign', ?, 'INFO')`,
    [
      organizationId,
      actor.id,
      actor.email,
      isResubmit ? "campaign.resubmitted" : "campaign.submitted",
      String(campaignId),
    ]
  );
  await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
    type: "campaign",
    title: isResubmit
      ? "Rejected campaign re-submitted for review"
      : "Campaign submitted for review",
    body: isResubmit
      ? "A previously rejected campaign was fixed and re-submitted — it needs a reviewer's first approval again."
      : "A campaign was submitted and needs a reviewer's first approval.",
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });
  return getCampaign(organizationId, campaignId, actor);
}

/**
 * Strict ordered two-stage approval — EVERY campaign clears both stages, and
 * neither stage may be the campaign's creator:
 *
 *   PENDING  -> REVIEWED  : stage 1, a REVIEWER (or SUPER_ADMIN).
 *   REVIEWED -> ACTIVE     : stage 2, an ORG_ADMIN (or SUPER_ADMIN) who is a
 *                            DIFFERENT person from the stage-1 approver; only
 *                            then does it go public and the donor-target link
 *                            emails go out.
 *
 * Same endpoint both times — the caller just POSTs /:id/approve again.
 */
async function approveCampaign(organizationId, campaignId, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, name, status, organization_id, first_approved_by, created_by_id
     FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  const campaign = existing[0];
  // A platform REVIEWER carries no organization_id — audit rows and the
  // "ready for final approval" notification to org admins must use the
  // campaign's own org, not the actor's.
  organizationId = campaign.organization_id ?? organizationId;

  if (campaign.status === "PENDING") {
    assertApprovalStage({ actor, stage: 1, creatorId: campaign.created_by_id });
    await db.execute(
      `UPDATE campaigns
       SET status = 'REVIEWED', first_approved_by = ?, first_approved_at = NOW(),
           review_state = 'NONE', review_notes = NULL
       WHERE id = ?`,
      [actor.id, campaignId]
    );
    await writeAudit(organizationId, actor, "campaign.first_approved", campaignId);
    await notifySafe(notificationService.orgAdmins(organizationId), {
      type: "campaign",
      title: "Campaign ready for final approval",
      body: `"${campaign.name}" passed first review and needs an admin's final approval.`,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
    await notifySafe(notificationService.campaignManagerAudience(campaignId), {
      type: "campaign",
      title: "Your campaign passed first review",
      body: `"${campaign.name}" now needs a final approval from an admin.`,
      link: campaignLink(campaignId),
      resource: "campaign",
      resourceId: campaignId,
      organizationId,
    });
    return getCampaign(organizationId, campaignId, actor);
  }

  if (campaign.status !== "REVIEWED") {
    throw ApiError.badRequest(
      "Only campaigns awaiting review or final approval can be approved",
      "INVALID_APPROVAL_STATE"
    );
  }

  assertApprovalStage({
    actor,
    stage: 2,
    firstApprovedBy: campaign.first_approved_by,
    creatorId: campaign.created_by_id,
  });

  await db.execute(
    `UPDATE campaigns SET status = 'ACTIVE', is_public = 1, approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [actor.id, campaignId]
  );
  await writeAudit(organizationId, actor, "campaign.approved", campaignId);
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: "Campaign is live",
    body: `"${campaign.name}" cleared both approvals and is now public.`,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  // ─── Send campaign link emails to targeted donors ────────────────────────
  sendCampaignLinkEmails(organizationId, campaignId).catch((err) => {
    console.error(`[campaign-approval] Failed to send donor emails for campaign ${campaignId}:`, err.message);
  });

  return getCampaign(organizationId, campaignId, actor);
}

/**
 * A REVIEWER/ORG_ADMIN/SUPER_ADMIN rejects a campaign still in the approval
 * chain (PENDING / REVIEWED). status -> REJECTED — NOT terminal: the manager
 * can fix the campaign and re-submit it straight back to PENDING (see
 * submitCampaign). A reason is mandatory (enforced in validation) and is
 * stored on the campaign (review_notes) so the manager sees why, plus in the
 * audit trail.
 */
async function rejectCampaign(organizationId, campaignId, actor, notes) {
  const reason = (notes || "").trim();
  if (reason.length < 10) {
    throw ApiError.badRequest("A rejection reason of at least 10 characters is required", "REASON_REQUIRED");
  }
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, name, status, organization_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  const campaign = existing[0];
  organizationId = campaign.organization_id ?? organizationId;
  if (campaign.status !== "PENDING" && campaign.status !== "REVIEWED") {
    throw ApiError.badRequest(
      "Only campaigns awaiting review or final approval can be rejected",
      "INVALID_APPROVAL_STATE"
    );
  }

  await db.execute(
    `UPDATE campaigns
     SET status = 'REJECTED', is_public = 0, review_state = 'NONE',
         first_approved_by = NULL, first_approved_at = NULL, review_notes = ?
     WHERE id = ?`,
    [reason, campaignId]
  );
  await writeAudit(organizationId, actor, "campaign.rejected", campaignId, "WARNING", { notes: reason });
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: "Campaign rejected — fix and re-submit",
    body: reason,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return getCampaign(organizationId, campaignId, actor);
}

/**
 * A REVIEWER/ORG_ADMIN/SUPER_ADMIN sends a campaign in the approval chain
 * (PENDING / REVIEWED) back to the manager to fix — non-terminal. A note is
 * mandatory. The campaign returns to PENDING with its stage-1 sign-off
 * cleared, and review_state = 'CHANGES_REQUESTED' until the manager re-edits.
 */
async function requestCampaignChanges(organizationId, campaignId, actor, notes) {
  const reason = (notes || "").trim();
  if (reason.length < 10) {
    throw ApiError.badRequest("A note of at least 10 characters is required", "REASON_REQUIRED");
  }
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, name, status, organization_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  const campaign = existing[0];
  organizationId = campaign.organization_id ?? organizationId;
  if (campaign.status !== "PENDING" && campaign.status !== "REVIEWED") {
    throw ApiError.badRequest(
      "Only campaigns awaiting review or final approval can be sent back",
      "INVALID_APPROVAL_STATE"
    );
  }

  await db.execute(
    `UPDATE campaigns
     SET status = 'PENDING', first_approved_by = NULL, first_approved_at = NULL,
         review_state = 'CHANGES_REQUESTED', review_notes = ?
     WHERE id = ?`,
    [reason, campaignId]
  );
  await writeAudit(organizationId, actor, "campaign.changes_requested", campaignId, "INFO", { notes: reason });
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: "Changes requested on your campaign",
    body: reason,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return getCampaign(organizationId, campaignId, actor);
}

/**
 * A REVIEWER/ORG_ADMIN/SUPER_ADMIN decides a manager's proposed custom
 * service-fee %.  data.action:
 *   - 'approve'         → the proposed rate becomes the campaign's active fee;
 *                         service fee amount and public target are recomputed.
 *   - 'reject'          → the proposal is discarded, current fee stays
 *                         (mandatory reason).
 *   - 'request_changes' → proposal stays PENDING with a note for the manager
 *                         to revise (mandatory note).
 * Only a PENDING proposal can be decided; approving is blocked once the
 * campaign has received donations.
 */
async function reviewFeeProposal(organizationId, campaignId, actor, data) {
  const action = data.action || (data.approved ? "approve" : "reject");
  const notes = (data.notes || "").trim();
  if ((action === "reject" || action === "request_changes") && notes.length < 10) {
    throw ApiError.badRequest("A reason of at least 10 characters is required", "REASON_REQUIRED");
  }

  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, name, organization_id, goal_amount, service_fee_percent, proposed_service_fee_percent,
            fee_status, raised_amount
     FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  organizationId = campaign.organization_id ?? organizationId;
  if (campaign.fee_status !== "PENDING") {
    throw ApiError.badRequest(
      "There is no pending service-fee proposal to review",
      "NO_PENDING_FEE_PROPOSAL"
    );
  }

  let auditAction;
  let notifyTitle;
  if (action === "approve") {
    if (num(campaign.raised_amount) > 0) {
      throw ApiError.badRequest(
        "The service fee can't change once a campaign has received donations",
        "GOAL_LOCKED"
      );
    }
    const percent = num(campaign.proposed_service_fee_percent);
    const feeData = computeFees(num(campaign.goal_amount), percent);
    await db.execute(
      `UPDATE campaigns
       SET service_fee_percent = ?, service_fee_amount = ?, public_target = ?,
           proposed_service_fee_percent = NULL, fee_status = 'APPROVED',
           fee_reviewed_by = ?, fee_reviewed_at = NOW(), fee_review_notes = ?
       WHERE id = ?`,
      [
        feeData.serviceFeePercent,
        feeData.serviceFeeAmount,
        feeData.publicTarget,
        actor.id,
        notes || null,
        campaignId,
      ]
    );
    auditAction = "campaign.fee_proposal.approved";
    notifyTitle = "Your custom service fee was approved";
  } else if (action === "request_changes") {
    await db.execute(
      `UPDATE campaigns
       SET fee_status = 'PENDING', fee_reviewed_by = ?, fee_reviewed_at = NOW(), fee_review_notes = ?
       WHERE id = ?`,
      [actor.id, notes, campaignId]
    );
    auditAction = "campaign.fee_proposal.changes_requested";
    notifyTitle = "Changes requested on your service-fee proposal";
  } else {
    await db.execute(
      `UPDATE campaigns
       SET proposed_service_fee_percent = NULL, fee_status = 'REJECTED',
           fee_reviewed_by = ?, fee_reviewed_at = NOW(), fee_review_notes = ?
       WHERE id = ?`,
      [actor.id, notes, campaignId]
    );
    auditAction = "campaign.fee_proposal.rejected";
    notifyTitle = "Your custom service-fee proposal was rejected";
  }

  await writeAudit(
    organizationId,
    actor,
    auditAction,
    campaignId,
    action === "reject" ? "WARNING" : "INFO",
    notes ? { notes } : undefined
  );
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: notifyTitle,
    body: notes || `"${campaign.name}"`,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return getCampaign(organizationId, campaignId, actor);
}

async function changeCampaignStatus(organizationId, campaignId, status, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT status, name FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

  // ACTIVE (resume) and COMPLETED stay public — COMPLETED is the platform's
  // track record and where the completion-report proof surfaces; only
  // PAUSED/CANCELLED pull the campaign off the public site.
  const isPublic = status === "ACTIVE" || status === "COMPLETED" ? 1 : 0;
  await db.execute(
    "UPDATE campaigns SET status = ?, is_public = ? WHERE id = ?",
    [status, isPublic, campaignId]
  );
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, ?, 'campaign', ?, ?)`,
    [
      organizationId,
      actor.id,
      actor.email,
      `campaign.${status.toLowerCase()}`,
      String(campaignId),
      status === "CANCELLED" ? "WARNING" : "INFO",
    ]
  );

  const STATUS_LABEL = {
    ACTIVE: "resumed",
    PAUSED: "suspended",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  };
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: `Campaign ${STATUS_LABEL[status] || status.toLowerCase()}`,
    body: `An admin marked "${existing[0].name || `campaign #${campaignId}`}" as ${status}.`,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });
  return getCampaign(organizationId, campaignId, actor);
}

async function loadPoolIds(organizationId, user, poolIds) {
  if (!poolIds || poolIds.length === 0) return [];
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const pools = await db.query(
    `SELECT id, name, is_system, created_by_id
     FROM donor_pools WHERE id IN (?)${orgSql}`,
    [poolIds, ...orgParams]
  );
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN";
  const invalid = poolIds.filter(
    (id) =>
      !pools.some(
        (p) =>
          Number(p.id) === Number(id) &&
          (isAdmin || p.is_system === 1 || Number(p.created_by_id) === user.id)
      )
  );
  if (invalid.length > 0) {
    throw ApiError.forbidden("One or more selected pools are not visible to you", "POOL_ACCESS_DENIED");
  }
  return pools.map((p) => Number(p.id));
}

/** Loads all unique members donor rows for the given pools. */
async function loadPoolMembers(organizationId, poolIds) {
  if (poolIds.length === 0) return { members: [], duplicateGroups: [] };
  const [orgSql, ...orgParams] = orgScope(organizationId);
  const members = await db.query(
    `SELECT dpm.pool_id, dpm.expected_amount, d.id AS donor_id,
            d.first_name, d.last_name, d.email, d.phone, d.gender, d.position, d.is_anomalous
     FROM donor_pool_members dpm
     JOIN donors d ON d.id = dpm.donor_id
     WHERE dpm.pool_id IN (?)${orgSql}`,
    [poolIds, ...orgParams]
  );

  const byDonor = new Map();
  for (const m of members) {
    if (!byDonor.has(m.donor_id)) byDonor.set(m.donor_id, []);
    byDonor.get(m.donor_id).push(m);
  }

  const dupRows = await db.query(
    `SELECT dpm.donor_id, COUNT(*) AS pool_count
     FROM donor_pool_members dpm
     WHERE dpm.pool_id IN (?)
     GROUP BY dpm.donor_id
     HAVING COUNT(*) > 1`,
    [poolIds]
  );
  const dupIds = dupRows.map((r) => Number(r.donor_id));

  const duplicateGroups = dupIds.map((donorId) => {
    const entries = byDonor.get(donorId) || [];
    return {
      donorId,
      poolIds: entries.map((e) => Number(e.pool_id)),
    };
  });

  return { members, duplicateGroups };
}

const computeStatus = (expected, paid) => {
  if (expected === null || expected === undefined) return paid > 0 ? "PAID_FULL" : "UNPAID";
  if (paid <= 0) return "UNPAID";
  if (paid >= expected) return "PAID_FULL";
  return "PARTIAL";
};

/**
 * Previews importing donor pools into a campaign so the UI can first ask the
 * user how to handle donors that appear in more than one selected pool.
 */
async function previewPoolImport(organizationId, user, campaignId, poolIds) {
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(
    `SELECT id, name FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const visiblePoolIds = await loadPoolIds(organizationId, user, poolIds.map(Number));
  if (visiblePoolIds.length === 0) throw ApiError.badRequest("No valid pools selected");

  const pools = await db.query(
    `SELECT id, name, category FROM donor_pools WHERE id IN (?)`,
    [visiblePoolIds]
  );
  const { members, duplicateGroups } = await loadPoolMembers(organizationId, visiblePoolIds);

  const memberIds = [...new Set(members.map((m) => Number(m.donor_id)))];
  let existingRows = [];
  if (memberIds.length > 0) {
    existingRows = await db.query(
      "SELECT donor_id FROM campaign_donor_targets WHERE campaign_id = ? AND donor_id IN (?)",
      [campaignId, memberIds]
    );
  }
  const existingIds = new Set(existingRows.map((r) => Number(r.donor_id)));

  const mapped = [...new Map(members.map((m) => [m.donor_id, m])).values()];

  return {
    campaignId: Number(campaignId),
    pools: pools.map((p) => ({ id: p.id, name: p.name, category: p.category })),
    donors: mapped
      .filter((m) => !existingIds.has(Number(m.donor_id)))
      .map((m) => ({
        donorId: Number(m.donor_id),
        firstName: m.first_name,
        lastName: m.last_name,
        email: m.email,
        phone: m.phone,
      })),
    duplicateGroups: duplicateGroups.map((g) => ({
      donorId: g.donorId,
      pools: g.poolIds.map((pid) => {
        const p = pools.find((x) => Number(x.id) === pid);
        return { id: pid, name: p ? p.name : `Pool ${pid}` };
      }),
    })),
    alreadyTracked: [...existingIds].length,
  };
}

/**
 * Imports one or more donor pools into a campaign. Donors already tracked are
 * kept; donors found in several pools are assigned to the pool chosen by the
 * user (`duplicateChoices`), defaulting to the first selected pool otherwise.
 */
async function importPools(organizationId, user, campaignId, data) {
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(
    `SELECT id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const visiblePoolIds = await loadPoolIds(
    organizationId,
    user,
    data.poolIds.map(Number)
  );
  const { members } = await loadPoolMembers(organizationId, visiblePoolIds);

  const expectedOverrides = data.expectedAmounts || {};
  const choices = {};
  for (const c of data.duplicateChoices || []) {
    choices[Number(c.donorId)] = Number(c.poolId);
  }

  const byDonor = new Map();
  for (const m of members) {
    if (!byDonor.has(Number(m.donor_id))) {
      byDonor.set(Number(m.donor_id), []);
    }
    byDonor.get(Number(m.donor_id)).push(m);
  }

  await db.withTransaction(async (tx) => {
    for (const [donorIdStr, entries] of byDonor) {
      const donorId = Number(donorIdStr);
      const chosenPoolId = choices[donorId];
      const effectivePoolId =
        chosenPoolId && visiblePoolIds.includes(chosenPoolId)
          ? chosenPoolId
          : Number(entries[0].pool_id);

      const override = expectedOverrides[String(effectivePoolId)];
      const expected =
        override && override[String(donorId)] !== undefined
          ? override[String(donorId)]
          : entries[0].expected_amount;

      await tx.execute(
        `INSERT INTO campaign_donor_targets
           (campaign_id, donor_id, pool_id, expected_amount, added_by_id)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           pool_id = CASE WHEN ? = 1 OR pool_id IS NULL THEN ? ELSE pool_id END,
           expected_amount = IF(? IS NULL, expected_amount, ?)`,
        [
          campaignId,
          donorId,
          effectivePoolId,
          expected,
          user.id,
          chosenPoolId ? 1 : 0,
          effectivePoolId,
          expected,
          expected,
        ]
      );
    }
  });

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.pools.imported', 'campaign', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(campaignId)]
  );

  return getCampaignDonorTargets(organizationId, campaignId, user);
}

/** Donor board for a campaign with expected pledges, paid totals and status. */
async function getCampaignDonorTargets(organizationId, campaignId, user) {
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(
    `SELECT id, name FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const rows = await db.query(
    `SELECT cdt.id, cdt.donor_id, cdt.expected_amount, cdt.pool_id, cdt.created_at,
       d.first_name, d.last_name, d.email, d.phone, d.gender, d.position, d.is_anomalous,
       p.name AS pool_name, p.category AS pool_category,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd
         WHERE dd.donor_id = cdt.donor_id AND dd.campaign_id = cdt.campaign_id
           AND dd.status = 'CONFIRMED') AS paid_amount,
       (SELECT COUNT(*) FROM donations dd
         WHERE dd.donor_id = cdt.donor_id AND dd.campaign_id = cdt.campaign_id
           AND dd.status = 'CONFIRMED') AS donation_count
     FROM campaign_donor_targets cdt
     JOIN donors d ON d.id = cdt.donor_id
     LEFT JOIN donor_pools p ON p.id = cdt.pool_id
     WHERE cdt.campaign_id = ?
     ORDER BY d.first_name, d.last_name`,
    [campaignId]
  );

  const targets = rows.map((r) => {
    const expected =
      r.expected_amount === null || r.expected_amount === undefined
        ? null
        : Number(r.expected_amount);
    const paid = num(r.paid_amount);
    return {
      id: r.id,
      campaignId: Number(campaignId),
      expectedAmount: expected,
      paidAmount: paid,
      donationCount: num(r.donation_count),
      status: computeStatus(expected, paid),
      pool: r.pool_id
        ? { id: r.pool_id, name: r.pool_name, category: r.pool_category }
        : null,
      donor: {
        id: r.donor_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        gender: r.gender,
        position: r.position,
        isAnomalous: Boolean(r.is_anomalous),
      },
      addedAt: r.created_at,
    };
  });

  const summary = {
    totalTargets: targets.length,
    expectedTotal: targets.reduce((s, t) => s + (t.expectedAmount || 0), 0),
    paidTotal: targets.reduce((s, t) => s + t.paidAmount, 0),
    unpaid: targets.filter((t) => t.status === "UNPAID").length,
    partial: targets.filter((t) => t.status === "PARTIAL").length,
    paidFull: targets.filter((t) => t.status === "PAID_FULL").length,
  };

  const byPool = {};
  for (const t of targets) {
    const key = t.pool ? String(t.pool.id) : "__direct";
    if (!byPool[key]) {
      byPool[key] = {
        pool: t.pool,
        count: 0,
        expectedTotal: 0,
        paidTotal: 0,
      };
    }
    byPool[key].count += 1;
    byPool[key].expectedTotal += t.expectedAmount || 0;
    byPool[key].paidTotal += t.paidAmount;
  }

  return {
    campaign: { id: Number(campaignId), name: campaigns[0].name },
    targets,
    summary,
    poolTotals: Object.values(byPool),
  };
}

async function setDonorTargetExpected(organizationId, campaignId, donorId, expectedAmount, user) {
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const existing = await db.query(
    `SELECT cdt.id FROM campaign_donor_targets cdt
     JOIN campaigns c ON c.id = cdt.campaign_id
     WHERE cdt.campaign_id = ? AND cdt.donor_id = ?${orgSql}`,
    [campaignId, donorId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Donor is not tracked on this campaign");

  await db.execute(
    `UPDATE campaign_donor_targets SET expected_amount = ? WHERE campaign_id = ? AND donor_id = ?`,
    [expectedAmount, campaignId, donorId]
  );

  return getCampaignDonorTargets(organizationId, campaignId, user);
}

async function removeDonorTarget(organizationId, campaignId, donorId, user) {
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  await db.execute(
    `DELETE cdt FROM campaign_donor_targets cdt
     JOIN campaigns c ON c.id = cdt.campaign_id
     WHERE cdt.campaign_id = ? AND cdt.donor_id = ?${orgSql}`,
    [campaignId, donorId, ...orgParams]
  );
  return getCampaignDonorTargets(organizationId, campaignId, user);
}

async function setCampaignManagers(organizationId, campaignId, userIds, user) {
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const existing = await db.query(
    `SELECT id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

  // Validate that all provided users belong to this organization
  let validIds = [];
  if (userIds.length > 0) {
    const valid = await db.query(
      `SELECT id FROM users WHERE id IN (?)${orgSql}`,
      [userIds, ...orgParams]
    );
    validIds = valid.map((u) => u.id);
    if (validIds.length !== userIds.length) {
      throw ApiError.badRequest(
        "One or more selected users are not part of this organization"
      );
    }
  }

  await db.withTransaction(async (tx) => {
    await tx.execute("DELETE FROM campaign_assignments WHERE campaign_id = ?", [campaignId]);
    for (const userId of validIds) {
      await tx.execute(
        "INSERT INTO campaign_assignments (campaign_id, user_id) VALUES (?, ?)",
        [campaignId, userId]
      );
    }
  });

  return getCampaign(organizationId, campaignId, user);
}

const MAX_FEATURED_CAMPAIGNS = 3;

/**
 * Pins/unpins a campaign on the public marketing homepage. Only public,
 * active campaigns can be featured, and at most MAX_FEATURED_CAMPAIGNS are
 * allowed platform-wide (the homepage is one shared page across all orgs).
 */
async function setFeatured(organizationId, campaignId, featured, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, status, is_public, is_featured FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

  if (featured) {
    if (campaign.status !== "ACTIVE" || !campaign.is_public) {
      throw ApiError.badRequest(
        "Only public, active campaigns can be featured on the homepage",
        "CAMPAIGN_NOT_FEATURABLE"
      );
    }
    if (!campaign.is_featured) {
      const [{ total }] = await db.query(
        "SELECT COUNT(*) AS total FROM campaigns WHERE is_featured = 1"
      );
      if (Number(total) >= MAX_FEATURED_CAMPAIGNS) {
        throw ApiError.badRequest(
          `Maximum of ${MAX_FEATURED_CAMPAIGNS} featured campaigns already selected. Un-feature one first.`,
          "FEATURED_LIMIT_REACHED"
        );
      }
    }
  }

  await db.execute(
    "UPDATE campaigns SET is_featured = ?, featured_at = ? WHERE id = ?",
    [featured ? 1 : 0, featured ? new Date() : null, campaignId]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, ?, 'campaign', ?, 'INFO')`,
    [
      organizationId,
      actor.id,
      actor.email,
      featured ? "campaign.featured" : "campaign.unfeatured",
      String(campaignId),
    ]
  );

  return getCampaign(organizationId, campaignId, actor);
}

// ─── Completion reports (mandatory proof of fund usage) ──────────────────────
//
// Once a campaign is COMPLETED, the assigned manager MUST submit a narrative +
// at least one photo proving how the funds were used. An ORG_ADMIN/SUPER_ADMIN
// must approve it before it (a) unblocks the manager from creating a new
// campaign and (b) appears on the public blog (see listPublicCompletedCampaigns
// / getPublicCompletedCampaign further below).

/** { [campaignId]: { status, submittedAt, reviewedAt } } for the given ids —
 *  the lightweight summary embedded on campaign list/detail responses. */
async function loadCompletionReportSummaries(campaignIds) {
  if (!campaignIds || campaignIds.length === 0) return {};
  const rows = await db.query(
    `SELECT campaign_id, status, submitted_at, reviewed_at
     FROM campaign_completion_reports WHERE campaign_id IN (?)`,
    [campaignIds]
  );
  const byId = {};
  for (const r of rows) {
    byId[r.campaign_id] = {
      status: r.status,
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at,
    };
  }
  return byId;
}

/** Full completion report (narrative + images) for a campaign, or null. */
async function getCompletionReport(organizationId, campaignId, user) {
  await assertCampaignAccess(organizationId, user, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const rows = await db.query(
    `SELECT r.*, u.first_name AS submitted_by_first_name, u.last_name AS submitted_by_last_name,
            rv.first_name AS reviewed_by_first_name, rv.last_name AS reviewed_by_last_name
     FROM campaign_completion_reports r
     LEFT JOIN users u ON u.id = r.submitted_by_id
     LEFT JOIN users rv ON rv.id = r.reviewed_by_id
     WHERE r.campaign_id = ?`,
    [campaignId]
  );
  const report = rows[0];
  if (!report) return null;

  const images = await db.query(
    `SELECT id, image_path FROM campaign_completion_report_images
     WHERE report_id = ? ORDER BY sort_order ASC, id ASC`,
    [report.id]
  );

  return {
    id: report.id,
    campaignId: Number(campaignId),
    summary: report.summary,
    amountUtilized: report.amount_utilized === null ? null : num(report.amount_utilized),
    status: report.status,
    submittedBy: report.submitted_by_id
      ? { id: report.submitted_by_id, firstName: report.submitted_by_first_name, lastName: report.submitted_by_last_name }
      : null,
    submittedAt: report.submitted_at,
    reviewedBy: report.reviewed_by_id
      ? { id: report.reviewed_by_id, firstName: report.reviewed_by_first_name, lastName: report.reviewed_by_last_name }
      : null,
    reviewedAt: report.reviewed_at,
    reviewNotes: report.review_notes,
    images: images.map((img) => ({ id: img.id, url: toAbsoluteImageUrl(img.image_path) })),
  };
}

/** CAMPAIGN_MANAGER submits (or resubmits after rejection) the completion
 *  proof for one of their COMPLETED campaigns. `files` are the multer-saved
 *  image files (req.files) — at least one is required. */
async function submitCompletionReport(organizationId, campaignId, actor, data, files) {
  await assertCampaignAccess(organizationId, actor, campaignId);

  if (!files || files.length === 0) {
    throw ApiError.badRequest("At least one photo is required as proof", "PROOF_IMAGES_REQUIRED");
  }

  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(`SELECT id, status FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "COMPLETED") {
    throw ApiError.badRequest(
      "Only completed campaigns can have a completion report",
      "CAMPAIGN_NOT_COMPLETED"
    );
  }

  const existing = await db.query(
    "SELECT id, status FROM campaign_completion_reports WHERE campaign_id = ?",
    [campaignId]
  );
  if (existing[0] && existing[0].status === "APPROVED") {
    throw ApiError.conflict(
      "This campaign's completion report is already approved and locked",
      "REPORT_ALREADY_APPROVED"
    );
  }

  const webPaths = files.map(
    (f) => `/uploads/completion-reports/${campaignId}/${f.filename}`
  );

  let oldImagePaths = [];
  await db.withTransaction(async (tx) => {
    let reportId;
    if (existing[0]) {
      reportId = existing[0].id;
      const oldImages = await tx.query(
        "SELECT image_path FROM campaign_completion_report_images WHERE report_id = ?",
        [reportId]
      );
      oldImagePaths = oldImages.map((r) => r.image_path);
      await tx.execute(
        `UPDATE campaign_completion_reports
         SET summary = ?, amount_utilized = ?, status = 'PENDING_REVIEW',
             submitted_by_id = ?, reviewed_by_id = NULL, reviewed_at = NULL, review_notes = NULL,
             submitted_at = NOW()
         WHERE id = ?`,
        [data.summary, data.amountUtilized ?? null, actor.id, reportId]
      );
      await tx.execute("DELETE FROM campaign_completion_report_images WHERE report_id = ?", [
        reportId,
      ]);
    } else {
      const result = await tx.execute(
        `INSERT INTO campaign_completion_reports
           (campaign_id, organization_id, submitted_by_id, summary, amount_utilized, status)
         VALUES (?, ?, ?, ?, ?, 'PENDING_REVIEW')`,
        [campaignId, organizationId, actor.id, data.summary, data.amountUtilized ?? null]
      );
      reportId = result.insertId;
    }

    for (let i = 0; i < webPaths.length; i++) {
      await tx.execute(
        `INSERT INTO campaign_completion_report_images (report_id, image_path, sort_order)
         VALUES (?, ?, ?)`,
        [reportId, webPaths[i], i]
      );
    }
  });

  // Remove the superseded images from disk now that the DB commit succeeded.
  for (const oldPath of oldImagePaths) {
    deleteUploadedFiles([{ path: uploadWebPathToDiskPath(oldPath) }]);
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.completion_report.submitted', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
    type: "campaign",
    title: "Completion report to review",
    body: "A campaign manager submitted proof of how the funds were used.",
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return getCompletionReport(organizationId, campaignId, actor);
}

/**
 * A REVIEWER/ORG_ADMIN/SUPER_ADMIN decides a pending completion report.
 *   data.action: 'approve' | 'request_changes' | 'reject' (last two need a note).
 * 'request_changes' and 'reject' both set REJECTED (the manager resubmits) —
 * the difference is the wording of the feedback and notification.
 */
async function reviewCompletionReport(organizationId, campaignId, actor, data) {
  const action = data.action || (data.approved ? "approve" : "reject");
  const notes = (data.notes || "").trim();
  if ((action === "reject" || action === "request_changes") && notes.length < 10) {
    throw ApiError.badRequest("A reason of at least 10 characters is required", "REASON_REQUIRED");
  }

  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(
    `SELECT id, name, organization_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");
  organizationId = campaigns[0].organization_id ?? organizationId;

  const existing = await db.query(
    "SELECT id, status FROM campaign_completion_reports WHERE campaign_id = ?",
    [campaignId]
  );
  if (!existing[0]) throw ApiError.notFound("No completion report has been submitted yet");
  if (existing[0].status !== "PENDING_REVIEW") {
    throw ApiError.badRequest("Only a pending report can be reviewed", "REPORT_NOT_PENDING");
  }

  const status = action === "approve" ? "APPROVED" : "REJECTED";
  await db.execute(
    `UPDATE campaign_completion_reports
     SET status = ?, reviewed_by_id = ?, reviewed_at = NOW(), review_notes = ?
     WHERE id = ?`,
    [status, actor.id, notes || null, existing[0].id]
  );

  const auditAction =
    action === "approve"
      ? "campaign.completion_report.approved"
      : action === "request_changes"
        ? "campaign.completion_report.changes_requested"
        : "campaign.completion_report.rejected";
  await writeAudit(
    organizationId,
    actor,
    auditAction,
    campaignId,
    action === "reject" ? "WARNING" : "INFO",
    notes ? { notes } : undefined
  );

  const notifyTitle =
    action === "approve"
      ? "Completion report approved"
      : action === "request_changes"
        ? "Changes requested on your completion report"
        : "Completion report rejected";
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: notifyTitle,
    body: notes || `"${campaigns[0].name}"`,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return getCompletionReport(organizationId, campaignId, actor);
}

// ─── Campaign images (cover + gallery) ────────────────────────────────────────

/** { [campaignId]: [{id,url}] } gallery-only (is_cover=0) images for the
 *  given campaigns — embedded on list/detail responses. */
async function loadCampaignImages(campaignIds) {
  if (!campaignIds || campaignIds.length === 0) return {};
  const rows = await db.query(
    `SELECT id, campaign_id, image_path FROM campaign_images
     WHERE campaign_id IN (?) AND is_cover = 0
     ORDER BY sort_order ASC, id ASC`,
    [campaignIds]
  );
  const byId = {};
  for (const r of rows) {
    if (!byId[r.campaign_id]) byId[r.campaign_id] = [];
    byId[r.campaign_id].push({ id: r.id, url: toAbsoluteImageUrl(r.image_path) });
  }
  return byId;
}

/** Sets/replaces the cover image (mirrored onto campaigns.image_url so every
 *  existing consumer of that single column keeps working) and appends
 *  gallery photos. `files` is multer's `{ cover: File[], gallery: File[] }`
 *  shape (req.files from .fields()). */
async function uploadCampaignImages(organizationId, campaignId, actor, files) {
  await assertCampaignAccess(organizationId, actor, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, organization_id, image_url, status, created_by_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  assertOrgAdminMayEdit(campaign, actor);

  const coverFile = (files && files.cover && files.cover[0]) || null;
  const galleryFiles = (files && files.gallery) || [];
  if (!coverFile && galleryFiles.length === 0) {
    throw ApiError.badRequest("No images were uploaded", "NO_IMAGES");
  }

  if (coverFile) {
    const coverPath = `/uploads/campaigns/${campaignId}/${coverFile.filename}`;
    if (LIVE_STATUSES.includes(campaign.status)) {
      // A live campaign's cover change is parked for re-approval — the file
      // stays on disk but is NOT wired to image_url until the change request
      // clears both stages.
      await upsertChangeRequest(campaign, actor, {}, coverPath);
      await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
        type: "campaign",
        title: "Campaign cover change awaiting review",
        body: "A new cover image needs a reviewer's approval before it shows publicly.",
        link: campaignLink(campaignId),
        resource: "campaign",
        resourceId: campaignId,
        organizationId,
      });
    } else {
      const oldImageUrl = campaign.image_url;
      await db.execute("UPDATE campaigns SET image_url = ? WHERE id = ?", [coverPath, campaignId]);
      // Best-effort: remove the previous cover file from disk once the new one
      // is confirmed set, but only if it was one of ours (an /uploads/ path —
      // never delete an externally-hosted imageUrl some campaigns still have).
      if (oldImageUrl && oldImageUrl.startsWith("/uploads/campaigns/")) {
        deleteUploadedFiles([{ path: uploadWebPathToDiskPath(oldImageUrl) }]);
      }
    }
  }

  if (galleryFiles.length > 0) {
    const [{ maxOrder }] = await db.query(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM campaign_images WHERE campaign_id = ? AND is_cover = 0",
      [campaignId]
    );
    let order = Number(maxOrder) + 1;
    for (const file of galleryFiles) {
      await db.execute(
        `INSERT INTO campaign_images (campaign_id, image_path, is_cover, sort_order)
         VALUES (?, ?, 0, ?)`,
        [campaignId, `/uploads/campaigns/${campaignId}/${file.filename}`, order]
      );
      order++;
    }
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.images.uploaded', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  return getCampaign(organizationId, campaignId, actor);
}

/** Removes one gallery photo (never the cover — replace it via
 *  uploadCampaignImages instead). */
async function removeCampaignImage(organizationId, campaignId, imageId, actor) {
  await assertCampaignAccess(organizationId, actor, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(`SELECT id, created_by_id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");
  assertOrgAdminMayEdit(campaigns[0], actor);

  const rows = await db.query(
    "SELECT image_path FROM campaign_images WHERE id = ? AND campaign_id = ? AND is_cover = 0",
    [imageId, campaignId]
  );
  if (rows.length === 0) throw ApiError.notFound("Image not found");

  await db.execute("DELETE FROM campaign_images WHERE id = ?", [imageId]);
  deleteUploadedFiles([{ path: uploadWebPathToDiskPath(rows[0].image_path) }]);

  return getCampaign(organizationId, campaignId, actor);
}

// ─── Closure requests (manager asks permission to complete a campaign) ────────

/** { [campaignId]: { id, status, reason, decisionNotes, requestedAt } } —
 *  the most recent closure request per campaign, embedded on list/detail. */
async function loadLatestClosureRequests(campaignIds) {
  if (!campaignIds || campaignIds.length === 0) return {};
  const rows = await db.query(
    `SELECT r1.* FROM campaign_closure_requests r1
     INNER JOIN (
       SELECT campaign_id, MAX(id) AS max_id FROM campaign_closure_requests
       WHERE campaign_id IN (?) GROUP BY campaign_id
     ) latest ON latest.campaign_id = r1.campaign_id AND latest.max_id = r1.id`,
    [campaignIds]
  );
  const byId = {};
  for (const r of rows) {
    byId[r.campaign_id] = {
      id: r.id,
      status: r.status,
      reason: r.reason,
      decisionNotes: r.decision_notes,
      requestedAt: r.created_at,
    };
  }
  return byId;
}

function mapClosureRequest(r) {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    reason: r.reason,
    status: r.status,
    decisionNotes: r.decision_notes,
    requestedAt: r.created_at,
    decidedAt: r.decided_at,
  };
}

/** CAMPAIGN_MANAGER asks permission to close (complete) their campaign. */
async function requestClosure(organizationId, campaignId, actor, data) {
  await assertCampaignAccess(organizationId, actor, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(`SELECT id, status FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "ACTIVE" && campaign.status !== "PAUSED") {
    throw ApiError.badRequest(
      "Only an active or paused campaign can request closure",
      "CAMPAIGN_NOT_CLOSABLE"
    );
  }

  const pending = await db.query(
    "SELECT id FROM campaign_closure_requests WHERE campaign_id = ? AND status = 'PENDING'",
    [campaignId]
  );
  if (pending.length > 0) {
    throw ApiError.conflict(
      "A closure request for this campaign is already pending review",
      "CLOSURE_REQUEST_PENDING"
    );
  }

  await db.execute(
    `INSERT INTO campaign_closure_requests (campaign_id, organization_id, requested_by_id, reason)
     VALUES (?, ?, ?, ?)`,
    [campaignId, organizationId, actor.id, data.reason]
  );
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.closure_request.submitted', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  await notifySafe(notificationService.orgReviewersAndAdmins(organizationId), {
    type: "campaign",
    title: "Closure request to review",
    body: "A campaign manager asked to close a campaign.",
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return listClosureRequests(organizationId, campaignId, actor);
}

async function listClosureRequests(organizationId, campaignId, user) {
  await assertCampaignAccess(organizationId, user, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const rows = await db.query(
    "SELECT * FROM campaign_closure_requests WHERE campaign_id = ? ORDER BY created_at DESC, id DESC",
    [campaignId]
  );
  return rows.map(mapClosureRequest);
}

/**
 * A REVIEWER/ORG_ADMIN/SUPER_ADMIN decides a pending closure request.
 *   data.action: 'approve' | 'request_changes' | 'reject' (last two need a note).
 *   - approve         → request APPROVED, campaign -> COMPLETED.
 *   - request_changes → request REJECTED with a note (manager files a new one).
 *   - reject          → request REJECTED with a reason.
 */
async function decideClosureRequest(organizationId, campaignId, requestId, actor, data) {
  const action = data.action || (data.approved ? "approve" : "reject");
  const notes = (data.notes || "").trim();
  if ((action === "reject" || action === "request_changes") && notes.length < 10) {
    throw ApiError.badRequest("A reason of at least 10 characters is required", "REASON_REQUIRED");
  }

  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(
    `SELECT id, name, organization_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");
  organizationId = campaigns[0].organization_id ?? organizationId;

  const requests = await db.query(
    "SELECT id, status FROM campaign_closure_requests WHERE id = ? AND campaign_id = ?",
    [requestId, campaignId]
  );
  const request = requests[0];
  if (!request) throw ApiError.notFound("Closure request not found");
  if (request.status !== "PENDING") {
    throw ApiError.badRequest("Only a pending request can be decided", "CLOSURE_REQUEST_NOT_PENDING");
  }

  const status = action === "approve" ? "APPROVED" : "REJECTED";
  await db.execute(
    `UPDATE campaign_closure_requests
     SET status = ?, decided_by_id = ?, decided_at = NOW(), decision_notes = ?
     WHERE id = ?`,
    [status, actor.id, notes || null, requestId]
  );

  if (action === "approve") {
    await changeCampaignStatus(organizationId, campaignId, "COMPLETED", actor);
  }

  const auditAction =
    action === "approve"
      ? "campaign.closure_request.approved"
      : action === "request_changes"
        ? "campaign.closure_request.changes_requested"
        : "campaign.closure_request.rejected";
  await writeAudit(
    organizationId,
    actor,
    auditAction,
    campaignId,
    action === "reject" ? "WARNING" : "INFO",
    notes ? { notes } : undefined
  );

  const notifyTitle =
    action === "approve"
      ? "Closure request approved"
      : action === "request_changes"
        ? "Changes requested on your closure request"
        : "Closure request rejected";
  await notifySafe(notificationService.campaignManagerAudience(campaignId), {
    type: "campaign",
    title: notifyTitle,
    body: notes || `"${campaigns[0].name}"`,
    link: campaignLink(campaignId),
    resource: "campaign",
    resourceId: campaignId,
    organizationId,
  });

  return listClosureRequests(organizationId, campaignId, actor);
}

// ─── In-kind gifts + campaign payment breakdown ──────────────────────────────

function mapGift(r) {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    donorId: r.donor_id,
    donorName: r.donor_id
      ? [r.donor_first_name, r.donor_last_name].filter(Boolean).join(" ") || null
      : null,
    description: r.description,
    estimatedValue: num(r.estimated_value),
    receivedAt: r.received_at,
    createdAt: r.created_at,
  };
}

async function listCampaignGifts(organizationId, campaignId, user) {
  await assertCampaignAccess(organizationId, user, campaignId);
  const rows = await db.query(
    `SELECT g.*, d.first_name AS donor_first_name, d.last_name AS donor_last_name
     FROM campaign_gifts g
     LEFT JOIN donors d ON d.id = g.donor_id
     WHERE g.campaign_id = ?
     ORDER BY g.created_at DESC, g.id DESC`,
    [campaignId]
  );
  return rows.map(mapGift);
}

async function addCampaignGift(organizationId, campaignId, actor, data) {
  await assertCampaignAccess(organizationId, actor, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(
    `SELECT id, organization_id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

  if (data.donorId) {
    const donor = await db.query(
      "SELECT id FROM donors WHERE id = ? AND organization_id = ?",
      [data.donorId, campaign.organization_id]
    );
    if (donor.length === 0) throw ApiError.badRequest("Donor not found", "DONOR_NOT_FOUND");
  }

  const result = await db.execute(
    `INSERT INTO campaign_gifts
       (campaign_id, organization_id, donor_id, description, estimated_value, received_at, recorded_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      campaignId,
      campaign.organization_id,
      data.donorId || null,
      data.description,
      data.estimatedValue ?? 0,
      data.receivedAt || null,
      actor.id,
    ]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, details, severity)
     VALUES (?, ?, ?, 'campaign.gift.recorded', 'campaign', ?, ?, 'INFO')`,
    [
      campaign.organization_id,
      actor.id,
      actor.email,
      String(campaignId),
      JSON.stringify({ giftId: result.insertId, estimatedValue: num(data.estimatedValue) }),
    ]
  );

  return listCampaignGifts(organizationId, campaignId, actor);
}

async function removeCampaignGift(organizationId, campaignId, giftId, actor) {
  await assertCampaignAccess(organizationId, actor, campaignId);
  const rows = await db.query(
    "SELECT id FROM campaign_gifts WHERE id = ? AND campaign_id = ?",
    [giftId, campaignId]
  );
  if (rows.length === 0) throw ApiError.notFound("Gift not found");

  await db.execute("DELETE FROM campaign_gifts WHERE id = ?", [giftId]);
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.gift.removed', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  return listCampaignGifts(organizationId, campaignId, actor);
}

/**
 * Per-campaign payment breakdown for the caller's campaigns, sized in TZS:
 *   paid           — confirmed money not tied to a pledge
 *   unpaid         — remaining campaign goal not covered by a pledge
 *   promisedPaid   — money received against a donor pledge
 *   promisedUnpaid — pledged but not yet received
 *   giftValue      — estimated value of in-kind contributions
 * Each pie therefore sums to (goal + giftValue). Two grouped queries — no N+1.
 */
async function getPaymentsBreakdown(organizationId, user) {
  const where = [];
  const values = [];
  if (user && !isPlatformRole(user)) {
    where.push("c.organization_id = ?");
    values.push(organizationId);
  }
  if (user && user.role === "CAMPAIGN_MANAGER") {
    where.push("c.id IN (SELECT campaign_id FROM campaign_assignments WHERE user_id = ?)");
    values.push(user.id);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const campaigns = await db.query(
    `SELECT c.id, c.name, c.goal_amount, c.raised_amount
     FROM campaigns c ${whereSql}
     ORDER BY c.created_at DESC`,
    values
  );
  if (campaigns.length === 0) return [];

  const ids = campaigns.map((c) => c.id);

  const pledgeRows = await db.query(
    `SELECT cdt.campaign_id,
            SUM(COALESCE(cdt.expected_amount, 0)) AS promised_total,
            SUM(LEAST(
              COALESCE(cdt.expected_amount, 0),
              (SELECT COALESCE(SUM(dd.amount), 0) FROM donations dd
                WHERE dd.donor_id = cdt.donor_id AND dd.campaign_id = cdt.campaign_id
                  AND dd.status = 'CONFIRMED')
            )) AS promised_paid
     FROM campaign_donor_targets cdt
     WHERE cdt.campaign_id IN (?) AND cdt.expected_amount IS NOT NULL
     GROUP BY cdt.campaign_id`,
    [ids]
  );
  const giftRows = await db.query(
    `SELECT campaign_id, SUM(estimated_value) AS gift_value
     FROM campaign_gifts WHERE campaign_id IN (?) GROUP BY campaign_id`,
    [ids]
  );

  const pledgeById = {};
  for (const r of pledgeRows) pledgeById[r.campaign_id] = r;
  const giftById = {};
  for (const r of giftRows) giftById[r.campaign_id] = r;

  return campaigns.map((c) => {
    const goal = num(c.goal_amount);
    const raised = num(c.raised_amount);
    const promisedTotal = num(pledgeById[c.id] && pledgeById[c.id].promised_total);
    const promisedPaid = Math.min(
      promisedTotal,
      num(pledgeById[c.id] && pledgeById[c.id].promised_paid)
    );
    const promisedUnpaid = Math.max(0, promisedTotal - promisedPaid);
    const paid = Math.max(0, raised - promisedPaid);
    const unpaid = Math.max(0, goal - raised - promisedUnpaid);
    const giftValue = num(giftById[c.id] && giftById[c.id].gift_value);
    return {
      campaignId: c.id,
      name: c.name,
      goal,
      raised,
      paid,
      unpaid,
      promisedPaid,
      promisedUnpaid,
      giftValue,
    };
  });
}

// ─── Public (unauthenticated) campaign browsing ──────────────────────────────

const PUBLIC_SELECT = `
  SELECT c.id, c.name, c.slug, c.story, c.name_sw, c.story_sw, c.category_sw,
         c.scope, c.acceptance, c.scope_sw, c.acceptance_sw, c.image_url,
         c.category, c.goal_amount, c.service_fee_percent, c.service_fee_amount, c.public_target,
         c.minimum_amount, c.start_date, c.end_date, c.status, c.raised_amount, c.donor_count,
         c.is_featured, c.created_at, o.name AS organization_name
  FROM campaigns c
  JOIN organizations o ON o.id = c.organization_id
`;

/** Up to 3 homepage-featured campaigns, or up to `limit` (max 5) public,
 *  active campaigns that are NOT featured — used by the /campaigns listing.
 *  `locale` ("en" | "sw") picks the translated fields where available. */
async function listPublicCampaigns({ featured, limit, locale } = {}) {
  if (featured) {
    const rows = await db.query(
      `${PUBLIC_SELECT} WHERE c.is_public = 1 AND c.status = 'ACTIVE' AND c.is_featured = 1
       ORDER BY c.featured_at DESC LIMIT ${MAX_FEATURED_CAMPAIGNS}`
    );
    return rows.map((r) => mapPublicCampaign(r, locale));
  }

  const capped = Math.min(Math.max(Number(limit) || 5, 1), 5);
  const rows = await db.query(
    `${PUBLIC_SELECT} WHERE c.is_public = 1 AND c.status = 'ACTIVE' AND c.is_featured = 0
     ORDER BY c.created_at DESC LIMIT ${capped}`
  );
  return rows.map((r) => mapPublicCampaign(r, locale));
}

/** A single public campaign by slug or numeric id, with recent supporters. */
async function getPublicCampaign(idOrSlug, locale) {
  const isNumeric = /^\d+$/.test(String(idOrSlug));
  const rows = await db.query(
    `${PUBLIC_SELECT}
     WHERE c.is_public = 1 AND c.status IN ('ACTIVE','COMPLETED')
       AND (c.slug = ? ${isNumeric ? "OR c.id = ?" : ""}) LIMIT 1`,
    isNumeric ? [idOrSlug, idOrSlug] : [idOrSlug]
  );
  const campaign = rows[0];
  if (!campaign) return null;

  const donations = await db.query(
    `SELECT amount, donor_name, is_anonymous, created_at
     FROM donations WHERE campaign_id = ? AND status = 'CONFIRMED'
     ORDER BY created_at DESC LIMIT 10`,
    [campaign.id]
  );

  // Supporting photos the organizer uploaded (cover stays on image_url).
  const imagesByCampaign = await loadCampaignImages([campaign.id]);

  // Approved proof of how the funds were used — only surfaces once the campaign
  // is COMPLETED and an admin/reviewer has approved the completion report.
  let completionProof = null;
  if (campaign.status === "COMPLETED") {
    const reportRows = await db.query(
      `SELECT id, summary, amount_utilized FROM campaign_completion_reports
       WHERE campaign_id = ? AND status = 'APPROVED' LIMIT 1`,
      [campaign.id]
    );
    const report = reportRows[0];
    if (report) {
      const proofByReport = await loadReportImages([report.id]);
      completionProof = {
        summary: report.summary,
        amountUtilized: report.amount_utilized == null ? null : num(report.amount_utilized),
        images: proofByReport[report.id] || [],
      };
    }
  }

  return {
    ...mapPublicCampaign(campaign, locale),
    images: imagesByCampaign[campaign.id] || [],
    completionProof,
    recentDonations: donations.map((d) => ({
      amount: num(d.amount),
      donorName: d.is_anonymous ? null : d.donor_name,
      createdAt: d.created_at,
    })),
  };
}

// ─── Public — completed-campaign blog posts ───────────────────────────────────
//
// A campaign only shows up here once it's COMPLETED *and* its completion
// report has been APPROVED — this is what actually "posts" the campaign's
// story to the public blog.

const COMPLETED_SELECT = `
  SELECT c.id, c.name, c.slug, c.name_sw, c.story, c.story_sw, c.image_url, c.category,
         c.category_sw, c.goal_amount, c.public_target, c.raised_amount, c.donor_count,
         c.start_date, c.end_date, o.name AS organization_name,
         r.id AS report_id, r.summary, r.amount_utilized, r.reviewed_at
  FROM campaigns c
  JOIN organizations o ON o.id = c.organization_id
  JOIN campaign_completion_reports r ON r.campaign_id = c.id AND r.status = 'APPROVED'
  WHERE c.status = 'COMPLETED'
`;

async function loadReportImages(reportIds) {
  if (reportIds.length === 0) return {};
  const rows = await db.query(
    `SELECT report_id, image_path FROM campaign_completion_report_images
     WHERE report_id IN (?) ORDER BY sort_order ASC, id ASC`,
    [reportIds]
  );
  const byReport = {};
  for (const r of rows) {
    if (!byReport[r.report_id]) byReport[r.report_id] = [];
    byReport[r.report_id].push(toAbsoluteImageUrl(r.image_path));
  }
  return byReport;
}

function mapCompletedCampaignCard(c, locale, images) {
  const sw = locale === "sw";
  const summary = c.summary || "";
  return {
    id: c.id,
    slug: c.slug,
    title: (sw && c.name_sw) || c.name,
    excerpt: summary.length > 220 ? `${summary.slice(0, 220)}…` : summary,
    image: images[0] || toAbsoluteImageUrl(c.image_url) || null,
    organizationName: c.organization_name,
    goalAmount: num(c.goal_amount),
    raisedAmount: num(c.raised_amount),
    donorCount: c.donor_count,
    publishedAt: c.reviewed_at,
  };
}

/** Completed-campaign "blog posts" — a campaign whose completion report has
 *  been approved. Powers the public blog listing. */
async function listPublicCompletedCampaigns({ locale = "en", page = 1, limit = 12 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await db.query(
    `${COMPLETED_SELECT} ORDER BY r.reviewed_at DESC LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );
  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total FROM campaigns c
     JOIN campaign_completion_reports r ON r.campaign_id = c.id AND r.status = 'APPROVED'
     WHERE c.status = 'COMPLETED'`
  );

  const imagesByReport = await loadReportImages(rows.map((r) => r.report_id));
  return {
    campaigns: rows.map((r) => mapCompletedCampaignCard(r, locale, imagesByReport[r.report_id] || [])),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / safeLimit),
    },
  };
}

/** Full detail for one completed-campaign blog post, by slug or numeric id. */
async function getPublicCompletedCampaign(idOrSlug, locale = "en") {
  const isNumeric = /^\d+$/.test(String(idOrSlug));
  const rows = await db.query(
    `${COMPLETED_SELECT} AND (c.slug = ? ${isNumeric ? "OR c.id = ?" : ""}) LIMIT 1`,
    isNumeric ? [idOrSlug, idOrSlug] : [idOrSlug]
  );
  const c = rows[0];
  if (!c) return null;

  const imagesByReport = await loadReportImages([c.report_id]);
  const sw = locale === "sw";
  const raised = num(c.raised_amount);
  const target = num(c.public_target);

  return {
    id: c.id,
    slug: c.slug,
    title: (sw && c.name_sw) || c.name,
    campaignStory: (sw && c.story_sw) || c.story,
    category: (sw && c.category_sw) || c.category,
    image: toAbsoluteImageUrl(c.image_url),
    organizationName: c.organization_name,
    goalAmount: num(c.goal_amount),
    raisedAmount: raised,
    progressPercent: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
    donorCount: c.donor_count,
    startDate: c.start_date,
    endDate: c.end_date,
    completionSummary: c.summary,
    amountUtilized: c.amount_utilized === null ? null : num(c.amount_utilized),
    proofImages: imagesByReport[c.report_id] || [],
    publishedAt: c.reviewed_at,
  };
}

async function removeCampaign(organizationId, campaignId, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT id, status FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

  if (existing[0].status === "ACTIVE" || existing[0].status === "COMPLETED") {
    throw ApiError.badRequest("Cannot delete an active or completed campaign. Pause or cancel it first.", "CAMPAIGN_ACTIVE");
  }

  await db.withTransaction(async (tx) => {
    await tx.execute("DELETE FROM campaign_assignments WHERE campaign_id = ?", [campaignId]);
    await tx.execute("DELETE FROM campaign_donor_targets WHERE campaign_id = ?", [campaignId]);
    await tx.execute("DELETE FROM donations WHERE campaign_id = ?", [campaignId]);
    await tx.execute("DELETE FROM campaigns WHERE id = ?", [campaignId]);
  });

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.deleted', 'campaign', ?, 'WARNING')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  return { deleted: true };
}

// ─── Campaign Link Email Notifications ───────────────────────────────────────

/**
 * Sends campaign donation link emails to all targeted donors after
 * a campaign is approved. Runs asynchronously — errors are logged
 * but don't block the approval response.
 */
async function sendCampaignLinkEmails(organizationId, campaignId) {
  // Fetch campaign details
  const campaigns = await db.query(
    `SELECT id, name, slug, story, goal_amount, organization_id
     FROM campaigns WHERE id = ? AND organization_id = ?`,
    [campaignId, organizationId]
  );
  const campaign = campaigns[0];
  if (!campaign) return;

  // Fetch organization name
  const orgs = await db.query(
    "SELECT name FROM organizations WHERE id = ?",
    [organizationId]
  );
  const orgName = orgs[0]?.name || "Changia";

  // Fetch all targeted donors with emails
  const donors = await db.query(
    `SELECT cdt.id AS target_id, cdt.expected_amount,
       d.id AS donor_id, d.first_name, d.last_name, d.email, d.phone
     FROM campaign_donor_targets cdt
     JOIN donors d ON d.id = cdt.donor_id
     WHERE cdt.campaign_id = ? AND d.email IS NOT NULL AND d.email != ''`,
    [campaignId]
  );

  if (donors.length === 0) {
    console.log(`[campaign-approval] No donors with emails for campaign ${campaignId}`);
    return;
  }

  const campaignUrl = `${env.APP_BASE_URL}/campaigns/${campaign.slug || campaign.id}`;
  const subject = `Support: ${campaign.name} — Your contribution matters!`;

  let sent = 0;
  let failed = 0;

  for (const donor of donors) {
    try {
      const donorName = [donor.first_name, donor.last_name].filter(Boolean).join(" ") || "Donor";
      const html = buildCampaignLinkEmail({
        campaignName: campaign.name,
        campaignStory: campaign.story || "",
        campaignUrl,
        goalAmount: campaign.goal_amount,
        organizationName: orgName,
      });

      await sendEmail({
        to: donor.email,
        subject,
        html,
      });

      sent++;
    } catch (err) {
      console.error(`[campaign-approval] Failed to email donor ${donor.donor_id} (${donor.email}):`, err.message);
      failed++;
    }
  }

  console.log(`[campaign-approval] Campaign ${campaignId}: sent ${sent}/${donors.length} emails (${failed} failed)`);

  // Log the batch email send in audit
  await db.execute(
    `INSERT INTO audit_logs (organization_id, action, resource, resource_id, details, severity)
     VALUES (?, 'campaign.emails_sent', 'campaign', ?, ?, 'INFO')`,
    [
      organizationId,
      String(campaignId),
      JSON.stringify({ sent, failed, total: donors.length, campaignUrl }),
    ]
  ).catch(() => {}); // Don't fail if audit log insert fails
}

// ─── Campaign history / review timeline ─────────────────────────────────────
//
// Every step a campaign goes through is already written to audit_logs
// (resource='campaign'). This surfaces the full chronological trail to anyone
// who can see the campaign — its manager, the reviewer, the org admin — so when
// a campaign bounces reviewer → admin → back to the manager → back to the
// reviewer, each person sees who did what, why (the reason note), and which
// fields the last edit touched.

const CAMPAIGN_HISTORY_LABELS = {
  "campaign.created": "Campaign created",
  "campaign.submitted": "Submitted for review",
  "campaign.updated": "Details edited",
  "campaign.resubmitted": "Re-submitted for review",
  "campaign.first_approved": "Passed first review",
  "campaign.approved": "Final approval given — went live",
  "campaign.rejected": "Rejected",
  "campaign.changes_requested": "Sent back for changes",
  "campaign.change_request.submitted": "Edit to a live campaign submitted",
  "campaign.change_request.first_approved": "Edit passed first review",
  "campaign.change_request.approved": "Edit approved & applied",
  "campaign.change_request.changes_requested": "Edit sent back for changes",
  "campaign.change_request.rejected": "Edit rejected",
  "campaign.status_request.submitted": "Suspend / resume requested",
  "campaign.status_changed": "Status changed",
  "campaign.fee_proposal.approved": "Custom service fee approved",
  "campaign.fee_proposal.changes_requested": "Custom service fee sent back",
  "campaign.fee_proposal.rejected": "Custom service fee rejected",
  "campaign.completion_report.submitted": "Completion report submitted",
  "campaign.completion_report.approved": "Completion report approved",
  "campaign.completion_report.changes_requested": "Completion report sent back",
  "campaign.completion_report.rejected": "Completion report rejected",
  "campaign.closure_request.submitted": "Closure requested",
  "campaign.closure_request.approved": "Closure approved — campaign completed",
  "campaign.closure_request.rejected": "Closure request rejected",
  "campaign.pools.imported": "Donor pool imported",
  "campaign.images.uploaded": "Photos updated",
  "campaign.translated": "Swahili translation updated",
  "campaign.featured": "Featured on the homepage",
  "campaign.unfeatured": "Removed from the homepage",
  "campaign.emails_sent": "Donor link emails sent",
  "campaign.deleted": "Campaign deleted",
};

async function getCampaignHistory(organizationId, campaignId, user) {
  await assertCampaignAccess(organizationId, user, campaignId);
  const [orgSql, ...orgParams] = orgScope(organizationId, user);
  const found = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (found.length === 0) throw ApiError.notFound("Campaign not found");

  const rows = await db.query(
    `SELECT al.id, al.action, al.details, al.severity, al.created_at,
            al.actor_email, u.id AS actor_id, u.first_name, u.last_name, u.role AS actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
      WHERE al.resource = 'campaign' AND al.resource_id = ?
      ORDER BY al.created_at ASC, al.id ASC`,
    [String(campaignId)]
  );

  return rows.map((r) => {
    const details = parsePayload(r.details);
    // Different flows stored the human reason under different keys.
    const note = [details.notes, details.reason].find(
      (v) => typeof v === "string" && v.trim()
    );
    return {
      id: r.id,
      action: r.action,
      label:
        CAMPAIGN_HISTORY_LABELS[r.action] ||
        r.action.replace(/^campaign\./, "").replace(/[._]/g, " "),
      severity: r.severity,
      notes: note || null,
      fields: Array.isArray(details.fields) ? details.fields : null,
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
  listCampaigns,
  getCampaign,
  getCampaignHistory,
  createCampaign,
  updateCampaign,
  submitCampaign,
  approveCampaign,
  rejectCampaign,
  requestCampaignChanges,
  reviewFeeProposal,
  listChangeRequests,
  requestCampaignStatusChange,
  decideChangeRequest,
  changeCampaignStatus,
  setCampaignManagers,
  previewPoolImport,
  importPools,
  getCampaignDonorTargets,
  setDonorTargetExpected,
  removeDonorTarget,
  assertCampaignAccess,
  computeFees,
  removeCampaign,
  setFeatured,
  setTranslations,
  getCompletionReport,
  submitCompletionReport,
  reviewCompletionReport,
  uploadCampaignImages,
  removeCampaignImage,
  requestClosure,
  listClosureRequests,
  decideClosureRequest,
  listCampaignGifts,
  addCampaignGift,
  removeCampaignGift,
  getPaymentsBreakdown,
  listPublicCampaigns,
  getPublicCampaign,
  listPublicCompletedCampaigns,
  getPublicCompletedCampaign,
};
