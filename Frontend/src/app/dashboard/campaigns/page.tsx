"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Plus,
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
} from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";

const statusChips: { status: string; styles: string }[] = [
  { status: "ACTIVE", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { status: "PENDING", styles: "bg-orange-50 text-orange-700 border-orange-200" },
  { status: "REVIEWED", styles: "bg-blue-50 text-blue-700 border-blue-200" },
  { status: "DRAFT", styles: "bg-slate-50 text-slate-600 border-slate-200" },
  { status: "COMPLETED", styles: "bg-sky-50 text-sky-700 border-sky-200" },
  { status: "PAUSED", styles: "bg-amber-50 text-amber-700 border-amber-200" },
  { status: "CANCELLED", styles: "bg-rose-50 text-rose-700 border-rose-200" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "raised", label: "Most raised" },
  { value: "goal", label: "Largest goal" },
] as const;
type SortBy = (typeof SORT_OPTIONS)[number]["value"];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    hasPermission,
    isSuperAdmin,
    isOrgAdmin,
    canReviewCampaign,
    canFinalApproveCampaign,
    user,
  } = useRole();
  const canCreate = hasPermission("campaign:create");
  const isAdmin = isSuperAdmin || isOrgAdmin;

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

  const act = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {campaigns.length} campaigns &mdash; track goals and donor engagement
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

      {/* Tabs summary */}
      <div className="flex gap-3 flex-wrap">
        {statusChips.map(({ status, styles }) => {
          const count = campaigns.filter((c) => c.status === status).length;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === status ? "" : status))}
              className={`text-xs font-medium border rounded-full px-3 py-1 transition-opacity ${styles} ${
                statusFilter && statusFilter !== status ? "opacity-40" : ""
              }`}
            >
              {count} {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
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
                <CampaignActionsMenu
                  campaign={c}
                  isAdmin={isAdmin}
                  canReviewCampaign={canReviewCampaign}
                  canFinalApproveCampaign={canFinalApproveCampaign}
                  currentUserId={user?.id}
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
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Campaign
                  </th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden lg:table-cell">
                    Manager
                  </th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                    Status
                  </th>
                  <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                    Raised / Goal
                  </th>
                  <th className="text-right px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
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
                        <Link href={`/dashboard/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {c.name}
                        </Link>
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
                      <span
                        className={cn(
                          "text-[10px] font-medium border rounded-full px-2 py-0.5",
                          statusChips.find((s) => s.status === c.status)?.styles
                        )}
                      >
                        {c.status}
                      </span>
                      {c.isFeatured && (
                        <Star className="inline-block w-3 h-3 ml-1.5 fill-amber-500 text-amber-500" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      <span className="font-semibold text-foreground">{formatTZSCompact(c.raisedAmount)}</span>
                      <span className="text-muted-foreground"> / {formatTZSCompact(c.publicTarget || c.goalAmount)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <CampaignActionsMenu
                        campaign={c}
                        isAdmin={isAdmin}
                        canReviewCampaign={canReviewCampaign}
                        canFinalApproveCampaign={canFinalApproveCampaign}
                        currentUserId={user?.id}
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
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const PROOF_LABEL: Record<string, string> = {
  MISSING: "Proof needed",
  PENDING_REVIEW: "Proof pending review",
  APPROVED: "Proof approved",
  REJECTED: "Proof rejected",
};

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
    ownerName: c.assignments?.[0]
      ? `${c.assignments[0].user.firstName} ${c.assignments[0].user.lastName ?? ""}`.trim()
      : undefined,
    image: c.imageUrl ?? undefined,
  };
}

// ─── Shared row/card actions menu (per-role, per-status CRUD) ────────────────

function CampaignActionsMenu({
  campaign,
  isAdmin,
  canReviewCampaign,
  canFinalApproveCampaign,
  currentUserId,
  onApprove,
  onDelete,
  onToggleFeatured,
}: {
  campaign: CampaignRecord;
  isAdmin: boolean;
  /** Can give the FIRST (stage-1) approval — REVIEWER / SUPER_ADMIN. */
  canReviewCampaign: boolean;
  /** Can give the FINAL (stage-2) approval — ORG_ADMIN / SUPER_ADMIN. */
  canFinalApproveCampaign: boolean;
  currentUserId?: string;
  onApprove: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const isAssigned = currentUserId
    ? campaign.assignments?.some((a) => String(a.user.id) === currentUserId)
    : false;
  const canEdit =
    (isAdmin || isAssigned) && campaign.status !== "COMPLETED" && campaign.status !== "CANCELLED";
  const canDelete = isAdmin && campaign.status !== "ACTIVE" && campaign.status !== "COMPLETED";
  // Ordered chain: PENDING → a reviewer's first approval; REVIEWED → a
  // different admin's final approval. Neither may be the creator. The backend
  // enforces all of this — this just picks which quick-action to show.
  const isCreator = String(campaign.createdBy ?? "") === currentUserId;
  const isOwnFirstApproval =
    campaign.status === "REVIEWED" &&
    currentUserId != null &&
    String(campaign.firstApprovedBy ?? "") === currentUserId;
  const canApprove =
    !isCreator &&
    !isOwnFirstApproval &&
    ((campaign.status === "PENDING" && canReviewCampaign) ||
      (campaign.status === "REVIEWED" && canFinalApproveCampaign));
  const canFeature = isAdmin && campaign.status === "ACTIVE" && campaign.isPublic;

  const wrap = (fn: () => void) => async () => {
    setBusy(true);
    try {
      fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground bg-card/90 hover:bg-muted hover:text-foreground transition-colors border border-border"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => {}} render={<Link href={`/dashboard/campaigns/${campaign.id}`} />}>
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          View
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => {}} render={<Link href={`/dashboard/campaigns/${campaign.id}/edit`} />}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </DropdownMenuItem>
        )}
        {canApprove && (
          <DropdownMenuItem onClick={wrap(onApprove)}>
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {campaign.status === "REVIEWED" ? "Give final approval" : "Give first approval"}
          </DropdownMenuItem>
        )}
        {canFeature && (
          <DropdownMenuItem onClick={wrap(onToggleFeatured)}>
            <Star className="w-3.5 h-3.5 mr-1.5" />
            {campaign.isFeatured ? "Unfeature" : "Feature on homepage"}
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
  );
}
