const DB = "https://black-mafia-online-default-rtdb.firebaseio.com";
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}})}
function keyOf(value){return Array.from(new TextEncoder().encode(String(value||"").trim().toLocaleLowerCase()),b=>b.toString(16).padStart(2,"0")).join("")}
async function dbRead(path,withEtag=false){const r=await fetch(DB+"/"+path+".json",{headers:withEtag?{"X-Firebase-ETag":"true"}:{}});const data=await r.json().catch(()=>null);if(!r.ok)throw Error("Database read failed: "+r.status);return{data,etag:r.headers.get("ETag")}}
async function dbWrite(path,method,data,headers={}){const r=await fetch(DB+"/"+path+".json",{method,headers:{"Content-Type":"application/json",...headers},body:data===undefined?undefined:JSON.stringify(data)});return{ok:r.ok,status:r.status,data:await r.json().catch(()=>null),etag:r.headers.get("ETag")}}
function activeBan(b){return!!b&&(b.type==="permanent"||!Number(b.until)||Number(b.until)>Date.now())}
async function banFor({uid,nick,account}){for(const p of["bansV1/"+uid,"bansByNameV1/"+keyOf(nick),"bansByAccountV1/"+keyOf(account)]){const b=(await dbRead(p)).data;if(activeBan(b))return b}return null}
async function reserveIndex(path,uid){const c=await dbRead(path,true);if(c.data&&c.data.uid!==uid)return false;if(c.data&&c.data.uid===uid)return true;return(await dbWrite(path,"PUT",{uid,createdAt:Date.now()},{"If-Match":c.etag||"null_etag"})).ok}
async function nextSerial(){for(let i=0;i<12;i++){const c=await dbRead("registeredCountV1",true),next=Number(c.data||0)+1,w=await dbWrite("registeredCountV1","PUT",next,{"If-Match":c.etag||"null_etag"});if(w.ok)return next;if(w.status!==412)throw Error("Could not allocate registration number")}throw Error("Registration counter busy; retry")}
async function adminAuth(req,env){const expected=String(env.ADMIN_PASSWORD||"");return!!expected&&String(req.headers.get("X-Admin-Password")||"")===expected}
async function handleRegister(req){let x;try{x=await req.json()}catch{return json({error:"اطلاعات ثبت‌نام معتبر نیست"},400)}const uid=String(x.uid||""),nick=String(x.nick||"").trim().normalize("NFKC"),account=String(x.account||"").trim().toUpperCase(),age=Number(x.age||0);if(!/^[A-Za-z0-9_-]{1,80}$/.test(uid)||nick.length<2||nick.length>18||account.length<3||account.length>24||age<1||age>99||x.profileComplete!==true)return json({error:"نام، اکانت و سن را کامل و درست وارد کن"},400);const old=(await dbRead("usersV1/"+uid)).data||null,ban=await banFor({uid,nick,account});if(ban)return json({error:ban.type==="permanent"?"این حساب یا نام کاربری برای همیشه مسدود شده است":"این حساب مسدود است تا "+new Date(Number(ban.until||0)).toLocaleString("fa-IR"),ban},403);if(!await reserveIndex("nameIndexV1/"+keyOf(nick),uid))return json({error:"این نام قبلاً ثبت شده است؛ نام دیگری انتخاب کن"},409);if(!await reserveIndex("accountIndexV1/"+keyOf(account),uid))return json({error:"این کد اکانت قبلاً استفاده شده است"},409);const serial=Number(old&&old.serial||0)||await nextSerial(),now=Date.now(),record={uid,nick,account,age,avatarSeed:Number(x.avatarSeed||1),photo:String(x.photo||"").length<30000?String(x.photo||""):"",registered:true,profileComplete:true,serial,createdAt:Number(old&&old.createdAt||now),lastSeen:now};const save=await dbWrite("usersV1/"+uid,"PUT",record);if(!save.ok)return json({error:"ذخیرهٔ دائمی اطلاعات انجام نشد"},502);return json({ok:true,user:record})}
async function handleAdmin(req,env,url){if(!await adminAuth(req,env))return json({error:env.ADMIN_PASSWORD?"رمز مدیریت سرور اشتباه است":"رمز امن ADMIN_PASSWORD هنوز در تنظیمات Cloudflare تعریف نشده است"},env.ADMIN_PASSWORD?403:503);const p=url.pathname.replace(/^\/api\/admin\/?/,"");if(req.method==="GET"&&p==="users"){const all=(await dbRead("usersV1")).data||{},q=String(url.searchParams.get("q")||"").trim().toLocaleLowerCase(),registered=Object.values(all).filter(u=>u&&u.registered),users=registered.filter(u=>!q||[u.nick,u.account,u.uid,u.serial].some(v=>String(v==null?"":v).toLocaleLowerCase().includes(q))).sort((a,b)=>Number(a.serial||0)-Number(b.serial||0));return json({total:registered.length,users:users.slice(0,100)})}if(req.method==="GET"&&p==="rooms"){const all=(await dbRead("roomsV23")).data||{};return json({rooms:Object.values(all).filter(Boolean).map(r=>({code:r.code,status:r.status,players:Object.values(r.players||{}).filter(v=>v&&Date.now()-Number(v.at||0)<12000).length}))})}if(req.method==="POST"&&p==="ban"){let x;try{x=await req.json()}catch{return json({error:"درخواست نامعتبر است"},400)}const uid=String(x.uid||"");if(!/^[A-Za-z0-9_-]{1,80}$/.test(uid))return json({error:"کد کاربر نامعتبر است"},400);const u=(await dbRead("usersV1/"+uid)).data;if(!u)return json({error:"کاربر پیدا نشد"},404);const type=["permanent","temporary","days"].includes(x.type)?x.type:"temporary",days=Math.max(1,Math.min(180,Math.floor(Number(x.days||1)))),createdAt=Date.now(),until=type==="permanent"?0:createdAt+(type==="temporary"?1800000:days*86400000),ban={uid,nick:u.nick,account:u.account,type,days:type==="days"?days:0,createdAt,until,reason:String(x.reason||"").slice(0,300),active:true};for(const[k,v]of[["bansV1/"+uid,ban],["bansByNameV1/"+keyOf(u.nick),ban],["bansByAccountV1/"+keyOf(u.account),ban]]){if(!(await dbWrite(k,"PUT",v)).ok)return json({error:"ثبت بن در پایگاه داده ناموفق بود"},502)}return json({ok:true,ban})}if(req.method==="POST"&&p==="unban"){let x;try{x=await req.json()}catch{return json({error:"درخواست نامعتبر است"},400)}const uid=String(x.uid||""),ban=(await dbRead("bansV1/"+uid)).data,u=(await dbRead("usersV1/"+uid)).data;for(const k of["bansV1/"+uid,...(u?["bansByNameV1/"+keyOf(u.nick),"bansByAccountV1/"+keyOf(u.account)]:[]),...(ban&&ban.nick?["bansByNameV1/"+keyOf(ban.nick)]:[]),...(ban&&ban.account?["bansByAccountV1/"+keyOf(ban.account)]:[])])await dbWrite(k,"DELETE");return json({ok:true})}return json({error:"مسیر مدیریت پیدا نشد"},404)}


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
      return env.ASSETS.fetch(request);
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

    if (/^usersV1\//.test(rawPath) && method !== "GET") return json({error:"برای ثبت مشخصات از مسیر امن ثبت‌نام استفاده کن"},405);
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
