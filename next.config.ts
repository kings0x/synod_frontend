import type { NextConfig } from "next";

const coordinatorOrigin =
  process.env.SYNOD_COORDINATOR_ORIGIN ?? "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${coordinatorOrigin}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
