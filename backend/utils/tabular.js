const ExcelJS = require("exceljs");

/**
 * Shared CSV / XLSX helpers for the data-transfer module (bulk export + import).
 *
 * A "column spec" is `{ key, header, type }` where `type` is one of
 * `text | number | money | date` and drives Excel cell formatting. `key` is the
 * property read off each row object; `header` is the human column title (and the
 * token an import file is matched against, after normalisation).
 */

// ─── Header normalisation ───────────────────────────────────────────────────
// "First Name" / "first-name" / " FIRST_NAME " → "first_name". Import files are
// matched on this so users don't have to reproduce our exact casing.
function normalizeHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/["']/g, "")
    .replace(/-/g, "_");
}

// ─── CSV ────────────────────────────────────────────────────────────────────
function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function rowsToCsv(columns, rows) {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(formatCell(row[c.key], c.type))).join(",")
  );
  return [header, ...lines].join("\r\n");
}

/**
 * Tolerant RFC-4180 CSV parser (handles quoted fields, embedded commas/newlines
 * and doubled quotes). Ported from the donor-import page's browser parser.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      // Swallow \r\n as one break.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// ─── Cell formatting for output ─────────────────────────────────────────────
function formatCell(value, type) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (type === "money" || type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : "";
  }
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

// ─── XLSX write ─────────────────────────────────────────────────────────────
async function rowsToXlsxBuffer({ sheetName = "Export", columns, rows, instructions }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Changia";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName.slice(0, 31) || "Export", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.min(48, Math.max(12, c.header.length + 4)),
    style:
      c.type === "text"
        ? { numFmt: "@" }
        : c.type === "money"
          ? { numFmt: "#,##0" }
          : c.type === "number"
            ? { numFmt: "0" }
            : {},
  }));

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };

  for (const row of rows) {
    const record = {};
    for (const c of columns) {
      const v = row[c.key];
      if (c.type === "money" || c.type === "number") {
        const n = Number(v);
        record[c.key] = Number.isFinite(n) && v !== null && v !== undefined && v !== "" ? n : null;
      } else {
        record[c.key] = formatCell(v, c.type);
      }
    }
    ws.addRow(record);
  }

  if (instructions && instructions.length) {
    const info = wb.addWorksheet("Instructions");
    info.columns = [
      { header: "Column", key: "column", width: 24 },
      { header: "Required", key: "required", width: 12 },
      { header: "Notes", key: "notes", width: 80 },
    ];
    info.getRow(1).font = { bold: true };
    for (const line of instructions) info.addRow(line);
  }

  return wb.xlsx.writeBuffer();
}

// ─── XLSX read ──────────────────────────────────────────────────────────────
async function parseXlsx(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const grid = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    // row.values is 1-indexed with a leading hole.
    const raw = Array.isArray(row.values) ? row.values.slice(1) : [];
    for (let i = 0; i < raw.length; i++) {
      const cell = raw[i];
      if (cell === null || cell === undefined) {
        values.push("");
      } else if (typeof cell === "object") {
        // Rich text / hyperlink / formula result objects.
        values.push(
          cell.text ??
            cell.result ??
            (cell.richText ? cell.richText.map((t) => t.text).join("") : "")
        );
      } else if (cell instanceof Date) {
        values.push(cell.toISOString());
      } else {
        values.push(String(cell));
      }
    }
    grid.push(values);
  });
  return grid;
}

// ─── Unified import parse ───────────────────────────────────────────────────
/**
 * buffer + original filename → `{ headers, rows }` where `rows` is an array of
 * `{ <normalised header>: <trimmed string> }`. Works for .csv and .xlsx.
 */
async function parseTabularBuffer(buffer, originalName = "") {
  const isXlsx =
    /\.xlsx$/i.test(originalName) ||
    (buffer && buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b); // "PK" zip magic

  const grid = isXlsx ? await parseXlsx(buffer) : parseCsv(buffer.toString("utf8"));
  if (grid.length < 1) return { headers: [], rows: [] };

  const headers = grid[0].map(normalizeHeader);
  const rows = grid.slice(1).map((cells) => {
    const record = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      record[h] = String(cells[idx] ?? "").trim();
    });
    return record;
  });
  return { headers, rows };
}

// ─── HTTP response helpers ──────────────────────────────────────────────────
async function sendTabular(res, { format = "csv", filename, sheetName, columns, rows }) {
  if (format === "xlsx") {
    const buffer = await rowsToXlsxBuffer({ sheetName: sheetName || filename, columns, rows });
    res
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .attachment(`${filename}.xlsx`)
      .send(Buffer.from(buffer));
    return;
  }
  res.type("text/csv").attachment(`${filename}.csv`).send(rowsToCsv(columns, rows));
}

/**
 * Header-only starter file (plus, for xlsx, an "Instructions" sheet). `fields`
 * is `[{ field, required, help, values }]`.
 */
async function sendTemplate(res, { format = "csv", filename, fields }) {
  const columns = fields.map((f) => ({ key: f.field, header: f.field, type: f.type || "text" }));
  if (format === "xlsx") {
    const instructions = fields.map((f) => ({
      column: f.field,
      required: f.required ? "yes" : "no",
      notes: [f.help, f.values ? `Allowed: ${f.values.join(", ")}` : null]
        .filter(Boolean)
        .join(" "),
    }));
    const buffer = await rowsToXlsxBuffer({
      sheetName: "Template",
      columns,
      rows: [],
      instructions,
    });
    res
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .attachment(`${filename}-template.xlsx`)
      .send(Buffer.from(buffer));
    return;
  }
  res
    .type("text/csv")
    .attachment(`${filename}-template.csv`)
    .send(columns.map((c) => csvEscape(c.header)).join(","));
}

module.exports = {
  normalizeHeader,
  rowsToCsv,
  parseCsv,
  rowsToXlsxBuffer,
  parseTabularBuffer,
  sendTabular,
  sendTemplate,
  formatCell,
};
