const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

// Listen on all network interfaces so phones on the same hotspot/LAN can connect.
const HOST = "0.0.0.0";
const PORT = 8790; // v44: compress the large game page and shorten slow voice-connection retries
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

let db = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    console.error("Database file is invalid. Server stopped.");
    process.exit(1);
  }
}

// Remove only the test value created during our earlier test. Preserve real rooms.
if (db.roomsV23 && db.roomsV23.test === "ok") {
  delete db.roomsV23.test;
  if (Object.keys(db.roomsV23).length === 0) delete db.roomsV23;
  save();
}

function save() {
  // Use a unique temp file and retry transient Windows/OneDrive file locks.
  // Never remove or truncate the existing database before the replacement succeeds.
  const serialized = JSON.stringify(db);
  const temp = DATA_FILE + "." + process.pid + "." + Date.now() + "." +
    crypto.randomBytes(6).toString("hex") + ".tmp";
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(temp, serialized, { encoding: "utf8", flag: "wx" });
      fs.renameSync(temp, DATA_FILE);
      return;
    } catch (error) {
      lastError = error;
      try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch (_) {}
      const retryable = error && ["EPERM", "EBUSY", "EACCES", "ENOTEMPTY"].includes(error.code);
      if (!retryable || attempt === 4) break;
      // A short synchronous delay lets transient file locks clear without racing another save.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80 * (attempt + 1));
    }
  }
  console.error("[Local Mafia] Database save failed:",
    lastError && lastError.code ? lastError.code : "",
    lastError && lastError.message ? lastError.message : lastError);
  throw lastError || new Error("Unknown database save error");
}

function allowedPath(parts) {
  if (!parts.length || parts.some(p => !p || p === "." || p === "..")) {
    return false;
  }

  if (parts[0] === "roomsV23") {
    if (parts.length === 1) return true;
    if (!/^\d{5}$/.test(parts[1])) return false;
    if (parts.length === 2) return true;

    if (parts[2] === "players" || parts[2] === "chat") {
      return parts.length === 3 ||
        (parts.length === 4 && /^[A-Za-z0-9_-]{1,80}$/.test(parts[3]));
    }
    return false;
  }

  // Shared game state used to synchronize the host's match with players.
  if (parts[0] === "gameSync") {
    if (parts.length === 1) return true;
    if (!/^\d{5}$/.test(parts[1])) return false;
    if (parts.length === 2) return true;
    if (parts[2] === "actions" || parts[2] === "snapshots") {
      return parts.length === 3 ||
        (parts.length === 4 && /^[A-Za-z0-9_-]{1,80}$/.test(parts[3]));
    }
    return false;
  }

  if (parts[0] === "rooms") {
    return parts.length === 1 ||
      (/^[A-Za-z0-9_-]{1,32}$/.test(parts[1]) &&
       (parts.length === 2 ||
        (parts.length === 3 && /^[A-Za-z0-9_-]{1,80}$/.test(parts[2]))));
  }

  if (parts[0] === "godPerms") {
    return parts.length === 1 ||
      (parts.length === 2 && /^[A-Za-z0-9_-]{1,80}$/.test(parts[1]));
  }

  return false;
}

function getValue(parts) {
  let value = db;
  for (const part of parts) {
    if (value === null || typeof value !== "object") return null;
    value = value[part];
  }
  return value === undefined ? null : value;
}

function setValue(parts, value, method) {
  if (parts.length === 0) {
    if (method === "DELETE" || value === null) db = {};
    else if (method === "PATCH" && value && typeof value === "object" && !Array.isArray(value)) {
      db = { ...db, ...value };
    } else {
      db = value;
    }
    return;
  }

  let parent = db;
  for (const part of parts.slice(0, -1)) {
    if (!parent[part] || typeof parent[part] !== "object" || Array.isArray(parent[part])) {
      parent[part] = {};
    }
    parent = parent[part];
  }

  const key = parts[parts.length - 1];

  if (method === "DELETE" || value === null) {
    delete parent[key];
  } else if (method === "PATCH" && value && typeof value === "object" && !Array.isArray(value)) {
    parent[key] = {
      ...(parent[key] && typeof parent[key] === "object" ? parent[key] : {}),
      ...value
    };
  } else {
    parent[key] = value;
  }
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav"
};

