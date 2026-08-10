"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Progress } from "@/components/dashboard/ui/progress";
import { cn } from "@/lib/dashboard/utils";

type Stage = "upload" | "preview" | "result";

const SAMPLE_ROWS = [
  {
    name: "Alice Mbeki",
    email: "alice@example.com",
    phone: "+255 711 000 001",
    location: "Dar es Salaam",
    status: "✓",
  },
  {
    name: "Boniface Lema",
    email: "boniface@example.com",
    phone: "+255 711 000 002",
    location: "Mwanza",
    status: "✓",
  },
  {
    name: "Clara Moshi",
    email: "clara@example.com",
    phone: "+255 711 000 003",
    location: "Arusha",
    status: "✓",
  },
  {
    name: "David Nkomo",
    email: "INVALID_EMAIL",
    phone: "+255 711 000 004",
    location: "Dodoma",
    status: "error",
  },
  {
    name: "Esther Wanjiku",
    email: "esther@example.com",
    phone: "+255 711 000 005",
    location: "Moshi",
    status: "✓",
  },
];

export default function ImportDonorsPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setStage("preview");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const simulateImport = () => {
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setStage("result");
      }
    }, 300);
  };

  return (
    <div className="space-y-6 max-w-[700px]">
      {/* Back */}
      <Link
        href="/dashboard/donors"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Donor Pool
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Import Donors
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV file to add multiple donors at once
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {(["upload", "preview", "result"] as Stage[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                stage === s
                  ? "bg-primary text-white"
                  : i <
                      ["upload", "preview", "result"].indexOf(stage)
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-muted-foreground"
              )}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {i + 1}
              </span>
              <span className="capitalize">{s}</span>
            </div>
            {i < 2 && (
              <div className="w-8 h-px bg-border mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Upload stage */}
      {stage === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/40"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse &mdash; CSV up to 10MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Template download */}
          <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Download the CSV template
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Use our template to ensure your data is formatted correctly.
                  Required fields: first_name, last_name, email.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          {/* Field guide */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">
              Supported CSV columns
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { field: "first_name", req: true },
                { field: "last_name", req: true },
                { field: "email", req: true },
                { field: "phone", req: false },
                { field: "location", req: false },
                { field: "status", req: false },
                { field: "consent_status", req: false },
                { field: "preferred_channel", req: false },
                { field: "tags", req: false },
              ].map(({ field, req }) => (
                <div key={field} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      req ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                  <code className="text-[11px] text-foreground">{field}</code>
                  {req && (
                    <span className="text-[9px] text-primary font-medium">
                      required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview stage */}
      {stage === "preview" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {fileName || "donors_import.csv"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                5 records detected &mdash; 4 valid, 1 with errors
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setStage("upload")}
            >
              Change
            </Button>
          </div>

          {/* Validation warning */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              1 row has validation errors and will be skipped. Review below
              before importing.
            </p>
          </div>

          {/* Preview table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Location
                  </th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SAMPLE_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors",
                      row.status === "error"
                        ? "bg-rose-50/40"
                        : "hover:bg-muted/20"
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {row.email}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                      {row.location}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.status === "✓" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <XCircle className="w-4 h-4 text-rose-500" />
                          <span className="text-[10px] text-rose-600">
                            Invalid email
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {progress > 0 && progress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importing…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStage("upload")}
            >
              Back
            </Button>
            <Button size="sm" onClick={simulateImport}>
              Import 4 Valid Records
            </Button>
          </div>
        </div>
      )}

      {/* Result stage */}
      {stage === "result" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Import Complete
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              4 donor records were successfully imported. 1 record was skipped
              due to validation errors.
            </p>

            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">4</p>
                <p className="text-xs text-emerald-600">Imported</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">1</p>
                <p className="text-xs text-rose-500">Skipped</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStage("upload");
                setProgress(0);
                setFileName("");
              }}
            >
              Import Another File
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/donors">View Donor Pool</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
