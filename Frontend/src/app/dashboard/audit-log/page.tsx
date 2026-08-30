"use client";

import { useState, useMemo } from "react";
import { Search, Download, Filter } from "lucide-react";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Button } from "@/components/dashboard/ui/button";
import type { AuditLog } from "@/lib/dashboard/types";
import { cn } from "@/lib/dashboard/utils";

const severityStyles: Record<AuditLog["severity"], string> = {
  info: "bg-sky-50 text-sky-700 border-sky-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
};

const severityDot: Record<AuditLog["severity"], string> = {
  info: "bg-sky-400",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
};

export default function AuditLogPage() {
  const [logs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        (log.details ?? "").toLowerCase().includes(search.toLowerCase());
      const matchSeverity =
        severityFilter === "all" || log.severity === severityFilter;
      const matchResource =
        resourceFilter === "all" || log.resource === resourceFilter;
      return matchSearch && matchSeverity && matchResource;
    });
  }, [logs, search, severityFilter, resourceFilter]);

  const resources = Array.from(new Set(logs.map((l) => l.resource)));

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
        <Button variant="outline" size="sm">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {(["info", "warning", "critical"] as const).map((s) => {
          const count = logs.filter((l) => l.severity === s).length;
          return (
            <button
              key={s}
              onClick={() =>
                setSeverityFilter((prev) => (prev === s ? "all" : s))
              }
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1 transition-all",
                severityFilter === s
                  ? severityStyles[s]
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  severityDot[s]
                )}
              />
              <span className="capitalize">{s}</span>
              <span className="ml-0.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by action, user, or details…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-36 text-xs">
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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No log entries yet.
                  </td>
                </tr>
              )}
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    log.severity === "critical" && "bg-rose-50/20"
                  )}
                >
                  {/* Action */}
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
                  {/* Resource */}
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {log.resource}
                    </span>
                  </td>
                  {/* Details */}
                  <td className="px-4 py-3.5 hidden lg:table-cell max-w-xs">
                    <p className="text-xs text-foreground truncate">
                      {log.details}
                    </p>
                  </td>
                  {/* User */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-foreground">{log.user}</span>
                  </td>
                  {/* IP */}
                  <td className="px-4 py-3.5 hidden xl:table-cell">
                    <code className="text-[11px] text-muted-foreground font-mono">
                      {log.ipAddress}
                    </code>
                  </td>
                  {/* Severity */}
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize",
                        severityStyles[log.severity]
                      )}
                    >
                      {log.severity}
                    </span>
                  </td>
                  {/* Timestamp */}
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                    <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                      {log.timestamp}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {logs.length} entries
          </p>
          <p className="text-[10px] text-muted-foreground">
            Retained for 90 days
          </p>
        </div>
      </div>
    </div>
  );
}
