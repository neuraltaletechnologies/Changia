const path = require("path");
const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { env } = require("../../config");
const { deleteUploadedFiles } = require("../../middlewares/upload");

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
 * Returns [sqlFragment, ...params] for org-scoping queries.
 * SUPER_ADMIN and ORG_ADMIN see all orgs; CAMPAIGN_MANAGER is scoped.
 */
function orgScope(organizationId, user) {
  if (user && (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN")) return ["", []];
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
    imageUrl: toAbsoluteImageUrl(c.image_url),
    category: c.category,
    goalAmount: num(c.goal_amount),
    serviceFeePercent: num(c.service_fee_percent),
    serviceFeeAmount: num(c.service_fee_amount),
    publicTarget: num(c.public_target),
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
    approvedBy: c.approved_by,
    approvedAt: c.approved_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
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
  if (!user || user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN") return;
  const rows = await db.query(
    `SELECT c.id FROM campaigns c JOIN campaign_assignments ca ON ca.campaign_id = c.id
     WHERE c.id = ? AND c.organization_id = ? AND ca.user_id = ?`,
    [campaignId, organizationId, user.id]
  );
  if (rows.length === 0) throw ApiError.notFound("Campaign not found");
}

async function listCampaigns(organizationId, filters, user) {
  const where = [];
  const values = [];

  if (user && user.role !== "SUPER_ADMIN" && user.role !== "ORG_ADMIN") {
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
    `SELECT id, name, slug, story, name_sw, story_sw, category_sw, image_url, category, goal_amount,
            service_fee_percent, service_fee_amount, public_target, minimum_amount, start_date, end_date,
            status, is_public, contact_phone, raised_amount, donor_count, is_featured, featured_at,
            approved_by, approved_at, created_at, updated_at
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
  const [reportByCampaign, imagesByCampaign, closureByCampaign] = await Promise.all([
    loadCompletionReportSummaries(completedIds),
    loadCampaignImages(allIds),
    loadLatestClosureRequests(allIds),
  ]);

  return {
    campaigns: campaigns.map((c) => ({
      ...mapCampaign(c),
      assignments: byCampaign[c.id] || [],
      completionReport: reportByCampaign[c.id] || null,
      images: imagesByCampaign[c.id] || [],
      latestClosureRequest: closureByCampaign[c.id] || null,
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
    `SELECT id, name, slug, story, name_sw, story_sw, category_sw, image_url, category, goal_amount,
            service_fee_percent, service_fee_amount, public_target, minimum_amount, start_date, end_date,
            status, is_public, contact_phone, raised_amount, donor_count, is_featured, featured_at,
            approved_by, approved_at, created_at, updated_at
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
  const [reportByCampaign, imagesByCampaign, closureByCampaign] = await Promise.all([
    campaign.status === "COMPLETED" ? loadCompletionReportSummaries([campaign.id]) : {},
    loadCampaignImages([campaign.id]),
    loadLatestClosureRequests([campaign.id]),
  ]);

  return {
    ...mapCampaign(campaign),
    assignments: assignments.map((a) => ({
      user: { id: a.id, firstName: a.first_name, lastName: a.last_name, email: a.email },
    })),
    completionReport: reportByCampaign[campaign.id] || null,
    images: imagesByCampaign[campaign.id] || [],
    latestClosureRequest: closureByCampaign[campaign.id] || null,
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

  // SUPER_ADMIN has no organization_id (platform-wide) — their campaigns
  // belong to the dedicated "Changia Platform" organization.
  const resolvedOrgId =
    organizationId || (actor.role === "SUPER_ADMIN" ? await getOrCreatePlatformOrganizationId() : organizationId);
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
  const { serviceFeePercent, serviceFeeAmount, publicTarget } = computeFees(
    data.goalAmount,
    data.serviceFeePercent
  );
  const slug = await uniqueSlug(data.name);

  // ORG_ADMIN is already an approver, so their own campaign activates
  // immediately (self-approved). A CAMPAIGN_MANAGER's campaign must wait for
  // an ORG_ADMIN/SUPER_ADMIN to approve it — it goes straight to PENDING
  // (skipping DRAFT, since creating already IS "submitting for review") and
  // stays unlisted (is_public = 0) until POST /campaigns/:id/approve.
  const selfApproved = actor.role !== "CAMPAIGN_MANAGER";
  const result = await db.execute(
    `INSERT INTO campaigns
       (organization_id, name, slug, story, name_sw, story_sw, category_sw, image_url, category,
        goal_amount, service_fee_percent, service_fee_amount, public_target, minimum_amount,
        start_date, end_date, contact_phone, status, is_public, approved_by, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resolvedOrgId,
      data.name,
      slug,
      data.story || null,
      data.nameSw || null,
      data.storySw || null,
      data.categorySw || null,
      data.imageUrl || null,
      data.category || null,
      data.goalAmount,
      serviceFeePercent,
      serviceFeeAmount,
      publicTarget,
      data.minimumAmount ?? 1000,
      data.startDate ? new Date(data.startDate) : null,
      data.endDate ? new Date(data.endDate) : null,
      data.contactPhone || null,
      selfApproved ? "ACTIVE" : "PENDING",
      selfApproved ? 1 : 0,
      selfApproved ? actor.id : null,
      selfApproved ? new Date() : null,
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

  return getCampaign(resolvedOrgId, campaignId, actor);
}

async function updateCampaign(organizationId, campaignId, data, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT * FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

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

  let feeData = null;
  if (data.goalAmount !== undefined && data.goalAmount !== num(campaign.goal_amount)) {
    feeData = computeFees(data.goalAmount, data.serviceFeePercent);
  } else if (data.serviceFeePercent !== undefined) {
    feeData = computeFees(num(campaign.goal_amount), data.serviceFeePercent);
  }

  const fields = [];
  const values = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.story !== undefined) { fields.push("story = ?"); values.push(data.story); }
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

  if (fields.length > 0) {
    values.push(campaignId);
    await db.execute(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.updated', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

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
    `SELECT id FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

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
    `SELECT status FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  if (existing[0].status !== "DRAFT") {
    throw ApiError.badRequest("Only draft campaigns can be submitted for approval");
  }

  await db.execute("UPDATE campaigns SET status = 'PENDING' WHERE id = ?", [campaignId]);
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.submitted', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );
  return getCampaign(organizationId, campaignId, actor);
}

async function approveCampaign(organizationId, campaignId, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT status FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");
  if (existing[0].status !== "PENDING") {
    throw ApiError.badRequest("Only pending campaigns can be approved");
  }

  await db.execute(
    `UPDATE campaigns SET status = 'ACTIVE', is_public = 1, approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [actor.id, campaignId]
  );
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.approved', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );
  return getCampaign(organizationId, campaignId, actor);
}

async function changeCampaignStatus(organizationId, campaignId, status, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT status FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

  // A COMPLETED campaign stays public (it's the platform's track record —
  // and where the completion-report proof surfaces); only PAUSED/CANCELLED
  // pull the campaign off the public site.
  const isPublic = status === "COMPLETED" ? 1 : 0;
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

  return getCompletionReport(organizationId, campaignId, actor);
}

/** ORG_ADMIN/SUPER_ADMIN approves or rejects a pending completion report. */
async function reviewCompletionReport(organizationId, campaignId, actor, data) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const existing = await db.query(
    "SELECT id, status FROM campaign_completion_reports WHERE campaign_id = ?",
    [campaignId]
  );
  if (!existing[0]) throw ApiError.notFound("No completion report has been submitted yet");
  if (existing[0].status !== "PENDING_REVIEW") {
    throw ApiError.badRequest("Only a pending report can be reviewed", "REPORT_NOT_PENDING");
  }

  const status = data.approved ? "APPROVED" : "REJECTED";
  await db.execute(
    `UPDATE campaign_completion_reports
     SET status = ?, reviewed_by_id = ?, reviewed_at = NOW(), review_notes = ?
     WHERE id = ?`,
    [status, actor.id, data.notes || null, existing[0].id]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, ?, 'campaign', ?, 'INFO')`,
    [
      organizationId,
      actor.id,
      actor.email,
      data.approved ? "campaign.completion_report.approved" : "campaign.completion_report.rejected",
      String(campaignId),
    ]
  );

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
  const existing = await db.query(`SELECT id, image_url FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

  const coverFile = (files && files.cover && files.cover[0]) || null;
  const galleryFiles = (files && files.gallery) || [];
  if (!coverFile && galleryFiles.length === 0) {
    throw ApiError.badRequest("No images were uploaded", "NO_IMAGES");
  }

  if (coverFile) {
    const coverPath = `/uploads/campaigns/${campaignId}/${coverFile.filename}`;
    const oldImageUrl = campaign.image_url;
    await db.execute("UPDATE campaigns SET image_url = ? WHERE id = ?", [coverPath, campaignId]);
    // Best-effort: remove the previous cover file from disk once the new one
    // is confirmed set, but only if it was one of ours (an /uploads/ path —
    // never delete an externally-hosted imageUrl some campaigns still have).
    if (oldImageUrl && oldImageUrl.startsWith("/uploads/campaigns/")) {
      deleteUploadedFiles([{ path: uploadWebPathToDiskPath(oldImageUrl) }]);
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
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

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

/** ORG_ADMIN/SUPER_ADMIN approves (→ campaign COMPLETED) or rejects (with a
 *  decision note shown back to the manager, who may request again). */
async function decideClosureRequest(organizationId, campaignId, requestId, actor, data) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE id = ?${orgSql}`, [
    campaignId,
    ...orgParams,
  ]);
  if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");

  const requests = await db.query(
    "SELECT id, status FROM campaign_closure_requests WHERE id = ? AND campaign_id = ?",
    [requestId, campaignId]
  );
  const request = requests[0];
  if (!request) throw ApiError.notFound("Closure request not found");
  if (request.status !== "PENDING") {
    throw ApiError.badRequest("Only a pending request can be decided", "CLOSURE_REQUEST_NOT_PENDING");
  }

  const status = data.approved ? "APPROVED" : "REJECTED";
  await db.execute(
    `UPDATE campaign_closure_requests
     SET status = ?, decided_by_id = ?, decided_at = NOW(), decision_notes = ?
     WHERE id = ?`,
    [status, actor.id, data.notes || null, requestId]
  );

  if (data.approved) {
    await changeCampaignStatus(organizationId, campaignId, "COMPLETED", actor);
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, ?, 'campaign', ?, 'INFO')`,
    [
      organizationId,
      actor.id,
      actor.email,
      data.approved ? "campaign.closure_request.approved" : "campaign.closure_request.rejected",
      String(campaignId),
    ]
  );

  return listClosureRequests(organizationId, campaignId, actor);
}

// ─── Public (unauthenticated) campaign browsing ──────────────────────────────

const PUBLIC_SELECT = `
  SELECT c.id, c.name, c.slug, c.story, c.name_sw, c.story_sw, c.category_sw, c.image_url,
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

  return {
    ...mapPublicCampaign(campaign, locale),
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
    image: c.image_url,
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

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  submitCampaign,
  approveCampaign,
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
  listPublicCampaigns,
  getPublicCampaign,
  listPublicCompletedCampaigns,
  getPublicCompletedCampaign,
};
