"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Wallet,
  Heart,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { Separator } from "@/components/dashboard/ui/separator";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/dashboard/ui/sheet";
import {
  donorApi,
  donorFullName,
  formatTZSFull,
  formatTZSCompact,
  type DonorRecord,
  type PaymentMethod,
  type PaymentMethodType,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";
import { ExportMenu } from "@/components/dashboard/export-menu";

const METHOD_LABEL: Record<PaymentMethodType, string> = {
  MOMO: "M-Pesa",
  TIGO_PESA: "Tigo Pesa",
  AIRTEL_MONEY: "Airtel Money",
  HALOPESA: "Halopesa",
  BANK_TRANSFER: "Bank transfer",
  CREDIT_CARD: "Card",
  CASH: "Cash",
  OTHER: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROSPECT: "bg-sky-50 text-sky-700 border-sky-200",
  LAPSED: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function DonorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useRole();
  // Same gate as the pool donor list's ⋯ quick action: a campaign manager (or
  // SUPER_ADMIN) may edit a donor's details from the full profile too.
  const canManageDonor = hasPermission("donor:manage");

  const [donor, setDonor] = useState<DonorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingPm, setAddingPm] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setDonor(await donorApi.get(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load donor.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div>
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground text-sm">Donor not found.</p>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/donors" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Donor Pool
        </Button>
      </div>
    );
  }

  const initials = `${(donor.firstName || "?")[0]}${(donor.lastName || "?")[0]}`;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
        <span className="text-xs text-foreground">{donorFullName(donor)}</span>
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
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-foreground leading-tight">
                {donorFullName(donor)}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5",
                  STATUS_BADGE[donor.status] || STATUS_BADGE.PROSPECT
                )}
              >
                {donor.status.toLowerCase()}
              </span>
              {donor.isAnomalous && (
                <span className="inline-flex items-center text-[10px] font-medium border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                  Unmatched payment
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {donor.phone || donor.email || "No contact details"}
            </p>
          </div>
          {canManageDonor && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setEditing(true)}>
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit details
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Given" value={donor.totalPaid > 0 ? formatTZSFull(donor.totalPaid) : "—"} icon={Wallet} bg="bg-amber-50" color="text-amber-600" />
        <StatCard label="Gifts" value={donor.donationCount > 0 ? donor.donationCount.toString() : "—"} icon={Heart} bg="bg-rose-50" color="text-rose-500" />
        <StatCard label="Pools" value={donor.pools?.length ? donor.pools.length.toString() : "—"} icon={Briefcase} bg="bg-sky-50" color="text-sky-600" />
        <StatCard label="Member Since" value={donor.createdAt ? new Date(donor.createdAt).getFullYear().toString() : "—"} icon={Calendar} bg="bg-emerald-50" color="text-emerald-600" />
      </div>

      {/* Details + History */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Details panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Contact Details
            </h2>
            <div className="space-y-3">
              {donor.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate">{donor.email}</span>
                </div>
              )}
              {donor.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground">{donor.phone}</span>
                </div>
              )}
              {donor.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground">{donor.location}</span>
                </div>
              )}
              {donor.position && (
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground capitalize">{donor.position}</span>
                </div>
              )}
              {!donor.email && !donor.phone && !donor.location && (
                <p className="text-xs text-muted-foreground">No contact details recorded.</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Communication
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Preferred Channel</span>
                <span className="text-xs text-foreground">
                  {donor.preferredChannel
                    ? donor.preferredChannel.toLowerCase()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consent Status</span>
                <span className="text-xs text-foreground capitalize">
                  {donor.consentStatus.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Gender</span>
                <span className="text-xs text-foreground capitalize">
                  {donor.gender && donor.gender !== "UNSPECIFIED"
                    ? donor.gender.toLowerCase()
                    : "—"}
                </span>
              </div>
            </div>

            <Separator />

            {donor.notes ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Notes
                </h3>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {donor.notes}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Key Dates
              </h3>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-foreground">
                  {donor.createdAt ? new Date(donor.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Payment Methods
              </h2>
              {canManageDonor && (
                <Button size="xs" variant="outline" onClick={() => setAddingPm(true)}>
                  + Add
                </Button>
              )}
            </div>
            {!donor.paymentMethods || donor.paymentMethods.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No payment methods recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {donor.paymentMethods.map((pm) => (
                  <PaymentMethodRow
                    key={pm.id}
                    pm={pm}
                    donorId={donor.id}
                    canManage={canManageDonor}
                    onRemoved={refresh}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Donation history */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Donation History
              </h2>
              <ExportMenu dataset="donations" params={{ donorId: id }} label="Export" />
            </div>
            {!donor.donations || donor.donations.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No donations recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {donor.donations.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Heart className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {d.campaign.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.method} · {new Date(d.createdAt).toLocaleDateString()}
                        {d.receiptNumber ? ` · ${d.receiptNumber}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-foreground">
                        {formatTZSCompact(d.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {d.status.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditDonorSheet
          donor={donor}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refresh();
          }}
        />
      )}
      {addingPm && (
        <AddPaymentMethodDialog
          donorId={donor.id}
          onClose={() => setAddingPm(false)}
          onSaved={() => {
            setAddingPm(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  bg,
  color,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  bg: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} mb-2.5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-lg font-semibold text-foreground leading-none">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function PaymentMethodRow({
  pm,
  donorId,
  canManage,
  onRemoved,
}: {
  pm: PaymentMethod;
  donorId: number;
  canManage: boolean;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const remove = async () => {
    setRemoving(true);
    try {
      await donorApi.removePaymentMethod(donorId, pm.id);
      onRemoved();
    } finally {
      setRemoving(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {METHOD_LABEL[pm.method] || pm.method}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {pm.accountRef || "No reference"}
        </p>
      </div>
      {canManage && (
        <Button
          size="xs"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={remove}
          disabled={removing}
        >
          Remove
        </Button>
      )}
    </div>
  );
}

function EditDonorSheet({
  donor,
  onClose,
  onSaved,
}: {
  donor: DonorRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: donor.firstName ?? "",
    lastName: donor.lastName ?? "",
    email: donor.email ?? "",
    phone: donor.phone ?? "",
    location: donor.location ?? "",
    gender: donor.gender ?? "UNSPECIFIED",
    position: donor.position ?? "",
    status: donor.status,
    consentStatus: donor.consentStatus,
    preferredChannel: donor.preferredChannel ?? "SMS",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await donorApi.update(donor.id, form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit donor</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First name</Label>
              <Input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last name</Label>
              <Input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+255 7XX XXX XXX"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => set("gender", v ?? "UNSPECIFIED")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNSPECIFIED">Unspecified</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Position</Label>
              <Input
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="e.g. Head Teacher"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v ?? "PROSPECT")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="LAPSED">Lapsed</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Consent</Label>
              <Select
                value={form.consentStatus}
                onValueChange={(v) => set("consentStatus", v ?? "PENDING")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSENTED">Consented</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Preferred communication channel</Label>
            <Select
              value={form.preferredChannel}
              onValueChange={(v) => set("preferredChannel", v ?? "SMS")}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PHONE">Phone Call</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Reminders sent &ldquo;by preferred channel&rdquo; use this. Phone-call donors
              fall back to the reminder&apos;s chosen fallback channel.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end">
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AddPaymentMethodDialog({
  donorId,
  onClose,
  onSaved,
}: {
  donorId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethodType>("MOMO");
  const [accountRef, setAccountRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await donorApi.addPaymentMethod(donorId, {
        method,
        accountRef: accountRef.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add method.");
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add payment method</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Method</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod((v ?? "MOMO") as PaymentMethodType)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Account / reference</Label>
            <Input
              placeholder="e.g. phone number"
              value={accountRef}
              onChange={(e) => setAccountRef(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end">
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Add method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
