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
    googleLabel: string;
    submitIdle: string;
    submitLoading: string;
  }
> = {
  signin: {
    subtitle: "Sign in to create your governance identity",
    googleLabel: "Sign in with Google",
    submitIdle: "Sign In",
    submitLoading: "Signing In...",
  },
  signup: {
    subtitle: "Sign in to create your governance identity",
    googleLabel: "Sign up with Google",
    submitIdle: "Sign Up",
    submitLoading: "Creating Identity...",
  },
};

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
        throw new Error(data?.message || "Unable to sign in right now.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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

          <div className="google-btn-wrap">
            <button type="button" className="google-btn">
              <GoogleIcon />
              {activeCopy.googleLabel}
            </button>
          </div>

          <div className="divider">Or continue with</div>

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

          <div className="google-btn-wrap">
            <button type="button" className="google-btn">
              <GoogleIcon />
              {copyByMode.signup.googleLabel}
            </button>
          </div>

          <div className="divider">Or continue with</div>

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

        .google-btn-wrap {
          padding: 1.5px;
          border-radius: calc(var(--ac-radius) + 2px);
          background: linear-gradient(135deg, #a855f7, #7c3aed, #6366f1, #8b5cf6, #c084fc);
          margin-bottom: 18px;
        }

        .google-btn {
          width: 100%;
          height: var(--ac-btn-h);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 500;
          background: var(--ac-surface);
          border: none;
          border-radius: var(--ac-radius);
          cursor: pointer;
          color: var(--ac-fg);
          transition: background 0.15s;
        }

        .google-btn:hover:not(:disabled) {
          background: #1f1f22;
        }

        .google-icon {
          width: 18px;
          height: 18px;
          display: block;
          flex-shrink: 0;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          color: var(--ac-muted);
          font-size: 12px;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--ac-border);
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

function GoogleIcon() {
  return (
    <svg
      className="google-icon"
      width="18"
      height="18"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-[10px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}
