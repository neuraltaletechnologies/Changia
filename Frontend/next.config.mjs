import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The API is served from its own subdomain in production (e.g.
// https://api.changia.co.tz), so its origin must be explicitly allowed for
// browser fetches (`connect-src`) and for the campaign / proof photos it serves
// from /uploads/... (`img-src`). Derived from NEXT_PUBLIC_API_URL so there is a
// single source of truth.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
let apiOrigin = '';
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  apiOrigin = '';
}

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com ${apiOrigin}`.trim(),
  `connect-src 'self' ${apiOrigin}`.trim(),
  "object-src 'none'",
  'upgrade-insecure-requests',
  'block-all-mixed-content',
].join('; ');

// Full security-header set, previously only applied on Vercel via vercel.json.
// Emitting it from next.config makes it portable to `next start` on any host
// (shared hosting included). Applied in production only so `next dev` HMR and
// the error overlay aren't constrained by the CSP.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Permissions-Policy', value: 'interest-cohort=()' },
  { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Anchor tracing/TS resolution to the pnpm monorepo root so Next.js doesn't
  // guess the workspace root from lockfiles and hit path-mismatch errors.
  outputFileTracingRoot: __dirname,
  // If/when `next dev --turbopack` is enabled, pin Turbopack's project root to
  // this package (the pnpm monorepo only symlinks `next` into
  // Frontend/node_modules, not the workspace root). NOTE: as of Next 15.5.23 on
  // Node 26, `--turbopack` still panics here with "Next.js package not found" —
  // stay on the default webpack `next dev` until Node is on an LTS release.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
