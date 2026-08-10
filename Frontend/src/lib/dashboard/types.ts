// ─── Types ───────────────────────────────────────────────────────────────────

export type DonorStatus = "active" | "inactive" | "prospect" | "lapsed";
export type ConsentStatus = "consented" | "pending" | "withdrawn";
export type CommChannel = "email" | "sms" | "whatsapp" | "phone" | "post";
export type DonorTag =
  | "major-donor"
  | "recurring"
  | "corporate"
  | "anonymous"
  | "volunteer"
  | "diaspora"
  | "first-time";

export interface Donor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  status: DonorStatus;
  consentStatus: ConsentStatus;
  preferredChannel: CommChannel;
  tags: DonorTag[];
  totalGiven: number;
  lastGift: string;
  lastGiftAmount: number;
  giftCount: number;
  joinedDate: string;
  avatar?: string;
  notes?: string;
}

export type CampaignStatus = "active" | "draft" | "completed" | "paused" | "pending";

export interface Campaign {
  id: string;
  name: string;
  goal: number;
  raised: number;
  donors: number;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  description?: string;
  category?: string;
  contactPhone?: string;
  submittedAt?: string;
  ownerName?: string;
  ownerEmail?: string;
  image?: string;
  evidence?: string[];
  memberIds?: string[];
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  amount: number;
  campaign: string;
  campaignId: string;
  channel: CommChannel;
  date: string;
  status: "completed" | "pending" | "failed";
}

export interface ActivityItem {
  id: string;
  type:
    | "donation"
    | "donor_added"
    | "donor_updated"
    | "campaign_created"
    | "import"
    | "note_added";
  description: string;
  user: string;
  timestamp: string;
  meta?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "viewer" | "fundraiser";
  status: "active" | "pending" | "inactive";
  lastActive: string;
  avatar?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  user: string;
  userId: string;
  ipAddress: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  details?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "donation" | "campaign" | "system" | "team";
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatTZS(amount: number): string {
  if (amount >= 1_000_000) {
    return `TZS ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `TZS ${(amount / 1_000).toFixed(0)}K`;
  }
  return `TZS ${amount.toLocaleString()}`;
}

export function formatTZSFull(amount: number): string {
  return `TZS ${amount.toLocaleString("en-TZ")}`;
}
