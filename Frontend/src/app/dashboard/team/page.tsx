"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  MoreHorizontal,
  Mail,
  Shield,
  Clock,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { Badge } from "@/components/dashboard/ui/badge";
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
  DialogFooter,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { loadTeamMembers, saveTeamMember } from "@/lib/dashboard/team-store";
import type { TeamMember } from "@/lib/dashboard/types";
import { cn } from "@/lib/dashboard/utils";

const roleColors: Record<TeamMember["role"], string> = {
  admin: "bg-rose-50 text-rose-700 border-rose-200",
  manager: "bg-sky-50 text-sky-700 border-sky-200",
  fundraiser: "bg-emerald-50 text-emerald-700 border-emerald-200",
  viewer: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusColors: Record<TeamMember["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  inactive: "bg-slate-50 text-slate-500",
};

const rolePermissions: Record<
  TeamMember["role"],
  { label: string; allowed: boolean }[]
> = {
  admin: [
    { label: "Manage team", allowed: true },
    { label: "Delete records", allowed: true },
    { label: "Export data", allowed: true },
    { label: "View reports", allowed: true },
  ],
  manager: [
    { label: "Manage team", allowed: false },
    { label: "Delete records", allowed: false },
    { label: "Export data", allowed: true },
    { label: "View reports", allowed: true },
  ],
  fundraiser: [
    { label: "Manage team", allowed: false },
    { label: "Delete records", allowed: false },
    { label: "Export data", allowed: false },
    { label: "View reports", allowed: true },
  ],
  viewer: [
    { label: "Manage team", allowed: false },
    { label: "Delete records", allowed: false },
    { label: "Export data", allowed: false },
    { label: "View reports", allowed: true },
  ],
};

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("viewer");

  useEffect(() => {
    setTeamMembers(loadTeamMembers());
  }, []);

  const refreshMembers = () => setTeamMembers(loadTeamMembers());

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setTimeout(() => {
      saveTeamMember({
        id: `t-${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        status: "pending",
        lastActive: "Invitation sent",
      });
      refreshMembers();
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteLoading(false);
      setInviteOpen(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Team Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teamMembers.filter((m) => m.status === "active").length} active
            members &mdash; manage access and permissions
          </p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Invite Member
        </Button>
      </div>

      {/* Roles overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["admin", "manager", "fundraiser", "viewer"] as const).map((role) => {
          const count = teamMembers.filter((m) => m.role === role).length;
          return (
            <div
              key={role}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <p className="text-lg font-semibold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {role}
                {count !== 1 ? "s" : ""}
              </p>
              <div className="mt-2 space-y-1">
                {rolePermissions[role].map((p) => (
                  <div key={p.label} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        p.allowed ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Members table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            All Members
          </h2>
        </div>
        <div className="divide-y divide-border">
          {teamMembers.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No team members yet. Click “Invite Member” to add the first one.
            </div>
          )}
          {teamMembers.map((member) => {
            const initials = member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2);

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span>{member.email}</span>
                  </div>
                </div>

                {/* Role */}
                <div className="hidden sm:block">
                  <span
                    className={cn(
                      "text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize",
                      roleColors[member.role]
                    )}
                  >
                    {member.role}
                  </span>
                </div>

                {/* Status */}
                <div className="hidden md:block">
                  <span
                    className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5 capitalize",
                      statusColors[member.status]
                    )}
                  >
                    {member.status}
                  </span>
                </div>

                {/* Last active */}
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{member.lastActive}</span>
                </div>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-xs cursor-pointer">
                        <Shield className="w-3.5 h-3.5 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer">
                        <Mail className="w-3.5 h-3.5 mr-2" />
                        Resend Invite
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs cursor-pointer text-destructive">
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail" className="text-xs">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@example.com"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole((v ?? "viewer") as TeamMember["role"])}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="fundraiser">Fundraiser</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                They will receive an email invitation to join your organisation.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={inviteLoading}>
                {inviteLoading ? "Sending…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
