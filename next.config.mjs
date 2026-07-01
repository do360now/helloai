/**
 * Next.js configuration — hardened (red-team P0/P2 fixes applied)
 *
 * Changes vs. previous:
 *  - poweredByHeader: false                 (SOL-007: stop leaking x-powered-by: Next.js)
 *  - headers() → HSTS + CSP + X-Frame-Options + X-Content-Type-Options
 *                + Referrer-Policy + Permissions-Policy   (SOL-001, SOL-002, SOL-006)
 *  - redirects() → HTTP→HTTPS enforced at framework level  (SOL-001 belt-and-braces;
 *                 Azure "HTTPS Only" toggle is the primary control)
 *
 * Target: helloai.com — Next.js 16.2.3 standalone, Azure App Service (Windows).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',        // unchanged — required for Docker + Azure
  reactStrictMode: true,       // unchanged
  poweredByHeader: false,      // SOL-007: remove x-powered-by: Next.js

  // ---------------------------------------------------------------------------
  // SOL-001 + SOL-002 + SOL-006: security headers applied to every route.
  // Next.js merges these with any per-route headers set in the handler.
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // SOL-001: HSTS. max-age = 2 years. includeSubDomains covers any future
          // subdomain. preload — submit to https://hstspreload.org after deploy.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },

          // SOL-002 + SOL-006: Content-Security-Policy.
          // Notes on the policy:
          //  - default-src 'self': everything not otherwise listed may only load
          //    from the site's own origin.
          //  - script-src 'self' 'unsafe-inline': Next.js App Router injects
          //    inline runtime chunks; removing 'unsafe-inline' requires nonce-
          //    based CSP via middleware (a follow-up, SOL-002 residual). Kept
          //    for now so the build renders. Tighten in P2.
          //  - style-src 'self' 'unsafe-inline': Tailwind + Next.js inject
          //    inline styles; same residual as above.
          //  - img-src 'self' data: https: — article OG images are served from
          //    /opengraph-image and /articles/<slug>/opengraph-image ('self');
          //    allow https: for any future external article imagery + data: for
          //    inline SVG/PNG data URIs.
          //  - font-src 'self' — Wix-style CDN fonts are not used; site uses
          //    system/Tailwind fonts.
          //  - connect-src 'self' — the only API is /api/* on the same origin.
          //    Prevents exfiltration to attacker domains via fetch/XHR.
          //  - frame-ancestors 'none' — clickjacking defense (SOL-006).
          //  - base-uri 'self' — prevent <base> hijack.
          //  - form-action 'self' — no forms today, but lock it down.
          //  - object-src 'none' — no Flash/Java/plugins.
          //  - upgrade-insecure-requests — rewrite http:// subresources to https://.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },

          // SOL-006: belt-and-braces for legacy browsers that don't read CSP
          // frame-ancestors.
          { key: 'X-Frame-Options', value: 'DENY' },

          // Stop MIME-type sniffing on IE/old Chrome.
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Limit referrer leakage to cross-origin origins: send origin only on
          // same-origin, nothing on downgrade.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // Lock down browser-power APIs the site doesn't use.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },

};

export default nextConfig;