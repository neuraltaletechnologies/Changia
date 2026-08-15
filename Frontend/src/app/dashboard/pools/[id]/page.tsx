"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CopyPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
  Target,
  Search,
  Check,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  poolApi,
  campaignApi,
  donorApi,
  donorFullName,
  formatTZSFull,
  formatTZSCompact,
  PAY_STATUS_META,
  type DonorPool,
  type PoolMember,
  type PoolCategory,
  type Gender,
  type DonorRecord,
  type CampaignRecord,
} from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

const CATEGORY_LABEL: Record<PoolCategory, string> = {
  FAMILY: "Family",
  SCHOOL: "School",
  STUDENT: "Student",
};

type ReminderChannel = "SMS" | "WHATSAPP" | "EMAIL";

export default function PoolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const poolId = params.id;

  const [pool, setPool] = useState<DonorPool | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignId, setCampaignId] = useState<string>(
    searchParams.get("campaignId") || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await poolApi.get(poolId, campaignId || undefined);
      setPool(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pool.");
    } finally {
      setLoading(false);
    }
  }, [poolId, campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    campaignApi
      .list({ limit: 100 })
      .then((r) => setCampaigns(r.campaigns))
      .catch(() => undefined);
  }, []);

  const selectableMembers = useMemo(
    () =>
      (pool?.members || []).filter(
        (m) => !campaignId || m.status === "UNPAID" || m.status === "PARTIAL"
      ),
    [pool, campaignId]
  );

  const countUnpaid = (pool?.members || []).filter((m) => m.status === "UNPAID").length;
  const countPartial = (pool?.members || []).filter((m) => m.status === "PARTIAL").length;

  if (loading) {
    return (
      <div className="max-w-[1200px]">
        <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground text-sm">Pool not found.</p>
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
    );
  }

  const handleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (selectableMembers.length > 0 && prev.size === selectableMembers.length) {
        return new Set<number>();
      }
      return new Set(selectableMembers.map((m) => m.donor.id));
    });
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this donor pool permanently?")) return;
    await poolApi.remove(poolId);
    router.push("/dashboard/pools");
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
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
        {!pool.isSystem && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="text-xs cursor-pointer"
                onClick={() => router.push(`/dashboard/pools/new?edit=${pool.id}`)}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs cursor-pointer text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete pool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {pool.name}
              </h1>
              <span className="text-[10px] font-medium border border-border rounded-full px-2 py-0.5 text-muted-foreground uppercase tracking-wide">
                {CATEGORY_LABEL[pool.category]}
              </span>
              {pool.isSystem && (
                <span className="text-[10px] font-medium border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Anomalous / unmatched
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {pool.description || "No description provided."}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Owner:{" "}
              <span className="text-foreground">
                {pool.createdBy ? donorFullName(pool.createdBy) : "System"}
              </span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!pool.isSystem && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <CopyPlus className="w-3.5 h-3.5 mr-1.5" />
                Add Members
              </Button>
            )}
            {!pool.isSystem && (
              <Button variant="outline" size="sm" onClick={() => setDupOpen(true)}>
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Resolve Duplicates
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> Members
            </p>
            <p className="text-lg font-semibold text-foreground mt-0.5">
              {pool.memberCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Target className="w-3 h-3" /> Expected
            </p>
            <p className="text-lg font-semibold text-foreground mt-0.5">
              {formatTZSFull(pool.expectedTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Paid by pool
            </p>
            <p className="text-lg font-semibold text-emerald-600 mt-0.5">
              {formatTZSFull(pool.paidTotal)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Compare against campaign
          </Label>
          <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? "")}>
            <SelectTrigger className="h-9 w-56 text-xs">
              <SelectValue placeholder="All campaigns (lifetime)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All campaigns (lifetime)</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {campaignId && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {countUnpaid} not paid · {countPartial} partial
            </span>
          </div>
        )}

        <div className="lg:ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            disabled={selectableMembers.length === 0}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {selected.size === selectableMembers.length && selected.size > 0
              ? "Deselect all"
              : "Select unpaid/partial"}
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0}
            onClick={() => setReminderOpen(true)}
          >
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            Send Reminder ({selected.size})
          </Button>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Members</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Track who has paid in full, partially or not at all — then send
              reminders.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {pool.members?.length || 0} members
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectableMembers.length > 0 && selected.size === selectableMembers.length}
                    onChange={toggleAll}
                    className="accent-primary"
                    aria-label="Select all unpaid / partial"
                  />
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Donor
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Details
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Expected
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Paid
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="w-10 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!pool.members || pool.members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {pool.isSystem
                      ? "No unmatched donations yet."
                      : "No members yet. Click “Add Members” to add donors."}
                  </td>
                </tr>
              ) : (
                pool.members.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    selected={selected.has(m.donor.id)}
                    selectable={campaignId ? m.status === "UNPAID" || m.status === "PARTIAL" : true}
                    selectableContext={Boolean(campaignId)}
                    onSelect={() => handleSelect(m.donor.id)}
                    onExpected={(v) => poolApi.setExpected(poolId, m.donor.id, v).then(refresh)}
                    onRemove={() => {
                      poolApi.removeMember(poolId, m.donor.id).then(refresh);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          setAddOpen(false);
          refresh();
        }}
      />

      <ReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        campaignId={campaignId}
        donorIds={[...selected]}
        donors={(pool.members || [])
          .filter((m) => selected.has(m.donor.id))
          .map((m) => m.donor)}
        onSent={() => setReminderOpen(false)}
      />

      <DuplicatesDialog
        open={dupOpen}
        onOpenChange={setDupOpen}
        currentPoolId={pool.id}
        onResolved={() => {
          setDupOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function MemberRow({
  member,
  selected,
  selectable,
  selectableContext,
  onSelect,
  onExpected,
  onRemove,
}: {
  member: PoolMember;
  selected: boolean;
  selectable: boolean;
  selectableContext: boolean;
  onSelect: () => void;
  onExpected: (value: number | null) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expected, setExpected] = useState<string>(
    member.expectedAmount === null || member.expectedAmount === undefined
      ? ""
      : String(member.expectedAmount)
  );
  const d = member.donor;

  const saveExpected = () => {
    const v = expected.trim();
    onExpected(v === "" ? null : Number(v));
    setEditing(false);
  };

  // Only apply reminder selection when a campaign is selected; otherwise the
  // status is lifetime based and selection is allowed for anyone.
  const canSelect = selectableContext ? selectable : true;

  const statusMeta = member.status ? PAY_STATUS_META[member.status] : null;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            if (canSelect) onSelect();
            else e.preventDefault();
          }}
          disabled={!canSelect}
          className="accent-primary disabled:opacity-30"
          aria-label={`Select ${donorFullName(d)} for reminder`}
        />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
              {`${(d.firstName || "?")[0]}${(d.lastName || "?")[0]}`}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {donorFullName(d)}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {d.phone || d.email || "No contact"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {d.gender && <p>{d.gender.toLowerCase()}{d.position ? ` · ${d.position}` : ""}</p>}
          {d.email && <p className="truncate max-w-[180px]">{d.email}</p>}
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              min={0}
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              className="h-8 w-28 text-xs"
              autoFocus
            />
            <Button size="icon-xs" onClick={saveExpected} aria-label="Save expected amount">
              <Check className="w-3 h-3" />
            </Button>
            <Button size="icon-xs" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
              ×
            </Button>
          </div>
        ) : (
          <span className="text-xs text-foreground">
            {member.expectedAmount !== null && member.expectedAmount !== undefined
              ? formatTZSCompact(member.expectedAmount)
              : "—"}
          </span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-xs font-semibold text-emerald-600">
          {formatTZSFull(member.paidAmount)}
        </span>
        <p className="text-[10px] text-muted-foreground">
          {member.donationCount} gift{member.donationCount === 1 ? "" : "s"}
        </p>
      </td>
      <td className="px-4 py-3.5">
        {statusMeta ? (
          <span
            className={cn(
              "text-[10px] font-medium border rounded-full px-2.5 py-1",
              statusMeta.className
            )}
          >
            {statusMeta.label}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Lifetime total</span>
        )}
      </td>
      <td className="px-3 py-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-xs cursor-pointer"
              onClick={() => {
                setExpected(
                  member.expectedAmount === null || member.expectedAmount === undefined
                    ? ""
                    : String(member.expectedAmount)
                );
                setEditing(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Set expected amount
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs cursor-pointer text-destructive" onClick={onRemove}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Remove from pool
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
}) {
  const poolId = useParams<{ id: string }>().id;
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DonorRecord[]>([]);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "UNSPECIFIED" as Gender,
    position: "",
  });

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await donorApi.list({ search: query.trim(), limit: 20 });
      setResults(r.donors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const togglePick = (id: number) =>
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const addExisting = async () => {
    if (pickedIds.length === 0) return;
    await poolApi.addMembers(poolId, { donorIds: pickedIds });
    setPickedIds([]);
    setResults([]);
    setQuery("");
    onAdded();
  };

  const addNew = async () => {
    setError(null);
    try {
      await poolApi.addMembers(poolId, {
        donors: [
          {
            firstName: form.firstName,
            lastName: form.lastName || undefined,
            email: form.email || undefined,
            phone: form.phone,
            gender: form.gender,
            position: form.position || undefined,
          },
        ],
      });
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "UNSPECIFIED",
        position: "",
      });
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add donor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add Members</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "existing" ? "default" : "outline"}
            onClick={() => setMode("existing")}
          >
            Add existing donor
          </Button>
          <Button
            size="sm"
            variant={mode === "new" ? "default" : "outline"}
            onClick={() => setMode("new")}
          >
            Create new donor
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {mode === "existing" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name / phone / email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={runSearch} disabled={loading}>
                Search
              </Button>
            </div>
            {results.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {results.map((d) => {
                  const picked = pickedIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => togglePick(d.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors",
                        picked && "bg-primary/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={picked}
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
                  );
                })}
              </div>
            )}
            <DialogFooter>
              <Button
                size="sm"
                disabled={pickedIds.length === 0}
                onClick={addExisting}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add {pickedIds.length} donor{pickedIds.length === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+255 7XX XXX XXX"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: (v ?? "UNSPECIFIED") as Gender })}
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
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="e.g. Head Teacher"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" type="button" onClick={addNew}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create &amp; add
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReminderDialog({
  open,
  onOpenChange,
  campaignId,
  donorIds,
  donors,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaignId: string;
  donorIds: number[];
  donors: PoolMember["donor"][];
  onSent: () => void;
}) {
  const poolId = useParams<{ id: string }>().id;
  const [channel, setChannel] = useState<ReminderChannel>("WHATSAPP");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      setError("Message is required.");
      return;
    }
    if (!campaignId) {
      setError("Select a campaign to compare against before sending reminders.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await poolApi.sendReminder({
        campaignId: Number(campaignId),
        donorIds,
        channel,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Send Payment Reminder
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-foreground mt-3">
              Reminders queued
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {donors.length} recipient{senders(donors.length)} will receive a{" "}
              {channel} message.
            </p>
            <Button className="mt-4" size="sm" onClick={onSent}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-foreground">
                {donors.length} selected donor{senders(donors.length)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {donors
                  .slice(0, 5)
                  .map(donorFullName)
                  .join(", ")}
                {donors.length > 5 ? ` +${donors.length - 5} more` : ""}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel((v ?? "WHATSAPP") as ReminderChannel)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {channel === "EMAIL" && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dear donor, your pledge for the campaign is still outstanding. Please complete your payment…"
                className="resize-none text-sm"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={sending}>
                <BellRing className="w-3.5 h-3.5 mr-1.5" />
                {sending ? "Sending…" : "Send Reminder"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function senders(n: number): string {
  return n === 1 ? "" : "s";
}

function DuplicatesDialog({
  open,
  onOpenChange,
  currentPoolId,
  onResolved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentPoolId: number;
  onResolved: () => void;
}) {
  const [groups, setGroups] = useState<
    { donor: { id: number; firstName: string | null; lastName: string | null; phone: string | null }; pools: { id: number; name: string }[] }[]
  >([]);
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    poolApi
      .duplicates()
      .then((r) => {
        setGroups(r.groups);
        const defaults: Record<number, number> = {};
        r.groups.forEach((g) => {
          defaults[g.donor.id] =
            g.pools.some((p) => p.id === currentPoolId)
              ? currentPoolId
              : g.pools[0].id;
        });
        setChoices(defaults);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load duplicates"))
      .finally(() => setLoading(false));
  }, [open, currentPoolId]);

  const resolve = async () => {
    setResolving(true);
    try {
      const payload = Object.entries(choices).map(([donorId, keepPoolId]) => ({
        donorId: Number(donorId),
        keepPoolId,
      }));
      await poolApi.resolveDuplicates(payload);
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve duplicates");
    } finally {
      setResolving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Resolve duplicate donors
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Checking pools…
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center">
            <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No duplicates found — every donor appears in at most one pool.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              These donors appear in more than one pool. Choose the pool where
              each donor should stay — they will be removed from the others.
            </p>
            {groups.map((g) => (
              <div key={g.donor.id} className="border border-border rounded-lg p-3">
                <p className="text-xs font-medium text-foreground">
                  {donorFullName(g.donor)}
                </p>
                <p className="text-[11px] text-muted-foreground mb-2">{g.donor.phone || ""}</p>
                <Select
                  value={String(choices[g.donor.id])}
                  onValueChange={(v) =>
                    setChoices((prev) => ({ ...prev, [g.donor.id]: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="Choose pool to keep" />
                  </SelectTrigger>
                  <SelectContent>
                    {g.pools.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} {p.id === currentPoolId ? "(this pool)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={resolving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={resolve} disabled={resolving}>
                {resolving ? "Resolving…" : "Keep in chosen pools"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}