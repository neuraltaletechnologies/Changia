"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { payoutApi, formatTZSFull } from "@/lib/dashboard/api";
import {
  MOBILE_MONEY_PROVIDERS,
  MAX_PAYOUT_PROOF_IMAGES,
  PAYOUT_PROOF_ACCEPT,
} from "@/lib/dashboard/payouts";

/**
 * The single payout-request form, shared by the campaigns-list quick action and
 * the campaign-detail Payout tab so both collect exactly the same thing: amount,
 * reason, the mobile-money destination (provider + number + account name) and
 * optional "proof of use" photos.
 *
 * `run` lets the campaigns list route the request through its toast / action-feed
 * wrapper; when omitted the dialog just calls the API directly.
 */
export function RequestPayoutDialog({
  campaignId,
  suggestedAmount,
  availableAmount,
  onClose,
  onSubmitted,
  run,
}: {
  campaignId: string | number;
  suggestedAmount?: number;
  /** Ceiling for the request — raised minus everything already paid out. */
  availableAmount?: number;
  onClose: () => void;
  onSubmitted: () => void;
  run?: (fn: () => Promise<unknown>) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [reason, setReason] = useState(
    suggestedAmount ? "Final payout — remaining balance after campaign closure." : ""
  );
  const [provider, setProvider] = useState<string>(MOBILE_MONEY_PROVIDERS[0]);
  const [phone, setPhone] = useState("");
  const [accountName, setAccountName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    // Copy the FileList to an array *now* — the onChange handler clears the
    // input (`e.target.value = ""`) straight after this call, which empties the
    // live FileList before React runs the state updater. Reading it lazily
    // inside setFiles() would see nothing and the picker would appear to do
    // nothing.
    const picked = Array.from(list);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PAYOUT_PROOF_IMAGES));
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setError(null);
    const amt = Number(amount);
    if (!amount.trim() || Number.isNaN(amt) || amt <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (availableAmount != null && amt > availableAmount) {
      setError(
        `That's more than the ${formatTZSFull(availableAmount)} available to withdraw.`
      );
      return;
    }
    if (!reason.trim()) {
      setError("Explain why you're requesting this payout.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter the mobile money number the payout should be sent to.");
      return;
    }
    if (accountName.trim().length < 2) {
      setError("Enter the account holder's name.");
      return;
    }

    setSubmitting(true);
    let proofFailed = false;
    const call = async () => {
      const created = await payoutApi.create({
        amount: amt,
        campaignId,
        reason: reason.trim(),
        provider,
        phone: phone.trim(),
        accountName: accountName.trim(),
      });
      if (files.length > 0) {
        try {
          await payoutApi.attachProof(created.id, files);
        } catch {
          proofFailed = true;
        }
      }
      return created;
    };

    try {
      if (run) await run(call);
      else await call();
      if (proofFailed) {
        setError(
          "The request was submitted, but the proof photos failed to upload — add them from the payout row."
        );
      }
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit the payout request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Request a payout</DialogTitle>
          <DialogDescription className="text-xs">
            A reviewer, then an org admin, approve the request. It then sits on hold
            until you confirm the release, which sends the money to the mobile-money
            number below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Amount (TZS)</Label>
            <Input
              type="number"
              min={1}
              max={availableAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500000"
              className="h-9"
              aria-invalid={
                availableAmount != null && Number(amount) > availableAmount ? true : undefined
              }
            />
            {availableAmount != null && (
              <button
                type="button"
                onClick={() => setAmount(String(availableAmount))}
                className="text-[11px] text-primary hover:underline w-fit"
              >
                Available to withdraw — {formatTZSFull(availableAmount)}
              </button>
            )}
            {availableAmount == null && suggestedAmount != null && (
              <button
                type="button"
                onClick={() => setAmount(String(suggestedAmount))}
                className="text-[11px] text-primary hover:underline w-fit"
              >
                Use remaining balance — {formatTZSFull(suggestedAmount)}
              </button>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What is this payout for?"
              className="min-h-20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Mobile money provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v ?? MOBILE_MONEY_PROVIDERS[0])}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOBILE_MONEY_PROVIDERS.map((prov) => (
                  <SelectItem key={prov} value={prov}>
                    {prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Mobile money number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712 345 678"
              className="h-9"
              inputMode="tel"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Account holder name</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name registered on the mobile money account"
              className="h-9"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">
              Proof of use <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Attach invoices, receipts or photos that show why this payout is needed — up to{" "}
              {MAX_PAYOUT_PROOF_IMAGES} images. The reviewer and admin will see them.
            </p>
            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {previews.map((url, idx) => (
                  <div
                    key={url}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Proof preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_PAYOUT_PROOF_IMAGES && (
              <label className="inline-flex w-fit items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                <ImageIcon className="w-3.5 h-3.5" />
                {files.length > 0 ? "Add another image" : "Add images"}
                <input
                  type="file"
                  accept={PAYOUT_PROOF_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Request payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
