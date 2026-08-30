import { api, getToken } from "@/lib/api-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ─── Shared API types (mirror the Express backend responses) ────────────────

export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED" | null;
export type PaymentMethodType =
  | "MOMO"
  | "TIGO_PESA"
  | "AIRTEL_MONEY"
  | "HALOPESA"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "CASH"
  | "OTHER";

export type PayStatus = "UNPAID" | "PARTIAL" | "PAID_FULL";

export interface PaymentMethod {
  id: number;
  method: PaymentMethodType;
  accountRef: string | null;
  details: unknown;
  isPrimary: boolean;
  createdAt: string;
}

export interface DonorRecord {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  gender: Gender;
  position: string | null;
  status: "ACTIVE" | "PROSPECT" | "LAPSED" | "INACTIVE";
  consentStatus: "CONSENTED" | "PENDING" | "WITHDRAWN";
  preferredChannel: "SMS" | "WHATSAPP" | "EMAIL" | "PHONE" | null;
  isAnomalous: boolean;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  totalPaid: number;
  donationCount: number;
  paymentMethods?: PaymentMethod[];
  pools?: { id: number; name: string; category: PoolCategory; isSystem: boolean }[];
  donations?: {
    id: number;
    amount: number;
    status: string;
    method: string;
    receiptNumber?: string;
    createdAt: string;
    campaign: { name: string };
  }[];
}

export type PoolCategory = "FAMILY" | "SCHOOL" | "STUDENT" | "OFFICE";

export interface PoolMemberDonor {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  gender: Gender;
  position: string | null;
  isAnomalous: boolean;
  status: string;
  consentStatus: string;
  preferredChannel: string | null;
  location: string | null;
}

export interface PoolMember {
  id: number;
  expectedAmount: number | null;
  paidAmount: number;
  donationCount: number;
  status: PayStatus | null;
  addedAt: string;
  donor: PoolMemberDonor;
}

export interface DonorPool {
  id: number;
  name: string;
  description: string | null;
  category: PoolCategory;
  isSystem: boolean;
  status: "ACTIVE" | "ARCHIVED";
  createdBy: { id: number; firstName: string; lastName: string; email: string } | null;
  memberCount: number;
  expectedTotal: number;
  paidTotal: number;
  createdAt: string;
  updatedAt: string;
  campaign?: { id: number; name: string } | null;
  members?: PoolMember[];
}

