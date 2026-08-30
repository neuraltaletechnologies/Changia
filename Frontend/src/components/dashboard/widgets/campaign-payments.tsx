"use client";

import Link from "next/link";
import { formatTZS } from "@/lib/dashboard/types";
import type { CampaignPaymentBreakdown } from "@/lib/dashboard/api";

interface CampaignPaymentPiesProps {
  breakdown: CampaignPaymentBreakdown[];
}

type SliceKey =
  | "paid"
  | "promisedPaid"
  | "promisedUnpaid"
  | "unpaid"
  | "giftValue";

const SLICES: { key: SliceKey; label: string; color: string }[] = [
  { key: "paid", label: "Paid", color: "#10b981" }, // emerald-500
  { key: "promisedPaid", label: "Promised · paid", color: "#0ea5e9" }, // sky-500
  { key: "promisedUnpaid", label: "Promised · unpaid", color: "#f59e0b" }, // amber-500
  { key: "unpaid", label: "Unpaid", color: "#cbd5e1" }, // slate-300
  { key: "giftValue", label: "Gifts (est.)", color: "#8b5cf6" }, // violet-500
];

/** SVG pie wedge path from `startFrac`→`endFrac` of the circle (0 at 12 o'clock). */
function wedge(cx: number, cy: number, r: number, startFrac: number, endFrac: number) {
  const a0 = startFrac * 2 * Math.PI - Math.PI / 2;
  const a1 = endFrac * 2 * Math.PI - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = endFrac - startFrac > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function Pie({ c }: { c: CampaignPaymentBreakdown }) {
  const values = SLICES.map((s) => ({ ...s, value: Math.max(0, c[s.key]) }));
  const total = values.reduce((sum, s) => sum + s.value, 0);
  const nonZero = values.filter((s) => s.value > 0);
  const fundedPct =
    c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;

  let acc = 0;
  return (
    <div className="flex w-full flex-col items-center">
      <svg viewBox="0 0 100 100" className="w-24 h-24 block">
        {total === 0 ? (
          <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
        ) : nonZero.length === 1 ? (
          <circle cx="50" cy="50" r="46" fill={nonZero[0].color} />
        ) : (
          values.map((s) => {
            if (s.value === 0) return null;
            const start = acc / total;
            acc += s.value;
            const end = acc / total;
            return <path key={s.key} d={wedge(50, 50, 46, start, end)} fill={s.color} />;
          })
        )}
      </svg>

      <Link
        href={`/dashboard/campaigns/${c.campaignId}`}
        className="mt-2.5 block max-w-full truncate text-center text-xs font-medium text-foreground hover:text-primary transition-colors"
      >
        {c.name}
      </Link>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
        {fundedPct}% · {formatTZS(c.raised)}
      </p>
    </div>
  );
}

/**
 * Per-campaign payment breakdown as pie charts — every campaign shown, in a
 * full-width responsive grid that wraps, sharing one legend.
 */
export function CampaignPaymentPies({ breakdown }: CampaignPaymentPiesProps) {
  const rows = breakdown.filter((c) => c.goal > 0 || c.giftValue > 0);

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-foreground">Campaign payments</h2>
        <Link
          href="/dashboard/campaigns"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No campaigns with a funding target yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((c) => (
              <Pie key={c.campaignId} c={c} />
            ))}
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-4">
            {SLICES.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
