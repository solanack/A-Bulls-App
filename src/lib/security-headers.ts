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
 * There is no report-uri or report-to; violations show up in the browser console.
 * There is no X-Frame-Options: the Field is embeddable, and framing is expressed
 * only as CSP `frame-ancestors`.
 */

export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  // `$tsr-stream-barrier` is an inline script with no nonce (router ssr.nonce is unset).
  // grok-pwa injects https://grok.com/grok-app-builder/extensions.js into HTML
  // (dev, vite preview, and the Nitro middleware). Allow that exact script.
  "script-src 'self' 'unsafe-inline' https://grok.com/grok-app-builder/extensions.js",
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
  // grok.me covers auth.grok.me, gate.grok.me, connectors.grok.me, og.grok.me, and published app hosts.
  "frame-ancestors 'self' https://grok.com https://*.grok.com https://*.grok-sandbox.com https://grok.me https://*.grok.me",
].join("; ");

export function baselineSecurityHeaders(): Record<string, string> {
  return {
    // No includeSubDomains: that flag sticks for every subdomain and is hard to undo.
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()",
    // unsafe-none: the sandbox sign-in popup polls popup.closed and the completion
    // page posts the bearer to window.opener. same-origin-allow-popups severs that
    // once the popup navigates to the OAuth broker.
    "Cross-Origin-Opener-Policy": "unsafe-none",
    // cross-origin: grok.com and x.com fetch og.jpg, icons, and the manifest.
    "Cross-Origin-Resource-Policy": "cross-origin",
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
