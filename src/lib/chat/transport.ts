// Cross-origin policy for the public chat endpoints, and a small SSE helper.
//
// The iframe widget talks to these endpoints same-origin, so CORS is only
// relevant for headless/custom integrations. When an organization configures
// allowed origins we enforce them; an empty list means "any site may embed".

export function corsHeadersFor(
  request: Request,
  allowedOrigins: string[],
): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };

  const origin = request.headers.get("origin");
  if (!origin) return headers;

  const allowAll = allowedOrigins.length === 0 || allowedOrigins.includes("*");
  const permitted = allowAll || allowedOrigins.includes(origin);
  if (permitted) {
    headers["Access-Control-Allow-Origin"] = allowAll ? "*" : origin;
  }
  return headers;
}

export function withCors(response: Response, request: Request, allowedOrigins: string[]): Response {
  for (const [key, value] of Object.entries(corsHeadersFor(request, allowedOrigins))) {
    response.headers.set(key, value);
  }
  return response;
}

export function preflight(request: Request, allowedOrigins: string[]): Response {
  return new Response(null, { status: 204, headers: corsHeadersFor(request, allowedOrigins) });
}

type SendFn = (event: string, data: unknown) => void;

export function sseResponse(
  request: Request,
  setup: (send: SendFn) => (() => void) | void,
): Response {
  const encoder = new TextEncoder();
  let stop: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send: SendFn = (event, data) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send("ready", { ok: true });
      const cleanup = setup(send) || (() => {});
      const interval = setInterval(() => send("ping", { t: Date.now() }), 25_000);

      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          cleanup();
        } catch {
          // ignore
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", stop);
    },
    cancel() {
      try {
        stop();
      } catch {
        // ignore
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
