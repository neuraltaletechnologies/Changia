"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Plus,
  Upload,
  Users,
  Wallet,
  Search,
  CopyPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  Layers,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/dashboard/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  poolApi,
  userApi,
  donorApi,
  donorFullName,
  formatTZSFull,
  formatTZSCompact,
  POOL_CATEGORY_META,
  POOL_CATEGORIES,
  type DonorPool,
  type PoolMemberDonor,
  type PoolCategory,
  type Gender,
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
import { ExportMenu } from "@/components/dashboard/export-menu";
import { ImportWizard } from "@/components/dashboard/import-wizard";

const CATEGORY_LABEL = Object.fromEntries(
  POOL_CATEGORIES.map((c) => [c, POOL_CATEGORY_META[c].label])
) as Record<PoolCategory, string>;

/** <SelectItem>s for every pool category — shared by the filter, create & edit UIs. */
function CategoryOptions() {
  return (
    <>
      {POOL_CATEGORIES.map((c) => (
        <SelectItem key={c} value={c}>
          {POOL_CATEGORY_META[c].label}
        </SelectItem>
      ))}
    </>
  );
}

/** Labeled horizontal rule that names the area beneath it. */
function SectionDivider({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Layers;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex items-center gap-2 shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {hint && (
          <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground/70">
            &mdash; {hint}
          </span>
        )}
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ─── Pool list card (select on click, ⋯ menu for edit / delete) ────────────── */

function PoolCard({
  pool,
  active,
  canManage,
  onSelect,
  onEdit,
  onDelete,
}: {
  pool: DonorPool;
  active: boolean;
  canManage: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = POOL_CATEGORY_META[pool.category];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative block text-left bg-card border rounded-xl p-5 shadow-sm transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary ring-1 ring-primary/30 shadow-md"
          : "border-border hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary uppercase shrink-0">
              {meta.emoji}
            </span>
            <h2
              className={cn(
                "text-sm font-semibold text-foreground transition-colors truncate",
                active ? "text-primary" : "group-hover:text-primary"
              )}
            >
              {pool.name}
            </h2>
          </div>
          {pool.isSystem && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              System pool — unmatched donors
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-medium border border-border rounded-full px-2 py-0.5 text-muted-foreground uppercase tracking-wide">
            {pool.category}
          </span>
          {canManage && !pool.isSystem && (
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-7 h-7 -mr-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label={`Actions for ${pool.name}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="text-xs cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs cursor-pointer text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete pool
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {pool.description && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
          {pool.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Donors
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {pool.memberCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Contributed
          </p>
          <p className="text-sm font-semibold text-emerald-600 mt-0.5">
            {formatTZSCompact(pool.paidTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PoolsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin, isOrgAdmin, hasPermission } = useRole();
  const isAdmin = isSuperAdmin || isOrgAdmin;
  const canCreate = hasPermission("donorpool:create");

  const [pools, setPools] = useState<DonorPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PoolCategory | "">("");
  const [sortBy, setSortBy] = useState<string>("created");
  const [createdBy, setCreatedBy] = useState<string>("");
  const [managers, setManagers] = useState<UserRecord[]>([]);

  const [selectedId, setSelectedId] = useState<string>(searchParams.get("pool") || "");
  const [editingPool, setEditingPool] = useState<DonorPool | null>(null);
  const [creatingPool, setCreatingPool] = useState(searchParams.get("new") === "1");
  const [poolMutations, setPoolMutations] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await poolApi.list({
        search: search || undefined,
        category: category || undefined,
        sortBy: (sortBy || "created") as "created",
        createdBy: createdBy || undefined,
      });
      setPools(result.pools);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load donor pools.");
    } finally {
      setLoading(false);
    }
  }, [search, category, sortBy, createdBy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (isAdmin) {
      userApi.list({ role: "CAMPAIGN_MANAGER", limit: 100 }).then((r) => setManagers(r.users));
    }
  }, [isAdmin]);

  const closeCreate = useCallback(() => {
    setCreatingPool(false);
    if (searchParams.get("new")) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("new");
      router.replace(
        `/dashboard/pools${params.toString() ? `?${params}` : ""}`,
        { scroll: false }
      );
    }
  }, [searchParams, router]);

  const selectPool = useCallback(
    (id: string) => {
      const next = id === selectedId ? "" : id;
      setSelectedId(next);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (next) params.set("pool", next);
      else params.delete("pool");
      router.replace(`/dashboard/pools${params.toString() ? `?${params}` : ""}`, {
        scroll: false,
      });
    },
    [selectedId, searchParams, router]
  );

  const deletePool = useCallback(
    async (pool: DonorPool) => {
      if (!window.confirm(`Delete the pool “${pool.name}” permanently?`)) return;
      await poolApi.remove(pool.id);
      if (String(pool.id) === selectedId) selectPool("");
      refresh();
    },
    [selectedId, selectPool, refresh]
  );

  const totalMembers = pools.reduce((s, p) => s + p.memberCount, 0);
  const totalPaid = pools.reduce((s, p) => s + p.paidTotal, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Donor Pools
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pools.length} pools &middot; {totalMembers} donors &middot;{" "}
            {formatTZSCompact(totalPaid)} contributed &mdash; pick a pool to
            manage its donors, or leave it unselected to browse everyone
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/pools/anomalous" />}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Anomalous
          </Button>
          <ExportMenu dataset="donor-pools" label="Export pools" />
          <ExportMenu dataset="donors" label="Export donors" />
          {canCreate && (
            <Button size="sm" onClick={() => setCreatingPool(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Pool
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search pools by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={category || "all"}
              onValueChange={(v) => setCategory(v === "all" ? "" : (v as PoolCategory))}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <CategoryOptions />
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "created")}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Newest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="members">Most donors</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select
                value={createdBy}
                onValueChange={(v) => setCreatedBy(v ?? "")}
              >
                <SelectTrigger className="h-9 w-44 text-xs">
                  <SelectValue placeholder="All managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All managers</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {donorFullName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <SectionDivider
        icon={Layers}
        title="Donor pool area"
        hint="your segments — click one to work with its donors"
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No donor pools yet.{" "}
            {canCreate
              ? "Create your first pool to segment your donors."
              : "A campaign manager or org admin can create one."}
          </p>
          {canCreate && (
            <Button className="mt-4" size="sm" onClick={() => setCreatingPool(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create a Pool
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              active={String(pool.id) === selectedId}
              canManage={canCreate}
              onSelect={() => selectPool(String(pool.id))}
              onEdit={() => setEditingPool(pool)}
              onDelete={() => deletePool(pool)}
            />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <SectionDivider
            icon={UserPlus}
            title="Donor section"
            hint={
              selectedId
                ? "donors inside the selected pool — click a donor for their full profile"
                : "every donor — select a pool above to narrow this to that pool"
            }
          />
          <DonorPanel
            key={`${selectedId || "all"}:${poolMutations}`}
            poolId={selectedId}
            onChanged={refresh}
            onDeleted={() => {
              selectPool("");
              refresh();
            }}
          />
        </>
      )}

      {editingPool && (
        <EditPoolSheet
          pool={editingPool}
          open
          onOpenChange={(o) => !o && setEditingPool(null)}
          onSaved={() => {
            setEditingPool(null);
            setPoolMutations((n) => n + 1);
            refresh();
          }}
        />
      )}

      {creatingPool && (
        <CreatePoolSheet
          open
          managers={isAdmin ? managers : []}
          onOpenChange={(o) => !o && closeCreate()}
          onCreated={(id) => {
            closeCreate();
            setPoolMutations((n) => n + 1);
            refresh();
            setSelectedId(String(id));
            const params = new URLSearchParams(Array.from(searchParams.entries()));
            params.delete("new");
            params.set("pool", String(id));
            router.replace(`/dashboard/pools?${params}`, { scroll: false });
          }}
        />
      )}
    </div>
  );
}

/* ─── Donor panel — every donor, or just the donors in the selected pool ────── */

type RowDonor = Pick<
  PoolMemberDonor,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "gender"
  | "position"
  | "status"
  | "consentStatus"
  | "preferredChannel"
>;

const PANEL_PAGE_SIZE = 10;

type DonorPanelColumn = "donor" | "details" | "contributed";

const donorPanelColumnAccessors: SortAccessors<
  { donor: RowDonor; contributed: number; gifts: number },
  DonorPanelColumn
> = {
  donor: ({ donor }) => donorFullName(donor).toLowerCase(),
  details: ({ donor }) =>
    (donor.email || donor.position || donor.gender || "").toLowerCase(),
  contributed: ({ contributed }) => contributed ?? 0,
};

function DonorPanel({
  poolId,
  onChanged,
  onDeleted,
}: {
  poolId: string;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { hasPermission } = useRole();
  const canManagePool = hasPermission("donorpool:create");
  const canEditDonor = hasPermission("donor:manage");

  const [pool, setPool] = useState<DonorPool | null>(null);
  const [allDonors, setAllDonors] = useState<DonorRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [quickEdit, setQuickEdit] = useState<RowDonor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (poolId) {
        setPool(await poolApi.get(poolId));
      } else {
        const r = await donorApi.list({
          search: search || undefined,
          sortBy: "created",
          page,
          limit: PANEL_PAGE_SIZE,
        });
        setAllDonors(r.donors);
        const p = r.pagination as { total?: number };
        setTotal(p?.total ?? r.donors.length);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load donors.");
    } finally {
      setLoading(false);
    }
  }, [poolId, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: { donor: RowDonor; contributed: number; gifts: number }[] = poolId
    ? (pool?.members ?? []).map((m) => ({
        donor: m.donor,
        contributed: m.paidAmount,
        gifts: m.donationCount,
      }))
    : allDonors.map((d) => ({
        donor: d,
        contributed: d.totalPaid,
        gifts: d.donationCount,
      }));

  const {
    sorted: sortedRows,
    sort: colSort,
    toggle: toggleColSort,
  } = useTableSort(rows, donorPanelColumnAccessors);

  if (loading && !pool && allDonors.length === 0) {
    return <div className="h-56 rounded-xl bg-card border border-border animate-pulse" />;
  }

  if (poolId && !pool) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error || "Pool not found."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PANEL_PAGE_SIZE));

  const removeDonor = async (donorId: number) => {
    if (
      !window.confirm(
        "Delete this donor permanently? This removes them from every pool and cannot be undone."
      )
    )
      return;
    try {
      await donorApi.remove(donorId);
      load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete donor.");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {poolId && pool ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground">{pool.name}</h2>
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
            <p className="text-[11px] text-muted-foreground mt-1">
              {pool.memberCount} donor{pool.memberCount === 1 ? "" : "s"} &middot;{" "}
              {formatTZSFull(pool.paidTotal)} contributed lifetime
            </p>
          </div>
        ) : (
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">All donors</h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              {total} donor{total === 1 ? "" : "s"} across your organization
            </p>
            <div className="relative mt-2 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search donors by name / phone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        )}

        {poolId && pool && !pool.isSystem && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <ExportMenu dataset="pool-members" params={{ poolId }} label="Export" />
            {canManagePool && (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Import
                </Button>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <CopyPlus className="w-3.5 h-3.5 mr-1.5" />
                  Add Members
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDupOpen(true)}>
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Resolve Duplicates
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import members into {pool?.name}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ImportWizard
              dataset="pool-members"
              params={{ poolId }}
              columns={[
                { field: "donor_phone", required: true, help: "Tanzanian number, e.g. +255712345678" },
                { field: "expected_amount", help: "Optional TZS amount expected" },
                { field: "first_name", help: "Used only when creating a new donor" },
                { field: "last_name" },
                { field: "email" },
                { field: "location" },
                { field: "gender", help: "MALE / FEMALE / UNSPECIFIED" },
                { field: "position" },
                { field: "status", help: "ACTIVE / PROSPECT / LAPSED / INACTIVE" },
                { field: "consent_status", help: "CONSENTED / PENDING / WITHDRAWN" },
                { field: "preferred_channel", help: "SMS / WHATSAPP / EMAIL / PHONE" },
                { field: "notes" },
              ]}
              description="Each row links an existing donor by phone, or creates a new donor from the extra columns."
              onImported={() => {
                load();
                onChanged();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {error && (
        <div className="px-5 py-2.5 text-xs text-destructive bg-destructive/5 border-b border-destructive/20">
          {error}
        </div>
      )}

      {/* Donor table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <SortableTh sortKey="donor" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Donor
              </SortableTh>
              <SortableTh sortKey="details" sort={colSort} onSort={toggleColSort} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                Details
              </SortableTh>
              <SortableTh sortKey="contributed" sort={colSort} onSort={toggleColSort} align="right" className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                Contributed
              </SortableTh>
              <th className="w-10 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {poolId
                    ? pool?.isSystem
                      ? "No unmatched donations yet."
                      : "No donors yet. Click “Add Members” to add donors."
                    : search
                      ? "No donors match your search."
                      : "No donors yet."}
                </td>
              </tr>
            ) : (
              sortedRows.map(({ donor, contributed, gifts }) => (
                <DonorRow
                  key={donor.id}
                  donor={donor}
                  contributed={contributed}
                  gifts={gifts}
                  canEdit={canEditDonor}
                  showRemoveFromPool={Boolean(poolId) && !pool?.isSystem && canManagePool}
                  onQuickEdit={() => setQuickEdit(donor)}
                  onRemoveFromPool={() => {
                    if (!pool) return;
                    poolApi
                      .removeMember(pool.id, donor.id)
                      .then(load)
                      .then(onChanged);
                  }}
                  onDelete={() => removeDonor(donor.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (all-donors mode only) */}
      {!poolId && total > PANEL_PAGE_SIZE && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} &middot; {total} donors
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {pool && (
        <>
          <AddMemberDialog
            poolId={pool.id}
            open={addOpen}
            onOpenChange={setAddOpen}
            onAdded={() => {
              setAddOpen(false);
              load();
              onChanged();
            }}
          />
          <DuplicatesDialog
            open={dupOpen}
            onOpenChange={setDupOpen}
            currentPoolId={pool.id}
            onResolved={() => {
              setDupOpen(false);
              load();
              onChanged();
            }}
          />
        </>
      )}

      {quickEdit && (
        <QuickEditDonorSheet
          key={quickEdit.id}
          donor={quickEdit}
          onClose={() => setQuickEdit(null)}
          onSaved={() => {
            setQuickEdit(null);
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function DonorRow({
  donor,
  contributed,
  gifts,
  canEdit,
  showRemoveFromPool,
  onQuickEdit,
  onRemoveFromPool,
  onDelete,
}: {
  donor: RowDonor;
  contributed: number;
  gifts: number;
  canEdit: boolean;
  showRemoveFromPool: boolean;
  onQuickEdit: () => void;
  onRemoveFromPool: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const initials = `${(donor.firstName || "?")[0]}${(donor.lastName || "?")[0]}`;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-5 py-3.5">
        <Link
          href={`/dashboard/donors/${donor.id}`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {donorFullName(donor)}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {donor.phone || donor.email || "No contact"}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {donor.gender && donor.gender !== "UNSPECIFIED" && (
            <p className="capitalize">
              {donor.gender.toLowerCase()}
              {donor.position ? ` · ${donor.position}` : ""}
            </p>
          )}
          {donor.email && <p className="truncate max-w-[180px]">{donor.email}</p>}
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-xs font-semibold text-emerald-600">
          {formatTZSFull(contributed)}
        </span>
        <p className="text-[10px] text-muted-foreground">
          {gifts} gift{gifts === 1 ? "" : "s"}
        </p>
      </td>
      <td className="px-3 py-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-xs cursor-pointer"
              onClick={() => router.push(`/dashboard/donors/${donor.id}`)}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              View full profile
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem
                className="text-xs cursor-pointer"
                onClick={onQuickEdit}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Edit details
              </DropdownMenuItem>
            )}
            {(showRemoveFromPool || canEdit) && <DropdownMenuSeparator />}
            {showRemoveFromPool && (
              <DropdownMenuItem
                className="text-xs cursor-pointer text-destructive"
                onClick={onRemoveFromPool}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Remove from pool
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem
                className="text-xs cursor-pointer text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete donor
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

/* ─── Edit pool sheet (right-side drawer) ───────────────────────────────────── */

function EditPoolSheet({
  pool,
  open,
  onOpenChange,
  onSaved,
}: {
  pool: DonorPool;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: pool.name,
    description: pool.description ?? "",
    category: pool.category as PoolCategory,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (form.name.trim().length < 2) {
      setError("Pool name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await poolApi.update(pool.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save pool.");
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit pool details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Pool name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm({ ...form, category: (v ?? "FAMILY") as PoolCategory })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <CategoryOptions />
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="resize-none text-sm"
              placeholder="What is this pool for?"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
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

/* ─── Create pool sheet (right-side drawer) ─────────────────────────────────── */

function CreatePoolSheet({
  open,
  onOpenChange,
  onCreated,
  managers,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: number) => void;
  managers: UserRecord[];
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "FAMILY" as PoolCategory,
  });
  const [createdBy, setCreatedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (form.name.trim().length < 2) {
      setError("Pool name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await poolApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        createdBy: createdBy ? Number(createdBy) : undefined,
      });
      onCreated(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create the pool.");
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Create a donor pool</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Group donors (family, school or student) so you can import them into
            campaigns and track who has paid. Pools you create are only visible to
            you and admins.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Pool name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Msuya Family Members"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm({ ...form, category: (v ?? "FAMILY") as PoolCategory })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <CategoryOptions />
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="resize-none text-sm"
              placeholder="Who is in this pool and why…"
            />
          </div>
          {managers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Owner &mdash; optional, create on behalf of a manager
              </Label>
              <Select
                value={createdBy || "self"}
                onValueChange={(v) => setCreatedBy(v === "self" ? "" : (v ?? ""))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Own it yourself</SelectItem>
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
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create pool"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Quick-edit donor sheet (right-side drawer) ────────────────────────────── */

const DONOR_CHANNELS = ["SMS", "WHATSAPP", "EMAIL", "PHONE"] as const;
const DONOR_CHANNEL_LABEL: Record<(typeof DONOR_CHANNELS)[number], string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  PHONE: "Phone Call",
};

function QuickEditDonorSheet({
  donor,
  onClose,
  onSaved,
}: {
  donor: RowDonor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: donor.firstName ?? "",
    lastName: donor.lastName ?? "",
    phone: donor.phone ?? "",
    email: donor.email ?? "",
    position: donor.position ?? "",
    gender: (donor.gender ?? "UNSPECIFIED") as Gender,
    status: (donor.status || "PROSPECT") as string,
    consentStatus: (donor.consentStatus || "PENDING") as string,
    preferredChannel: (donor.preferredChannel || "SMS") as string,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (form.firstName.trim().length < 1) {
      setError("First name is required.");
      return;
    }
    // Same rule as the add-donor sheet: a phone is always required, and an
    // email donor also needs an email address.
    if (!form.phone.trim()) {
      setError("A phone number is required.");
      return;
    }
    if (
      form.phone.trim() &&
      !/^(\+?255|0)?[67][0-9]{8}$/.test(form.phone.replace(/[\s-]/g, ""))
    ) {
      setError("Enter a valid Tanzanian phone number.");
      return;
    }
    if (form.preferredChannel === "EMAIL" && !form.email.trim()) {
      setError("An email address is required when the preferred channel is Email.");
      return;
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        position: form.position.trim() || undefined,
        gender: form.gender ?? "UNSPECIFIED",
        status: form.status,
        consentStatus: form.consentStatus,
        preferredChannel: form.preferredChannel,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      };
      await donorApi.update(donor.id, payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save donor.");
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit donor details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
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
          <div className="space-y-1.5">
            <Label className="text-xs">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+255 7XX XXX XXX"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Email
              {form.preferredChannel === "EMAIL" && (
                <span className="text-destructive"> *</span>
              )}
            </Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <Select
                value={form.gender ?? "UNSPECIFIED"}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "PROSPECT" })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="LAPSED">Lapsed</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Consent</Label>
              <Select
                value={form.consentStatus}
                onValueChange={(v) => setForm({ ...form, consentStatus: v ?? "PENDING" })}
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
            <Label className="text-xs">
              Preferred channel <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.preferredChannel}
              onValueChange={(v) => setForm({ ...form, preferredChannel: v ?? "SMS" })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DONOR_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {DONOR_CHANNEL_LABEL[c]}
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
          <button
            type="button"
            onClick={() => router.push(`/dashboard/donors/${donor.id}`)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open full profile (consent, payment methods, history)
          </button>
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

/* ─── Add member dialog ─────────────────────────────────────────────────────── */

function AddMemberDialog({
  poolId,
  open,
  onOpenChange,
  onAdded,
}: {
  poolId: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
}) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Members</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-3">
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
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                disabled={pickedIds.length === 0}
                onClick={addExisting}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add {pickedIds.length} donor{pickedIds.length === 1 ? "" : "s"}
              </Button>
            </div>
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
            <div className="flex justify-end pt-1">
              <Button size="sm" type="button" onClick={addNew}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create &amp; add
              </Button>
            </div>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Resolve duplicates dialog ─────────────────────────────────────────────── */

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
    {
      donor: { id: number; firstName: string | null; lastName: string | null; phone: string | null };
      pools: { id: number; name: string }[];
    }[]
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
          defaults[g.donor.id] = g.pools.some((p) => p.id === currentPoolId)
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