export interface CampaignRecord {
  id: number;
  name: string;
  slug: string;
  story: string | null;
  nameSw: string | null;
  storySw: string | null;
  categorySw: string | null;
  imageUrl: string | null;
  category: string | null;
  goalAmount: number;
  serviceFeePercent: number;
  serviceFeeAmount: number;
  publicTarget: number;
  /** A manager's proposed custom fee % awaiting review (null = none pending). */
  proposedServiceFeePercent?: number | null;
  /** State of the last custom fee proposal. */
  feeStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  feeReviewedBy?: number | null;
  feeReviewedAt?: string | null;
  feeReviewNotes?: string | null;
  minimumAmount: number;
  startDate: string | null;
  endDate: string | null;
  status: "DRAFT" | "PENDING" | "REVIEWED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  isPublic: boolean;
  contactPhone: string | null;
  raisedAmount: number;
  donorCount: number;
  isFeatured: boolean;
  featuredAt: string | null;
  /** First of the two required approvals (PENDING -> REVIEWED). */
  firstApprovedBy?: number | null;
  firstApprovedAt?: string | null;
  /** Second, decisive approval (REVIEWED -> ACTIVE) — must be a different user than firstApprovedBy. */
  approvedBy: number | null;
  approvedAt: string | null;
  /** Who created the campaign — an approver may never approve their own campaign. */
  createdBy?: number | null;
  /** Last reject / "request changes" feedback from a reviewer or admin. */
  reviewNotes?: string | null;
  /** 'CHANGES_REQUESTED' while the manager still needs to act on that feedback. */
  reviewState?: "NONE" | "CHANGES_REQUESTED";
  /** A material edit is parked awaiting re-approval (see `changeRequest`). */
  hasPendingChanges?: boolean;
  /** The open change request for a live campaign, if any. */
  changeRequest?: {
    id: number;
    status: "PENDING" | "REVIEWED" | "APPLIED" | "REJECTED" | "CHANGES_REQUESTED";
    /** 'EDIT' = parked field changes; 'STATUS' = a manager's suspend/resume ask. */
    kind?: "EDIT" | "STATUS";
    /** Set when kind === 'STATUS'. */
    statusAction?: "PAUSE" | "RESUME" | null;
    payload: Partial<
      Record<
        | "name"
        | "story"
        | "goalAmount"
        | "serviceFeePercent"
        | "category"
        | "startDate"
        | "endDate"
        | "minimumAmount"
        | "contactPhone"
        | "reason",
        string | number | null
      >
    >;
    hasStagedCover: boolean;
    stagedCoverUrl: string | null;
    submittedBy: number | null;
    firstApprovedBy: number | null;
    firstApprovedAt: string | null;
    reviewNotes: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  /** Owning organisation — campaigns are branded with its name; cross-org (SUPER_ADMIN / REVIEWER) views show it. */
  organizationId: number | null;
  organizationName: string | null;
  assignments: { user: { id: number; firstName: string; lastName: string; email: string } }[];
  /** Lightweight summary embedded on list/detail responses — present only once a completion report exists. */
  completionReport?: {
    status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    submittedAt: string;
    reviewedAt: string | null;
  } | null;
  /** Gallery photos (cover image stays on imageUrl) set at creation or later. */
  images?: { id: number; url: string }[];
  /** Most recent closure request, if any — full history via campaignApi.listClosureRequests. */
  latestClosureRequest?: {
    id: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    reason: string;
    decisionNotes: string | null;
    requestedAt: string;
  } | null;
  donations?: {
    id: number;
    amount: number;
    donorName: string | null;
    isAnonymous: boolean;
    method: string;
    receiptNumber: string | null;
    confirmedAt: string | null;
    createdAt: string;
  }[];
  remaining?: number;
  progressPercent?: number;
}

/** One step in a chronological review trail (from audit_logs) — campaigns and payouts. */
export interface ReviewTrailEntry {
  id: number;
  action: string;
  /** Friendly label for the step, e.g. "Sent back for changes". */
  label: string;
  severity: AuditSeverity;
  /** The reason / note a reviewer or admin gave, when the step carries one. */
  notes: string | null;
  /** Field names an edit touched (campaigns only; null for payouts). */
  fields: string[] | null;
  actor: {
    id: number | null;
    name: string;
    email: string | null;
    role: UserRole | null;
  } | null;
  createdAt: string;
}

/** @deprecated use ReviewTrailEntry */
export type CampaignHistoryEntry = ReviewTrailEntry;
export type PayoutHistoryEntry = ReviewTrailEntry;

export interface CompletionReport {
  id: number;
  campaignId: number;
  summary: string;
  amountUtilized: number | null;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  submittedBy: { id: number; firstName: string; lastName: string | null } | null;
  submittedAt: string;
  reviewedBy: { id: number; firstName: string; lastName: string | null } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  images: { id: number; url: string }[];
}

export interface ClosureRequest {
  id: number;
  campaignId: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decisionNotes: string | null;
  requestedAt: string;
  decidedAt: string | null;
}

/** The three outcomes a reviewer/admin can pick on any review decision. */
export type ReviewAction = "approve" | "request_changes" | "reject";

export interface ChangeRequestRecord {
  id: number;
  campaignId: number;
  status: "PENDING" | "REVIEWED" | "APPLIED" | "REJECTED" | "CHANGES_REQUESTED";
  kind?: "EDIT" | "STATUS";
  statusAction?: "PAUSE" | "RESUME" | null;
  payload: Record<string, string | number | null>;
  hasStagedCover: boolean;
  stagedCoverUrl: string | null;
  submittedBy: number | null;
  firstApprovedBy: number | null;
  firstApprovedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
}

export interface CampaignTarget {
  id: number;
  campaignId: number;
  expectedAmount: number | null;
  paidAmount: number;
  donationCount: number;
  status: PayStatus;
  pool: { id: number; name: string; category: PoolCategory } | null;
  donor: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    gender: Gender;
    position: string | null;
    isAnomalous: boolean;
  };
  addedAt: string;
}

export interface CampaignTargetsResponse {
  campaign: { id: number; name: string };
  targets: CampaignTarget[];
  summary: {
    totalTargets: number;
    expectedTotal: number;
    paidTotal: number;
    unpaid: number;
    partial: number;
    paidFull: number;
  };
  poolTotals: {
    pool: { id: number; name: string; category: PoolCategory } | null;
    count: number;
    expectedTotal: number;
    paidTotal: number;
  }[];
}

export interface CampaignGift {
  id: number;
  campaignId: number;
  donorId: number | null;
  donorName: string | null;
  description: string;
  estimatedValue: number;
  receivedAt: string | null;
  createdAt: string;
}

