import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/afterbell/")({
  server: {
    handlers: {
      GET: ({ request }) => Response.redirect(new URL("/?galaxy=afterbell", request.url), 302),
    },
  },
});
