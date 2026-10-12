/* BLACK MAFIA — required first-visit registration (server-backed) */
(()=> {
'use strict';
if(window.__bmAccountUIv1)return;window.__bmAccountUIv1=true;
const $=id=>document.getElementById(id);
const api=(path,opts={})=>fetch(path,{cache:'no-store',...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
const getUid=()=>{let id='';try{id=localStorage.getItem('mafia_uid')||''}catch(e){}if(!/^[A-Za-z0-9_-]{1,80}$/.test(id)){id='u_'+Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x=>x.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('mafia_uid',id)}catch(e){}}return id};
const accountFor=uid=>{let a='';try{a=localStorage.getItem('mafia_account')||''}catch(e){}if(!/^[A-Z0-9_-]{3,24}$/.test(a)){a='BM'+uid.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase();try{localStorage.setItem('mafia_account',a)}catch(e){}}return a};
const style=document.createElement('style');style.textContent='#bmRegOverlay{position:fixed;inset:0;z-index:2147483646;background:#080503f5;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;font-family:Tahoma,Arial,sans-serif;color:#f6ead0}#bmRegCard{width:min(420px,100%);max-height:94dvh;overflow:auto;background:linear-gradient(#40220f,#180b05);border:2px solid #e0b255;border-radius:16px;padding:18px;box-shadow:0 0 35px #e0b25530}#bmRegCard h2{margin:0 0 8px;text-align:center}#bmRegCard p{font-size:13px;line-height:1.8}#bmRegCard label{display:block;text-align:right;font-size:12px;margin-top:10px}#bmRegCard input{width:100%;box-sizing:border-box;margin-top:5px;padding:11px;border-radius:8px;border:1px solid #b88b3b;background:#100803;color:white;font:inherit}#bmRegLaw{padding:10px;margin:12px 0;border:1px solid #65a7d8;border-radius:10px;background:#102337;color:#fff;font-size:12px;line-height:1.9;text-align:center}#bmRegForm{display:flex;flex-direction:column;gap:2px}#bmRegSubmit{position:sticky;bottom:0;z-index:5;display:block;visibility:visible;opacity:1;width:100%;min-height:58px;margin-top:14px;padding:14px;border-radius:10px;border:2px solid #fff0a8;background:linear-gradient(#fff0a8,#f0b83f 55%,#bd7d18);color:#201008;font-weight:900;font-size:17px;font-family:inherit;box-shadow:0 0 0 3px #160a04,0 0 22px #ffc94a99;cursor:pointer;flex-shrink:0}#bmRegSubmit:disabled{opacity:.55;cursor:not-allowed}#bmRegSubmit:not(:disabled){filter:brightness(1.04)}.bmRegFieldState{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:24px;margin-top:4px;font-size:18px;font-weight:900}.bmRegFieldState.ok{color:#6ef0a2}.bmRegFieldState.bad{color:#ff8c99}.bmRegHint{font-size:11px;color:#d9c6a6;margin-top:3px}#bmRegError{color:#ff9ca7;font-size:12px;min-height:20px;margin-top:8px}';
document.head.appendChild(style);
function showLawBanner(){
 if(document.getElementById('bmLawStart'))return;
 const box=document.createElement('aside');box.id='bmLawStart';box.dir='rtl';
 box.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:#000e;backdrop-filter:blur(8px);font:14px/2 Tahoma,Arial,sans-serif;color:#fff8e8;box-sizing:border-box';
 box.innerHTML='<section style="width:min(94vw,460px);box-sizing:border-box;padding:24px;border:2px solid #d7b15b;border-radius:18px;background:linear-gradient(160deg,#172a1d,#080b09 65%);text-align:center;box-shadow:0 0 40px #000"><div style="font-size:42px;line-height:1.5">🇮🇷</div><h2 style="color:#f2d98e;margin:4px 0 12px;font-size:21px">اطلاعیه مهم و رسمی</h2><p style="font-size:14px;line-height:2;margin:0 0 20px">بازی <b>Black Mafia</b> تابع قوانین و مقررات جمهوری اسلامی ایران می‌باشد و استفاده از آن مستلزم رعایت کامل این قوانین و مقررات است.<br><b>رعایت این اصل برای تمامی کاربران الزامی است.</b></p><button id="bmLawAccept" type="button" style="width:100%;min-height:50px;border:1px solid #fff0a8;border-radius:10px;background:linear-gradient(#fff0a8,#c8922c);color:#201305;font:900 15px Tahoma,Arial,sans-serif">قوانین را خواندم؛ ادامه</button></section>';
 document.body.appendChild(box);
 box.querySelector('#bmLawAccept').addEventListener('click',()=>{
  box.remove();
  if(window.BMGuest&&typeof window.BMGuestStart==='function'){window.BMGuestStart();return}
  const door=document.getElementById('doorScreen');
  if(door)door.classList.add('on');
 });
}
const overlay=document.createElement('div');overlay.id='bmRegOverlay';overlay.innerHTML='<section id="bmRegCard" dir="rtl"><h2>🎭 تکمیل ثبت‌نام مافیا</h2><p>برای ورود به بازی، مشخصاتت را یک‌بار ثبت کن. نام کاربری باید یکتا باشد و اطلاعات روی سرور ذخیره می‌شود.</p><div id="bmRegLaw">🇮🇷 بازی Black Mafia تابع قوانین و مقررات جمهوری اسلامی ایران می‌باشد و استفاده از آن مستلزم رعایت کامل این قوانین و مقررات است. رعایت این اصل برای تمامی کاربران الزامی است.</div><form id="bmRegForm"><label>نام و نام خانوادگی<input id="bmRegFull" maxlength="60" autocomplete="name" required placeholder="حداقل ۲ نویسه"><span id="bmStateFull" class="bmRegFieldState" aria-live="polite">○</span><span class="bmRegHint">۲ تا ۶۰ نویسه</span></label><label>نام کاربری بازی (تکراری نباشد)<input id="bmRegNick" maxlength="18" minlength="2" required autocomplete="nickname" placeholder="۲ تا ۱۸ نویسه"><span id="bmStateNick" class="bmRegFieldState" aria-live="polite">○</span><span class="bmRegHint">نام کاربری باید یکتا باشد؛ تکراری بودن هنگام ثبت از سرور بررسی می‌شود</span></label><label>سن<input id="bmRegAge" type="number" min="1" max="99" step="1" required inputmode="numeric" placeholder="سن"><span id="bmStateAge" class="bmRegFieldState" aria-live="polite">○</span><span class="bmRegHint">فقط عدد صحیح بین ۱ تا ۹۹</span></label><label>کد اکانت دلخواه<input id="bmRegAccount" maxlength="24" minlength="3" autocapitalize="characters" autocomplete="off" spellcheck="false" required placeholder="۳ تا ۲۴ حرف یا عدد انگلیسی"><span id="bmStateAccount" class="bmRegFieldState" aria-live="polite">○</span><span class="bmRegHint">حروف انگلیسی، عدد، خط تیره یا زیرخط؛ هنگام ثبت یکتا بودن بررسی می‌شود</span></label><button id="bmGuestEnter" type="button" style="display:block;width:100%;min-height:48px;margin-top:10px;padding:12px;border:1px solid #9fe8ff;border-radius:10px;background:linear-gradient(#17465a,#0b2634);color:#e7fbff;font:800 15px Tahoma,Arial,sans-serif">👤 ورود به‌عنوان مهمان (فقط آموزش)</button><button id="bmRegSubmit" type="submit" disabled>ثبت مشخصات و ورود</button><div id="bmRegError" role="status"></div></form></section>';
function show(){if(!overlay.isConnected)document.body.appendChild(overlay);overlay.style.display='flex';const uid=getUid();$('bmRegAccount').value=accountFor(uid);try{const p=JSON.parse(localStorage.getItem('mafia_profile')||'{}');$('bmRegFull').value=p.fullName||'';$('bmRegNick').value=p.nick||'';$('bmRegAge').value=p.age||'';if(p.account&&/^[A-Z0-9_-]{3,24}$/.test(p.account))$('bmRegAccount').value=p.account}catch(e){}validateFields()}
function validateFields(){const full=$('bmRegFull').value.trim(),nick=$('bmRegNick').value.trim().normalize('NFKC'),ageText=$('bmRegAge').value.trim(),age=Number(ageText),account=$('bmRegAccount').value.trim().toUpperCase();const checks={Full:full.length>=2&&full.length<=60,Nick:nick.length>=2&&nick.length<=18,Age:ageText!==''&&Number.isInteger(age)&&age>=1&&age<=99,Account:/^[A-Z0-9_-]{3,24}$/.test(account)};for(const [k,ok] of Object.entries(checks)){const el=$('bmState'+k);if(el){el.textContent=ok?'✓':'○';el.className='bmRegFieldState '+(ok?'ok':'');}}const b=$('bmRegSubmit');b.disabled=!Object.values(checks).every(Boolean);return checks} 
$('bmRegAccount').addEventListener('input',()=>{const el=$('bmRegAccount');const p=el.selectionStart;el.value=el.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24);try{el.setSelectionRange(p,p)}catch(e){}validateFields()});
for(const id of ['bmRegFull','bmRegNick','bmRegAge'])$(id).addEventListener('input',validateFields);
async function submit(e){e.preventDefault();const checks=validateFields(),b=$('bmRegSubmit'),error=$('bmRegError'),uid=getUid(),fullName=$('bmRegFull').value.trim(),nick=$('bmRegNick').value.trim().normalize('NFKC'),age=Number($('bmRegAge').value),account=$('bmRegAccount').value.trim().toUpperCase();error.textContent='';if(!Object.values(checks).every(Boolean)){error.textContent='مواردی که تیک سبز ندارند را اصلاح کن.';return}b.disabled=true;b.textContent='در حال بررسی و ثبت روی سرور…';try{const r=await api('/api/register',{method:'POST',body:JSON.stringify({uid,fullName,nick,account,age,profileComplete:true,avatarSeed:1})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'ثبت‌نام انجام نشد.');if(!d.ok||!d.user||!d.user.registered)throw Error('سرور ثبت موفق را تأیید نکرد؛ دوباره تلاش کن.');const profile={uid,fullName,nick,account,age,serial:d.user.serial,registered:true};try{localStorage.setItem('mafia_profile',JSON.stringify(profile));localStorage.setItem('mafia_uid',uid);localStorage.setItem('mafia_account',account);localStorage.setItem('mafia_nick',nick)}catch(e){}try{if(window.S){window.S.nick=nick;window.S.age=age;window.S.account=account;window.S.fullName=fullName;window.S.profileComplete=true}try{eval("if(typeof S!=='undefined'){S.nick="+JSON.stringify(nick)+";S.age="+Number(age)+";S.account="+JSON.stringify(account)+";S.fullName="+JSON.stringify(fullName)+";S.profileComplete=true;save()}")}catch(_){}const n=$('playerNick');if(n)n.value=nick;const ageInput=$('playerAge');if(ageInput)ageInput.value=String(age);window.dispatchEvent(new CustomEvent('bm:profile-ready',{detail:profile}))}catch(e){}error.style.color='#6ef0a2';error.textContent='✓ ثبت‌نام با موفقیت تأیید شد. شماره ثبت: '+(profile.serial||'—');b.textContent='✓ ثبت شد؛ در حال ورود…';setTimeout(()=>overlay.remove(),700);}catch(err){error.style.color='#ff9ca7';error.textContent=err.message||'ارتباط با سرور برقرار نشد؛ دوباره تلاش کن.';}finally{b.disabled=!Object.values(validateFields()).every(Boolean);if(overlay.isConnected&&b.textContent!=='✓ ثبت شد؛ در حال ورود…')b.textContent='ثبت مشخصات و ورود'}}
overlay.querySelector('#bmRegForm').addEventListener('submit',submit);
const guestButton=overlay.querySelector('#bmGuestEnter');if(guestButton)guestButton.addEventListener('click',()=>{try{localStorage.setItem('bm_guest_mode','1')}catch(e){}window.BMGuest=true;overlay.remove();if(typeof window.BMGuestStart==='function')window.BMGuestStart();else location.reload()});
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
  try{if(localStorage.getItem('bm_guest_mode')==='1'){window.BMGuest=true;return}}catch(e){}
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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{showLawBanner();init()},{once:true});else{showLawBanner();init()}


function enhanceMainProfileForm(){
 const $id=id=>document.getElementById(id);
 const styleId='bmLiveFieldFixStyle';
 if(!$id(styleId)){const st=document.createElement('style');st.id=styleId;st.textContent='.bmRegFieldState{display:inline-flex!important;min-width:26px;min-height:24px;align-items:center;justify-content:center;font-size:19px;font-weight:900;margin:3px 6px;color:#e7d7b7}.bmRegFieldState.ok{color:#35e783!important}.bmRegFieldState.bad{color:#ff8a9a!important}#bmRegAccount,#playerAccount{pointer-events:auto!important;user-select:text!important;-webkit-user-select:text!important;opacity:1!important}';document.head.appendChild(st)}
 function enhanceOverlay(){
  const a=$id('bmRegAccount');if(!a)return;
  a.readOnly=false;a.removeAttribute('readonly');a.disabled=false;a.removeAttribute('disabled');a.style.pointerEvents='auto';
  const inputs=[['Full',$id('bmRegFull'),v=>v.trim().length>=2&&v.trim().length<=60],['Nick',$id('bmRegNick'),v=>v.trim().normalize('NFKC').length>=2&&v.trim().normalize('NFKC').length<=18],['Age',$id('bmRegAge'),v=>v.trim()!==''&&Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=99],['Account',a,v=>/^[A-Z0-9_-]{3,24}$/.test(v.trim().toUpperCase())]];
  const b=$id('bmRegSubmit');
  const check=()=>{let all=true;for(const [key,el,test] of inputs){const ok=!!el&&test(el.value);all=all&&ok;const state=$id('bmState'+key);if(state){state.textContent=ok?'✓':'✗';state.className='bmRegFieldState '+(ok?'ok':'bad')}}if(b)b.disabled=!all;return all};
  if(!a.dataset.bmAccountInputFix){a.dataset.bmAccountInputFix='1';a.addEventListener('input',()=>{const p=a.selectionStart; a.value=a.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24);try{a.setSelectionRange(p,p)}catch(e){}check()})}
  for(const [key,el] of inputs)if(el&&!el.dataset.bmLiveCheck){el.dataset.bmLiveCheck='1';el.addEventListener('input',check);el.addEventListener('change',check)}
  check();
 }
 function enhanceMain(){
  const full=$id('playerFullName'),nick=$id('playerNick'),age=$id('playerAge'),account=$id('playerAccount'),saveBtn=$id('savePlayerRegistration');
  if(account){account.readOnly=false;account.removeAttribute('readonly');account.disabled=false;account.removeAttribute('disabled');account.style.pointerEvents='auto';account.style.userSelect='text';account.style.webkitUserSelect='text';account.setAttribute('maxlength','24');account.setAttribute('autocomplete','off');account.setAttribute('spellcheck','false');}
  const fields=[['full',full,el=>el.value.trim().length>=2&&el.value.trim().length<=60],['nick',nick,el=>el.value.trim().normalize('NFKC').length>=2&&el.value.trim().normalize('NFKC').length<=18],['age',age,el=>el.value.trim()!==''&&Number.isInteger(Number(el.value))&&Number(el.value)>=1&&Number(el.value)<=99],['account',account,el=>/^[A-Z0-9_-]{3,24}$/.test(el.value.trim().toUpperCase())]];
  for(const [key,el] of fields){if(!el)continue;let state=$id('bmMainState_'+key);if(!state){state=document.createElement('span');state.id='bmMainState_'+key;state.className='bmRegFieldState';state.textContent='✗';el.insertAdjacentElement('afterend',state)}}
  const status=$id('playerRegistrationStatus');
  const check=()=>{let all=true;for(const [key,el,test] of fields){const ok=!!el&&test(el);all=all&&ok;const state=$id('bmMainState_'+key);if(state){state.textContent=ok?'✓':'✗';state.className='bmRegFieldState '+(ok?'ok':'bad')}}if(saveBtn)saveBtn.disabled=!all;if(status&& !all)status.textContent='موارد دارای ضربدر را اصلاح کن؛ هر مورد درست با تیک سبز مشخص می‌شود.';return all};
  if(account&&!account.dataset.bmMainAccountInputFix){account.dataset.bmMainAccountInputFix='1';account.addEventListener('input',()=>{const p=account.selectionStart;account.value=account.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24);try{account.setSelectionRange(p,p)}catch(e){}try{localStorage.setItem('mafia_account',account.value)}catch(_){}check()})}
  for(const [key,el] of fields)if(el&&!el.dataset.bmMainLiveCheck){el.dataset.bmMainLiveCheck='1';el.addEventListener('input',check);el.addEventListener('change',check)}
  if(saveBtn&&!saveBtn.dataset.bmMainSaveFix){saveBtn.dataset.bmMainSaveFix='1';saveBtn.addEventListener('click',e=>{if(!check()){e.preventDefault();e.stopImmediatePropagation();return}try{localStorage.setItem('mafia_account',account.value.trim().toUpperCase())}catch(_){}},true)}
  check();
 }
 enhanceOverlay();enhanceMain();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceMainProfileForm,{once:true});else enhanceMainProfileForm();
if(window.MutationObserver){const bmObserver=new MutationObserver(()=>enhanceMainProfileForm());bmObserver.observe(document.documentElement,{childList:true,subtree:true});}
window.BMAccount={getProfile(){try{return JSON.parse(localStorage.getItem('mafia_profile')||'null')}catch(e){return null}},getUid};
})();