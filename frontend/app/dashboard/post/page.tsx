"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle, ImagePlus, Link, RotateCw, X, XCircle } from "lucide-react";
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [autoIncrement, setAutoIncrement] = useState(true);

  // ── Inline result card ──
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── AI Image Generation ──
  const [aiMode, setAiMode] = useState<"simple" | "normal" | "niche">("normal");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1); // -1 = original

  // ── Story Theme Generation ──
  const [storyTheme, setStoryTheme] = useState<"ungrateful" | "delusional" | "sympathetic">("ungrateful");
  const [storyGenerating, setStoryGenerating] = useState(false);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);

  // ── Track uploaded/generated images for cleanup on navigate-away ──
  const pendingImagesRef = useRef<string[]>([]);

  useEffect(() => {
    pendingImagesRef.current = [...(photoUrl ? [photoUrl] : []), ...aiImages];
  }, [photoUrl, aiImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((url) =>
        api.deletePhoto(url).catch(() => {}),
      );
    };
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      pendingImagesRef.current.forEach((url) => {
        fetch(`/api/posts/delete-photo?url=${encodeURIComponent(url)}`, {
          method: "DELETE",
          credentials: "include",
          keepalive: true,
        });
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

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

  // ── Photo select handler (deferred upload) ──
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoSource("upload");
    setPendingFile(file);
    setPhotoUrl(undefined);
  }

  // ── Clipboard paste handler (URL extraction + ImgBB fallback) ──
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // 1. Check text/html first — browser-copied images contain <img src="...">
    const htmlItem = Array.from(items).find((i) => i.type === "text/html");
    if (htmlItem) {
      const html = e.clipboardData.getData("text/html");
      if (html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const img = doc.querySelector("img");
        const src = img?.getAttribute("src");
        // Skip temporary/authenticated URLs that won't work when Facebook fetches them
        const blockedHosts = ["generativelanguage.googleapis.com", "lh3.googleusercontent.com"];
        const isBlocked = src && blockedHosts.some((h) => new URL(src).hostname === h);
        if (src && /^https?:\/\/.+/.test(src) && !isBlocked) {
          e.preventDefault();
          setPhotoUrl(src);
          setPhotoPreview(src);
          setPhotoSource("url");
          toast.success("Image URL extracted from clipboard");
          return;
        }
      }
    }

    // 2. Fall back to image blob → deferred upload
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        setPhotoPreview(localUrl);
        setPhotoSource("upload");
        setPendingFile(file);
        setPhotoUrl(undefined);
        toast.info("Image pasted — will upload on submit");
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

  async function handleGenerateAiImage() {
    setAiGenerating(true);
    try {
      let sourceUrl = photoUrl;
      // If image is a local file not yet uploaded, upload first
      if (!sourceUrl && pendingFile) {
        setUploadingPhoto(true);
        try {
          const result = await api.uploadPhoto(pendingFile);
          sourceUrl = result.url;
          setPhotoUrl(sourceUrl);
          setPendingFile(null);
        } finally {
          setUploadingPhoto(false);
        }
      }
      if (!sourceUrl) {
        toast.error("No image available to generate from");
        return;
      }
      const { url } = await api.generateAiImage(sourceUrl, aiMode);
      setAiImages((prev) => [...prev, url]);
      setSelectedImageIndex(aiImages.length); // select the new one
      toast.success("AI image generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error("AI generation failed", { description: msg });
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleGenerateStory() {
    setStoryGenerating(true);
    try {
      let sourceUrl: string | undefined;
      // Use selected AI image if applicable, otherwise use original
      if (aiEnabled && selectedImageIndex >= 0 && aiImages[selectedImageIndex]) {
        sourceUrl = aiImages[selectedImageIndex];
      } else {
        sourceUrl = photoUrl;
        // If image is a local file not yet uploaded, upload first
        if (!sourceUrl && pendingFile) {
          setUploadingPhoto(true);
          try {
            const result = await api.uploadPhoto(pendingFile);
            sourceUrl = result.url;
            setPhotoUrl(sourceUrl);
            setPendingFile(null);
          } finally {
            setUploadingPhoto(false);
          }
        }
      }
      if (!sourceUrl) {
        toast.error("No image available to generate story from");
        return;
      }
      const { story } = await api.generateStory(sourceUrl, storyTheme);
      setStoryPreview(story);
      toast.success("Story generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error("Story generation failed", { description: msg });
    } finally {
      setStoryGenerating(false);
    }
  }

  function acceptStory() {
    if (storyPreview) {
      setMessage(storyPreview);
      setStoryPreview(null);
    }
  }

  function rejectStory() {
    setStoryPreview(null);
  }

  function removePhoto() {
    // Clean up any Supabase-hosted images before clearing state
    const allUrls = [...(photoUrl ? [photoUrl] : []), ...aiImages];
    allUrls.forEach((url) => api.deletePhoto(url).catch(() => {}));

    setPhotoUrl(undefined);
    setPhotoPreview(null);
    setPhotoSource(null);
    setImageUrlInput("");
    setPendingFile(null);
    setAiEnabled(false);
    setAiImages([]);
    setSelectedImageIndex(-1);
    setAiMode("normal");
    setStoryPreview(null);
  }

  // ── Reset form ──
  function resetForm() {
    setMessage("");
    setPhotoUrl(undefined);
    setPhotoPreview(null);
    setPhotoSource(null);
    setImageUrlInput("");
    setPendingFile(null);
    setAiEnabled(false);
    setAiImages([]);
    setSelectedImageIndex(-1);
    setAiMode("normal");
    setStoryPreview(null);
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

    // Block scheduling in the past (must be at least 1 min in the future)
    if (mode === "schedule") {
      const schedDate = new Date(scheduledAt);
      const minDate = new Date(Date.now() + 60_000);
      if (schedDate < minDate) {
        toast.error("Scheduled time must be at least 1 minute in the future");
        return;
      }
    }

    setSubmitting(true);
    setResult(null);
    try {
      // Upload pending file via backend if needed
      let finalPhotoUrl = photoUrl;
      if (pendingFile && !photoUrl) {
        setUploadingPhoto(true);
        try {
          finalPhotoUrl = (await api.uploadPhoto(pendingFile)).url;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          setResult({ success: false, message: `Photo upload failed: ${msg}` });
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Override with selected AI image if applicable
      if (aiEnabled && selectedImageIndex >= 0 && aiImages[selectedImageIndex]) {
        finalPhotoUrl = aiImages[selectedImageIndex];
      }

      if (mode === "now") {
        await api.postImmediate({
          page_id: selectedPageId as number,
          message: message.trim(),
          ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {}),
        });
        setResult({ success: true, message: "Post published successfully!" });
      } else {
        await api.createScheduledPost({
          page_id: selectedPageId as number,
          message: message.trim(),
          scheduled_at: new Date(scheduledAt).toISOString(),
          ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {}),
        });
        setResult({ success: true, message: "Post scheduled successfully!" });
        // Save last scheduled time for auto-increment
        localStorage.setItem("lastScheduledTime", scheduledAt);
      }

      // Delete any uploaded images that weren't used in the post
      const allImages = [...(photoUrl ? [photoUrl] : []), ...aiImages];
      const unchosen = allImages.filter((url) => url !== finalPhotoUrl);
      unchosen.forEach((url) => api.deletePhoto(url).catch(() => {}));

      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setResult({ success: false, message: msg });
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
            onChange={(e) => { setMessage(e.target.value); setResult(null); }}
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

        {/* ── AI Image Generation ── */}
        {photoPreview && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={aiEnabled}
                onClick={() => {
                  const next = !aiEnabled;
                  setAiEnabled(next);
                  if (!next) {
                    setAiImages([]);
                    setSelectedImageIndex(-1);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  aiEnabled ? "bg-cyan-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    aiEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-white/70">AI Image Generation</span>
            </label>

            {aiEnabled && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAiMode("simple")}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      aiMode === "simple"
                        ? "border-cyan-400/25 bg-cyan-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Simple, Borderline
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiMode("normal")}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      aiMode === "normal"
                        ? "border-cyan-400/25 bg-cyan-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiMode("niche")}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      aiMode === "niche"
                        ? "border-cyan-400/25 bg-cyan-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Niche Dog
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateAiImage}
                  disabled={aiGenerating}
                  className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30 disabled:opacity-50"
                  size="sm"
                >
                  {aiGenerating ? (
                    <>
                      <RotateCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : aiImages.length > 0 ? (
                    <>
                      <RotateCw className="mr-2 h-3.5 w-3.5" />
                      Generate Again
                    </>
                  ) : (
                    <>
                      Generate AI Image
                    </>
                  )}
                </Button>

                {aiImages.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {/* Original thumbnail */}
                    <button
                      type="button"
                      onClick={() => setSelectedImageIndex(-1)}
                      className={`relative rounded-lg border-2 transition ${
                        selectedImageIndex === -1
                          ? "border-cyan-400"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Original"
                        className="h-64 w-64 rounded-md object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 rounded-b-md bg-black/60 px-1 py-0.5 text-[10px] text-white text-center">
                        Original
                      </span>
                      {selectedImageIndex === -1 && (
                        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400" />
                      )}
                    </button>

                    {/* AI variant thumbnails */}
                    {aiImages.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative rounded-lg border-2 transition ${
                          selectedImageIndex === idx
                            ? "border-cyan-400"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`AI #${idx + 1}`}
                          className="h-64 w-64 rounded-md object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 rounded-b-md bg-black/60 px-1 py-0.5 text-[10px] text-white text-center">
                          AI #{idx + 1}
                        </span>
                        {selectedImageIndex === idx && (
                          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Story Theme Generation ── */}
        {photoPreview && (
          <div className="space-y-3">
            <Label className="text-white/60 text-sm">Story Theme</Label>
            <div className="flex gap-3">
              {(["ungrateful", "delusional", "sympathetic"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStoryTheme(t)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition capitalize ${
                    storyTheme === t
                      ? "border-cyan-400/25 bg-cyan-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleGenerateStory}
              disabled={storyGenerating}
              className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30 disabled:opacity-50"
              size="sm"
            >
              {storyGenerating ? (
                <>
                  <RotateCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Generating Story...
                </>
              ) : (
                "Generate Story"
              )}
            </Button>

            {storyPreview && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                <p className="text-sm text-white/80 whitespace-pre-wrap">{storyPreview}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={acceptStory}
                    className="border border-green-400/25 bg-green-500/20 text-green-300 hover:bg-green-500/30"
                    size="sm"
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    onClick={rejectStory}
                    className="border border-red-400/25 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    size="sm"
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

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
              onClick={() => {
                setMode("schedule");
                // Auto-fill from last scheduled time + 30 min
                if (autoIncrement) {
                  const last = localStorage.getItem("lastScheduledTime");
                  if (last) {
                    const next = new Date(new Date(last).getTime() + 30 * 60 * 1000);
                    // Format as YYYY-MM-DDTHH:MM for datetime-local input
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const formatted = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
                    setScheduledAt(formatted);
                  }
                }
              }}
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
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-white/60 text-sm">Scheduled Date & Time</Label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={(() => {
                  const d = new Date(Date.now() + 60_000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                })()}
                className="w-full rounded-md border bg-[rgba(30,58,138,0.2)] border-white/12 text-white px-3 py-2 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/25 transition [color-scheme:dark]"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoIncrement}
                onChange={(e) => setAutoIncrement(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-cyan-500"
              />
              <span className="text-xs text-white/50">Auto +30 min from last schedule</span>
            </label>
          </div>
        )}

        {/* ── Submit ── */}
        <Button
          type="submit"
          disabled={submitting || loadingPages || uploadingPhoto || aiGenerating || storyGenerating || pages.length === 0}
          className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {submitting
            ? uploadingPhoto
              ? "Uploading photo..."
              : mode === "now"
                ? "Publishing..."
                : "Scheduling..."
            : mode === "now"
              ? "Publish Post"
              : "Schedule Post"}
        </Button>

        {/* ── Inline result card ── */}
        {result && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              result.success
                ? "bg-green-500/10 border-green-400/25 text-green-300"
                : "bg-red-500/10 border-red-400/25 text-red-300"
            }`}
          >
            {result.success ? (
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <p className="text-sm">{result.message}</p>
          </div>
        )}
      </form>
    </div>
  );
}
