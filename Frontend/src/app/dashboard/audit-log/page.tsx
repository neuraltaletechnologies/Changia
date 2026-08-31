"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Button } from "@/components/dashboard/ui/button";
import { auditApi, type AuditLogEntry, type AuditSeverity } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

const PAGE_SIZE = 25;

const SEVERITIES: AuditSeverity[] = ["INFO", "WARNING", "CRITICAL"];

const severityStyles: Record<AuditSeverity, string> = {
  INFO: "bg-sky-50 text-sky-700 border-sky-200",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  CRITICAL: "bg-rose-50 text-rose-700 border-rose-200",
};

const severityDot: Record<AuditSeverity, string> = {
  INFO: "bg-sky-400",
  WARNING: "bg-amber-400",
  CRITICAL: "bg-rose-500",
};

function actorName(log: AuditLogEntry): string {
  if (log.actor) {
    const name = `${log.actor.firstName ?? ""} ${log.actor.lastName ?? ""}`.trim();
    if (name) return name;
  }
  return log.actorEmail ?? "System";
}

function detailsText(details: unknown): string {
  if (details == null) return "—";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return "—";
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-TZ", { dateStyle: "medium", timeStyle: "short" });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | AuditSeverity>("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Debounce the free-text search so we don't hit the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      severity: severityFilter === "all" ? undefined : severityFilter,
      resource: resourceFilter === "all" ? undefined : resourceFilter,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, severityFilter, resourceFilter, page]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const result = await auditApi.list(params);
      setLogs(result.logs);
      setTotal(result.pagination?.total ?? result.logs.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the audit log.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, severityFilter, resourceFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resources = useMemo(
    () => Array.from(new Set(logs.map((l) => l.resource))).sort(),
    [logs]
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await auditApi.exportCsv(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-logs.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export the audit log.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            A complete record of all actions performed within your organisation
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Severity chips */}
      <div className="flex flex-wrap gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter((prev) => (prev === s ? "all" : s))}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1 transition-all",
              severityFilter === s
                ? severityStyles[s]
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", severityDot[s])} />
            <span className="capitalize">{s.toLowerCase()}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by actor email or resource…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={severityFilter}
              onValueChange={(v) => setSeverityFilter((v as "all" | AuditSeverity) ?? "all")}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Log table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                  Action
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Resource
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Details
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  User
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                  IP Address
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Severity
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Loading entries…
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No log entries match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      log.severity === "CRITICAL" && "bg-rose-50/20"
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            severityDot[log.severity]
                          )}
                        />
                        <code className="text-[11px] font-mono text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {log.action}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{log.resource}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell max-w-xs">
                      <p className="text-xs text-foreground truncate">{detailsText(log.details)}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-foreground">{actorName(log)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <code className="text-[11px] text-muted-foreground font-mono">
                        {log.ipAddress ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize",
                          severityStyles[log.severity]
                        )}
                      >
                        {log.severity.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                        {fmtDate(log.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} &middot; {total} entries
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
