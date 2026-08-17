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
  const { isSuperAdmin, isOrgAdmin } = useRole();
  const isAdmin = isSuperAdmin || isOrgAdmin;

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
      <div className="max-w-[900px]">
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
    <div className="space-y-6 max-w-[900px]">
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
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setEditing(true)}>
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
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
              {isAdmin && (
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
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Donation History
              </h2>
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
        <EditDonorDialog
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
  onRemoved,
}: {
  pm: PaymentMethod;
  donorId: number;
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
      <Button
        size="xs"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10"
        onClick={remove}
        disabled={removing}
      >
        Remove
      </Button>
    </div>
  );
}

function EditDonorDialog({
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-xl">
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Edit donor</h2>
            <Button size="xs" variant="ghost" onClick={onClose} type="button">
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <input
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Location">
              <input
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <select
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="UNSPECIFIED">Unspecified</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </Field>
            <Field label="Position">
              <input
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="PROSPECT">Prospect</option>
                <option value="LAPSED">Lapsed</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>
            <Field label="Consent">
              <select
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.consentStatus}
                onChange={(e) => set("consentStatus", e.target.value)}
              >
                <option value="CONSENTED">Consented</option>
                <option value="PENDING">Pending</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-card border border-border shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Add payment method</h2>
          <Button size="xs" variant="ghost" onClick={onClose} type="button">
            ✕
          </Button>
        </div>

        <Field label="Method">
          <select
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethodType)}
          >
            {Object.entries(METHOD_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Account / reference">
          <input
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. phone number"
            value={accountRef}
            onChange={(e) => setAccountRef(e.target.value)}
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add method"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}