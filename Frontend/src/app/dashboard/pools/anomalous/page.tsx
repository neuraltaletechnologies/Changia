"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, GitMerge, Search, Wallet, UserCheck } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import {
  poolApi,
  donorApi,
  userApi,
  donorFullName,
  formatTZSFull,
  type DonorPool,
  type PoolMember,
  type PaymentMethodType,
  type DonorRecord,
  type UserRecord,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";
import {
  SortableTh,
  useTableSort,
  type SortAccessors,
} from "@/components/dashboard/ui/sortable-table";

type AnomalousColumn = "donor" | "contact" | "paid" | "gifts";

const anomalousColumnAccessors: SortAccessors<PoolMember, AnomalousColumn> = {
  donor: (m) => donorFullName(m.donor).toLowerCase(),
  contact: (m) => (m.donor.email || m.donor.phone || "").toLowerCase(),
  paid: (m) => m.paidAmount ?? 0,
  gifts: (m) => m.donationCount ?? 0,
};

export default function AnomalousPoolPage() {
  const { isSuperAdmin, isOrgAdmin } = useRole();
  const isAdmin = isSuperAdmin || isOrgAdmin;

  const [pool, setPool] = useState<DonorPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<PoolMember["donor"] | null>(null);

  // Admin-only: pick whose anomalous pool to view. Empty = the org-wide
  // "Unassigned" fallback pool (unmatched payments on campaigns with no
  // assigned manager). Campaign managers only ever see their own.
  const [managers, setManagers] = useState<UserRecord[]>([]);
  const [managerId, setManagerId] = useState<string>("");

  useEffect(() => {
    if (!isAdmin) return;
    userApi
      .list({ role: "CAMPAIGN_MANAGER", limit: 100 })
      .then((r) => setManagers(r.users))
      .catch(() => undefined);
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setPool(await poolApi.anomalous(isAdmin ? managerId || undefined : undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load anomalous pool.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, managerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const members = pool?.members || [];

  const {
    sorted: sortedMembers,
    sort: colSort,
    toggle: toggleColSort,
  } = useTableSort(members, anomalousColumnAccessors);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/pools" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Pools
        </Button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 dark:border-amber-500/40 dark:bg-amber-500/10">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Anomalous / unmatched payments
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-200/70 mt-0.5">
            Donations received without a registered donor profile (for example a
            donor who paid using a payment method you had not captured) are kept
            here. Re-attach each one to a known donor so their payments count
            under the right profile. Each manager only sees unmatched
            payments from their own campaigns.
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 text-sm">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Viewing pool for
          </Label>
          <Select value={managerId} onValueChange={(v) => setManagerId(v ?? "")}>
            <SelectTrigger className="h-9 w-64 text-xs">
              <SelectValue placeholder="Unassigned (org-wide fallback)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned (org-wide fallback)</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {donorFullName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-48 bg-card border border-border rounded-xl animate-pulse" />
      ) : members.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No unmatched payments right now.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Unmatched donors ({members.length})
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Re-attach an entry to a known donor to consolidate their payments.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <SortableTh sortKey="donor" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                    Donor
                  </SortableTh>
                  <SortableTh sortKey="contact" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Contact
                  </SortableTh>
                  <SortableTh sortKey="paid" sort={colSort} onSort={toggleColSort} align="right" className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Paid
                  </SortableTh>
                  <SortableTh sortKey="gifts" sort={colSort} onSort={toggleColSort} align="right" className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Gifts
                  </SortableTh>
                  <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="text-[11px] bg-amber-500/15 text-amber-600 font-semibold">
                            {(m.donor.firstName || "?")[0]}
                            {(m.donor.lastName || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {donorFullName(m.donor)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.donor.phone || m.donor.email || "No contact"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <p className="text-[11px] text-muted-foreground">{m.donor.email || "—"}</p>
                      {m.donor.gender && (
                        <p className="text-[11px] text-muted-foreground">
                          {m.donor.gender.toLowerCase()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs font-semibold text-emerald-600">
                        {formatTZSFull(m.paidAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                      {m.donationCount}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => setMergeTarget(m.donor)}>
                        <GitMerge className="w-3.5 h-3.5 mr-1.5" />
                        Re-attach
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mergeTarget && (
        <MergeDialog
          anomalousDonor={mergeTarget}
          onOpenChange={(o) => !o && setMergeTarget(null)}
          onMerged={() => {
            setMergeTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function MergeDialog({
  anomalousDonor,
  onOpenChange,
  onMerged,
}: {
  anomalousDonor: PoolMember["donor"];
  onOpenChange: (o: boolean) => void;
  onMerged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DonorRecord[]>([]);
  const [picked, setPicked] = useState<DonorRecord | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addPayment, setAddPayment] = useState(false);
  const [pmMethod, setPmMethod] = useState<PaymentMethodType>("MOMO");
  const [pmRef, setPmRef] = useState("");

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const r = await donorApi.list({
        search: query.trim(),
        anomalous: "false",
        limit: 20,
      });
      setResults(r.donors);
      setPicked(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const merge = async () => {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await poolApi.mergeAnomalous(anomalousDonor.id, {
        targetDonorId: picked.id,
        paymentMethod: addPayment
          ? {
              method: pmMethod,
              accountRef: pmRef.trim() || undefined,
            }
          : undefined,
      });
      onMerged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to merge donor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Re-attach &ldquo;{donorFullName(anomalousDonor)}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-foreground">
            {donorFullName(anomalousDonor)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {anomalousDonor.phone || anomalousDonor.email || "No contact"}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search known donors…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={runSearch} disabled={searching}>
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
              {results.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setPicked(d)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors",
                    picked?.id === d.id && "bg-primary/5"
                  )}
                >
                  <input
                    type="radio"
                    checked={picked?.id === d.id}
                    readOnly
                    className="accent-primary"
                  />
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                      {`${(d.firstName || "?")[0]}${(d.lastName || "?")[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {donorFullName(d)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {d.phone || d.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={addPayment}
              onChange={(e) => setAddPayment(e.target.checked)}
              className="accent-primary"
            />
            Register the payment method used on the known donor (donors sometimes
            pay via an unregistered method).
          </label>

          {addPayment && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment method</Label>
                <Select value={pmMethod} onValueChange={(v) => setPmMethod((v ?? "MOMO") as PaymentMethodType)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOMO">M-Pesa</SelectItem>
                    <SelectItem value="TIGO_PESA">Tigo Pesa</SelectItem>
                    <SelectItem value="AIRTEL_MONEY">Airtel Money</SelectItem>
                    <SelectItem value="HALOPESA">Halopesa</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                    <SelectItem value="CREDIT_CARD">Card</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account / reference</Label>
                <Input
                  value={pmRef}
                  onChange={(e) => setPmRef(e.target.value)}
                  placeholder="e.g. phone number"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={merge} disabled={!picked || saving}>
            <GitMerge className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Merging…" : "Merge into selected donor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}