// v43 intentionally does not inject a second game-sync loop; index.html already owns this logic.

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch {
    res.writeHead(400);
    return res.end("Invalid URL");
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ ok: true, database: "local", game: true }));
  }

  if (url.pathname.startsWith("/api/db/")) {
    const method = req.method.toUpperCase();

    if (!["GET", "PUT", "PATCH", "POST", "DELETE"].includes(method)) {
      res.writeHead(405);
      return res.end(JSON.stringify({ error: "Method not allowed" }));
    }

    let rawPath;
    try {
      rawPath = decodeURIComponent(url.pathname.slice("/api/db/".length));
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Invalid path" }));
    }

    if (!rawPath.endsWith(".json")) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: "Not found" }));
    }

    const parts = rawPath.slice(0, -5).split("/");
    if (!allowedPath(parts)) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: "Path not allowed" }));
    }

    if (method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(getValue(parts)));
    }

    let body = "";
    try {
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 1024 * 1024) {
          res.writeHead(413);
          return res.end(JSON.stringify({ error: "Payload too large" }));
        }
      }
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Could not read request" }));
    }

    let value = null;
    if (method !== "DELETE" && body) {
      try {
        value = JSON.parse(body);
      } catch {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    }

    if (method === "POST") {
      const parent = getValue(parts);
      if (parent !== null && (typeof parent !== "object" || Array.isArray(parent))) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Parent is not an object" }));
      }

      const id = crypto.randomBytes(8).toString("hex");
      setValue([...parts, id], value, "PUT");
      try {
        save();
      } catch (error) {
        console.error("[Local Mafia] Save failed while handling POST:", error && error.code, error && error.message);
        res.writeHead(500);
        return res.end(JSON.stringify({ error: "Save failed" }));
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ name: id }));
    }

    setValue(parts, value, method);
    try {
      save();
    } catch (error) {
      console.error("[Local Mafia] Save failed while handling " + method + ":", error && error.code, error && error.message);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: "Save failed" }));
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(getValue(parts)));
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end("Invalid URL");
  }

  if (pathname === "/") pathname = "/index.html";

  const file = path.resolve(ROOT, "." + pathname);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error("Not a file");

    const extension = path.extname(file).toLowerCase();

    // v40: config.js normally points at the Cloudflare proxy/Firebase.
    // When served by this LAN server, rewrite its initial database URL before
    // the game scripts run so room creation and joining use this same local DB.
    if (extension === ".js" && pathname === "/config.js") {
      const source = fs.readFileSync(file, "utf8");
      const routePattern = /window\.MAFIA_DB_URL\s*=\s*[\s\S]*?;/;
      const routed = source.replace(routePattern, "window.MAFIA_DB_URL = location.origin + '/api/db';");
      if (routed === source) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Local database routing could not patch config.js safely. Original file was not changed.");
      }
      res.writeHead(200, { "Content-Type": mime[extension] || "application/octet-stream", "Cache-Control": "no-store" });
      return res.end(routed);
    }

    // Speed up initial mobile loading: index.html is a large inline-script bundle.
    // Also shorten the sequential PeerJS/CDN and signaling timeouts that can stall room entry.
    if (extension === ".html" && pathname === "/index.html") {
      let html = fs.readFileSync(file, "utf8");
      const timingPatches = [
        [
          "const tm=setTimeout(()=>fin(false),7000);",
          "const tm=setTimeout(()=>fin(false),4500);"
        ],
        [
          "const tm=setTimeout(()=>{lastPeerError='timeout';fin(undefined)},12000);",
          "const tm=setTimeout(()=>{lastPeerError='timeout';fin(undefined)},8000);"
        ],
        [
          "for(let retry=0;r===undefined&&retry<2;retry++)",
          "for(let retry=0;r===undefined&&retry<1;retry++)"
        ]
      ];
      for (const [before, after] of timingPatches) {
        if (html.includes(before)) html = html.replace(before, after);
        else console.warn("[Local Mafia v44] Timing patch pattern not found:", before);
      }
      html += "\n<script>console.info('[Local Mafia v44] compressed page and faster voice retries enabled');</script>\n";

      const body = Buffer.from(html, "utf8");
      const acceptsGzip = /\bgzip\b/i.test(String(req.headers["accept-encoding"] || ""));
      if (acceptsGzip) {
        const compressed = zlib.gzipSync(body, { level: zlib.constants.Z_BEST_SPEED });
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Encoding": "gzip",
          "Vary": "Accept-Encoding",
          "Content-Length": compressed.length,
          "Cache-Control": "no-store"
        });
        return res.end(compressed);
      }
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      return res.end(body);
    }

    res.writeHead(200, {
      "Content-Type": mime[extension] || "application/octet-stream"
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("File not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log("Black Mafia local server v44 listening at http://" + HOST + ":" + PORT);
  console.log("Health check on this computer: http://127.0.0.1:" + PORT + "/health");
  console.log("Data file: " + DATA_FILE);
  console.log("For phones on the same hotspot/Wi-Fi, open http://<COMPUTER-IP>:" + PORT);
  console.log("Game page uses gzip when supported; local database and original game sync are preserved.");
  console.log("Keep this window open while playing.");
});