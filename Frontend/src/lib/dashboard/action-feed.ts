/**
 * Dashboard action feed — a tiny framework-agnostic pub/sub that the API client
 * publishes to on every write request (POST / PUT / PATCH / DELETE / upload).
 *
 * `<ActionToaster />` (mounted only in the dashboard layout) subscribes and
 * renders a status "bar" in the bottom-right corner for anything the user
 * creates, sends, saves or deletes — showing whether the action is still in
 * flight, completed, or failed.
 */

export type ActionPhase = "pending" | "success" | "error";

export interface ActionEvent {
  /** Correlates the pending event with its later success / error. */
  id: string;
  phase: ActionPhase;
  method: string;
  /** Normalised request path, e.g. `/campaigns/:id/approve`. */
  path: string;
  /** Human-readable headline for this phase. */
  title: string;
  /** Extra detail — the server's error message on failure. */
  message?: string;
}

type Listener = (event: ActionEvent) => void;

const listeners = new Set<Listener>();

/** Subscribe to action events. Returns an unsubscribe function. */
export function onActionEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(event: ActionEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      /* a broken listener must never break the request */
    }
  }
}

let seq = 0;
export function nextActionId(): string {
  seq += 1;
  return `act_${Date.now().toString(36)}_${seq}`;
}

// ─── Human labels ────────────────────────────────────────────────────────────

interface Labels {
  pending: string;
  success: string;
  error: string;
}

interface Rule {
  method: string;
  pattern: RegExp;
  labels: Labels;
}

const L = (pending: string, success: string, error: string): Labels => ({
  pending,
  success,
  error,
});

