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

export default function VACreatePostPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<PostMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getMyPages()
      .then(setPages)
      .catch(() => toast.error("Failed to load assigned pages"));
  }, []);

  function resetForm() {
    setSelectedPageId("");
    setMessage("");
    setPhotoUrl(null);
    setPhotoPreview(null);
    setMode("now");
    setScheduledAt("");
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const { url } = await api.uploadPhoto(file);
      setPhotoUrl(url);
      toast.success("Photo uploaded");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setPhotoPreview(null);
      setPhotoUrl(null);
    } finally {
      setUploading(false);
    }
  }

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
      toast.error("Please pick a date and time");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "now") {
        await api.postImmediate({
          page_id: selectedPageId as number,
          message,
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        });
        toast.success("Post published successfully!");
      } else {
        await api.createScheduledPost({
          page_id: selectedPageId as number,
          message,
          scheduled_at: new Date(scheduledAt).toISOString(),
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        });
        toast.success("Post scheduled successfully!");
      }

      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <h1 className="text-2xl font-semibold text-white">Create Post</h1>

      {/* ── Form Card ── */}
      <form
        onSubmit={handleSubmit}
        className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-6 space-y-5"
      >
        {/* ── Page Selector ── */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-sm">Page</Label>
          <select
            value={selectedPageId}
            onChange={(e) =>
              setSelectedPageId(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="w-full rounded-md px-3 py-2 bg-[rgba(30,58,138,0.2)] border border-white/12 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
          >
            <option value="" disabled className="bg-slate-900 text-white/40">
              Select a page...
            </option>
            {pages.map((p) => (
              <option
                key={p.id}
                value={p.id}
                className="bg-slate-900 text-white"
              >
                {p.page_name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Message ── */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-sm">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 resize-none"
          />
        </div>

        {/* ── Photo (optional) ── */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-sm">Photo (optional)</Label>

          <label className="flex items-center gap-2 cursor-pointer w-fit text-sm text-white/60 hover:text-white/80 transition-colors">
            <ImagePlus className="h-4 w-4" />
            <span>{uploading ? "Uploading..." : "Choose image"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {photoPreview && (
            <div className="mt-2">
              <img
                src={photoPreview}
                alt="Preview"
                className="h-32 w-32 object-cover rounded-lg border border-white/10"
              />
            </div>
          )}
        </div>

        {/* ── Post Mode Toggle ── */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-sm">Post Mode</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => setMode("now")}
              className={
                mode === "now"
                  ? "border border-cyan-400/25 bg-cyan-500/20 text-white"
                  : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }
            >
              Post Now
            </Button>
            <Button
              type="button"
              onClick={() => setMode("schedule")}
              className={
                mode === "schedule"
                  ? "border border-cyan-400/25 bg-cyan-500/20 text-white"
                  : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }
            >
              Schedule
            </Button>
          </div>
        </div>

        {/* ── Schedule Date/Time ── */}
        {mode === "schedule" && (
          <div className="space-y-1.5">
            <Label className="text-white/60 text-sm">Schedule Date & Time</Label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-md px-3 py-2 bg-[rgba(30,58,138,0.2)] border border-white/12 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>
        )}

        {/* ── Submit ── */}
        <Button
          type="submit"
          disabled={submitting || uploading}
          className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting..."
            : mode === "now"
              ? "Publish Now"
              : "Schedule Post"}
        </Button>
      </form>
    </div>
  );
}
