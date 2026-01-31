import type { NextConfig } from "next";
// @ts-expect-error - next-pwa doesn't have type declarations
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    unoptimized: true,
  },
  // Enable static export for Capacitor Android build
  output: process.env.BUILD_ANDROID === 'true' ? 'export' : undefined,
};

export default pwaConfig(nextConfig);
