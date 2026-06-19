import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // ワークスペース推定で親リポジトリの lockfile を拾わないよう明示
    root: import.meta.dirname,
  },
};

export default nextConfig;
