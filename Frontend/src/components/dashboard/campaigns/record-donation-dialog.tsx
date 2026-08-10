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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import type { CommChannel, Donation, Donor } from "@/lib/dashboard/types";

const CHANNELS: CommChannel[] = ["email", "sms", "whatsapp", "phone", "post"];

interface RecordDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  donors: Donor[];
  onRecorded: (transaction: Donation) => void;
}

export function RecordDonationDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  donors,
  onRecorded,
}: RecordDonationDialogProps) {
  const [donorId, setDonorId] = useState("");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<CommChannel>("whatsapp");
  const [error, setError] = useState("");

  const reset = () => {
    setDonorId("");
    setAmount("");
    setChannel("whatsapp");
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const donor = donors.find((d) => d.id === donorId);
    const amt = Number(amount);
    if (!donor) {
      setError("Select a donor from the pool.");
      return;
    }
    if (!amount.trim() || Number.isNaN(amt) || amt <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    const transaction: Donation = {
      id: `tx-${Date.now()}`,
      donorId: donor.id,
      donorName: `${donor.firstName} ${donor.lastName}`,
      amount: amt,
      campaign: campaignName,
      campaignId,
      channel,
      date: new Date().toISOString().slice(0, 10),
      status: "completed",
    };
    onRecorded(transaction);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Record Donation
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Donor <span className="text-destructive">*</span>
            </Label>
            <Select value={donorId} onValueChange={(v) => setDonorId(v ?? "")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a donor from the pool" />
              </SelectTrigger>
              <SelectContent>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} — {d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Amount (TZS) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => setChannel((v ?? "whatsapp") as CommChannel)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Donation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
