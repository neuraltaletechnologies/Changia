"use client";

import { useState } from "react";
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
import { saveDonor } from "@/lib/dashboard/donor-store";
import type { Donor } from "@/lib/dashboard/types";

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
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Donor["status"]>("prospect");
  const [consentStatus, setConsentStatus] =
    useState<Donor["consentStatus"]>("pending");
  const [preferredChannel, setPreferredChannel] =
    useState<Donor["preferredChannel"]>("email");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setStatus("prospect");
    setConsentStatus("pending");
    setPreferredChannel("email");
    setNotes("");
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (!firstName.trim()) nextErrors.firstName = "First name is required.";
    else if (firstName.trim().length > 100)
      nextErrors.firstName = "First name must be 100 characters or fewer.";
    if (!lastName.trim()) nextErrors.lastName = "Last name is required.";
    else if (lastName.trim().length > 100)
      nextErrors.lastName = "Last name must be 100 characters or fewer.";
    if (!email.trim()) nextErrors.email = "Email is required.";
    else if (!/.+@.+\..+/.test(email.trim()))
      nextErrors.email = "Please enter a valid email address.";
    if (phone.trim() && !/^(\+?255|0)?[67][0-9]{8}$/.test(phone.replace(/[\s-]/g, "")))
      nextErrors.phone = "Enter a valid Tanzanian phone number.";
    if (location.trim().length > 200)
      nextErrors.location = "Location must be 200 characters or fewer.";
    if (notes.trim().length > 5000)
      nextErrors.notes = "Notes must be 5000 characters or fewer.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const donor: Donor = {
      id: `d-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
      status,
      consentStatus,
      preferredChannel,
      tags: [],
      totalGiven: 0,
      lastGift: "",
      lastGiftAmount: 0,
      giftCount: 0,
      joinedDate: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
    };
    saveDonor(donor);
    setLoading(false);
    reset();
    onOpenChange(false);
    onCreated?.();
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
          {/* Personal Information */}
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
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Hassan"
                  required
                  maxLength={100}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={Boolean(errors.lastName)}
                  className={`h-9 text-sm ${errors.lastName ? "border-destructive" : ""}`}
                />
                {errors.lastName ? (
                  <p role="alert" className="text-xs text-destructive">{errors.lastName}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="donor@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                className={`h-9 text-sm ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email ? (
                <p role="alert" className="text-xs text-destructive">{errors.email}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">
                  Phone Number
                </Label>
                <Input
                  id="phone"
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
                <Label htmlFor="location" className="text-xs">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. Dar es Salaam"
                  maxLength={200}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-invalid={Boolean(errors.location)}
                  className={`h-9 text-sm ${errors.location ? "border-destructive" : ""}`}
                />
                {errors.location ? (
                  <p role="alert" className="text-xs text-destructive">{errors.location}</p>
                ) : null}
              </div>
            </div>
          </div>

          <Separator />

          {/* Donor Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Donor Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus((v ?? "prospect") as Donor["status"])}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="lapsed">Lapsed</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consent Status</Label>
                <Select
                  value={consentStatus}
                  onValueChange={(v) =>
                    setConsentStatus((v ?? "pending") as Donor["consentStatus"])
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consented">Consented</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preferred Communication Channel</Label>
              <Select
                value={preferredChannel}
                onValueChange={(v) =>
                  setPreferredChannel((v ?? "email") as Donor["preferredChannel"])
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional context about this donor…"
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`text-sm resize-none ${errors.notes ? "border-destructive" : ""}`}
            />
              {errors.notes ? (
                <p role="alert" className="text-xs text-destructive">{errors.notes}</p>
              ) : null}
          </div>

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
