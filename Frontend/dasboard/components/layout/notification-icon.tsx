import { Heart, Megaphone, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type NotifType = "donation" | "campaign" | "system" | "team";

const config: Record<
  NotifType,
  { Icon: React.ElementType; bg: string; color: string }
> = {
  donation: { Icon: Heart, bg: "bg-emerald-100", color: "text-emerald-600" },
  campaign: { Icon: Megaphone, bg: "bg-sky-100", color: "text-sky-600" },
  system: { Icon: Settings, bg: "bg-slate-100", color: "text-slate-500" },
  team: { Icon: Users, bg: "bg-amber-100", color: "text-amber-600" },
};

export function NotificationIcon({ type }: { type: NotifType }) {
  const { Icon, bg, color } = config[type] ?? config.system;
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
        bg
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", color)} />
    </div>
  );
}
