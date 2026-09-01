const db = require("../../db");

// ─── "My approval history" ──────────────────────────────────────────────────
//
// Every approve / reject / send-back decision an approver makes is already
// written to audit_logs with actor_id = the approver. This surfaces that
// approver's own trail across ALL request types (campaigns, edits, custom fees,
// closure requests, completion reports and payouts) in one chronological list,
// so a reviewer / org admin can look back at what they personally decided.

const DECISION_LABELS = {
  "campaign.first_approved": "Gave first approval — campaign",
  "campaign.approved": "Gave final approval — campaign went live",
  "campaign.rejected": "Rejected — campaign",
  "campaign.changes_requested": "Sent back for changes — campaign",
  "campaign.change_request.first_approved": "Gave first approval — campaign edit",
  "campaign.change_request.approved": "Approved — campaign edit applied",
  "campaign.change_request.changes_requested": "Sent back for changes — campaign edit",
  "campaign.change_request.rejected": "Rejected — campaign edit",
  "campaign.fee_proposal.approved": "Approved — custom service fee",
  "campaign.fee_proposal.changes_requested": "Sent back — custom service fee",
  "campaign.fee_proposal.rejected": "Rejected — custom service fee",
  "campaign.completion_report.first_reviewed": "Gave first review — completion report",
  "campaign.completion_report.approved": "Approved — completion report",
  "campaign.completion_report.changes_requested": "Sent back — completion report",
  "campaign.completion_report.rejected": "Rejected — completion report",
  "campaign.closure_request.first_approved": "Gave first review — closure request",
  "campaign.closure_request.approved": "Approved — closure request",
  "campaign.closure_request.changes_requested": "Sent back — closure request",
  "campaign.closure_request.rejected": "Rejected — closure request",
  "payout.first_approved": "Gave first approval — payout",
  "payout.approved": "Gave final approval — payout",
  "payout.rejected": "Rejected — payout",
  "payout.paid": "Marked paid — payout",
};

const TYPE_ACTIONS = {
  campaign: [
    "campaign.first_approved",
    "campaign.approved",
    "campaign.rejected",
    "campaign.changes_requested",
  ],
  edit: [
    "campaign.change_request.first_approved",
    "campaign.change_request.approved",
    "campaign.change_request.changes_requested",
    "campaign.change_request.rejected",
  ],
  fee: [
    "campaign.fee_proposal.approved",
    "campaign.fee_proposal.changes_requested",
    "campaign.fee_proposal.rejected",
  ],
  closure: [
    "campaign.closure_request.first_approved",
    "campaign.closure_request.approved",
    "campaign.closure_request.changes_requested",
    "campaign.closure_request.rejected",
  ],
  report: [
    "campaign.completion_report.first_reviewed",
    "campaign.completion_report.approved",
    "campaign.completion_report.changes_requested",
    "campaign.completion_report.rejected",
  ],
  payout: [
    "payout.first_approved",
    "payout.approved",
    "payout.rejected",
    "payout.paid",
  ],
};

const ALL_ACTIONS = Object.values(TYPE_ACTIONS).flat();

function parsePayload(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

async function myApprovalHistory(user, filters = {}) {
  const actions = filters.type ? TYPE_ACTIONS[filters.type] : ALL_ACTIONS;
  const page = filters.page || 1;
  const limit = filters.limit || 30;
  const offset = (page - 1) * limit;
  const placeholders = actions.map(() => "?").join(",");

  const rows = await db.query(
    `SELECT al.id, al.action, al.details, al.severity, al.created_at,
            al.resource, al.resource_id,
            c.name  AS campaign_name,
            p.campaign_id AS payout_campaign_id,
            pc.name AS payout_campaign_name
       FROM audit_logs al
       LEFT JOIN campaigns c  ON al.resource = 'campaign' AND c.id = al.resource_id
       LEFT JOIN payouts   p  ON al.resource = 'payout'   AND p.id = al.resource_id
       LEFT JOIN campaigns pc ON pc.id = p.campaign_id
      WHERE al.actor_id = ? AND al.action IN (${placeholders})
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ? OFFSET ?`,
    [user.id, ...actions, limit, offset]
  );

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM audit_logs
      WHERE actor_id = ? AND action IN (${placeholders})`,
    [user.id, ...actions]
  );
  const total = countRows[0] ? Number(countRows[0].total) : 0;

  const items = rows.map((r) => {
    const details = parsePayload(r.details);
    const note = [details.notes, details.reason].find(
      (v) => typeof v === "string" && v.trim()
    );
    const isPayout = r.resource === "payout";
    const resourceName = isPayout
      ? r.payout_campaign_name
        ? `${r.payout_campaign_name} — payout`
        : `Payout #${r.resource_id}`
      : r.campaign_name || `Campaign #${r.resource_id}`;
    const targetCampaignId = isPayout ? r.payout_campaign_id : r.resource_id;
    return {
      id: r.id,
      action: r.action,
      label: DECISION_LABELS[r.action] || r.action.replace(/[._]/g, " "),
      severity: r.severity,
      notes: note || null,
      resource: r.resource,
      resourceId: r.resource_id,
      resourceName,
      link: targetCampaignId
        ? `/dashboard/campaigns/${targetCampaignId}`
        : null,
      createdAt: r.created_at,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = { myApprovalHistory };
