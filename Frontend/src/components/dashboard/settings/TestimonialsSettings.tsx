"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { Switch } from "@/components/dashboard/ui/switch";
import { ApiClientError } from "@/lib/api-client";
import { testimonialsApi, type Testimonial } from "@/lib/dashboard/api";

/**
 * Settings › Testimonials — SUPER_ADMIN edits the "What Campaign Owners Say"
 * quote cards shown on the public /campaigns page. Add / edit / remove / reorder
 * and set each portrait. Swahili (/sw/campaigns) is machine-translated on save,
 * so there is no Swahili field here.
 */

type Draft = {
  key: string;
  id: number | null;
  quote: string;
  author: string;
  role: string;
  isActive: boolean;
  photoUrl: string | null;
  saving: boolean;
  error: string | null;
};

let tmpSeq = 0;

function toDraft(t: Testimonial): Draft {
  return {
    key: `t${t.id}`,
    id: t.id,
    quote: t.quote,
    author: t.author,
    role: t.role,
    isActive: t.isActive,
    photoUrl: t.photoUrl,
    saving: false,
    error: null,
  };
}

function blankDraft(): Draft {
  tmpSeq += 1;
  return {
    key: `new-${tmpSeq}`,
    id: null,
    quote: "",
    author: "",
    role: "",
    isActive: true,
    photoUrl: null,
    saving: false,
    error: null,
  };
}

export default function TestimonialsSettings() {
  const [rows, setRows] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    testimonialsApi
      .list()
      .then((list) => setRows(list.map(toDraft)))
      .catch(() => setLoadError("Failed to load testimonials."))
      .finally(() => setLoading(false));
  }, []);

  const patch = (key: string, next: Partial<Draft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));

  const validate = (r: Draft): string | null => {
    if (r.quote.trim().length < 10) return "The quote needs at least 10 characters.";
    if (r.author.trim().length < 2) return "Add a name.";
    if (r.role.trim().length < 2) return "Add a position / role.";
    return null;
  };

  const save = async (r: Draft) => {
    const err = validate(r);
    if (err) {
      patch(r.key, { error: err });
      return;
    }
    patch(r.key, { saving: true, error: null });
    try {
      const body = {
        quote: r.quote.trim(),
        author: r.author.trim(),
        role: r.role.trim(),
        isActive: r.isActive,
      };
      const saved = r.id
        ? await testimonialsApi.update(r.id, body)
        : await testimonialsApi.create(body);
      setRows((rs) => rs.map((x) => (x.key === r.key ? { ...toDraft(saved), key: r.key } : x)));
    } catch (e) {
      patch(r.key, {
        saving: false,
        error: e instanceof ApiClientError ? e.message : "Failed to save.",
      });
    }
  };

  const remove = async (r: Draft) => {
    if (!r.id) {
      setRows((rs) => rs.filter((x) => x.key !== r.key));
      return;
    }
    if (!window.confirm(`Remove the testimonial from ${r.author}?`)) return;
    patch(r.key, { saving: true, error: null });
    try {
      await testimonialsApi.remove(r.id);
      setRows((rs) => rs.filter((x) => x.key !== r.key));
    } catch (e) {
      patch(r.key, {
        saving: false,
        error: e instanceof ApiClientError ? e.message : "Failed to remove.",
      });
    }
  };

  const uploadPhoto = async (r: Draft, file: File) => {
    if (!r.id) return;
    patch(r.key, { saving: true, error: null });
    try {
      const saved = await testimonialsApi.uploadPhoto(r.id, file);
      patch(r.key, { photoUrl: saved.photoUrl, saving: false });
    } catch (e) {
      patch(r.key, {
        saving: false,
        error: e instanceof ApiClientError ? e.message : "Failed to upload photo.",
      });
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);

    const ids = next.filter((r) => r.id).map((r) => r.id as number);
    if (ids.length < 2) return;
    setReordering(true);
    try {
      const persisted = await testimonialsApi.reorder(ids);
      // Re-sync from server order, keeping any unsaved new rows at the end.
      setRows((rs) => [
        ...persisted.map((t) => {
          const existing = rs.find((r) => r.id === t.id);
          return existing ? { ...existing, ...toDraft(t), key: existing.key } : toDraft(t);
        }),
        ...rs.filter((r) => !r.id),
      ]);
    } catch {
      /* leave the optimistic order; a reload will correct it */
    } finally {
      setReordering(false);
    }
  };

  if (loading) return <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />;
  if (loadError)
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {loadError}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        These cards appear in the{" "}
        <span className="font-medium text-foreground">&ldquo;What Campaign Owners Say&rdquo;</span>{" "}
        section of the public Campaigns page. The Swahili page shows an automatic
        translation of whatever you enter here. Only active cards are shown publicly.
      </div>

      {rows.map((r, i) => (
        <div
          key={r.key}
          className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.photoUrl}
                    alt={r.author || "Portrait"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                    No photo
                  </span>
                )}
              </div>
              <div>
                <input
                  ref={(el) => {
                    fileInputs.current[r.key] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(r, file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!r.id || r.saving}
                  onClick={() => fileInputs.current[r.key]?.click()}
                >
                  <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                  {r.photoUrl ? "Change photo" : "Add photo"}
                </Button>
                {!r.id && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Save the card first, then add a photo.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={i === 0 || reordering}
                onClick={() => move(i, -1)}
                aria-label="Move up"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={i === rows.length - 1 || reordering}
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                disabled={r.saving}
                onClick={() => remove(r)}
                aria-label="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quote</Label>
            <Textarea
              value={r.quote}
              onChange={(e) => patch(r.key, { quote: e.target.value })}
              rows={3}
              maxLength={1000}
              className="text-sm resize-none"
              placeholder="What this campaign owner says about Changia…"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={r.author}
                onChange={(e) => patch(r.key, { author: e.target.value })}
                maxLength={150}
                className="h-9 text-sm"
                placeholder="e.g. Dr. Msuya"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Position</Label>
              <Input
                value={r.role}
                onChange={(e) => patch(r.key, { role: e.target.value })}
                maxLength={200}
                className="h-9 text-sm"
                placeholder="e.g. Organization Administrator"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={r.isActive}
                onCheckedChange={(v) => patch(r.key, { isActive: v })}
              />
              Shown on the public page
            </label>
            <div className="flex items-center gap-3">
              {r.error && <span className="text-xs text-destructive">{r.error}</span>}
              <Button size="sm" disabled={r.saving} onClick={() => save(r)}>
                {r.saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {r.id ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((rs) => [...rs, blankDraft()])}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add testimonial
      </Button>
    </div>
  );
}
