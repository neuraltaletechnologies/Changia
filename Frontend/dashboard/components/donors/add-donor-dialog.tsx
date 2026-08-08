"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface AddDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDonorDialog({ open, onOpenChange }: AddDonorDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
    }, 800);
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
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Hassan"
                  required
                  className="h-9 text-sm"
                />
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
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="+255 7XX XXX XXX"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. Dar es Salaam"
                  className="h-9 text-sm"
                />
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
                <Select defaultValue="prospect">
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
                <Select defaultValue="pending">
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
              <Select defaultValue="email">
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
              className="text-sm resize-none"
            />
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
