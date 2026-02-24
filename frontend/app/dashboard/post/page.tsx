"use client";

import { useEffect, useState, useCallback } from "react";
import { ImagePlus, Link, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import type { Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type PostMode = "now" | "schedule";
type PhotoSource = "upload" | "url" | null;

export default function CreatePostPage() {
  const admin = isAdmin();

  // ── Pages ──
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  // ── Form fields ──
  const [selectedPageId, setSelectedPageId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<PhotoSource>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [mode, setMode] = useState<PostMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch pages on mount ──
  useEffect(() => {
    const fetchPages = admin ? api.listPages() : api.getMyPages();
    fetchPages
      .then((data) => {
        setPages(data);
        if (admin && data.length > 0) setSelectedPageId(data[0].id);
      })
      .catch((err) => {
        toast.error("Failed to load pages", { description: String(err.message) });
      })
      .finally(() => setLoadingPages(false));
  }, [admin]);

  // ── Photo upload handler ──
  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoSource("upload");

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
      setPhotoSource(null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ── Clipboard paste handler ──
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        setPhotoPreview(localUrl);
        setPhotoSource("upload");

        setUploadingPhoto(true);
        toast.info("Image pasted and uploading...");
        try {
          const { url } = await api.uploadPhoto(file);
          setPhotoUrl(url);
          toast.success("Pasted image uploaded");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          toast.error("Paste upload failed", { description: msg });
          setPhotoPreview(null);
          setPhotoUrl(undefined);
          setPhotoSource(null);
        } finally {
          setUploadingPhoto(false);
        }
        return;
      }
    }
  }, []);

  // ── Image URL handler ──
  function handleImageUrl() {
    const url = imageUrlInput.trim();
    if (!url) {
      toast.error("Please enter an image URL");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setPhotoUrl(url);
    setPhotoPreview(url);
    setPhotoSource("url");
    setImageUrlInput("");
    toast.success("Image URL set");
  }

  function removePhoto() {
    setPhotoUrl(undefined);
    setPhotoPreview(null);
    setPhotoSource(null);
    setImageUrlInput("");
  }

  // ── Reset form ──
  function resetForm() {
    setMessage("");
    setPhotoUrl(undefined);
    setPhotoPreview(null);
    setPhotoSource(null);
    setImageUrlInput("");
    setMode("now");
    setScheduledAt("");
    if (admin && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    } else {
      setSelectedPageId("");
    }
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
        onPaste={handlePaste}
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
              No pages available. {admin ? "Please add a page first." : "Ask an admin to assign pages to you."}
            </p>
          ) : (
            <select
              value={selectedPageId}
              onChange={(e) =>
                setSelectedPageId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full rounded-md border bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/25 transition"
            >
              {!admin && (
                <option value="" disabled className="bg-slate-900 text-white/40">
                  Select a page...
                </option>
              )}
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
        <div className="space-y-3">
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
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* File upload button */}
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/5 px-4 text-sm text-white/60 transition hover:border-white/25 hover:text-white/80">
                  <ImagePlus className="h-4 w-4" />
                  <span>Upload file</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>

                {/* URL input */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Paste image URL..."
                      className="pl-9 bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleImageUrl();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleImageUrl}
                    disabled={!imageUrlInput.trim()}
                    className="border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    size="sm"
                  >
                    Set
                  </Button>
                </div>
              </div>
              <p className="text-xs text-white/40">
                You can also paste an image from your clipboard anywhere on this form.
              </p>
            </div>
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
