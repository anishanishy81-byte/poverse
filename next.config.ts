import type { NextConfig } from "next";
// @ts-expect-error - next-pwa doesn't have type declarations
import withPWA from "next-pwa";

const isAndroidBuild = process.env.BUILD_ANDROID === 'true';

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Disable PWA for development AND Android builds
  // In Capacitor, the WebView serves local assets directly — SW caching
  // causes stale JS bundles to be served after APK updates, breaking
  // React hydration and making the UI unresponsive/unclickable.
  disable: process.env.NODE_ENV === "development" || isAndroidBuild,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    unoptimized: true,
  },
  // Enable static export for Capacitor Android build
  output: isAndroidBuild ? 'export' : undefined,
};

export default pwaConfig(nextConfig);
