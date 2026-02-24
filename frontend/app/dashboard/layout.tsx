"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, Send, ClipboardList } from "lucide-react";
import AuroraBackground from "@/components/aurora-bg";
import DashboardShell from "@/components/dashboard-shell";
import Sidebar, { type NavItem } from "@/components/sidebar";
import { toast } from "sonner";
import { getStoredRole, isAdmin, clearAuth, getExpiry } from "@/lib/auth";

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pages", href: "/dashboard/pages", icon: FileText },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Post", href: "/dashboard/post", icon: Send },
  { label: "Manage Posts", href: "/dashboard/manage-posts", icon: ClipboardList },
];

const vaNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Pages", href: "/dashboard/pages", icon: FileText },
  { label: "Post", href: "/dashboard/post", icon: Send },
  { label: "Manage Posts", href: "/dashboard/manage-posts", icon: ClipboardList },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    if (!role) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    const expiry = getExpiry();
    if (!expiry) return;

    const checkSession = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        clearAuth();
        toast.error("Session expired — please log in again");
        router.push("/login");
      } else if (remaining <= 5 * 60 * 1000 && remaining > 4.5 * 60 * 1000) {
        toast.warning("Your session expires in ~5 minutes");
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  if (!authorized) return null;

  const navItems = isAdmin() ? adminNav : vaNav;

  return (
    <AuroraBackground>
      <DashboardShell sidebar={(collapsed, onToggle) => (
        <Sidebar items={navItems} collapsed={collapsed} onToggleCollapse={onToggle} />
      )}>
        {children}
      </DashboardShell>
    </AuroraBackground>
  );
}
