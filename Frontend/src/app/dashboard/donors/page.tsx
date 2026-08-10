"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Upload,
  Filter,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
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
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import {
  DonorStatusBadge,
  ConsentBadge,
  ChannelBadge,
  TagBadge,
} from "@/components/dashboard/donors/donor-badges";
import { AddDonorDialog } from "@/components/dashboard/donors/add-donor-dialog";
import { loadDonors } from "@/lib/dashboard/donor-store";
import { formatTZS, type Donor, type DonorStatus } from "@/lib/dashboard/types";

const PAGE_SIZE = 8;

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [consentFilter, setConsentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setDonors(loadDonors());
  }, []);

  const refreshDonors = () => setDonors(loadDonors());

  const filtered = useMemo(() => {
    return donors.filter((d) => {
      const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
      const matchSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase()) ||
        d.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      const matchConsent =
        consentFilter === "all" || d.consentStatus === consentFilter;
      return matchSearch && matchStatus && matchConsent;
    });
  }, [donors, search, statusFilter, consentFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = () => setPage(1);

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Donor Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {donors.length} donors total &mdash; manage, segment and communicate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/donors/import" />}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Donor
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or location…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleFilterChange();
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? "all");
                handleFilterChange();
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={consentFilter}
              onValueChange={(v) => {
                setConsentFilter(v ?? "all");
                handleFilterChange();
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Consent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consent</SelectItem>
                <SelectItem value="consented">Consented</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                  Donor
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Tags
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Status
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Consent
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Channel
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Total Given
                </th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                  Last Gift
                </th>
                <th className="w-10 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    {donors.length === 0
                      ? "No donors yet. Click “Add Donor” to create your first donor."
                      : "No donors match your filters."}
                  </td>
                </tr>
              )}
              {paginated.map((donor) => {
                const initials = `${donor.firstName[0]}${donor.lastName[0]}`;
                return (
                  <tr
                    key={donor.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Donor */}
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
                            {donor.firstName} {donor.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {donor.email}
                          </p>
                        </div>
                      </Link>
                    </td>
                    {/* Tags */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {donor.tags.slice(0, 2).map((t) => (
                          <TagBadge key={t} tag={t} />
                        ))}
                        {donor.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{donor.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <DonorStatusBadge status={donor.status} />
                    </td>
                    {/* Consent */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <ConsentBadge status={donor.consentStatus} />
                    </td>
                    {/* Channel */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <ChannelBadge channel={donor.preferredChannel} />
                    </td>
                    {/* Total Given */}
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      <span className="text-xs font-semibold text-foreground">
                        {donor.totalGiven > 0
                          ? formatTZS(donor.totalGiven)
                          : "—"}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {donor.giftCount > 0 ? `${donor.giftCount} gifts` : "No gifts"}
                      </p>
                    </td>
                    {/* Last Gift */}
                    <td className="px-4 py-3.5 text-right hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {donor.lastGift || "—"}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            render={<Link href={`/dashboard/donors/${donor.id}`} />}
                            className="text-xs cursor-pointer"
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer">
                            Edit Donor
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer">
                            Record Donation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs cursor-pointer text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
            donors
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                className="w-7 h-7 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="w-7 h-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <AddDonorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={refreshDonors}
      />
    </div>
  );
}
