"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Send } from "lucide-react";
import AuroraBackground from "@/components/aurora-bg";
import DashboardShell from "@/components/dashboard-shell";
import Sidebar, { type NavItem } from "@/components/sidebar";
import { getStoredToken } from "@/lib/auth";

const vaNav: NavItem[] = [
  { label: "Dashboard", href: "/va/dashboard", icon: LayoutDashboard },
  { label: "My Pages", href: "/va/pages", icon: FileText },
  { label: "Post", href: "/va/post", icon: Send },
];

export default function VaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) return null;

  return (
    <AuroraBackground>
      <DashboardShell sidebar={(collapsed, onToggle) => (
        <Sidebar items={vaNav} collapsed={collapsed} onToggleCollapse={onToggle} />
      )}>
        {children}
      </DashboardShell>
    </AuroraBackground>
  );
}
