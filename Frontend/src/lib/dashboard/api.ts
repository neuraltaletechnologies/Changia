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
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: { user: { id: number; firstName: string; lastName: string; email: string } }[];
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
  anomalous: () =>
    api.get<{ success: boolean; data: DonorPool }>(`/donor-pools/anomalous`).then(unwrap),
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
};

// ─── Team members (used for the admin "per manager" filter) ──────────────────

export interface TeamMemberRecord {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "ORG_ADMIN" | "CAMPAIGN_MANAGER";
  status: string;
}

export const userApi = {
  list: (params?: { role?: string; search?: string; page?: number; limit?: number }) =>
    api
      .get<{ success: boolean; data: { users: TeamMemberRecord[]; pagination: unknown } }>(
        `/users${qs(params || {})}`
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