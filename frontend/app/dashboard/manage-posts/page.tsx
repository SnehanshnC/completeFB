"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import type { ScheduledPost, Page, Profile } from "@/lib/types";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, max = 50): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/25 hover:bg-cyan-500/30">
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-300 border border-red-400/25 hover:bg-red-500/30">
          Failed
        </Badge>
      );
    case "posted":
      return (
        <Badge className="bg-green-500/20 text-green-300 border border-green-400/25 hover:bg-green-500/30">
          Posted
        </Badge>
      );
    default:
      return (
        <Badge className="bg-white/10 text-white/70 border border-white/15">
          {status}
        </Badge>
      );
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ManagePostsPage() {
  const admin = isAdmin();

  // ---- data state ----------------------------------------------------------
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- filter state --------------------------------------------------------
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  // ---- edit dialog state ---------------------------------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // ---- delete dialog state -------------------------------------------------
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePost, setDeletePost] = useState<ScheduledPost | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---- lookup maps ---------------------------------------------------------
  const pageMap = useMemo(() => {
    const m = new Map<number, string>();
    pages.forEach((p) => m.set(p.id, p.page_name));
    return m;
  }, [pages]);

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(u.id, u.username));
    return m;
  }, [users]);

  // ---- filtered posts ------------------------------------------------------
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        search.trim() === "" ||
        post.message.toLowerCase().includes(search.toLowerCase());

      const matchesPage =
        pageFilter === "all" || post.page_id === Number(pageFilter);

      const matchesUser =
        !admin || userFilter === "all" || post.user_id === userFilter;

      return matchesSearch && matchesPage && matchesUser;
    });
  }, [posts, search, pageFilter, userFilter, admin]);

  // ---- data fetching -------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);
    try {
      if (admin) {
        const [postsData, pagesData, usersData] = await Promise.all([
          api.getScheduledPosts(),
          api.listPages(),
          api.listUsers(),
        ]);
        setPosts(postsData);
        setPages(pagesData);
        setUsers(usersData);
      } else {
        const [postsData, pagesData] = await Promise.all([
          api.getScheduledPosts(),
          api.getMyPages(),
        ]);
        setPosts(postsData);
        setPages(pagesData);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---- edit handlers -------------------------------------------------------
  const openEditDialog = (post: ScheduledPost) => {
    setEditPost(post);
    setEditMessage(post.message);
    setEditPhotoUrl(post.photo_url ?? "");
    const dt = new Date(post.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditScheduledAt(local);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editPost) return;
    setEditSaving(true);
    try {
      const updated = await api.updateScheduledPost(editPost.id, {
        message: editMessage,
        photo_url: editPhotoUrl || undefined,
        scheduled_at: new Date(editScheduledAt).toISOString(),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      toast.success("Post updated successfully");
      setEditOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update post";
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  // ---- delete handlers -----------------------------------------------------
  const openDeleteDialog = (post: ScheduledPost) => {
    setDeletePost(post);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletePost) return;
    setDeleteLoading(true);
    try {
      await api.deleteScheduledPost(deletePost.id);
      setPosts((prev) => prev.filter((p) => p.id !== deletePost.id));
      toast.success("Post deleted successfully");
      setDeleteOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete post";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- requeue handler -----------------------------------------------------
  const handleRequeue = async (post: ScheduledPost) => {
    try {
      const updated = await api.requeuePost(post.id);
      setPosts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      toast.success("Post requeued successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to requeue post";
      toast.error(message);
    }
  };

  // ---- render --------------------------------------------------------------
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Manage Posts
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {admin ? "View and manage all scheduled posts." : "View and manage your scheduled posts."}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-20 bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-white/60 text-xs mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Page filter */}
          <div className="min-w-[180px]">
            <Label className="text-white/60 text-xs mb-1 block">Page</Label>
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-md text-sm bg-[rgba(30,58,138,0.2)] border border-white/12 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              <option value="all" className="bg-[rgb(30,58,138)] text-white">
                All Pages
              </option>
              {pages.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-[rgb(30,58,138)] text-white"
                >
                  {p.page_name}
                </option>
              ))}
            </select>
          </div>

          {/* User filter (admin only) */}
          {admin && (
            <div className="min-w-[180px]">
              <Label className="text-white/60 text-xs mb-1 block">User</Label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md text-sm bg-[rgba(30,58,138,0.2)] border border-white/12 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="all" className="bg-[rgb(30,58,138)] text-white">
                  All Users
                </option>
                {users.map((u) => (
                  <option
                    key={u.id}
                    value={u.id}
                    className="bg-[rgb(30,58,138)] text-white"
                  >
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table container */}
      <div className="flex-1 overflow-auto bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="ml-3 text-white/60">Loading posts...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/50">
            <p className="text-lg">No posts found</p>
            <p className="text-sm mt-1">
              {posts.length > 0
                ? "Try adjusting your filters"
                : "No scheduled posts yet"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Message</TableHead>
                <TableHead className="text-white/60">Page</TableHead>
                {admin && (
                  <TableHead className="text-white/60">User</TableHead>
                )}
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
                  <TableCell className="text-white/90 max-w-[250px]">
                    {truncate(post.message)}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {pageMap.get(post.page_id) ?? `Page #${post.page_id}`}
                  </TableCell>
                  {admin && (
                    <TableCell className="text-white/80">
                      {userMap.get(post.user_id) ?? post.user_id}
                    </TableCell>
                  )}
                  <TableCell className="text-white/70 whitespace-nowrap">
                    {formatDateTime(post.scheduled_at)}
                  </TableCell>
                  <TableCell>{statusBadge(post.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[rgba(30,58,138,0.9)] backdrop-blur-[28px] border-white/15"
                      >
                        <DropdownMenuItem
                          onClick={() => openEditDialog(post)}
                          className="text-white/90 focus:bg-white/10 focus:text-white cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(post)}
                          className="text-red-300 focus:bg-red-500/20 focus:text-red-200 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        {post.status === "failed" && (
                          <DropdownMenuItem
                            onClick={() => handleRequeue(post)}
                            className="text-cyan-300 focus:bg-cyan-500/20 focus:text-cyan-200 cursor-pointer"
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
        )}
      </div>

      {/* ── Edit Post Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px] border-white/15 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/70">Message</Label>
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={4}
                className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Photo URL</Label>
              <Input
                value={editPhotoUrl}
                onChange={(e) => setEditPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Scheduled At</Label>
              <Input
                type="datetime-local"
                value={editScheduledAt}
                onChange={(e) => setEditScheduledAt(e.target.value)}
                className="bg-[rgba(30,58,138,0.2)] border-white/12 text-white placeholder:text-white/40 [color-scheme:dark]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving || !editMessage.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {editSaving ? "Saving..." : "Save Changes"}
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

          <p className="text-white/70 py-2">
            Are you sure you want to delete this scheduled post? This action
            cannot be undone.
          </p>

          {deletePost && (
            <div className="rounded-lg bg-white/5 p-3 text-sm text-white/60 border border-white/10">
              {truncate(deletePost.message, 100)}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
