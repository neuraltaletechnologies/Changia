"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Calendar,
  Check,
  FileWarning,
  Heart,
  ImageIcon,
  Import,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  UploadCloud,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Progress } from "@/components/dashboard/ui/progress";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/dashboard/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/dashboard/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import {
  campaignApi,
  poolApi,
  templateApi,
  userApi,
  donorFullName,
  formatTZSFull,
  formatTZSCompact,
  PAY_STATUS_META,
  type CampaignRecord,
  type CampaignTargetsResponse,
  type CampaignTarget,
  type CompletionReport,
  type PoolImportPreview,
  type DonorPool,
  type MessageTemplate,
  type ReminderChannel,
  type UserRecord,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  PENDING: "bg-orange-50 text-orange-700 border-orange-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-sky-50 text-sky-700 border-sky-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin, isOrgAdmin, isCampaignManager } = useRole();
  const isAdmin = isSuperAdmin || isOrgAdmin;

  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [board, setBoard] = useState<CampaignTargetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actError, setActError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [c, b] = await Promise.all([
        campaignApi.get(id),
        campaignApi.donorTargets(id),
      ]);
      setCampaign(c);
      setBoard(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectableTargets = useMemo(
    () =>
      board?.targets.filter(
        (t) => t.status === "UNPAID" || t.status === "PARTIAL"
      ) ?? [],
    [board]
  );

  const toggleSelect = (donorId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(donorId)) next.delete(donorId);
      else next.add(donorId);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === selectableTargets.length ? new Set<number>() : new Set(selectableTargets.map((t) => t.donor.id))
    );

  const act = async (fn: () => Promise<unknown>) => {
    setActing(true);
    setActError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setActError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1200px]">
        <div className="h-48 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground text-sm">Campaign not found.</p>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/campaigns" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const progress =
    campaign.publicTarget > 0
      ? Math.min(100, Math.round((campaign.raisedAmount / campaign.publicTarget) * 100))
      : 0;
  const summary = board?.summary;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/campaigns" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Campaigns
        </Button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Import className="w-3.5 h-3.5 mr-1.5" />
              Import Pool
            </Button>
          )}
          {summary && summary.totalTargets > 0 && (
            <Button size="sm" onClick={() => setReminderOpen(true)}>
              <BellRing className="w-3.5 h-3.5 mr-1.5" />
              Send Reminder
              {selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {actError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actError}
        </div>
      )}

      {campaign.status === "COMPLETED" && !campaign.completionReport && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            This campaign is completed. Submit proof of how the funds were used in the{" "}
            <strong>Completion</strong> tab below — until it&apos;s approved, you can&apos;t start a
            new campaign.
          </span>
        </div>
      )}
      {campaign.status === "COMPLETED" && campaign.completionReport?.status === "PENDING_REVIEW" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            A completion report is waiting for review in the <strong>Completion</strong> tab.
          </span>
        </div>
      )}
      {campaign.status === "COMPLETED" && campaign.completionReport?.status === "REJECTED" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            The completion report was rejected — see the <strong>Completion</strong> tab to fix and
            resubmit it.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {campaign.imageUrl && (
          <div className="relative h-48 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campaign.imageUrl}
              alt={campaign.name}
              className="h-48 w-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {campaign.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                {campaign.category && (
                  <span className="inline-flex items-center gap-1">
                    <Megaphone className="w-3.5 h-3.5" />
                    {campaign.category}
                  </span>
                )}
                {campaign.startDate && campaign.endDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(campaign.startDate).toLocaleDateString()} →{" "}
                    {new Date(campaign.endDate).toLocaleDateString()}
                  </span>
                )}
                {campaign.contactPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {campaign.contactPhone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] font-medium border rounded-full px-2.5 py-1",
                  STATUS_BADGE[campaign.status]
                )}
              >
                {campaign.status}
              </span>
              {isAdmin && campaign.status === "ACTIVE" && campaign.isPublic && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  className={campaign.isFeatured ? "text-amber-600 hover:text-amber-600" : undefined}
                  onClick={() => act(() => campaignApi.setFeatured(id, !campaign.isFeatured))}
                >
                  <Star
                    className={`w-3.5 h-3.5 mr-1.5 ${campaign.isFeatured ? "fill-amber-500 text-amber-500" : ""}`}
                  />
                  {campaign.isFeatured ? "Featured" : "Feature on homepage"}
                </Button>
              )}
              {campaign.status === "DRAFT" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/dashboard/campaigns/${id}/edit`} />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => act(() => campaignApi.submit(id))}
                  >
                    {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Submit for approval
                  </Button>
                </>
              )}
              {isAdmin && campaign.status === "PENDING" && (
                <Button
                  size="sm"
                  disabled={acting}
                  onClick={() => act(() => campaignApi.approve(id))}
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Approve
                </Button>
              )}
              {isAdmin && campaign.status === "ACTIVE" && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md h-8 px-3 text-sm font-medium border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Actions
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onSelect={() => act(() => campaignApi.changeStatus(id, "PAUSED"))}
                    >
                      <Pause className="w-3.5 h-3.5 mr-1.5" />
                      Pause Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => act(() => campaignApi.changeStatus(id, "COMPLETED"))}
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Complete Campaign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => act(() => campaignApi.changeStatus(id, "CANCELLED"))}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cancel Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {isAdmin && campaign.status === "PAUSED" && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md h-8 px-3 text-sm font-medium border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Actions
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onSelect={() => act(() => campaignApi.changeStatus(id, "ACTIVE"))}
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Resume Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => act(() => campaignApi.changeStatus(id, "COMPLETED"))}
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Complete Campaign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => act(() => campaignApi.changeStatus(id, "CANCELLED"))}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cancel Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {isAdmin && (campaign.status === "DRAFT" || campaign.status === "PENDING") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
                      act(() => campaignApi.remove(id)).then(() => {
                        window.location.href = "/dashboard/campaigns";
                      });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-foreground">
                {formatTZSFull(campaign.raisedAmount)}
              </span>
              <span className="text-muted-foreground">
                of {formatTZSFull(campaign.publicTarget)} target
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-3">
              <span>{progress}% funded</span>
              <span>{campaign.donorCount} donors</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
            <Stat label="Tracked donors" value={summary ? String(summary.totalTargets) : "—"} />
            <Stat label="Expected" value={summary ? formatTZSCompact(summary.expectedTotal) : "—"} />
            <Stat label="Paid of tracked" value={summary ? formatTZSCompact(summary.paidTotal) : "—"} />
            <Stat
              label="Fully paid"
              value={summary ? `${summary.paidFull}/${summary.totalTargets}` : "—"}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto w-full sm:w-auto gap-1 py-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="board">
            Donor Board ({board?.targets.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="donations">
            Donations ({campaign.donations?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="user">
            User ({campaign.assignments?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="translation">Swahili</TabsTrigger>
          {campaign.status === "COMPLETED" && (
            <TabsTrigger value="completion">
              Completion
              {campaign.completionReport?.status === "PENDING_REVIEW" && " (review needed)"}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="pt-2">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-2">Story</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {campaign.story || "No story provided."}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4">Owner</h2>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {(campaign.assignments?.[0]?.user.firstName || "CO")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {campaign.assignments?.[0]
                      ? donorFullName(campaign.assignments[0].user)
                      : "Unassigned"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {campaign.assignments?.[0]?.user.email ||
                      campaign.contactPhone ||
                      "No contact set"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="board" className="pt-2">
          <DonorBoardTab
            board={board}
            selected={selected}
            selectableCount={selectableTargets.length}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onUpdated={refresh}
            canManage={isAdmin}
            onSetExpected={(donorId, amount) =>
              act(() => campaignApi.setTargetExpected(id, donorId, amount))
            }
            onRemoveTarget={(donorId) =>
              act(() => campaignApi.removeTarget(id, donorId))
            }
          />
        </TabsContent>

        <TabsContent value="donations" className="pt-2">
          <DonationsList donations={campaign.donations ?? []} campaignId={id} />
        </TabsContent>

        <TabsContent value="user" className="pt-2">
          <UserTab
            assignments={campaign.assignments ?? []}
            campaignId={id}
            isAdmin={isAdmin}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="translation" className="pt-2">
          <TranslationTab campaign={campaign} campaignId={id} onSaved={refresh} />
        </TabsContent>

        {campaign.status === "COMPLETED" && (
          <TabsContent value="completion" className="pt-2">
            <CompletionReportTab
              campaignId={id}
              isAdmin={isAdmin}
              canSubmit={isCampaignManager}
              onReviewed={refresh}
            />
          </TabsContent>
        )}
      </Tabs>

      {importOpen && (
        <ImportPoolDialog
          campaignId={id}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            refresh();
          }}
        />
      )}

      {reminderOpen && board && (
        <ReminderDialog
          campaignId={id}
          campaignName={campaign.name}
          donorIds={[...selected]}
          donors={board.targets
            .filter((t) => selected.has(t.donor.id))
            .map((t) => t.donor)}
          onClose={() => setReminderOpen(false)}
          onSent={() => {
            setReminderOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

// ─── Donor Board tab ───────────────────────────────────────────────────────────

function DonorBoardTab({
  board,
  selected,
  selectableCount,
  onToggleSelect,
  onToggleAll,
  onUpdated,
  canManage,
  onSetExpected,
  onRemoveTarget,
}: {
  board: CampaignTargetsResponse | null;
  selected: Set<number>;
  selectableCount: number;
  onToggleSelect: (donorId: number) => void;
  onToggleAll: () => void;
  onUpdated: () => void;
  canManage: boolean;
  onSetExpected: (donorId: number, amount: number | null) => void;
  onRemoveTarget: (donorId: number) => void;
}) {
  const [inline, setInline] = useState<{ donorId: number; value: string } | null>(null);

  if (!board || board.targets.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl py-16 text-center">
        <FileWarning className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No tracked donors yet. Import a donor pool to start tracking who pays.
        </p>
        <Button size="sm" className="mt-4" variant="outline" onClick={onUpdated}>
          Refresh
        </Button>
      </div>
    );
  }

  const sorted = [...board.targets].sort((a, b) => {
    const order = { PAID_FULL: 2, PARTIAL: 1, UNPAID: 0 } as const;
    return order[b.status] - order[a.status];
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-foreground">Donor Board</h2>
          {selectableCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {selectableCount} unpaid / partial — select to remind
            </p>
          )}
        </div>
        {selectableCount > 0 && (
          <Button size="xs" variant="outline" onClick={onToggleAll}>
            {selected.size === selectableCount && selected.size > 0
              ? "Clear selection"
              : "Select all unpaid"}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3">
                {selectableCount > 0 && selected.size === selectableCount && selected.size > 0 ? (
                  <input type="checkbox" checked readOnly className="accent-primary" />
                ) : (
                  <input type="checkbox" checked={false} readOnly className="accent-primary" />
                )}
              </th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Donor
              </th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden md:table-cell">
                Pool
              </th>
              <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Expected
              </th>
              <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Paid
              </th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden sm:table-cell">
                Status
              </th>
              <th className="text-right px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((t) => (
              <BoardRow
                key={t.id}
                target={t}
                checked={selected.has(t.donor.id)}
                selectable={t.status !== "PAID_FULL"}
                inline={inline}
                setInline={setInline}
                canManage={canManage}
                onCheckedChange={() => onToggleSelect(t.donor.id)}
                onSetExpected={onSetExpected}
                onRemoveTarget={onRemoveTarget}
              />
            ))}
          </tbody>
        </table>
      </div>
      {board.poolTotals.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Per pool
          </p>
          <div className="flex flex-wrap gap-2">
            {board.poolTotals.map((pt) => (
              <div
                key={pt.pool?.id ?? 0}
                className="text-[11px] border border-border rounded-lg px-3 py-1.5 flex items-center gap-2"
              >
                <span className="font-medium text-foreground">
                  {pt.pool?.name ?? "No pool"}
                </span>
                <span className="text-muted-foreground">
                  {pt.count} · {formatTZSCompact(pt.expectedTotal)} expected
                </span>
                <span className="text-emerald-600">
                  {formatTZSCompact(pt.paidTotal)} paid
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BoardRow({
  target,
  checked,
  selectable,
  inline,
  setInline,
  canManage,
  onCheckedChange,
  onSetExpected,
  onRemoveTarget,
}: {
  target: CampaignTarget;
  checked: boolean;
  selectable: boolean;
  inline: { donorId: number; value: string } | null;
  setInline: (s: { donorId: number; value: string } | null) => void;
  canManage: boolean;
  onCheckedChange: () => void;
  onSetExpected: (donorId: number, amount: number | null) => void;
  onRemoveTarget: (donorId: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const meta = PAY_STATUS_META[target.status];

  const submitExpected = async () => {
    const v = inline?.value;
    setSaving(true);
    try {
      await onSetExpected(target.donor.id, v === "" || v == null ? null : Number(v));
    } finally {
      setSaving(false);
      setInline(null);
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        {selectable ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheckedChange}
            className="accent-primary"
          />
        ) : null}
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/dashboard/donors/${target.donor.id}`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
              {`${(target.donor.firstName || "?")[0]}${(target.donor.lastName || "?")[0]}`}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {donorFullName(target.donor)}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {target.donor.phone || target.donor.email || "No contact"}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-3 py-3 hidden md:table-cell">
        {target.pool ? (
          <span className="text-[11px] border border-border rounded-full px-2 py-0.5 text-muted-foreground">
            {target.pool.name}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {inline?.donorId === target.donor.id ? (
          <div className="flex items-center justify-end gap-1.5">
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="Amount"
              className="h-8 w-24 text-right text-xs"
              value={inline.value}
              onChange={(e) => setInline({ donorId: target.donor.id, value: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && submitExpected()}
            />
            <Button size="xs" variant="outline" onClick={submitExpected} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => canManage && setInline({ donorId: target.donor.id, value: target.expectedAmount?.toString() ?? "" })}
            className={cn(
              "text-xs font-medium tabular-nums",
              canManage ? "hover:text-primary cursor-pointer" : "cursor-default",
            )}
            title={canManage ? "Click to edit expected amount" : undefined}
          >
            {target.expectedAmount == null
              ? "—"
              : formatTZSCompact(target.expectedAmount)}
          </button>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {target.paidAmount > 0 ? (
          <span className="text-xs font-semibold text-emerald-600 tabular-nums">
            {formatTZSCompact(target.paidAmount)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        <span
          className={cn(
            "text-[10px] font-medium border rounded-full px-2 py-0.5",
            meta.className
          )}
        >
          {meta.label}
          {target.donationCount > 0 ? ` · ${target.donationCount} gift${target.donationCount > 1 ? "s" : ""}` : ""}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onSelect={() => setInline({ donorId: target.donor.id, value: target.expectedAmount?.toString() ?? "" })}
              >
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Edit expected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onRemoveTarget(target.donor.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove from campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}

// ─── Donations tab ────────────────────────────────────────────────────────────

function DonationsList({
  donations,
  campaignId,
}: {
  donations: CampaignRecord["donations"];
  campaignId: string;
}) {
  const total = (donations ?? []).reduce((s, d) => s + d.amount, 0);
  if (!donations || donations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl py-16 text-center">
        <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No donations recorded for this campaign yet.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">All donations</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Total {formatTZSFull(total)}
        </p>
      </div>
      <div className="divide-y divide-border">
        {donations.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Heart className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {d.donorName || "Anonymous"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {d.method} · {new Date(d.createdAt).toLocaleDateString()}
                {d.receiptNumber ? ` · ${d.receiptNumber}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-foreground">
                {formatTZSFull(d.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── User tab ─────────────────────────────────────────────────────────────────

function UserTab({
  assignments,
  campaignId,
  isAdmin,
  onRefresh,
}: {
  assignments: CampaignRecord["assignments"];
  campaignId: string;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">User members</h2>
        {isAdmin && (
          <Button size="xs" variant="outline" onClick={() => setAssignOpen(true)}>
            Assign Managers
          </Button>
        )}
      </div>
      {!assignments || assignments.length === 0 ? (
        <div className="py-16 text-center">
          <UserRound className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No user members assigned.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {assignments.map((a) => (
            <div key={a.user.id} className="flex items-center gap-3 px-5 py-3.5">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                  {`${a.user.firstName[0]}${(a.user.lastName || "?")[0]}`}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {donorFullName(a.user)}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {a.user.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {assignOpen && (
        <AssignManagersDialog
          campaignId={campaignId}
          currentAssignments={assignments ?? []}
          onClose={() => setAssignOpen(false)}
          onSaved={() => {
            setAssignOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Swahili translation tab ───────────────────────────────────────────────

function TranslationTab({
  campaign,
  campaignId,
  onSaved,
}: {
  campaign: CampaignRecord;
  campaignId: string;
  onSaved: () => void;
}) {
  const [nameSw, setNameSw] = useState(campaign.nameSw ?? "");
  const [categorySw, setCategorySw] = useState(campaign.categorySw ?? "");
  const [storySw, setStorySw] = useState(campaign.storySw ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await campaignApi.setTranslations(campaignId, { nameSw, storySw, categorySw });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the translation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Swahili translation</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Optional — shown on the /sw public pages. Leave blank to fall back to the English
          content above. Unlike the main details, this can be edited at any campaign status.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name-sw" className="text-xs">Campaign name (Swahili)</Label>
          <Input
            id="name-sw"
            value={nameSw}
            onChange={(e) => setNameSw(e.target.value)}
            placeholder={campaign.name}
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="category-sw" className="text-xs">Category (Swahili)</Label>
          <Input
            id="category-sw"
            value={categorySw}
            onChange={(e) => setCategorySw(e.target.value)}
            placeholder={campaign.category ?? ""}
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="story-sw" className="text-xs">Story (Swahili)</Label>
          <Textarea
            id="story-sw"
            value={storySw}
            onChange={(e) => setStorySw(e.target.value)}
            placeholder={campaign.story ?? ""}
            className="min-h-32"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Translation saved.
          </div>
        )}

        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          Save translation
        </Button>
      </div>
    </div>
  );
}

// ─── Completion report tab ──────────────────────────────────────────────────

const REPORT_STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: "bg-sky-50 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

function CompletionReportTab({
  campaignId,
  isAdmin,
  canSubmit,
  onReviewed,
}: {
  campaignId: string;
  isAdmin: boolean;
  canSubmit: boolean;
  onReviewed: () => void;
}) {
  const [report, setReport] = useState<CompletionReport | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await campaignApi.getCompletionReport(campaignId);
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the completion report.");
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (report === undefined) {
    return <div className="h-40 bg-card border border-border rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Submitted report</h2>
            <span
              className={cn(
                "text-[10px] font-medium border rounded-full px-2.5 py-1",
                REPORT_STATUS_BADGE[report.status]
              )}
            >
              {report.status.replace("_", " ")}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
            {report.amountUtilized != null && (
              <p className="text-xs text-muted-foreground">
                Amount utilized: <span className="font-medium text-foreground">{formatTZSFull(report.amountUtilized)}</span>
              </p>
            )}
            {report.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {report.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="Completion proof" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Submitted {new Date(report.submittedAt).toLocaleDateString()}
              {report.submittedBy ? ` by ${donorFullName(report.submittedBy)}` : ""}
            </p>
            {report.reviewedAt && (
              <p className="text-[11px] text-muted-foreground">
                Reviewed {new Date(report.reviewedAt).toLocaleDateString()}
                {report.reviewedBy ? ` by ${donorFullName(report.reviewedBy)}` : ""}
                {report.reviewNotes ? ` — "${report.reviewNotes}"` : ""}
              </p>
            )}

            {isAdmin && report.status === "PENDING_REVIEW" && (
              <ReviewReportForm
                campaignId={campaignId}
                onDone={() => {
                  load();
                  onReviewed();
                }}
              />
            )}
          </div>
        </div>
      )}

      {(!report || report.status === "REJECTED") && canSubmit && (
        <SubmitReportForm
          campaignId={campaignId}
          rejected={report?.status === "REJECTED"}
          onSubmitted={() => {
            load();
            onReviewed();
          }}
        />
      )}
      {(!report || report.status === "REJECTED") && !canSubmit && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Waiting for the assigned campaign manager to submit the completion proof.
        </div>
      )}
    </div>
  );
}

function SubmitReportForm({
  campaignId,
  rejected,
  onSubmitted,
}: {
  campaignId: string;
  rejected: boolean;
  onSubmitted: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [amountUtilized, setAmountUtilized] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (summary.trim().length < 20) {
      setError("Describe how the funds were used (at least 20 characters).");
      return;
    }
    if (images.length === 0) {
      setError("At least one photo is required as proof.");
      return;
    }
    setSubmitting(true);
    try {
      await campaignApi.submitCompletionReport(campaignId, {
        summary: summary.trim(),
        amountUtilized: amountUtilized ? Number(amountUtilized) : undefined,
        images,
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit the completion report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <UploadCloud className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {rejected ? "Resubmit completion proof" : "Submit completion proof"}
          </p>
          <p className="text-xs text-muted-foreground">
            A short summary of how the funds were used, plus at least one photo.
          </p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid gap-1.5">
          <Label className="text-xs">Summary</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe what the funds were spent on and the outcome…"
            className="min-h-24"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Amount utilized (TZS, optional)</Label>
          <Input
            type="number"
            min={0}
            value={amountUtilized}
            onChange={(e) => setAmountUtilized(e.target.value)}
            placeholder="e.g. 4800000"
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Proof photos (1–8)</Label>
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
            <ImageIcon className="w-3.5 h-3.5" />
            {images.length > 0 ? `${images.length} photo${images.length > 1 ? "s" : ""} selected` : "Choose photos"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 8))}
            />
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <Button size="sm" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          {rejected ? "Resubmit report" : "Submit report"}
        </Button>
      </div>
    </div>
  );
}

function ReviewReportForm({ campaignId, onDone }: { campaignId: string; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (approved: boolean) => {
    setActing(true);
    setError(null);
    try {
      await campaignApi.reviewCompletionReport(campaignId, { approved, notes: notes.trim() || undefined });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the review.");
      setActing(false);
    }
  };

  return (
    <div className="pt-4 border-t border-border space-y-3">
      <p className="text-xs font-semibold text-foreground">Review this report</p>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="min-h-16 text-sm"
      />
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => decide(true)} disabled={acting}>
          {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => decide(false)}
          disabled={acting}
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}

function AssignManagersDialog({
  campaignId,
  currentAssignments,
  onClose,
  onSaved,
}: {
  campaignId: string;
  currentAssignments: CampaignRecord["assignments"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(currentAssignments.map((a) => a.user.id))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi
      .list({ limit: 100 })
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await campaignApi.setManagers(campaignId, [...selectedIds]);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update managers.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Assign Campaign Managers</DialogTitle>
          <DialogDescription className="text-xs">
            Select users from your organization to assign to this campaign.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-40 bg-muted/40 rounded-lg animate-pulse" />
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {users.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No users found.</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    readOnly
                    className="accent-primary"
                  />
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                      {u.firstName[0]}{(u.lastName ?? "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {donorFullName(u)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{u.role}</span>
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Pool dialog ────────────────────────────────────────────────────────

function ImportPoolDialog({
  campaignId,
  onClose,
  onImported,
}: {
  campaignId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [pools, setPools] = useState<DonorPool[]>([]);
  const [poolIds, setPoolIds] = useState<number[]>([]);
  const [preview, setPreview] = useState<PoolImportPreview | null>(null);
  const [duplicateChoices, setDuplicateChoices] = useState<Record<number, number>>({});
  const [loadingPools, setLoadingPools] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) =>
    setPoolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  useEffect(() => {
    setLoadingPools(true);
    poolApi
      .list({ limit: 100 })
      .then((r) => setPools(r.pools.filter((p) => !p.isSystem)))
      .catch(() => undefined)
      .finally(() => setLoadingPools(false));
  }, []);

  const runPreview = async () => {
    if (poolIds.length === 0) return;
    setPreviewing(true);
    setError(null);
    try {
      const p = await campaignApi.previewPools(campaignId, poolIds);
      setPreview(p);
      const defaults: Record<number, number> = {};
      p.duplicateGroups.forEach((g) => {
        defaults[g.donorId] = g.pools[0]?.id;
      });
      setDuplicateChoices(defaults);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setPreviewing(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const choices = Object.entries(duplicateChoices).map(([donorId, poolId]) => ({
        donorId: Number(donorId),
        poolId,
      }));
      await campaignApi.importPools(campaignId, {
        poolIds,
        duplicateChoices: choices.length > 0 ? choices : undefined,
      });
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Import donors into campaign</DialogTitle>
          <DialogDescription className="text-xs">
            Track donor-by-donor expected amounts and payment status for this
            campaign. Donors already tracked are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Select pools to import</Label>
            {loadingPools ? (
              <div className="h-20 bg-muted/40 rounded-lg animate-pulse" />
            ) : pools.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                No custom donor pools available.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {pools.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                      poolIds.includes(p.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <input type="checkbox" checked={poolIds.includes(p.id)} readOnly className="accent-primary" />
                    <span className="font-medium text-foreground truncate flex-1">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.memberCount}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={runPreview}
            disabled={poolIds.length === 0 || previewing}
          >
            {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Target className="w-3.5 h-3.5 mr-1" />}
            Preview import
          </Button>

          {preview && (
            <div className="rounded-lg border border-border divide-y divide-border">
              <div className="px-4 py-3">
                <p className="text-xs font-medium text-foreground">
                  {preview.donors.length} donors to add
                </p>
                {preview.duplicateGroups.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {preview.duplicateGroups.length} donor(s) appear in more than one
                    selected pool — choose which pool each should stay in below.
                  </p>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto px-4 py-2 divide-y divide-border">
                {preview.donors.map((d) => (
                  <div key={d.donorId} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {donorFullName(d)}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {d.phone || d.email || "No contact"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      will be tracked
                    </span>
                  </div>
                ))}
              </div>

              {preview.duplicateGroups.length > 0 && (
                <div className="px-4 py-3 space-y-3 bg-amber-50/50">
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                    Resolve duplicates
                  </p>
                  {preview.duplicateGroups.map((g) => {
                    const donor = preview.donors.find((d) => d.donorId === g.donorId);
                    return (
                      <div key={g.donorId} className="space-y-1">
                        <p className="text-xs font-medium text-foreground">
                          {donor ? donorFullName(donor) : `Donor #${g.donorId}`}
                        </p>
                        <Select
                          value={String(duplicateChoices[g.donorId] ?? "")}
                          onValueChange={(v) =>
                            setDuplicateChoices((prev) => ({ ...prev, [g.donorId]: Number(v) }))
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Choose pool to keep" />
                          </SelectTrigger>
                          <SelectContent>
                            {g.pools.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button size="sm" onClick={runImport} disabled={poolIds.length === 0 || importing}>
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Import className="w-3.5 h-3.5 mr-1" />}
            Import {poolIds.length > 0 ? `(${poolIds.length} pool${poolIds.length > 1 ? "s" : ""})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reminder dialog ───────────────────────────────────────────────────────────

function ReminderDialog({
  campaignId,
  campaignName,
  donorIds,
  donors,
  onClose,
  onSent,
}: {
  campaignId: string;
  campaignName: string;
  donorIds: number[];
  donors: CampaignTargetsResponse["targets"][number]["donor"][];
  onClose: () => void;
  onSent: () => void;
}) {
  const [channel, setChannel] = useState<ReminderChannel>("SMS");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ recipientCount: number } | null>(null);

  useEffect(() => {
    setTemplateId("");
    templateApi
      .list({ channel, limit: 100 })
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, [channel]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => String(t.id) === id);
    if (tpl) {
      setMessage(tpl.body);
      if (tpl.subject) setSubject(tpl.subject);
    }
  };

  const ready =
    donorIds.length > 0 &&
    (channel === "SMS" || channel === "WHATSAPP"
      ? message.trim().length >= 2
      : subject.trim().length >= 2 && message.trim().length >= 2);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await poolApi.sendReminder({
        campaignId: Number(campaignId),
        donorIds,
        channel,
        subject: channel === "EMAIL" ? subject : undefined,
        message,
      });
      setSent({ recipientCount: r.batch.recipientCount });
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reminders.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Send reminder to {donorIds.length} donor{donorIds.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-xs">
            We&apos;ll only message donors with consent and a working contact for the
            chosen channel.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <ReminderSent recipientCount={sent.recipientCount} onClose={onClose} />
        ) : (
          <div className="space-y-4">
            <div className="max-h-32 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {donors.map((d) => (
                <div key={d.id} className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate">
                    {donorFullName(d)}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {d.phone || d.email || "no contact"}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel((v ?? "SMS") as ReminderChannel)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Use a saved template (optional)</Label>
                <Select value={templateId} onValueChange={(v) => applyTemplate(v ?? "")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Write my own message" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {channel === "EMAIL" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input
                  className="h-9 text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={`Reminder about ${campaignName}`}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                rows={4}
                className="text-sm resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Friendly note prompting them to complete their pledge."
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button size="sm" onClick={send} disabled={!ready || sending}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <BellRing className="w-3.5 h-3.5 mr-1" />}
                Send reminders
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReminderSent({
  recipientCount,
  onClose,
}: {
  recipientCount: number;
  onClose: () => void;
}) {
  return (
    <div className="py-6 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 mx-auto flex items-center justify-center mb-3">
        <Check className="w-6 h-6 text-emerald-600" />
      </div>
      <p className="text-sm font-semibold text-foreground">Reminders sent</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        {recipientCount} reminder{recipientCount !== 1 ? "s" : ""} queued for delivery.
      </p>
      <Button size="sm" onClick={onClose}>Done</Button>
    </div>
  );
}