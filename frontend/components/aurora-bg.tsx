"use client";

export default function AuroraBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#0f1a3a]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1a3a] via-[#1e3a8a] to-[#0f1a3a] bg-[length:400%_400%] animate-aurora opacity-90" />
      <div className="absolute inset-0 bg-[#0f1a3a]/30 backdrop-blur-[2px]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
