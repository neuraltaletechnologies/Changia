const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const db = require("../../db");
const { sendTabular, sendTemplate, parseTabularBuffer } = require("../../utils/tabular");
const { REGISTRY } = require("./datasets");

function getDataset(name) {
  const entry = REGISTRY[name];
  if (!entry) throw ApiError.notFound(`Unknown dataset "${name}"`, "UNKNOWN_DATASET");
  return entry;
}

function assertRole(roles, user, what) {
  if (!roles.includes(user.role)) {
    throw ApiError.forbidden(`Your role can't ${what} this data`, "DATASET_FORBIDDEN");
  }
}

const exportDataset = asyncHandler(async (req, res) => {
  const entry = getDataset(req.params.dataset);
  if (!entry.export) throw ApiError.badRequest("This dataset can't be exported", "NO_EXPORT");
  assertRole(entry.export.roles, req.user, "export");

  const format = req.query.format === "xlsx" ? "xlsx" : "csv";
  const rows = await entry.export.fetch(req);

  await sendTabular(res, {
    format,
    filename: entry.filename,
    sheetName: entry.sheetName,
    columns: entry.export.columns,
    rows,
  });
});

const downloadTemplate = asyncHandler(async (req, res) => {
  const entry = getDataset(req.params.dataset);
  if (!entry.import) throw ApiError.badRequest("This dataset can't be imported", "NO_IMPORT");
  assertRole(entry.import.roles, req.user, "import");

  const format = req.query.format === "xlsx" ? "xlsx" : "csv";
  await sendTemplate(res, {
    format,
    filename: entry.filename,
    fields: entry.import.templateFields,
  });
});

const importDataset = asyncHandler(async (req, res) => {
  const entry = getDataset(req.params.dataset);
  const spec = entry.import;
  if (!spec) throw ApiError.badRequest("This dataset can't be imported", "NO_IMPORT");
  assertRole(spec.roles, req.user, "import");
  if (!req.file) throw ApiError.badRequest("Attach a .csv or .xlsx file in the 'file' field", "NO_FILE");

  for (const key of spec.requiresQuery || []) {
    if (!req.query[key]) throw ApiError.badRequest(`"${key}" query parameter is required`, "MISSING_PARAM");
  }

  const { headers, rows } = await parseTabularBuffer(req.file.buffer, req.file.originalname);
  if (rows.length === 0) {
    throw ApiError.badRequest("The file has a header row but no data rows", "EMPTY_FILE");
  }

  const required = spec.templateFields.filter((f) => f.required).map((f) => f.field);
  const missing = required.filter((f) => !headers.includes(f));
  if (missing.length) {
    throw ApiError.badRequest(
      `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
      "MISSING_COLUMNS"
    );
  }

  let imported = 0;
  let duplicates = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // 1-based + header row
    const parsed = spec.schema.safeParse(spec.toInput(rows[i]));
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.issues.map((x) => x.message).join("; ") });
      continue;
    }
    try {
      await spec.insert(parsed.data, req);
      imported++;
    } catch (err) {
      if (spec.duplicateCode && err && err.code === spec.duplicateCode) {
        duplicates++;
        continue;
      }
      errors.push({ row: rowNumber, message: err && err.message ? err.message : "Failed to import row" });
    }
  }

  const result = { imported, duplicates, skipped: rows.length - imported, errors };

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, details, severity)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 'INFO')`,
    [
      req.user.organizationId,
      req.user.id,
      req.user.email,
      `data.imported.${req.params.dataset}`,
      req.params.dataset,
      JSON.stringify({ imported, duplicates, errorCount: errors.length }),
    ]
  );

  res.status(200).json({ success: true, data: result });
});

module.exports = { exportDataset, downloadTemplate, importDataset };
