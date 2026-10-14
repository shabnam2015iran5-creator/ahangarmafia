const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Listen on all network interfaces so phones on the same hotspot/LAN can connect.
const HOST = "0.0.0.0";
const PORT = 8790; // v38: local database routing fix
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
  const temp = DATA_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db), "utf8");
  fs.renameSync(temp, DATA_FILE);
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

const LAN_GAME_SYNC_PATCH = String.raw`
<script id="bm-local-db-game-sync-v37">
(() => {
  if (window.__bmLocalDbGameSyncV37) return;
  window.__bmLocalDbGameSyncV37 = true;
  const db = () => String(window.MAFIA_DB_URL || '').replace(/\/$/, '');
  const code = () => String(window.MAFIA_ROOM_CODE || '').replace(/\D/g, '').slice(0, 5);
  const uid = () => { try { return localStorage.getItem('mafia_uid') || ''; } catch (_) { return ''; } };
  const isGod = () => (typeof lobbyMode !== 'undefined' && lobbyMode === 'god') ||
    (typeof role !== 'undefined' && role === 'god');
  const isPlayer = () => (typeof lobbyMode !== 'undefined' && lobbyMode === 'player') ||
    (typeof role !== 'undefined' && role === 'player');
  const isStarted = () => typeof started !== 'undefined' && !!started;
  const inGame = () => !!(document.body && document.body.classList.contains('ingame'));

  // v37: the legacy unified-start handler reopens the waiting-room overlay
  // for the moderator immediately after starting. Keep the host on the game
  // screen; players will keep waiting until their first real snapshot arrives.
  if (!window.__bmLocalGodOverlayFixV37 && typeof window.roomStartGame === 'function') {
    window.__bmLocalGodOverlayFixV37 = true;
    const priorRoomStartGame = window.roomStartGame;
    window.roomStartGame = async function(...args) {
      const startedByGod = isGod();
      const result = await priorRoomStartGame.apply(this, args);
      if (startedByGod) {
        const hideWaitingOverlay = () => {
          const lobby = document.getElementById('lobbyRoom');
          if (lobby && inGame()) lobby.classList.remove('on', 'bm-start-wait');
        };
        hideWaitingOverlay();
        // Re-apply after the legacy handler's scheduled lobby/launch callbacks.
        [120, 500, 1200, 2200].forEach(delay => setTimeout(hideWaitingOverlay, delay));
      }
      return result;
    };
  }
  const req = async (path, method = 'GET', data) => {
    const endpoint = db();
    if (!endpoint) throw new Error('Database URL is missing');
    const response = await fetch(endpoint + '/' + path + '.json', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Database HTTP ' + response.status + ' for ' + path);
    return method === 'GET' ? response.json() : true;
  };

  let hostBusy = false;
  let clientBusy = false;
  let startBusy = false;
  let startCheckBusy = false;
  let seenStartedCode = '';
  let lastForceLaunch = 0;

  // Send player actions through the local database as a backup when peer voice/data is unavailable.
  window.__bmQueueFirebaseAction = async action => {
    const c = code(), u = uid();
    if (!c || !u || !db() || !action || !action.aid || isGod()) return false;
    try {
      await req('gameSync/' + c + '/actions/' + encodeURIComponent(u), 'PATCH', {
        act: action, actId: action.aid, actAt: Date.now()
      });
      return true;
    } catch (error) {
      console.warn('[Local Mafia] Backup action delivery failed', error);
      return false;
    }
  };

  // The host publishes one personalized game snapshot for every live player.
  async function hostSync() {
    const c = code();
    if (hostBusy || !c || !db() || !window.Net || !isGod() || !inGame()) return;
    hostBusy = true;
    try {
      try { if (window.Voice && Voice.active()) Voice.patchSeats(); } catch (_) {}
      const players = await req('roomsV23/' + c + '/players');
      if (!players || typeof players !== 'object') return;
      if (typeof Net.reconcileFirebasePlayers === 'function') Net.reconcileFirebasePlayers(players);

      // Handle database-delivered actions only once, even if peer connections are down.
      const actions = await req('gameSync/' + c + '/actions');
      const now = Date.now();
      for (const [playerUid, item] of Object.entries(actions || {})) {
        const player = players[playerUid];
        if (!item || !item.act || !item.actId || item.handledId === item.actId ||
            !player || player.role === 'god') continue;
        if (now - (+player.at || 0) > 15000 || now - (+item.actAt || 0) > 25000) continue;
        let done = false;
        try {
          if (typeof Net.handleFirebaseAction === 'function') {
            done = !!Net.handleFirebaseAction(playerUid, item.act);
          }
        } catch (error) { console.warn('[Local Mafia] Could not apply player action', error); }
        if (done) {
          try {
            await req('gameSync/' + c + '/actions/' + encodeURIComponent(playerUid), 'PATCH', { handledId: item.actId });
          } catch (_) {}
        }
      }

      const snapshots = {};
      for (const [playerUid, player] of Object.entries(players)) {
        if (!player || player.role === 'god' || now - (+player.at || 0) > 15000) continue;
        try {
          const snapshot = typeof Net.snapshotForUID === 'function' ? Net.snapshotForUID(playerUid) : null;
          if (snapshot && snapshot.my >= 0 && Array.isArray(snapshot.seats)) snapshots[playerUid] = snapshot;
        } catch (error) { console.warn('[Local Mafia] Snapshot creation failed for a player', error); }
      }
      await req('gameSync/' + c + '/snapshots', 'PUT', snapshots);
    } catch (error) {
      console.warn('[Local Mafia] Host sync failed', error);
    } finally {
      hostBusy = false;
    }
  }

  // Players can enter on the shared database start signal; peer voice is optional, not a gate.
  async function checkSharedStart() {
    const c = code(), endpoint = db();
    if (!c || !endpoint || !isPlayer() || startCheckBusy) return;
    startCheckBusy = true;
    try {
      const response = await fetch(endpoint + '/roomsV23/' + encodeURIComponent(c) + '.json', { cache: 'no-store' });
      if (!response.ok) return;
      const room = await response.json();
      if (!room || room.status !== 'started') {
        if (seenStartedCode === c) seenStartedCode = '';
        return;
      }
      seenStartedCode = c;
      const alreadyClient = !!(window.Net && typeof Net.isClient === 'function' && Net.isClient());
      if (window.Net && typeof Net.enter === 'function' && (!alreadyClient || !inGame())) {
        window.lobbyReady = true;
        Net.enter();
      }
    } catch (error) {
      console.warn('[Local Mafia] Shared start check failed', error);
    } finally {
      startCheckBusy = false;
    }
  }

  // Clients poll their snapshot from the same local database, so PeerJS connectivity is not required to display the match.
  async function clientSync() {
    const c = code(), u = uid();
    if (clientBusy || !c || !u || !db() || !window.Net || !isPlayer() || !Net.isClient()) return;
    clientBusy = true;
    try {
      const snapshot = await req('gameSync/' + c + '/snapshots/' + encodeURIComponent(u));
      if (snapshot && Array.isArray(snapshot.seats) && typeof Net.receiveFirebaseSnapshot === 'function') {
        Net.receiveFirebaseSnapshot(snapshot);
      }
    } catch (_) {
      // It is normal for the snapshot not to exist until the host starts syncing.
    } finally {
      clientBusy = false;
    }
  }

  function fixStartOverlays() {
    const lobby = document.getElementById('lobbyRoom');
    if (!lobby || !inGame()) return;
    let clientStarted = false;
    try {
      if (isGod()) clientStarted = isStarted();
      else if (window.Net && typeof Net.snapshot === 'function') {
        const snap = Net.snapshot();
        clientStarted = !!(snap && snap.st && typeof Net.lastSyncAt === 'function' && Date.now() - Net.lastSyncAt() < 6500);
      }
    } catch (_) {}
    if (clientStarted) lobby.classList.remove('on', 'bm-start-wait');
  }

  // If a legacy wrapper leaves the host in the waiting overlay, restore the real game view once it starts.
  setInterval(() => {
    const c = code();
    if (c && db() && isGod() && inGame() && !isStarted() && !startBusy && !
        (typeof G !== 'undefined' && G.loading) && typeof window.launch === 'function' && Date.now() - lastForceLaunch > 5000) {
      req('roomsV23/' + c, 'GET').then(room => {
        if (room && room.status === 'started' && !isStarted() && !(typeof G !== 'undefined' && G.loading)) {
          lastForceLaunch = Date.now();
          try { window.launch(0); } catch (error) { console.error('[Local Mafia] Fallback launch failed', error); }
        }
      }).catch(() => {});
    }
    fixStartOverlays();
  }, 250);

  setInterval(() => {
    hostSync();
    clientSync();
    checkSharedStart();
  }, 650);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { hostSync(); clientSync(); checkSharedStart(); fixStartOverlays(); }
  });
  console.info('[Local Mafia v37] Database start/snapshot sync and moderator overlay fix installed.');
})();
</script>
`;

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
      } catch {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: "Save failed" }));
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ name: id }));
    }

    setValue(parts, value, method);
    try {
      save();
    } catch {
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
    res.writeHead(200, {
      "Content-Type": mime[extension] || "application/octet-stream"
    });
    if (extension === ".html" && pathname === "/index.html") {
      // Inject the LAN database routing and synchronization patches after all legacy scripts.
      const html = fs.readFileSync(file, "utf8");
      const LOCAL_DB_ROUTING_PATCH = String.raw`
<script id="bm-local-db-routing-v38">
(() => {
  window.MAFIA_DB_URL = location.origin + '/api/db';
  console.info('[Local Mafia v38] Using this LAN server for shared room/game state.');
})();
</script>
`;
      return res.end(html + "\n" + LOCAL_DB_ROUTING_PATCH + LAN_GAME_SYNC_PATCH);
    }
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("File not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log("Game and local database listening at http://" + HOST + ":" + PORT);
  console.log("Health check on this computer: http://127.0.0.1:" + PORT + "/health");
  console.log("Data file: " + DATA_FILE);
  console.log("For phones on the same hotspot/Wi-Fi, open http://<COMPUTER-IP>:" + PORT);
  console.log("Keep this window open while playing.");
});