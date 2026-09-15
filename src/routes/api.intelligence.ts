import { createFileRoute } from "@tanstack/react-router";
import { intelligenceProxyHandlers } from "@/lib/intelligence-proxy";

export const Route = createFileRoute("/api/intelligence")({
  server: { handlers: intelligenceProxyHandlers },
});
