const API_BASE = "/v1";
const PUBLIC_COORDINATOR_ORIGIN =
  process.env.NEXT_PUBLIC_COORDINATOR_ORIGIN?.trim() ?? "";
const PUBLIC_COORDINATOR_WS_URL =
  process.env.NEXT_PUBLIC_COORDINATOR_WS_URL?.trim() ?? "";

function normalizePath(path: string) {
  if (!path) {
    return API_BASE;
  }

  if (path === API_BASE || path.startsWith(`${API_BASE}/`)) {
    return path;
  }

  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiPath(path: string) {
  return normalizePath(path);
}

export function apiFetch(path: string, init?: RequestInit & { token?: string | null }) {
  const { token, ...rest } = init || {};
  const headers = new Headers(rest.headers);

  if (token && token !== "cookie-auth") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(apiPath(path), {
    credentials: "include",
    ...rest,
    headers,
  });
}

export function buildWebSocketUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (PUBLIC_COORDINATOR_WS_URL) {
    const url = new URL(PUBLIC_COORDINATOR_WS_URL);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = normalizedPath;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  if (typeof window !== "undefined") {
    const url = new URL(window.location.origin);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = normalizedPath;
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  if (PUBLIC_COORDINATOR_ORIGIN) {
    const url = new URL(PUBLIC_COORDINATOR_ORIGIN);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = normalizedPath;
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  return normalizedPath;
}

export function buildDashboardWebSocketUrl() {
  return buildWebSocketUrl("/v1/dashboard/ws");
}
