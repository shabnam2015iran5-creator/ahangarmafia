const DB = "https://black-mafia-online-default-rtdb.firebaseio.com";

const START_SCREEN = "<div id=\"bm-rules-screen\" dir=\"rtl\" lang=\"fa\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"bm-rules-title\">\n<div class=\"bm-flag\" aria-hidden=\"true\"></div><div class=\"bm-card\"><div class=\"bm-emblem\">🇮🇷</div><small>اطلاعیهٔ قوانین و ضوابط استفاده از بازی</small><h1 id=\"bm-rules-title\">مافیای بلک</h1><p class=\"bm-welcome\">به مافیای بلک خوش آمدید.</p>\n<p>بازی آنلاین «مافیای بلک» با هدف ایجاد محیطی سالم، سرگرم‌کننده، دوستانه و رقابتی طراحی شده است. استفاده از بازی به معنای پذیرش قوانین زیر و تعهد به رعایت احترام، ادب، انصاف و حقوق سایر کاربران است.</p>\n<h2>۱. رعایت قوانین جمهوری اسلامی ایران</h2><p>استفاده از بازی باید در چارچوب قوانین و مقررات لازم‌الاجرا در جمهوری اسلامی ایران باشد. هرگونه فعالیت غیرقانونی یا سوءاستفاده از امکانات بازی ممنوع است.</p>\n<h2>۲. ممنوعیت فحاشی و توهین</h2><p>هرگونه فحاشی، ناسزاگویی، تهدید، تحقیر، تمسخر، آزار کلامی یا استفاده از الفاظ رکیک علیه بازیکنان، در چت متنی، صوتی، نام کاربری، تصویر پروفایل یا هر بخش دیگر بازی ممنوع است.</p>\n<h2>۳. احترام به مذاهب و اعتقادات</h2><p>توهین، تمسخر، تحقیر یا تحریک به نفرت علیه ادیان، مذاهب، باورهای دینی، مقدسات و اعتقادات اشخاص ممنوع است. اختلاف نظر باید بدون توهین، تهدید یا آزار بیان شود.</p>\n<h2>۴. احترام به قومیت‌ها، زبان‌ها و فرهنگ‌ها</h2><p>توهین، تحقیر، تبعیض یا نفرت‌پراکنی علیه اقوام، قومیت‌ها، زبان‌ها، فرهنگ‌ها، ملیت‌ها و خاستگاه افراد ممنوع است. هیچ‌کس نباید به دلیل هویت یا پیشینهٔ خود مورد آزار قرار گیرد.</p>\n<h2>۵. ممنوعیت تهدید، آزار و مزاحمت</h2><p>تهدید به آسیب‌رساندن، آزار مکرر، باج‌گیری، اخاذی، انتشار اطلاعات خصوصی بدون مجوز و هر رفتار ترساننده یا آزاردهنده ممنوع است.</p>\n<h2>۶. نام کاربری، تصویر و محتوای نامناسب</h2><p>نام، تصویر پروفایل یا محتوای شامل توهین، تهدید، نفرت‌پراکنی، محتوای غیرقانونی یا نقض حریم خصوصی مجاز نیست. جعل هویت دیگران نیز ممنوع است.</p>\n<h2>۷. رعایت انصاف در بازی</h2><p>تقلب، سوءاستفاده از باگ‌ها، خرابکاری عمدی در اتاق‌ها، اخلال در روند بازی و استفاده از ابزارهای غیرمجاز برای برهم‌زدن رقابت ممنوع است.</p>\n<h2>۸. گفت‌وگوی صوتی و نوبت صحبت</h2><p>بازیکنان باید نوبت صحبت را رعایت کنند و از قطع مکرر صحبت دیگران، ایجاد صدای آزاردهنده یا مختل‌کردن گفت‌وگوی گروهی خودداری کنند. رعایت زمان و نوبت تعیین‌شده الزامی است.</p>\n<h2>۹. احترام به گرداننده و بازیکنان</h2><p>مخالفت با تصمیم‌های بازی باید محترمانه بیان شود. گرداننده نیز باید از امکانات مدیریتی منصفانه استفاده کند و از تهدید، توهین یا آزار بازیکنان خودداری کند.</p>\n<h2>۱۰. حفظ حریم خصوصی و امنیت حساب</h2><p>شماره تلفن، کد ورود، رمزها، تصاویر خصوصی و اطلاعات محرمانهٔ دیگران نباید بدون مجوز جمع‌آوری یا منتشر شود. کد ورود و اطلاعات حساس حساب خود را در اختیار افراد ناشناس قرار ندهید.</p>\n<h2>۱۱. ممنوعیت کلاهبرداری و سوءاستفاده</h2><p>فریب کاربران برای دریافت پول یا اطلاعات، جعل هویت، تبلیغات فریبنده، ارسال لینک مخرب و تلاش برای سرقت حساب‌ها ممنوع است.</p>\n<h2>۱۲. گزارش تخلف</h2><p>در صورت مشاهدهٔ توهین، تهدید، تبعیض، آزار یا رفتار مشکوک، در صورت فراهم‌بودن امکان گزارش، موضوع را اعلام کنید. از گزارش دروغین یا با هدف آزار دیگران خودداری کنید.</p>\n<h2>۱۳. اقدامات انضباطی</h2><p>با توجه به نوع و شدت تخلف و تکرار آن، ممکن است تذکر، محدودیت گفت‌وگو، اخراج از اتاق، تعلیق موقت یا مسدودشدن دسترسی اعمال شود. اقدامات باید متناسب با تخلف و در چارچوب قوانین قابل‌اجرا باشند.</p>\n<h2>۱۴. مسئولیت کاربران</h2><p>هر کاربر مسئول محتوایی است که منتشر می‌کند و رفتاری است که انجام می‌دهد. رقابت و سرگرمی مجوز توهین، تهدید، تحقیر یا آسیب‌رساندن به دیگران نیست.</p>\n<h2>۱۵. به‌روزرسانی قوانین</h2><p>این قوانین ممکن است متناسب با نیازهای بازی و الزامات قانونی به‌روزرسانی شوند. نسخهٔ جاری قوانین از طریق اطلاعیهٔ بازی قابل مشاهده خواهد بود.</p>\n<div class=\"bm-pledge\"><strong>تعهد به بازی سالم</strong><p>با ورود به مافیای بلک، متعهد می‌شوم به شخصیت، آبرو، حریم خصوصی، قومیت، مذهب و اعتقادات دیگران احترام بگذارم و از فحاشی، توهین، تهدید، تبعیض و آزار خودداری کنم.</p><strong>مافیای بلک؛ رقابت باهوشانه، گفت‌وگوی محترمانه و سرگرمی سالم.</strong></div>\n<button id=\"bm-rules-accept\" type=\"button\">قوانین را خواندم و می‌پذیرم</button><p class=\"bm-note\">با انتخاب این گزینه، قوانین استفاده از بازی را می‌پذیرید.</p></div></div>\n<style>\n#bm-rules-screen{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;background:#05080ed9;font-family:Tahoma,Arial,sans-serif;color:#f8fafc}\n#bm-rules-screen *{box-sizing:border-box}#bm-rules-screen .bm-flag{position:absolute;inset:0;opacity:.25;background:linear-gradient(to bottom,#239f40 0 33.333%,#fff 33.333% 66.666%,#da0000 66.666% 100%)}\n#bm-rules-screen .bm-card{position:relative;width:min(760px,100%);max-height:96vh;overflow:auto;overscroll-behavior:contain;border:1px solid #ffffff44;border-radius:18px;padding:20px 18px;background:#0c1018f2;box-shadow:0 20px 70px #0009;text-align:right;line-height:1.9}\n#bm-rules-screen .bm-emblem{text-align:center;font-size:36px}#bm-rules-screen small{display:block;text-align:center;color:#d7dce5}#bm-rules-screen h1{text-align:center;font-size:28px;margin:4px;color:#f5d27a}#bm-rules-screen .bm-welcome{text-align:center;font-weight:bold;font-size:16px}#bm-rules-screen h2{font-size:14px;color:#f5d27a;margin:15px 0 3px}#bm-rules-screen p{font-size:12px;margin:5px 0 9px}\n#bm-rules-screen .bm-pledge{margin-top:18px;padding:13px;border:1px solid #b9984e;border-radius:12px;background:#ffffff08}#bm-rules-screen #bm-rules-accept{display:block;width:100%;border:0;border-radius:12px;padding:14px;margin-top:16px;background:#218b43;color:white;font-weight:bold;font-size:15px;cursor:pointer}#bm-rules-screen .bm-note{text-align:center;color:#cbd5e1;font-size:10px}\n@media(max-width:480px){#bm-rules-screen{padding:6px}#bm-rules-screen .bm-card{padding:15px 12px}#bm-rules-screen h1{font-size:24px}#bm-rules-screen p{font-size:12px;line-height:1.85}}\n</style><script>(function(){var s=document.getElementById('bm-rules-screen'),b=document.getElementById('bm-rules-accept');if(!s||!b)return;document.documentElement.style.overflow='hidden';b.addEventListener('click',function(){s.remove();document.documentElement.style.overflow='';});})();</script>";

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
      const asset = await env.ASSETS.fetch(request);
      if (request.method !== "GET" || !["/", "/index.html"].includes(url.pathname)) return asset;

      // Net is a top-level lexical const, not window.Net. Fix the missed-start
      // fallback in the served HTML so player phones can enter when they see
      // the shared Firebase room status change.
      const html = await asset.text();
      const safeHtml = html.replace(
        "if(window.Net&&typeof Net.enter==='function')Net.enter()",
        "if(typeof Net!=='undefined'&&typeof Net.enter==='function')Net.enter()"
      );
      const patched = safeHtml.includes("</body>") ? safeHtml.replace("</body>", START_SCREEN + "</body>") : safeHtml;
      if (patched === html) return asset;
      const headers = new Headers(asset.headers);
      headers.delete("Content-Length");
      headers.delete("ETag");
      headers.set("Cache-Control", "no-store");
      headers.set("Content-Type", "text/html; charset=utf-8");
      return new Response(patched, { status: asset.status, statusText: asset.statusText, headers });
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
    const retryable = ["GET", "PUT", "PATCH", "DELETE"].includes(method);
    const maxAttempts = retryable ? 3 : 1;

    // Bound every database request so a slow Firebase response cannot leave
    // room creation waiting indefinitely. Retry only methods safe to repeat.
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const headers = new Headers();
        const accept = request.headers.get("Accept");
        if (accept) headers.set("Accept", accept);
        if (body) headers.set("Content-Type", "application/json");

        upstream = await fetch(upstreamUrl, {
          method,
          headers,
          body: body || undefined,
          redirect: "follow",
          signal: AbortSignal.timeout(7000)
        });

        if (upstream.status < 500 || attempt === maxAttempts) break;
        try { await upstream.body?.cancel(); } catch {}
      } catch {
        if (attempt === maxAttempts) {
          return json({
            error: "Database connection timed out",
            retryable: true
          }, 504);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
    }

    if (!upstream) {
      return json({ error: "Database connection failed", retryable: true }, 502);
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
