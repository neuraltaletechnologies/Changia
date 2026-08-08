import { cn } from "@/lib/utils";
import { DonorStatus, ConsentStatus, CommChannel, DonorTag } from "@/lib/mock-data";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const statusStyles: Record<DonorStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-500 border-slate-200",
  prospect: "bg-sky-50 text-sky-700 border-sky-200",
  lapsed: "bg-amber-50 text-amber-700 border-amber-200",
};

export function DonorStatusBadge({ status }: { status: DonorStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

// ─── Consent Badge ────────────────────────────────────────────────────────────
const consentStyles: Record<ConsentStatus, string> = {
  consented: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  withdrawn: "bg-rose-50 text-rose-700 border-rose-200",
};

export function ConsentBadge({ status }: { status: ConsentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium border rounded-full px-2 py-0.5 capitalize",
        consentStyles[status]
      )}
    >
      {status}
    </span>
  );
}

// ─── Channel Badge ────────────────────────────────────────────────────────────
const channelStyles: Record<CommChannel, string> = {
  email: "bg-sky-50 text-sky-700",
  sms: "bg-amber-50 text-amber-700",
  whatsapp: "bg-emerald-50 text-emerald-700",
  phone: "bg-slate-50 text-slate-600",
  post: "bg-rose-50 text-rose-600",
};

export function ChannelBadge({ channel }: { channel: CommChannel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium rounded px-1.5 py-0.5 capitalize",
        channelStyles[channel]
      )}
    >
      {channel}
    </span>
  );
}

// ─── Tag Badge ────────────────────────────────────────────────────────────────
const tagLabels: Record<DonorTag, string> = {
  "major-donor": "Major Donor",
  recurring: "Recurring",
  corporate: "Corporate",
  anonymous: "Anonymous",
  volunteer: "Volunteer",
  diaspora: "Diaspora",
  "first-time": "First Time",
};

const tagStyles: Record<DonorTag, string> = {
  "major-donor": "bg-amber-50 text-amber-700",
  recurring: "bg-primary/10 text-primary",
  corporate: "bg-slate-100 text-slate-600",
  anonymous: "bg-slate-50 text-slate-500",
  volunteer: "bg-rose-50 text-rose-600",
  diaspora: "bg-teal-50 text-teal-700",
  "first-time": "bg-emerald-50 text-emerald-600",
};

export function TagBadge({ tag }: { tag: DonorTag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5",
        tagStyles[tag]
      )}
    >
      {tagLabels[tag]}
    </span>
  );
}
