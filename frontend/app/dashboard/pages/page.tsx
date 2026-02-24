"use client";

import { useEffect, useState } from "react";
import { Plus, MoreHorizontal, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import type { Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function PagesPage() {
  const admin = isAdmin();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Page dialog state (admin only)
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newPageId, setNewPageId] = useState("");
  const [newPageName, setNewPageName] = useState("");
  const [newAccessToken, setNewAccessToken] = useState("");

  // Update Token dialog state (admin only)
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Page | null>(null);
  const [updatedToken, setUpdatedToken] = useState("");

  // Delete confirm dialog state (admin only)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  // Validate loading state (VA)
  const [validatingId, setValidatingId] = useState<number | null>(null);

  // ── Fetch pages ──
  const fetchPages = async () => {
    try {
      const data = admin ? await api.listPages() : await api.getMyPages();
      setPages(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load pages";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  // ── Add Page (admin) ──
  const resetAddForm = () => {
    setNewPageId("");
    setNewPageName("");
    setNewAccessToken("");
  };

  const handleAddPage = async () => {
    if (!newPageId.trim() || !newPageName.trim() || !newAccessToken.trim()) {
      toast.error("All fields are required");
      return;
    }

    setAddLoading(true);
    try {
      await api.createPage({
        page_id: newPageId.trim(),
        page_name: newPageName.trim(),
        access_token: newAccessToken.trim(),
      });
      toast.success("Page added successfully");
      resetAddForm();
      setAddOpen(false);
      await fetchPages();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add page";
      toast.error(message);
    } finally {
      setAddLoading(false);
    }
  };

  // ── Update Token (admin) ──
  const openUpdateDialog = (page: Page) => {
    setUpdateTarget(page);
    setUpdatedToken("");
    setUpdateOpen(true);
  };

  const handleUpdateToken = async () => {
    if (!updateTarget || !updatedToken.trim()) {
      toast.error("Access token is required");
      return;
    }

    setUpdateLoading(true);
    try {
      await api.updatePageToken(updateTarget.id, updatedToken.trim());
      toast.success(`Token updated for "${updateTarget.page_name}"`);
      setUpdatedToken("");
      setUpdateOpen(false);
      setUpdateTarget(null);
      await fetchPages();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update token";
      toast.error(message);
    } finally {
      setUpdateLoading(false);
    }
  };

  // ── Validate Token ──
  const handleValidateToken = async (page: Page) => {
    setValidatingId(page.id);
    try {
      const result = await api.validatePageToken(page.id);
      if (result.valid) {
        toast.success(
          `Token is valid for "${result.fb_page_name ?? page.page_name}" (${result.fb_page_id ?? page.page_id})`
        );
      } else {
        toast.error(result.error ?? "Token is invalid");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to validate token";
      toast.error(message);
    } finally {
      setValidatingId(null);
    }
  };

  // ── Delete Page (admin) ──
  const openDeleteDialog = (page: Page) => {
    setDeleteTarget(page);
    setDeleteOpen(true);
  };

  const handleDeletePage = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      await api.deletePage(deleteTarget.id);
      toast.success(`"${deleteTarget.page_name}" deleted`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchPages();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete page";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Format date helper ──
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── VA card view ──
  if (!admin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Pages</h1>
          <p className="mt-1 text-sm text-white/60">
            Facebook pages assigned to you. Contact an admin to update assignments.
          </p>
        </div>

        {loading && (
          <p className="animate-pulse text-sm text-white/50">
            Loading your assigned pages...
          </p>
        )}

        {!loading && pages.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] px-6 py-16 text-center backdrop-blur-sm">
            <ShieldCheck className="mb-3 h-10 w-10 text-white/30" />
            <p className="text-sm text-white/50">No pages assigned yet.</p>
            <p className="mt-1 text-xs text-white/40">
              Ask your admin to assign pages to your account.
            </p>
          </div>
        )}

        {!loading && pages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-5 transition-colors hover:border-white/15 hover:bg-[rgba(30,58,138,0.3)]"
              >
                <h2 className="text-base font-semibold text-white truncate">
                  {page.page_name}
                </h2>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Facebook Page ID</span>
                    <span className="font-mono text-xs text-white/80">
                      {page.page_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Created</span>
                    <span className="text-xs text-white/80">
                      {formatDate(page.created_at)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={validatingId === page.id}
                    onClick={() => handleValidateToken(page)}
                    className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    {validatingId === page.id ? "Validating..." : "Validate Token"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Admin table view ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pages</h1>
          <p className="mt-1 text-sm text-white/60">
            Manage your connected Facebook pages.
          </p>
        </div>
        <Button
          onClick={() => {
            resetAddForm();
            setAddOpen(true);
          }}
          className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Page
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse text-sm text-white/50">Loading pages...</div>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] p-8 text-center text-sm text-white/50 backdrop-blur-sm">
          No pages found. Click &quot;Add Page&quot; to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Page Name</TableHead>
                <TableHead className="text-white/60">Facebook Page ID</TableHead>
                <TableHead className="text-white/60">Created</TableHead>
                <TableHead className="text-right text-white/60">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow
                  key={page.id}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell className="font-medium text-white">
                    {page.page_name}
                  </TableCell>
                  <TableCell className="text-white/80 font-mono text-sm">
                    {page.page_id}
                  </TableCell>
                  <TableCell className="text-white/60">
                    {formatDate(page.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px]"
                      >
                        <DropdownMenuItem
                          onClick={() => openUpdateDialog(page)}
                          className="text-white/80 focus:bg-white/10 focus:text-white"
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Update Token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleValidateToken(page)}
                          className="text-white/80 focus:bg-white/10 focus:text-white"
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Validate Token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(page)}
                          className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Add Page Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white/60">Facebook Page ID</Label>
              <Input
                value={newPageId}
                onChange={(e) => setNewPageId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60">Page Name</Label>
              <Input
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. My Business Page"
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60">Access Token</Label>
              <Input
                value={newAccessToken}
                onChange={(e) => setNewAccessToken(e.target.value)}
                placeholder="Page access token"
                type="password"
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              className="text-white/60 hover:bg-white/10 hover:text-white"
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPage}
              disabled={addLoading}
              className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
            >
              {addLoading ? "Adding..." : "Add Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Token Dialog ── */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Update Token{updateTarget ? ` \u2014 ${updateTarget.page_name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white/60">New Access Token</Label>
              <Input
                value={updatedToken}
                onChange={(e) => setUpdatedToken(e.target.value)}
                placeholder="Paste new access token"
                type="password"
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setUpdateOpen(false)}
              className="text-white/60 hover:bg-white/10 hover:text-white"
              disabled={updateLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateToken}
              disabled={updateLoading}
              className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
            >
              {updateLoading ? "Updating..." : "Update Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Page</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-white/70">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">
              {deleteTarget?.page_name}
            </span>
            ? This action cannot be undone.
          </p>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="text-white/60 hover:bg-white/10 hover:text-white"
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeletePage}
              disabled={deleteLoading}
              className="border border-red-400/25 bg-red-500/20 text-white hover:bg-red-500/30"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