export interface CampaignPaymentBreakdown {
  campaignId: number;
  name: string;
  goal: number;
  raised: number;
  /** Confirmed money not tied to a pledge. */
  paid: number;
  /** Remaining campaign goal not covered by a pledge. */
  unpaid: number;
  /** Money received against a donor pledge. */
  promisedPaid: number;
  /** Pledged but not yet received. */
  promisedUnpaid: number;
  /** Estimated TZS value of in-kind contributions. */
  giftValue: number;
}

export interface PoolImportPreview {
  campaignId: number;
  pools: { id: number; name: string; category: PoolCategory }[];
  donors: { donorId: number; firstName: string | null; lastName: string | null; email: string | null; phone: string | null }[];
  duplicateGroups: { donorId: number; pools: { id: number; name: string }[] }[];
  alreadyTracked: number;
}

export interface ReminderResponse {
  batch: {
    id: number;
    campaignId: number;
    channel: "SMS" | "WHATSAPP" | "EMAIL";
    subject: string;
    body: string;
    recipientCount: number;
  };
  deliveries: {
    id: number;
    donorId: number;
    recipient: string;
    status: string;
    providerRef: string | null;
    sentAt: string;
  }[];
}

// ─── Message templates & auto-resend schedules ────────────────────────────────

export type ReminderChannel = "SMS" | "WHATSAPP" | "EMAIL";

