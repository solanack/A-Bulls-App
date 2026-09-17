// Vite supplies production defaults from Wrangler; unbundled tests stay local.
export const INTELLIGENCE_WORKER_ORIGIN = import.meta.env?.VITE_INTELLIGENCE_WORKER_URL || "http://localhost:8787";
export const INTELLIGENCE_PUBLIC_ORIGIN = import.meta.env?.VITE_PUBLIC_APP_ORIGIN || "http://localhost:8080";
