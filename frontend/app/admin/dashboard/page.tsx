"use client";

import { useEffect, useState } from "react";
import { FileText, Users, CalendarClock, Calendar } from "lucide-react";
import StatCard from "@/components/stat-card";
import { api } from "@/lib/api";
import { getStoredUsername } from "@/lib/auth";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AdminDashboardPage() {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const username = getStoredUsername();

  useEffect(() => {
    Promise.all([api.listPages(), api.listUsers()]).then(([pages, users]) => {
      setPageCount(pages.length);
      setUserCount(users.length);
    });
  }, []);

  const loading = pageCount === null || userCount === null;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {getGreeting()}, {username ?? "Admin"}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Here&apos;s an overview of your platform.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-white/50">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={FileText} label="Total Pages" value={pageCount} />
          <StatCard icon={Users} label="Total Users" value={userCount} />
          <StatCard icon={CalendarClock} label="Scheduled Posts" value={0} />
          <StatCard icon={Calendar} label="Today" value={today} />
        </div>
      )}
    </div>
  );
}
