import { api } from "@/lib/api-client";

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
  minimumAmount: number;
  startDate: string | null;
  endDate: string | null;
  status: "DRAFT" | "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  isPublic: boolean;
  contactPhone: string | null;
  raisedAmount: number;
  donorCount: number;
  isFeatured: boolean;
  featuredAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: { user: { id: number; firstName: string; lastName: string; email: string } }[];
  /** Lightweight summary embedded on list/detail responses — present only once a completion report exists. */
  completionReport?: {
    status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    submittedAt: string;
    reviewedAt: string | null;
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
  create: (body: Record<string, unknown>) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns`, body).then(unwrap),
  update: (id: string | number, body: Record<string, unknown>) =>
    api.put<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}`, body).then(unwrap),
  submit: (id: string | number) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/submit`).then(unwrap),
  approve: (id: string | number) =>
    api.post<{ success: boolean; data: CampaignRecord }>(`/campaigns/${id}/approve`).then(unwrap),
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
  reviewCompletionReport: (id: string | number, body: { approved: boolean; notes?: string }) =>
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
};

// ─── User members (used for the admin "per manager" filter) ──────────────────

export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "CAMPAIGN_MANAGER";

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

export const organizationApi = {
  listAll: () =>
    api
      .get<{ success: boolean; data: { organizations: OrganizationBrief[] } }>(
        "/organizations/all"
      )
      .then(unwrap),
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