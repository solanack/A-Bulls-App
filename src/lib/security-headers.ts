/**
 * Baseline response headers for abullsapp.com.
 *
 * `public/_headers` applies only to static assets. Cloudflare does not copy
 * those rules onto Worker responses, and production HTML is rendered by the
 * TanStack Start Worker (`run_worker_first` is false, `html_handling` is none).
 * `src/start.ts` attaches this set to every Worker response. `src/routes/__root.tsx`
 * repeats it on the document so the HTML contract stays next to the cache headers.
 *
 * Content-Security-Policy is Report-Only. It does not block loads or framing.
 * There is no X-Frame-Options: the Field is embeddable, and framing is expressed
 * only as CSP `frame-ancestors` (self, grok.com, and the Grok sandbox).
 */

export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  // `$tsr-stream-barrier` is an inline script with no nonce (router ssr.nonce is unset).
  "script-src 'self' 'unsafe-inline'",
  // Component <style> blocks and React style attributes, plus the Google Fonts stylesheet.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Cut posters are blob: URLs. No remote <img> hosts are loaded by the Field.
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  // Browser calls are same-origin server functions, plus Afterbell's direct DexScreener read.
  // workers.dev is not included: the browser does not call it. Server functions use the
  // INTELLIGENCE service binding. SocialFi's direct workers.dev fetch is behind
  // VITE_SOCIALFI_UI_ENABLED, which production does not set.
  "connect-src 'self' https://api.dexscreener.com",
  // Mediabunny Cut export starts blob: Workers.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://grok.com https://*.grok.com https://*.grok-sandbox.com",
].join("; ");

export function baselineSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy-Report-Only": CONTENT_SECURITY_POLICY_REPORT_ONLY,
  };
}

/** Sets the baseline on a Worker response. Immutable header lists are copied. */
export function applySecurityHeaders(response: Response): Response {
  const headers = baselineSecurityHeaders();
  try {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  } catch {
    const next = new Headers(response.headers);
    for (const [name, value] of Object.entries(headers)) next.set(name, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: next,
    });
  }
}
