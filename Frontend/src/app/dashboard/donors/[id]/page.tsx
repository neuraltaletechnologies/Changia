"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquarePlus,
  Edit,
  Wallet,
  Heart,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { Separator } from "@/components/dashboard/ui/separator";
import {
  DonorStatusBadge,
  ConsentBadge,
  ChannelBadge,
  TagBadge,
} from "@/components/dashboard/donors/donor-badges";
import {
  donors,
  recentDonations,
  formatTZSFull,
  formatTZS,
} from "@/lib/dashboard/mock-data";

export default function DonorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const donor = donors.find((d) => d.id === id);

  if (!donor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground text-sm">Donor not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/donors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Donor Pool
          </Link>
        </Button>
      </div>
    );
  }

  const initials = `${donor.firstName[0]}${donor.lastName[0]}`;
  const donorDonations = recentDonations.filter((d) => d.donorId === donor.id);

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/donors"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Donor Pool
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs text-foreground">
          {donor.firstName} {donor.lastName}
        </span>
      </div>

      {/* Profile header card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar className="w-16 h-16 shrink-0">
            <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-1">
              <h1 className="text-xl font-semibold text-foreground leading-tight">
                {donor.firstName} {donor.lastName}
              </h1>
              <DonorStatusBadge status={donor.status} />
            </div>
            <p className="text-sm text-muted-foreground mb-3">{donor.email}</p>
            <div className="flex flex-wrap gap-1">
              {donor.tags.map((t) => (
                <TagBadge key={t} tag={t} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
              Contact
            </Button>
            <Button size="sm">
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Given",
            value:
              donor.totalGiven > 0 ? formatTZS(donor.totalGiven) : "—",
            icon: Wallet,
            bg: "bg-amber-50",
            color: "text-amber-600",
          },
          {
            label: "Gift Count",
            value: donor.giftCount > 0 ? donor.giftCount.toString() : "—",
            icon: Heart,
            bg: "bg-rose-50",
            color: "text-rose-500",
          },
          {
            label: "Last Gift",
            value: donor.lastGiftAmount > 0 ? formatTZS(donor.lastGiftAmount) : "—",
            icon: Calendar,
            bg: "bg-emerald-50",
            color: "text-emerald-600",
          },
          {
            label: "Member Since",
            value: new Date(donor.joinedDate).getFullYear().toString(),
            icon: Calendar,
            bg: "bg-sky-50",
            color: "text-sky-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg} mb-2.5`}
              >
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-lg font-semibold text-foreground leading-none">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Details + Donations */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Details panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Contact Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground">{donor.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground">{donor.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground">
                  {donor.location}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Communication
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Preferred Channel</span>
                <ChannelBadge channel={donor.preferredChannel} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consent Status</span>
                <ConsentBadge status={donor.consentStatus} />
              </div>
            </div>

            <Separator />

            {donor.notes && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Notes
                </h3>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {donor.notes}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Key Dates
              </h3>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-foreground">{donor.joinedDate}</span>
              </div>
              {donor.lastGift && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last Gift</span>
                  <span className="text-foreground">{donor.lastGift}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Donation history */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Donation History
              </h2>
            </div>
            {donorDonations.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No donations recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {donorDonations.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Heart className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {d.campaign}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.date} &middot; via {d.channel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">
                        {formatTZSFull(d.amount)}
                      </p>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
