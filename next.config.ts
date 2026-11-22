import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) so production needs no node_modules install
  output: "standalone",
};

export default nextConfig;
