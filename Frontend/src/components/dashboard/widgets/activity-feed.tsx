import Link from "next/link";

export function ActivityFeed() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        <Link href="/dashboard/audit-log" className="text-xs text-primary hover:underline">
          View audit log
        </Link>
      </div>
      <div className="py-12 text-center text-sm text-muted-foreground">
        No recent activity yet.
      </div>
    </div>
  );
}
