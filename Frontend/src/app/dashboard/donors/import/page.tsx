"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Progress } from "@/components/dashboard/ui/progress";
import { donorApi, type Gender } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

type Stage = "upload" | "preview" | "result";

const REQUIRED_COLUMNS = ["phone"];

interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

interface ImportResult {
  success: boolean;
  message?: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
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

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/["']/g, "")
    .replace(/-/g, "_");
}

function mapRow(data: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = data[k];
      if (v !== undefined && v.trim() !== "") return v.trim();
    }
    return "";
  };

  const rawStatus = get("status").toUpperCase();
  const rawConsent = get("consent_status", "consent").toUpperCase();
  const rawChannel = get("preferred_channel", "channel").toUpperCase();
  const rawGender = get("gender").toUpperCase();

  return {
    firstName: get("first_name", "firstName"),
    lastName: get("last_name", "lastName"),
    email: get("email"),
    phone: get("phone"),
    location: get("location"),
    gender: (["MALE", "FEMALE", "UNSPECIFIED"].includes(rawGender)
      ? rawGender
      : "UNSPECIFIED") as Gender,
    position: get("position"),
    status: ["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"].includes(rawStatus)
      ? rawStatus
      : undefined,
    consentStatus: ["CONSENTED", "PENDING", "WITHDRAWN"].includes(rawConsent)
      ? rawConsent
      : undefined,
    preferredChannel: ["SMS", "WHATSAPP", "EMAIL", "PHONE"].includes(rawChannel)
      ? rawChannel
      : undefined,
    tags: get("tags")
      ? get("tags")
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined,
  };
}

function validateRow(data: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const col of REQUIRED_COLUMNS) {
    if (!data[col] || data[col].trim() === "")
      errors.push(`Missing required column “${col}”.`);
  }
  if (data.phone && !/^(\+?255|0)?[67][0-9]{8}$/.test(data.phone.replace(/[\s-]/g, "")))
    errors.push("Phone must be a valid Tanzanian number (e.g. +255 7XX XXX XXX).");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push("Email address is not valid.");
  return errors;
}

