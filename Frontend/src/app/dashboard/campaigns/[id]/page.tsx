"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Banknote,
  BellRing,
  Calendar,
  Building2,
  Check,
  ChevronDown,
  FileWarning,
  Flag,
  Gift,
  Heart,
  ImageIcon,
  Import,
  Landmark,
  Loader2,
  MapPin,
  Megaphone,
  MoreHorizontal,
  PackageCheck,
  Pause,
  Phone,
  Play,
  Truck,
  ShieldCheck,
  Smartphone,
  Star,
  Target,
  Trash2,
  UploadCloud,
  UserRound,
  Wallet,
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
  payoutApi,
  poolApi,
  templateApi,
  userApi,
  donorFullName,
  formatTZSFull,
  formatTZSCompact,
  PAY_STATUS_META,
  type CampaignRecord,
  type ReviewTrailEntry,
  type CampaignTargetsResponse,
  type CampaignTarget,
  type CampaignGift,
  type GiftStatus,
  type CompletionReport,
  type ClosureRequest,
  type PayoutRecord,
  type PayoutMethod,
  type PayoutCheckoutInput,
  type PoolImportPreview,
  type DonorPool,
  type MessageTemplate,
  type ReminderChannel,
  type UserRecord,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { ExportMenu } from "@/components/dashboard/export-menu";
