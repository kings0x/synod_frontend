"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPath } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiPath("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(data?.message || "Registration failed.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketing-canvas relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 space-y-2 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-4">
            <UserPlus className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white">
            Join<span className="text-synod-muted">_</span>Synod
          </h1>
          <p className="text-sm font-medium text-synod-muted">
            Create your governance identity.
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-black uppercase tracking-widest text-synod-muted">
                Confirm Key
              </label>
              <Input
                type="password"
                placeholder="********"
                icon={<Lock size={18} />}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
                  PROVISIONING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  CREATE IDENTITY
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
              Already have a node?{" "}
              <Link href="/login" className="font-bold text-white hover:underline">
                Reconnect
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
