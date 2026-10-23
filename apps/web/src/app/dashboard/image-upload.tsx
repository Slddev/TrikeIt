"use client";

import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";

const MAX_SIDE = 1600;

/** Scales a photo down to MAX_SIDE and re-encodes it as WebP, so phone photos upload fast and stay small. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  return blob ?? file;
}

/**
 * A photo picker that uploads to Vercel Blob and submits the resulting URL with the form as `name`.
 * `folder` is the store's upload folder; the server only issues tokens for it.
 */
export function ImageUpload({
  name,
  label,
  folder,
  defaultValue = "",
  shape = "square",
}: {
  name: string;
  label: string;
  folder: string;
  defaultValue?: string;
  shape?: "square" | "wide";
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPEG, PNG or WebP).");
    setUploading(true);
    try {
      const body = await shrink(file);
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 40) || "photo";
      const blob = await upload(`${folder}${base}.${body.type === "image/webp" ? "webp" : file.name.split(".").pop()}`, body, {
        access: "public",
        handleUploadUrl: "/api/uploads",
        contentType: body.type || file.type,
      });
      setUrl(blob.url);
    } catch (e) {
      setError((e as Error).message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  const box = shape === "wide" ? "aspect-[16/7] w-full" : "size-24";

  return (
    <div className="flex flex-col gap-1 text-xs font-medium">
      {label}
      <input type="hidden" name={name} value={url} />
      <div className={`flex gap-3 ${shape === "wide" ? "flex-col" : "items-center"}`}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          aria-label={url ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          className={`${box} relative shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-brand-navy/25 bg-brand-cream hover:border-brand-navy disabled:opacity-60`}
        >
          {url ? (
            // Shown as-is: older items may still link to photos on other sites.
            <Image src={url} alt="" fill unoptimized sizes="400px" className="object-cover" />
          ) : (
            <span className="text-sm font-normal text-brand-navy/60">{uploading ? "Uploading…" : "+ Add photo"}</span>
          )}
          {uploading && url && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm">Uploading…</span>
          )}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="h-9 rounded-lg border-2 border-brand-navy px-3 text-sm font-semibold disabled:opacity-40"
          >
            {url ? "Change" : "Upload"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              disabled={uploading}
              className="h-9 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {error && <p className="font-normal text-red-700">{error}</p>}
    </div>
  );
}
