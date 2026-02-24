"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, Send, ClipboardList } from "lucide-react";
import AuroraBackground from "@/components/aurora-bg";
import DashboardShell from "@/components/dashboard-shell";
import Sidebar, { type NavItem } from "@/components/sidebar";
import { getStoredToken, getStoredRole, isAdmin } from "@/lib/auth";

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
    const token = getStoredToken();
    const role = getStoredRole();
    if (!token || !role) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
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
