"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Page } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface ValidateTokenResponse {
  valid: boolean;
  fb_page_id?: string;
  fb_page_name?: string;
  error?: string;
}

export default function VAMyPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPages() {
      try {
        const data = await api.getMyPages();
        setPages(data);
      } catch {
        toast.error("Failed to load assigned pages.");
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, []);

  async function handleValidateToken(page: Page) {
    setValidatingId(page.id);
    try {
      const result: ValidateTokenResponse = await api.validatePageToken(page.id);
      if (result.valid) {
        toast.success(
          `Token is valid for "${result.fb_page_name ?? page.page_name}" (${result.fb_page_id ?? page.page_id}).`
        );
      } else {
        toast.error(result.error ?? "Token is invalid or expired.");
      }
    } catch {
      toast.error("Failed to validate token. Please try again.");
    } finally {
      setValidatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Pages</h1>
        <p className="mt-1 text-sm text-white/60">
          Facebook pages assigned to you. Contact an admin to update assignments.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <p className="animate-pulse text-sm text-white/50">
          Loading your assigned pages...
        </p>
      )}

      {/* Empty State */}
      {!loading && pages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] px-6 py-16 text-center backdrop-blur-sm">
          <ShieldCheck className="mb-3 h-10 w-10 text-white/30" />
          <p className="text-sm text-white/50">No pages assigned yet.</p>
          <p className="mt-1 text-xs text-white/40">
            Ask your admin to assign pages to your account.
          </p>
        </div>
      )}

      {/* Page Card Grid */}
      {!loading && pages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-[rgba(30,58,138,0.2)] border border-white/10 backdrop-blur-sm rounded-xl p-5 transition-colors hover:border-white/15 hover:bg-[rgba(30,58,138,0.3)]"
            >
              {/* Page Name */}
              <h2 className="text-base font-semibold text-white truncate">
                {page.page_name}
              </h2>

              {/* Meta Info */}
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
                    {new Date(page.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Validate Token Button */}
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
