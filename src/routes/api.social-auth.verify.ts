import { createFileRoute } from "@tanstack/react-router";

async function verify(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json(
      { ok: false, error: "authorization_required" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const body = await request.json().catch(() => ({})) as { audience?: unknown };
  if (body.audience !== "a-bulls-social") {
    return Response.json(
      { ok: false, error: "invalid_audience" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }
  const { auth } = await import("@/lib/auth/server");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json(
      { ok: false, error: "account_required" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(
    { ok: true, subject: session.user.id },
    { headers: { "cache-control": "no-store" } },
  );
}

export const Route = createFileRoute("/api/social-auth/verify")({
  server: {
    handlers: {
      POST: ({ request }) => verify(request),
    },
  },
});
