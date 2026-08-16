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
    approvedBy: c.approved_by,
    approvedAt: c.approved_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

async function listCampaigns(organizationId, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];

  if (filters.status) {
    where.push("status = ?");
    values.push(filters.status);
  }
  if (filters.search) {
    where.push("(name LIKE ? OR slug LIKE ?)");
    const like = `%${filters.search}%`;
    values.push(like, like);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const campaigns = await db.query(
    `SELECT id, name, slug, story, image_url, category, goal_amount, service_fee_percent,
            service_fee_amount, public_target, minimum_amount, start_date, end_date, status,
            is_public, contact_phone, raised_amount, donor_count, approved_by, approved_at,
            created_at, updated_at
     FROM campaigns WHERE ${whereSql}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM campaigns WHERE ${whereSql}`, values)
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

async function getCampaign(organizationId, campaignId) {
  const campaigns = await db.query(
    `SELECT id, name, slug, story, image_url, category, goal_amount, service_fee_percent,
            service_fee_amount, public_target, minimum_amount, start_date, end_date, status,
            is_public, contact_phone, raised_amount, donor_count, approved_by, approved_at,
            created_at, updated_at
     FROM campaigns WHERE id = ? AND organization_id = ?`,
    [campaignId, organizationId]
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
       (organization_id, name, slug, story, image_url, category, goal_amount,
        service_fee_percent, service_fee_amount, public_target, minimum_amount,
        start_date, end_date, contact_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
    [
      organizationId,
      data.name,
      slug,
      data.story || null,
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
  const existing = await db.query(
    "SELECT * FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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

async function submitCampaign(organizationId, campaignId, actor) {
  const existing = await db.query(
    "SELECT status FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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
  const existing = await db.query(
    "SELECT status FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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
  const existing = await db.query(
    "SELECT status FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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
  const pools = await db.query(
    `SELECT id, name, is_system, created_by_id
     FROM donor_pools WHERE id IN (?) AND organization_id = ?`,
    [poolIds, organizationId]
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
  const members = await db.query(
    `SELECT dpm.pool_id, dpm.expected_amount, d.id AS donor_id,
            d.first_name, d.last_name, d.email, d.phone, d.gender, d.position, d.is_anomalous
     FROM donor_pool_members dpm
     JOIN donors d ON d.id = dpm.donor_id
     WHERE dpm.pool_id IN (?) AND d.organization_id = ?`,
    [poolIds, organizationId]
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
  const campaigns = await db.query(
    "SELECT id, name FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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
  const campaigns = await db.query(
    "SELECT id FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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
  const campaigns = await db.query(
    "SELECT id, name FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
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
  const existing = await db.query(
    `SELECT cdt.id FROM campaign_donor_targets cdt
     JOIN campaigns c ON c.id = cdt.campaign_id
     WHERE cdt.campaign_id = ? AND cdt.donor_id = ? AND c.organization_id = ?`,
    [campaignId, donorId, organizationId]
  );
  if (existing.length === 0) throw ApiError.notFound("Donor is not tracked on this campaign");

  await db.execute(
    `UPDATE campaign_donor_targets SET expected_amount = ? WHERE campaign_id = ? AND donor_id = ?`,
    [expectedAmount, campaignId, donorId]
  );

  return getCampaignDonorTargets(organizationId, campaignId);
}

async function removeDonorTarget(organizationId, campaignId, donorId) {
  await db.execute(
    `DELETE cdt FROM campaign_donor_targets cdt
     JOIN campaigns c ON c.id = cdt.campaign_id
     WHERE cdt.campaign_id = ? AND cdt.donor_id = ? AND c.organization_id = ?`,
    [campaignId, donorId, organizationId]
  );
  return getCampaignDonorTargets(organizationId, campaignId);
}

async function setCampaignManagers(organizationId, campaignId, userIds) {
  const existing = await db.query(
    "SELECT id FROM campaigns WHERE id = ? AND organization_id = ?",
    [campaignId, organizationId]
  );
  if (existing.length === 0) throw ApiError.notFound("Campaign not found");

  // Validate that all provided users belong to this organization
  let validIds = [];
  if (userIds.length > 0) {
    const valid = await db.query(
      `SELECT id FROM users WHERE id IN (?) AND organization_id = ?`,
      [userIds, organizationId]
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
  computeFees,
};
