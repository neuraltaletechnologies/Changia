"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Heart,
  Image as ImageIcon,
  Megaphone,
  Phone,
  Plus,
  ReceiptText,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Progress } from "@/components/dashboard/ui/progress";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { Badge } from "@/components/dashboard/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/dashboard/ui/tabs";
import {
  formatTZS,
  formatTZSFull,
  type Campaign,
  type Donation,
  type Donor,
  type TeamMember,
} from "@/lib/dashboard/types";
import {
  loadUserCampaigns,
  updateCampaign,
} from "@/lib/dashboard/campaign-store";
import {
  findCampaignTransactions,
  saveTransaction,
} from "@/lib/dashboard/transaction-store";
import { loadDonors } from "@/lib/dashboard/donor-store";
import { loadTeamMembers } from "@/lib/dashboard/team-store";
import { campaignStatusMap } from "@/components/dashboard/widgets/campaign-card";
import { RecordDonationDialog } from "@/components/dashboard/campaigns/record-donation-dialog";
import { cn } from "@/lib/dashboard/utils";

const channelColors: Record<string, string> = {
  email: "bg-sky-50 text-sky-700",
  sms: "bg-amber-50 text-amber-700",
  whatsapp: "bg-emerald-50 text-emerald-700",
  phone: "bg-slate-50 text-slate-600",
  post: "bg-rose-50 text-rose-700",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);

  const reloadCampaignData = () => {
    setCampaign(loadUserCampaigns().find((c) => c.id === id) ?? null);
    setTransactions(findCampaignTransactions(id));
  };

  useEffect(() => {
    reloadCampaignData();
    setDonors(loadDonors());
    setTeamMembers(loadTeamMembers());
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[900px]">
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
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

  const raisedFromTx = transactions.reduce((sum, t) => sum + t.amount, 0);
  const donorCount = new Set(transactions.map((t) => t.donorId)).size;
  const pct =
    campaign.goal > 0
      ? Math.min(100, Math.round((raisedFromTx / campaign.goal) * 100))
      : 0;
  const s = campaignStatusMap[campaign.status];

  const donorMap = new Map<
    string,
    { donor: Donor | undefined; total: number; gifts: number; lastDate: string }
  >();
  transactions.forEach((t) => {
    const entry = donorMap.get(t.donorId) ?? {
      donor: donors.find((d) => d.id === t.donorId),
      total: 0,
      gifts: 0,
      lastDate: "",
    };
    entry.total += t.amount;
    entry.gifts += 1;
    entry.lastDate = t.date;
    donorMap.set(t.donorId, entry);
  });
  const campaignDonors = Array.from(donorMap.values());

  const assignedIds = campaign.memberIds ?? [];
  const assignedMembers = teamMembers.filter((m) => assignedIds.includes(m.id));

  const handleRecorded = (tx: Donation) => {
    saveTransaction(tx);
    const nextDonorCount = new Set([
      ...transactions.map((t) => t.donorId),
      tx.donorId,
    ]).size;
    updateCampaign(campaign.id, {
      raised: campaign.raised + tx.amount,
      donors: nextDonorCount,
    });
    reloadCampaignData();
  };

  const toggleMember = (memberId: string) => {
    const next = assignedIds.includes(memberId)
      ? assignedIds.filter((m) => m !== memberId)
      : [...assignedIds, memberId];
    updateCampaign(campaign.id, { memberIds: next });
    reloadCampaignData();
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/dashboard/campaigns" />}
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        Back to Campaigns
      </Button>

      {campaign.status === "pending" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3 dark:border-orange-500/40 dark:bg-orange-500/10">
          <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
              Awaiting admin approval
            </p>
            <p className="text-xs text-orange-700/80 dark:text-orange-200/70 mt-0.5">
              This campaign has been submitted but is not live yet. Once an admin
              approves it, it will be published and ready to share with donors.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm overflow-hidden">
        {campaign.image && (
          <div className="-mx-6 -mt-6 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campaign.image}
              alt={campaign.name}
              className="h-48 w-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
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
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {campaign.startDate} → {campaign.endDate}
              </span>
              {campaign.ownerName && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="w-3.5 h-3.5" />
                  {campaign.ownerName}
                </span>
              )}
            </div>
          </div>
          <span
            className={cn(
              "text-[10px] font-medium border rounded-full px-2.5 py-1 shrink-0",
              s.className
            )}
          >
            {s.label}
          </span>
        </div>

        {campaign.submittedAt && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Submitted for approval on{" "}
            {new Date(campaign.submittedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4">Progress</h2>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-foreground">{formatTZS(raisedFromTx)}</span>
          <span className="text-muted-foreground">of {formatTZS(campaign.goal)}</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-3">
          <span>{pct}% funded</span>
          <span>{donorCount} donors</span>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto w-full sm:w-auto gap-1 py-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="donors">
            Donors ({donorCount})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="team">Team ({assignedMembers.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="pt-2">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-2">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {campaign.description || "No description provided."}
              </p>
              {campaign.contactPhone && (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
                  <Phone className="w-3.5 h-3.5" />
                  {campaign.contactPhone}
                </p>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4">Owner</h2>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {(campaign.ownerName || "CO")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {campaign.ownerName || "Unassigned"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {campaign.ownerEmail || campaign.contactPhone || "No contact set"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Donors */}
        <TabsContent value="donors" className="pt-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Donors for this campaign
              </h2>
              <span className="text-xs text-muted-foreground">
                {donorCount} donor{donorCount !== 1 ? "s" : ""}
              </span>
            </div>
            {campaignDonors.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No donors for this campaign yet.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => setRecordOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Record a donation
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {campaignDonors.map(({ donor, total, gifts, lastDate }) => {
                  const initials = donor
                    ? `${donor.firstName[0]}${donor.lastName[0]}`
                    : "??";
                  return (
                    <div
                      key={donor?.id ?? total}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {donor
                            ? `${donor.firstName} ${donor.lastName}`
                            : "Unknown donor"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {donor?.email || "No profile"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-foreground">
                          {formatTZS(total)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {gifts} gift{gifts !== 1 ? "s" : ""}
                          {lastDate ? ` · ${lastDate}` : ""}
                        </p>
                      </div>
                      {donor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          nativeButton={false}
                          render={<Link href={`/dashboard/donors/${donor.id}`} />}
                          className="text-xs"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions" className="pt-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                All transactions
              </h2>
              <Button size="sm" onClick={() => setRecordOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Record Donation
              </Button>
            </div>
            {transactions.length === 0 ? (
              <div className="py-12 text-center">
                <ReceiptText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No transactions yet. Record the first donation for this
                  campaign.
                </p>
                {donors.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    You need donors in your pool first —{" "}
                    <Link
                      href="/dashboard/donors"
                      className="text-primary hover:underline"
                    >
                      add donors
                    </Link>
                    .
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Heart className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {t.donorName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.date} &middot; {t.channel}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-foreground">
                        {formatTZSFull(t.amount)}
                      </p>
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-1.5 py-0.5",
                          channelColors[t.channel] || "bg-slate-50 text-slate-600"
                        )}
                      >
                        {t.channel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {transactions.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Total collected
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {formatTZSFull(raisedFromTx)}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence" className="pt-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Evidence images
              </h2>
            </div>
            {!campaign.evidence || campaign.evidence.length === 0 ? (
              <div className="py-12 text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No evidence images uploaded yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
                {campaign.evidence.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="pt-2">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <UserRound className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {campaign.ownerName || "No owner assigned"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Campaign owner
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Team members on this campaign
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Assign members from your organisation to work on this campaign.
                </p>
              </div>
              {teamMembers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No team members yet.{" "}
                  <Link
                    href="/dashboard/team"
                    className="text-primary hover:underline"
                  >
                    Invite members
                  </Link>
                  .
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {teamMembers.map((member) => {
                    const assigned = assignedIds.includes(member.id);
                    const initials = member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.email} &middot; {member.role}
                          </p>
                        </div>
                        {assigned ? (
                          <Badge
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0"
                            variant="outline"
                          >
                            Assigned
                          </Badge>
                        ) : null}
                        <Button
                          size="xs"
                          variant={assigned ? "outline" : "default"}
                          onClick={() => toggleMember(member.id)}
                          className="shrink-0"
                        >
                          {assigned ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Assign
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <RecordDonationDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        campaignId={campaign.id}
        campaignName={campaign.name}
        donors={donors}
        onRecorded={handleRecorded}
      />
    </div>
  );
}
