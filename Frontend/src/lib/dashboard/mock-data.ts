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
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  amount: number;
  campaign: string;
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

// ─── Donors ──────────────────────────────────────────────────────────────────

export const donors: Donor[] = [
  {
    id: "d1",
    firstName: "Amina",
    lastName: "Hassan",
    email: "amina.hassan@gmail.com",
    phone: "+255 712 345 678",
    location: "Dar es Salaam",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "email",
    tags: ["major-donor", "recurring"],
    totalGiven: 4500000,
    lastGift: "2026-07-15",
    lastGiftAmount: 500000,
    giftCount: 12,
    joinedDate: "2022-03-10",
    notes: "Prefers quarterly updates. Very engaged with education campaigns.",
  },
  {
    id: "d2",
    firstName: "Juma",
    lastName: "Mwangi",
    email: "juma.mwangi@outlook.com",
    phone: "+255 769 234 567",
    location: "Mwanza",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "whatsapp",
    tags: ["recurring", "diaspora"],
    totalGiven: 2200000,
    lastGift: "2026-07-20",
    lastGiftAmount: 200000,
    giftCount: 8,
    joinedDate: "2023-01-22",
  },
  {
    id: "d3",
    firstName: "Fatuma",
    lastName: "Salim",
    email: "fatuma.salim@changia.tz",
    phone: "+255 754 876 543",
    location: "Zanzibar",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "sms",
    tags: ["volunteer"],
    totalGiven: 850000,
    lastGift: "2026-06-30",
    lastGiftAmount: 100000,
    giftCount: 5,
    joinedDate: "2023-07-11",
  },
  {
    id: "d4",
    firstName: "Baraka",
    lastName: "Omondi",
    email: "b.omondi@safaricom.co.tz",
    phone: "+255 788 123 456",
    location: "Arusha",
    status: "lapsed",
    consentStatus: "consented",
    preferredChannel: "email",
    tags: ["corporate"],
    totalGiven: 7500000,
    lastGift: "2025-11-05",
    lastGiftAmount: 1000000,
    giftCount: 6,
    joinedDate: "2021-08-14",
    notes: "Corporate CSR budget. Check renewal in Q4.",
  },
  {
    id: "d5",
    firstName: "Neema",
    lastName: "Kimani",
    email: "neema.kimani@yahoo.com",
    phone: "+255 713 456 789",
    location: "Dodoma",
    status: "prospect",
    consentStatus: "pending",
    preferredChannel: "phone",
    tags: ["first-time"],
    totalGiven: 0,
    lastGift: "",
    lastGiftAmount: 0,
    giftCount: 0,
    joinedDate: "2026-07-01",
    notes: "Referred by Amina Hassan. Interested in water access campaign.",
  },
  {
    id: "d6",
    firstName: "Rashid",
    lastName: "Mhina",
    email: "r.mhina@gmail.com",
    phone: "+255 767 890 123",
    location: "Dar es Salaam",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "whatsapp",
    tags: ["recurring", "major-donor"],
    totalGiven: 6200000,
    lastGift: "2026-07-28",
    lastGiftAmount: 750000,
    giftCount: 18,
    joinedDate: "2020-11-05",
  },
  {
    id: "d7",
    firstName: "Grace",
    lastName: "Njoroge",
    email: "grace.njoroge@ngo.org",
    phone: "+255 756 321 098",
    location: "Moshi",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "email",
    tags: ["volunteer", "first-time"],
    totalGiven: 320000,
    lastGift: "2026-07-10",
    lastGiftAmount: 50000,
    giftCount: 3,
    joinedDate: "2026-01-18",
  },
  {
    id: "d8",
    firstName: "Hamisi",
    lastName: "Waweru",
    email: "hamisi.waweru@company.tz",
    phone: "+255 745 678 901",
    location: "Dar es Salaam",
    status: "inactive",
    consentStatus: "withdrawn",
    preferredChannel: "post",
    tags: ["corporate"],
    totalGiven: 1800000,
    lastGift: "2025-03-20",
    lastGiftAmount: 300000,
    giftCount: 4,
    joinedDate: "2022-09-30",
  },
  {
    id: "d9",
    firstName: "Zawadi",
    lastName: "Mgeni",
    email: "zawadi.mgeni@hotmail.com",
    phone: "+255 778 234 567",
    location: "Tanga",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "sms",
    tags: ["recurring"],
    totalGiven: 1200000,
    lastGift: "2026-08-01",
    lastGiftAmount: 150000,
    giftCount: 9,
    joinedDate: "2023-04-15",
  },
  {
    id: "d10",
    firstName: "Dickson",
    lastName: "Nkosi",
    email: "dickson.nkosi@gmail.com",
    phone: "+255 715 543 210",
    location: "Iringa",
    status: "prospect",
    consentStatus: "pending",
    preferredChannel: "email",
    tags: ["diaspora"],
    totalGiven: 0,
    lastGift: "",
    lastGiftAmount: 0,
    giftCount: 0,
    joinedDate: "2026-07-25",
  },
  {
    id: "d11",
    firstName: "Mariamu",
    lastName: "Ally",
    email: "mariamu.ally@gmail.com",
    phone: "+255 769 876 543",
    location: "Morogoro",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "whatsapp",
    tags: ["recurring", "volunteer"],
    totalGiven: 980000,
    lastGift: "2026-07-22",
    lastGiftAmount: 120000,
    giftCount: 7,
    joinedDate: "2023-10-01",
  },
  {
    id: "d12",
    firstName: "Ally",
    lastName: "Bwana",
    email: "ally.bwana@enterprise.co.tz",
    phone: "+255 754 123 456",
    location: "Dar es Salaam",
    status: "active",
    consentStatus: "consented",
    preferredChannel: "email",
    tags: ["corporate", "major-donor"],
    totalGiven: 12000000,
    lastGift: "2026-07-31",
    lastGiftAmount: 2000000,
    giftCount: 10,
    joinedDate: "2021-01-10",
  },
];

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Clean Water for Dodoma",
    goal: 50000000,
    raised: 31250000,
    donors: 247,
    status: "active",
    startDate: "2026-06-01",
    endDate: "2026-09-30",
  },
  {
    id: "c2",
    name: "Education Bursary Fund 2026",
    goal: 30000000,
    raised: 22800000,
    donors: 189,
    status: "active",
    startDate: "2026-03-01",
    endDate: "2026-12-31",
  },
  {
    id: "c3",
    name: "Maternal Health Initiative",
    goal: 20000000,
    raised: 20000000,
    donors: 143,
    status: "completed",
    startDate: "2025-09-01",
    endDate: "2026-04-30",
  },
  {
    id: "c4",
    name: "Farmers Micro-Grant Program",
    goal: 15000000,
    raised: 4200000,
    donors: 58,
    status: "active",
    startDate: "2026-07-15",
    endDate: "2026-10-15",
  },
  {
    id: "c5",
    name: "Digital Literacy – Rural Schools",
    goal: 25000000,
    raised: 0,
    donors: 0,
    status: "draft",
    startDate: "2026-09-01",
    endDate: "2027-03-31",
  },
];

