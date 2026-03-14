"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AuroraBackground from "@/components/aurora-bg";
import { api } from "@/lib/api";
import { isAuthenticated, storeAuth, storeExpiry } from "@/lib/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await api.login(username, password);
      storeAuth(data.user);
      storeExpiry(data.expires_in);
      toast.success("Login successful");

      router.push("/dashboard");
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
        <Card className="relative w-full overflow-hidden border-white/15 bg-[rgba(30,58,138,0.3)] text-white shadow-[0_18px_50px_-22px_rgba(15,23,42,0.65)] backdrop-blur-[28px]">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/15" />
          <div className="pointer-events-none absolute inset-0 bg-blue-400/8 opacity-50 [mask-image:radial-gradient(120%_80%_at_50%_0%,#fff,transparent_70%)]" />
          <CardHeader className="relative z-10 space-y-6 pb-6 pt-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 backdrop-blur-md shadow-inner ring-1 ring-cyan-400/20">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-white">
                iScales
              </CardTitle>
              <p className="text-sm text-white/50">
                Sign in to manage your pages
              </p>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pb-10 px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="sr-only" htmlFor="username">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40 focus-visible:ring-cyan-400/30 focus-visible:border-cyan-400/40 transition-all backdrop-blur-sm rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="sr-only" htmlFor="password">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-white/12 bg-[rgba(30,58,138,0.2)] text-white placeholder:text-white/40 focus-visible:ring-cyan-400/30 focus-visible:border-cyan-400/40 transition-all backdrop-blur-sm rounded-lg pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-lg border border-cyan-400/25 bg-cyan-500/20 text-white text-base font-medium shadow-lg transition-all hover:bg-cyan-500/30"
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
