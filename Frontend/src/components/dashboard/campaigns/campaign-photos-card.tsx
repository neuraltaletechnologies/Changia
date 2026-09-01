"use client";

import { useState } from "react";
import { ImageIcon, Loader2, XCircle } from "lucide-react";
import { campaignApi } from "@/lib/dashboard/api";
import { cn } from "@/lib/dashboard/utils";

/**
 * Cover + supporting photos for a campaign. Used on the campaign detail page
 * (supporting photos only) and the edit page (cover replacement too).
 *
 * The cover lives on `campaigns.image_url`; supporting photos are rows in
 * `campaign_images` (is_cover = 0). Both are set through the same
 * `POST /campaigns/:id/images` multipart endpoint — `cover` (1 file) replaces
 * the cover, `gallery` (up to 8) appends supporting photos.
 */
type Photo = { id: number; url: string; pendingChange?: "NONE" | "ADD" | "REMOVE" };

export function CampaignPhotosCard({
  campaignId,
  images,
  coverUrl,
  canManage,
  showCover = false,
  onChanged,
}: {
  campaignId: string | number;
  images: Photo[];
  coverUrl?: string | null;
  canManage: boolean;
  /** When true, render the cover photo with a "replace" control. */
  showCover?: boolean;
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (field: "cover" | "gallery", files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      if (field === "cover") {
        form.append("cover", files[0]);
      } else {
        Array.from(files)
          .slice(0, 8)
          .forEach((f) => form.append("gallery", f));
      }
      await campaignApi.uploadImages(campaignId, form);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload photos.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageId: number) => {
    setError(null);
    try {
      await campaignApi.removeImage(campaignId, imageId);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove photo.");
    }
  };

  const hasPending = images.some(
    (i) => i.pendingChange === "ADD" || i.pendingChange === "REMOVE"
  );

  if (images.length === 0 && !canManage && !showCover) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Photos</h2>
        {canManage && (
          <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Add photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => upload("gallery", e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-destructive mb-3">{error}</p>}
      {hasPending && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          Photo changes are waiting for review — a reviewer and an admin must
          approve them before they show on the public campaign page.
        </p>
      )}

      {showCover && (
        <div className="mb-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Cover photo
          </p>
          <div className="flex items-center gap-3">
            {coverUrl ? (
              <div className="h-20 w-32 shrink-0 rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
              </div>
            )}
            {canManage && (
              <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                <ImageIcon className="w-3.5 h-3.5" />
                {coverUrl ? "Replace cover photo" : "Add cover photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => upload("cover", e.target.files)}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {showCover && (
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Supporting photos
        </p>
      )}
      {images.length === 0 ? (
        <p className="text-xs text-muted-foreground">No supporting photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img) => {
            const pendingAdd = img.pendingChange === "ADD";
            const pendingRemove = img.pendingChange === "REMOVE";
            return (
              <div
                key={img.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt="Campaign photo"
                  className={cn(
                    "w-full h-full object-cover",
                    pendingRemove && "opacity-40"
                  )}
                />
                {(pendingAdd || pendingRemove) && (
                  <span
                    className={cn(
                      "absolute bottom-1 left-1 right-1 text-center text-[9px] font-medium rounded px-1 py-0.5",
                      pendingAdd
                        ? "bg-amber-500/90 text-white"
                        : "bg-rose-500/90 text-white"
                    )}
                  >
                    {pendingAdd ? "Pending review" : "Removal pending"}
                  </span>
                )}
                {canManage && !pendingRemove && (
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={pendingAdd ? "Cancel this photo" : "Remove photo"}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
