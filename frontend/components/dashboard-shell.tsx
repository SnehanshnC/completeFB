"use client";

export default function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col px-4 py-8">
      <div className="flex-1 rounded-2xl border border-white/15 bg-white/8 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.65)] backdrop-blur-[28px]">
        <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[240px_1fr]">
          {sidebar}
          <main className="border-l border-white/10 p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
