"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPath } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiPath("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(data?.message || "Unable to sign in right now.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketing-canvas relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 space-y-3 text-center">
          <div className="mx-auto inline-flex rounded-2xl border border-white/10 bg-white/5 p-4">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white">
            Reconnect<span className="text-synod-muted">_</span>Synod
          </h1>
          <p className="text-sm text-synod-muted">
            Sign in with your Synod operator identity.
          </p>
        </div>

        <div className="glass-card relative p-8 shadow-2xl">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-black uppercase tracking-widest text-synod-muted">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@synod.xyz"
                icon={<Mail size={18} />}
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-black uppercase tracking-widest text-synod-muted">
                Access Key
              </label>
              <Input
                type="password"
                placeholder="********"
                icon={<Lock size={18} />}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-bold text-red-300">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={loading} className="group h-14 w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  AUTHENTICATING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  SIGN IN
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 border-t border-synod-border pt-6 text-center">
            <p className="text-xs text-synod-muted">
              Need a new operator identity?{" "}
              <Link href="/signup" className="font-bold text-white hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
