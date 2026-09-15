import { createFileRoute } from "@tanstack/react-router";
import { intelligenceProxyHandlers } from "@/lib/intelligence-proxy";

export const Route = createFileRoute("/api/intelligence/$a/$b/$c")({
  server: { handlers: intelligenceProxyHandlers },
});
