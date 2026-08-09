const UPSTREAM_URL = "https://cqpedia-quiz-stats.rigby.workers.dev/api/quiz-stats";
const MAX_BODY_BYTES = 2048;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function readLimitedBody(request) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Allow": "GET, POST, OPTIONS" } });
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const headers = new Headers({
    "Accept": "application/json",
    "Origin": "https://cqpedia.cn"
  });
  const init = { method: request.method, headers };

  if (request.method === "POST") {
    const body = await readLimitedBody(request);
    if (body === null) return json({ error: "payload_too_large" }, 413);
    headers.set("Content-Type", "application/json");
    init.body = body;
  }

  try {
    const response = await fetch(UPSTREAM_URL, init);
    const responseHeaders = new Headers({
      "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8",
      "Cache-Control": request.method === "GET"
        ? (response.headers.get("Cache-Control") || "public, max-age=30")
        : "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (_) {
    return json({ error: "stats_upstream_unavailable" }, 502);
  }
}
