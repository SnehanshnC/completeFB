"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { clearAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ items, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <nav className="flex flex-col justify-between bg-[rgba(30,58,138,0.2)] backdrop-blur-sm">
      {/* Brand section */}
      <div>
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div className={cn(
            "text-lg font-semibold text-white transition-all duration-200",
            collapsed && "text-center w-full"
          )}>
            {collapsed ? (
              <span>iS<span className="text-cyan-400">.</span></span>
            ) : (
              <span>iScales <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" /></span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="text-white/40 transition-colors hover:text-white/70"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pb-4">
            <button
              onClick={onToggleCollapse}
              className="text-white/40 transition-colors hover:text-white/70"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="mx-3 h-px bg-white/10" />

        {/* Nav items */}
        <div className="mt-4 space-y-2 px-3">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive
                    ? "text-white"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-cyan-400" />
                )}
                <item.icon className="size-5 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-3 text-sm font-medium text-white/50 transition-colors hover:text-white/80",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </nav>
  );
}
