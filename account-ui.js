/* BLACK MAFIA — required first-visit registration (server-backed) */
(()=> {
'use strict';
if(window.__bmAccountUIv1)return;window.__bmAccountUIv1=true;
const $=id=>document.getElementById(id);
const api=(path,opts={})=>fetch(path,{cache:'no-store',...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
const getUid=()=>{let id='';try{id=localStorage.getItem('mafia_uid')||''}catch(e){}if(!/^[A-Za-z0-9_-]{1,80}$/.test(id)){id='u_'+Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x=>x.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('mafia_uid',id)}catch(e){}}return id};
const accountFor=uid=>{let a='';try{a=localStorage.getItem('mafia_account')||''}catch(e){}if(!/^[A-Z0-9_-]{3,24}$/.test(a)){a='BM'+uid.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();try{localStorage.setItem('mafia_account',a)}catch(e){}}return a};
const style=document.createElement('style');style.textContent='#bmRegOverlay{position:fixed;inset:0;z-index:2147483646;background:#080503f5;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;font-family:Tahoma,Arial,sans-serif;color:#f6ead0}#bmRegCard{width:min(420px,100%);max-height:94dvh;overflow:auto;background:linear-gradient(#40220f,#180b05);border:2px solid #e0b255;border-radius:16px;padding:18px;box-shadow:0 0 35px #e0b25530}#bmRegCard h2{margin:0 0 8px;text-align:center}#bmRegCard p{font-size:13px;line-height:1.8}#bmRegCard label{display:block;text-align:right;font-size:12px;margin-top:10px}#bmRegCard input{width:100%;box-sizing:border-box;margin-top:5px;padding:11px;border-radius:8px;border:1px solid #b88b3b;background:#100803;color:white;font:inherit}#bmRegSubmit{width:100%;margin-top:14px;padding:12px;border-radius:9px;border:1px solid #f0c35f;background:linear-gradient(#f0c35f,#a8741f);color:#201008;font-weight:bold;font:inherit}#bmRegError{color:#ff9ca7;font-size:12px;min-height:20px;margin-top:8px}';
document.head.appendChild(style);
const overlay=document.createElement('div');overlay.id='bmRegOverlay';overlay.innerHTML='<section id="bmRegCard" dir="rtl"><h2>🎭 تکمیل ثبت‌نام مافیا</h2><p>برای ورود به بازی، مشخصاتت را یک‌بار ثبت کن. نام کاربری باید یکتا باشد و اطلاعات روی سرور ذخیره می‌شود.</p><form id="bmRegForm"><label>نام و نام خانوادگی<input id="bmRegFull" maxlength="60" autocomplete="name" required placeholder="نام واقعی یا نام نمایشی کامل"></label><label>نام کاربری بازی (تکراری نباشد)<input id="bmRegNick" maxlength="18" minlength="2" required autocomplete="nickname" placeholder="۲ تا ۱۸ نویسه"></label><label>سن<input id="bmRegAge" type="number" min="1" max="99" required inputmode="numeric" placeholder="سن"></label><label>کد کاربری شما<input id="bmRegAccount" readonly></label><button id="bmRegSubmit" type="submit">ثبت مشخصات و ورود</button><div id="bmRegError" role="status"></div></form></section>';
function show(){if(!overlay.isConnected)document.body.appendChild(overlay);overlay.style.display='flex';const uid=getUid();$('bmRegAccount').value=accountFor(uid);try{const p=JSON.parse(localStorage.getItem('mafia_profile')||'{}');$('bmRegFull').value=p.fullName||'';$('bmRegNick').value=p.nick||'';$('bmRegAge').value=p.age||''}catch(e){}}
async function submit(e){e.preventDefault();const b=$('bmRegSubmit'),error=$('bmRegError'),uid=getUid(),fullName=$('bmRegFull').value.trim(),nick=$('bmRegNick').value.trim().normalize('NFKC'),age=Number($('bmRegAge').value),account=accountFor(uid);error.textContent='';if(fullName.length<2||nick.length<2||nick.length>18||!Number.isInteger(age)||age<1||age>99){error.textContent='همهٔ مشخصات را درست وارد کن.';return}b.disabled=true;b.textContent='در حال ذخیرهٔ امن مشخصات…';try{const r=await api('/api/register',{method:'POST',body:JSON.stringify({uid,fullName,nick,account,age,profileComplete:true,avatarSeed:1})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'ثبت‌نام انجام نشد.');const profile={uid,fullName,nick,account,age,serial:d.user&&d.user.serial,registered:true};try{localStorage.setItem('mafia_profile',JSON.stringify(profile));localStorage.setItem('mafia_uid',uid);localStorage.setItem('mafia_account',account);localStorage.setItem('mafia_nick',nick)}catch(e){}try{if(window.S){window.S.nick=nick;window.S.age=age;window.S.account=account;window.S.fullName=fullName;window.S.profileComplete=true}try{eval("if(typeof S!=='undefined'){S.nick="+JSON.stringify(nick)+";S.age="+Number(age)+";S.account="+JSON.stringify(account)+";S.fullName="+JSON.stringify(fullName)+";S.profileComplete=true;save()}")}catch(_){}const n=$('playerNick');if(n)n.value=nick;const ageInput=$('playerAge');if(ageInput)ageInput.value=String(age);window.dispatchEvent(new CustomEvent('bm:profile-ready',{detail:profile}))}catch(e){}overlay.remove();}catch(err){error.textContent=err.message||'ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.'}finally{b.disabled=false;b.textContent='ثبت مشخصات و ورود'}}
overlay.querySelector('#bmRegForm').addEventListener('submit',submit);
function applyProfile(p){
  if(!p||!p.registered||!p.uid||!p.fullName||!p.nick||!p.account||!p.age)return false;
  const profile={uid:p.uid,fullName:p.fullName,nick:p.nick,account:p.account,age:Number(p.age),serial:p.serial,registered:true};
  try{localStorage.setItem('mafia_profile',JSON.stringify(profile));localStorage.setItem('mafia_uid',profile.uid);localStorage.setItem('mafia_account',profile.account);localStorage.setItem('mafia_nick',profile.nick)}catch(e){}
  try{eval("if(typeof S!=='undefined'){S.nick="+JSON.stringify(profile.nick)+";S.age="+Number(profile.age)+";S.account="+JSON.stringify(profile.account)+";S.fullName="+JSON.stringify(profile.fullName)+";S.profileComplete=true;save()}")}catch(_){}
  const n=$('playerNick');if(n)n.value=profile.nick;
  const ageInput=$('playerAge');if(ageInput)ageInput.value=String(profile.age);
  window.dispatchEvent(new CustomEvent('bm:profile-ready',{detail:profile}));
  return true;
}
async function init(){
  const uid=getUid(),account=accountFor(uid);
  try{
    const r=await api('/api/profile?account='+encodeURIComponent(account)+'&uid='+encodeURIComponent(uid),{method:'GET'});
    const d=await r.json().catch(()=>({}));
    if(r.ok&&d.user&&applyProfile(d.user))return;
    if(r.status===403){show();$('bmRegError').textContent=d.error||'این حساب امکان ورود ندارد.';return}
  }catch(e){}
  try{
    const p=JSON.parse(localStorage.getItem('mafia_profile')||'null');
    if(p&&p.registered&&p.uid===getUid()&&p.fullName&&p.nick&&p.account&&p.age){applyProfile(p);return}
  }catch(e){}
  show();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BMAccount={getProfile(){try{return JSON.parse(localStorage.getItem('mafia_profile')||'null')}catch(e){return null}},getUid};
})();