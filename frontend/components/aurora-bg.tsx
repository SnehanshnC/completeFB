"use client";

import Aurora from "@/components/ui/aurora";

export default function AuroraBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1a3a]">
      <div className="absolute inset-0">
        <Aurora
          className="h-full w-full opacity-90"
          colorStops={["#3b6cf5", "#5b8af5", "#38bdf8"]}
          blend={0.65}
          amplitude={1.1}
          speed={0.5}
        />
      </div>
      <div className="absolute inset-0 bg-[#0f1a3a]/30 backdrop-blur-[2px]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
