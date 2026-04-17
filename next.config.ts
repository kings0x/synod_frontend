import type { NextConfig } from "next";

const configuredCoordinatorOrigin =
  process.env.SYNOD_COORDINATOR_ORIGIN?.trim() ||
  process.env.NEXT_PUBLIC_COORDINATOR_ORIGIN?.trim();

const coordinatorOrigin =
  configuredCoordinatorOrigin ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8080" : "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!coordinatorOrigin) {
      return [];
    }

    return [
      {
        source: "/v1/:path*",
        destination: `${coordinatorOrigin}/v1/:path*`,
      },
      {
        source: "/connect/:path*",
        destination: `${coordinatorOrigin}/connect/:path*`,
      },
      {
        source: "/policy",
        destination: `${coordinatorOrigin}/policy`,
      },
      {
        source: "/intents/:path*",
        destination: `${coordinatorOrigin}/intents/:path*`,
      },
      {
        source: "/agent/:path*",
        destination: `${coordinatorOrigin}/agent/:path*`,
      },
    ];
  },
};

export default nextConfig;
