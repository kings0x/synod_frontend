const API_BASE = "/v1";

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

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiPath(path), {
    credentials: "same-origin",
    ...init,
  });
}

export function buildWebSocketUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const override = process.env.NEXT_PUBLIC_COORDINATOR_WS_URL?.trim();

  if (override) {
    const url = new URL(override);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = normalizedPath;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  if (typeof window === "undefined") {
    return normalizedPath;
  }

  const url = new URL(window.location.origin);
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = normalizedPath;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function buildDashboardWebSocketUrl() {
  return buildWebSocketUrl("/v1/dashboard/ws");
}