import { ImportWizard } from "@/components/dashboard/import-wizard";
import { cn } from "@/lib/dashboard/utils";
import {
  SortableTh,
  useTableSort,
  type SortAccessors,
} from "@/components/dashboard/ui/sortable-table";
import { CampaignPhotosCard } from "@/components/dashboard/campaigns/campaign-photos-card";
import { ReviewDecisionDialog } from "@/components/dashboard/campaigns/review-decision-dialog";
import { ReviewTimeline } from "@/components/dashboard/widgets/review-timeline";
import { PendingResendsPanel } from "@/components/dashboard/reminders/pending-resends-panel";
import { SchedulesPanel } from "@/components/dashboard/reminders/schedules-panel";
import { TemplatesPanel } from "@/components/dashboard/reminders/templates-panel";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  PENDING: "bg-orange-50 text-orange-700 border-orange-200",
  REVIEWED: "bg-blue-50 text-blue-700 border-blue-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-sky-50 text-sky-700 border-sky-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    isSuperAdmin,
    isOrgAdmin,
    isCampaignManager,
    isReviewer,
    hasPermission,
    canReviewCampaign,
    canFinalApproveCampaign,
    user,
  } = useRole();
  const isAdmin = isSuperAdmin || isOrgAdmin;
  // A REVIEWER has no Campaigns list — they arrive here from the Approvals
  // queue, so that's where "Back" returns them.
  const backHref = isReviewer
    ? "/dashboard/approvals"
    : "/dashboard/campaigns";
  const backLabel = isReviewer ? "Back to Approvals" : "Back to Campaigns";
  // REVIEWER can approve too (two-stage chain) — isAdmin above stays reserved
  // for admin-only actions (delete, feature) further down this page.
  const canApproveRole = hasPermission("campaign:approve");
  const uid = user ? String(user.id) : null;
  const [reviewDialog, setReviewDialog] = useState<
    null | { kind: "campaign" | "change-request"; action: "reject" | "request_changes" }
  >(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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
      <div>
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
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {backLabel}
        </Button>
      </div>
    );
  }

  const progress =
    campaign.publicTarget > 0
      ? Math.min(100, Math.round((campaign.raisedAmount / campaign.publicTarget) * 100))
      : 0;
  const summary = board?.summary;

  // Editing a campaign's content is for the people who build it: its creator,
  // an assigned manager, or a super admin. An ORG_ADMIN only edits campaigns
  // they created themselves — for anyone else's they use "Request changes".
  const isCreator = String(campaign.createdBy ?? "") === uid;
  const isAssignedManager =
    isCampaignManager && !!campaign.assignments?.some((a) => String(a.user.id) === uid);
  const canEditContent = isSuperAdmin || isCreator || isAssignedManager;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {backLabel}
        </Button>
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
      {campaign.latestClosureRequest?.status === "PENDING" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            A request to close this campaign is waiting for review in the <strong>Payout</strong> tab.
          </span>
        </div>
      )}
      {campaign.latestClosureRequest?.status === "REJECTED" && (campaign.status === "ACTIVE" || campaign.status === "PAUSED") && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            The last closure request was rejected — see the <strong>Payout</strong> tab for the reason and to request again.
          </span>
        </div>
      )}
      {campaign.reviewState === "CHANGES_REQUESTED" && campaign.reviewNotes && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Changes requested by a reviewer:</strong> {campaign.reviewNotes}
            {(campaign.status === "PENDING" || campaign.status === "REVIEWED") && (
              <>
                {" "}
                <Link href={`/dashboard/campaigns/${id}/edit`} className="underline">
                  Edit the campaign
                </Link>{" "}
                to address this and re-submit.
              </>
            )}
          </span>
        </div>
      )}
      {campaign.changeRequest &&
        ["PENDING", "REVIEWED"].includes(campaign.changeRequest.status) && (
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {campaign.changeRequest.kind === "STATUS" ? (
                <>
                  A request to{" "}
                  {campaign.changeRequest.statusAction === "PAUSE" ? "suspend" : "resume"} this
                  campaign is{" "}
                  {campaign.changeRequest.status === "REVIEWED"
                    ? "waiting on an admin's final approval"
                    : "awaiting a reviewer's first approval"}
                  . Nothing changes until it clears. See the <strong>Changes</strong> tab.
                </>
              ) : (
                <>
                  This campaign has edits{" "}
                  {campaign.changeRequest.status === "REVIEWED"
                    ? "with first approval done, waiting on an admin"
                    : "awaiting a reviewer's first approval"}
                  . The public page keeps showing the last-approved version until they
                  clear. See the <strong>Changes</strong> tab.
                </>
              )}
            </span>
          </div>
        )}

      {campaign.status === "REJECTED" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>This campaign was rejected by a reviewer.</strong>
            {campaign.reviewNotes ? <> Reason: {campaign.reviewNotes}</> : null}
            {canEditContent && (
              <>
                {" "}
                <Link href={`/dashboard/campaigns/${id}/edit`} className="underline">
                  Edit the campaign
                </Link>{" "}
                to address it, then re-submit for approval — it goes back to a
                reviewer for a fresh first approval.
              </>
            )}
          </span>
        </div>
      )}

      {campaign.status === "DRAFT" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <FileWarning className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            This campaign is a <strong>draft</strong> — only your team can see it.
            Add the details, cover photo and any donor pools or donors, then{" "}
            <strong>Submit for approval</strong>. Adding donors or importing pools
            doesn&apos;t need review; the campaign does — first a reviewer, then an
            admin.
          </span>
        </div>
      )}

      {(campaign.status === "PENDING" || campaign.status === "REVIEWED") &&
        campaign.reviewState !== "CHANGES_REQUESTED" && (
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This campaign is awaiting activation approval —{" "}
              <strong>
                {campaign.status === "PENDING"
                  ? "Stage 1 of 2"
                  : "Stage 2 of 2"}
              </strong>{" "}
              {campaign.status === "PENDING"
                ? "(a reviewer's first approval)"
                : "(an org admin's final approval)"}
              . It goes live once both approvals are in — see the{" "}
              <strong>History</strong> tab for the full trail.
            </span>
          </div>
        )}

      {campaign.openPayoutRequest && (
        <div className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            A payout of{" "}
            <strong>{formatTZSFull(campaign.openPayoutRequest.amount)}</strong>{" "}
            {campaign.openPayoutRequest.status === "REQUESTED" && (
              <>is in review — <strong>Stage 1 of 2</strong> (a reviewer&apos;s first approval).</>
            )}
            {campaign.openPayoutRequest.status === "REVIEWED" && (
              <>is in review — <strong>Stage 2 of 2</strong> (an org admin&apos;s final approval).</>
            )}
            {campaign.openPayoutRequest.status === "AWAITING_CHECKOUT" && (
              <>
                is approved — <strong>add the payout details</strong> (mobile money or
                bank) in the <strong>Payout</strong> tab to release it.
              </>
            )}
            {campaign.openPayoutRequest.status === "APPROVED" && (
              <>has its payout details in — waiting for the transfer to be made.</>
            )}{" "}
            See the <strong>Payout</strong> tab.
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
                {campaign.organizationName && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {campaign.organizationName}
                  </span>
                )}
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
              {campaign.hasPendingChanges && (
                <span className="text-[10px] font-medium border rounded-full px-2.5 py-1 bg-sky-50 text-sky-700 border-sky-200">
                  Changes pending review
                </span>
              )}
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
              {(campaign.status === "DRAFT" || campaign.status === "REJECTED") &&
                canEditContent &&
                (() => {
                  const isResubmit = campaign.status === "REJECTED";
                  // The essentials POST /:id/submit enforces server-side — mirror
                  // them here so the button explains what's still missing.
                  const missing = [
                    !campaign.imageUrl && "a cover photo",
                    !campaign.contactPhone && "a contact phone",
                    (!campaign.startDate || !campaign.endDate) && "start and end dates",
                  ].filter(Boolean) as string[];
                  return (
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
                        disabled={acting || missing.length > 0}
                        title={
                          missing.length > 0
                            ? `Add ${missing.join(", ")} before submitting`
                            : undefined
                        }
                        onClick={() => act(() => campaignApi.submit(id))}
                      >
                        {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                        {isResubmit ? "Re-submit for approval" : "Submit for approval"}
                      </Button>
                    </>
                  );
                })()}
              {(campaign.status === "PENDING" || campaign.status === "REVIEWED") &&
                (() => {
                  const stage = campaign.status === "PENDING" ? 1 : 2;
                  // Sent back for changes — parked with the manager to re-edit
                  // and resubmit; no reviewer action until it comes back.
                  if (stage === 1 && campaign.reviewState === "CHANGES_REQUESTED") {
                    return canApproveRole ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        Sent back for changes — waiting for the manager to resubmit
                      </span>
                    ) : null;
                  }
                  const canActThisStage =
                    stage === 1 ? canReviewCampaign : canFinalApproveCampaign;
                  const isCreator = String(campaign.createdBy ?? "") === uid;
                  const isOwnFirst =
                    stage === 2 && String(campaign.firstApprovedBy ?? "") === uid;
                  if (!canActThisStage) {
                    return canApproveRole ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        {stage === 1
                          ? "Waiting for a reviewer's first approval"
                          : "Waiting for an admin's final approval"}
                      </span>
                    ) : null;
                  }
                  if (isCreator || isOwnFirst) {
                    return (
                      <span className="text-[11px] text-muted-foreground italic">
                        {isCreator
                          ? "You created this — another reviewer/admin must approve it"
                          : "You gave the first approval — a different admin gives the final one"}
                      </span>
                    );
                  }
                  return (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setReviewDialog({ kind: "campaign", action: "request_changes" })
                        }
                      >
                        Request changes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setReviewDialog({ kind: "campaign", action: "reject" })}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={acting}
                        onClick={() => act(() => campaignApi.approve(id))}
                      >
                        {acting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        {stage === 2 ? "Give final approval" : "Give first approval"}
                      </Button>
                    </>
                  );
                })()}
              {isAdmin && campaign.status === "ACTIVE" && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md h-8 px-3 text-sm font-medium border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Actions
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => act(() => campaignApi.changeStatus(id, "PAUSED"))}
                    >
                      <Pause className="w-3.5 h-3.5 mr-1.5" />
                      Pause Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => act(() => campaignApi.changeStatus(id, "COMPLETED"))}
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Complete Campaign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => act(() => campaignApi.changeStatus(id, "CANCELLED"))}
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
                      onClick={() => act(() => campaignApi.changeStatus(id, "ACTIVE"))}
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Resume Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => act(() => campaignApi.changeStatus(id, "COMPLETED"))}
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Complete Campaign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => act(() => campaignApi.changeStatus(id, "CANCELLED"))}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cancel Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {isAdmin &&
                (campaign.status === "DRAFT" ||
                  campaign.status === "PENDING" ||
                  campaign.status === "REVIEWED" ||
                  campaign.status === "REJECTED") && (
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
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {campaign.changeRequest &&
            ["PENDING", "REVIEWED", "CHANGES_REQUESTED"].includes(
              campaign.changeRequest.status
            ) && (
              <TabsTrigger value="changes">
                Changes
                {["PENDING", "REVIEWED"].includes(campaign.changeRequest.status) &&
                  " (review needed)"}
              </TabsTrigger>
            )}
          {(campaign.status === "ACTIVE" || campaign.status === "PAUSED" || campaign.status === "COMPLETED") && (
            <TabsTrigger value="payout">
              Payout
              {campaign.openPayoutRequest?.status === "AWAITING_CHECKOUT"
                ? " (action needed)"
                : campaign.latestClosureRequest?.status === "PENDING" && " (review needed)"}
            </TabsTrigger>
          )}
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
            <CampaignPhotosCard
              campaignId={id}
              images={campaign.images ?? []}
              canManage={canEditContent}
              onChanged={refresh}
            />
          </div>
        </TabsContent>

        <TabsContent value="board" className="pt-2 space-y-6">
          <DonorBoardTab
            board={board}
            selected={selected}
            selectableCount={selectableTargets.length}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onUpdated={refresh}
            canManage={isAdmin}
            canImport={isAdmin || isCampaignManager}
            onImport={() => setImportOpen(true)}
            onSetExpected={(donorId, amount) =>
              act(() => campaignApi.setTargetExpected(id, donorId, amount))
            }
            onRemoveTarget={(donorId) =>
              act(() => campaignApi.removeTarget(id, donorId))
            }
          />
          <CampaignGiftsSection
            campaignId={id}
            donors={(board?.targets ?? []).map((t) => ({
              id: t.donor.id,
              name: donorFullName(t.donor),
            }))}
            canManage={isAdmin || isCampaignManager}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="donations" className="pt-2">
          <DonationsList
            donations={campaign.donations ?? []}
            campaignId={id}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="user" className="pt-2">
          <UserTab
            assignments={campaign.assignments ?? []}
            campaignId={id}
            isAdmin={isAdmin}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="reminders" className="pt-2">
          <CampaignRemindersTab
            campaignId={id}
            hasTrackedDonors={Boolean(summary && summary.totalTargets > 0)}
            hasUnpaidDonors={selectableTargets.length > 0}
            canManage={isAdmin || isCampaignManager}
            onSendNow={() => setReminderOpen(true)}
          />
        </TabsContent>

        <TabsContent value="history" className="pt-2">
          <CampaignHistoryTab campaignId={id} />
        </TabsContent>

        {(campaign.status === "ACTIVE" || campaign.status === "PAUSED" || campaign.status === "COMPLETED") && (
          <TabsContent value="payout" className="pt-2">
            <PayoutRequestTab
              campaignId={id}
              campaignStatus={campaign.status}
              campaignRaised={campaign.raisedAmount}
              isAdmin={isAdmin}
              canRequestPayout={isCampaignManager}
              canCheckout={isCampaignManager || isOrgAdmin}
              canReviewClosure={canApproveRole}
              canRequestClosure={
                isCampaignManager &&
                (campaign.status === "ACTIVE" || campaign.status === "PAUSED")
              }
              onChanged={refresh}
            />
          </TabsContent>
        )}

        {campaign.status === "COMPLETED" && (
          <TabsContent value="completion" className="pt-2">
            <CompletionReportTab
              campaignId={id}
              canReview={canApproveRole}
              canSubmit={isCampaignManager}
              onReviewed={refresh}
            />
          </TabsContent>
        )}

        {campaign.changeRequest &&
          ["PENDING", "REVIEWED", "CHANGES_REQUESTED"].includes(
            campaign.changeRequest.status
          ) && (
            <TabsContent value="changes" className="pt-2">
              <ChangeRequestTab
                campaignId={id}
                campaign={campaign}
                canReview={canReviewCampaign}
                canFinalApprove={canFinalApproveCampaign}
                currentUserId={uid}
                acting={acting}
                onApprove={() =>
                  act(() =>
                    campaignApi.decideChangeRequest(id, campaign.changeRequest!.id, {
                      action: "approve",
                    })
                  )
                }
                onNegative={() => setReviewDialog({ kind: "change-request", action: "reject" })}
                onRequestChanges={() =>
                  setReviewDialog({ kind: "change-request", action: "request_changes" })
                }
              />
            </TabsContent>
          )}
      </Tabs>

      {reviewDialog && campaign && (
        <ReviewDecisionDialog
          open
          onOpenChange={(v) => !v && setReviewDialog(null)}
          action={reviewDialog.action}
          submitting={reviewSubmitting}
          onSubmit={async (notes) => {
            setReviewSubmitting(true);
            try {
              if (reviewDialog.kind === "campaign") {
                if (reviewDialog.action === "reject") await campaignApi.reject(id, notes);
                else await campaignApi.requestChanges(id, notes);
              } else {
                await campaignApi.decideChangeRequest(id, campaign.changeRequest!.id, {
                  action: reviewDialog.action,
                  notes,
                });
              }
              setReviewDialog(null);
              await refresh();
            } catch (e) {
              setActError(e instanceof Error ? e.message : "Action failed.");
            } finally {
              setReviewSubmitting(false);
            }
          }}
        />
      )}

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
          donorIds={
            selected.size > 0
              ? [...selected]
              : selectableTargets.map((t) => t.donor.id)
          }
          donors={
            selected.size > 0
              ? board.targets
                  .filter((t) => selected.has(t.donor.id))
                  .map((t) => t.donor)
              : selectableTargets.map((t) => t.donor)
          }
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

type BoardColumn = "donor" | "pool" | "expected" | "paid" | "status";

const BOARD_STATUS_ORDER = { PAID_FULL: 2, PARTIAL: 1, UNPAID: 0 } as const;

const boardColumnAccessors: SortAccessors<CampaignTarget, BoardColumn> = {
  donor: (t) => donorFullName(t.donor).toLowerCase(),
  pool: (t) => t.pool?.name?.toLowerCase() ?? "",
  expected: (t) => t.expectedAmount ?? null,
  paid: (t) => t.paidAmount ?? 0,
  status: (t) => BOARD_STATUS_ORDER[t.status] ?? 0,
};

function DonorBoardTab({
  board,
  selected,
  selectableCount,
  onToggleSelect,
  onToggleAll,
  onUpdated,
  canManage,
  canImport,
  onImport,
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
  canImport: boolean;
  onImport: () => void;
  onSetExpected: (donorId: number, amount: number | null) => void;
  onRemoveTarget: (donorId: number) => void;
}) {
  const [inline, setInline] = useState<{ donorId: number; value: string } | null>(null);

  const {
    sorted: sortedTargets,
    sort: colSort,
    toggle: toggleColSort,
  } = useTableSort(board?.targets ?? [], boardColumnAccessors, {
    key: "status",
    dir: "desc",
  });

  if (!board || board.targets.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl py-16 text-center">
        <FileWarning className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No tracked donors yet. Import a donor pool to start tracking who pays.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {canImport && (
            <Button size="sm" onClick={onImport}>
              <Import className="w-3.5 h-3.5 mr-1.5" />
              Import Pool
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onUpdated}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          {selectableCount > 0 && (
            <Button size="xs" variant="outline" onClick={onToggleAll}>
              {selected.size === selectableCount && selected.size > 0
                ? "Clear selection"
                : "Select all unpaid"}
            </Button>
          )}
          {canImport && (
            <Button size="xs" variant="outline" onClick={onImport}>
              <Import className="w-3.5 h-3.5 mr-1.5" />
              Import Pool
            </Button>
          )}
        </div>
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
              <SortableTh sortKey="donor" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Donor
              </SortableTh>
              <SortableTh sortKey="pool" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden md:table-cell">
                Pool
              </SortableTh>
              <SortableTh sortKey="expected" sort={colSort} onSort={toggleColSort} align="right" className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Expected
              </SortableTh>
              <SortableTh sortKey="paid" sort={colSort} onSort={toggleColSort} align="right" className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">
                Paid
              </SortableTh>
              <SortableTh sortKey="status" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 hidden sm:table-cell">
                Status
              </SortableTh>
              <th className="text-right px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTargets.map((t) => (
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
                onClick={() => setInline({ donorId: target.donor.id, value: target.expectedAmount?.toString() ?? "" })}
              >
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Edit expected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemoveTarget(target.donor.id)}
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
  onChanged,
}: {
  donations: CampaignRecord["donations"];
  campaignId: string;
  onChanged?: () => void;
}) {
  const { hasPermission, isOrgAdmin } = useRole();
  const canImport =
    isOrgAdmin || hasPermission("donor:add") || hasPermission("donor:manage");
  const [importOpen, setImportOpen] = useState(false);
  const total = (donations ?? []).reduce((s, d) => s + d.amount, 0);

  const toolbar = (
    <div className="flex items-center gap-2">
      <ExportMenu dataset="donations" params={{ campaignId }} label="Export" />
      {canImport && (
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
          Import
        </Button>
      )}
    </div>
  );

  const importDialog = (
    <Dialog open={importOpen} onOpenChange={setImportOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import offline contributions</DialogTitle>
          <DialogDescription>
            Each row is recorded as a confirmed contribution against this campaign and
            updates its raised total. The campaign must be ACTIVE.
          </DialogDescription>
        </DialogHeader>
        <ImportWizard
          dataset="donations"
          params={{ campaignId }}
          columns={[
            { field: "amount", required: true, help: "Whole TZS amount" },
            { field: "donor_phone", help: "Links to an existing donor" },
            { field: "donor_name" },
            { field: "is_anonymous", help: "true / false" },
          ]}
          description="Each row becomes a confirmed contribution."
          onImported={() => onChanged?.()}
        />
      </DialogContent>
    </Dialog>
  );

  if (!donations || donations.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{toolbar}</div>
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No donations recorded for this campaign yet.
          </p>
        </div>
        {importDialog}
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">All donations</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total {formatTZSFull(total)}
          </p>
        </div>
        {toolbar}
      </div>
      {importDialog}
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

// ─── Reminders tab (per-campaign) ──────────────────────────────────────────
//
// Reminders have no standalone dashboard page — everything lives here, scoped to
// this one campaign: a one-off send, the pending auto-resend cycles waiting for
// confirmation, the auto-resend schedules that target this campaign, and the
// (org-wide) reusable message templates.

function CampaignRemindersTab({
  campaignId,
  hasTrackedDonors,
  hasUnpaidDonors,
  canManage,
  onSendNow,
}: {
  campaignId: string;
  hasTrackedDonors: boolean;
  hasUnpaidDonors: boolean;
  canManage: boolean;
  onSendNow: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Send a reminder now</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            A one-off nudge to this campaign&apos;s unpaid / partial donors — you
            pick the recipients, channel and message.
          </p>
        </div>
        {canManage && (
          <Button size="sm" disabled={!hasUnpaidDonors} onClick={onSendNow}>
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            Send reminder
          </Button>
        )}
      </div>
      {!hasTrackedDonors ? (
        <p className="text-[11px] text-muted-foreground -mt-4">
          Import a donor pool on the Donor Board tab first — reminders go to tracked donors.
        </p>
      ) : (
        !hasUnpaidDonors && (
          <p className="text-[11px] text-muted-foreground -mt-4">
            Every tracked donor has paid in full — there&apos;s no one to remind right now.
          </p>
        )
      )}

      <PendingResendsPanel campaignId={Number(campaignId)} />

      <div className="border-t border-border" />

      <SchedulesPanel campaignId={Number(campaignId)} canManage={canManage} />

      <div className="border-t border-border" />

      <TemplatesPanel canManage={canManage} />
    </div>
  );
}

// ─── History / review timeline tab ─────────────────────────────────────────

/**
 * Full chronological trail of everything a campaign has been through —
 * submitted, first-reviewed, sent back (with the reason), edited (with which
 * fields changed), re-submitted, approved. Everyone with campaign access sees
 * the same timeline, so a reviewer picking a campaign back up can see exactly
 * why an admin sent it back and what the manager changed since.
 */
function CampaignHistoryTab({ campaignId }: { campaignId: string }) {
  const [entries, setEntries] = useState<ReviewTrailEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    campaignApi
      .history(campaignId)
      .then((r) => {
        if (!cancelled) setEntries(r);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load the campaign history.");
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (entries === null) {
    return <div className="h-40 bg-card border border-border rounded-xl animate-pulse" />;
  }

  return (
    <ReviewTimeline
      entries={entries}
      title="Review history"
      subtitle="Every step this campaign has gone through, most recent first."
    />
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
  canReview,
  canSubmit,
  onReviewed,
}: {
  campaignId: string;
  /** REVIEWER / ORG_ADMIN / SUPER_ADMIN — may approve/reject the report. */
  canReview: boolean;
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

            {canReview && report.status === "PENDING_REVIEW" && (
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
  const [touched, setTouched] = useState(false);

  const decide = async (action: "approve" | "request_changes" | "reject") => {
    if (action !== "approve" && notes.trim().length < 10) {
      setTouched(true);
      return;
    }
    setActing(true);
    setError(null);
    try {
      await campaignApi.reviewCompletionReport(campaignId, {
        action,
        notes: notes.trim() || undefined,
      });
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
        placeholder="Notes — required to reject or request changes"
        className="min-h-16 text-sm"
      />
      {touched && notes.trim().length < 10 && (
        <p className="text-xs text-destructive">
          A reason of at least 10 characters is required to reject or request changes.
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => decide("approve")} disabled={acting}>
          {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => decide("request_changes")}
          disabled={acting}
        >
          Request changes
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => decide("reject")}
          disabled={acting}
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}

// ─── Closure request helpers (rendered inside the Payout tab) ────────────────

const REQUEST_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-sky-50 text-sky-700 border-sky-200",
  REQUESTED: "bg-sky-50 text-sky-700 border-sky-200",
  REVIEWED: "bg-violet-50 text-violet-700 border-violet-200",
  AWAITING_CHECKOUT: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Human labels for a payout's status (the raw enum is terse / ALL-CAPS). */
const PAYOUT_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "In first review",
  REVIEWED: "Awaiting final approval",
  AWAITING_CHECKOUT: "Approved — awaiting payout details",
  APPROVED: "Ready to be paid",
  PAID: "Paid",
  REJECTED: "Rejected",
};

/** Tanzanian mobile-money providers offered on the payout checkout form. */
const MOBILE_MONEY_PROVIDERS = [
  "M-Pesa",
  "Airtel Money",
  "Tigo Pesa (Mixx by Yas)",
  "HaloPesa",
  "Azam Pesa",
  "T-Pesa",
] as const;

function RequestClosureDialog({
  campaignId,
  rejected,
  onClose,
  onSubmitted,
}: {
  campaignId: string;
  rejected: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (reason.trim().length < 10) {
      setError("Explain why this campaign should close (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await campaignApi.requestClosure(campaignId, { reason: reason.trim() });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit the closure request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {rejected ? "Request closure again" : "Request to close this campaign"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Closing settles the campaign — a reviewer then an admin approve it, and
            once complete you can request the remaining balance as a payout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why should this campaign close now?"
            className="min-h-24"
            autoFocus
          />
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {rejected ? "Request again" : "Request closure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideClosureForm({
  campaignId,
  requestId,
  onDone,
}: {
  campaignId: string;
  requestId: number;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const decide = async (action: "approve" | "request_changes" | "reject") => {
    if (action !== "approve" && notes.trim().length < 10) {
      setTouched(true);
      return;
    }
    setActing(true);
    setError(null);
    try {
      await campaignApi.decideClosureRequest(campaignId, requestId, {
        action,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the decision.");
      setActing(false);
    }
  };

  return (
    <div className="pt-2 space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes — required to reject or request changes"
        className="min-h-16 text-sm"
      />
      {touched && notes.trim().length < 10 && (
        <p className="text-xs text-destructive">
          A reason of at least 10 characters is required to reject or request changes.
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="xs" onClick={() => decide("approve")} disabled={acting}>
          {acting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
          Approve (completes campaign)
        </Button>
        <Button size="xs" variant="outline" onClick={() => decide("request_changes")} disabled={acting}>
          Request changes
        </Button>
        <Button
          size="xs"
          variant="destructive"
          onClick={() => decide("reject")}
          disabled={acting}
        >
          <XCircle className="w-3 h-3 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}

// ─── In-kind gifts (non-monetary contributions) ─────────────────────────────

function CampaignGiftsSection({
  campaignId,
  donors,
  canManage,
  onChanged,
}: {
  campaignId: string;
  donors: { id: number; name: string }[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [gifts, setGifts] = useState<CampaignGift[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setGifts(await campaignApi.listGifts(campaignId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gifts.");
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (giftId: number) => {
    setRemovingId(giftId);
    try {
      await campaignApi.removeGift(campaignId, giftId);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove the gift.");
    } finally {
      setRemovingId(null);
    }
  };

  const setStatus = async (giftId: number, status: GiftStatus) => {
    setBusyId(giftId);
    try {
      await campaignApi.updateGiftStatus(campaignId, giftId, status);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update the gift.");
    } finally {
      setBusyId(null);
    }
  };

  if (gifts === undefined) {
    return <div className="h-40 bg-card border border-border rounded-xl animate-pulse" />;
  }

  const total = gifts
    .filter((g) => g.status !== "CANCELLED")
    .reduce((s, g) => s + g.estimatedValue, 0);
  const pledgedCount = gifts.filter((g) => g.status === "PLEDGED").length;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">In-kind gifts</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {pledgedCount > 0 ? `${pledgedCount} pledged · ` : ""}
            {gifts.length} gift{gifts.length === 1 ? "" : "s"} &middot;{" "}
            {formatTZSFull(total)} est.
          </span>
        </div>

        {gifts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No gifts recorded. Not every contribution is money — supporters can
            pledge goods from the campaign page, or you can log donated goods,
            services or time here with an estimated value.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {gifts.map((g) => (
              <li key={g.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-foreground">{g.description}</p>

                  {g.source === "PUBLIC" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300">
                        <Gift className="w-3 h-3" /> Gift donor · pledged via campaign page
                      </span>
                      {g.deliveryMethod === "PICKUP" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                          <Truck className="w-3 h-3" /> Pickup needed
                        </span>
                      ) : g.deliveryMethod === "DROP_OFF" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          <PackageCheck className="w-3 h-3" /> Donor will deliver
                        </span>
                      ) : null}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    {formatTZSFull(g.estimatedValue)} est.
                    {g.donorName ? ` · ${g.donorName}` : ""}
                    {g.donorPhone ? ` · ${g.donorPhone}` : ""}
                    {g.donorEmail ? ` · ${g.donorEmail}` : ""}
                  </p>

                  {(g.pickupAddress || g.preferredDate) && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {g.pickupAddress && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {g.pickupAddress}
                        </span>
                      )}
                      {g.preferredDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {new Date(g.preferredDate).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}

                  {g.note && (
                    <p className="text-[11px] italic text-muted-foreground">“{g.note}”</p>
                  )}

                  {g.source === "STAFF" && g.receivedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      Received {new Date(g.receivedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {g.source === "PUBLIC" && (
                      <Select
                        value={g.status}
                        onValueChange={(v) => setStatus(g.id, v as GiftStatus)}
                        disabled={busyId === g.id}
                      >
                        <SelectTrigger className="h-7 w-[8.5rem] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLEDGED">Pledged</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="RECEIVED">Received</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => remove(g.id)}
                      disabled={removingId === g.id}
                    >
                      {removingId === g.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <AddGiftForm
          campaignId={campaignId}
          donors={donors}
          onAdded={() => {
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AddGiftForm({
  campaignId,
  donors,
  onAdded,
}: {
  campaignId: string;
  donors: { id: number; name: string }[];
  onAdded: () => void;
}) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [donorId, setDonorId] = useState("none");
  const [receivedAt, setReceivedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (description.trim().length < 1) {
      setError("Describe the gift.");
      return;
    }
    const estimatedValue = Math.max(0, Math.round(Number(value) || 0));
    setSubmitting(true);
    try {
      await campaignApi.addGift(campaignId, {
        description: description.trim(),
        estimatedValue,
        donorId: donorId === "none" ? undefined : Number(donorId),
        receivedAt: receivedAt || undefined,
      });
      setDescription("");
      setValue("");
      setDonorId("none");
      setReceivedAt("");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the gift.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-medium text-foreground">Record an in-kind gift</p>
        <p className="text-xs text-muted-foreground">
          Its estimated value is added to the campaign&apos;s payment breakdown.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 20 school desks donated by a local carpenter"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Estimated value (TZS)</Label>
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Received on (optional)</Label>
            <Input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Donor (optional)</Label>
          <Select value={donorId} onValueChange={(v) => setDonorId(v ?? "none")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="No specific donor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific donor</SelectItem>
              {donors.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <Button size="sm" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          Record gift
        </Button>
      </div>
    </div>
  );
}

// ─── Campaign changes tab (parked material edits awaiting re-approval) ───────

const CR_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  story: "Story",
  scope: "Scope",
  acceptance: "Acceptance",
  goalAmount: "Goal amount",
  serviceFeePercent: "Service fee %",
  category: "Category",
  startDate: "Start date",
  endDate: "End date",
  minimumAmount: "Minimum amount",
  contactPhone: "Contact phone",
};

function ChangeRequestTab({
  campaign,
  canReview,
  canFinalApprove,
  currentUserId,
  acting,
  onApprove,
  onNegative,
  onRequestChanges,
}: {
  campaignId: string;
  campaign: CampaignRecord;
  canReview: boolean;
  canFinalApprove: boolean;
  currentUserId: string | null;
  acting: boolean;
  onApprove: () => void;
  onNegative: () => void;
  onRequestChanges: () => void;
}) {
  const cr = campaign.changeRequest!;
  const isStatusReq = cr.kind === "STATUS";
  const stage = cr.status === "PENDING" ? 1 : cr.status === "REVIEWED" ? 2 : 0;
  const canActThisStage = stage === 1 ? canReview : stage === 2 ? canFinalApprove : false;
  const isOwnFirst = stage === 2 && String(cr.firstApprovedBy ?? "") === currentUserId;
  const current: Record<string, unknown> = {
    name: campaign.name,
    story: campaign.story,
    scope: campaign.scope,
    acceptance: campaign.acceptance,
    goalAmount: campaign.goalAmount,
    serviceFeePercent: campaign.serviceFeePercent,
    category: campaign.category,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    minimumAmount: campaign.minimumAmount,
    contactPhone: campaign.contactPhone,
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {isStatusReq
            ? cr.statusAction === "PAUSE"
              ? "Request to suspend this campaign"
              : "Request to resume this campaign"
            : "Proposed changes"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {cr.status === "CHANGES_REQUESTED"
            ? "A reviewer asked for changes — the manager needs to edit and resubmit."
            : cr.status === "REVIEWED"
              ? "First approval done — an admin gives the final approval."
              : isStatusReq
                ? "Awaiting a reviewer's first approval. The campaign's status is unchanged until this clears."
                : "Awaiting a reviewer's first approval. The public campaign is unchanged until this clears."}
        </p>
      </div>

      {cr.reviewNotes && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Reviewer note: “{cr.reviewNotes}”
        </p>
      )}

      {isStatusReq && cr.payload.reason && (
        <p className="text-xs text-muted-foreground">
          Reason given: “{String(cr.payload.reason)}”
        </p>
      )}

      {!isStatusReq && (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-1.5 pr-4">Field</th>
              <th className="text-left font-medium py-1.5 pr-4">Current (public)</th>
              <th className="text-left font-medium py-1.5">Proposed</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cr.payload).map(([k, v]) => (
              <tr key={k} className="border-b border-border/50">
                <td className="py-1.5 pr-4 text-muted-foreground">{CR_FIELD_LABELS[k] ?? k}</td>
                <td className="py-1.5 pr-4 text-muted-foreground line-through">
                  {String(current[k] ?? "—")}
                </td>
                <td className="py-1.5 font-medium text-foreground">{String(v ?? "—")}</td>
              </tr>
            ))}
            {cr.hasStagedCover && (
              <tr>
                <td className="py-1.5 pr-4 text-muted-foreground">Cover image</td>
                <td className="py-1.5 pr-4 text-muted-foreground">current cover</td>
                <td className="py-1.5 font-medium text-foreground">new image staged</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {stage > 0 && canActThisStage && !isOwnFirst && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onApprove} disabled={acting}>
            {acting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1.5" />
            )}
            {stage === 2 ? "Give final approval" : "Give first approval"}
          </Button>
          <Button size="sm" variant="outline" onClick={onRequestChanges}>
            Request changes
          </Button>
          <Button size="sm" variant="destructive" onClick={onNegative}>
            Reject
          </Button>
        </div>
      )}
      {isOwnFirst && (
        <p className="text-[11px] text-muted-foreground italic">
          You gave the first approval — a different admin gives the final one.
        </p>
      )}
    </div>
  );
}

// ─── Payout requests tab ──────────────────────────────────────────────────────

function PayoutRequestTab({
  campaignId,
  campaignStatus,
  campaignRaised,
  isAdmin,
  canRequestPayout,
  canCheckout,
  canReviewClosure,
  canRequestClosure,
  onChanged,
}: {
  campaignId: string;
  campaignStatus: string;
  /** Total raised — used to suggest the remaining balance once closure is granted. */
  campaignRaised: number;
  isAdmin: boolean;
  /** CAMPAIGN_MANAGER — may request a payout. */
  canRequestPayout: boolean;
  /** May submit the payout destination on an approved request (requester or ORG_ADMIN). */
  canCheckout: boolean;
  /** REVIEWER / ORG_ADMIN / SUPER_ADMIN — may approve/reject a closure request. */
  canReviewClosure: boolean;
  /** CAMPAIGN_MANAGER on an ACTIVE/PAUSED campaign — may request closure. */
  canRequestClosure: boolean;
  /** Bubble up so the parent campaign banner / tab badge refresh too. */
  onChanged: () => void;
}) {
  const [payouts, setPayouts] = useState<PayoutRecord[] | undefined>(undefined);
  const [closures, setClosures] = useState<ClosureRequest[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<PayoutRecord | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payoutDialog, setPayoutDialog] = useState(false);
  const [closureDialog, setClosureDialog] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, c] = await Promise.all([
        payoutApi.list({ campaignId }),
        campaignApi.listClosureRequests(campaignId).catch(() => [] as ClosureRequest[]),
      ]);
      setPayouts(p.payouts);
      setClosures(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payout activity.");
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(() => {
    load();
    onChanged();
  }, [load, onChanged]);

  if (payouts === undefined || closures === undefined) {
    return <div className="h-40 bg-card border border-border rounded-xl animate-pulse" />;
  }

  // One payout at a time: anything not PAID / REJECTED blocks a new request —
  // matches createPayout's open-request guard.
  const payoutInFlight = payouts.some((p) =>
    ["REQUESTED", "REVIEWED", "AWAITING_CHECKOUT", "APPROVED"].includes(p.status)
  );
  // Once closure is granted the manager typically withdraws everything that's
  // left — suggest raised minus whatever has already been paid out.
  const paidOut = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, campaignRaised - paidOut);
  const suggestedAmount =
    campaignStatus === "COMPLETED" && remainingBalance > 0 ? remainingBalance : undefined;
  const latestClosure = closures[0];
  const closurePending = latestClosure?.status === "PENDING";
  const closableStatus = campaignStatus === "ACTIVE" || campaignStatus === "PAUSED";
  const showClosureButton = canRequestClosure && closableStatus;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {(showClosureButton || canRequestPayout) && (
        <div className="flex flex-wrap gap-2">
          {showClosureButton &&
            (closurePending ? (
              <Button size="sm" variant="outline" disabled>
                <Flag className="w-3.5 h-3.5 mr-1.5" />
                Closure requested — in review
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setClosureDialog(true)}>
                <Flag className="w-3.5 h-3.5 mr-1.5" />
                {latestClosure?.status === "REJECTED" ? "Request closure again" : "Request closure"}
              </Button>
            ))}
          {canRequestPayout &&
            (payoutInFlight ? (
              <Button size="sm" disabled>
                <Banknote className="w-3.5 h-3.5 mr-1.5" />
                Payout in progress
              </Button>
            ) : (
              <Button size="sm" onClick={() => setPayoutDialog(true)}>
                <Banknote className="w-3.5 h-3.5 mr-1.5" />
                Request payout
              </Button>
            ))}
        </div>
      )}
      {canRequestPayout && !payoutInFlight && campaignStatus === "COMPLETED" && (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Closure is approved — request the remaining balance
          {suggestedAmount ? ` (${formatTZSFull(suggestedAmount)})` : ""} as a payout.
        </p>
      )}

      {closures.length > 0 && (
        <ClosureHistoryCard
          closures={closures}
          campaignId={campaignId}
          canReview={canReviewClosure}
          onChanged={reload}
        />
      )}

      {payouts.length > 0 ? (
        <PayoutTable
          payouts={payouts}
          isAdmin={isAdmin}
          canRequestPayout={canRequestPayout}
          canCheckout={canCheckout}
          expandedId={expandedId}
          onToggleExpand={(pid) => setExpandedId((cur) => (cur === pid ? null : pid))}
          onChanged={reload}
          onCheckout={setCheckoutFor}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No payout requests yet.
        </div>
      )}

      {checkoutFor && (
        <PayoutCheckoutDialog
          payout={checkoutFor}
          onClose={() => setCheckoutFor(null)}
          onDone={() => {
            setCheckoutFor(null);
            reload();
          }}
        />
      )}
      {payoutDialog && (
        <RequestPayoutDialog
          campaignId={campaignId}
          suggestedAmount={suggestedAmount}
          onClose={() => setPayoutDialog(false)}
          onSubmitted={() => {
            setPayoutDialog(false);
            reload();
          }}
        />
      )}
      {closureDialog && (
        <RequestClosureDialog
          campaignId={campaignId}
          rejected={latestClosure?.status === "REJECTED"}
          onClose={() => setClosureDialog(false)}
          onSubmitted={() => {
            setClosureDialog(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ─── Payout table ────────────────────────────────────────────────────────────

function PayoutTable({
  payouts,
  isAdmin,
  canRequestPayout,
  canCheckout,
  expandedId,
  onToggleExpand,
  onChanged,
  onCheckout,
}: {
  payouts: PayoutRecord[];
  isAdmin: boolean;
  canRequestPayout: boolean;
  canCheckout: boolean;
  expandedId: number | null;
  onToggleExpand: (payoutId: number) => void;
  onChanged: () => void;
  onCheckout: (p: PayoutRecord) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Payout activity</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Every payout for this campaign — requested, reviewed, approved or
          rejected, and where the money was sent. One payout runs at a time.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="text-left px-4 py-3">Requested</th>
              <th className="text-right px-3 py-3">Amount</th>
              <th className="text-left px-3 py-3 hidden sm:table-cell">Reason</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payouts.map((p) => {
              const expanded = expandedId === p.id;
              return (
                <Fragment key={p.id}>
                  <tr
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onToggleExpand(p.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatTZSFull(p.amount)}
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell max-w-[240px]">
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={p.reason ?? undefined}
                      >
                        {p.reason || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex text-[10px] font-medium border rounded-full px-2 py-0.5 whitespace-nowrap",
                          REQUEST_STATUS_BADGE[p.status]
                        )}
                      >
                        {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      {p.status === "AWAITING_CHECKOUT" && canCheckout && (
                        <span className="ml-1.5 text-[10px] font-medium text-amber-700">
                          • action needed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform inline-block",
                          expanded && "rotate-180"
                        )}
                      />
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={5} className="px-4 py-4">
                        <PayoutRowDetail
                          payout={p}
                          isAdmin={isAdmin}
                          canRequest={canRequestPayout}
                          canCheckout={canCheckout}
                          onChanged={onChanged}
                          onCheckout={() => onCheckout(p)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Expanded detail for one payout row — proof, checkout, destination, decision,
 *  and the full approval timeline. */
function PayoutRowDetail({
  payout: p,
  isAdmin,
  canRequest,
  canCheckout,
  onChanged,
  onCheckout,
}: {
  payout: PayoutRecord;
  isAdmin: boolean;
  canRequest: boolean;
  canCheckout: boolean;
  onChanged: () => void;
  onCheckout: () => void;
}) {
  const [timeline, setTimeline] = useState<ReviewTrailEntry[] | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    payoutApi
      .history(p.id)
      .then((r) => {
        if (!cancelled) setTimeline(r);
      })
      .catch((e) => {
        if (!cancelled)
          setTimelineError(e instanceof Error ? e.message : "Failed to load the activity.");
      });
    return () => {
      cancelled = true;
    };
  }, [p.id]);

  return (
    <div className="space-y-3">
      {p.reason && <p className="text-sm text-muted-foreground leading-relaxed">{p.reason}</p>}
      {p.notes && (
        <p className="text-[11px] text-muted-foreground">Reviewer / admin note: &quot;{p.notes}&quot;</p>
      )}

      <PayoutProofStrip
        payoutId={p.id}
        images={p.proofImages}
        editable={canRequest && (p.status === "REQUESTED" || p.status === "REVIEWED")}
        onChanged={onChanged}
      />

      {p.status === "AWAITING_CHECKOUT" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <p className="text-xs text-amber-800">
            This payout is approved. Add where the money should be sent — mobile
            money or bank — to release it for transfer.
          </p>
          {canCheckout ? (
            <Button size="sm" onClick={onCheckout}>
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Checkout — add payout details
            </Button>
          ) : (
            <p className="text-[11px] text-amber-700">
              Waiting for the campaign manager to add the payout details.
            </p>
          )}
        </div>
      )}

      {p.disbursement && <PayoutDestinationSummary disbursement={p.disbursement} />}

      {p.status === "PAID" && (
        <p className="text-[11px] text-emerald-700">
          Paid {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ""}
          {p.gatewayRef ? ` · ref ${p.gatewayRef}` : ""}
        </p>
      )}

      {isAdmin && p.status === "REQUESTED" && <DecidePayoutForm payoutId={p.id} onDone={onChanged} />}

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Activity
        </p>
        {timelineError ? (
          <p className="text-[11px] text-destructive">{timelineError}</p>
        ) : timeline === null ? (
          <div className="h-24 bg-muted/40 rounded-lg animate-pulse" />
        ) : (
          <ReviewTimeline entries={timeline} />
        )}
      </div>
    </div>
  );
}

/** Closure request history + review actions, shown inside the Payout tab. */
function ClosureHistoryCard({
  closures,
  campaignId,
  canReview,
  onChanged,
}: {
  closures: ClosureRequest[];
  campaignId: string;
  canReview: boolean;
  onChanged: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Closure requests</h2>
      </div>
      <div className="divide-y divide-border">
        {closures.map((r) => (
          <div key={r.id} className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-medium border rounded-full px-2.5 py-1",
                  REQUEST_STATUS_BADGE[r.status]
                )}
              >
                {r.status}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(r.requestedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.reason}</p>
            {r.decisionNotes && (
              <p className="text-[11px] text-muted-foreground">
                Admin note: &quot;{r.decisionNotes}&quot;
              </p>
            )}
            {canReview && r.status === "PENDING" && (
              <DecideClosureForm campaignId={campaignId} requestId={r.id} onDone={onChanged} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Read-only view of the payout destination the requester submitted at checkout. */
function PayoutDestinationSummary({
  disbursement: d,
}: {
  disbursement: NonNullable<PayoutRecord["disbursement"]>;
}) {
  const rows =
    d.method === "MOBILE_MONEY"
      ? [
          ["Provider", d.provider],
          ["Phone", d.phone],
          ["Account name", d.accountName],
        ]
      : [
          ["Bank", d.bankName],
          ["Account number", d.accountNumber],
          ["Account name", d.accountName],
          ["Branch", d.branch],
        ];
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wide">
        {d.method === "MOBILE_MONEY" ? (
          <Smartphone className="w-3.5 h-3.5" />
        ) : (
          <Landmark className="w-3.5 h-3.5" />
        )}
        {d.method === "MOBILE_MONEY" ? "Mobile money" : "Bank transfer"}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        {rows
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground font-medium">{value}</dd>
            </div>
          ))}
      </dl>
      {d.submittedAt && (
        <p className="text-[10px] text-muted-foreground">
          Submitted {new Date(d.submittedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

/** Checkout form — where an approved payout's money should be sent. */
function PayoutCheckoutDialog({
  payout,
  onClose,
  onDone,
}: {
  payout: PayoutRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<PayoutMethod>("MOBILE_MONEY");
  const [accountName, setAccountName] = useState("");
  const [provider, setProvider] = useState<string>(MOBILE_MONEY_PROVIDERS[0]);
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (accountName.trim().length < 2) {
      setError("Enter the account holder's name.");
      return;
    }
    if (method === "MOBILE_MONEY" && !phone.trim()) {
      setError("Enter the mobile money number.");
      return;
    }
    if (method === "BANK" && (!bankName.trim() || !accountNumber.trim())) {
      setError("Enter the bank name and account number.");
      return;
    }
    const body: PayoutCheckoutInput = {
      method,
      accountName: accountName.trim(),
      ...(method === "MOBILE_MONEY"
        ? { provider, phone: phone.trim() }
        : {
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            branch: branch.trim() || undefined,
          }),
    };
    setSubmitting(true);
    try {
      await payoutApi.submitCheckout(payout.id, body);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit the payout details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Payout details</DialogTitle>
          <DialogDescription className="text-xs">
            Where should the {formatTZSFull(payout.amount)} payout be sent? A super
            admin makes the transfer to these details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["MOBILE_MONEY", "Mobile money", Smartphone],
                ["BANK", "Bank account", Landmark],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors",
                  method === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {method === "MOBILE_MONEY" ? (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs">Provider</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v ?? MOBILE_MONEY_PROVIDERS[0])}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILE_MONEY_PROVIDERS.map((prov) => (
                      <SelectItem key={prov} value={prov}>
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Mobile money number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  className="h-9"
                  inputMode="tel"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs">Bank name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. CRDB Bank"
                  className="h-9"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Account number</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Bank account number"
                  className="h-9"
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">
                  Branch <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Dodoma"
                  className="h-9"
                />
              </div>
            </>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">Account holder name</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name on the account"
              className="h-9"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Submit payout details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MAX_PROOF_IMAGES = 5;
const PROOF_ACCEPT = "image/jpeg,image/png,image/webp";

function RequestPayoutDialog({
  campaignId,
  suggestedAmount,
  onClose,
  onSubmitted,
}: {
  campaignId: string;
  suggestedAmount?: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [reason, setReason] = useState(
    suggestedAmount ? "Final payout — remaining balance after campaign closure." : ""
  );
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX_PROOF_IMAGES));
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setError(null);
    const amt = Number(amount);
    if (!amount.trim() || Number.isNaN(amt) || amt <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!reason.trim()) {
      setError("Explain why you're requesting this payout.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await payoutApi.create({ amount: amt, campaignId, reason: reason.trim() });
      if (files.length > 0) {
        try {
          await payoutApi.attachProof(created.id, files);
        } catch (e) {
          setError(
            (e instanceof Error ? e.message : "The request was submitted, but the proof photos failed to upload.") +
              " You can add them from the payout row."
          );
        }
      }
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit the payout request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Request a payout</DialogTitle>
          <DialogDescription className="text-xs">
            A reviewer then an admin approve your reason. You then add the payout
            destination before a super admin sends the money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Amount (TZS)</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500000"
              className="h-9"
            />
            {suggestedAmount != null && (
              <button
                type="button"
                onClick={() => setAmount(String(suggestedAmount))}
                className="text-[11px] text-primary hover:underline w-fit"
              >
                Use remaining balance — {formatTZSFull(suggestedAmount)}
              </button>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What is this payout for?"
              className="min-h-20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">
              Proof of use <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Attach invoices, receipts or photos that show why this payout is needed — up to{" "}
              {MAX_PROOF_IMAGES} images. The reviewer and admin will see them.
            </p>
            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {previews.map((url, idx) => (
                  <div
                    key={url}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Proof preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_PROOF_IMAGES && (
              <label className="inline-flex w-fit items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                <ImageIcon className="w-3.5 h-3.5" />
                {files.length > 0 ? "Add another image" : "Add images"}
                <input
                  type="file"
                  accept={PROOF_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Request payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Proof-of-use thumbnails for one payout request, with add/remove while the
 *  request is still the manager's to edit (REQUESTED / REVIEWED). */
function PayoutProofStrip({
  payoutId,
  images,
  editable,
  onChanged,
}: {
  payoutId: number;
  images: { id: number; url: string }[];
  editable: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (images.length === 0 && !editable) return null;

  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await payoutApi.attachProof(payoutId, Array.from(list).slice(0, MAX_PROOF_IMAGES));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload the image.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (imageId: number) => {
    setBusy(true);
    setError(null);
    try {
      await payoutApi.removeProof(payoutId, imageId);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        Proof of use
      </p>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border"
            >
              <a href={img.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="Payout proof" className="w-full h-full object-cover" />
              </a>
              {editable && (
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  disabled={busy}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No proof attached.</p>
      )}
      {editable && images.length < MAX_PROOF_IMAGES && (
        <label className="inline-flex w-fit items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          Add proof image
          <input
            type="file"
            accept={PROOF_ACCEPT}
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function DecidePayoutForm({ payoutId, onDone }: { payoutId: number; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (approved: boolean) => {
    setActing(true);
    setError(null);
    try {
      if (approved) await payoutApi.approve(payoutId, notes.trim() || undefined);
      else await payoutApi.reject(payoutId, notes.trim() || undefined);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the decision.");
      setActing(false);
    }
  };

  return (
    <div className="pt-2 space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional, shown to the requester)"
        className="min-h-16 text-sm"
      />
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="xs" onClick={() => decide(true)} disabled={acting}>
          {acting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
          Approve
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => decide(false)}
          disabled={acting}
        >
          <XCircle className="w-3 h-3 mr-1" />
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