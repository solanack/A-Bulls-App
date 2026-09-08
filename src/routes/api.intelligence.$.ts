import { createFileRoute } from "@tanstack/react-router";
import { proxyIntelligenceRequest } from "@/lib/intelligence-proxy";

export const Route = createFileRoute("/api/intelligence/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyIntelligenceRequest(request),
      POST: ({ request }) => proxyIntelligenceRequest(request),
      PUT: ({ request }) => proxyIntelligenceRequest(request),
    },
  },
});
