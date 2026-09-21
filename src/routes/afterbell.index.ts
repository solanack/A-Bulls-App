import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/afterbell/")({
  server: {
    handlers: {
      GET: ({ request }) => Response.redirect(new URL("/afterbell/index.html", request.url), 302),
    },
  },
});
