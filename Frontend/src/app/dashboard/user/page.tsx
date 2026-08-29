"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Shield,
  Pencil,
  Trash2,
  Mail,
  ArrowDownAZ,
  ArrowUpAZ,
  Users,
  Building2,
  KeyRound,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/dashboard/ui/dialog";
import {
  userApi,
  organizationApi,
  type UserRecord,
  type UserRole,
  type OrganizationBrief,
} from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/dashboard/utils";

const PAGE_SIZE = 10;

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Org Admin",
  REVIEWER: "Reviewer",
  CAMPAIGN_MANAGER: "Campaign Manager",
};

const ROLE_BADGE: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
  ORG_ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
  REVIEWER: "bg-amber-50 text-amber-700 border-amber-200",
  CAMPAIGN_MANAGER: "bg-sky-50 text-sky-700 border-sky-200",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-slate-50 text-slate-500 border-slate-200",
};

function initialsOf(m: Pick<UserRecord, "firstName" | "lastName">): string {
  return `${m.firstName?.[0] ?? "?"}${m.lastName?.[0] ?? ""}`.slice(0, 2);
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-TZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UserPage() {
  const { user, isSuperAdmin } = useRole();

  const [members, setMembers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [organizations, setOrganizations] = useState<OrganizationBrief[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<UserRecord | null>(null);
  const [roleMember, setRoleMember] = useState<UserRecord | null>(null);
  const [deleteMember, setDeleteMember] = useState<UserRecord | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      organizationApi
        .listAll()
        .then((r) => setOrganizations(r.organizations))
        .catch(() => setOrganizations([]));
    }
  }, [isSuperAdmin]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await userApi.list({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        organizationId:
          isSuperAdmin && orgFilter !== "all" ? orgFilter : undefined,
        sortBy: sortBy as "created",
        sortDir,
        page,
        limit: PAGE_SIZE,
      });
      setMembers(result.users);
      const pagination = result.pagination as { total?: number };
      setTotal(pagination?.total ?? result.users.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user members.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, isSuperAdmin, orgFilter, sortBy, sortDir, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} member{total === 1 ? "" : "s"} &mdash; manage roles, access and
            records
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Add Member
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                <SelectItem value="REVIEWER">Reviewer</SelectItem>
                <SelectItem value="CAMPAIGN_MANAGER">Campaign Manager</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {isSuperAdmin && organizations.length > 0 && (
              <Select
                value={orgFilter}
                onValueChange={(v) => {
                  setOrgFilter(v ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-44 text-xs">
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v ?? "created");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Newest first</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="lastLogin">Last login</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              className="h-9 w-9"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label="Toggle sort direction"
            >
              {sortDir === "asc" ? (
                <ArrowUpAZ className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownAZ className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                  Member
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Role
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Status
                </th>
                {isSuperAdmin && (
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Organization
                  </th>
                )}
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Last Login
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Joined
                </th>
                <th className="w-10 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 7 : 6}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    Loading members…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 7 : 6}
                    className="px-5 py-12 text-center"
                  >
                    <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No members match your filters.
                    </p>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const isSelf = user && Number(user.id) === Number(member.id);
                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                              {initialsOf(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {`${member.firstName} ${member.lastName ?? ""}`.trim()}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5",
                            ROLE_BADGE[member.role] || ROLE_BADGE.CAMPAIGN_MANAGER
                          )}
                        >
                          {ROLE_LABEL[member.role] || member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5",
                            STATUS_BADGE[member.status] || STATUS_BADGE.INACTIVE
                          )}
                        >
                          {member.status.toLowerCase()}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {member.organizationName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Building2 className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-36">{member.organizationName}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(member.lastLoginAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(member.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Member actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={() => setRoleMember(member)}
                            >
                              <Shield className="w-3.5 h-3.5 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={() => setEditMember(member)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            {!isSelf && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-xs cursor-pointer"
                                  variant="destructive"
                                  onClick={() => setDeleteMember(member)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && members.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} &middot; {total} members
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
      </div>

      {/* Add member dialog */}
      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isSuperAdmin={isSuperAdmin}
        organizations={organizations}
        onCreated={(password) => setTempPassword(password)}
        onSaved={refresh}
      />

      {/* Change role dialog */}
      <ChangeRoleDialog
        member={roleMember}
        onOpenChange={(open) => {
          if (!open) setRoleMember(null);
        }}
        isSuperAdmin={isSuperAdmin}
        onSaved={refresh}
      />

      {/* Edit dialog */}
      <EditMemberDialog
        member={editMember}
        onOpenChange={(open) => {
          if (!open) setEditMember(null);
        }}
        isSuperAdmin={isSuperAdmin}
        onSaved={refresh}
      />

      {/* Delete confirm */}
      <Dialog
        open={deleteMember !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteMember(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Remove member
            </DialogTitle>
            <DialogDescription>
              {deleteMember
                ? `Remove ${deleteMember.firstName} ${deleteMember.lastName ?? ""}`.trim() +
                  " from the user? This permanently deletes their account."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!deleteMember) return;
                try {
                  setError(null);
                  await userApi.remove(deleteMember.id);
                  setDeleteMember(null);
                  refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to remove member.");
                  setDeleteMember(null);
                }
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary password dialog */}
      <Dialog
        open={tempPassword !== null}
        onOpenChange={(open) => {
          if (!open) setTempPassword(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Member created
            </DialogTitle>
            <DialogDescription>
              Share this one-time password with the new member. They can change
              it after signing in.
            </DialogDescription>
          </DialogHeader>
          <TempPasswordField
            password={tempPassword ?? ""}
            onClear={() => setTempPassword(null)}
          />
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setTempPassword(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add member dialog ────────────────────────────────────────────────────────

function AddMemberDialog({
  open,
  onOpenChange,
  isSuperAdmin,
  organizations,
  onCreated,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  organizations: OrganizationBrief[];
  onCreated: (temporaryPassword: string) => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("CAMPAIGN_MANAGER");
  const [orgId, setOrgId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleOptions: UserRole[] = isSuperAdmin
    ? ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"]
    : ["ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"];

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("CAMPAIGN_MANAGER");
      setOrgId("");
      setErrors({});
      setServerError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const nextErrors: Record<string, string> = {};
    if (firstName.trim().length < 2) {
      nextErrors.firstName = "First name is required (min 2 characters).";
    }
    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) {
      nextErrors.email = "A valid email is required.";
    }
    if (phone.trim() && !/^(\+?255|0)?[67][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      nextErrors.phone = "Enter a valid Tanzanian phone number.";
    }
    if (isSuperAdmin && role !== "SUPER_ADMIN" && !orgId) {
      nextErrors.orgId = "Select an organization for this member.";
    }
    if (orgId && role === "SUPER_ADMIN") {
      nextErrors.orgId = "Super admins are platform-level and have no organization.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const result = await userApi.create({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        organizationId: orgId ? Number(orgId) : undefined,
      });
      onCreated(result.temporaryPassword);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Add User Member
          </DialogTitle>
          <DialogDescription>
            The new member receives a temporary password to sign in with.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-first-name" className="text-xs">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="member-first-name"
                placeholder="e.g. Amina"
                maxLength={100}
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={Boolean(errors.firstName)}
                className={`h-9 text-sm ${errors.firstName ? "border-destructive" : ""}`}
              />
              {errors.firstName ? (
                <p role="alert" className="text-xs text-destructive">{errors.firstName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-last-name" className="text-xs">
                Last Name
              </Label>
              <Input
                id="member-last-name"
                placeholder="e.g. Hassan"
                maxLength={100}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="member-email" className="text-xs">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="member-email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              className={`h-9 text-sm ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email ? (
              <p role="alert" className="text-xs text-destructive">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="member-phone" className="text-xs">
              Phone Number
            </Label>
            <Input
              id="member-phone"
              type="tel"
              placeholder="+255 7XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              className={`h-9 text-sm ${errors.phone ? "border-destructive" : ""}`}
            />
            {errors.phone ? (
              <p role="alert" className="text-xs text-destructive">{errors.phone}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole((v ?? "CAMPAIGN_MANAGER") as UserRole)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSuperAdmin && organizations.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Organization</Label>
              <Select
                value={orgId}
                onValueChange={(v) => setOrgId(v ?? "")}
                disabled={role === "SUPER_ADMIN"}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={role === "SUPER_ADMIN" ? "Platform (no org)" : "Select organization"} />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.orgId ? (
                <p role="alert" className="text-xs text-destructive">{errors.orgId}</p>
              ) : null}
            </div>
          )}

          {serverError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Creating…" : "Create Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change role dialog ───────────────────────────────────────────────────────

function ChangeRoleDialog({
  member,
  onOpenChange,
  isSuperAdmin,
  onSaved,
}: {
  member: UserRecord | null;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<UserRole>("CAMPAIGN_MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setError(null);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || role === member.role) {
      onOpenChange(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await userApi.update(member.id, { role });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Change role
          </DialogTitle>
          <DialogDescription>
            {member
              ? `${member.firstName} ${member.lastName ?? ""}`.trim() +
                " currently holds the " +
                (ROLE_LABEL[member.role] || member.role) +
                " role."
              : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">New Role</Label>
            <Select value={role} onValueChange={(v) => setRole((v ?? "CAMPAIGN_MANAGER") as UserRole)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(isSuperAdmin
                  ? ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"]
                  : ["ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"]
                ).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r as UserRole]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSuperAdmin && (
              <p className="text-[10px] text-muted-foreground">
                Only a super admin can assign the super admin role.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit member dialog ───────────────────────────────────────────────────────

function EditMemberDialog({
  member,
  onOpenChange,
  isSuperAdmin,
  onSaved,
}: {
  member: UserRecord | null;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  onSaved: () => void;
}) {
  const { user } = useRole();
  const isSelf = member !== null && user !== null && Number(user.id) === Number(member.id);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("CAMPAIGN_MANAGER");
  const [status, setStatus] = useState("ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFirstName(member.firstName);
      setLastName(member.lastName ?? "");
      setPhone(member.phone ?? "");
      setRole(member.role);
      setStatus(member.status);
      setErrors({});
      setServerError(null);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setErrors({});
    setServerError(null);

    const nextErrors: Record<string, string> = {};
    if (firstName.trim().length < 2) {
      nextErrors.firstName = "First name is required (min 2 characters).";
    }
    if (phone.trim() && !/^(\+?255|0)?[67][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      nextErrors.phone = "Enter a valid Tanzanian phone number.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await userApi.update(member.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        status,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to update member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit member
          </DialogTitle>
          <DialogDescription>
            Update details, status or access for this member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-first-name" className="text-xs">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-first-name"
                maxLength={100}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={Boolean(errors.firstName)}
                className={`h-9 text-sm ${errors.firstName ? "border-destructive" : ""}`}
              />
              {errors.firstName ? (
                <p role="alert" className="text-xs text-destructive">{errors.firstName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-last-name" className="text-xs">
                Last Name
              </Label>
              <Input
                id="edit-last-name"
                maxLength={100}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="text-xs">
              Phone Number
            </Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              className={`h-9 text-sm ${errors.phone ? "border-destructive" : ""}`}
            />
            {errors.phone ? (
              <p role="alert" className="text-xs text-destructive">{errors.phone}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole((v ?? "CAMPAIGN_MANAGER") as UserRole)}
                disabled={isSelf}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isSuperAdmin
                    ? ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"]
                    : ["ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"]
                  ).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r as UserRole]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? "ACTIVE")} disabled={isSelf}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {serverError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Temporary password view ──────────────────────────────────────────────────

function TempPasswordField({
  password,
  onClear,
}: {
  password: string;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [password]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Temporary password</Label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
        <code className="flex-1 text-sm font-semibold text-foreground truncate">
          {password}
        </code>
        <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy password">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      {copied && <p className="text-xs text-muted-foreground">Copied to clipboard.</p>}
      <Button type="button" variant="link" size="xs" className="px-0 text-xs" onClick={onClear}>
        Close
      </Button>
    </div>
  );
}