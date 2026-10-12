/* BLACK MAFIA — guest mode: training only, no player name or account */
(()=> {
'use strict';
if(window.__bmGuestModeV1)return;window.__bmGuestModeV1=true;
const $=id=>document.getElementById(id);
const isGuest=()=>{try{return localStorage.getItem('bm_guest_mode')==='1'}catch(e){return false}};
const toastMsg=t=>{try{if(typeof window.toast==='function')window.toast(t);else alert(t)}catch(e){alert(t)}};
let gate=null,inTraining=false;
function ensureGate(){
 if(gate&&gate.isConnected)return gate;
 const css=document.createElement('style');
 css.textContent='#bmGuestGate{position:fixed;inset:0;z-index:2147483644;display:none;align-items:center;justify-content:center;padding:18px;background:radial-gradient(ellipse at 50% 15%,#33220f,#070707 68%);font-family:Tahoma,Arial,sans-serif;box-sizing:border-box;color:#f8ebcb}#bmGuestGate .bmg-card{width:min(92vw,430px);padding:24px;border:2px solid #c69a46;border-radius:18px;background:linear-gradient(145deg,#21180d,#080808);box-shadow:0 12px 44px #000c;text-align:center}#bmGuestGate h2{margin:0 0 10px;color:#f0d28a;font-size:22px}#bmGuestGate p{font-size:14px;line-height:2;color:#eadfc8}#bmGuestGate button{display:block;width:100%;min-height:48px;margin-top:10px;padding:12px;border-radius:10px;font:800 15px Tahoma,Arial,sans-serif;cursor:pointer}#bmGuestTraining{border:1px solid #fff0a8;background:linear-gradient(#fff0a8,#c18a29);color:#201305}#bmGuestRegister{border:1px solid #8b7755;background:#17120c;color:#f7e9c8}body.bm-guest-mode #nav,body.bm-guest-mode #bpHub{display:none!important}';
 document.head.appendChild(css);
 gate=document.createElement('section');gate.id='bmGuestGate';gate.dir='rtl';
 gate.innerHTML='<div class="bmg-card"><div style="font-size:44px;margin-bottom:8px">🎓</div><h2>ورود مهمان</h2><p>بدون نام و مشخصات وارد شو. حساب مهمان فقط اجازهٔ استفاده از آموزش را دارد. برای ورود به لابی‌های دیگر، بازی‌های آنلاین و اتاق اتحاد باید ثبت‌نام کامل کنی.</p><button id="bmGuestTraining" type="button">ورود به آموزش</button><button id="bmGuestRegister" type="button">ثبت‌نام کامل و باز کردن لابی‌ها</button></div>';
 document.body.appendChild(gate);
 $('bmGuestTraining').addEventListener('click',()=>startTraining());
 $('bmGuestRegister').addEventListener('click',()=>{try{localStorage.removeItem('bm_guest_mode')}catch(e){}window.BMGuest=false;location.reload()});
 return gate;
}
function showGate(){if(!isGuest())return;document.body.classList.add('bm-guest-mode');inTraining=false;ensureGate().style.display='flex';}
function hideGate(){if(gate)gate.style.display='none';inTraining=true;}
function startTraining(){
 if(!isGuest())return;
 window.BMGuest=true;
 try{
  if(window.S){window.S.nick='';window.S.fullName='';window.S.account='';window.S.age=0;window.S.profileComplete=false;window.S.photo='';}
  if(typeof window.lobbyMode!=='undefined')window.lobbyMode='player';
  if(typeof window.lobbyKind!=='undefined')window.lobbyKind='edu';
  if(typeof window.buildLobbyRoom==='function'&&$('lobbyRoom')){
   window.buildLobbyRoom();
   if($('lobbyGate'))$('lobbyGate').classList.remove('on');
   if($('doorScreen'))$('doorScreen').classList.remove('on');
   $('lobbyRoom').classList.add('on');
   hideGate();
  }else{
   toastMsg('آموزش هنوز بارگذاری نشده است؛ چند لحظه دیگر دوباره بزن.');
  }
 }catch(e){toastMsg('ورود به آموزش انجام نشد؛ صفحه را یک‌بار تازه‌سازی کن.')}
}
window.BMGuestStart=showGate;
window.BMGuestMode={isGuest,showGate,startTraining};
const originalEnter=window.enterLobby;
if(typeof originalEnter==='function'){
 window.enterLobby=async function(kind){
  if(!isGuest())return originalEnter.apply(this,arguments);
  if(kind!=='edu'&&kind!=='training'){toastMsg('مهمان فقط اجازهٔ ورود به لابی آموزشی را دارد.');return false}
  startTraining();return true;
 };
}
const originalGo=window.start;
if(typeof originalGo==='function'){
 window.start=function(kind){
  if(isGuest()){toastMsg('مهمان فقط اجازهٔ استفاده از آموزش را دارد.');showGate();return}
  return originalGo.apply(this,arguments);
 };
}
const originalNav=window.nav;
if(typeof originalNav==='function'){
 window.nav=function(page){
  if(isGuest()&&page!=='home'){toastMsg('این بخش فقط پس از ثبت‌نام فعال می‌شود.');return}
  return originalNav.apply(this,arguments);
 };
}
const originalRoomStart=window.roomStartGame;
if(typeof originalRoomStart==='function'){
 window.roomStartGame=async function(){
  if(isGuest()){
   window.MAFIA_ROOM_ONLINE=false;
   return originalRoomStart.apply(this,arguments);
  }
  return originalRoomStart.apply(this,arguments);
 };
}
const originalClose=window.closeRoom;
if(typeof originalClose==='function'){
 window.closeRoom=function(){
  const result=originalClose.apply(this,arguments);
  if(isGuest())showGate();
  return result;
 };
}
const originalLeave=window.leave;
if(typeof originalLeave==='function'){
 window.leave=function(){
  if(isGuest()){showGate();return}
  return originalLeave.apply(this,arguments);
 };
}
function restrictRoomButtons(){
 if(!isGuest())return;
 const cards=document.querySelectorAll('.lobbyCards .lobbyCard');
 cards.forEach(card=>{
  const title=card.querySelector('h3')?.textContent||'';
  if(!title.includes('آموزشی')){card.style.display='none'}
 });
 const profile=$('profileSetupBlock');if(profile)profile.style.display='none';
 const setupTitle=$('profileSetupTitle');if(setupTitle)setupTitle.style.display='none';
 const gallery=$('proAvGallery');if(gallery)gallery.style.display='none';
 const summary=$('profileSavedSummary');if(summary)summary.style.display='none';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(isGuest())showGate();restrictRoomButtons()},{once:true});
else {if(isGuest())showGate();restrictRoomButtons()}
if(window.MutationObserver)new MutationObserver(()=>{if(isGuest())restrictRoomButtons()}).observe(document.documentElement,{childList:true,subtree:true});
})();
