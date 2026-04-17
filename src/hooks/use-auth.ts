"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

function getAuthErrorMessage(status: number) {
  if (status >= 500) {
    return "Synod coordinator is unavailable right now.";
  }

  return "Unable to validate your Synod session.";
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const response = await apiFetch("/auth/me", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as { user_id: string };
        setUserId(data.user_id);
        setToken("cookie-auth");
        return;
      }

      setToken(null);
      setUserId(null);

      if (response.status === 401 || response.status === 403) {
        router.replace("/signin");
        return;
      }

      setAuthError(getAuthErrorMessage(response.status));
    } catch {
      setToken(null);
      setUserId(null);
      setAuthError("Synod coordinator is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", {
      method: "POST",
    });
    setToken(null);
    setUserId(null);
    router.push("/signin");
  }, [router]);

  const user = useMemo(
    () => ({
      name: "Ade Okonkwo",
      avatar: "AO",
    }),
    [],
  );

  return {
    token,
    userId,
    loading,
    authError,
    refreshSession,
    logout,
    user,
  };
}