function buildCSV(rows: ImportRow[]): string {
  const cols = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "location",
    "gender",
    "position",
    "status",
    "consentStatus",
    "preferredChannel",
    "tags",
  ];
  const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const header = cols.join(",");
  const lines = rows.map((r) =>
    cols
      .map((c) => esc((r.data[c] || "").replace(/^"|"$/g, "")))
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export default function ImportDonorsPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [result, setResult] = useState({
    imported: 0,
    skipped: 0,
    duplicates: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setImportErrors([]);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setImportErrors(["The file has no data rows (header only or empty)."]);
        setStage("preview");
        setRows([]);
        return;
      }
      const header = parsed[0].map(normalizeHeader);
      const body = parsed.slice(1);
      const dataRows: ImportRow[] = body.map((cells, i) => {
        const data: Record<string, string> = {};
        header.forEach((h, idx) => {
          data[h] = (cells[idx] ?? "").trim();
        });
        return { rowNumber: i + 2, data, errors: validateRow(data) };
      });
      setRows(dataRows);
      setStage("preview");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const template = buildCSV([]);
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "donors_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const skippedCount = rows.length - validRows.length;

  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    const failedMessages: string[] = [];
    const batch = validRows;
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      try {
        await donorApi.create(mapRow(row.data));
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create donor.";
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
          duplicates++;
        } else {
          failed++;
          failedMessages.push(
            `Row ${row.rowNumber} (${row.data.phone}): ${msg}`
          );
        }
      }
      setProgress(Math.round(((i + 1) / batch.length) * 100));
    }
    setImportErrors(failedMessages);
    setResult({ imported, skipped: skippedCount + failed, duplicates });
    setImporting(false);
    setStage("result");
  };

  return (
    <div className="space-y-6 max-w-[700px]">
      {/* Back */}
      <Link
        href="/dashboard/donors"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Donor Pool
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Import Donors
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV file to add multiple donors at once
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {(["upload", "preview", "result"] as Stage[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                stage === s
                  ? "bg-primary text-white"
                  : i < ["upload", "preview", "result"].indexOf(stage)
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-muted-foreground"
              )}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {i + 1}
              </span>
              <span className="capitalize">{s}</span>
            </div>
            {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {/* Upload stage */}
      {stage === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/40"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse &mdash; CSV up to 10MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Template download */}
          <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Download the CSV template
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Use our template to ensure your data is formatted correctly.
                  Required field: phone. Accepts first_name, last_name, email,
                  phone, location, gender, position, status, consent_status,
                  preferred_channel, tags.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          {/* Field guide */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">
              Supported CSV columns
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { field: "phone", req: true },
                { field: "first_name", req: false },
                { field: "last_name", req: false },
                { field: "email", req: false },
                { field: "location", req: false },
                { field: "gender", req: false },
                { field: "position", req: false },
                { field: "status", req: false },
                { field: "consent_status", req: false },
                { field: "preferred_channel", req: false },
                { field: "tags", req: false },
              ].map(({ field, req }) => (
                <div key={field} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      req ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                  <code className="text-[11px] text-foreground">{field}</code>
                  {req && (
                    <span className="text-[9px] text-primary font-medium">
                      required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview stage */}
      {stage === "preview" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {fileName || "donors_import.csv"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rows.length} records detected &mdash; {validRows.length} valid,{" "}
                {skippedCount} with errors
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setStage("upload")}
              disabled={importing}
            >
              Change
            </Button>
          </div>

          {rows.length === 0 ? (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800">{importErrors.join(" ")}</p>
            </div>
          ) : (
            <>
              {skippedCount > 0 && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {skippedCount} row{skippedCount > 1 ? "s" : ""} ha
                    {skippedCount > 1 ? "ve" : "s"} validation errors and will be
                    skipped. Review below before importing.
                  </p>
                </div>
              )}

              {/* Preview table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Name
                        </th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                          Phone
                        </th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          Email
                        </th>
                        <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row) => {
                        const ok = row.errors.length === 0;
                        const name =
                          `${row.data.first_name || ""} ${row.data.last_name || ""}`.trim();
                        return (
                          <tr
                            key={row.rowNumber}
                            className={cn(
                              "transition-colors",
                              !ok ? "bg-rose-50/40" : "hover:bg-muted/20"
                            )}
                          >
                            <td className="px-4 py-2.5 font-medium text-foreground">
                              {name || `Row ${row.rowNumber}`}
                              <span className="text-[10px] text-muted-foreground ml-1">
                                (#{row.rowNumber})
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                              {row.data.phone || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                              {row.data.email || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {ok ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                  <span className="text-[10px] text-rose-600">
                                    {row.errors[0]}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importing donors…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStage("upload")}
              disabled={importing}
            >
              Back
            </Button>
            <Button size="sm" onClick={runImport} disabled={validRows.length === 0 || importing}>
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Importing…
                </>
              ) : (
                `Import ${validRows.length} Valid Record${validRows.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Result stage */}
      {stage === "result" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Import Complete
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {result.imported} donor record
              {result.imported !== 1 ? "s" : ""} successfully imported.{" "}
              {result.skipped} record{result.skipped !== 1 ? "s" : ""} skipped.
            </p>

            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <p className="text-2xl font-semibold text-emerald-600">
                  {result.imported}
                </p>
                <p className="text-xs text-emerald-600">Imported</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-rose-500">
                  {result.skipped}
                </p>
                <p className="text-xs text-rose-500">Skipped</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">
                  {result.duplicates}
                </p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </div>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground mb-2">
                Failed rows ({importErrors.length})
              </h3>
              <ul className="space-y-1">
                {importErrors.map((m, i) => (
                  <li key={i} className="text-[11px] text-rose-600">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStage("upload");
                setProgress(0);
                setFileName("");
                setRows([]);
                setImportErrors([]);
              }}
            >
              Import Another File
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard/donors" />}>
              View Donor Pool
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}