const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { env } = require("../../config");

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
 * SUPER_ADMIN (org_id = NULL) sees all orgs; others are scoped.
 */
function orgScope(organizationId, user) {
  if (user && user.role === "SUPER_ADMIN") return ["", []];
  if (!organizationId && organizationId !== 0) return ["", []];
  return [" AND organization_id = ?", [organizationId]];
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
    imageUrl: c.image_url,
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
    imageUrl: c.image_url,
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

  if (user && user.role !== "SUPER_ADMIN") {
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

  return {
    campaigns: campaigns.map((c) => ({
      ...mapCampaign(c),
      assignments: byCampaign[c.id] || [],
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

  return {
    ...mapCampaign(campaign),
    assignments: assignments.map((a) => ({
      user: { id: a.id, firstName: a.first_name, lastName: a.last_name, email: a.email },
    })),
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
  const { serviceFeePercent, serviceFeeAmount, publicTarget } = computeFees(
    data.goalAmount,
    data.serviceFeePercent
  );
  const slug = await uniqueSlug(data.name);

  const result = await db.execute(
    `INSERT INTO campaigns
       (organization_id, name, slug, story, name_sw, story_sw, category_sw, image_url, category,
        goal_amount, service_fee_percent, service_fee_amount, public_target, minimum_amount,
        start_date, end_date, contact_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
    [
      organizationId,
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
    await importPools(organizationId, { role: "ORG_ADMIN", id: actor.id, email: actor.email }, campaignId, {
      poolIds: data.poolIds,
      expectedAmounts: data.expectedAmounts,
    });
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'campaign.created', 'campaign', ?, 'INFO')`,
    [organizationId, actor.id, actor.email, String(campaignId)]
  );

  return getCampaign(organizationId, campaignId);
}

async function updateCampaign(organizationId, campaignId, data, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT * FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  const campaign = existing[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

  if (campaign.status !== "DRAFT" && campaign.status !== "PENDING") {
    throw ApiError.badRequest("Only draft or pending campaigns can be edited", "CAMPAIGN_LOCKED");
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

  return getCampaign(organizationId, campaignId);
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

  return getCampaign(organizationId, campaignId);
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
  return getCampaign(organizationId, campaignId);
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
  return getCampaign(organizationId, campaignId);
}

async function changeCampaignStatus(organizationId, campaignId, status, actor) {
  const [orgSql, ...orgParams] = orgScope(organizationId, actor);
  const existing = await db.query(
    `SELECT status FROM campaigns WHERE id = ?${orgSql}`,
    [campaignId, ...orgParams]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

  await db.execute(
    "UPDATE campaigns SET status = ?, is_public = 0 WHERE id = ?",
    [status, campaignId]
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
  return getCampaign(organizationId, campaignId);
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

  return getCampaignDonorTargets(organizationId, campaignId);
}

/** Donor board for a campaign with expected pledges, paid totals and status. */
async function getCampaignDonorTargets(organizationId, campaignId) {
  const [orgSql, ...orgParams] = orgScope(organizationId);
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

async function setDonorTargetExpected(organizationId, campaignId, donorId, expectedAmount) {
  const [orgSql, ...orgParams] = orgScope(organizationId);
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

  return getCampaignDonorTargets(organizationId, campaignId);
}

async function removeDonorTarget(organizationId, campaignId, donorId) {
  const [orgSql, ...orgParams] = orgScope(organizationId);
  await db.execute(
    `DELETE cdt FROM campaign_donor_targets cdt
     JOIN campaigns c ON c.id = cdt.campaign_id
     WHERE cdt.campaign_id = ? AND cdt.donor_id = ?${orgSql}`,
    [campaignId, donorId, ...orgParams]
  );
  return getCampaignDonorTargets(organizationId, campaignId);
}

async function setCampaignManagers(organizationId, campaignId, userIds) {
  const [orgSql, ...orgParams] = orgScope(organizationId);
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

  return getCampaign(organizationId, campaignId);
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

  return getCampaign(organizationId, campaignId);
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
  listPublicCampaigns,
  getPublicCampaign,
};
