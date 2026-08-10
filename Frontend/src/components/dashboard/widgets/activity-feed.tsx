import { recentActivity } from "@/lib/dashboard/mock-data";
import {
  Heart,
  UserPlus,
  UserCheck,
  Megaphone,
  FileDown,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/dashboard/utils";

const iconMap = {
  donation: { Icon: Heart, bg: "bg-emerald-100", color: "text-emerald-600" },
  donor_added: { Icon: UserPlus, bg: "bg-sky-100", color: "text-sky-600" },
  donor_updated: { Icon: UserCheck, bg: "bg-amber-100", color: "text-amber-600" },
  campaign_created: { Icon: Megaphone, bg: "bg-primary/10", color: "text-primary" },
  import: { Icon: FileDown, bg: "bg-slate-100", color: "text-slate-500" },
  note_added: { Icon: MessageSquare, bg: "bg-rose-100", color: "text-rose-500" },
};

export function ActivityFeed() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        <Link href="/dashboard/audit-log" className="text-xs text-primary hover:underline">
          View audit log
        </Link>
      </div>
      <div className="divide-y divide-border">
        {recentActivity.map((item) => {
          const { Icon, bg, color } = iconMap[item.type] ?? iconMap.note_added;
          return (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", bg)}>
                <Icon className={cn("w-3.5 h-3.5", color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug">{item.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{item.user}</span>
                  {item.meta && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">{item.meta}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                {item.timestamp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
