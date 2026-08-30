const db = require("../../db");

/**
 * In-app staff notifications.
 *
 * `notify()` and the recipient resolvers below are called (fire-and-forget)
 * from the campaign approval-chain flows in modules/campaign/service.js. The
 * list/read functions back the dashboard header bell + /dashboard/notifications.
 */

function mapNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    resource: n.resource,
    resourceId: n.resource_id,
    read: n.read_at !== null,
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}

/**
 * Inserts one notification row per recipient. Silently no-ops on an empty
 * recipient list. Never throws into the caller — callers use it fire-and-forget.
 *
 * @param {Array<number|string>} userIds
 * @param {{type?: string, title: string, body?: string, link?: string,
 *          resource?: string, resourceId?: string|number, organizationId?: number|null}} payload
 */
async function notify(userIds, payload) {
  const ids = [...new Set((userIds || []).map(Number).filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) return;

  const {
    type = "system",
    title,
    body = null,
    link = null,
    resource = null,
    resourceId = null,
    organizationId = null,
  } = payload;

  const rows = ids.map((userId) => [
    userId,
    organizationId,
    type,
    title,
    body,
    link,
    resource,
    resourceId === null || resourceId === undefined ? null : String(resourceId),
  ]);

  await db.query(
    `INSERT INTO notifications
       (user_id, organization_id, type, title, body, link, resource, resource_id)
     VALUES ?`,
    [rows]
  );
}

/**
 * The campaign approval pool for an org: every ACTIVE platform REVIEWER
 * (reviewers vet all orgs, so they are not filtered by organization_id) plus
 * the org's own ACTIVE ORG_ADMINs.
 */
async function orgReviewersAndAdmins(organizationId) {
  const rows = await db.query(
    `SELECT id FROM users
     WHERE status = 'ACTIVE'
       AND (role = 'REVIEWER' OR (role = 'ORG_ADMIN' AND organization_id = ?))`,
    [organizationId ?? null]
  );
  return rows.map((r) => r.id);
}

/** ACTIVE ORG_ADMIN users in an org (the stage-2 approvers). */
async function orgAdmins(organizationId) {
  if (!organizationId) return [];
  const rows = await db.query(
    `SELECT id FROM users
     WHERE organization_id = ? AND status = 'ACTIVE' AND role = 'ORG_ADMIN'`,
    [organizationId]
  );
  return rows.map((r) => r.id);
}

/** Every ACTIVE platform REVIEWER (not org-scoped — they vet every org). */
async function platformReviewers() {
  const rows = await db.query(
    `SELECT id FROM users WHERE status = 'ACTIVE' AND role = 'REVIEWER'`
  );
  return rows.map((r) => r.id);
}

/** Every ACTIVE platform SUPER_ADMIN. */
async function superAdmins() {
  const rows = await db.query(
    `SELECT id FROM users WHERE status = 'ACTIVE' AND role = 'SUPER_ADMIN'`
  );
  return rows.map((r) => r.id);
}

/** A campaign's assigned managers + its creator, deduped. */
async function campaignManagerAudience(campaignId) {
  const rows = await db.query(
    `SELECT ca.user_id AS id FROM campaign_assignments ca WHERE ca.campaign_id = ?
     UNION
     SELECT c.created_by_id AS id FROM campaigns c WHERE c.id = ? AND c.created_by_id IS NOT NULL`,
    [campaignId, campaignId]
  );
  return rows.map((r) => r.id).filter(Boolean);
}

async function listNotifications(userId, filters = {}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const where = ["user_id = ?"];
  const values = [userId];
  if (filters.unreadOnly) where.push("read_at IS NULL");
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [notifications, [countRow], [unreadRow]] = await Promise.all([
    db.query(
      `SELECT * FROM notifications ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM notifications ${whereSql}`, values),
    db.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL",
      [userId]
    ),
  ]);

  return {
    notifications: notifications.map(mapNotification),
    unreadCount: Number(unreadRow.unread),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function unreadCount(userId) {
  const [row] = await db.query(
    "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId]
  );
  return { unreadCount: Number(row.unread) };
}

async function markRead(userId, id) {
  await db.execute(
    "UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL",
    [id, userId]
  );
  return unreadCount(userId);
}

async function markAllRead(userId) {
  await db.execute(
    "UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL",
    [userId]
  );
  return { unreadCount: 0 };
}

module.exports = {
  notify,
  orgReviewersAndAdmins,
  orgAdmins,
  platformReviewers,
  superAdmins,
  campaignManagerAudience,
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
};
