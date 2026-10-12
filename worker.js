const DB = "https://black-mafia-online-default-rtdb.firebaseio.com";
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}})}
function keyOf(value){return Array.from(new TextEncoder().encode(String(value||"").trim().toLocaleLowerCase()),b=>b.toString(16).padStart(2,"0")).join("")}
async function dbRead(path,withEtag=false){const r=await fetch(DB+"/"+path+".json",{headers:withEtag?{"X-Firebase-ETag":"true"}:{}});const data=await r.json().catch(()=>null);if(!r.ok)throw Error("Database read failed: "+r.status);return{data,etag:r.headers.get("ETag")}}
async function dbWrite(path,method,data,headers={}){const r=await fetch(DB+"/"+path+".json",{method,headers:{"Content-Type":"application/json",...headers},body:data===undefined?undefined:JSON.stringify(data)});return{ok:r.ok,status:r.status,data:await r.json().catch(()=>null),etag:r.headers.get("ETag")}}
function activeBan(b){return!!b&&(b.type==="permanent"||!Number(b.until)||Number(b.until)>Date.now())}
async function banFor({uid,nick,account}){for(const p of["bansV1/"+uid,"bansByNameV1/"+keyOf(nick),"bansByAccountV1/"+keyOf(account)]){const b=(await dbRead(p)).data;if(activeBan(b))return b}return null}
async function reserveIndex(path,uid){for(let i=0;i<3;i++){const c=await dbRead(path,true);if(c.data&&c.data.uid!==uid)return false;if(c.data&&c.data.uid===uid)return true;const w=await dbWrite(path,"PUT",{uid,createdAt:Date.now()},{"If-Match":c.etag||"null_etag"});if(w.ok)return true;if(w.status!==412)return false}const c=await dbRead(path);return !!(c.data&&c.data.uid===uid)}
async function nextSerial(){for(let i=0;i<12;i++){const c=await dbRead("registeredCountV1",true);let current=Number(c.data||0);if(!c.data){const all=(await dbRead("usersV1")).data||{};current=Object.values(all).reduce((m,u)=>Math.max(m,Number(u&&u.serial||0)),Object.values(all).filter(u=>u&&u.registered).length)}const next=current+1,w=await dbWrite("registeredCountV1","PUT",next,{"If-Match":c.etag||"null_etag"});if(w.ok)return next;if(w.status!==412)throw Error("Could not allocate registration number")}throw Error("Registration counter busy; retry")}
async function adminAuth(req,env){const expected=String(env.ADMIN_PASSWORD||"");return!!expected&&String(req.headers.get("X-Admin-Password")||"")===expected}
async function handleRegister(req){let x;try{x=await req.json()}catch{return json({error:"اطلاعات ثبت‌نام معتبر نیست"},400)}const uid=String(x.uid||""),fullName=String(x.fullName||"").trim().normalize("NFKC"),nick=String(x.nick||"").trim().normalize("NFKC"),account=String(x.account||"").trim().toUpperCase(),age=Number(x.age||0);if(!/^[A-Za-z0-9_-]{1,80}$/.test(uid)||fullName.length<2||fullName.length>60||nick.length<2||nick.length>18||account.length<3||account.length>24||age<1||age>99||x.profileComplete!==true)return json({error:"نام، اکانت و سن را کامل و درست وارد کن"},400);const old=(await dbRead("usersV1/"+uid)).data||null,ban=await banFor({uid,nick,account});if(ban)return json({error:ban.type==="permanent"?"این حساب یا نام کاربری برای همیشه مسدود شده است":"این حساب مسدود است تا "+new Date(Number(ban.until||0)).toLocaleString("fa-IR"),ban},403);const namePath="nameIndexV1/"+keyOf(nick),accountPath="accountIndexV1/"+keyOf(account);if(!(await dbRead(namePath)).data){const all=(await dbRead("usersV1")).data||{};if(Object.values(all).some(u=>u&&u.registered&&u.uid!==uid&&String(u.nick||"").trim().normalize("NFKC").toLocaleLowerCase()===nick.toLocaleLowerCase()))return json({error:"این نام قبلاً ثبت شده است؛ نام دیگری انتخاب کن"},409)}if(!(await dbRead(accountPath)).data){const all=(await dbRead("usersV1")).data||{};if(Object.values(all).some(u=>u&&u.registered&&u.uid!==uid&&String(u.account||"").trim().toUpperCase()===account))return json({error:"این کد اکانت قبلاً استفاده شده است"},409)}if(!await reserveIndex(namePath,uid))return json({error:"این نام قبلاً ثبت شده است؛ نام دیگری انتخاب کن"},409);if(!await reserveIndex(accountPath,uid))return json({error:"این کد اکانت قبلاً استفاده شده است"},409);const serial=Number(old&&old.serial||0)||await nextSerial(),now=Date.now(),record={uid,fullName,nick,account,age,avatarSeed:Number(x.avatarSeed||1),photo:String(x.photo||"").length<30000?String(x.photo||""):"",registered:true,profileComplete:true,serial,createdAt:Number(old&&old.createdAt||now),lastSeen:now};const save=await dbWrite("usersV1/"+uid,"PUT",record);if(!save.ok)return json({error:"ذخیرهٔ دائمی اطلاعات انجام نشد"},502);if(!old||!old.registered)await dbWrite("adminNotificationsV1/"+String(serial).padStart(10,"0"),"PUT",{type:"registration",serial,uid,nick,fullName,account,age,createdAt:now,read:false});return json({ok:true,user:record})}
async function handleAdmin(req,env,url){if(!await adminAuth(req,env))return json({error:env.ADMIN_PASSWORD?"رمز مدیریت سرور اشتباه است":"رمز امن ADMIN_PASSWORD هنوز در تنظیمات Cloudflare تعریف نشده است"},env.ADMIN_PASSWORD?403:503);const p=url.pathname.replace(/^\/api\/admin\/?/,"");if(req.method==="GET"&&p==="notifications"){const all=(await dbRead("adminNotificationsV1")).data||{};return json({notifications:Object.values(all).filter(Boolean).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,100)})}if(req.method==="GET"&&p==="users"){const all=(await dbRead("usersV1")).data||{},q=String(url.searchParams.get("q")||"").trim().toLocaleLowerCase(),registered=Object.values(all).filter(u=>u&&u.registered),users=registered.filter(u=>!q||[u.fullName,u.nick,u.account,u.uid,u.serial].some(v=>String(v==null?"":v).toLocaleLowerCase().includes(q))).sort((a,b)=>Number(a.serial||0)-Number(b.serial||0));return json({total:registered.length,users:users.slice(0,100)})}if(req.method==="GET"&&p==="rooms"){const all=(await dbRead("roomsV23")).data||{};return json({rooms:Object.values(all).filter(Boolean).map(r=>({code:r.code,status:r.status,players:Object.values(r.players||{}).filter(v=>v&&Date.now()-Number(v.at||0)<12000).length}))})}if(req.method==="POST"&&p==="ban"){let x;try{x=await req.json()}catch{return json({error:"درخواست نامعتبر است"},400)}const uid=String(x.uid||"");if(!/^[A-Za-z0-9_-]{1,80}$/.test(uid))return json({error:"کد کاربر نامعتبر است"},400);const u=(await dbRead("usersV1/"+uid)).data;if(!u)return json({error:"کاربر پیدا نشد"},404);const type=["permanent","temporary","days"].includes(x.type)?x.type:"temporary",days=Math.max(1,Math.min(180,Math.floor(Number(x.days||1)))),createdAt=Date.now(),until=type==="permanent"?0:createdAt+(type==="temporary"?1800000:days*86400000),ban={uid,nick:u.nick,account:u.account,type,days:type==="days"?days:0,createdAt,until,reason:String(x.reason||"").slice(0,300),active:true};for(const[k,v]of[["bansV1/"+uid,ban],["bansByNameV1/"+keyOf(u.nick),ban],["bansByAccountV1/"+keyOf(u.account),ban]]){if(!(await dbWrite(k,"PUT",v)).ok)return json({error:"ثبت بن در پایگاه داده ناموفق بود"},502)}return json({ok:true,ban})}if(req.method==="POST"&&p==="unban"){let x;try{x=await req.json()}catch{return json({error:"درخواست نامعتبر است"},400)}const uid=String(x.uid||""),ban=(await dbRead("bansV1/"+uid)).data,u=(await dbRead("usersV1/"+uid)).data;for(const k of["bansV1/"+uid,...(u?["bansByNameV1/"+keyOf(u.nick),"bansByAccountV1/"+keyOf(u.account)]:[]),...(ban&&ban.nick?["bansByNameV1/"+keyOf(ban.nick)]:[]),...(ban&&ban.account?["bansByAccountV1/"+keyOf(ban.account)]:[])])await dbWrite(k,"DELETE");return json({ok:true})}return json({error:"مسیر مدیریت پیدا نشد"},404)}


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

  if (p[0] === "rooms") {
    if (p.length === 1) return true;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(p[1])) return false;
    return p.length === 2 || (p.length === 3 && /^[A-Za-z0-9_-]{1,80}$/.test(p[2]));
  }

  if (p[0] === "godPerms") {
    return p.length === 1 || (p.length === 2 && /^[A-Za-z0-9_-]{1,80}$/.test(p[1]));
  }

  // Permanent player registry: one record per generated device account ID.
  if (p[0] === "usersV1") {
    return p.length === 1 || (p.length === 2 && /^[A-Za-z0-9_-]{1,80}$/.test(p[1]));
  }

  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/register" && request.method === "POST") {
      if (Number(request.headers.get("Content-Length") || 0) > 40000) return json({error:"اطلاعات بیش از حد بزرگ است"},413);
      try { return await handleRegister(request); } catch (e) { return json({error:e.message || "ثبت‌نام ناموفق بود"},502); }
    }
    if (url.pathname.startsWith("/api/admin/")) {
      try { return await handleAdmin(request, env, url); } catch (e) { return json({error:e.message || "خطای پنل مدیریت"},502); }
    }
    if (!url.pathname.startsWith("/api/db/")) {
      const asset = await env.ASSETS.fetch(request);
      if (request.method === "GET" && (url.pathname === "/" || url.pathname.endsWith("/index.html")) && asset.ok) {
        const html = await asset.text();
        let injected = html;
        if (!injected.includes("/account-ui.js")) injected = injected.replace(/<\/body\s*>/i, '<script src="/account-ui.js" defer></script></body>');
        if (!injected.includes("/admin-ui.js")) injected = injected.replace(/<\/body\s*>/i, '<script src="/admin-ui.js" defer></script></body>');
        if (!injected.includes("/room-ui.js")) injected = injected.replace(/<\/body\s*>/i, '<script src="/room-ui.js" defer></script></body>');
        const headers = new Headers(asset.headers); headers.delete("Content-Length"); headers.set("Cache-Control", "no-store");
        return new Response(injected, { status: asset.status, statusText: asset.statusText, headers });
      }
      return asset;
    }

    const method = request.method.toUpperCase();
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": url.origin,
          "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin"
        }
      });
    }

    if (!["GET", "PUT", "PATCH", "POST", "DELETE"].includes(method)) {
      return json({ error: "Method not allowed" }, 405, { "Allow": "GET, PUT, PATCH, POST, DELETE, OPTIONS" });
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Origin not allowed" }, 403);

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

    // Keep players in a started match even when a browser disconnects or tries to leave.
    const roomMutation = rawPath.match(/^roomsV23\/(\d{5})(?:\/(.+))?\.json$/);
    if (roomMutation && ["PUT", "PATCH", "DELETE"].includes(method)) {
      const roomCode = roomMutation[1];
      const subPath = String(roomMutation[2] || "").replace(/\.json$/, "");
      const shouldCheck = method === "DELETE" || subPath === "" || subPath === "players" || subPath === "status";
      if (shouldCheck) {
        let roomData;
        try { roomData = (await dbRead("roomsV23/" + roomCode)).data || {}; }
        catch { return json({error:"برای حفظ وضعیت بازی، بررسی اتاق ناموفق بود؛ دوباره تلاش کن."},502); }
        if (String(roomData.status || "").toLowerCase() === "started") {
          if (method === "DELETE" && (!subPath || subPath === "players" || subPath.startsWith("players/"))) {
            return json({error:"این بازی شروع شده؛ خروج یا حذف بازیکن تا پایان بازی مجاز نیست."},409);
          }
          if (subPath === "status" && ["PUT","PATCH"].includes(method)) {
            let nextStatus;
            try { nextStatus = JSON.parse(body || "null"); } catch { return json({error:"وضعیت بازی نامعتبر است."},400); }
            if (!["started","ended","finished","completed"].includes(String(nextStatus || "").toLowerCase())) {
              return json({error:"بازی شروع شده و نمی‌توان آن را به لابی بازگرداند."},409);
            }
          }
          const mergePlayers = (oldPlayers, incomingPlayers, partial) => {
            const merged = {...(oldPlayers && typeof oldPlayers === "object" ? oldPlayers : {})};
            if (!incomingPlayers || typeof incomingPlayers !== "object" || Array.isArray(incomingPlayers)) return merged;
            for (const [id, value] of Object.entries(incomingPlayers)) {
              if (value === null) continue;
              if (partial && value && typeof value === "object" && !Array.isArray(value) && merged[id] && typeof merged[id] === "object") {
                merged[id] = {...merged[id], ...value};
              } else merged[id] = value;
            }
            return merged;
          };
          if (subPath === "" && ["PUT","PATCH"].includes(method)) {
            let incoming;
            try { incoming = JSON.parse(body || "null"); } catch { return json({error:"اطلاعات اتاق نامعتبر است."},400); }
            if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
              return json({error:"حذف کامل اتاق در زمان اجرای بازی مجاز نیست."},409);
            }
            if (method === "PUT") incoming.players = mergePlayers(roomData.players, incoming.players, false);
            else if (incoming.players !== undefined) incoming.players = mergePlayers(roomData.players, incoming.players, true);
            const requestedStatus = String(incoming.status || "").toLowerCase();
            incoming.status = ["ended","finished","completed"].includes(requestedStatus) ? requestedStatus : "started";
            body = JSON.stringify(incoming);
          } else if (subPath === "players" && ["PUT","PATCH"].includes(method)) {
            let incoming;
            try { incoming = JSON.parse(body || "null"); } catch { return json({error:"فهرست بازیکنان نامعتبر است."},400); }
            if (method === "PUT" && (!incoming || typeof incoming !== "object" || Array.isArray(incoming))) {
              return json({error:"حذف فهرست بازیکنان در زمان بازی مجاز نیست."},409);
            }
            body = JSON.stringify(mergePlayers(roomData.players, incoming, method === "PATCH"));
          }
        }
      }
    }

    if (/^usersV1(?:\/|\.json$)/.test(rawPath)) return json({error:"اطلاعات حساب‌ها فقط از مسیرهای امن سرور قابل دسترسی است"},403);
    const playerPath = rawPath.match(/^roomsV23\/(\d{5})\/players\/([A-Za-z0-9_-]{1,80})\.json$/);
    if (playerPath && ["PUT","PATCH"].includes(method)) {
      let player = {}; try { player = JSON.parse(body || "{}"); } catch { return json({error:"اطلاعات بازیکن نامعتبر است"},400); }
      const playerUid = playerPath[2];
      if (player.uid && player.uid !== playerUid) return json({error:"شناسهٔ بازیکن با درخواست مطابقت ندارد"},403);
      try {
        const registered = (await dbRead("usersV1/"+playerUid)).data;
        if (!registered || !registered.registered) return json({error:"ابتدا ثبت‌نام را کامل کن"},403);
        const ban = await banFor({uid:playerUid,nick:player.n||registered.nick,account:player.account||registered.account});
        if (ban) return json({error:ban.type==="permanent"?"این حساب برای همیشه مسدود است":"حساب شما موقتاً مسدود است"},403);
      } catch { return json({error:"بررسی وضعیت حساب ناموفق بود"},502); }
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
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
