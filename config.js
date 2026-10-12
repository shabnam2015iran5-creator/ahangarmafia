/* تنظیمات بازی؛ تا زمان انتشار واسط Cloudflare از نشانی اصلی دیتابیس استفاده می‌شود. */
window.MAFIA_DB_URL='/api/db';
// سرور TURN رایگان و مشترک Open Relay؛ تنظیم قبلی بازی
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
window.MAFIA_ROOM_NAME='main';      // نام اتاق مشترک
window.MAFIA_ONE_ROOM_ALL=true;     // true: هر سه لابی یک اتاق‌اند؛ false: برای هر لابی یک اتاق جدا

/* BLACK MAFIA: player-ready UI, God-only start, shared start fallback, compact controls */
(()=>{
 if(window.__bmLobbyHotfixLoaded)return;window.__bmLobbyHotfixLoaded=true;
 const $=id=>document.getElementById(id),db=()=>String(window.MAFIA_DB_URL||'').replace(/\/$/,'');
 const uid=()=>{try{return localStorage.getItem('mafia_uid')||''}catch(e){return ''}};
 const nick=()=>{try{return String((window.S&&S.nick)||$('playerNick')?.value||'').trim().slice(0,18)}catch(e){return String($('playerNick')?.value||'').trim().slice(0,18)}};
 function layout(){
  const room=$('lobbyRoom'),acts=room?.querySelector('.roomActions'),ready=$('readyBtn'),start=$('roomStartBtn'),timer=$('roomTimer'),deck=$('deckBtn'),chat=$('bmChatToggle');
  if(ready)ready.style.setProperty('display','none','important');
  if(!acts)return;
  if(timer&&timer.parentElement!==acts)acts.insertBefore(timer,deck?deck.nextSibling:start||null);
  if(chat&&chat.parentElement!==acts)acts.appendChild(chat);
  const god=window.lobbyMode==='god';
  if(start){start.style.setProperty('display',god?'inline-flex':'none','important');start.textContent='🎭 شروع بازی';start.disabled=false}
  acts.style.setProperty('display','flex','important');
  acts.style.setProperty('align-items','center','important');
  acts.style.setProperty('gap','4px','important');
  acts.style.setProperty('flex-wrap','nowrap','important');
  if(timer){timer.style.position='static';timer.style.minWidth='44px';timer.style.width='auto';timer.style.flex='0 0 auto';timer.style.margin='0';timer.style.padding='4px 5px';timer.style.fontSize='11px';timer.style.lineHeight='1.1';timer.style.textAlign='center'}
  if(deck){deck.style.flex='1 1 auto';deck.style.minWidth='0';deck.style.padding='6px 4px';deck.style.fontSize='10px';deck.style.whiteSpace='nowrap'}
  if(chat){chat.style.position='static';chat.style.right='auto';chat.style.bottom='auto';chat.style.flex='1 1 auto';chat.style.minWidth='0';chat.style.padding='6px 4px';chat.style.fontSize='10px';chat.style.whiteSpace='nowrap';chat.style.boxShadow='none'}
  if(start){start.style.flex='1 1 auto';start.style.minWidth='0';start.style.padding='6px 4px';start.style.fontSize='11px'}
 }
 function install(){
  layout();
  if(typeof window.roomStartGame==='function'&&!window.__bmGodOnlyStartInstalled){
   const old=window.roomStartGame;window.__bmGodOnlyStartInstalled=true;
   window.roomStartGame=async function(){
    if(window.lobbyMode!=='god'){try{window.toast&&toast('فقط گاد می‌تواند بازی را شروع کند.')}catch(e){}return false}
    // Persist the start signal using Firebase REST PUT on individual fields.
    // This is a fallback if the proxy does not support PATCH on the whole room.
    const code=String(window.MAFIA_ROOM_CODE||'');
    if(code&&db()){
     try{
      const root=db()+'/roomsV23/'+encodeURIComponent(code);
      const a=await fetch(root+'/status.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify('started')});
      if(!a.ok)throw Error('status '+a.status);
      const b=await fetch(root+'/startedAt.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(Date.now())});
      if(!b.ok)throw Error('startedAt '+b.status);
     }catch(e){try{window.toast&&toast('ثبت شروع در سرور ناموفق بود؛ اتصال دیتابیس را بررسی کنید.')}catch(_){}}
    }
    return old.apply(this,arguments)
   };
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 setInterval(layout,500);
 // Backup start-state watcher: if the live voice/PeerJS "go" event is missed, move the player into the game.
 let checkedRoom='',entering=false;
 setInterval(async()=>{
  const code=String(window.MAFIA_ROOM_CODE||''),room=$('lobbyRoom');
  if(!code||window.lobbyMode!=='player'||entering||!room||!room.classList.contains('on')||!db())return;
  if(checkedRoom!==code)checkedRoom=code;
  try{
   const res=await fetch(db()+'/roomsV23/'+encodeURIComponent(code)+'.json',{cache:'no-store'});
   if(!res.ok)return;const data=await res.json();
   if(!data||data.status!=='started'||!room.classList.contains('on'))return;
   entering=true;
   try{window.lobbyReady=true;if(window.Net&&typeof Net.enter==='function')Net.enter();else if(typeof window.roomStartGame==='function')window.roomStartGame()}
   finally{entering=false}
  }catch(e){}
 },1000);
 // Ensure chat messages carry the actual player's profile name when the UI state is not populated.
 const nativeFetch=window.fetch.bind(window);
 window.fetch=function(resource,options){
  try{
   const url=typeof resource==='string'?resource:(resource&&resource.url)||'';
   const method=String(options&&options.method||'GET').toUpperCase();
   if(method==='POST'&&url.includes('/roomsV23/')&&url.includes('/chat.json')&&options&&typeof options.body==='string'){
    const payload=JSON.parse(options.body);
    if(!payload.name||payload.name==='بازیکن'){
     const n=nick();if(n)payload.name=n;
     else if(uid())payload.name='بازیکن '+uid().slice(-4);
     options={...options,body:JSON.stringify(payload)};
    }
   }
  }catch(e){}
  return nativeFetch(resource,options);
 };

 // Voice connection watchdog: Voice is a top-level lexical const in index.html,
 // not window.Voice. Access it through the page's global lexical environment.
 let bmVoiceLastAttempt=0,bmVoiceRoomKey='',bmVoiceConnectingSince=0;
 const bmVoiceEval=(code)=>{try{return (0,eval)(code)}catch(e){return undefined}};
 const bmVoiceWatch=()=>{
  try{
   const room=document.getElementById('lobbyRoom');
   if(!room||!room.classList.contains('on'))return;
   const joinAvailable=bmVoiceEval("typeof Voice!=='undefined' && typeof Voice.join==='function'");
   if(!joinAvailable)return;
   // Re-apply the configured STUN/TURN list immediately before joining. This is
   // needed because a later inline default can overwrite VOICE_CFG.ice.
   bmVoiceEval("if(typeof VOICE_CFG!=='undefined'){VOICE_CFG.peer={host:'0.peerjs.com',port:443,path:'/',secure:true};VOICE_CFG.ice=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}].concat(Array.isArray(window.MAFIA_TURN)?window.MAFIA_TURN:[])}");
   const key=String(window.MAFIA_ROOM_CODE||window.__voiceKey||'main');
   if(key!==bmVoiceRoomKey){bmVoiceRoomKey=key;bmVoiceLastAttempt=0}
   const status=document.getElementById('voiceStatus');
   const msg=String(status&&status.textContent||'').trim();
   const active=!!bmVoiceEval("typeof Voice!=='undefined' && Voice.active && Voice.active()");
   if(active){bmVoiceConnectingSince=0;return}
   const now=Date.now();
   const connecting=/در حال تلاش برای اتصال ویس/i.test(msg);
   if(connecting){if(!bmVoiceConnectingSince)bmVoiceConnectingSince=now}
   else bmVoiceConnectingSince=0;
   // If the connection stays in the connecting state too long, permit a cautious retry.
   const stuckConnecting=connecting&&bmVoiceConnectingSince&&now-bmVoiceConnectingSince>=25000;
   const failed=!msg||/اتصال به سرور وویس برقرار نشد|کتابخانه وویس.*بارگذاری نشد|ظرفیت وویس این لابی پر است|خطا.*وویس/i.test(msg)||stuckConnecting;
   if(!failed)return;
   if(now-bmVoiceLastAttempt<15000)return;
   bmVoiceLastAttempt=now;
   bmVoiceConnectingSince=now;
   if(status)status.textContent='⏳ در حال تلاش برای اتصال ویس...';
   bmVoiceEval("Voice.join(window.__voiceKey||window.MAFIA_ROOM_CODE||'main')");
  }catch(e){}
 };
 setInterval(bmVoiceWatch,3000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(bmVoiceWatch,800)});
 window.addEventListener('online',()=>setTimeout(bmVoiceWatch,1200));

 // Remote voice audio recovery: the voice controller creates hidden audio elements
 // after WebRTC streams arrive. Android browsers may reject the first play() until
 // a user gesture resumes media playback.
 const bmTryPlayRemoteAudio=(a)=>{
  try{
   if(!a||!a.srcObject)return;
   a.autoplay=true;a.playsInline=true;a.muted=false;a.volume=1;
   const tracks=a.srcObject.getAudioTracks?a.srcObject.getAudioTracks():[];
   tracks.forEach(t=>{try{if(t.readyState==='live')t.enabled=true}catch(e){}});
   const play=()=>{
    try{
     const acs=[window.__bmVoiceAudioContext,window.voiceAudioContext].filter(Boolean);
     acs.forEach(c=>{if(c.state==='suspended')c.resume().catch(()=>{})});
     if(a.srcObject&&!document.hidden&&a.paused){const p=a.play();if(p&&p.catch)p.catch(()=>{})}
    }catch(e){}
   };
   if(!a.__bmAudioRecovery){
    a.__bmAudioRecovery=true;
    a.addEventListener('loadedmetadata',play);
    a.addEventListener('canplay',play);
    a.addEventListener('playing',()=>{a.muted=false;a.volume=1});
    tracks.forEach(t=>{t.addEventListener('unmute',play);t.addEventListener('ended',()=>{try{t.enabled=true}catch(e){}})});
   }
   play();
  }catch(e){}
 };
 try{
  const bmAudioObserver=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{
   if(n&&n.nodeType===1){
    if(n.tagName==='AUDIO')bmTryPlayRemoteAudio(n);
    if(n.querySelectorAll)n.querySelectorAll('audio').forEach(bmTryPlayRemoteAudio);
   }
  })));
  if(document.body)bmAudioObserver.observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll('audio').forEach(bmTryPlayRemoteAudio);
 }catch(e){}
 const bmResumeRemoteAudio=()=>{
  try{
   document.querySelectorAll('audio').forEach(a=>{
    if(a.srcObject){a.muted=false;a.volume=1;if(a.paused){const p=a.play();if(p&&p.catch)p.catch(()=>{})}}
   });
   [window.__bmVoiceAudioContext,window.voiceAudioContext].filter(Boolean).forEach(c=>{if(c.state==='suspended')c.resume().catch(()=>{})});
  }catch(e){}
 };
 document.addEventListener('pointerdown',bmResumeRemoteAudio,true);
 document.addEventListener('touchend',bmResumeRemoteAudio,true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(bmResumeRemoteAudio,300)});


})();


