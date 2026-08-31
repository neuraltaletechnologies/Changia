"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Button } from "@/components/dashboard/ui/button";
import { ExportMenu } from "@/components/dashboard/export-menu";
import {
  donationApi,
  campaignApi,
  formatTZSFull,
  type DonationRecord,
  type CampaignRecord,
} from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

const PAGE_SIZE = 25;
const STATUSES = ["CONFIRMED", "PENDING", "FAILED", "REFUNDED"] as const;

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  REFUNDED: "bg-slate-50 text-slate-600 border-slate-200",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-TZ", { dateStyle: "medium", timeStyle: "short" });
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<DonationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof STATUSES)[number]>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    campaignApi
      .list({ limit: 100 })
      .then((r) => setCampaigns(r.campaigns))
      .catch(() => setCampaigns([]));
  }, []);

  const params = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      campaignId: campaignFilter === "all" ? undefined : campaignFilter,
      page,
      limit: PAGE_SIZE,
    }),
    [statusFilter, campaignFilter, page]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const result = await donationApi.list(params);
      setRows(result.donations);
      setTotal(result.pagination?.total ?? result.donations.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, campaignFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side donor search over the current page (the list endpoint has no
  // free-text donor filter).
  const visible = useMemo(() => {
    if (!debouncedSearch) return rows;
    return rows.filter((d) =>
      [d.donor_name, d.donor_phone, d.receipt_number, d.campaign?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(debouncedSearch))
    );
  }, [rows, debouncedSearch]);

  // Export forwards the same server-side filters (not the client donor search).
  const exportParams = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      campaignId: campaignFilter === "all" ? undefined : campaignFilter,
    }),
    [statusFilter, campaignFilter]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every contribution recorded across your campaigns
          </p>
        </div>
        <ExportMenu dataset="donations" params={exportParams} />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search donor, phone, receipt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter((v as "all" | (typeof STATUSES)[number]) ?? "all")
              }
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-48 text-xs">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
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

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-3">Receipt</th>
                <th className="text-left px-4 py-3">Donor</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Campaign</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Method</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-5 py-3 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Loading transactions…
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No transactions match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <code className="text-[11px] font-mono text-foreground">
                        {d.receipt_number ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-foreground">
                        {d.isAnonymous ? "Anonymous" : d.donor_name || "—"}
                      </span>
                      {d.donor_phone && (
                        <span className="block text-[11px] text-muted-foreground">
                          {d.donor_phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{d.campaign?.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-foreground whitespace-nowrap">
                      {formatTZSFull(d.amount)}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{d.method}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize",
                          statusStyles[d.status] ?? statusStyles.REFUNDED
                        )}
                      >
                        {d.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                        {fmtDate(d.confirmed_at ?? d.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} &middot; {total} transactions
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
