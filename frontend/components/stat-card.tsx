"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export default function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
        <Icon className="size-4 text-white/80" />
      </div>
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