/* BLACK MAFIA: observer ghost panel + live running-lobby list (UI integration) */
(()=> {
 if(window.__bmObserverGhostV1)return; window.__bmObserverGhostV1=true;
 const db=()=>String(window.MAFIA_DB_URL||'').replace(/\/$/,'');
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const ghostSvg='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efffff"/><stop offset="1" stop-color="#8be9ff"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="5"/></filter></defs><ellipse cx="110" cy="230" rx="70" ry="12" fill="#5be7ff" opacity=".28" filter="url(#b)"/><path d="M38 220V105C38 48 70 18 110 18s72 30 72 87v115l-23-17-20 18-29-18-28 18-22-18z" fill="url(#g)" stroke="#d9ffff" stroke-width="4"/><path d="M63 104q-3-59 47-64 50 5 47 64" fill="none" stroke="#fff" stroke-width="8" opacity=".6"/><ellipse cx="84" cy="112" rx="10" ry="15" fill="#16384f"/><ellipse cx="136" cy="112" rx="10" ry="15" fill="#16384f"/><path d="M91 145q19 17 38 0" fill="none" stroke="#16384f" stroke-width="5" stroke-linecap="round"/><path d="M45 190q-18 13-15 34m145-34q18 13 15 34" fill="none" stroke="#9cf5ff" stroke-width="7" stroke-linecap="round"/></svg>');
 const style=document.createElement('style');style.textContent=`
 #bmGhostEntry{border:1px solid #7cecff;background:linear-gradient(135deg,#101d35,#263d5d);color:#dffcff;border-radius:12px;padding:9px 12px;font-weight:800;cursor:pointer;box-shadow:0 0 16px #5be7ff40}
 #bmGhostModal{position:fixed;inset:0;z-index:2147483000;background:#050b16ed;color:#e8fbff;display:none;overflow:auto;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box}
 #bmGhostModal .bm-g-card{max-width:620px;margin:5vh auto;background:linear-gradient(145deg,#101a2d,#172b42);border:1px solid #67dff5;border-radius:20px;padding:18px;box-shadow:0 0 35px #4be4ff30}
 #bmGhostModal input,#bmGhostModal textarea,#bmGhostModal select{width:100%;box-sizing:border-box;margin:6px 0;padding:11px;border-radius:9px;border:1px solid #44657b;background:#081320;color:white}
 #bmGhostModal button{border:1px solid #5ccfe7;border-radius:9px;background:#173b50;color:#efffff;padding:10px 12px;margin:4px;cursor:pointer}
 #bmGhostModal .bm-g-danger{background:#632b38;border-color:#ff8398}
 #bmGhostModal .bm-g-room{padding:10px;border:1px solid #37566a;border-radius:10px;margin:7px 0;display:flex;align-items:center;gap:8px;justify-content:space-between}
 body.bm-ghost-mode{background:#07111e!important}
 body.bm-ghost-mode:before{content:"";position:fixed;inset:0;z-index:9990;pointer-events:none;background:radial-gradient(ellipse at center,#8deaff20,transparent 60%),linear-gradient(130deg,#80e8ff08,#07111e66);backdrop-filter:saturate(.55)}
 #bmGhostBadge{position:fixed;right:10px;top:10px;z-index:9991;display:none;align-items:center;gap:8px;padding:6px 12px;border-radius:30px;background:#071725dd;border:1px solid #89f2ff;color:#dcfcff;box-shadow:0 0 20px #4deaff40}
 #bmGhostBadge img{width:34px;height:40px;object-fit:contain}
 `;document.head.appendChild(style);
 const modal=document.createElement('div');modal.id='bmGhostModal';modal.innerHTML=`<div class="bm-g-card">
 <div style="display:flex;align-items:center;gap:12px"><img src="${ghostSvg}" alt="روح ناظر" style="width:76px;height:90px;object-fit:contain"><div style="flex:1"><h2 style="margin:0">👻 پنل روح ناظر</h2><small style="color:#9defff">ورود ناظر به بازی‌های فعال</small></div><button id="bmGhostClose">بستن</button></div>
 <div id="bmGhostLogin"><p>کد ورود روح ناظر را وارد کن.</p><input id="bmGhostCode" inputmode="numeric" autocomplete="off" placeholder="کد ورود"><button id="bmGhostLoginBtn">ورود</button><div id="bmGhostError" style="color:#ff9da9"></div></div>
 <div id="bmGhostTools" style="display:none"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><h3>بازی‌های در حال اجرا</h3><button id="bmGhostRefresh">به‌روزرسانی</button></div><div id="bmGhostRooms">در حال بارگذاری…</div>
 <div id="bmGhostActions" style="display:none;border-top:1px solid #38566b;margin-top:14px;padding-top:12px"><h3 id="bmGhostRoomTitle">اتاق انتخاب‌شده</h3><p style="color:#b9dce9;font-size:13px">حالت روح فقط نمای ناظر را فعال می‌کند؛ اجرای دستورات مدیریتی در همهٔ گوشی‌ها نیازمند پشتیبانی سرور و کلاینت بازی است.</p>
 <input id="bmGhostTarget" placeholder="شناسه یا نام بازیکن برای اخطار/اخراج"><textarea id="bmGhostMessage" rows="2" placeholder="پیام ناظر به اتاق"></textarea>
 <button id="bmGhostSay">ارسال پیام ناظر</button><button id="bmGhostWarn">ثبت اخطار</button><button id="bmGhostKick" class="bm-g-danger">درخواست اخراج</button><button id="bmGhostEnd" class="bm-g-danger">پایان بازی</button><button id="bmGhostLeave">خروج از حالت روح</button><div id="bmGhostStatus" style="color:#9defff;margin-top:8px"></div></div></div>
 </div>`;
 document.body.appendChild(modal);
 const badge=document.createElement('div');badge.id='bmGhostBadge';badge.innerHTML='<img alt="روح ناظر" src="'+ghostSvg+'"><b>روح ناظر</b>';document.body.appendChild(badge);
 let selectedRoom='',refreshTimer=null;
 function open(){modal.style.display='block'}
 function close(){modal.style.display='none'}
 function setStatus(s){const n=document.getElementById('bmGhostStatus');if(n)n.textContent=s}
 function enterGhost(){document.body.classList.add('bm-ghost-mode');badge.style.display='flex';modal.style.display='none';}
 function leaveGhost(){document.body.classList.remove('bm-ghost-mode');badge.style.display='none';}
 async function loadRooms(){
  const host=document.getElementById('bmGhostRooms');host.innerHTML='در حال دریافت فهرست…';
  if(!db()){host.textContent='آدرس دیتابیس تنظیم نشده است.';return}
  try{
   const r=await fetch(db()+'/roomsV23.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json();const rooms=Object.entries(data||{}).filter(([k,v])=>v&&typeof v==='object'&&String(v.status||'').toLowerCase()==='started');
   if(!rooms.length){host.textContent='در حال حاضر لابی شروع‌شده‌ای پیدا نشد.';return}
   host.innerHTML=rooms.map(([k,v])=>'<div class="bm-g-room"><div><b>'+esc(v.name||v.roomName||('لابی '+k))+'</b><div style="font-size:12px;color:#a7cedd">کد: '+esc(k)+' · در حال اجرا</div></div><button data-bm-room="'+esc(k)+'">ورود روح</button></div>').join('');
   host.querySelectorAll('[data-bm-room]').forEach(b=>b.addEventListener('click',()=>selectRoom(b.getAttribute('data-bm-room'),data[b.getAttribute('data-bm-room')])));
  }catch(e){host.textContent='دریافت لابی‌ها ناموفق بود؛ اتصال دیتابیس و قوانین آن را بررسی کن.'}
 }
 function selectRoom(code,room){
  selectedRoom=code;document.getElementById('bmGhostActions').style.display='block';document.getElementById('bmGhostRoomTitle').textContent='👻 لابی '+(room.name||room.roomName||code);enterGhost();setStatus('حالت روح فعال شد. کد لابی: '+code);
 }
 async function action(kind,payload){
  if(!selectedRoom){setStatus('اول یک لابی را انتخاب کن.');return}
  try{
   const path=db()+'/roomsV23/'+encodeURIComponent(selectedRoom)+'/moderatorActions.json';
   const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:kind,...payload,by:'observer-ghost',at:Date.now()})});
   if(!r.ok)throw Error('HTTP '+r.status);
   setStatus('درخواست '+kind+' در سرور ثبت شد. برای اثرگذاری روی بازیکنان، کلاینت بازی باید این فرمان را پشتیبانی کند.');
  }catch(e){setStatus('ثبت فرمان ناموفق بود؛ قوانین دیتابیس را بررسی کن.')}
 }
 document.getElementById('bmGhostClose').onclick=close;
 document.getElementById('bmGhostLoginBtn').onclick=()=>{
  if(document.getElementById('bmGhostCode').value.trim()!=='00100900'){document.getElementById('bmGhostError').textContent='کد ورود نادرست است.';return}
  document.getElementById('bmGhostError').textContent='';document.getElementById('bmGhostLogin').style.display='none';document.getElementById('bmGhostTools').style.display='block';loadRooms();
  if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(loadRooms,10000);
 };
 document.getElementById('bmGhostRefresh').onclick=loadRooms;
 document.getElementById('bmGhostSay').onclick=()=>{const message=document.getElementById('bmGhostMessage').value.trim();if(message)action('message',{message})};
 document.getElementById('bmGhostWarn').onclick=()=>action('warn',{target:document.getElementById('bmGhostTarget').value.trim()});
 document.getElementById('bmGhostKick').onclick=()=>{if(confirm('درخواست اخراج این بازیکن ثبت شود؟'))action('kick',{target:document.getElementById('bmGhostTarget').value.trim()})};
 document.getElementById('bmGhostEnd').onclick=()=>{if(confirm('بازی تمام شود؟'))action('end_game',{status:'ended'})};
 document.getElementById('bmGhostLeave').onclick=()=>{leaveGhost();document.getElementById('bmGhostActions').style.display='none';selectedRoom='';setStatus('از حالت روح خارج شدی.')};
 badge.onclick=open;
 function addEntry(){
  if(document.getElementById('bmGhostEntry'))return;
  const visible=n=>{
   if(!n||!n.isConnected||n.closest('#bmGhostModal'))return false;
   const s=getComputedStyle(n);
   return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&(n.offsetWidth>0||n.offsetHeight>0||n.getClientRects().length>0);
  };
  const candidates=[...document.querySelectorAll('button,a,[role="button"]')];
  const isAdmin=n=>/مرکز مدیریت\s*\/\s*ادمین|مرکز مدیریت|ورود به مدیریت|پنل مدیریت/.test((n.innerText||n.textContent||'').replace(/\s+/g,' ').trim());
  // Pick a visible management control, not the similarly named button in a hidden modal.
  const admin=candidates.find(n=>visible(n)&&isAdmin(n));
  if(!admin)return;
  const b=document.createElement('button');b.id='bmGhostEntry';b.type='button';b.textContent='روح ناظر';b.onclick=open;
  b.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;position:relative;z-index:20;width:100%;max-width:100%;margin:10px 0;padding:12px;border-radius:12px;border:1px solid #7cecff;background:linear-gradient(135deg,#101d35,#263d5d);color:#dffcff;font-weight:800;cursor:pointer;box-sizing:border-box';
  // Insert beside the visible management button so the entry is visible on the same screen.
  (admin.parentElement||admin).insertAdjacentElement('afterend',b);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addEntry,{once:true});else addEntry();
 new MutationObserver(addEntry).observe(document.documentElement,{childList:true,subtree:true});
})();

