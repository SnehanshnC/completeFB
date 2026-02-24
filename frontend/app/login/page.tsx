"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AuroraBackground from "@/components/aurora-bg";
import { api } from "@/lib/api";
import { storeAuth } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await api.login(email, password);
      storeAuth(data.access_token, data.user);
      toast.success("Login successful");

      if (data.user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/va/dashboard");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to connect to server"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col items-center justify-center px-4 py-12"
      >
        <Card className="relative w-full overflow-hidden border-white/25 bg-white/12 text-white shadow-[0_18px_50px_-22px_rgba(15,23,42,0.65)] backdrop-blur-[28px]">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/25" />
          <div className="pointer-events-none absolute inset-0 bg-white/10 opacity-60 [mask-image:radial-gradient(120%_80%_at_50%_0%,#fff,transparent_70%)]" />
          <CardHeader className="relative z-10 space-y-6 pb-6 pt-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md shadow-inner ring-1 ring-white/20">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-white">
                FB Poster
              </CardTitle>
              <p className="text-sm text-white/70">
                Sign in to manage your pages
              </p>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pb-10 px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="sr-only" htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-white/20 bg-white/8 text-white placeholder:text-white/60 focus-visible:ring-white/30 focus-visible:border-white/45 transition-all backdrop-blur-sm rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="sr-only" htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-white/20 bg-white/8 text-white placeholder:text-white/60 focus-visible:ring-white/30 focus-visible:border-white/45 transition-all backdrop-blur-sm rounded-lg"
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-lg border border-white/20 bg-white/18 text-white text-base font-medium shadow-lg transition-all hover:bg-white/28"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </AuroraBackground>
  );
}