export interface MessageTemplate {
  id: number;
  name: string;
  channel: ReminderChannel;
  subject: string | null;
  body: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSchedule {
  id: number;
  name: string;
  scope: "POOL" | "CAMPAIGN";
  poolId: number | null;
  campaignId: number | null;
  intervalDays: number;
  channels: ReminderChannel[];
  templateIdSms: number | null;
  templateIdWhatsapp: number | null;
  templateIdEmail: number | null;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingReminderBatch {
  id: number;
  scheduleId: number;
  scheduleName: string;
  scope: "POOL" | "CAMPAIGN";
  pool: { id: number; name: string } | null;
  campaign: { id: number; name: string } | null;
  channels: ReminderChannel[];
  status: "PENDING_APPROVAL" | "CONFIRMED" | "SKIPPED" | "EXPIRED";
  donorCount: number;
  generatedAt: string;
  resolvedAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qs(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : "";
}

function unwrap<T>(res: { success: boolean; data: T }): T {
  return res.data;
}

// ─── Donors ──────────────────────────────────────────────────────────────────

export const donorApi = {
  list: (params?: {
    search?: string;
    status?: string;
    consent?: string;
    gender?: Gender | "";
    poolId?: string | number;
    anomalous?: "true" | "false";
    sortBy?: "name" | "created" | "total";
    sortDir?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) =>
    api
      .get<{ success: boolean; data: { donors: DonorRecord[]; pagination: unknown } }>(
        `/donors${qs(params || {})}`
      )
      .then(unwrap),
  get: (id: string | number) =>
    api
      .get<{ success: boolean; data: DonorRecord }>(`/donors/${id}`)
      .then(unwrap),
  create: (body: Record<string, unknown>) =>
    api
      .post<{ success: boolean; data: DonorRecord }>(`/donors`, body)
      .then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api
      .put<{ success: boolean; data: DonorRecord }>(`/donors/${id}`, body)
      .then(unwrap),
  remove: (id: string | number) =>
    api.delete<{ success: boolean; message: string }>(`/donors/${id}`),
  addPaymentMethod: (id: string | number, body: Record<string, unknown>) =>
    api
      .post<{ success: boolean; data: PaymentMethod[] }>(`/donors/${id}/payment-methods`, body)
      .then(unwrap),
  removePaymentMethod: (id: string | number, methodId: string | number) =>
    api
      .delete<{ success: boolean; data: PaymentMethod[] }>(
        `/donors/${id}/payment-methods/${methodId}`
      )
      .then(unwrap),
};

// ─── Donor pools ─────────────────────────────────────────────────────────────

export interface PoolListParams {
  category?: PoolCategory | "";
  search?: string;
  status?: "ACTIVE" | "ARCHIVED";
  createdBy?: string | number;
  sortBy?: "name" | "created" | "members";
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const poolApi = {
  list: (params?: PoolListParams) =>
    api
      .get<{ success: boolean; data: { pools: DonorPool[]; pagination: unknown } }>(
        `/donor-pools${qs(params || {})}`
      )
      .then(unwrap),
  create: (body: { name: string; description?: string; category?: PoolCategory; createdBy?: number }) =>
    api.post<{ success: boolean; data: DonorPool }>(`/donor-pools`, body).then(unwrap),
  get: (id: string | number, campaignId?: string | number) =>
    api
      .get<{ success: boolean; data: DonorPool }>(
        `/donor-pools/${id}${campaignId ? `?campaignId=${campaignId}` : ""}`
      )
      .then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api.put<{ success: boolean; data: DonorPool }>(`/donor-pools/${id}`, body).then(unwrap),
  remove: (id: string | number) =>
    api.delete<{ success: boolean; message: string }>(`/donor-pools/${id}`),
  addMembers: (
    id: string | number,
    body: {
      donorIds?: number[];
      donors?: Record<string, unknown>[];
      expectedAmounts?: Record<string, number>;
    }
  ) => api.post<{ success: boolean; data: DonorPool }>(`/donor-pools/${id}/members`, body).then(unwrap),
  setExpected: (id: string | number, donorId: string | number, expectedAmount: number | null) =>
    api
      .put<{ success: boolean; data: DonorPool }>(`/donor-pools/${id}/members/${donorId}`, {
        expectedAmount,
      })
      .then(unwrap),
  removeMember: (id: string | number, donorId: string | number) =>
    api
      .delete<{ success: boolean; data: DonorPool }>(`/donor-pools/${id}/members/${donorId}`)
      .then(unwrap),
  duplicates: (poolIds?: number[]) =>
    api
      .get<{
        success: boolean;
        data: {
          groups: {
            donor: { id: number; firstName: string | null; lastName: string | null; email: string | null; phone: string | null };
            pools: { id: number; name: string; category: PoolCategory; isSystem: boolean }[];
          }[];
        };
      }>(`/donor-pools/duplicates${poolIds?.length ? `?poolIds=${poolIds.join(",")}` : ""}`)
      .then(unwrap),
  resolveDuplicates: (choices: { donorId: number; keepPoolId: number }[]) =>
    api
      .post<{ success: boolean; data: { resolved: number } }>(`/donor-pools/duplicates/resolve`, {
        choices,
      })
      .then(unwrap),
  anomalous: (managerId?: string | number) =>
    api
      .get<{ success: boolean; data: DonorPool }>(
        `/donor-pools/anomalous${managerId ? `?managerId=${managerId}` : ""}`
      )
      .then(unwrap),
  mergeAnomalous: (
    anomalousDonorId: string | number,
    body: {
      targetDonorId: number;
      paymentMethod?: { method: PaymentMethodType; accountRef?: string; details?: Record<string, string> };
    }
  ) =>
    api
      .post<{ success: boolean; data: { merged: boolean; targetDonorId: number } }>(
        `/donor-pools/anomalous/${anomalousDonorId}/merge`,
        body
      )
      .then(unwrap),
  sendReminder: (body: {
    campaignId: number;
    donorIds: number[];
    channel: "SMS" | "WHATSAPP" | "EMAIL";
    subject?: string;
    message: string;
  }) =>
    api.post<{ success: boolean; data: ReminderResponse }>(`/donor-pools/reminders/send`, body).then(unwrap),
};

// ─── Message templates ───────────────────────────────────────────────────────

export const templateApi = {
  list: (params?: { channel?: ReminderChannel | ""; search?: string; page?: number; limit?: number }) =>
    api
      .get<{ success: boolean; data: { templates: MessageTemplate[]; pagination: unknown } }>(
        `/reminder-templates${qs(params || {})}`
      )
      .then(unwrap),
  create: (body: { name: string; channel: ReminderChannel; subject?: string; body: string }) =>
    api.post<{ success: boolean; data: MessageTemplate }>(`/reminder-templates`, body).then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api
      .put<{ success: boolean; data: MessageTemplate }>(`/reminder-templates/${id}`, body)
      .then(unwrap),
  remove: (id: string | number) =>
    api.delete<{ success: boolean; message: string }>(`/reminder-templates/${id}`),
};

// ─── Reminder auto-resend schedules ────────────────────────────────────────────

export const reminderScheduleApi = {
  list: (params?: { scope?: "POOL" | "CAMPAIGN" | ""; page?: number; limit?: number }) =>
    api
      .get<{ success: boolean; data: { schedules: ReminderSchedule[]; pagination: unknown } }>(
        `/reminder-schedules${qs(params || {})}`
      )
      .then(unwrap),
  create: (body: {
    name: string;
    scope: "POOL" | "CAMPAIGN";
    poolId?: number;
    campaignId?: number;
    intervalDays: number;
    channels: ReminderChannel[];
    templateIdSms?: number;
    templateIdWhatsapp?: number;
    templateIdEmail?: number;
    isActive?: boolean;
  }) => api.post<{ success: boolean; data: ReminderSchedule }>(`/reminder-schedules`, body).then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api
      .put<{ success: boolean; data: ReminderSchedule }>(`/reminder-schedules/${id}`, body)
      .then(unwrap),
  remove: (id: string | number) =>
    api.delete<{ success: boolean; message: string }>(`/reminder-schedules/${id}`),
  pending: () =>
    api
      .get<{ success: boolean; data: { pending: PendingReminderBatch[] } }>(`/reminder-schedules/pending`)
      .then(unwrap),
  confirmPending: (id: string | number) =>
    api
      .post<{ success: boolean; data: { confirmed: boolean; deliveries: unknown[] } }>(
        `/reminder-schedules/pending/${id}/confirm`
      )
      .then(unwrap),
  skipPending: (id: string | number) =>
    api
      .post<{ success: boolean; data: { skipped: boolean } }>(`/reminder-schedules/pending/${id}/skip`)
      .then(unwrap),
};

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaignApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api
      .get<{ success: boolean; data: { campaigns: CampaignRecord[]; pagination: unknown } }>(
        `/campaigns${qs(params || {})}`
      )
      .then(unwrap),
  get: (id: string | number) =>
    api.get<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}`).then(unwrap),
  /** Full chronological review trail — submitted / reviewed / approved / sent back, with reasons. */
  history: (id: string | number) =>
    api
      .get<{ success: boolean; data: ReviewTrailEntry[] }>(`/campaigns/${id}/history`)
      .then(unwrap),
  create: (body: Record<string, unknown>) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns`, body).then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api.put<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}`, body).then(unwrap),
  submit: (id: string | number) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/submit`).then(unwrap),
  /** Advances the ordered chain: PENDING -> REVIEWED (a reviewer) -> ACTIVE (an admin). */
  approve: (id: string | number) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/approve`).then(unwrap),
  /** Reviewer/admin rejects a campaign still awaiting approval (PENDING/REVIEWED) — terminal, reason required. */
  reject: (id: string | number, notes: string) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/reject`, { notes }).then(unwrap),
  /** Reviewer/admin sends a campaign back to the manager to fix — non-terminal, note required. */
  requestChanges: (id: string | number, notes: string) =>
    api
      .post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/request-changes`, { notes })
      .then(unwrap),
  /** Reviewer/admin decides a manager's proposed custom fee % (approve / request_changes / reject). */
  reviewFee: (id: string | number, body: { action: ReviewAction; notes?: string }) =>
    api
      .post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/fee/review`, body)
      .then(unwrap),
  /**
   * A CAMPAIGN_MANAGER asks to suspend (PAUSE) or resume (RESUME) a campaign.
   * Parked as a STATUS change request that clears the two-stage review chain
   * (reviewer then org admin) before the status actually changes.
   */
  requestStatusChange: (
    id: string | number,
    action: "PAUSE" | "RESUME",
    reason?: string
  ) =>
    api
      .post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/status-requests`, {
        action,
        reason,
      })
      .then(unwrap),
  /** History of change requests (parked material edits) for a campaign. */
  listChangeRequests: (id: string | number) =>
    api
      .get<{ success: boolean; data: ChangeRequestRecord[] }>(`/campaigns/${id}/change-requests`)
      .then(unwrap),
  /** Reviewer/admin decides an open change request (approve / request_changes / reject). */
  decideChangeRequest: (
    id: string | number,
    requestId: string | number,
    body: { action: ReviewAction; notes?: string }
  ) =>
    api
      .post<{ success: boolean; data: CampaignRecord }>(
        `/campaigns/${id}/change-requests/${requestId}/decide`,
        body
      )
      .then(unwrap),
  changeStatus: (id: string | number, status: string) =>
    api
      .post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/status`, { status })
      .then(unwrap),
  setManagers: (id: string | number, userIds: number[]) =>
    api
      .put<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/managers`, { userIds })
      .then(unwrap),
  setFeatured: (id: string | number, featured: boolean) =>
    api
      .post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/featured`, { featured })
      .then(unwrap),
  setTranslations: (
    id: string | number,
    body: { nameSw?: string; storySw?: string; categorySw?: string }
  ) =>
    api
      .put<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/translations`, body)
      .then(unwrap),
  getCompletionReport: (id: string | number) =>
    api
      .get<{ success: boolean; data: CompletionReport | null }>(`/campaigns/${id}/completion-report`)
      .then(unwrap),
  /** Multipart: summary (required), amountUtilized (optional), images (1-8 files, required). */
  submitCompletionReport: (
    id: string | number,
    body: { summary: string; amountUtilized?: number; images: File[] }
  ) => {
    const form = new FormData();
    form.append("summary", body.summary);
    if (body.amountUtilized !== undefined) form.append("amountUtilized", String(body.amountUtilized));
    body.images.forEach((file) => form.append("images", file));
    return api
      .postForm<{ success: boolean; data: CompletionReport }>(`/campaigns/${id}/completion-report`, form)
      .then(unwrap);
  },
  reviewCompletionReport: (
    id: string | number,
    body: { action: ReviewAction; notes?: string }
  ) =>
    api
      .post<{ success: boolean; data: CompletionReport }>(`/campaigns/${id}/completion-report/review`, body)
      .then(unwrap),
  previewPools: (id: string | number, poolIds: number[]) =>
    api
      .post<{ success: boolean; data: PoolImportPreview }>(`/campaigns/${id}/pools/preview`, {
        poolIds,
      })
      .then(unwrap),
  importPools: (
    id: string | number,
    body: {
      poolIds: number[];
      duplicateChoices?: { donorId: number; poolId: number }[];
      expectedAmounts?: Record<string, Record<string, number>>;
    }
  ) =>
    api
      .post<{ success: boolean; data: CampaignTargetsResponse }>(`/campaigns/${id}/pools/import`, body)
      .then(unwrap),
  donorTargets: (id: string | number) =>
    api
      .get<{ success: boolean; data: CampaignTargetsResponse }>(`/campaigns/${id}/donor-targets`)
      .then(unwrap),
  setTargetExpected: (id: string | number, donorId: string | number, expectedAmount: number | null) =>
    api
      .put<{ success: boolean; data: CampaignTargetsResponse }>(
        `/campaigns/${id}/donor-targets/${donorId}`,
        { expectedAmount }
      )
      .then(unwrap),
  removeTarget: (id: string | number, donorId: string | number) =>
    api
      .delete<{ success: boolean; data: CampaignTargetsResponse }>(
        `/campaigns/${id}/donor-targets/${donorId}`
      )
      .then(unwrap),
  remove: (id: string | number) =>
    api
      .delete<{ success: boolean; data: { deleted: boolean } }>(`/campaigns/${id}`)
      .then(unwrap),
  /** Multipart: cover (1 file) and/or gallery (up to 8 files). */
  uploadImages: (id: string | number, formData: FormData) =>
    api.postForm<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/images`, formData).then(unwrap),
  removeImage: (id: string | number, imageId: string | number) =>
    api
      .delete<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/images/${imageId}`)
      .then(unwrap),
  requestClosure: (id: string | number, body: { reason: string }) =>
    api
      .post<{ success: boolean; data: ClosureRequest[] }>(`/campaigns/${id}/closure-requests`, body)
      .then(unwrap),
  listClosureRequests: (id: string | number) =>
    api
      .get<{ success: boolean; data: ClosureRequest[] }>(`/campaigns/${id}/closure-requests`)
      .then(unwrap),
  decideClosureRequest: (
    id: string | number,
    requestId: string | number,
    body: { action: ReviewAction; notes?: string }
  ) =>
    api
      .post<{ success: boolean; data: ClosureRequest[] }>(
        `/campaigns/${id}/closure-requests/${requestId}/decide`,
        body
      )
      .then(unwrap),
  /** Per-campaign payment breakdown (TZS) for the caller's campaigns. */
  paymentsBreakdown: () =>
    api
      .get<{ success: boolean; data: CampaignPaymentBreakdown[] }>(
        `/campaigns/payments/breakdown`
      )
      .then(unwrap),
  listGifts: (id: string | number) =>
    api
      .get<{ success: boolean; data: CampaignGift[] }>(`/campaigns/${id}/gifts`)
      .then(unwrap),
  addGift: (
    id: string | number,
    body: {
      description: string;
      estimatedValue?: number;
      donorId?: string | number;
      receivedAt?: string;
    }
  ) =>
    api
      .post<{ success: boolean; data: CampaignGift[] }>(`/campaigns/${id}/gifts`, body)
      .then(unwrap),
  removeGift: (id: string | number, giftId: string | number) =>
    api
      .delete<{ success: boolean; data: CampaignGift[] }>(
        `/campaigns/${id}/gifts/${giftId}`
      )
      .then(unwrap),
};

// ─── Notifications (in-app staff notification centre) ────────────────────────

export interface NotificationRecord {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  resource: string | null;
  resourceId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
    api
      .get<{
        success: boolean;
        data: { notifications: NotificationRecord[]; unreadCount: number; pagination: unknown };
      }>(`/notifications${qs(params || {})}`)
      .then(unwrap),
  unreadCount: () =>
    api
      .get<{ success: boolean; data: { unreadCount: number } }>(`/notifications/unread-count`)
      .then(unwrap),
  markRead: (id: string | number) =>
    api
      .post<{ success: boolean; data: { unreadCount: number } }>(
        `/notifications/${id}/read`,
        undefined,
        { silent: true }
      )
      .then(unwrap),
  markAllRead: () =>
    api
      .post<{ success: boolean; data: { unreadCount: number } }>(
        `/notifications/read-all`,
        undefined,
        { silent: true }
      )
      .then(unwrap),
};

// ─── Payouts (org-level admin requests + campaign-scoped manager requests) ───

export interface PayoutRecord {
  id: number;
  organizationId: number | null;
  campaignId: number | null;
  campaignName: string | null;
  amount: number;
  reason: string | null;
  /** Two-stage chain: REQUESTED -> REVIEWED (reviewer) -> APPROVED (org admin) -> PAID (super admin). */
  status: "REQUESTED" | "REVIEWED" | "APPROVED" | "PAID" | "REJECTED";
  notes: string | null;
  requestedBy: number | null;
  firstApprovedBy: number | null;
  firstApprovedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  gatewayRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export const payoutApi = {
  list: (params?: { status?: string; campaignId?: string | number; page?: number; limit?: number }) =>
    api
      .get<{ success: boolean; data: { payouts: PayoutRecord[]; pagination: unknown } }>(
        `/payouts${qs(params || {})}`
      )
      .then(unwrap),
  get: (id: string | number) =>
    api.get<{ success: boolean; data: PayoutRecord }>(`/payouts/${id}`).then(unwrap),
  /** Full chronological trail — requested / reviewed / approved / rejected / paid, with reasons. */
  history: (id: string | number) =>
    api
      .get<{ success: boolean; data: ReviewTrailEntry[] }>(`/payouts/${id}/history`)
      .then(unwrap),
  /** Every payout is tied to a campaign, with a reason. */
  create: (body: { amount: number; campaignId: string | number; reason: string; notes?: string }) =>
    api.post<{ success: boolean; data: PayoutRecord }>(`/payouts`, body).then(unwrap),
  approve: (id: string | number, notes?: string) =>
    api.post<{ success: boolean; data: PayoutRecord }>(`/payouts/${id}/approve`, { notes }).then(unwrap),
  reject: (id: string | number, notes?: string) =>
    api.post<{ success: boolean; data: PayoutRecord }>(`/payouts/${id}/reject`, { notes }).then(unwrap),
  markPaid: (id: string | number, body: { gatewayRef?: string; notes?: string }) =>
    api.post<{ success: boolean; data: PayoutRecord }>(`/payouts/${id}/paid`, body).then(unwrap),
};

// ─── Audit log ───────────────────────────────────────────────────────────────

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuditLogEntry {
  id: number;
  action: string;
  resource: string;
  resourceId: string | null;
  actorEmail: string | null;
  actor: { id: number; firstName: string | null; lastName: string | null; email: string } | null;
  severity: AuditSeverity;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditListParams {
  search?: string;
  action?: string;
  severity?: AuditSeverity;
  resource?: string;
  page?: number;
  limit?: number;
}

export const auditApi = {
  list: (params?: AuditListParams) =>
    api
      .get<{ success: boolean; data: { logs: AuditLogEntry[]; pagination: { total: number; page: number; totalPages: number } } }>(
        `/audit-logs${qs(params || {})}`
      )
      .then(unwrap),
  /** Streams the CSV export (auth header required — can't be a plain link). */
  exportCsv: async (params?: AuditListParams): Promise<Blob> => {
    const res = await fetch(`${API_BASE_URL}/audit-logs/export${qs(params || {})}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
    if (!res.ok) throw new Error("Failed to export audit log");
    return res.blob();
  },
};

