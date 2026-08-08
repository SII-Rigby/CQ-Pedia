const RATING_ORDER = ["黄棒", "半罐水", "摸得到门", "耍得转", "行市", "老江湖", "老板凳"];
const ATTEMPT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ratingForScore(score) {
  if (score < 40) return "黄棒";
  if (score < 60) return "半罐水";
  if (score < 70) return "摸得到门";
  if (score < 80) return "耍得转";
  if (score < 90) return "行市";
  if (score < 100) return "老江湖";
  return "老板凳";
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "https://cqpedia.cn")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
  if (origin && allowedOrigins(env).includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, init = {}, request, env) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(JSON.stringify(data), { ...init, headers });
}

function requestOriginIsAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && allowedOrigins(env).includes(origin);
}

async function readStats(db) {
  const query = await db.prepare(`
    SELECT rating, COUNT(*) AS count
    FROM quiz_attempts
    GROUP BY rating
  `).all();
  const counts = new Map((query.results || []).map((row) => [row.rating, Number(row.count) || 0]));
  const total = RATING_ORDER.reduce((sum, rating) => sum + (counts.get(rating) || 0), 0);
  return {
    total,
    bands: RATING_ORDER.map((rating) => {
      const count = counts.get(rating) || 0;
      return {
        rating,
        count,
        percentage: total ? Math.round((count / total) * 1000) / 10 : 0
      };
    })
  };
}

async function recordAttempt(request, env) {
  if (!requestOriginIsAllowed(request, env)) {
    return json({ error: "origin_not_allowed" }, { status: 403 }, request, env);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 2048) {
    return json({ error: "payload_too_large" }, { status: 413 }, request, env);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "invalid_json" }, { status: 400 }, request, env);
  }

  const attemptId = String(body?.attemptId || "");
  const score = Number(body?.score);
  const rating = String(body?.rating || "");
  const quizVersion = String(body?.quizVersion || "").slice(0, 64);
  if (!ATTEMPT_ID_PATTERN.test(attemptId)
    || !Number.isInteger(score)
    || score < 0
    || score > 100
    || rating !== ratingForScore(score)
    || !quizVersion) {
    return json({ error: "invalid_attempt" }, { status: 400 }, request, env);
  }

  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO quiz_attempts (attempt_id, score, rating, quiz_version)
    VALUES (?, ?, ?, ?)
  `).bind(attemptId, score, rating, quizVersion).run();
  const stats = await readStats(env.DB);
  return json(
    { ...stats, recorded: Number(result.meta?.changes || 0) === 1 },
    { headers: { "Cache-Control": "no-store" } },
    request,
    env
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/quiz-stats" && url.pathname !== "/api/quiz-stats/") {
      return json({ error: "not_found" }, { status: 404 }, request, env);
    }

    if (request.method === "OPTIONS") {
      if (!requestOriginIsAllowed(request, env)) {
        return json({ error: "origin_not_allowed" }, { status: 403 }, request, env);
      }
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (request.method === "GET") {
        return json(await readStats(env.DB), {
          headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" }
        }, request, env);
      }
      if (request.method === "POST") return await recordAttempt(request, env);
      return json({ error: "method_not_allowed" }, {
        status: 405,
        headers: { "Allow": "GET, POST, OPTIONS" }
      }, request, env);
    } catch (error) {
      console.error("quiz_stats_error", error);
      return json({ error: "stats_unavailable" }, { status: 500 }, request, env);
    }
  }
};
