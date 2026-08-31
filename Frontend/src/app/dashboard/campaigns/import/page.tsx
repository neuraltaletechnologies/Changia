"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportWizard } from "@/components/dashboard/import-wizard";

const COLUMNS = [
  { field: "name", required: true, help: "Campaign title" },
  { field: "goal_amount", required: true, help: "Whole TZS amount, greater than zero" },
  { field: "category" },
  { field: "story", help: "Campaign description / narrative" },
  { field: "minimum_amount", help: "Minimum single contribution (defaults to 1000)" },
  { field: "start_date", help: "YYYY-MM-DD" },
  { field: "end_date", help: "YYYY-MM-DD" },
  { field: "contact_phone" },
];

export default function ImportCampaignsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Campaigns
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Import Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bulk-create campaigns as drafts. Each row lands as a DRAFT you can finish and submit for review.
        </p>
      </div>

      <ImportWizard
        dataset="campaigns"
        columns={COLUMNS}
        description="Each row becomes a draft campaign."
      />
    </div>
  );
}