// ─── Donations ───────────────────────────────────────────────────────────────

export const recentDonations: Donation[] = [
  {
    id: "don1",
    donorId: "d12",
    donorName: "Ally Bwana",
    amount: 2000000,
    campaign: "Clean Water for Dodoma",
    channel: "email",
    date: "2026-07-31",
    status: "completed",
  },
  {
    id: "don2",
    donorId: "d6",
    donorName: "Rashid Mhina",
    amount: 750000,
    campaign: "Education Bursary Fund 2026",
    channel: "whatsapp",
    date: "2026-07-28",
    status: "completed",
  },
  {
    id: "don3",
    donorId: "d9",
    donorName: "Zawadi Mgeni",
    amount: 150000,
    campaign: "Farmers Micro-Grant Program",
    channel: "sms",
    date: "2026-08-01",
    status: "completed",
  },
  {
    id: "don4",
    donorId: "d11",
    donorName: "Mariamu Ally",
    amount: 120000,
    campaign: "Education Bursary Fund 2026",
    channel: "whatsapp",
    date: "2026-07-22",
    status: "completed",
  },
  {
    id: "don5",
    donorId: "d1",
    donorName: "Amina Hassan",
    amount: 500000,
    campaign: "Clean Water for Dodoma",
    channel: "email",
    date: "2026-07-15",
    status: "completed",
  },
  {
    id: "don6",
    donorId: "d2",
    donorName: "Juma Mwangi",
    amount: 200000,
    campaign: "Education Bursary Fund 2026",
    channel: "whatsapp",
    date: "2026-07-20",
    status: "completed",
  },
];

