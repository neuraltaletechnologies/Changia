/**
 * Public (unauthenticated) campaign data — powers the marketing homepage's
 * featured picks, the /campaigns listing and a campaign's public detail
 * page. Plain fetch (no api-client.ts) because these run on the server and
 * carry no auth token.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export type Locale = 'en' | 'sw';

export interface PublicCampaign {
  id: number;
  name: string;
  slug: string;
  story: string | null;
  /** What the funds will deliver (locale-resolved). May be null. */
  scope: string | null;
  /** How a contribution is accepted / the campaign delivered (locale-resolved). */
  acceptance: string | null;
  imageUrl: string | null;
  category: string | null;
  goalAmount: number;
  serviceFeePercent: number;
  serviceFeeAmount: number;
  publicTarget: number;
  minimumAmount: number;
  startDate: string | null;
  endDate: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  raisedAmount: number;
  donorCount: number;
  isFeatured: boolean;
  remaining: number;
  progressPercent: number;
  organizationName: string | null;
  createdAt: string;
}

export interface PublicCampaignDetail extends PublicCampaign {
  /** Supporting photos the organizer uploaded (the cover stays on imageUrl). */
  images: { id: number; url: string }[];
  /** Approved proof of how the funds were used — only present for a COMPLETED
   *  campaign whose completion report an admin/reviewer has approved. */
  completionProof: {
    summary: string;
    amountUtilized: number | null;
    images: string[];
  } | null;
  recentDonations: {
    amount: number;
    donorName: string | null;
    createdAt: string;
  }[];
}

export function formatTZS(amount: number): string {
  return `TZS ${Math.round(amount).toLocaleString('en-TZ')}`;
}

async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data ?? null;
  } catch {
    // Marketing pages must still render if the API is briefly unreachable.
    return null;
  }
}

export async function getFeaturedCampaigns(locale: Locale = 'en'): Promise<PublicCampaign[]> {
  const data = await publicGet<{ campaigns: PublicCampaign[] }>(
    `/public/campaigns?featured=true&locale=${locale}`
  );
  return data?.campaigns ?? [];
}

export async function getPublicCampaigns(limit = 5, locale: Locale = 'en'): Promise<PublicCampaign[]> {
  const data = await publicGet<{ campaigns: PublicCampaign[] }>(
    `/public/campaigns?limit=${limit}&locale=${locale}`
  );
  return data?.campaigns ?? [];
}

export async function getPublicCampaign(
  idOrSlug: string,
  locale: Locale = 'en'
): Promise<PublicCampaignDetail | null> {
  return publicGet<PublicCampaignDetail>(
    `/public/campaigns/${encodeURIComponent(idOrSlug)}?locale=${locale}`
  );
}

// ─── Completed-campaign impact stories (the "blog" of finished campaigns) ────
//
// A campaign only appears here once it's COMPLETED *and* its completion
// report (proof of how the funds were used) has been approved by an admin —
// that approval is what actually "posts" the story publicly.

export interface CompletedCampaignCard {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  image: string | null;
  organizationName: string | null;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  publishedAt: string;
}

export interface CompletedCampaignDetail {
  id: number;
  slug: string;
  title: string;
  campaignStory: string | null;
  category: string | null;
  image: string | null;
  organizationName: string | null;
  goalAmount: number;
  raisedAmount: number;
  progressPercent: number;
  donorCount: number;
  startDate: string | null;
  endDate: string | null;
  completionSummary: string;
  amountUtilized: number | null;
  proofImages: string[];
  publishedAt: string;
}

export async function getCompletedCampaigns(
  locale: Locale = 'en',
  limit = 12
): Promise<CompletedCampaignCard[]> {
  const data = await publicGet<{ campaigns: CompletedCampaignCard[] }>(
    `/public/campaigns/completed?locale=${locale}&limit=${limit}`
  );
  return data?.campaigns ?? [];
}

export async function getCompletedCampaign(
  slug: string,
  locale: Locale = 'en'
): Promise<CompletedCampaignDetail | null> {
  return publicGet<CompletedCampaignDetail>(
    `/public/campaigns/completed/${encodeURIComponent(slug)}?locale=${locale}`
  );
}

// ─── Public contribution (donate) flow ───────────────────────────────────────
// No PIN is ever collected here — only amount + phone. The donor approves the
// actual payment at their mobile-money operator's own prompt.

export interface ContributionStarted {
  attemptId: number;
  status: 'PENDING';
  amount: number;
  expiresAt: string | null;
  message: string;
}

export interface ContributionStatus {
  attemptId: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  campaignId: number;
  receiptNumber: string | null;
}

export class PublicApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

async function publicPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PublicApiError(
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      payload?.error?.code ?? 'UNKNOWN_ERROR'
    );
  }
  return payload.data as T;
}

export function startContribution(
  campaignSlug: string,
  data: { amount: number; donorName?: string; donorPhone: string; donorEmail?: string; isAnonymous?: boolean }
): Promise<ContributionStarted> {
  return publicPost(`/public/donations/campaigns/${encodeURIComponent(campaignSlug)}/contributions`, data);
}

export async function getContributionStatus(attemptId: number): Promise<ContributionStatus> {
  const res = await fetch(`${API_BASE_URL}/public/donations/contributions/${attemptId}`, {
    cache: 'no-store',
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PublicApiError(
      payload?.error?.message ?? 'Could not check contribution status.',
      payload?.error?.code ?? 'UNKNOWN_ERROR'
    );
  }
  return payload.data as ContributionStatus;
}

/** ⚠️ Dev/demo-only stand-in for the real gateway callback. */
export function simulateConfirmContribution(
  attemptId: number
): Promise<{ attemptId: number; status: string; receiptNumber: string | null; amount: number | null }> {
  return publicPost(`/public/donations/contributions/${attemptId}/simulate-confirm`);
}
