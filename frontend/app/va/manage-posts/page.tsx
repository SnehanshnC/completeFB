"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ScheduledPost, Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Status badge helper ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/25 hover:bg-cyan-500/30">
          pending
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-300 border border-red-400/25 hover:bg-red-500/30">
          failed
        </Badge>
      );
    case "posted":
      return (
        <Badge className="bg-green-500/20 text-green-300 border border-green-400/25 hover:bg-green-500/30">
          posted
        </Badge>
      );
    default:
      return (
        <Badge className="bg-white/10 text-white/60 border border-white/15 hover:bg-white/15">
          {status}
        </Badge>
      );
  }
}

// ── Truncate helper ──────────────────────────────────────────────────
function truncate(text: string, max = 50): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// ── Page component ───────────────────────────────────────────────────
export default function VaManagePostsPage() {
  // ── Data state ──
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filter state ──
  const [search, setSearch] = useState("");
  const [filterPageId, setFilterPageId] = useState<number | "all">("all");

  // ── Edit dialog state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Delete dialog state ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<ScheduledPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Page-name lookup map ──
  const pageNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const p of pages) {
      map[p.id] = p.page_name;
    }
    return map;
  }, [pages]);

  // ── Filtered posts ──
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        search.trim() === "" ||
        post.message.toLowerCase().includes(search.toLowerCase());
      const matchesPage =
        filterPageId === "all" || post.page_id === filterPageId;
      return matchesSearch && matchesPage;
    });
  }, [posts, search, filterPageId]);

  // ── Fetch data on mount ──
  useEffect(() => {
    async function load() {
      try {
        const [postsData, pagesData] = await Promise.all([
          api.getScheduledPosts(),
          api.getMyPages(),
        ]);
        setPosts(postsData);
        setPages(pagesData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load data";
        toast.error("Failed to load posts", { description: msg });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Refresh posts ──
  async function refreshPosts() {
    try {
      const data = await api.getScheduledPosts();
      setPosts(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh";
      toast.error("Failed to refresh posts", { description: msg });
    }
  }

  // ── Edit handlers ──
  function openEdit(post: ScheduledPost) {
    setEditingPost(post);
    setEditMessage(post.message);
    setEditPhotoUrl(post.photo_url ?? "");
    // Convert ISO string to datetime-local format
    const dt = new Date(post.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditScheduledAt(local);
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editingPost) return;

    if (!editMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    if (!editScheduledAt) {
      toast.error("Scheduled date is required");
      return;
    }

    setSaving(true);
    try {
      await api.updateScheduledPost(editingPost.id, {
        message: editMessage.trim(),
        photo_url: editPhotoUrl.trim() || undefined,
        scheduled_at: new Date(editScheduledAt).toISOString(),
      });
      toast.success("Post updated successfully");
      setEditOpen(false);
      setEditingPost(null);
      await refreshPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error("Failed to update post", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete handlers ──
  function openDelete(post: ScheduledPost) {
    setDeletingPost(post);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingPost) return;

    setDeleting(true);
    try {
      await api.deleteScheduledPost(deletingPost.id);
      toast.success("Post deleted successfully");
      setDeleteOpen(false);
      setDeletingPost(null);
      await refreshPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error("Failed to delete post", { description: msg });
    } finally {
      setDeleting(false);
    }
  }

  // ── Requeue handler ──
  async function handleRequeue(post: ScheduledPost) {
    try {
      await api.requeuePost(post.id);
      toast.success("Post requeued successfully");
      await refreshPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Requeue failed";
      toast.error("Failed to requeue post", { description: msg });
    }
  }

  // ── Format date for display ──
  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Manage Posts</h1>
        <p className="mt-1 text-sm text-white/60">
          View and manage your scheduled posts.
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by message..."
              className="pl-9 bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40"
            />
          </div>

          {/* Page dropdown */}
          <select
            value={filterPageId}
            onChange={(e) =>
              setFilterPageId(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="w-full sm:w-56 rounded-md border bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/25 transition"
          >
            <option value="all" className="bg-slate-900 text-white">
              All Pages
            </option>
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
        </div>
      </div>

      {/* ── Posts table ── */}
      {loading ? (
        <div className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-8">
          <div className="animate-pulse text-sm text-white/50 text-center">
            Loading posts...
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-8">
          <p className="text-sm text-white/40 text-center">
            {posts.length === 0
              ? "No scheduled posts yet."
              : "No posts match your filters."}
          </p>
        </div>
      ) : (
        <div className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Message</TableHead>
                  <TableHead className="text-white/60">Page</TableHead>
                  <TableHead className="text-white/60">Scheduled At</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow
                    key={post.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white text-sm max-w-[250px]">
                      {truncate(post.message)}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm">
                      {pageNameMap[post.page_id] ?? `Page #${post.page_id}`}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm whitespace-nowrap">
                      {formatDate(post.scheduled_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[rgba(30,58,138,0.9)] backdrop-blur-[28px] border-white/15"
                        >
                          <DropdownMenuItem
                            onClick={() => openEdit(post)}
                            className="text-white/80 hover:text-white focus:text-white focus:bg-white/10 cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDelete(post)}
                            className="text-red-300 hover:text-red-200 focus:text-red-200 focus:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                          {post.status === "failed" && (
                            <DropdownMenuItem
                              onClick={() => handleRequeue(post)}
                              className="text-cyan-300 hover:text-cyan-200 focus:text-cyan-200 focus:bg-cyan-500/10 cursor-pointer"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Requeue
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Edit Post Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px] border-white/15 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Message */}
            <div className="space-y-2">
              <Label className="text-white/60 text-sm">Message</Label>
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Post message..."
                rows={4}
                className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 resize-none"
              />
            </div>

            {/* Photo URL */}
            <div className="space-y-2">
              <Label className="text-white/60 text-sm">Photo URL</Label>
              <Input
                value={editPhotoUrl}
                onChange={(e) => setEditPhotoUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40"
              />
            </div>

            {/* Scheduled At */}
            <div className="space-y-2">
              <Label className="text-white/60 text-sm">
                Scheduled Date & Time
              </Label>
              <input
                type="datetime-local"
                value={editScheduledAt}
                onChange={(e) => setEditScheduledAt(e.target.value)}
                className="w-full rounded-md border bg-[rgba(30,58,138,0.2)] border-white/12 text-white px-3 py-2 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/25 transition [color-scheme:dark]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={saving}
              className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px] border-white/15 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Post</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-white/70 py-2">
            Are you sure you want to delete this post? This action cannot be
            undone.
          </p>
          {deletingPost && (
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <p className="text-sm text-white/60 line-clamp-2">
                {truncate(deletingPost.message, 100)}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="border border-red-400/25 bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
