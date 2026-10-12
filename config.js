/* تنظیمات بازی؛ تا زمان انتشار واسط Cloudflare از نشانی اصلی دیتابیس استفاده می‌شود. */
window.MAFIA_DB_URL='/api/db';
// سرور TURN برای اینترنت همراه/شبکه‌های سخت. این‌ها سرورهای رایگان و مشترک Open Relay هستند (برای شروع و تست).
// برای استفادهٔ جدی، در metered.ca حساب رایگان بساز و اطلاعات خودت را اینجا بگذار.
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
 let bmVoiceLastAttempt=0,bmVoiceRoomKey='';
 const bmVoiceEval=(code)=>{try{return (0,eval)(code)}catch(e){return undefined}};
 const bmVoiceWatch=()=>{
  try{
   const room=document.getElementById('lobbyRoom');
   if(!room||!room.classList.contains('on'))return;
   const joinAvailable=bmVoiceEval("typeof Voice!=='undefined' && typeof Voice.join==='function'");
   if(!joinAvailable)return;
   const key=String(window.MAFIA_ROOM_CODE||window.__voiceKey||'main');
   if(key!==bmVoiceRoomKey){bmVoiceRoomKey=key;bmVoiceLastAttempt=0}
   const status=document.getElementById('voiceStatus');
   const msg=String(status&&status.textContent||'').trim();
   const active=!!bmVoiceEval("typeof Voice!=='undefined' && Voice.active && Voice.active()");
   if(active)return;
   const failed=!msg||/اتصال به سرور وویس برقرار نشد|کتابخانه وویس.*بارگذاری نشد|ظرفیت وویس این لابی پر است|خطا.*وویس/i.test(msg);
   if(!failed)return;
   const now=Date.now();
   if(now-bmVoiceLastAttempt<15000)return;
   bmVoiceLastAttempt=now;
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
