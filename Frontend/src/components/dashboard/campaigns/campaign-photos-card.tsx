"use client";

import { useState } from "react";
import { ImageIcon, Loader2, XCircle } from "lucide-react";
import { campaignApi } from "@/lib/dashboard/api";

/**
 * Cover + supporting photos for a campaign. Used on the campaign detail page
 * (supporting photos only) and the edit page (cover replacement too).
 *
 * The cover lives on `campaigns.image_url`; supporting photos are rows in
 * `campaign_images` (is_cover = 0). Both are set through the same
 * `POST /campaigns/:id/images` multipart endpoint — `cover` (1 file) replaces
 * the cover, `gallery` (up to 8) appends supporting photos.
 */
export function CampaignPhotosCard({
  campaignId,
  images,
  coverUrl,
  canManage,
  showCover = false,
  onChanged,
}: {
  campaignId: string | number;
  images: { id: number; url: string }[];
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
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="Campaign photo" className="w-full h-full object-cover" />
              {canManage && (
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove photo"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
