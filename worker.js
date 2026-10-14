const DB = "https://black-mafia-online-default-rtdb.firebaseio.com";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}

const ALLOWED_ORIGINS = new Set([
  "https://mafia-game-server.nova-d9d04c.workers.dev",
  "https://shabnam2015iran5-creator.github.io"
]);

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function allowedPath(path) {
  const p = path.replace(/\.json$/, "").split("/");
  if (p.some(x => !x || x === "." || x === "..")) return false;

  if (p[0] === "roomsV23") {
    if (p.length === 1) return true;
    if (!/^\d{5}$/.test(p[1])) return false;
    if (p.length === 2) return true;
    if (p[2] === "players") {
      return p.length === 3 || (p.length === 4 && /^[A-Za-z0-9_-]{1,80}$/.test(p[3]));
    }
    if (p[2] === "chat") {
      return p.length === 3 || (p.length === 4 && /^[A-Za-z0-9_-]{1,80}$/.test(p[3]));
    }
    return false;
  }

  if (p[0] === "gameSync") {
    if (p.length === 1) return true;
    if (!/^\d{5}$/.test(p[1])) return false;
    if (p.length === 2) return true;
    if (!["snapshots", "actions"].includes(p[2])) return false;
    return p.length === 3 || (p.length === 4 && /^[A-Za-z0-9_-]{1,80}$/.test(p[3]));
  }

  if (p[0] === "rooms") {
    if (p.length === 1) return true;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(p[1])) return false;
    return p.length === 2 || (p.length === 3 && /^[A-Za-z0-9_-]{1,80}$/.test(p[2]));
  }

  if (p[0] === "godPerms") {
    return p.length === 1 || (p.length === 2 && /^[A-Za-z0-9_-]{1,80}$/.test(p[1]));
  }

  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/db/")) {
      return env.ASSETS.fetch(request);
    }

    const method = request.method.toUpperCase();
    const origin = request.headers.get("Origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403);

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!["GET", "PUT", "PATCH", "POST", "DELETE"].includes(method)) {
      return json({ error: "Method not allowed" }, 405, { "Allow": "GET, PUT, PATCH, POST, DELETE, OPTIONS" });
    }

    const rawPath = url.pathname.slice("/api/db/".length);
    if (!rawPath.endsWith(".json") || !allowedPath(rawPath)) {
      return json({ error: "Path not allowed" }, 404);
    }

    let body;
    if (method !== "GET" && method !== "DELETE") {
      const declaredLength = Number(request.headers.get("Content-Length") || 0);
      if (declaredLength > 65536) return json({ error: "Payload too large" }, 413);
      body = await request.text();
      if (body.length > 65536) return json({ error: "Payload too large" }, 413);
      if (body) {
        try { JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400); }
      }
    }

    const upstreamUrl = DB + "/" + rawPath;
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body || undefined,
        redirect: "follow"
      });
    } catch {
      return json({ error: "Database connection failed" }, 502);
    }

    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "no-store");
    headers.delete("Access-Control-Allow-Origin");
    for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
