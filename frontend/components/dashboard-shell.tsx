"use client";

import { useState } from "react";

export default function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: (collapsed: boolean, onToggle: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col px-4 py-8">
      <div className="flex-1 rounded-2xl border border-white/10 bg-[rgba(30,58,138,0.25)] shadow-[0_18px_50px_-22px_rgba(15,23,42,0.65),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-[28px]">
        <div
          className="grid min-h-[calc(100vh-4rem)] transition-[grid-template-columns] duration-200 ease-in-out"
          style={{
            gridTemplateColumns: collapsed ? "72px 1fr" : "240px 1fr",
          }}
        >
          {sidebar(collapsed, () => setCollapsed((c) => !c))}
          <main className="border-l border-white/10 p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