// ─── Activity ─────────────────────────────────────────────────────────────────

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    type: "donation",
    description: "New donation of TZS 2,000,000 received from Ally Bwana",
    user: "System",
    timestamp: "2 minutes ago",
    meta: "Clean Water for Dodoma",
  },
  {
    id: "a2",
    type: "donor_added",
    description: "New donor profile created for Dickson Nkosi",
    user: "Salma Rashid",
    timestamp: "1 hour ago",
    meta: "Prospect",
  },
  {
    id: "a3",
    type: "donation",
    description: "Donation of TZS 750,000 confirmed for Rashid Mhina",
    user: "System",
    timestamp: "3 hours ago",
    meta: "Education Bursary Fund 2026",
  },
  {
    id: "a4",
    type: "campaign_created",
    description: "Campaign 'Farmers Micro-Grant Program' went live",
    user: "Admin",
    timestamp: "1 day ago",
  },
  {
    id: "a5",
    type: "import",
    description: "Bulk import of 14 donor records completed",
    user: "Salma Rashid",
    timestamp: "2 days ago",
    meta: "14 records",
  },
  {
    id: "a6",
    type: "donor_updated",
    description: "Consent status updated for Hamisi Waweru",
    user: "Admin",
    timestamp: "3 days ago",
    meta: "Withdrawn",
  },
];

// ─── Team ─────────────────────────────────────────────────────────────────────

