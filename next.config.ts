import type { NextConfig } from "next";

// Report-only for now so we can observe violations before enforcing.
// 'unsafe-inline' on script-src is unfortunately required for Next.js's
// inline bootstrap script and Clerk's <ClerkProvider> hydration; tightening
// to a nonce-based policy would mean piping a nonce through every layout.
// `img-src data:` covers TipTap base64 images while uploads are in flight.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com https://*.supabase.co wss://*.supabase.co",
  "frame-src https://*.clerk.accounts.dev https://*.clerk.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    // attachments (posts, comments, emails) cap at 15 MB aggregate —
    // plus form fields + multipart overhead, so 18 MB gives headroom.
    serverActions: { bodySizeLimit: "18mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Report-only — flip to "Content-Security-Policy" after a week
          // of observing reports with no false positives.
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspDirectives,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
