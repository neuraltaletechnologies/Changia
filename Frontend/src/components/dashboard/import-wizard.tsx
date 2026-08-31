"use client";

import { useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { cn } from "@/lib/dashboard/utils";
import {
  downloadTemplate,
  importDataset,
  type DataDataset,
  type ImportResult,
} from "@/lib/dashboard/data-transfer";

export interface ImportColumn {
  field: string;
  required?: boolean;
  help?: string;
}

interface ImportWizardProps {
  dataset: DataDataset;
  /** Extra query params forwarded to template + import (e.g. { poolId }). */
  params?: Record<string, string | number>;
  columns: ImportColumn[];
  /** Short line describing what a row becomes. */
  description?: string;
  onImported?: (result: ImportResult) => void;
}

type Stage = "upload" | "preview" | "result";

// ─── tiny local CSV parser (preview only — server is source of truth) ───────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_").replace(/["']/g, "").replace(/-/g, "_");
}

export function ImportWizard({
  dataset,
  params = {},
  columns,
  description,
  onImported,
}: ImportWizardProps) {
  const [stage, setStage] = useState<Stage>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [headerList, setHeaderList] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [tplBusy, setTplBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const requiredCols = useMemo(
    () => columns.filter((c) => c.required).map((c) => c.field),
    [columns]
  );

  const isXlsx = (name: string) => /\.xlsx$/i.test(name);

  const handleFile = (f: File) => {
    setFile(f);
    setLocalError(null);
    setResult(null);
    if (isXlsx(f.name)) {
      setPreviewRows([]);
      setHeaderList([]);
      setStage("preview");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result ?? ""));
      if (parsed.length < 2) {
        setLocalError("The file has no data rows (header only or empty).");
        setPreviewRows([]);
        setHeaderList([]);
        setStage("preview");
        return;
      }
      const headers = parsed[0].map(normalizeHeader);
      const missing = requiredCols.filter((c) => !headers.includes(c));
      if (missing.length) {
        setLocalError(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
      }
      setHeaderList(headers);
      setPreviewRows(
        parsed.slice(1, 51).map((cells) => {
          const rec: Record<string, string> = {};
          headers.forEach((h, i) => (rec[h] = (cells[i] ?? "").trim()));
          return rec;
        })
      );
      setStage("preview");
    };
    reader.readAsText(f);
  };

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setLocalError(null);
    try {
      const res = await importDataset(dataset, file, params);
      setResult(res);
      setStage("result");
      onImported?.(res);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const getTemplate = async (format: "csv" | "xlsx") => {
    setTplBusy(true);
    try {
      await downloadTemplate(dataset, format, params);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Couldn't download the template.");
    } finally {
      setTplBusy(false);
    }
  };

  const reset = () => {
    setStage("upload");
    setFile(null);
    setPreviewRows([]);
    setHeaderList([]);
    setLocalError(null);
    setResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {(["upload", "preview", "result"] as Stage[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                stage === s
                  ? "bg-primary text-primary-foreground"
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

      {stage === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors",
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
                Drop a CSV or Excel file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse &mdash; .csv / .xlsx up to 5MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Download a template</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {description ? `${description} ` : ""}Required:{" "}
                  {requiredCols.length ? requiredCols.join(", ") : "none"}.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" disabled={tplBusy} onClick={() => getTemplate("csv")}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                CSV
              </Button>
              <Button variant="outline" size="sm" disabled={tplBusy} onClick={() => getTemplate("xlsx")}>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                Excel
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Supported columns</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {columns.map((c) => (
                <div key={c.field} className="flex items-center gap-1.5" title={c.help}>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      c.required ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                  <code className="text-[11px] text-foreground">{c.field}</code>
                  {c.required && (
                    <span className="text-[9px] text-primary font-medium">required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {localError && <ErrorBanner message={localError} />}
        </div>
      )}

      {stage === "preview" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{file?.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {file && isXlsx(file.name)
                  ? "Excel file — rows are validated on the server when you import."
                  : `${previewRows.length} row${previewRows.length === 1 ? "" : "s"} previewed`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} disabled={importing}>
              Change
            </Button>
          </div>

          {localError && <ErrorBanner message={localError} />}

          {previewRows.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border bg-muted/40">
                      {headerList.map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        {headerList.map((h) => (
                          <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap">
                            {r[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={importing}>
              Back
            </Button>
            <Button
              size="sm"
              onClick={runImport}
              disabled={importing || Boolean(localError)}
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import file"
              )}
            </Button>
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Import complete</h2>
            <div className="flex gap-6 mt-1">
              <Stat value={result.imported} label="Imported" className="text-emerald-600" />
              <div className="w-px bg-border" />
              <Stat value={result.duplicates} label="Duplicates" className="text-muted-foreground" />
              <div className="w-px bg-border" />
              <Stat value={result.errors.length} label="Errors" className="text-rose-500" />
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground mb-2">
                Rows not imported ({result.errors.length})
              </h3>
              <ul className="space-y-1 max-h-64 overflow-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11px] text-rose-600">
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={reset}>
            Import another file
          </Button>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <p className="text-xs text-rose-800">{message}</p>
    </div>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-semibold", className)}>{value}</p>
      <p className={cn("text-xs", className)}>{label}</p>
    </div>
  );
}