// ─── User members (used for the admin "per manager" filter) ──────────────────

export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "REVIEWER" | "CAMPAIGN_MANAGER";

export interface UserRecord {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  lastLoginAt: string | null;
  createdAt: string;
  organizationId: number | null;
  organizationName: string | null;
}

export interface UserListParams {
  search?: string;
  role?: string;
  status?: string;
  organizationId?: string | number;
  sortBy?: "name" | "email" | "role" | "status" | "created" | "lastLogin";
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const userApi = {
  list: (params?: UserListParams) =>
    api
      .get<{ success: boolean; data: { users: UserRecord[]; pagination: unknown } }>(
        `/users${qs(params || {})}`
      )
      .then(unwrap),
  create: (body: Record<string, unknown>) =>
    api
      .post<{
        success: boolean;
        data: { user: UserRecord; temporaryPassword: string };
      }>(`/users`, body)
      .then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api
      .put<{ success: boolean; data: UserRecord }>(`/users/${id}`, body)
      .then(unwrap),
  remove: (id: string | number) =>
    api.delete<{ success: boolean; message: string }>(`/users/${id}`),
};

// ─── Organizations (platform admin org picker / filter) ──────────────────────

export interface OrganizationBrief {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  userCount: number;
}

export interface OrganizationRecord {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  currency: string;
  /** % added on top of a campaign's goal when its creator doesn't set their
   *  own rate (see CampaignRecord.serviceFeePercent). Editable by
   *  SUPER_ADMIN/ORG_ADMIN only. */
  defaultServiceFeePercent: number;
  status: string;
  createdAt: string;
  _count: { users: number; campaigns: number; donors: number };
}

export const organizationApi = {
  listAll: () =>
    api
      .get<{ success: boolean; data: { organizations: OrganizationBrief[] } }>(
        "/organizations/all"
      )
      .then(unwrap),
  /** SUPER_ADMIN — stand up a new organisation (used by the add-user flow). */
  create: (body: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
    defaultServiceFeePercent?: number;
  }) =>
    api
      .post<{ success: boolean; data: OrganizationBrief }>("/organizations", body)
      .then(unwrap),
  getMine: () =>
    api.get<{ success: boolean; data: OrganizationRecord }>("/organizations").then(unwrap),
  updateMine: (body: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
    logoUrl?: string;
    defaultServiceFeePercent?: number;
  }) =>
    api
      .put<{ success: boolean; data: OrganizationRecord }>("/organizations", body)
      .then(unwrap),
};

