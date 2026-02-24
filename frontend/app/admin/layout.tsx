"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, Send } from "lucide-react";
import AuroraBackground from "@/components/aurora-bg";
import DashboardShell from "@/components/dashboard-shell";
import Sidebar, { type NavItem } from "@/components/sidebar";
import { getStoredToken, getStoredRole } from "@/lib/auth";

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Pages", href: "/admin/pages", icon: FileText },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Post", href: "/admin/post", icon: Send },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const role = getStoredRole();
    if (!token || role !== "admin") {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) return null;

  return (
    <AuroraBackground>
      <DashboardShell sidebar={<Sidebar items={adminNav} />}>
        {children}
      </DashboardShell>
    </AuroraBackground>
  );
}
