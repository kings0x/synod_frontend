"use client";

import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <div className="marketing-canvas auth-canvas relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuthShell initialMode="signin" />
    </div>
  );
}
