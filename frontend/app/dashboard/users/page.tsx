"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import type { Profile, Page } from "@/lib/types";
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

export default function UsersPage() {
  const router = useRouter();

  // Guard: redirect non-admins
  useEffect(() => {
    if (!isAdmin()) {
      router.push("/dashboard");
    }
  }, [router]);

  /* ── state: user list ── */
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── state: add-user dialog ── */
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "va">("va");
  const [addSubmitting, setAddSubmitting] = useState(false);

  /* ── state: assign-pages dialog ── */
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<Profile | null>(null);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [assignedPageIds, setAssignedPageIds] = useState<Set<number>>(
    new Set(),
  );
  const [assignLoading, setAssignLoading] = useState(false);
  const [togglingPageId, setTogglingPageId] = useState<number | null>(null);

  /* ── state: delete-confirm dialog ── */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  /* ── fetch users on mount ── */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.listUsers();
      setUsers(data);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) fetchUsers();
  }, []);

  /* ── add user handler ── */
  const handleAddUser = async () => {
    if (!addEmail.trim() || !addUsername.trim() || !addPassword.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      setAddSubmitting(true);
      await api.createUser({
        email: addEmail.trim(),
        username: addUsername.trim(),
        password: addPassword.trim(),
        role: addRole,
      });
      toast.success("User created successfully");
      resetAddForm();
      setAddOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create user",
      );
    } finally {
      setAddSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setAddEmail("");
    setAddUsername("");
    setAddPassword("");
    setAddRole("va");
  };

  /* ── open assign-pages dialog ── */
  const openAssignDialog = async (user: Profile) => {
    setAssignUser(user);
    setAssignOpen(true);
    setAssignLoading(true);

    try {
      const [pages, userPages] = await Promise.all([
        api.listPages(),
        api.getUserPages(user.id),
      ]);
      setAllPages(pages);
      setAssignedPageIds(new Set(userPages.map((p) => p.id)));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load pages",
      );
      setAssignOpen(false);
    } finally {
      setAssignLoading(false);
    }
  };

  /* ── toggle page access ── */
  const togglePageAccess = async (pageId: number) => {
    if (!assignUser) return;

    setTogglingPageId(pageId);
    const isCurrentlyAssigned = assignedPageIds.has(pageId);

    try {
      if (isCurrentlyAssigned) {
        await api.revokePageAccess(assignUser.id, pageId);
        setAssignedPageIds((prev) => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
        toast.success("Page access revoked");
      } else {
        await api.grantPageAccess(assignUser.id, pageId);
        setAssignedPageIds((prev) => new Set(prev).add(pageId));
        toast.success("Page access granted");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update page access",
      );
    } finally {
      setTogglingPageId(null);
    }
  };

  /* ── delete user handler ── */
  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setDeleteSubmitting(true);
      await api.deleteUser(deleteUser.id);
      toast.success(`User "${deleteUser.username}" deleted`);
      setDeleteOpen(false);
      setDeleteUser(null);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user",
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /* ── format date ── */
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  if (!isAdmin()) return null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <Button
          className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
          onClick={() => {
            resetAddForm();
            setAddOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* ── Users Table ── */}
      {loading ? (
        <div className="animate-pulse text-sm text-white/50">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] p-8 text-center text-sm text-white/50 backdrop-blur-sm">
          No users found. Click &ldquo;Add User&rdquo; to create one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Username</TableHead>
                <TableHead className="text-white/60">Role</TableHead>
                <TableHead className="text-white/60">Created</TableHead>
                <TableHead className="text-right text-white/60">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell className="font-medium text-white">
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs capitalize text-white/80">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-white/60">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="border-white/10 bg-[rgba(30,58,138,0.6)] backdrop-blur-xl"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer text-white/80 hover:text-white focus:bg-white/10 focus:text-white"
                          onClick={() => openAssignDialog(user)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Assign Pages
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
                          onClick={() => {
                            setDeleteUser(user);
                            setDeleteOpen(true);
                          }}
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

      {/* ── ADD USER DIALOG ── */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white/60">Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Username</Label>
              <Input
                placeholder="johndoe"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Password</Label>
              <Input
                type="password"
                placeholder="********"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Role</Label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as "admin" | "va")}
                className="flex h-9 w-full rounded-md border border-white/12 bg-[rgba(30,58,138,0.2)] px-3 py-1 text-sm text-white shadow-sm transition-colors placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50"
              >
                <option value="va" className="bg-[#0f1a3e] text-white">
                  VA (Virtual Assistant)
                </option>
                <option value="admin" className="bg-[#0f1a3e] text-white">
                  Admin
                </option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setAddOpen(false);
                resetAddForm();
              }}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="border border-cyan-400/25 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
              onClick={handleAddUser}
              disabled={addSubmitting}
            >
              {addSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ASSIGN PAGES DIALOG ── */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) {
            setAssignUser(null);
            setAllPages([]);
            setAssignedPageIds(new Set());
          }
        }}
      >
        <DialogContent className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assign Pages
              {assignUser && (
                <span className="ml-2 text-sm font-normal text-white/50">
                  &mdash; {assignUser.username}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[360px] space-y-1 overflow-y-auto py-2">
            {assignLoading ? (
              <div className="animate-pulse py-4 text-center text-sm text-white/50">
                Loading pages...
              </div>
            ) : allPages.length === 0 ? (
              <div className="py-4 text-center text-sm text-white/50">
                No pages available. Add pages in the Pages section first.
              </div>
            ) : (
              allPages.map((page) => {
                const isAssigned = assignedPageIds.has(page.id);
                const isToggling = togglingPageId === page.id;

                return (
                  <label
                    key={page.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      isAssigned
                        ? "bg-cyan-500/10 hover:bg-cyan-500/15"
                        : "hover:bg-white/5"
                    } ${isToggling ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => togglePageAccess(page.id)}
                      disabled={isToggling}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400 accent-cyan-400 focus:ring-cyan-400/30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {page.page_name}
                      </p>
                      <p className="text-xs text-white/40">
                        ID: {page.page_id}
                      </p>
                    </div>
                    {isToggling && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                    )}
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setAssignOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteUser(null);
        }}
      >
        <DialogContent className="border-white/15 bg-[rgba(30,58,138,0.3)] backdrop-blur-[28px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete User</DialogTitle>
          </DialogHeader>

          <p className="py-2 text-sm text-white/70">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">
              {deleteUser?.username}
            </span>
            ? This action cannot be undone.
          </p>

          <DialogFooter>
            <Button
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteUser(null);
              }}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="border border-red-400/25 bg-red-500/20 text-white hover:bg-red-500/30"
              onClick={handleDeleteUser}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
