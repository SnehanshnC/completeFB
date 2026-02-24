"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type PostMode = "now" | "schedule";

export default function AdminCreatePostPage() {
  // ── Pages ──
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  // ── Form fields ──
  const [selectedPageId, setSelectedPageId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mode, setMode] = useState<PostMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch pages on mount ──
  useEffect(() => {
    api
      .listPages()
      .then((data) => {
        setPages(data);
        if (data.length > 0) setSelectedPageId(data[0].id);
      })
      .catch((err) => {
        toast.error("Failed to load pages", { description: String(err.message) });
      })
      .finally(() => setLoadingPages(false));
  }, []);

  // ── Photo upload handler ──
  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    setUploadingPhoto(true);
    try {
      const { url } = await api.uploadPhoto(file);
      setPhotoUrl(url);
      toast.success("Photo uploaded");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("Photo upload failed", { description: msg });
      setPhotoPreview(null);
      setPhotoUrl(undefined);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto() {
    setPhotoUrl(undefined);
    setPhotoPreview(null);
  }

  // ── Reset form ──
  function resetForm() {
    setMessage("");
    setPhotoUrl(undefined);
    setPhotoPreview(null);
    setMode("now");
    setScheduledAt("");
    if (pages.length > 0) setSelectedPageId(pages[0].id);
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedPageId === "") {
      toast.error("Please select a page");
      return;
    }
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      toast.error("Please choose a date & time for scheduling");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "now") {
        await api.postImmediate({
          page_id: selectedPageId as number,
          message: message.trim(),
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        });
        toast.success("Post published successfully!");
      } else {
        await api.createScheduledPost({
          page_id: selectedPageId as number,
          message: message.trim(),
          scheduled_at: new Date(scheduledAt).toISOString(),
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        });
        toast.success("Post scheduled successfully!");
      }
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to create post", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Create Post</h1>
        <p className="mt-1 text-sm text-white/60">
          Publish or schedule a post to one of your Facebook pages.
        </p>
      </div>

      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-6 space-y-6"
      >
        {/* ── Page selector ── */}
        <div className="space-y-2">
          <Label className="text-white/60 text-sm">Page</Label>
          {loadingPages ? (
            <div className="animate-pulse text-sm text-white/50">
              Loading pages...
            </div>
          ) : pages.length === 0 ? (
            <p className="text-sm text-white/40">
              No pages available. Please add a page first.
            </p>
          ) : (
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(Number(e.target.value))}
              className="w-full rounded-md border bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/25 transition"
            >
              {pages.map((page) => (
                <option
                  key={page.id}
                  value={page.id}
                  className="bg-slate-900 text-white"
                >
                  {page.page_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Message ── */}
        <div className="space-y-2">
          <Label className="text-white/60 text-sm">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What would you like to post?"
            rows={5}
            className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 resize-none"
          />
        </div>

        {/* ── Photo (optional) ── */}
        <div className="space-y-2">
          <Label className="text-white/60 text-sm">Photo (optional)</Label>

          {photoPreview ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Preview"
                className="h-32 w-32 rounded-lg border border-white/10 object-cover"
              />
              {uploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <span className="text-xs text-white/80 animate-pulse">
                    Uploading...
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploadingPhoto}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-xs text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                x
              </button>
            </div>
          ) : (
            <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 text-white/40 transition hover:border-white/20 hover:text-white/60">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Add photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* ── Post mode toggle ── */}
        <div className="space-y-2">
          <Label className="text-white/60 text-sm">Post Mode</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("now")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                mode === "now"
                  ? "border-cyan-400/25 bg-cyan-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Post Now
            </button>
            <button
              type="button"
              onClick={() => setMode("schedule")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                mode === "schedule"
                  ? "border-cyan-400/25 bg-cyan-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Schedule
            </button>
          </div>
        </div>

        {/* ── Schedule datetime (conditional) ── */}
        {mode === "schedule" && (
          <div className="space-y-2">
            <Label className="text-white/60 text-sm">Scheduled Date & Time</Label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-md border bg-[rgba(30,58,138,0.2)] border-white/12 text-white px-3 py-2 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/25 transition [color-scheme:dark]"
            />
          </div>
        )}

        {/* ── Submit ── */}
        <Button
          type="submit"
          disabled={submitting || loadingPages || uploadingPhoto || pages.length === 0}
          className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {submitting
            ? mode === "now"
              ? "Publishing..."
              : "Scheduling..."
            : mode === "now"
              ? "Publish Post"
              : "Schedule Post"}
        </Button>
      </form>
    </div>
  );
}
