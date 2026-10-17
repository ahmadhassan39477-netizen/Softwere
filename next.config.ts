import type { NextConfig } from "next";

const HSTS = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains",
} as const;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "[::1]"],
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "tempempire.store" }],
        destination: "https://www.tempempire.store/",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "tempempire.store" }],
        destination: "https://www.tempempire.store/:path*",
        statusCode: 301,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.tempempire.store" }],
        headers: [HSTS],
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "tempempire.store" }],
        headers: [HSTS],
      },
      {
        source: "/gsc-file-public-check.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/google:file.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
