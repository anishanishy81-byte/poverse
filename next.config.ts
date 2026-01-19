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
  // Allow mobile devices on the same network to access dev server
  allowedDevOrigins: [
    "http://192.168.0.6",
    "http://localhost",
  ],
};

export default pwaConfig(nextConfig);
