import Link from "next/link";

export function RecentDonations() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent Donations</h2>
        <Link href="/dashboard/donors" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="py-12 text-center text-sm text-muted-foreground">
        No donations recorded yet.
      </div>
    </div>
  );
}
