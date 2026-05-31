import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://unpkg.com https://cdn.jsdelivr.net https://vercel.live https://*.vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com https://vercel.live",
              "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://tile.openstreetmap.org https://*.supabase.co https://vercel.live https://vercel.com https://unpkg.com https://*.tile.openstreetmap.org https://i.ibb.co https://ibb.co",
              "media-src * blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://nominatim.openstreetmap.org https://vercel.live https://*.vercel.live wss://*.vercel.live https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://unpkg.com https://api.imgbb.com https://firestore.googleapis.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://vercel.live https://*.firebaseapp.com https://accounts.google.com https://www.youtube.com https://youtube.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: [
              "camera=(self)",
              "geolocation=(self)",
              "microphone=(self)",
              "payment=()",
              "usb=()",
              "serial=()",
              "bluetooth=()",
            ].join(", "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  workboxOptions: {
    cacheId: "ttd-v1",
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/100-things-todo\.vercel\.app\/(?!api\/).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

export default withPWAConfig(nextConfig);
