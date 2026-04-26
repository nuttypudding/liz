import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@liz/triage"],
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
