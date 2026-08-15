"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { Button } from "@/components/dashboard/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { poolApi, type PoolCategory } from "@/lib/dashboard/api";
import { useRole } from "@/hooks/use-role";

export default function NewPoolPage() {
  const router = useRouter();
  const { user } = useRole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PoolCategory>("FAMILY");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { name?: string } = {};
    if (name.trim().length < 2) next.name = "Pool name is required (min 2 characters).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const created = await poolApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        createdBy: createdBy ? Number(createdBy) : undefined,
      });
      router.push(`/dashboard/pools/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the pool.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[720px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Create a Donor Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Group donors (family, school or student) so you can import them into
            campaigns and track who has paid.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/pools" />}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Pool details</p>
            <p className="text-xs text-muted-foreground">
              Pools you create are only visible to you (and admins).
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pool-name">Pool name</Label>
            <Input
              id="pool-name"
              placeholder="e.g. Msuya Family Members"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              className="h-9"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory((v ?? "FAMILY") as PoolCategory)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FAMILY">Family</SelectItem>
                  <SelectItem value="SCHOOL">School</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pool-desc">Description</Label>
            <Textarea
              id="pool-desc"
              placeholder="Who is in this pool and why…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          {user && (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN") && (
            <div className="grid gap-1.5">
              <Label htmlFor="pool-owner">
                Owner (optional — create on behalf of a manager)
              </Label>
              <Input
                id="pool-owner"
                type="number"
                placeholder="Manager user ID"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty to own this pool yourself. Enter a campaign manager's
                user ID to create it inside their workspace.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/pools")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create Pool"}
          </Button>
        </div>
      </form>
    </div>
  );
}