import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { applySecurityHeaders } from "@/lib/security-headers";

/**
 * Defining src/start.ts replaces TanStack Start's built-in request middleware.
 * Keep the same CSRF filter the framework installs when this file is absent:
 * server functions only, same-origin by default.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Outermost middleware so HTML, /api, and server-function responses all leave
 * with the baseline. `public/_headers` does not cover these Worker responses.
 */
const securityHeadersMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
  const result = await next();
  if (result.response) result.response = applySecurityHeaders(result.response);
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, csrfMiddleware],
}));
