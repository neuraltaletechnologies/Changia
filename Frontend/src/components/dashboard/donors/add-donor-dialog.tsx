"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/dashboard/ui/dialog";
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
import { Separator } from "@/components/dashboard/ui/separator";
import { donorApi, poolApi, type Gender, type DonorPool } from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";

interface AddDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AddDonorDialog({
  open,
  onOpenChange,
  onCreated,
}: AddDonorDialogProps) {
  const { isCampaignManager } = useRole();
  const [loading, setLoading] = useState(false);
  const [pools, setPools] = useState<DonorPool[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<Gender>("UNSPECIFIED");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("PROSPECT");
  const [consentStatus, setConsentStatus] = useState("PENDING");
  const [preferredChannel, setPreferredChannel] = useState("SMS");
  const [poolId, setPoolId] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      poolApi.list({ limit: 100 }).then((r) => setPools(r.pools)).catch(() => undefined);
    }
  }, [open]);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setGender("UNSPECIFIED");
    setPosition("");
    setStatus("PROSPECT");
    setConsentStatus("PENDING");
    setPreferredChannel("SMS");
    setPoolId("");
    setNotes("");
    setErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const nextErrors: Record<string, string> = {};
    if (!firstName.trim()) nextErrors.firstName = "First name is required.";
    if (phone.trim() && !/^(\+?255|0)?[67][0-9]{8}$/.test(phone.replace(/[\s-]/g, "")))
      nextErrors.phone = "Enter a valid Tanzanian phone number.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await donorApi.create({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim(),
        location: location.trim() || undefined,
        gender,
        position: position.trim() || undefined,
        status,
        consentStatus,
        preferredChannel,
        notes: notes.trim() || undefined,
        poolId: poolId ? Number(poolId) : undefined,
      });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to add the donor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Add New Donor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="e.g. Amina"
                  required
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
                <Label htmlFor="lastName" className="text-xs">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Hassan"
                  maxLength={100}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender((v ?? "UNSPECIFIED") as Gender)}>
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
                <Label htmlFor="position" className="text-xs">Position</Label>
                <Input
                  id="position"
                  placeholder="e.g. Head Teacher"
                  maxLength={150}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="donor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+255 7XX XXX XXX"
                  required
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
                <Label htmlFor="location" className="text-xs">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Dar es Salaam"
                  maxLength={200}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Donor Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "PROSPECT")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect" disabled>Prospect</SelectItem>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="LAPSED">Lapsed</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consent Status</Label>
                <Select value={consentStatus} onValueChange={(v) => setConsentStatus(v ?? "PENDING")}>
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
              <Label className="text-xs">Preferred Communication Channel</Label>
              <Select value={preferredChannel} onValueChange={(v) => setPreferredChannel(v ?? "SMS")}>
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
            </div>
            {pools.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Add to pool (optional)</Label>
                <Select value={poolId} onValueChange={(v) => setPoolId(v ?? "")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="No pool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No pool</SelectItem>
                    {pools
                      .filter((p) => !p.isSystem || !isCampaignManager)
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context about this donor…"
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm resize-none"
            />
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
              {loading ? "Saving…" : "Add Donor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}