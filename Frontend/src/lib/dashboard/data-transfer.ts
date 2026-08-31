"use client";

/**
 * Bulk CSV / XLSX export + import client for the dashboard. Talks to the
 * backend `/api/v1/data/:dataset/{export,import,import-template}` dispatcher
 * (see Backend/modules/data-transfer). Downloads need the bearer header so they
 * can't be plain <a href> links — same blob-download pattern as
 * auditApi.exportCsv.
 */

import { getToken } from "@/lib/api-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export type ExportFormat = "csv" | "xlsx";

export type DataDataset =
  | "donors"
  | "donor-pools"
  | "pool-members"
  | "donations"
  | "payouts"
  | "campaigns"
  | "audit-logs"
  | "approvals";

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  skipped: number;
  errors: ImportError[];
}

type Params = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params: Params = {}, extra: Params = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...extra })) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : fallback;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Download a dataset's current filtered view as CSV or XLSX. */
export async function downloadDataset(
  dataset: DataDataset,
  params: Params,
  format: ExportFormat
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/data/${dataset}/export${buildQuery(params, { format })}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  triggerDownload(
    blob,
    filenameFromDisposition(
      res.headers.get("Content-Disposition"),
      `${dataset}.${format}`
    )
  );
}

/** Download the starter import template for a dataset. */
export async function downloadTemplate(
  dataset: DataDataset,
  format: ExportFormat,
  params: Params = {}
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/data/${dataset}/import-template${buildQuery(params, { format })}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  triggerDownload(
    blob,
    filenameFromDisposition(
      res.headers.get("Content-Disposition"),
      `${dataset}-template.${format}`
    )
  );
}

/** Upload a filled CSV / XLSX file for server-side validation + insert. */
export async function importDataset(
  dataset: DataDataset,
  file: File,
  params: Params = {}
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_BASE_URL}/data/${dataset}/import${buildQuery(params)}`,
    { method: "POST", headers: authHeaders(), body: form }
  );
  if (!res.ok) throw new Error(await readError(res));
  const body = await res.json();
  return body.data as ImportResult;
}