// ─── Organisation settings (dashboard Settings page) ────────────────────────
//
// Backed by GET/PUT /settings/org (ORG_ADMIN / SUPER_ADMIN only). The service
// fee rate on the same page uses `organizationApi` above — it has its own
// endpoint and its own review flow.

export interface OrgNotificationPrefs {
  notifyOnDonation: boolean;
  notifyOnCampaignStatus: boolean;
  notifyOnUserInvite: boolean;
}

export interface OrgSettings {
  orgName: string;
  brandName: string;
  logoUrl: string | null;
  registrationNumber: string | null;
  primaryEmail: string | null;
  phone: string | null;
  description: string | null;
  defaultChannel: ReminderChannel;
  currency: "TZS" | "USD" | "EUR" | "GBP";
  language: "en" | "sw";
  timezone: "eat" | "utc";
  dateFormat: "dmy" | "mdy" | "ymd";
  notifications: OrgNotificationPrefs;
  /** Present in the payload but not surfaced in the UI yet. */
  security?: Record<string, boolean>;
}

export type OrgSettingsUpdate = Partial<{
  orgName: string;
  registrationNumber: string | null;
  primaryEmail: string;
  phone: string;
  description: string;
  defaultChannel: ReminderChannel;
  currency: OrgSettings["currency"];
  language: OrgSettings["language"];
  timezone: OrgSettings["timezone"];
  dateFormat: OrgSettings["dateFormat"];
  notifications: Partial<OrgNotificationPrefs>;
}>;

export const settingsApi = {
  getOrg: () =>
    api.get<{ success: boolean; data: OrgSettings }>("/settings/org").then(unwrap),
  updateOrg: (body: OrgSettingsUpdate) =>
    api.put<{ success: boolean; data: OrgSettings }>("/settings/org", body).then(unwrap),
};

// ─── Status labels ───────────────────────────────────────────────────────────

export const PAY_STATUS_META: Record<
  PayStatus,
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Not paid",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PAID_FULL: {
    label: "Paid in full",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export const POOL_CATEGORY_META: Record<PoolCategory, { label: string; emoji: string }> = {
  FAMILY: { label: "Family", emoji: "b" },
  SCHOOL: { label: "School", emoji: "s" },
  STUDENT: { label: "Student", emoji: "p" },
  OFFICE: { label: "Office", emoji: "o" },
};

export function donorFullName(d: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return [d.firstName, d.lastName].filter(Boolean).join(" ") || "Unknown donor";
}

export function formatTZSFull(n: number): string {
  return `TZS ${Number(n || 0).toLocaleString("en-TZ")}`;
}

export function formatTZSCompact(n: number): string {
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TZS ${Math.round(n / 1_000)}K`;
  return `TZS ${Number(n || 0).toLocaleString()}`;
}