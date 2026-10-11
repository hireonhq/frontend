/**
 * Backend-for-frontend proxy.
 *
 * The browser only ever talks to this origin. Requests under /api/* are forwarded
 * over the private Docker network to the Go backend, which therefore needs no
 * public hostname, no second certificate and no CORS policy. See the infra repo
 * for the compose wiring.
 *
 * Why not call the backend directly from the browser:
 *   - the API surface would need CORS, preflight handling and a public URL
 *   - every NEXT_PUBLIC_* value is inlined into the JS bundle, so any future
 *     server-side credential would be exposed
 *   - a single origin makes CSP and cookie handling tractable
 *
 * The cost is one extra hop, which stays inside the Docker bridge network.
 */
import { NextRequest } from "next/server";

// Server-only: never NEXT_PUBLIC_, or the internal hostname leaks into the bundle.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://backend:8080";

/**
 * Uploads and AI calls are slow: CV analysis and cover-letter generation can take
 * tens of seconds. A generous ceiling avoids aborting legitimate work, while still
 * bounding a hung upstream.
 */
const UPSTREAM_TIMEOUT_MS = Number(process.env.BACKEND_TIMEOUT_MS ?? 120_000);

// Hop-by-hop headers must not be forwarded (RFC 9110 section 7.6.1).
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// Set by the runtime from the actual client connection; forwarding them would let
// a caller spoof its own address.
const CLIENT_CONTROLLED = new Set(["host", "content-length", "x-forwarded-for", "x-forwarded-proto", "x-forwarded-host"]);

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || CLIENT_CONTROLLED.has(lower)) return;
    headers.set(key, value);
  });

  // Give the backend the real client address and scheme so its logs and any
  // rate limiting see the truth rather than this proxy's address.
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");

  // Correlate the proxy hop with the backend's own request log.
  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", crypto.randomUUID());
  }
  return headers;
}

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const target = new URL(`/${path.join("/")}`, BACKEND_URL);
  target.search = request.nextUrl.search;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    // Stream the body straight through: buffering a 5 MB upload in the Node
    // process would defeat the point of a thin proxy.
    const upstream = await fetch(target, {
      method: request.method,
      headers: buildUpstreamHeaders(request),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      // Required by Node's fetch when streaming a request body.
      duplex: "half",
      redirect: "manual",
      signal: controller.signal,
    } as RequestInit & { duplex: "half" });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // The body is re-framed by this hop, so the original length is wrong.
      if (HOP_BY_HOP.has(lower) || lower === "content-length") return;
      responseHeaders.set(key, value);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    const status = aborted ? 504 : 502;
    // The envelope mirrors the backend's so clients parse one shape.
    return Response.json(
      {
        statusCode: status,
        success: false,
        message: aborted ? "Upstream service timed out." : "Upstream service unavailable.",
        error: aborted ? "Gateway Timeout" : "Bad Gateway",
      },
      { status },
    );
  } finally {
    clearTimeout(timer);
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
export async function PUT(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
export async function HEAD(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
export async function OPTIONS(request: NextRequest, ctx: RouteContext) {
  return proxy(request, (await ctx.params).path);
}
