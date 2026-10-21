import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatars/banners are served from the API origin or object storage, both
    // env-dependent — allow any host so next/image can optimize them.
    // data: URLs (upload previews) are unoptimized automatically.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
