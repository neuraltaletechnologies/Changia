const db = require("../../db");
const { env } = require("../../config");
const { ApiError } = require("../../utils/ApiError");
const { translateFields } = require("../../utils/translate");
const { deleteUploadedFiles } = require("../../middlewares/upload");

/** "/uploads/…" web path → absolute URL the browser can load (mirrors
 *  toAbsoluteImageUrl in modules/campaign/service.js). */
function toAbsoluteImageUrl(webPath) {
  if (!webPath) return null;
  if (webPath.startsWith("/uploads/")) return `${env.API_PUBLIC_URL}${webPath}`;
  return webPath;
}

/**
 * "What Campaign Owners Say" testimonial cards shown on the public /campaigns
 * page. Platform-managed content — only SUPER_ADMIN writes them (dashboard
 * Settings › Testimonials). English is the source of truth; quote_sw / role_sw
 * are machine-translated on save and the /sw/campaigns page falls back to the
 * English text whenever they're blank.
 */

function mapTestimonial(row) {
  return {
    id: row.id,
    quote: row.quote,
    author: row.author,
    role: row.role,
    quoteSw: row.quote_sw ?? null,
    roleSw: row.role_sw ?? null,
    photoUrl: toAbsoluteImageUrl(row.photo_url),
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Admin view — every card, in display order. */
async function listAll() {
  const rows = await db.query(
    `SELECT * FROM campaign_testimonials ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapTestimonial);
}

/** Public view — active cards only, resolved to the requested locale. */
async function listPublic(locale = "en") {
  const sw = locale === "sw";
  const rows = await db.query(
    `SELECT * FROM campaign_testimonials WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    quote: (sw && r.quote_sw) || r.quote,
    author: r.author,
    role: (sw && r.role_sw) || r.role,
    photoUrl: toAbsoluteImageUrl(r.photo_url),
  }));
}

/** Best-effort: translate quote/role to Swahili and store them. Never throws. */
async function syncSwahili(id, { quote, role }) {
  try {
    const translated = await translateFields({ quote, role });
    const fields = [];
    const values = [];
    if (translated.quote !== undefined) {
      fields.push("quote_sw = ?");
      values.push(translated.quote);
    }
    if (translated.role !== undefined) {
      fields.push("role_sw = ?");
      values.push(translated.role);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(
      `UPDATE campaign_testimonials SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  } catch (err) {
    console.warn(`[testimonial-translate] #${id}: ${err.message}`);
  }
}

async function getRow(id) {
  const rows = await db.query(`SELECT * FROM campaign_testimonials WHERE id = ?`, [id]);
  if (rows.length === 0) throw ApiError.notFound("Testimonial not found");
  return rows[0];
}

async function create(actor, data) {
  const nextOrder = await db.query(
    `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM campaign_testimonials`
  );
  const result = await db.execute(
    `INSERT INTO campaign_testimonials (quote, author, role, photo_url, is_active, sort_order, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.quote,
      data.author,
      data.role,
      data.photoUrl || null,
      data.isActive === undefined ? 1 : data.isActive ? 1 : 0,
      nextOrder[0].next,
      actor.id,
    ]
  );
  const id = result.insertId;
  await syncSwahili(id, { quote: data.quote, role: data.role });
  await audit(actor, "testimonial.created", id);
  return mapTestimonial(await getRow(id));
}

async function update(actor, id, data) {
  const existing = await getRow(id);

  const aliases = {
    quote: "quote",
    author: "author",
    role: "role",
    isActive: "is_active",
  };
  const fields = [];
  const values = [];
  for (const [input, column] of Object.entries(aliases)) {
    if (data[input] === undefined) continue;
    fields.push(`${column} = ?`);
    values.push(input === "isActive" ? (data[input] ? 1 : 0) : data[input]);
  }
  if (fields.length > 0) {
    values.push(id);
    await db.execute(
      `UPDATE campaign_testimonials SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  // Re-translate only the text fields that actually changed.
  const changed = {};
  if (data.quote !== undefined && data.quote !== existing.quote) changed.quote = data.quote;
  if (data.role !== undefined && data.role !== existing.role) changed.role = data.role;
  if (Object.keys(changed).length > 0) await syncSwahili(id, changed);

  await audit(actor, "testimonial.updated", id);
  return mapTestimonial(await getRow(id));
}

async function remove(actor, id) {
  const existing = await getRow(id);
  await db.execute(`DELETE FROM campaign_testimonials WHERE id = ?`, [id]);
  if (existing.photo_url) deleteUploadedFiles([{ path: existing.photo_url }]);
  await audit(actor, "testimonial.deleted", id);
}

/** Persist a new display order. `ids` is the full ordered list of card ids. */
async function reorder(actor, ids) {
  const rows = await db.query(`SELECT id FROM campaign_testimonials`);
  const known = new Set(rows.map((r) => Number(r.id)));
  const ordered = ids.map(Number).filter((id) => known.has(id));
  if (ordered.length !== known.size) {
    throw ApiError.badRequest("The reorder list must contain every testimonial exactly once");
  }
  await db.withTransaction(async (tx) => {
    for (let i = 0; i < ordered.length; i++) {
      await tx.execute(`UPDATE campaign_testimonials SET sort_order = ? WHERE id = ?`, [i, ordered[i]]);
    }
  });
  await audit(actor, "testimonial.reordered", null);
  return listAll();
}

async function setPhoto(actor, id, file) {
  const existing = await getRow(id);
  if (!file) throw ApiError.badRequest("No photo uploaded", "NO_FILE");
  // Build the stored web path from the basename — mirrors campaign cover
  // uploads. multer's diskStorage sets file.path to an absolute disk path,
  // while the R2 engine sets file.filename identically, so this works for both.
  const webPath = `/uploads/testimonials/${id}/${file.filename}`;
  await db.execute(`UPDATE campaign_testimonials SET photo_url = ? WHERE id = ?`, [webPath, id]);
  if (existing.photo_url && existing.photo_url !== webPath) {
    deleteUploadedFiles([{ path: existing.photo_url }]);
  }
  await audit(actor, "testimonial.photo_updated", id);
  return mapTestimonial(await getRow(id));
}

function audit(actor, action, id) {
  return db
    .execute(
      `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
       VALUES (NULL, ?, ?, ?, 'testimonial', ?, 'INFO')`,
      [actor.id, actor.email, action, id === null ? null : String(id)]
    )
    .catch(() => {});
}

module.exports = { listAll, listPublic, create, update, remove, reorder, setPhoto };
