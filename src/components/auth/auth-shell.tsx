"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiPath } from "@/lib/api";

type AuthMode = "signin" | "signup";

type AuthShellProps = {
  initialMode: AuthMode;
};

const copyByMode: Record<
  AuthMode,
  {
    subtitle: string;
    submitIdle: string;
    submitLoading: string;
  }
> = {
  signin: {
    subtitle: "Sign in to create your governance identity",
    submitIdle: "Sign In",
    submitLoading: "Signing In...",
  },
  signup: {
    subtitle: "Sign in to create your governance identity",
    submitIdle: "Sign Up",
    submitLoading: "Creating Identity...",
  },
};

function getAuthErrorMessage(status: number, fallback: string) {
  if (status === 404 || status === 502 || status === 503 || status === 504) {
    return "Coordinator API is unreachable on this deployment. Set `SYNOD_COORDINATOR_ORIGIN` to the live synod-coordinator URL and redeploy.";
  }

  return fallback;
}

export function AuthShell({ initialMode }: AuthShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSwitching, startSwitchTransition] = useTransition();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(pathname === "/signup" ? "signup" : "signin");
    setError("");
  }, [pathname]);

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;

    setError("");
    setMode(nextMode);

    startSwitchTransition(() => {
      router.replace(nextMode === "signup" ? "/signup" : "/signin");
    });
  };

  const submitSignin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiPath("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: signinEmail, password: signinPassword }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(
          data?.message ||
            getAuthErrorMessage(response.status, "Unable to sign in right now."),
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in right now. Check the coordinator deployment and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
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
        body: JSON.stringify({ email: signupEmail, password: signupPassword }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(
          data?.message ||
            getAuthErrorMessage(response.status, "Unable to create your account right now."),
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account right now. Check the coordinator deployment and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const activeCopy = copyByMode[mode];

  return (
    <div className="relative z-10 w-full max-w-[440px]">
      <div className="auth-card w-full">
        <div className="seg-wrap" role="tablist" aria-label="Authentication Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`seg-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => switchMode("signin")}
            disabled={loading || isSwitching}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`seg-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => switchMode("signup")}
            disabled={loading || isSwitching}
          >
            Sign Up
          </button>
        </div>

        <div
          className={`panel ${mode === "signin" ? "active" : ""}`}
          data-panel="signin"
          hidden={mode !== "signin"}
        >
          <p className="subtitle">{activeCopy.subtitle}</p>

          <form onSubmit={submitSignin}>
            <div className="field">
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                required
                value={signinEmail}
                onChange={(event) => setSigninEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signin-password">
                Password
                <button type="button" className="text-[12.5px] font-normal text-[var(--ac-muted)]">
                  Forgot your password?
                </button>
              </label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                required
                value={signinPassword}
                onChange={(event) => setSigninPassword(event.target.value)}
              />
            </div>

            {mode === "signin" && error ? <ErrorBanner message={error} /> : null}

            <button type="submit" className="submit-btn" disabled={loading || isSwitching}>
              {loading && mode === "signin" ? activeCopy.submitLoading : activeCopy.submitIdle}
            </button>
          </form>
        </div>

        <div
          className={`panel ${mode === "signup" ? "active" : ""}`}
          data-panel="signup"
          hidden={mode !== "signup"}
        >
          <p className="subtitle">{copyByMode.signup.subtitle}</p>

          <form onSubmit={submitSignup}>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                required
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signup-confirm-password">Confirm Password</label>
              <input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={signupConfirmPassword}
                onChange={(event) => setSignupConfirmPassword(event.target.value)}
              />
            </div>

            {mode === "signup" && error ? <ErrorBanner message={error} /> : null}

            <button type="submit" className="submit-btn" disabled={loading || isSwitching}>
              {loading && mode === "signup"
                ? copyByMode.signup.submitLoading
                : copyByMode.signup.submitIdle}
            </button>
          </form>
        </div>

        <p className="footer-text">
          By clicking continue, you agree to our <a href="#">Terms of Service</a> and{" "}
          <a href="#">Privacy Policy</a>.
        </p>
      </div>
      <style jsx>{`
        .auth-card {
          --ac-bg: #09090b;
          --ac-surface: #18181b;
          --ac-border: #27272a;
          --ac-fg: #fafafa;
          --ac-muted: #71717a;
          --ac-muted-bg: #1c1c1f;
          --ac-radius: 10px;
          --ac-input-h: 44px;
          --ac-btn-h: 44px;

          background: var(--ac-surface);
          border: 1px solid var(--ac-border);
          border-radius: 16px;
          padding: 36px 40px 32px;
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.3);
          color: var(--ac-fg);
          font-family: "Geist", var(--font-sans), sans-serif;
        }

        .seg-wrap {
          display: flex;
          gap: 4px;
          margin-bottom: 26px;
          border-radius: 9px;
          background: var(--ac-muted-bg);
          padding: 4px;
        }

        .seg-btn {
          flex: 1;
          cursor: pointer;
          border: none;
          border-radius: 6px;
          background: transparent;
          padding: 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--ac-muted);
          transition:
            background 0.15s,
            color 0.15s,
            box-shadow 0.15s,
            opacity 0.15s;
        }

        .seg-btn.active {
          background: #27272a;
          color: var(--ac-fg);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        .seg-btn:disabled,
        .google-btn:disabled,
        .submit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .subtitle {
          margin-bottom: 20px;
          text-align: center;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--ac-muted);
        }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ac-fg);
        }

        .field input {
          height: var(--ac-input-h);
          width: 100%;
          border: 1px solid var(--ac-border);
          border-radius: var(--ac-radius);
          background: var(--ac-bg);
          padding: 0 13px;
          font-size: 14px;
          color: var(--ac-fg);
          outline: none;
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }

        .field input::placeholder {
          color: #3f3f46;
        }

        .field input:focus {
          border-color: #52525b;
          box-shadow: 0 0 0 3px rgba(113, 113, 122, 0.18);
        }

        .submit-btn {
          margin-top: 4px;
          height: var(--ac-btn-h);
          width: 100%;
          border: none;
          border-radius: var(--ac-radius);
          background: var(--ac-fg);
          font-size: 14px;
          font-weight: 500;
          color: var(--ac-bg);
          transition: opacity 0.15s;
        }

        .submit-btn:hover:not(:disabled) {
          opacity: 0.88;
        }

        .footer-text {
          margin-top: 22px;
          text-align: center;
          font-size: 12px;
          line-height: 1.6;
          color: var(--ac-muted);
        }

        .footer-text a {
          color: var(--ac-muted);
          text-decoration: underline;
        }

        .panel {
          display: none;
        }

        .panel.active {
          display: block;
        }
      `}</style>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <p className="mb-4 text-[12px] leading-5 text-[#ff0000]">{message}</p>;
}
