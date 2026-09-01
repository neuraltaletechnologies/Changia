"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Campaign, type CampaignStatus } from "@/lib/dashboard/types";
import { CampaignCard } from "@/components/dashboard/widgets/campaign-card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  campaignApi,
  formatTZSCompact,
  type CampaignRecord,
} from "@/lib/dashboard/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { RequestPayoutDialog } from "@/components/dashboard/payouts/request-payout-dialog";
import {
  Plus,
  Upload,
  Megaphone,
  LayoutGrid,
  Rows3,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Check,
  Star,
  Loader2,
  Pause,
  Play,
  Banknote,
  Flag,
  Clock,
  XCircle,
} from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";
import { CampaignEditSheet } from "@/components/dashboard/campaigns/campaign-edit-sheet";
import { ExportMenu } from "@/components/dashboard/export-menu";
import {
  SortableTh,
  useTableSort,
  type SortAccessors,
} from "@/components/dashboard/ui/sortable-table";

const statusChips: { status: string; styles: string; dot: string }[] = [
  { status: "ACTIVE", styles: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { status: "PENDING", styles: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  { status: "REVIEWED", styles: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { status: "DRAFT", styles: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  { status: "COMPLETED", styles: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  { status: "PAUSED", styles: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { status: "CANCELLED", styles: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  { status: "REJECTED", styles: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "raised", label: "Most raised" },
  { value: "goal", label: "Largest goal" },
] as const;
type SortBy = (typeof SORT_OPTIONS)[number]["value"];

type CampaignColumn =
  | "campaign"
  | "category"
  | "manager"
  | "featured"
  | "status"
  | "review"
  | "raised";

const campaignColumnAccessors: SortAccessors<CampaignRecord, CampaignColumn> = {
  campaign: (c) => c.name?.toLowerCase() ?? "",
  category: (c) => c.category?.toLowerCase() ?? "",
  manager: (c) =>
    c.assignments?.[0]
      ? `${c.assignments[0].user.firstName} ${c.assignments[0].user.lastName ?? ""}`
          .trim()
          .toLowerCase()
      : "",
  featured: (c) => Boolean(c.isFeatured),
  status: (c) => c.status ?? "",
  review: (c) => reviewChipsForCampaign(c)[0]?.label ?? "",
  raised: (c) => c.raisedAmount ?? 0,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    hasPermission,
    isSuperAdmin,
    isOrgAdmin,
    isCampaignManager,
    isReviewer,
    canReviewCampaign,
    canFinalApproveCampaign,
    user,
  } = useRole();
  const router = useRouter();
  const canCreate = hasPermission("campaign:create");
  const isAdmin = isSuperAdmin || isOrgAdmin;

  // A REVIEWER doesn't create or run campaigns — they only review them. Their
  // campaign entry point is the Approvals queue, so send them straight there.
  useEffect(() => {
    if (isReviewer) router.replace("/dashboard/approvals");
  }, [isReviewer, router]);

  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await campaignApi.list({ limit: 100 });
      setCampaigns(result.campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set(campaigns.map((c) => c.category).filter((c): c is string => !!c))].sort(),
    [campaigns]
  );

  const filtered = useMemo(() => {
    let list = campaigns;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (categoryFilter) list = list.filter((c) => c.category === categoryFilter);

    const sorted = [...list];
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf());
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "raised":
        sorted.sort((a, b) => b.raisedAmount - a.raisedAmount);
        break;
      case "goal":
        sorted.sort((a, b) => (b.publicTarget || b.goalAmount) - (a.publicTarget || a.goalAmount));
        break;
      default:
        sorted.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
    }
    return sorted;
  }, [campaigns, search, statusFilter, categoryFilter, sortBy]);

  const {
    sorted: sortedRows,
    sort: colSort,
    toggle: toggleColSort,
  } = useTableSort(filtered, campaignColumnAccessors);

  const act = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    }
  };

  // Reviewers are being redirected to /dashboard/approvals — don't
  // flash the list at them on the way out.
  if (isReviewer) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track goals, approvals and donor engagement across your campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={cn(
                "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                viewMode === "card" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              aria-label="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              aria-label="List view"
            >
              <Rows3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <ExportMenu
            dataset="campaigns"
            params={{
              status: statusFilter || undefined,
              search: search.trim() || undefined,
            }}
          />
          {canCreate && (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns/import" />}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import
            </Button>
          )}
          {canCreate && (
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard/campaigns/new" />}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Campaign
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Filters — status chips on top, then search / category / sort, one card */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap sm:flex-nowrap divide-y divide-border sm:divide-y-0 sm:divide-x">
          {statusChips.map(({ status, dot }) => {
            const count = campaigns.filter((c) => c.status === status).length;
            const active = statusFilter === status;
            const dimmed = Boolean(statusFilter) && !active;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === status ? "" : status))}
                className={cn(
                  "relative flex-1 min-w-[33.333%] sm:min-w-0 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  active && "bg-muted/50",
                  dimmed && "opacity-45"
                )}
                title={active ? `Show all statuses` : `Show only ${status.toLowerCase()}`}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                  <span className="text-base font-semibold text-foreground tabular-nums leading-none">
                    {count}
                  </span>
                </div>
                <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </span>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={categoryFilter || "all"}
              onValueChange={(v) => setCategoryFilter(v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy((v as SortBy) ?? "newest")}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Result count + clear */}
      {!loading && campaigns.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {campaigns.length} campaign
          {campaigns.length === 1 ? "" : "s"}
          {(statusFilter || categoryFilter || search.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setCategoryFilter("");
              }}
              className="ml-2 text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Megaphone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {campaigns.length === 0 ? "No campaigns yet." : "No campaigns match your filters."}
          </p>
          {canCreate && campaigns.length === 0 && (
            <Button
              className="mt-4"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/campaigns/new" />}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Start a Campaign
            </Button>
          )}
        </div>
      ) : viewMode === "card" ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="relative">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                {c.status === "COMPLETED" && (
                  <span
                    className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${PROOF_BADGE[c.completionReport?.status ?? "MISSING"]}`}
                  >
                    {PROOF_LABEL[c.completionReport?.status ?? "MISSING"]}
                  </span>
                )}
                {c.isFeatured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Featured
                  </span>
                )}
                {hasEditInReview(c) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200">
                    <Clock className="w-2.5 h-2.5" />
                    Changes in review
                  </span>
                )}
                <CampaignActionsMenu
                  campaign={c}
                  isAdmin={isAdmin}
                  isSuperAdmin={isSuperAdmin}
                  isCampaignManager={isCampaignManager}
                  canReviewCampaign={canReviewCampaign}
                  canFinalApproveCampaign={canFinalApproveCampaign}
                  currentUserId={user?.id}
                  onRun={act}
                  onChanged={load}
                  onApprove={() => act(() => campaignApi.approve(c.id))}
                  onDelete={() => act(() => campaignApi.remove(c.id))}
                  onToggleFeatured={() => act(() => campaignApi.setFeatured(c.id, !c.isFeatured))}
                />
              </div>
              <CampaignCard campaign={toCardCampaign(c)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1040px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <SortableTh
                    sortKey="campaign"
                    sort={colSort}
                    onSort={toggleColSort}
                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"
                  >
                    Campaign
                  </SortableTh>
                  <SortableTh
                    sortKey="category"
                    sort={colSort}
                    onSort={toggleColSort}
                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden md:table-cell"
                  >
                    Category
                  </SortableTh>
                  <SortableTh
                    sortKey="manager"
                    sort={colSort}
                    onSort={toggleColSort}
                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden lg:table-cell"
                  >
                    Manager
                  </SortableTh>
                  <SortableTh
                    sortKey="featured"
                    sort={colSort}
                    onSort={toggleColSort}
                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3"
                  >
                    Featured
                  </SortableTh>
                  <SortableTh
                    sortKey="status"
                    sort={colSort}
                    onSort={toggleColSort}
                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3"
                  >
                    Status
                  </SortableTh>
                  <SortableTh
                    sortKey="review"
                    sort={colSort}
                    onSort={toggleColSort}
                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3"
                  >
                    Review
                  </SortableTh>
                  <SortableTh
                    sortKey="raised"
                    sort={colSort}
                    onSort={toggleColSort}
                    align="right"
                    className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3"
                  >
                    Raised / Goal
                  </SortableTh>
                  <th className="text-right px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRows.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {c.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded-md object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/dashboard/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                            {c.name}
                          </Link>
                          {c.organizationName && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.organizationName}
                            </p>
                          )}
                        </div>
                      </div>
                      {c.status === "COMPLETED" && (
                        <div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-medium border rounded-full px-2 py-0.5 ${PROOF_BADGE[c.completionReport?.status ?? "MISSING"]}`}
                          >
                            {PROOF_LABEL[c.completionReport?.status ?? "MISSING"]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {c.category || "—"}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {c.assignments?.[0]
                        ? `${c.assignments[0].user.firstName} ${c.assignments[0].user.lastName ?? ""}`.trim()
                        : "Unassigned"}
                    </td>
                    <td className="px-3 py-3">
                      <FeaturedCell
                        campaign={c}
                        canManage={isAdmin}
                        onToggle={() => act(() => campaignApi.setFeatured(c.id, !c.isFeatured))}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-[10px] font-medium border rounded-full px-2 py-0.5",
                          statusChips.find((s) => s.status === c.status)?.styles
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ReviewStatusCell campaign={c} />
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      <span className="font-semibold text-foreground">{formatTZSCompact(c.raisedAmount)}</span>
                      <span className="text-muted-foreground"> / {formatTZSCompact(c.publicTarget || c.goalAmount)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <CampaignActionsMenu
                        campaign={c}
                        isAdmin={isAdmin}
                        isSuperAdmin={isSuperAdmin}
                        isCampaignManager={isCampaignManager}
                        canReviewCampaign={canReviewCampaign}
                        canFinalApproveCampaign={canFinalApproveCampaign}
                        currentUserId={user?.id}
                        onRun={act}
                        onChanged={load}
                        onApprove={() => act(() => campaignApi.approve(c.id))}
                        onDelete={() => act(() => campaignApi.remove(c.id))}
                        onToggleFeatured={() => act(() => campaignApi.setFeatured(c.id, !c.isFeatured))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const PROOF_BADGE: Record<string, string> = {
  MISSING: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING_REVIEW: "bg-sky-50 text-sky-700 border-sky-200",
  REVIEWED: "bg-violet-50 text-violet-700 border-violet-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const PROOF_LABEL: Record<string, string> = {
  MISSING: "Proof needed",
  PENDING_REVIEW: "Proof — first review",
  REVIEWED: "Proof — final approval",
  APPROVED: "Proof approved",
  REJECTED: "Proof rejected",
};

/** A live campaign whose latest field edits are parked awaiting reviewer + admin approval. */
function hasEditInReview(c: CampaignRecord): boolean {
  const edit =
    c.editRequest ??
    (c.changeRequest && (c.changeRequest.kind ?? "EDIT") === "EDIT" ? c.changeRequest : null);
  return !!edit && ["PENDING", "REVIEWED"].includes(edit.status);
}

type ReviewChip = { label: string; styles: string; rejected?: boolean };

const CHIP_ORANGE = "bg-orange-50 text-orange-700 border-orange-200";
const CHIP_BLUE = "bg-blue-50 text-blue-700 border-blue-200";
const CHIP_AMBER = "bg-amber-50 text-amber-700 border-amber-200";
const CHIP_ROSE = "bg-rose-50 text-rose-700 border-rose-200";
const CHIP_SKY = "bg-sky-50 text-sky-700 border-sky-200";
const CHIP_VIOLET = "bg-violet-50 text-violet-700 border-violet-200";

/** A two-stage request's position: PENDING = stage 1, REVIEWED = stage 2. */
function stageChip(kind: string, status: string, styles: string): ReviewChip {
  if (status === "CHANGES_REQUESTED")
    return { label: `${kind} · Changes requested`, styles: CHIP_AMBER };
  // Payout past both approvals — on hold until the manager confirms the release.
  if (status === "APPROVED")
    return { label: `${kind} · Confirm to release`, styles: CHIP_AMBER };
  return { label: `${kind} · Stage ${status === "REVIEWED" ? 2 : 1} of 2`, styles };
}

/**
 * "Review" column — every review this campaign is currently in, each tagged
 * with what kind it is (activation / edit / suspension / payout / closure /
 * proof / fee) and how far it's got. Denied outcomes show as a red chip so the
 * manager can open the campaign and see the reviewer's reason.
 */
function reviewChipsForCampaign(c: CampaignRecord): ReviewChip[] {
  const chips: ReviewChip[] = [];

  // 1. The campaign itself going live (DRAFT → PENDING → REVIEWED → ACTIVE).
  if (c.status === "PENDING" && c.reviewState === "CHANGES_REQUESTED")
    chips.push({ label: "Activation · Changes requested", styles: CHIP_AMBER });
  else if (c.status === "PENDING")
    chips.push({ label: "Activation · Stage 1 of 2", styles: CHIP_ORANGE });
  else if (c.status === "REVIEWED")
    chips.push({ label: "Activation · Stage 2 of 2", styles: CHIP_BLUE });
  else if (c.status === "REJECTED")
    chips.push({ label: "Activation · Rejected", styles: CHIP_ROSE, rejected: true });

  // 2. Parked field edits on a live campaign.
  const edit =
    c.editRequest ??
    (c.changeRequest && (c.changeRequest.kind ?? "EDIT") === "EDIT" ? c.changeRequest : null);
  if (edit && ["PENDING", "REVIEWED", "CHANGES_REQUESTED"].includes(edit.status))
    chips.push(stageChip("Edit", edit.status, CHIP_SKY));

  // 3. A manager's suspend / resume ask.
  const statusReq =
    c.statusRequest ?? (c.changeRequest?.kind === "STATUS" ? c.changeRequest : null);
  if (statusReq && ["PENDING", "REVIEWED", "CHANGES_REQUESTED"].includes(statusReq.status)) {
    const verb = statusReq.statusAction === "PAUSE" ? "Suspension" : "Resume";
    chips.push(stageChip(verb, statusReq.status, CHIP_SKY));
  }

  // 4. A payout request in the approval chain.
  if (c.openPayoutRequest)
    chips.push(stageChip("Payout", c.openPayoutRequest.status, CHIP_VIOLET));

  // 5. A request to close the campaign — two-stage (reviewer then org admin).
  if (
    c.latestClosureRequest?.status === "PENDING" ||
    c.latestClosureRequest?.status === "REVIEWED"
  )
    chips.push(stageChip("Closure", c.latestClosureRequest.status, CHIP_SKY));
  else if (
    c.latestClosureRequest?.status === "REJECTED" &&
    (c.status === "ACTIVE" || c.status === "PAUSED")
  )
    chips.push({ label: "Closure · Rejected", styles: CHIP_ROSE, rejected: true });

  // 6. Completion proof for a finished campaign — two-stage (reviewer then org admin).
  if (c.completionReport?.status === "PENDING_REVIEW")
    chips.push({ label: "Proof · Stage 1 of 2", styles: CHIP_SKY });
  else if (c.completionReport?.status === "REVIEWED")
    chips.push({ label: "Proof · Stage 2 of 2", styles: CHIP_SKY });
  else if (c.completionReport?.status === "REJECTED")
    chips.push({ label: "Proof · Rejected", styles: CHIP_ROSE, rejected: true });

  // 7. A proposed custom service-fee rate.
  if (c.feeStatus === "PENDING")
    chips.push({ label: "Custom fee · In review", styles: CHIP_SKY });

  // Chips are built in a natural priority order (activation → edit → status →
  // payout → closure → proof → fee); anything needing the manager to act
  // (rejected / changes requested) is pulled to the front. The Review column
  // only surfaces the first chip, so this ordering decides what shows.
  const needsAction = (chip: ReviewChip) =>
    chip.rejected ||
    chip.label.includes("Changes requested") ||
    chip.label.includes("Confirm to release");
  return chips
    .map((chip, i) => ({ chip, i }))
    .sort((a, b) => Number(needsAction(b.chip)) - Number(needsAction(a.chip)) || a.i - b.i)
    .map((e) => e.chip);
}

function ReviewStatusCell({ campaign }: { campaign: CampaignRecord }) {
  const chips = reviewChipsForCampaign(campaign);
  if (chips.length === 0)
    return <span className="text-[11px] text-muted-foreground">—</span>;
  const [chip] = chips;
  const extra = chips.length - 1;
  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 whitespace-nowrap",
          chip.styles
        )}
      >
        {chip.rejected ? (
          <XCircle className="w-2.5 h-2.5 shrink-0" />
        ) : (
          <Clock className="w-2.5 h-2.5 shrink-0" />
        )}
        {chip.label}
      </span>
      {extra > 0 && (
        <span
          className="text-[10px] font-medium text-muted-foreground whitespace-nowrap"
          title={chips.slice(1).map((c) => c.label).join(", ")}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

/** The "Featured" column — shows featured/not, and doubles as a toggle for admins. */
function FeaturedCell({
  campaign,
  canManage,
  onToggle,
}: {
  campaign: CampaignRecord;
  canManage: boolean;
  onToggle: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const featured = campaign.isFeatured;
  // Featuring is only allowed for a live, public campaign (matches the backend).
  const eligible = campaign.status === "ACTIVE" && campaign.isPublic;

  if (canManage && (eligible || featured)) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onToggle();
          } finally {
            setBusy(false);
          }
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-60",
          featured
            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
        )}
        title={featured ? "Remove from homepage" : "Feature on homepage"}
      >
        {busy ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : (
          <Star className={cn("w-2.5 h-2.5", featured && "fill-amber-500 text-amber-500")} />
        )}
        {featured ? "Featured" : "Feature"}
      </button>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        featured
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-muted/30 text-muted-foreground border-border"
      )}
    >
      <Star className={cn("w-2.5 h-2.5", featured && "fill-amber-500 text-amber-500")} />
      {featured ? "Featured" : "Not featured"}
    </span>
  );
}

function toCardCampaign(c: CampaignRecord): Campaign {
  return {
    id: String(c.id),
    name: c.name,
    goal: c.publicTarget > 0 ? c.publicTarget : c.goalAmount,
    raised: c.raisedAmount,
    donors: c.donorCount,
    status: c.status as CampaignStatus,
    startDate: c.startDate ? new Date(c.startDate).toLocaleDateString() : "—",
    endDate: c.endDate ? new Date(c.endDate).toLocaleDateString() : "—",
    category: c.category ?? undefined,
    description: c.story ?? undefined,
    organizationName: c.organizationName ?? undefined,
    ownerName: c.assignments?.[0]
      ? `${c.assignments[0].user.firstName} ${c.assignments[0].user.lastName ?? ""}`.trim()
      : undefined,
    image: c.imageUrl ?? undefined,
  };
}

// ─── Shared row/card actions menu (per-role, per-status CRUD) ────────────────

type RequestDialog = "suspend" | "resume" | "payout" | "closure";

function CampaignActionsMenu({
  campaign,
  isAdmin,
  isSuperAdmin,
  isCampaignManager,
  canReviewCampaign,
  canFinalApproveCampaign,
  currentUserId,
  onRun,
  onChanged,
  onApprove,
  onDelete,
  onToggleFeatured,
}: {
  campaign: CampaignRecord;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCampaignManager: boolean;
  /** Can give the FIRST (stage-1) approval — REVIEWER / SUPER_ADMIN. */
  canReviewCampaign: boolean;
  /** Can give the FINAL (stage-2) approval — ORG_ADMIN / SUPER_ADMIN. */
  canFinalApproveCampaign: boolean;
  currentUserId?: string;
  /** Runs an API call, refreshes the list, and surfaces any error (parent's `act`). */
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
  /** Refresh the list (e.g. after an inline edit-sheet save). */
  onChanged: () => void;
  onApprove: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<RequestDialog | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Normalise: user.id can arrive as a number at runtime even though it's typed
  // string — coerce both sides before comparing.
  const uid = currentUserId != null ? String(currentUserId) : undefined;
  const isAssigned = !!(
    uid && campaign.assignments?.some((a) => String(a.user.id) === uid)
  );
  const isCreator = !!(uid && String(campaign.createdBy ?? "") === uid);
  // "Works this campaign" — its creator (any role, incl. an org admin who made
  // it themselves), or an assigned manager.
  const worksHere = isAssigned || isCreator;
  // Editing content belongs to the people who build the campaign. An ORG_ADMIN
  // only edits campaigns they created — for anyone else's they use the approval
  // chain ("Request changes"). A SUPER_ADMIN can still edit any.
  const canEdit =
    (isSuperAdmin || worksHere) &&
    campaign.status !== "COMPLETED" &&
    campaign.status !== "CANCELLED";
  const canDelete = isAdmin && campaign.status !== "ACTIVE" && campaign.status !== "COMPLETED";
  // DRAFT → first submission; REJECTED → re-submission after a hard reject.
  // Both go back into the reviewer queue via the same POST /:id/submit.
  const canSubmitDraft =
    (campaign.status === "DRAFT" || campaign.status === "REJECTED") &&
    (isSuperAdmin || worksHere);
  const isResubmit = campaign.status === "REJECTED";
  // Ordered chain: PENDING → a reviewer's first approval; REVIEWED → a
  // different admin's final approval. Neither may be the creator. The backend
  // enforces all of this — this just picks which quick-action to show.
  const isOwnFirstApproval =
    campaign.status === "REVIEWED" &&
    uid != null &&
    String(campaign.firstApprovedBy ?? "") === uid;
  const canApprove =
    !isCreator &&
    !isOwnFirstApproval &&
    ((campaign.status === "PENDING" &&
      campaign.reviewState !== "CHANGES_REQUESTED" &&
      canReviewCampaign) ||
      (campaign.status === "REVIEWED" && canFinalApproveCampaign));
  // Featuring is only allowed once a campaign is live (ACTIVE) and public — the
  // backend's setFeatured enforces the same. Admins still see the menu item on
  // every campaign, just disabled with a reason until it qualifies.
  const canFeature = isAdmin && campaign.status === "ACTIVE" && campaign.isPublic;
  const featureBlockedReason = !isAdmin
    ? null
    : campaign.status !== "ACTIVE"
      ? "Only a live (ACTIVE) campaign can be featured on the homepage."
      : !campaign.isPublic
        ? "This campaign isn't public yet, so it can't be featured."
        : null;

  // A manager works only their assigned campaigns; suspend/resume/payout/closure
  // are all "requests" for them (they clear review), direct only for admins.
  const managerHere = isCampaignManager && worksHere;
  // A suspend/resume ask is "open" (and blocks a new one) while it's PENDING,
  // REVIEWED *or* CHANGES_REQUESTED — matches getOpenChangeRequestRow on the
  // backend, which rejects a duplicate in all three states.
  const statusReqRaw =
    campaign.statusRequest ??
    (campaign.changeRequest?.kind === "STATUS" ? campaign.changeRequest : null);
  const openStatusReq =
    statusReqRaw && ["PENDING", "REVIEWED", "CHANGES_REQUESTED"].includes(statusReqRaw.status)
      ? statusReqRaw
      : null;
  // A payout already in the approval chain — offering "Request payout" again
  // would only hit the backend's "already in review" conflict.
  const openPayoutReq = campaign.openPayoutRequest ?? null;
  const canSuspend = campaign.status === "ACTIVE";
  const canResume = campaign.status === "PAUSED";
  const canRequestPayout =
    managerHere && !openPayoutReq && ["ACTIVE", "PAUSED", "COMPLETED"].includes(campaign.status);
  const canRequestClosure = managerHere && ["ACTIVE", "PAUSED"].includes(campaign.status);

  const wrap = (fn: () => void) => async () => {
    setBusy(true);
    try {
      fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground bg-card/90 hover:bg-muted hover:text-foreground transition-colors border border-border"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => {}} render={<Link href={`/dashboard/campaigns/${campaign.id}`} />}>
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            View
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </DropdownMenuItem>
          )}
          {canSubmitDraft && (
            <DropdownMenuItem onClick={() => onRun(() => campaignApi.submit(campaign.id))}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {isResubmit ? "Re-submit for approval" : "Submit for approval"}
            </DropdownMenuItem>
          )}
          {canApprove && (
            <DropdownMenuItem onClick={wrap(onApprove)}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {campaign.status === "REVIEWED" ? "Give final approval" : "Give first approval"}
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem
              onClick={canFeature ? wrap(onToggleFeatured) : () => {}}
              disabled={!canFeature}
              className={cn(!canFeature && "flex-col items-start gap-0.5")}
            >
              <span className="flex items-center">
                <Star className="w-3.5 h-3.5 mr-1.5" />
                {campaign.isFeatured ? "Unfeature" : "Feature on homepage"}
              </span>
              {featureBlockedReason && (
                <span className="pl-5 text-[11px] font-normal text-muted-foreground">
                  {featureBlockedReason}
                </span>
              )}
            </DropdownMenuItem>
          )}

          {/* Suspend / resume — direct for admins, a review request for managers */}
          {(canSuspend || canResume) && (isAdmin || managerHere) && (
            <DropdownMenuSeparator />
          )}
          {openStatusReq ? (
            <DropdownMenuItem disabled>
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {openStatusReq.statusAction === "PAUSE" ? "Suspension" : "Resume"} requested — in review
            </DropdownMenuItem>
          ) : (
            <>
              {canSuspend && isAdmin && (
                <DropdownMenuItem
                  onClick={() => onRun(() => campaignApi.changeStatus(campaign.id, "PAUSED"))}
                >
                  <Pause className="w-3.5 h-3.5 mr-1.5" />
                  Suspend campaign
                </DropdownMenuItem>
              )}
              {canResume && isAdmin && (
                <DropdownMenuItem
                  onClick={() => onRun(() => campaignApi.changeStatus(campaign.id, "ACTIVE"))}
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Resume campaign
                </DropdownMenuItem>
              )}
              {canSuspend && managerHere && !isAdmin && (
                <DropdownMenuItem onClick={() => setDialog("suspend")}>
                  <Pause className="w-3.5 h-3.5 mr-1.5" />
                  Request suspension
                </DropdownMenuItem>
              )}
              {canResume && managerHere && !isAdmin && (
                <DropdownMenuItem onClick={() => setDialog("resume")}>
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Request resume
                </DropdownMenuItem>
              )}
            </>
          )}

          {(canRequestPayout || canRequestClosure || (managerHere && openPayoutReq)) && (
            <DropdownMenuSeparator />
          )}
          {managerHere && openPayoutReq ? (
            openPayoutReq.status === "APPROVED" ? (
              <DropdownMenuItem
                onClick={() => {}}
                render={<Link href={`/dashboard/campaigns/${campaign.id}?tab=payout`} />}
              >
                <Banknote className="w-3.5 h-3.5 mr-1.5" />
                Confirm payout — release funds
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Payout requested — in review
              </DropdownMenuItem>
            )
          ) : (
            canRequestPayout && (
              <DropdownMenuItem onClick={() => setDialog("payout")}>
                <Banknote className="w-3.5 h-3.5 mr-1.5" />
                Request payout
              </DropdownMenuItem>
            )
          )}
          {canRequestClosure && (
            <DropdownMenuItem onClick={() => setDialog("closure")}>
              <Flag className="w-3.5 h-3.5 mr-1.5" />
              Request closure
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete "${campaign.name}"? This can't be undone.`)) {
                    wrap(onDelete)();
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === "payout" ? (
        <RequestPayoutDialog
          campaignId={campaign.id}
          availableAmount={campaign.availableForPayout ?? campaign.raisedAmount}
          onClose={() => setDialog(null)}
          onSubmitted={() => setDialog(null)}
          run={onRun}
        />
      ) : dialog ? (
        <CampaignRequestDialog
          kind={dialog}
          campaign={campaign}
          onClose={() => setDialog(null)}
          onDone={() => setDialog(null)}
          onRun={onRun}
        />
      ) : null}

      <CampaignEditSheet
        campaign={campaign}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onChanged}
      />
    </>
  );
}

function CampaignRequestDialog({
  kind,
  campaign,
  onClose,
  onDone,
  onRun,
}: {
  kind: Exclude<RequestDialog, "payout">;
  campaign: CampaignRecord;
  onClose: () => void;
  onDone: () => void;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = {
    suspend: {
      title: "Request suspension",
      blurb:
        "This asks a reviewer, then an org admin, to approve pausing the campaign. It stays live until they approve.",
      reasonLabel: "Reason (optional)",
      reasonRequired: false,
    },
    resume: {
      title: "Request resume",
      blurb:
        "This asks a reviewer, then an org admin, to approve bringing the campaign back live.",
      reasonLabel: "Reason (optional)",
      reasonRequired: false,
    },
    closure: {
      title: "Request closure",
      blurb:
        "This asks a reviewer, then an org admin, to mark this campaign completed. You'll still need to submit the completion proof afterwards.",
      reasonLabel: "Why should this campaign close?",
      reasonRequired: true,
    },
  }[kind];

  const submit = async () => {
    setError(null);
    if (meta.reasonRequired && reason.trim().length < 10) {
      setError("Please give a reason of at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await onRun(async () => {
        if (kind === "suspend") return campaignApi.requestStatusChange(campaign.id, "PAUSE", reason.trim() || undefined);
        if (kind === "resume") return campaignApi.requestStatusChange(campaign.id, "RESUME", reason.trim() || undefined);
        return campaignApi.requestClosure(campaign.id, { reason: reason.trim() });
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.blurb}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground">
            Campaign: <span className="font-medium text-foreground">{campaign.name}</span>
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="req-reason" className="text-xs">
              {meta.reasonLabel}
            </Label>
            <Textarea
              id="req-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
