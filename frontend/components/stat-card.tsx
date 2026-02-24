"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export default function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(30,58,138,0.2)] p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[rgba(30,58,138,0.3)] hover:shadow-lg hover:shadow-blue-950/20">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15">
        <Icon className="size-4 text-cyan-300" />
      </div>
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}
