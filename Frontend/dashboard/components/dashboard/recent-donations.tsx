import { recentDonations, formatTZSFull } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const channelColors: Record<string, string> = {
  email: "bg-sky-50 text-sky-700",
  sms: "bg-amber-50 text-amber-700",
  whatsapp: "bg-emerald-50 text-emerald-700",
  phone: "bg-slate-50 text-slate-600",
  post: "bg-rose-50 text-rose-700",
};

export function RecentDonations() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent Donations</h2>
        <button className="text-xs text-primary hover:underline">View all</button>
      </div>
      <div className="divide-y divide-border">
        {recentDonations.map((donation) => {
          const initials = donation.donorName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2);
          return (
            <div
              key={donation.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {donation.donorName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {donation.campaign}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-foreground">
                  {formatTZSFull(donation.amount)}
                </p>
                <span
                  className={cn(
                    "text-[10px] font-medium rounded-full px-1.5 py-0.5",
                    channelColors[donation.channel] || "bg-slate-50 text-slate-600"
                  )}
                >
                  {donation.channel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
