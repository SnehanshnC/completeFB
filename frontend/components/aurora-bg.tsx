"use client";

import Aurora from "@/components/ui/aurora";

export default function AuroraBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0f1c]">
      <div className="absolute inset-0">
        <Aurora
          className="h-full w-full opacity-90"
          colorStops={["#6ea8ff", "#c7a6ff", "#88f7ff"]}
          blend={0.55}
          amplitude={1.1}
          speed={0.5}
        />
      </div>
      <div className="absolute inset-0 bg-[#0b0f1c]/45 backdrop-blur-[2px]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
