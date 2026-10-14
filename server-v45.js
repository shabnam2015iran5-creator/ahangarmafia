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

const SINGLE_PATH_SYNC_SCRIPT = String.raw`<script id="bm-single-path-sync-v45">
(() => {
  if (window.__bmSinglePathSyncInstalled) return;
  window.__bmSinglePathSyncInstalled = true;

  const base = () => String(window.MAFIA_DB_URL || "").replace(/\/$/, "");
  const code = () => String(window.MAFIA_ROOM_CODE || "").replace(/\D/g, "").slice(0, 5);
  const uid = () => { try { return localStorage.getItem("mafia_uid") || ""; } catch (_) { return ""; } };
  const inGame = () => !!(document.body && document.body.classList.contains("ingame"));
  const isGod = () =>
    (typeof lobbyMode !== "undefined" && lobbyMode === "god") ||
    (typeof role !== "undefined" && role === "god");
  const isPlayer = () =>
    (typeof lobbyMode !== "undefined" && lobbyMode === "player") ||
    (typeof role !== "undefined" && role === "player");

  const state = window.__bmSinglePathState = {
    version: 45, room: "", lastError: "", lastRoomStatus: "",
    lastHostSyncAt: 0, snapshotCount: 0, activePlayers: 0,
    lastClientSnapshotAt: 0, startRequestedAt: 0
  };
  let startBusy = false, hostBusy = false, clientBusy = false;
  let startDeadline = 0, appliedSnapshotText = "", voiceReady = false;

  const request = async (path, method = "GET", data) => {
    const endpoint = base();
    if (!endpoint) throw new Error("آدرس دیتابیس محلی تنظیم نشده است.");
    const response = await fetch(endpoint + "/" + path + ".json", {
      method,
      headers: { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      cache: "no-store"
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error("Database HTTP " + response.status + " (" + method + " " + path + "): " + body.slice(0, 180));
    }
    return method === "GET" ? response.json() : true;
  };

  function showToast(message) {
    try { if (typeof toast === "function") toast(message); } catch (_) {}
  }

  function syncControls() {
    const ready = document.getElementById("readyBtn");
    if (ready) ready.style.display = "none";
    if (typeof lobbyReady !== "undefined" && isPlayer()) lobbyReady = true;

    const button = document.getElementById("roomStartBtn");
    if (button) {
      const host = isGod();
      const live = typeof started !== "undefined" && !!started;
      button.style.display = host ? "inline-flex" : "none";
      button.disabled = !host || startBusy || live;
      button.setAttribute("aria-hidden", host ? "false" : "true");
      if (host) button.textContent = live ? "✅ بازی شروع شد" :
        (startBusy ? "⏳ در حال شروع..." : "🎭 شروع بازی");
    }
    if (isGod() && typeof started !== "undefined" && started) {
      startBusy = false;
      startDeadline = 0;
    } else if (startBusy && startDeadline && Date.now() > startDeadline) {
      startBusy = false;
      startDeadline = 0;
      state.lastError = "شروع بازی در زمان مورد انتظار کامل نشد.";
      showToast(state.lastError);
    }
  }

  window.toggleLobbyReady = function () {
    if (typeof lobbyReady !== "undefined") lobbyReady = true;
    syncControls();
    return true;
  };

  // Player gameplay actions go through the same local database as snapshots.
  window.__bmQueueFirebaseAction = async function (action) {
    const c = code(), u = uid();
    if (!c || !u || !action || !action.aid || isGod()) return false;
    try {
      await request("gameSync/" + c + "/actions/" + encodeURIComponent(u), "PATCH", {
        act: action, actId: action.aid, actAt: Date.now()
      });
      return true;
    } catch (error) {
      state.lastError = String(error && error.message || error);
      console.warn("[Black Mafia v45] Player action save failed", error);
      return false;
    }
  };

  // One start signal: the host writes it, every player watches the same room record.
  const originalStart = window.roomStartGame;
  window.roomStartGame = async function (...args) {
    if (!isGod()) {
      if (typeof lobbyReady !== "undefined") lobbyReady = true;
      showToast("منتظر شروع بازی توسط گرداننده باشید.");
      return false;
    }
    if (startBusy || (typeof started !== "undefined" && started)) return false;
    const c = code();
    if (!c || typeof originalStart !== "function") {
      state.lastError = "کد اتاق یا فرمان شروع بازی پیدا نشد.";
      showToast(state.lastError);
      return false;
    }

    startBusy = true;
    startDeadline = Date.now() + 18000;
    state.startRequestedAt = Date.now();
    state.lastError = "";
    syncControls();

    try {
      const nonce = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
      await request("roomsV23/" + c, "PATCH", {
        status: "started", startedAt: Date.now(), updatedAt: Date.now(), startNonce: nonce
      });
      const confirmation = await request("roomsV23/" + c);
      if (!confirmation || confirmation.status !== "started") {
        throw new Error("وضعیت شروع بازی در دیتابیس تأیید نشد.");
      }

      const result = originalStart.apply(this, args);
      Promise.resolve(result).catch(error => {
        state.lastError = String(error && error.message || error);
        console.error("[Black Mafia v45] Host start failed", error);
      });

      // The local game engine needs its normal scenario launch; the database signal
      // makes players enter the same game screen without waiting for PeerJS.
      setTimeout(() => {
        try {
          if (isGod() && typeof started !== "undefined" && !started &&
              typeof G !== "undefined" && !G.loading && typeof window.launch === "function") {
            window.launch(0);
          }
        } catch (error) {
          state.lastError = String(error && error.message || error);
          console.error("[Black Mafia v45] Scenario launch failed", error);
        }
      }, 160);
      return result;
    } catch (error) {
      state.lastError = String(error && error.message || error);
      console.error("[Black Mafia v45] Start signal failed", error);
      try { await request("roomsV23/" + c, "PATCH", { status: "waiting", updatedAt: Date.now() }); } catch (_) {}
      startBusy = false;
      startDeadline = 0;
      syncControls();
      showToast("شروع بازی ثبت نشد: " + state.lastError);
      return false;
    }
  };

  async function hostSync(c) {
    if (hostBusy || !c || !isGod() || !inGame() ||
        typeof started === "undefined" || !started ||
        !window.Net || typeof Net.snapshotForUID !== "function") return;
    hostBusy = true;
    try {
      const players = await request("roomsV23/" + c + "/players") || {};
      if (typeof players !== "object") throw new Error("فهرست بازیکنان نامعتبر است.");
      if (typeof Net.reconcileFirebasePlayers === "function") Net.reconcileFirebasePlayers(players);

      const actions = await request("gameSync/" + c + "/actions") || {};
      const tick = Date.now();
      for (const [playerUid, item] of Object.entries(actions)) {
        const player = players[playerUid];
        if (!item || !item.act || !item.actId || item.handledId === item.actId ||
            !player || player.role === "god" || tick - (+player.at || 0) > 20000 ||
            tick - (+item.actAt || 0) > 25000) continue;
        try {
          if (Net.handleFirebaseAction(playerUid, item.act)) {
            await request("gameSync/" + c + "/actions/" + encodeURIComponent(playerUid),
              "PATCH", { handledId: item.actId });
          }
        } catch (error) {
          console.warn("[Black Mafia v45] Could not apply player action", error);
        }
      }

      const snapshots = {};
      const livePlayers = Object.entries(players).filter(([playerUid, player]) =>
        player && player.role !== "god" && tick - (+player.at || 0) <= 20000
      );
      for (const [playerUid] of livePlayers) {
        try {
          const snapshot = Net.snapshotForUID(playerUid);
          if (snapshot && snapshot.my >= 0 && Array.isArray(snapshot.seats)) {
            snapshots[playerUid] = snapshot;
          }
        } catch (error) {
          console.warn("[Black Mafia v45] Snapshot creation failed for", playerUid, error);
        }
      }

      if (Object.keys(snapshots).length) {
        await request("gameSync/" + c + "/snapshots", "PUT", snapshots);
      }
      state.room = c;
      state.activePlayers = livePlayers.length;
      state.snapshotCount = Object.keys(snapshots).length;
      state.lastHostSyncAt = Date.now();
      if (!Object.keys(snapshots).length) {
        state.lastError = "هنوز صندلی بازیکنان به شناسه‌هایشان وصل نشده است.";
      } else {
        state.lastError = "";
      }
    } catch (error) {
      state.lastError = String(error && error.message || error);
      console.warn("[Black Mafia v45] Shared game sync failed", error);
    } finally {
      hostBusy = false;
    }
  }

  async function playerSync(c) {
    if (clientBusy || !c || !isPlayer() || !window.Net) return;
    clientBusy = true;
    try {
      const room = await request("roomsV23/" + c);
      state.lastRoomStatus = String(room && room.status || "");
      if (!room || room.status !== "started") return;

      if (typeof Net.isClient !== "function" || !Net.isClient()) {
        if (typeof lobbyReady !== "undefined") lobbyReady = true;
        Net.enter();
      }

      if (typeof Net.isClient === "function" && Net.isClient()) {
        const u = uid();
        if (!u) return;
        const snapshot = await request("gameSync/" + c + "/snapshots/" + encodeURIComponent(u));
        if (snapshot && Array.isArray(snapshot.seats) &&
            typeof Net.receiveFirebaseSnapshot === "function") {
          const serialized = JSON.stringify(snapshot);
          if (serialized !== appliedSnapshotText) {
            appliedSnapshotText = serialized;
            Net.receiveFirebaseSnapshot(snapshot);
            state.lastClientSnapshotAt = Date.now();
            state.lastError = "";
          }
        }
      }
    } catch (error) {
      state.lastError = String(error && error.message || error);
      console.warn("[Black Mafia v45] Player sync failed", error);
    } finally {
      clientBusy = false;
    }
  }

  async function tick() {
    syncControls();
    const c = code();
    if (!c || !base()) return;
    state.room = c;
    if (isGod()) {
      if (typeof started !== "undefined" && started) await hostSync(c);
      return;
    }
    if (isPlayer()) await playerSync(c);
  }

  setInterval(() => { tick().catch(error => {
    state.lastError = String(error && error.message || error);
    console.warn("[Black Mafia v45] Tick failed", error);
  }); }, 450);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  syncControls();
  console.info("[Black Mafia v45] Single local-database start and snapshot path installed.");
})();
</script>`;

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
      const removeIds = ["v23-room-js","bm-shared-game-start","bm-lobby-controls-restore-js","bm-one-lobby-js","bm-unified-start-js","bm-firebase-game-sync-v1"];
      for (const id of removeIds) {
        const marker = 'id="' + id + '"';
        const markerAt = html.indexOf(marker);
        if (markerAt < 0) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("Local single-path patch failed: missing " + id);
        }
        const startAt = html.lastIndexOf("<script", markerAt);
        const openEnd = html.indexOf(">", markerAt);
        const closeAt = html.indexOf("</script>", openEnd);
        if (startAt < 0 || openEnd < 0 || closeAt < 0) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("Local single-path patch failed to remove " + id);
        }
        html = html.slice(0, startAt) + html.slice(closeAt + 9);
      }

      const requiredReplace = (before, after, label) => {
        const at = html.indexOf(before);
        if (at < 0 || html.indexOf(before, at + before.length) >= 0) {
          throw new Error("Single-path replacement failed: " + label);
        }
        html = html.slice(0, at) + after + html.slice(at + before.length);
      };
      try {
        requiredReplace(
          "async function autoRoom(kind){\\n    if(!validProfile()",
          "async function autoRoom(kind){\\n    const requestedGod = lobbyMode === 'god';\\n    if(!validProfile()",
          "capture selected role"
        );
        const roomChoicePattern = /let c='',createNew=!active\\.length;[\\s\\S]*?lobbyReady=!asGod;/;
        const roomChoiceMatches = html.match(roomChoicePattern);
        if (!roomChoiceMatches || html.match(new RegExp(roomChoicePattern.source, "g")).length !== 1) {
          throw new Error("Single-path replacement failed: room selection");
        }
        html = html.replace(roomChoicePattern,
          "let c='',createNew=requestedGod;\\n    if (requestedGod) {\\n      createNew=true;\\n    } else if (active.length) {\\n      c=String(active[0].code);\\n      createNew=false;\\n    } else {\\n      toast('اتاق فعالی نیست؛ ابتدا گرداننده وارد همان لابی شود.');\\n      return;\\n    }\\n    const asGod=requestedGod;\\n    lobbyMode=asGod?'god':'player';window.lobbyMode=lobbyMode;\\n    lobbyReady=!asGod;");
        requiredReplace("lobbyReady=false;$(\'readyBtn\').style.display=lobbyMode===\'player\'?\'inline-block\':\'none\';",
          "lobbyReady=true;$(\'readyBtn\').style.display=\'none\';", "implicit ready");
        requiredReplace("if(lobbyMode===\'player\'&&!lobbyReady){toast(\'اول روی «آماده‌ام» بزنید\');return}",
          "if(lobbyMode===\'player\')lobbyReady=true;", "remove ready gate");
        requiredReplace("const gs=Voice.godSlot();if(gs)Voice.send(gs,m);",
          "/* Game actions use the shared local database only. */", "player actions");
        requiredReplace("function bcast(m){if(role===\'god\'&&Voice.active())Voice.broadcast(m)}",
          "function bcast(m){}", "game state broadcast");
        requiredReplace("window.roomStartGame=function(){\\n  if(lobbyMode===\'god\'){Voice.broadcast({t:\'go\'});const r=_rsg();Net.hostStart();return r}\\n  if(Voice.active()&&Voice.godHere()){toast(\'منتظر شروع بازی توسط گرداننده باشید\');return}\\n  return _rsg()};\\n Voice.onGo(()=>{if(document.getElementById(\'lobbyRoom\').classList.contains(\'on\')&&lobbyMode===\'player\'){lobbyReady=true;Net.enter()}});",
          "window.roomStartGame=function(){\\n  if(lobbyMode===\'god\'){return _rsg()}\\n  lobbyReady=true;\\n  try{toast(\'منتظر شروع بازی توسط گرداننده باشید\')}catch(e){}\\n  return false;\\n};", "single start trigger");
        requiredReplace("setTimeout(()=>{ov.classList.remove(\'s\');try{next()}catch(e){console.error(e)}},2000)",
          "setTimeout(()=>{ov.classList.remove(\'s\');try{next()}catch(e){console.error(e)}},250)", "entry loading");
        requiredReplace("setTimeout(()=>{cl(\'ovLoad\');G.loading=false;if(role)godStart(si)},2000)",
          "setTimeout(()=>{cl(\'ovLoad\');G.loading=false;if(role)godStart(si)},650)", "game launch delay");
      } catch (error) {
        console.error("[Local Mafia v45] HTML patch failed", error);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Local v45 HTML patch failed: " + String(error.message || error));
      }
      html = html.replace("</head>", '<style id="bm-no-ready-v45">#readyBtn{display:none!important;visibility:hidden!important;pointer-events:none!important}</style>\\n</head>');
      html += SINGLE_PATH_SYNC_SCRIPT;
      html += "\\n<script>console.info('[Local Mafia v45] Single local database start/sync active');</script>\\n";

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
  console.log("Black Mafia local server v45 listening at http://" + HOST + ":" + PORT);
  console.log("Health check on this computer: http://127.0.0.1:" + PORT + "/health");
  console.log("Data file: " + DATA_FILE);
  console.log("For phones on the same hotspot/Wi-Fi, open http://<COMPUTER-IP>:" + PORT);
  console.log("One local database route controls room entry, game start, snapshots, and player actions.");
  console.log("Keep this window open while playing.");
});