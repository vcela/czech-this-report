import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "jsdom", "axe-core"],
  poweredByHeader: false,
};

export default nextConfig;
