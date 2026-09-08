import { createFileRoute } from "@tanstack/react-router";
import { proxyIntelligenceRequest } from "@/lib/intelligence-proxy";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: ({ request }) => proxyIntelligenceRequest(request),
    },
  },
});
