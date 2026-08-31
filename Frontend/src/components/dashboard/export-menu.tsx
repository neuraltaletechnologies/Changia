"use client";

import { useState } from "react";
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  downloadDataset,
  type DataDataset,
  type ExportFormat,
} from "@/lib/dashboard/data-transfer";
import {
  emitActionError,
  emitActionStart,
  emitActionSuccess,
  nextActionId,
} from "@/lib/dashboard/action-feed";

interface ExportMenuProps {
  dataset: DataDataset;
  /** Filters to forward to the backend so the file matches the on-screen view. */
  params?: Record<string, string | number | boolean | undefined | null>;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "default";
}

/**
 * Dropdown "Export" button offering CSV and Excel (.xlsx). Streams the current
 * filtered dataset from `/api/v1/data/:dataset/export` and hands the browser a
 * download. Progress/errors surface through the shared dashboard action feed.
 */
export function ExportMenu({
  dataset,
  params = {},
  disabled,
  label = "Export",
  size = "sm",
}: ExportMenuProps) {
  const [busy, setBusy] = useState(false);

  const run = async (format: ExportFormat) => {
    setBusy(true);
    const id = nextActionId();
    const path = `/data/${dataset}/export?format=${format}`;
    emitActionStart(id, "GET", path);
    try {
      await downloadDataset(dataset, params, format);
      emitActionSuccess(id, "GET", path);
    } catch (e) {
      emitActionError(
        id,
        "GET",
        path,
        e instanceof Error ? e.message : "Export failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size={size} disabled={disabled || busy} />}
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 mr-1.5" />
        )}
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={() => run("csv")}>
          <FileText className="w-3.5 h-3.5" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
