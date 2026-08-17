"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Avatar, AvatarFallback } from "@/components/dashboard/ui/avatar";
import { userApi } from "@/lib/dashboard/api";
import {
  ApiClientError,
  getToken,
  getStoredUser,
  setSession,
  type ApiUser,
} from "@/lib/api-client";
import { useRole } from "@/hooks/use-role";

function initialsOf(u: Pick<ApiUser, "firstName" | "lastName">): string {
  return `${u.firstName?.[0] ?? "?"}${u.lastName?.[0] ?? ""}`.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { user, meta, resolved } = useRole();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaved(false);

    const nextErrors: Record<string, string> = {};
    if (firstName.trim().length < 2) {
      nextErrors.firstName = "First name is required (min 2 characters).";
    }
    if (phone.trim() && !/^(\+?255|0)?[67][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      nextErrors.phone = "Enter a valid Tanzanian phone number.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !user) return;

    setLoading(true);
    try {
      const updated = await userApi.update(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      // Keep the stored session in sync so the header/sidebar reflect the change.
      const token = getToken();
      const stored = getStoredUser();
      if (token && stored) {
        setSession(token, {
          ...stored,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!resolved || !user) {
    return (
      <div className="space-y-6 max-w-[700px]">
        <div className="h-9 w-40 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[700px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal details
        </p>
      </div>

      {/* Identity card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="text-lg bg-primary text-primary-foreground font-semibold">
            {initialsOf(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {`${user.firstName} ${user.lastName ?? ""}`.trim()}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {meta.label}
          </p>
        </div>
      </div>

      {/* Editable details */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Personal Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-first-name" className="text-xs">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-first-name"
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
            <Label htmlFor="profile-last-name" className="text-xs">Last Name</Label>
            <Input
              id="profile-last-name"
              maxLength={100}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-email" className="text-xs">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              id="profile-email"
              value={user.email}
              disabled
              className="h-9 text-sm pl-9"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Contact an administrator to change your email address.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-phone" className="text-xs">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              id="profile-phone"
              type="tel"
              placeholder="+255 7XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              className={`h-9 text-sm pl-9 ${errors.phone ? "border-destructive" : ""}`}
            />
          </div>
          {errors.phone ? (
            <p role="alert" className="text-xs text-destructive">{errors.phone}</p>
          ) : null}
        </div>

        {user.organizationId ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            Organization-scoped account
          </div>
        ) : null}

        {serverError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {serverError}
          </div>
        )}
        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Profile updated successfully.
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
