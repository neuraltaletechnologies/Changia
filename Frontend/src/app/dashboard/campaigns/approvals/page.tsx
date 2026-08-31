import { redirect } from "next/navigation";

// The approvals workspace moved to /dashboard/approvals (it covers every request
// type — campaigns, edits, fees, closures, reports, payouts — not just
// campaigns). Keep this path working for old links / bookmarks.
export default function LegacyCampaignApprovalsRedirect() {
  redirect("/dashboard/approvals");
}
