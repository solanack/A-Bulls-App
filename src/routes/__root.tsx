import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { MODULE_BOOT_INLINE } from "@/lib/field/module-boot-inline";
import appCss from "../styles.css?url";

const APP_NAME = "A Bulls App";

export const Route = createRootRoute({
  // Document responses on Cloudflare Workers must set cache headers here.
  // server/middleware/grok-pwa.ts is Nitro-oriented and is not scanned by the
  // @cloudflare/vite-plugin + @tanstack/react-start/server-entry path.
  headers: () => ({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#030307" },
      {
        name: "description",
        content: "The blockchain is alive. Intelligence is visible. The future is particle.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
    scripts: [
      {
        children: MODULE_BOOT_INLINE,
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
