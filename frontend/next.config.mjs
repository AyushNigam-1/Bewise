// next.config.mjs
import { withSentryConfig } from "@sentry/nextjs";
import nextPWA from "next-pwa";

// 1. Configure PWA
const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Tip: It's best to disable PWA in dev so it doesn't aggressively cache your local changes!
  disable: process.env.NODE_ENV === "development",
});

// 2. Core Next.js Configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🌟 THIS FIXES THE DOCKER BUILD CRASH 🌟
  turbopack: {},

  // 🌟 PostHog Rewrites
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

// 3. Chain Sentry and PWA together around your core config!
export default withSentryConfig(withPWA(nextConfig), {
  // 🚨 Make sure to update these to your actual Sentry Org/Project names!
  org: "demo-me",
  project: "javascript-nextjs-ax",

  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});