/** First matching rule wins. Paths are normalised (`/123` → `/:id`). */
const RULES: Rule[] = [
  // Campaigns
  { method: "POST", pattern: /^\/campaigns$/, labels: L("Creating campaign…", "Campaign created", "Couldn't create the campaign") },
  { method: "PUT", pattern: /^\/campaigns\/:id$/, labels: L("Saving campaign…", "Campaign saved", "Couldn't save the campaign") },
  { method: "POST", pattern: /^\/campaigns\/:id\/images$/, labels: L("Uploading images…", "Images uploaded", "Couldn't upload the images") },
  { method: "POST", pattern: /^\/campaigns\/:id\/submit$/, labels: L("Submitting for review…", "Submitted for review", "Couldn't submit for review") },
  { method: "POST", pattern: /^\/campaigns\/:id\/approve$/, labels: L("Approving campaign…", "Campaign approved", "Couldn't approve the campaign") },
  { method: "POST", pattern: /^\/campaigns\/:id\/reject$/, labels: L("Rejecting campaign…", "Campaign rejected", "Couldn't reject the campaign") },
  { method: "POST", pattern: /^\/campaigns\/:id\/request-changes$/, labels: L("Requesting changes…", "Changes requested", "Couldn't request changes") },
  { method: "POST", pattern: /^\/campaigns\/:id\/change-requests\/:id\/decide$/, labels: L("Recording decision…", "Decision recorded", "Couldn't record the decision") },
  { method: "POST", pattern: /^\/campaigns\/:id\/fee\/review$/, labels: L("Reviewing fee…", "Fee review recorded", "Couldn't record the fee review") },
  { method: "POST", pattern: /^\/campaigns\/:id\/status$/, labels: L("Updating status…", "Status updated", "Couldn't update the status") },
  { method: "POST", pattern: /^\/campaigns\/:id\/pools\/import$/, labels: L("Importing pools…", "Pools imported", "Couldn't import the pools") },
  { method: "POST", pattern: /^\/campaigns\/:id\/completion-report\/review$/, labels: L("Recording review…", "Review recorded", "Couldn't record the review") },
  { method: "POST", pattern: /^\/campaigns\/:id\/completion-report$/, labels: L("Submitting report…", "Report submitted", "Couldn't submit the report") },
  { method: "POST", pattern: /^\/campaigns\/:id\/closure-requests\/:id\/decide$/, labels: L("Recording decision…", "Decision recorded", "Couldn't record the decision") },
  { method: "POST", pattern: /^\/campaigns\/:id\/closure-requests$/, labels: L("Sending closure request…", "Closure request sent", "Couldn't send the closure request") },
  { method: "PUT", pattern: /^\/campaigns\/:id\/managers$/, labels: L("Saving managers…", "Managers saved", "Couldn't save the managers") },
  { method: "PUT", pattern: /^\/campaigns\/:id\/translations$/, labels: L("Saving translation…", "Translation saved", "Couldn't save the translation") },
  { method: "PUT", pattern: /^\/campaigns\/:id\/donor-targets\/:id$/, labels: L("Saving amount…", "Amount saved", "Couldn't save the amount") },
  { method: "DELETE", pattern: /^\/campaigns\/:id\/donor-targets\/:id$/, labels: L("Removing donor…", "Donor removed", "Couldn't remove the donor") },
  { method: "POST", pattern: /^\/campaigns\/:id\/featured$/, labels: L("Updating…", "Updated", "Couldn't update") },
  { method: "DELETE", pattern: /^\/campaigns\/:id\/images\/:id$/, labels: L("Removing image…", "Image removed", "Couldn't remove the image") },
  { method: "DELETE", pattern: /^\/campaigns\/:id$/, labels: L("Deleting campaign…", "Campaign deleted", "Couldn't delete the campaign") },

  // Reminders — templates, schedules, resend cycles
  { method: "POST", pattern: /^\/donor-pools\/reminders\/send$/, labels: L("Sending reminders…", "Reminders sent", "Reminders were NOT sent") },
  { method: "POST", pattern: /^\/reminder-templates$/, labels: L("Creating template…", "Template created", "Couldn't create the template") },
  { method: "PUT", pattern: /^\/reminder-templates\/:id$/, labels: L("Saving template…", "Template saved", "Couldn't save the template") },
  { method: "DELETE", pattern: /^\/reminder-templates\/:id$/, labels: L("Deleting template…", "Template deleted", "Couldn't delete the template") },
  { method: "POST", pattern: /^\/reminder-schedules\/pending\/:id\/confirm$/, labels: L("Sending resend cycle…", "Resend cycle sent", "Resend cycle was NOT sent") },
  { method: "POST", pattern: /^\/reminder-schedules\/pending\/:id\/skip$/, labels: L("Skipping this cycle…", "Cycle skipped", "Couldn't skip the cycle") },
  { method: "POST", pattern: /^\/reminder-schedules$/, labels: L("Creating schedule…", "Schedule created", "Couldn't create the schedule") },
  { method: "PUT", pattern: /^\/reminder-schedules\/:id$/, labels: L("Updating schedule…", "Schedule updated", "Couldn't update the schedule") },
  { method: "DELETE", pattern: /^\/reminder-schedules\/:id$/, labels: L("Deleting schedule…", "Schedule deleted", "Couldn't delete the schedule") },

  // Payouts
  { method: "POST", pattern: /^\/payouts$/, labels: L("Requesting payout…", "Payout requested", "Couldn't request the payout") },
  { method: "POST", pattern: /^\/payouts\/:id\/approve$/, labels: L("Approving payout…", "Payout approved", "Couldn't approve the payout") },
  { method: "POST", pattern: /^\/payouts\/:id\/reject$/, labels: L("Rejecting payout…", "Payout rejected", "Couldn't reject the payout") },
  { method: "POST", pattern: /^\/payouts\/:id\/confirm$/, labels: L("Confirming payout release…", "Payout released", "Couldn't release the payout") },
  { method: "POST", pattern: /^\/payouts\/:id\/paid$/, labels: L("Marking as paid…", "Marked as paid", "Couldn't mark the payout as paid") },

  // Donors
  { method: "POST", pattern: /^\/donors$/, labels: L("Adding donor…", "Donor added", "Couldn't add the donor") },
  { method: "PUT", pattern: /^\/donors\/:id$/, labels: L("Saving donor…", "Donor saved", "Couldn't save the donor") },
  { method: "DELETE", pattern: /^\/donors\/:id$/, labels: L("Deleting donor…", "Donor deleted", "Couldn't delete the donor") },
  { method: "POST", pattern: /^\/donors\/:id\/payment-methods$/, labels: L("Adding payment method…", "Payment method added", "Couldn't add the payment method") },
  { method: "DELETE", pattern: /^\/donors\/:id\/payment-methods\/:id$/, labels: L("Removing payment method…", "Payment method removed", "Couldn't remove the payment method") },

  // Donor pools
  { method: "POST", pattern: /^\/donor-pools$/, labels: L("Creating pool…", "Pool created", "Couldn't create the pool") },
  { method: "PUT", pattern: /^\/donor-pools\/:id$/, labels: L("Saving pool…", "Pool saved", "Couldn't save the pool") },
  { method: "DELETE", pattern: /^\/donor-pools\/:id$/, labels: L("Deleting pool…", "Pool deleted", "Couldn't delete the pool") },
  { method: "POST", pattern: /^\/donor-pools\/:id\/members$/, labels: L("Adding members…", "Members added", "Couldn't add the members") },
  { method: "PUT", pattern: /^\/donor-pools\/:id\/members\/:id$/, labels: L("Saving amount…", "Amount saved", "Couldn't save the amount") },
  { method: "DELETE", pattern: /^\/donor-pools\/:id\/members\/:id$/, labels: L("Removing member…", "Member removed", "Couldn't remove the member") },
  { method: "POST", pattern: /^\/donor-pools\/duplicates\/resolve$/, labels: L("Resolving duplicates…", "Duplicates resolved", "Couldn't resolve the duplicates") },
  { method: "POST", pattern: /^\/donor-pools\/anomalous\/:id\/merge$/, labels: L("Merging donor…", "Donor merged", "Couldn't merge the donor") },

  // Team
  { method: "POST", pattern: /^\/users$/, labels: L("Inviting team member…", "Invitation sent", "Couldn't invite the team member") },
  { method: "PUT", pattern: /^\/users\/:id$/, labels: L("Updating team member…", "Team member updated", "Couldn't update the team member") },
  { method: "DELETE", pattern: /^\/users\/:id$/, labels: L("Removing team member…", "Team member removed", "Couldn't remove the team member") },

  // Bulk data export / import
  { method: "GET", pattern: /^\/data\/[\w-]+\/export$/, labels: L("Preparing export…", "Export downloaded", "Couldn't export the data") },
  { method: "POST", pattern: /^\/data\/[\w-]+\/import$/, labels: L("Importing…", "Import complete", "Couldn't import the file") },

  // Organisation / account
  { method: "PUT", pattern: /^\/organizations?(\/mine)?$/, labels: L("Saving settings…", "Settings saved", "Couldn't save the settings") },
  { method: "PATCH", pattern: /^\/organizations?(\/mine)?$/, labels: L("Saving settings…", "Settings saved", "Couldn't save the settings") },
  { method: "POST", pattern: /^\/auth\/change-password$/, labels: L("Updating password…", "Password updated", "Couldn't update the password") },
];