export const teamMembers: TeamMember[] = [
  {
    id: "t1",
    name: "Admin User",
    email: "admin@changia.tz",
    role: "admin",
    status: "active",
    lastActive: "Now",
  },
  {
    id: "t2",
    name: "Salma Rashid",
    email: "salma@changia.tz",
    role: "manager",
    status: "active",
    lastActive: "2 hours ago",
  },
  {
    id: "t3",
    name: "Daniel Mwaura",
    email: "daniel@changia.tz",
    role: "fundraiser",
    status: "active",
    lastActive: "Yesterday",
  },
  {
    id: "t4",
    name: "Lulu Kapinga",
    email: "lulu@changia.tz",
    role: "viewer",
    status: "active",
    lastActive: "3 days ago",
  },
  {
    id: "t5",
    name: "Omar Farouq",
    email: "omar@changia.tz",
    role: "fundraiser",
    status: "pending",
    lastActive: "Invitation sent",
  },
  {
    id: "t6",
    name: "Priya Nair",
    email: "priya@changia.tz",
    role: "manager",
    status: "inactive",
    lastActive: "2 weeks ago",
  },
];

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs: AuditLog[] = [
  {
    id: "al1",
    action: "donor.create",
    resource: "Donor",
    resourceId: "d10",
    user: "Salma Rashid",
    userId: "t2",
    ipAddress: "196.13.4.22",
    timestamp: "2026-08-03 11:42:05",
    severity: "info",
    details: "Created prospect donor: Dickson Nkosi",
  },
  {
    id: "al2",
    action: "donation.create",
    resource: "Donation",
    resourceId: "don1",
    user: "System",
    userId: "system",
    ipAddress: "10.0.0.1",
    timestamp: "2026-08-03 11:40:01",
    severity: "info",
    details: "Donation TZS 2,000,000 via M-Pesa for Clean Water campaign",
  },
  {
    id: "al3",
    action: "team.invite",
    resource: "User",
    resourceId: "t5",
    user: "Admin User",
    userId: "t1",
    ipAddress: "197.250.12.44",
    timestamp: "2026-08-03 10:15:30",
    severity: "info",
    details: "Invited omar@changia.tz as Fundraiser",
  },
  {
    id: "al4",
    action: "donor.consent_update",
    resource: "Donor",
    resourceId: "d8",
    user: "Admin User",
    userId: "t1",
    ipAddress: "197.250.12.44",
    timestamp: "2026-07-31 09:20:14",
    severity: "warning",
    details: "Consent withdrawn for Hamisi Waweru — removed from all mailing lists",
  },
  {
    id: "al5",
    action: "import.donors",
    resource: "Import",
    resourceId: "imp_003",
    user: "Salma Rashid",
    userId: "t2",
    ipAddress: "196.13.4.22",
    timestamp: "2026-07-30 14:05:52",
    severity: "info",
    details: "Bulk import: 14 records created, 0 errors",
  },
  {
    id: "al6",
    action: "settings.update",
    resource: "Settings",
    resourceId: "org_001",
    user: "Admin User",
    userId: "t1",
    ipAddress: "197.250.12.44",
    timestamp: "2026-07-29 16:42:00",
    severity: "warning",
    details: "Organisation name updated: 'Changia Foundation TZ'",
  },
  {
    id: "al7",
    action: "campaign.launch",
    resource: "Campaign",
    resourceId: "c4",
    user: "Admin User",
    userId: "t1",
    ipAddress: "197.250.12.44",
    timestamp: "2026-07-15 08:00:00",
    severity: "info",
    details: "Campaign 'Farmers Micro-Grant Program' launched",
  },
  {
    id: "al8",
    action: "team.role_change",
    resource: "User",
    resourceId: "t4",
    user: "Admin User",
    userId: "t1",
    ipAddress: "197.250.12.44",
    timestamp: "2026-07-14 11:33:20",
    severity: "critical",
    details: "Role changed from Manager to Viewer for Lulu Kapinga",
  },
  {
    id: "al9",
    action: "donor.delete",
    resource: "Donor",
    resourceId: "d_del_01",
    user: "Salma Rashid",
    userId: "t2",
    ipAddress: "196.13.4.22",
    timestamp: "2026-07-10 15:10:00",
    severity: "critical",
    details: "Donor record permanently deleted (GDPR request)",
  },
  {
    id: "al10",
    action: "export.donors",
    resource: "Export",
    resourceId: "exp_007",
    user: "Daniel Mwaura",
    userId: "t3",
    ipAddress: "41.72.145.22",
    timestamp: "2026-07-08 13:25:40",
    severity: "warning",
    details: "Exported 112 donor records to CSV",
  },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "New donation received",
    description: "Ally Bwana donated TZS 2,000,000 to Clean Water campaign",
    time: "2 min ago",
    read: false,
    type: "donation",
  },
  {
    id: "n2",
    title: "Campaign milestone reached",
    description: "'Education Bursary Fund 2026' is 76% funded",
    time: "1 hour ago",
    read: false,
    type: "campaign",
  },
  {
    id: "n3",
    title: "New team member invited",
    description: "Omar Farouq has been invited as Fundraiser",
    time: "3 hours ago",
    read: false,
    type: "team",
  },
  {
    id: "n4",
    title: "Donor consent withdrawn",
    description: "Hamisi Waweru has withdrawn communication consent",
    time: "2 days ago",
    read: true,
    type: "system",
  },
  {
    id: "n5",
    title: "Bulk import complete",
    description: "14 donor records imported successfully",
    time: "2 days ago",
    read: true,
    type: "system",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

export const totalRaised = recentDonations.reduce((sum, d) => sum + d.amount, 0);

export const statsOverview = {
  totalDonors: donors.length,
  activeCampaigns: campaigns.filter((c) => c.status === "active").length,
  totalRaised: campaigns.reduce((sum, c) => sum + c.raised, 0),
  avgGift: Math.round(
    donors.filter((d) => d.totalGiven > 0).reduce((sum, d) => sum + d.lastGiftAmount, 0) /
      donors.filter((d) => d.totalGiven > 0).length
  ),
};
