"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Plus, Users, Wallet, Target, Search } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import {
  poolApi,
  userApi,
  donorFullName,
  formatTZSFull,
  formatTZSCompact,
  POOL_CATEGORY_META,
  type DonorPool,
  type PoolCategory,
  type TeamMemberRecord,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";

export default function PoolsPage() {
  const { isSuperAdmin, isOrgAdmin } = useRole();
  const isAdmin = isSuperAdmin || isOrgAdmin;

  const [pools, setPools] = useState<DonorPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PoolCategory | "">("");
  const [sortBy, setSortBy] = useState<string>("created");
  const [createdBy, setCreatedBy] = useState<string>("");
  const [managers, setManagers] = useState<TeamMemberRecord[]>([]);

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

  const totalMembers = pools.reduce((s, p) => s + p.memberCount, 0);
  const totalPaid = pools.reduce((s, p) => s + p.paidTotal, 0);

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Donor Pools
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pools.length} pools &middot; {totalMembers} donors &middot;{" "}
            {formatTZSCompact(totalPaid)} collected
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
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard/pools/new" />}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Pool
          </Button>
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
                <SelectItem value="FAMILY">Family</SelectItem>
                <SelectItem value="SCHOOL">School</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
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

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No donor pools yet. Create your first pool to segment your donors.
          </p>
          <Button
            className="mt-4"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/pools/new" />}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create a Pool
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pools.map((pool) => {
            const meta = POOL_CATEGORY_META[pool.category];
            return (
              <Link
                key={pool.id}
                href={`/dashboard/pools/${pool.id}`}
                className="group block bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary uppercase">
                        {meta.emoji}
                      </span>
                      <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
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
                  <span className="text-[10px] font-medium border border-border rounded-full px-2 py-0.5 text-muted-foreground uppercase tracking-wide">
                    {pool.category}
                  </span>
                </div>

                {pool.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                    {pool.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
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
                      <Target className="w-3 h-3" /> Expected
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {formatTZSCompact(pool.expectedTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Wallet className="w-3 h-3" /> Paid
                    </p>
                    <p className="text-sm font-semibold text-emerald-600 mt-0.5">
                      {formatTZSCompact(pool.paidTotal)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}