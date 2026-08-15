"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { AddDonorDialog } from "@/components/dashboard/donors/add-donor-dialog";
import {
  donorApi,
  donorFullName,
  formatTZSCompact,
  type DonorRecord,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROSPECT: "bg-sky-50 text-sky-700 border-sky-200",
  LAPSED: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-slate-50 text-slate-500 border-slate-200",
};

const CONSENT_BADGE: Record<string, string> = {
  CONSENTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  WITHDRAWN: "bg-rose-50 text-rose-700 border-rose-200",
};

const CHANNEL_BADGE: Record<string, string> = {
  EMAIL: "bg-sky-50 text-sky-700",
  SMS: "bg-amber-50 text-amber-700",
  WHATSAPP: "bg-emerald-50 text-emerald-700",
  PHONE: "bg-slate-50 text-slate-600",
};

export default function DonorsPage() {
  const { hasPermission } = useRole();
  const canManageDonors = hasPermission("donor:manage");

  const [donors, setDonors] = useState<DonorRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [consentFilter, setConsentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await donorApi.list({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        consent: consentFilter === "all" ? undefined : consentFilter,
        sortBy: sortBy as "created",
        page,
        limit: PAGE_SIZE,
      });
      setDonors(result.donors);
      const pagination = result.pagination as { total?: number };
      setTotal(pagination?.total ?? result.donors.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load donors.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, consentFilter, sortBy, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Donor Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} donors total &mdash; manage, segment and communicate
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageDonors && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/donors/import" />}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Donor
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email or location…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="LAPSED">Lapsed</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={consentFilter}
              onValueChange={(v) => {
                setConsentFilter(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Consent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consent</SelectItem>
                <SelectItem value="CONSENTED">Consented</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v ?? "created")}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Newest first</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="total">Most given</SelectItem>
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

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                  Donor
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Details
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Status
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Consent
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Channel
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Total Given
                </th>
                <th className="w-10 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Loading donors…
                  </td>
                </tr>
              ) : donors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {total === 0
                        ? "No donors yet. Click “Add Donor” to create your first donor."
                        : "No donors match your filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                donors.map((donor) => {
                  const initials = `${(donor.firstName || "?")[0]}${(donor.lastName || "?")[0]}`;
                  const position =
                    donor.position || (donor.gender && donor.gender !== "UNSPECIFIED"
                      ? donor.gender.charAt(0) + donor.gender.slice(1).toLowerCase()
                      : null);
                  return (
                    <tr key={donor.id} className="hover:bg-muted/30 transition-colors">
                      {/* Donor */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/dashboard/donors/${donor.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {donorFullName(donor)}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {donor.phone || donor.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      {/* Details */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          {position && <p className="capitalize">{position}</p>}
                          {donor.pools?.length ? (
                            <p className="truncate max-w-40">
                              {donor.pools.length} pool{donor.pools.length > 1 ? "s" : ""}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5",
                            STATUS_BADGE[donor.status] || STATUS_BADGE.PROSPECT
                          )}
                        >
                          {donor.status.toLowerCase()}
                        </span>
                      </td>
                      {/* Consent */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5",
                            CONSENT_BADGE[donor.consentStatus] || CONSENT_BADGE.PENDING
                          )}
                        >
                          {donor.consentStatus.toLowerCase()}
                        </span>
                      </td>
                      {/* Channel */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {donor.preferredChannel ? (
                          <span
                            className={cn(
                              "inline-flex items-center text-[10px] font-medium rounded px-1.5 py-0.5",
                              CHANNEL_BADGE[donor.preferredChannel] || "bg-slate-50 text-slate-600"
                            )}
                          >
                            {donor.preferredChannel.toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Total Given */}
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        <span className="text-xs font-semibold text-foreground">
                          {donor.totalPaid > 0 ? formatTZSCompact(donor.totalPaid) : "—"}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {donor.donationCount > 0
                            ? `${donor.donationCount} gift${donor.donationCount > 1 ? "s" : ""}`
                            : "No gifts"}
                        </p>
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <Link href={`/dashboard/donors/${donor.id}`}>
                          <span className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && donors.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} &middot; {total} donors
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="w-7 h-7"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-7 h-7"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddDonorDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
    </div>
  );
}