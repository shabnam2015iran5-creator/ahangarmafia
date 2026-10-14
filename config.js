/* Database routing with failover: use the Cloudflare proxy first, then Firebase REST
   if the proxy is blocked or is serving only static assets on a particular network. */
const MAFIA_WORKER_HOST = 'mafia-game-server.nova-d9d04c.workers.dev';
const MAFIA_DB_PROXY = 'https://' + MAFIA_WORKER_HOST + '/api/db';
const MAFIA_DB_DIRECT = 'https://black-mafia-online-default-rtdb.firebaseio.com';
window.MAFIA_DB_URL = (location.hostname === MAFIA_WORKER_HOST)
  ? '/api/db'
  : MAFIA_DB_PROXY;

/* Only intercept database-proxy requests. Other fetches (PeerJS/CDNs/etc.) are untouched.
   A short timeout prevents a blocked proxy from holding up lobby entry on mobile networks. */
if (!window.__MAFIA_DB_FETCH_FAILOVER && typeof window.fetch === 'function') {
  window.__MAFIA_DB_FETCH_FAILOVER = true;
  const mafiaNativeFetch = window.fetch.bind(window);
  let mafiaProxyDownUntil = 0;
  window.fetch = async function(input, init) {
    let target;
    try {
      const raw = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
      target = new URL(raw, location.href);
    } catch (_) {}
    if (!target || target.hostname !== MAFIA_WORKER_HOST || !target.pathname.startsWith('/api/db/')) {
      return mafiaNativeFetch(input, init);
    }

    const directUrl = MAFIA_DB_DIRECT + target.pathname.slice('/api/db'.length) + target.search;
    if (Date.now() < mafiaProxyDownUntil) {
      try { return await mafiaNativeFetch(directUrl, init); }
      catch (directError) { mafiaProxyDownUntil = 0; }
    }

    let proxied = null;
    try {
      const options = init ? { ...init } : {};
      let timer = null;
      if (!options.signal && typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        options.signal = controller.signal;
        timer = setTimeout(() => controller.abort(), 2800);
      }
      try { proxied = await mafiaNativeFetch(input, options); }
      finally { if (timer !== null) clearTimeout(timer); }

      const type = proxied.headers.get('content-type') || '';
      const jsonResponse = /json/i.test(type);
      const shouldFallback = !proxied.ok || !jsonResponse;
      if (!shouldFallback) {
        mafiaProxyDownUntil = 0;
        return proxied;
      }
    } catch (_) {
      /* The intermediary may be unreachable or filtered on this carrier. */
    }

    try {
      const direct = await mafiaNativeFetch(directUrl, init);
      mafiaProxyDownUntil = Date.now() + 20000;
      return direct;
    } catch (directError) {
      if (proxied) return proxied;
      throw directError;
    }
  };
}

// TURN servers Open Relay:
window.MAFIA_TURN=[
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:80?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turns:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'}
];
window.MAFIA_ADMIN_PASS='1234';    // رمز پنل مدیر؛ حتماً عوضش کن
window.MAFIA_BP_ADMIN_PASS='00100900'; // رمز مرکز مدیریت؛ حتماً عوضش کن

// حالت «فقط یک اتاق»: همهٔ بازیکن‌ها با ورود از در، مستقیم وارد یک اتاق مشترک می‌شوند (بدون کد و بدون Firebase).
// برای برگشت به ساخت اتاق با کد، false بگذار.
window.MAFIA_SINGLE_ROOM=false;
window.MAFIA_ROOM_NAME='main';
window.MAFIA_ONE_ROOM_ALL=true;
