/**
 * Local dev-only Stripe webhook router.
 *
 * Stripe CLI supports one --forward-to target. This multiplexer fans out by event.type
 * so both provision and billing routes receive the correct signed payloads.
 *
 * Usage:
 *   Terminal A: node scripts/dev/stripe-webhook-multiplexer.mjs
 *   Terminal B: stripe listen --forward-to http://127.0.0.1:4242
 */
import http from "node:http";

const PORT = Number(process.env.STRIPE_WEBHOOK_MUX_PORT ?? 4242);
const TARGET = (process.env.LOCAL_APP_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");

/** @type {Record<string, string>} */
const ROUTES = {
  "checkout.session.completed": "/api/webhooks/stripe",
  "payment_intent.succeeded": "/api/billing/webhook",
};

/**
 * @param {string} eventType
 */
function resolvePath(eventType) {
  return ROUTES[eventType] ?? "/api/billing/webhook";
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);

  let eventType = "";
  try {
    const parsed = JSON.parse(rawBody.toString("utf8"));
    eventType = typeof parsed?.type === "string" ? parsed.type : "";
  } catch {
    eventType = "";
  }

  const path = resolvePath(eventType);
  const url = `${TARGET}${path}`;
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Missing stripe-signature header." }));
    return;
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": req.headers["content-type"] ?? "application/json",
        "stripe-signature": signature,
      },
      body: rawBody,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    });
    res.end(text);
    console.log(
      `[stripe-mux] ${new Date().toISOString()} ${eventType || "unknown"} -> [${upstream.status}] ${path}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream forward failed.";
    console.error("[stripe-mux] forward error", message);
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: message }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Stripe webhook multiplexer listening on http://127.0.0.1:${PORT}`);
  console.log(`  checkout.session.completed -> ${TARGET}/api/webhooks/stripe`);
  console.log(`  payment_intent.succeeded   -> ${TARGET}/api/billing/webhook`);
  console.log(`  (all other events)         -> ${TARGET}/api/billing/webhook`);
  console.log("");
  console.log("Run: stripe listen --forward-to http://127.0.0.1:4242");
});
