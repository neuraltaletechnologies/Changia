"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/dashboard/ui/dialog";
import { Button } from "@/components/dashboard/ui/button";
import { Textarea } from "@/components/dashboard/ui/textarea";
import type { ReviewAction } from "@/lib/dashboard/api";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Which negative action this dialog collects a reason for. */
  action: Exclude<ReviewAction, "approve">;
  title?: string;
  description?: string;
  submitting?: boolean;
  onSubmit: (notes: string) => void | Promise<void>;
}

/**
 * Collects the MANDATORY reason a reviewer/admin must give when they reject or
 * request changes on a campaign, change request, fee proposal, closure request
 * or completion report.
 */
export function ReviewDecisionDialog({
  open,
  onOpenChange,
  action,
  title,
  description,
  submitting,
  onSubmit,
}: Props) {
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const isReject = action === "reject";
  const tooShort = notes.trim().length < 10;

  const heading = title || (isReject ? "Reject" : "Request changes");
  const desc =
    description ||
    (isReject
      ? "This is final — the campaign is cancelled. The reason is shown to the manager."
      : "The item goes back to the manager to fix and resubmit. Your note is shown to them.");

  const submit = async () => {
    setTouched(true);
    if (tooShort) return;
    await onSubmit(notes.trim());
    setNotes("");
    setTouched(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setNotes("");
          setTouched(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isReject
                ? "Explain why this can't be approved…"
                : "Tell the manager what to change…"
            }
            className="min-h-28"
          />
          {touched && tooShort && (
            <p className="text-xs text-destructive">
              Please give a reason of at least 10 characters.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isReject ? "destructive" : "default"}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isReject ? (
              "Reject"
            ) : (
              "Request changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