const GENERIC: Record<string, Labels> = {
  POST: L("Saving…", "Saved", "Couldn't save"),
  PUT: L("Saving changes…", "Changes saved", "Couldn't save the changes"),
  PATCH: L("Saving changes…", "Changes saved", "Couldn't save the changes"),
  DELETE: L("Deleting…", "Deleted", "Couldn't delete"),
};

/** Collapse `/donor-pools/42/members/7` → `/donor-pools/:id/members/:id`. */
export function normalisePath(path: string): string {
  return path.split("?")[0].replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function describeAction(method: string, path: string): Labels {
  const m = method.toUpperCase();
  const normalised = normalisePath(path);
  for (const rule of RULES) {
    if (rule.method === m && rule.pattern.test(normalised)) return rule.labels;
  }
  return GENERIC[m] ?? L("Working…", "Done", "Something went wrong");
}

// ─── Emit helpers used by the API client ─────────────────────────────────────

export function emitActionStart(id: string, method: string, path: string) {
  const labels = describeAction(method, path);
  emit({ id, phase: "pending", method, path: normalisePath(path), title: labels.pending });
}

export function emitActionSuccess(id: string, method: string, path: string) {
  const labels = describeAction(method, path);
  emit({ id, phase: "success", method, path: normalisePath(path), title: labels.success });
}

export function emitActionError(id: string, method: string, path: string, message?: string) {
  const labels = describeAction(method, path);
  emit({
    id,
    phase: "error",
    method,
    path: normalisePath(path),
    title: labels.error,
    message,
  });
}
