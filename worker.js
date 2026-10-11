const DB = "https://black-mafia-online-default-rtdb.firebaseio.com";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

// Firebase REST paths end in ".json". Validate the path WITHOUT that suffix.
// The previous version checked the suffix as part of the final path segment,
// so roomsV23/12345.json and roomsV23/12345/players.json were rejected.
function allowedPath(rawPath) {
  if (!rawPath || !rawPath.endsWith(".json")) return false;

  const cleanPath = rawPath.slice(0, -5);
  const p = cleanPath.split("/");
  if (p.some(x => !x || x === "." || x === ".." || x.includes("."))) return false;

  // Five-digit room IDs; permit room data and nested game/session state,
  // not just the players collection. This lets host start-state updates reach
  // the same Firebase room for every connected device.
  if (p[0] === "roomsV23") {
    if (p.length === 1) return true;
    if (!/^\d{5}$/.test(p[1])) return false;
    return p.length <= 8 && p.slice(2).every(x => /^[A-Za-z0-9_-]{1,80}$/.test(x));
  }

  if (p[0] === "rooms") {
    if (p.length === 1) return true;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(p[1])) return false;
    return p.length <= 8 && p.slice(2).every(x => /^[A-Za-z0-9_-]{1,80}$/.test(x));
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

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": url.origin,
          "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin"
        }
      });
    }

    if (!["GET", "PUT", "PATCH", "POST", "DELETE"].includes(method)) {
      return json({ error: "Method not allowed" }, 405, {
        "Allow": "GET, PUT, PATCH, POST, DELETE, OPTIONS"
      });
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return json({ error: "Origin not allowed" }, 403);
    }

    const rawPath = url.pathname.slice("/api/db/".length);
    if (!allowedPath(rawPath)) {
      return json({ error: "Path not allowed" }, 404);
    }

    let body;
    if (method !== "GET" && method !== "DELETE") {
      const declaredLength = Number(request.headers.get("Content-Length") || 0);
      if (declaredLength > 262144) return json({ error: "Payload too large" }, 413);

      body = await request.text();
      if (body.length > 262144) return json({ error: "Payload too large" }, 413);

      if (body) {
        try {
          JSON.parse(body);
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
      }
    }

    const upstreamUrl = DB + "/" + rawPath + url.search;
    let upstream;

    try {
      const headers = new Headers();
      const accept = request.headers.get("Accept");
      if (accept) headers.set("Accept", accept);
      if (body) headers.set("Content-Type", "application/json");

      upstream = await fetch(upstreamUrl, {
        method,
        headers,
        body: body || undefined,
        redirect: "follow"
      });
    } catch {
      return json({ error: "Database connection failed" }, 502);
    }

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("Access-Control-Allow-Origin", url.origin);
    responseHeaders.set("Vary", "Origin");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  }
};
