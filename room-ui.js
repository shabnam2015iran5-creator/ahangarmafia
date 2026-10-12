/* BLACK MAFIA — running games list and reconnect support */
(()=> {
 'use strict';
 if(window.__bmRunningGamesV1)return;window.__bmRunningGamesV1=true;
 const $=id=>document.getElementById(id);
 const db=()=>String(window.MAFIA_DB_URL||'/api/db').replace(/\/$/,'');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const visible=n=>{if(!n||!n.isConnected)return false;const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&(n.offsetWidth>0||n.offsetHeight>0||n.getClientRects().length>0)};
 const css=document.createElement('style');
 css.textContent='#bmRunningGamesBtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;max-width:100%;box-sizing:border-box;border:1px solid #54d5b4;border-radius:12px;background:linear-gradient(135deg,#102d2b,#17433b);color:#e2fff7;padding:11px 14px;font:800 13px Tahoma,Arial,sans-serif;cursor:pointer;box-shadow:0 3px 14px #0003}'+
 '#bmRunningGamesCount{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:20px;background:#62e2bd;color:#08352c;font-size:11px}'+
 '#bmRunningGamesModal{position:fixed;inset:0;z-index:2147483002;display:none;overflow:auto;background:#050b0bf2;color:#ecfffa;padding:12px;box-sizing:border-box;font-family:Tahoma,Arial,sans-serif}'+
 '#bmRunningGamesModal .bm-rg-card{max-width:640px;margin:4vh auto;background:linear-gradient(145deg,#102923,#0e1718);border:1px solid #49c9a9;border-radius:17px;padding:14px;box-shadow:0 10px 35px #0008}'+
 '#bmRunningGamesModal .bm-rg-head{display:flex;gap:8px;align-items:center;justify-content:space-between}'+
 '#bmRunningGamesModal button{border:1px solid #50c9aa;border-radius:9px;background:#153b34;color:#eafff8;padding:9px 11px;font:700 12px Tahoma,Arial,sans-serif;cursor:pointer}'+
 '#bmRunningGamesModal .bm-rg-room{border:1px solid #31594e;border-radius:12px;padding:11px;margin:8px 0;background:#0b201c}'+
 '#bmRunningGamesModal .bm-rg-muted{color:#b4d9cf;font-size:12px;line-height:1.9;overflow-wrap:anywhere}'+
 '#bmRunningGamesModal .bm-rg-players{margin-top:8px;padding-top:7px;border-top:1px solid #31594e;display:none}'+
 '#bmRunningGamesModal .bm-rg-empty{padding:18px;text-align:center;color:#b4d9cf}'+
 '@media(max-width:520px){#bmRunningGamesModal .bm-rg-card{margin:1vh auto;padding:12px}#bmRunningGamesBtn{width:100%}}';
 document.head.appendChild(css);
 const modal=document.createElement('div');modal.id='bmRunningGamesModal';
 modal.innerHTML='<section class="bm-rg-card" dir="rtl"><div class="bm-rg-head"><h2 style="font-size:18px;margin:0">🎮 بازی‌های در حال اجرا</h2><button id="bmRunningGamesClose">بستن</button></div><p class="bm-rg-muted">بازی‌هایی که گاد شروع کرده اینجا نمایش داده می‌شوند. برای دریافت آخرین وضعیت، به‌روزرسانی را بزن.</p><div class="bm-rg-head"><span id="bmRunningGamesStatus" class="bm-rg-muted">در حال دریافت…</span><button id="bmRunningGamesRefresh">به‌روزرسانی</button></div><div id="bmRunningGamesList"></div></section>';
 document.body.appendChild(modal);
 const btn=document.createElement('button');btn.id='bmRunningGamesBtn';btn.type='button';btn.innerHTML='🎮 بازی‌های در حال اجرا <span id="bmRunningGamesCount">…</span>';
 const open=()=>{modal.style.display='block';loadGames()};const close=()=>{modal.style.display='none'};
 btn.addEventListener('click',open);$('bmRunningGamesClose').addEventListener('click',close);$('bmRunningGamesRefresh').addEventListener('click',loadGames);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 function insertButton(){
  if(!btn.isConnected)document.body.appendChild(btn);
  const matches=[...document.querySelectorAll('button,a,[role="button"]')].filter(n=>n!==btn&&visible(n)&&!n.closest('#bmRunningGamesModal'));
  const target=matches.find(n=>/ورود\s*(?:به\s*)?لابی(?:‌| )?ها?|ورود\s*(?:به\s*)?اتاق|انتخاب\s*لابی/.test((n.innerText||n.textContent||'').replace(/\s+/g,' ').trim()));
  if(target){
   const group=target.parentElement||target;
   if(btn.parentElement!==group.parentElement||btn.previousElementSibling!==group)group.insertAdjacentElement('afterend',btn);
   btn.style.position='relative';btn.style.width='100%';btn.style.margin='8px 0';btn.style.zIndex='10';
  }else{
   btn.style.position='fixed';btn.style.right='12px';btn.style.bottom='74px';btn.style.zIndex='2147482990';btn.style.width='auto';btn.style.maxWidth='calc(100vw - 24px)';
  }
 }
 async function loadGames(){
  const host=$('bmRunningGamesList'),status=$('bmRunningGamesStatus'),count=$('bmRunningGamesCount');
  if(host)host.innerHTML='<div class="bm-rg-empty">در حال دریافت بازی‌ها…</div>';
  if(status)status.textContent='در حال به‌روزرسانی…';
  try{
   const r=await fetch(db()+'/roomsV23.json',{cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json();
   const games=Object.entries(data||{}).filter(([code,room])=>/^\d{5}$/.test(code)&&room&&String(room.status||'').toLowerCase()==='started').map(([code,room])=>{
    const players=Object.entries(room.players||{}).filter(([id,p])=>p&&typeof p==='object');
    return {code,room,players};
   }).sort((a,b)=>Number(b.room.startedAt||0)-Number(a.room.startedAt||0));
   count.textContent=String(games.length);
   status.textContent='تعداد بازی‌های فعال: '+games.length;
   if(!games.length){host.innerHTML='<div class="bm-rg-empty">در حال حاضر بازی شروع‌شده‌ای وجود ندارد.</div>';return}
   host.innerHTML=games.map((g,i)=>{
    const title=g.room.name||g.room.roomName||('لابی '+g.code);
    const names=g.players.slice(0,30).map(([id,p])=>esc(p.n||p.nick||p.name||('بازیکن '+String(id).slice(-4)))).join('، ')||'هنوز فهرست بازیکنان ثبت نشده است';
    const when=g.room.startedAt?new Date(Number(g.room.startedAt)).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}):'زمان شروع ثبت نشده';
    return '<article class="bm-rg-room"><div style="display:flex;align-items:center;gap:8px;justify-content:space-between"><b>'+esc(title)+'</b><span class="bm-rg-muted">کد '+esc(g.code)+'</span></div><div class="bm-rg-muted">وضعیت: در حال اجرا · '+g.players.length+' بازیکن · شروع: '+esc(when)+'</div><button type="button" data-bm-rg="'+i+'">نمایش بازیکنان</button><div class="bm-rg-players" id="bm-rg-players-'+i+'">'+names+'</div></article>';
   }).join('');
   host.querySelectorAll('[data-bm-rg]').forEach(b=>b.addEventListener('click',()=>{
    const box=$('bm-rg-players-'+b.getAttribute('data-bm-rg'));
    if(!box)return;const show=box.style.display!=='block';box.style.display=show?'block':'none';b.textContent=show?'پنهان کردن بازیکنان':'نمایش بازیکنان';
   }));
  }catch(e){count.textContent='!';status.textContent='خطا در دریافت بازی‌ها';host.innerHTML='<div class="bm-rg-empty">اتصال به فهرست بازی‌ها برقرار نشد. چند لحظه بعد دوباره امتحان کن.</div>'}
 }
 // Remember a started match during transient disconnects.
 let lastRejoin=0,activeStartedRoom='';
 async function reconnectCheck(){
  try{
   const code=String(window.MAFIA_ROOM_CODE||'');
   if(code&&window.lobbyMode==='player'){
    const r=await fetch(db()+'/roomsV23/'+encodeURIComponent(code)+'/status.json',{cache:'no-store'});
    if(r.ok){
     const currentStatus=String(await r.json()).toLowerCase();
     if(currentStatus==='started'){
      activeStartedRoom=code;
      try{localStorage.setItem('bm_locked_room',code);localStorage.setItem('bm_locked_room_at',String(Date.now()))}catch(e){}
      const room=$('lobbyRoom');
      if(room&&room.classList.contains('on')&&Date.now()-lastRejoin>3500){
       lastRejoin=Date.now();
       if(window.Net&&typeof window.Net.enter==='function')window.Net.enter();
       else if(typeof window.roomStartGame==='function')window.roomStartGame();
      }
     }else if(activeStartedRoom===code){
      activeStartedRoom='';
      try{localStorage.removeItem('bm_locked_room');localStorage.removeItem('bm_locked_room_at')}catch(e){}
     }
    }
   }
  }catch(e){}
 }
 // Keep normal in-game exit controls from taking a player back to the lobby mid-match.
 document.addEventListener('click',e=>{
  const el=e.target&&e.target.closest?e.target.closest('button,a,[role="button"]'):null;
  if(!el||!activeStartedRoom||String(window.MAFIA_ROOM_CODE||'')!==activeStartedRoom||window.lobbyMode!=='player')return;
  const label=String(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
  if(!/^(خروج|ترک بازی|خروج از بازی|خروج از اتاق|بازگشت به خانه|رفتن به خانه|خانه)$/.test(label))return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  try{window.toast&&window.toast('بازی شروع شده است؛ تا پایان بازی نمی‌توان به لابی برگشت.')}catch(_){}
 },true);
 window.addEventListener('online',()=>setTimeout(reconnectCheck,800));
 window.addEventListener('focus',()=>setTimeout(reconnectCheck,500));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(reconnectCheck,500)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insertButton,{once:true});else insertButton();
 new MutationObserver(insertButton).observe(document.documentElement,{childList:true,subtree:true});
 setInterval(insertButton,1200);
 setInterval(reconnectCheck,3500);
})();