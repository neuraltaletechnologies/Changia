"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportWizard } from "@/components/dashboard/import-wizard";

const COLUMNS = [
  { field: "phone", required: true, help: "Tanzanian number, e.g. +255712345678" },
  { field: "first_name" },
  { field: "last_name" },
  { field: "email" },
  { field: "location" },
  { field: "gender", help: "MALE / FEMALE / UNSPECIFIED" },
  { field: "position" },
  { field: "status", help: "ACTIVE / PROSPECT / LAPSED / INACTIVE" },
  { field: "consent_status", help: "CONSENTED / PENDING / WITHDRAWN" },
  { field: "preferred_channel", help: "SMS / WHATSAPP / EMAIL / PHONE" },
  { field: "tags", help: "Semicolon-separated, e.g. vip;alumni" },
  { field: "notes", help: "Free-text context about this donor" },
];

export default function ImportDonorsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/donors"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Donor Pool
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Import Donors</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV or Excel file to add multiple donors at once
        </p>
      </div>

      <ImportWizard
        dataset="donors"
        columns={COLUMNS}
        description="Each row becomes a donor in your organisation."
      />
    </div>
  );
}