/* BLACK MAFIA UI repair: unified settings/admin, visible save action, startup law notice. */
(()=> {
 'use strict';
 if(window.__bmUnifiedUiRepairV1)return;
 window.__bmUnifiedUiRepairV1=true;
 const byId=id=>document.getElementById(id);
 function install(){
  if(!document.body)return;
  // Put the settings and admin cards inside one shared panel while keeping their original IDs/functions.
  const settingsRoot=byId('bpSettings'),adminRoot=byId('bpAdmin');
  const settingsCard=settingsRoot&&settingsRoot.querySelector('.bpModal');
  const adminCard=adminRoot&&adminRoot.querySelector('.bpModal');
  if(settingsCard&&adminCard&&!byId('bmUnifiedControl')){
   const root=document.createElement('div');
   root.id='bmUnifiedControl';
   root.dir='rtl';
   root.style.cssText='position:fixed;inset:0;z-index:2147483300;display:none;align-items:center;justify-content:center;padding:12px;background:#000d;backdrop-filter:blur(10px);font-family:Tahoma,Arial,sans-serif;box-sizing:border-box';
   root.innerHTML='<section id="bmUnifiedSheet" style="width:min(96vw,650px);max-height:92dvh;overflow:auto;overscroll-behavior:contain;background:linear-gradient(180deg,#171719,#050506);border:1px solid #a77a30;border-radius:16px;padding:12px;box-shadow:0 14px 44px #000d;box-sizing:border-box"><header style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="flex:1;color:#f3d98c;font-size:17px">⚙️ تنظیمات و مدیریت</b><button id="bmUnifiedClose" type="button" aria-label="بستن پنل" style="border:1px solid #8e6a31;border-radius:8px;padding:7px 12px;background:#23170b;color:#fff0bd;font-size:18px">×</button></header><nav id="bmUnifiedTabs" style="display:flex;gap:8px;margin:0 0 12px"><button type="button" data-pane="settings" style="flex:1;min-height:44px;border:1px solid #e0b255;border-radius:9px;background:linear-gradient(#e7bd5b,#9d6d1d);color:#1b1005;font-weight:800;font-family:inherit">⚙️ تنظیمات</button><button type="button" data-pane="admin" style="flex:1;min-height:44px;border:1px solid #8e6a31;border-radius:9px;background:#17120c;color:#f6e6bd;font-weight:800;font-family:inherit">🛡 مدیریت</button></nav><div id="bmUnifiedSettingsPane"></div><div id="bmUnifiedAdminPane" style="display:none"></div></section>';
   document.body.appendChild(root);
   const sheet=byId('bmUnifiedSheet'),settingsPane=byId('bmUnifiedSettingsPane'),adminPane=byId('bmUnifiedAdminPane');
   settingsCard.style.setProperty('width','100%','important');
   settingsCard.style.setProperty('max-width','none','important');
   settingsCard.style.setProperty('max-height','none','important');
   settingsCard.style.setProperty('overflow','visible','important');
   settingsCard.style.setProperty('margin','0','important');
   settingsCard.style.setProperty('padding','0','important');
   settingsCard.style.setProperty('border','0','important');
   settingsCard.style.setProperty('box-shadow','none','important');
   settingsCard.style.setProperty('background','transparent','important');
   adminCard.style.setProperty('width','100%','important');
   adminCard.style.setProperty('max-width','none','important');
   adminCard.style.setProperty('max-height','none','important');
   adminCard.style.setProperty('overflow','visible','important');
   adminCard.style.setProperty('margin','0','important');
   adminCard.style.setProperty('padding','0','important');
   adminCard.style.setProperty('border','0','important');
   adminCard.style.setProperty('box-shadow','none','important');
   adminCard.style.setProperty('background','transparent','important');
   settingsPane.appendChild(settingsCard);
   adminPane.appendChild(adminCard);
   settingsRoot.remove();
   adminRoot.remove();

   const hub=byId('bpHub');
   if(hub){
    const controls=[...hub.querySelectorAll('.bpHubBtn')];
    const settingsButton=controls.find(b=>(b.getAttribute('onclick')||'').includes("BP.open('settings')")||/تنظیمات/.test(b.textContent||''));
    const adminButton=controls.find(b=>(b.getAttribute('onclick')||'').includes("BP.open('admin')")||/مدیر\s*\/\s*ادمین|مدیریت/.test(b.textContent||''));
    if(settingsButton){
     settingsButton.textContent='⚙️ تنظیمات و مدیریت';
     settingsButton.setAttribute('onclick',"window.BMOpenControls('settings')");
    }else{
     const button=document.createElement('button');
     button.className='bpHubBtn';button.textContent='⚙️ تنظیمات و مدیریت';
     button.setAttribute('onclick',"window.BMOpenControls('settings')");
     hub.appendChild(button);
    }
    if(adminButton&&adminButton!==settingsButton)adminButton.remove();
   }

   // Redirect every remaining settings/admin shortcut to the same combined panel.
   document.querySelectorAll('[onclick]').forEach(el=>{
    const action=el.getAttribute('onclick')||'';
    if(action.includes("BP.open('settings')"))el.setAttribute('onclick',"window.BMOpenControls('settings')");
    else if(action.includes("BP.open('admin')"))el.setAttribute('onclick',"window.BMOpenControls('admin')");
    if(action.includes("BP.close('settings')")||action.includes("BP.close('admin')"))el.setAttribute('onclick','window.BMCloseControls()');
   });
   byId('bmUnifiedClose').addEventListener('click',()=>window.BMCloseControls());
   root.addEventListener('click',e=>{if(e.target===root)window.BMCloseControls()});
   byId('bmUnifiedTabs').querySelectorAll('[data-pane]').forEach(button=>button.addEventListener('click',()=>window.BMOpenControls(button.dataset.pane)));

   // Keep the save/reset row pinned at the bottom on phone screens.
   const actions=settingsCard.querySelector('.bpActions');
   if(actions){
    actions.style.setProperty('position','sticky','important');
    actions.style.setProperty('bottom','0','important');
    actions.style.setProperty('z-index','20','important');
    actions.style.setProperty('display','flex','important');
    actions.style.setProperty('gap','8px','important');
    actions.style.setProperty('flex-wrap','wrap','important');
    actions.style.setProperty('padding','10px 0 4px','important');
    actions.style.setProperty('margin-top','12px','important');
    actions.style.setProperty('border-top','1px solid #6f5228','important');
    actions.style.setProperty('background','linear-gradient(180deg,#111114f5,#050506)','important');
    const saveButton=actions.querySelector('.bpPrimary');
    if(saveButton){
     saveButton.textContent='💾 ذخیره تنظیمات';
     saveButton.setAttribute('onclick','window.BMSaveSettings()');
     saveButton.style.setProperty('display','block','important');
     saveButton.style.setProperty('visibility','visible','important');
     saveButton.style.setProperty('opacity','1','important');
     saveButton.style.setProperty('min-height','46px','important');
     saveButton.style.setProperty('flex','1 1 170px','important');
     saveButton.style.setProperty('font-weight','900','important');
     saveButton.style.setProperty('font-size','14px','important');
    }
    const resetButton=actions.querySelector('.bpDanger');
    if(resetButton)resetButton.style.setProperty('flex','1 1 120px','important');
   }

   window.BMOpenControls=function(which){
    root.style.display='flex';
    const pane=which==='admin'?'admin':'settings';
    settingsPane.style.display=pane==='settings'?'block':'none';
    adminPane.style.display=pane==='admin'?'block':'none';
    byId('bmUnifiedTabs').querySelectorAll('[data-pane]').forEach(b=>{
     const selected=b.dataset.pane===pane;
     b.style.background=selected?'linear-gradient(#e7bd5b,#9d6d1d)':'#17120c';
     b.style.color=selected?'#1b1005':'#f6e6bd';
     b.style.borderColor=selected?'#e0b255':'#8e6a31';
    });
    if(pane==='settings'){
     const key='mafia_bp_settings_v1';
     const q=localStorage.getItem(key+'q')||'high';
     document.querySelectorAll('#bpQuality button').forEach(b=>b.classList.toggle('on',b.dataset.q===q));
     const vol=byId('bpVol');if(vol)vol.value=Math.round(Number(localStorage.getItem(key+'vol')||0.8)*100);
     const voice=byId('bpVoiceVol');if(voice)voice.value=Math.round(Number(localStorage.getItem(key+'voice')||1)*100);
     const music=byId('bpMusic');if(music)music.value=localStorage.getItem(key+'music')||'on';
    }else{
     const logged=sessionStorage.getItem('bp_admin')==='1';
     if(byId('bpAdminLogin'))byId('bpAdminLogin').style.display=logged?'none':'block';
     if(byId('bpAdminPanel'))byId('bpAdminPanel').style.display=logged?'block':'none';
    }
   };
   window.BMCloseControls=function(){root.style.display='none'};
   window.BMSaveSettings=function(){
    try{
     if(typeof BP!=='undefined'&&typeof BP.saveSettings==='function')BP.saveSettings();
     else{
      const key='mafia_bp_settings_v1';
      const q=document.querySelector('#bpQuality button.on')?.dataset.q||'high';
      localStorage.setItem(key+'q',q);
      localStorage.setItem(key+'vol',((Number(byId('bpVol')?.value)||0)/100).toFixed(2));
      localStorage.setItem(key+'voice',((Number(byId('bpVoiceVol')?.value)||0)/100).toFixed(2));
      localStorage.setItem(key+'music',byId('bpMusic')?.value||'on');
     }
    }catch(e){alert('ذخیره تنظیمات انجام نشد؛ دوباره تلاش کن.');return}
   };
  }

  // Mandatory, visible Iranian-law notice at every fresh game start.
  if(!byId('bmLawStartupOverlay')){
   const law=document.createElement('div');
   law.id='bmLawStartupOverlay';law.dir='rtl';
   law.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:#000e;backdrop-filter:blur(10px);font-family:Tahoma,Arial,sans-serif;box-sizing:border-box';
   law.innerHTML='<section style="width:min(94vw,460px);box-sizing:border-box;border:2px solid #d7b15b;border-radius:18px;background:linear-gradient(160deg,#172a1d,#080b09 65%);color:#fff8e8;padding:22px;text-align:center;box-shadow:0 0 40px #000"><div style="font-size:38px;line-height:1.5">🇮🇷</div><h2 style="color:#f2d98e;margin:4px 0 12px;font-size:20px">اطلاعیه قوانین بازی</h2><p style="font-size:14px;line-height:2;margin:0 0 18px">این بازی تابع قوانین و مقررات جمهوری اسلامی ایران است. با ادامهٔ بازی، رعایت قوانین کشور، احترام به سایر بازیکنان و پرهیز از توهین و آزار دیگران را می‌پذیرید.</p><button id="bmLawAccept" type="button" style="width:100%;min-height:50px;border:1px solid #fff0a8;border-radius:10px;background:linear-gradient(#fff0a8,#c8922c);color:#201305;font:900 15px Tahoma,Arial,sans-serif">قوانین را خواندم؛ ادامه بازی</button></section>';
   document.body.appendChild(law);
   byId('bmLawAccept').addEventListener('click',()=>law.remove());
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
