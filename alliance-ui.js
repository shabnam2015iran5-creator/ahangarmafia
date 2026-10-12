/* BLACK MAFIA — alliance room creation and invite codes */
(()=> {
 'use strict';
 if(window.__bmAllianceUIv1)return;window.__bmAllianceUIv1=true;
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const uid=()=>{try{return String(localStorage.getItem('mafia_uid')||'')}catch(e){return ''}};
 const css=document.createElement('style');
 css.textContent='#bmAllianceButton{display:inline-flex;align-items:center;justify-content:center;gap:7px;box-sizing:border-box;border:1px solid #b69cff;border-radius:12px;background:linear-gradient(135deg,#21163d,#362454);color:#f5eeff;padding:11px 14px;font:800 13px Tahoma,Arial,sans-serif;cursor:pointer;box-shadow:0 3px 14px #0003}'+
 '#bmAllianceModal{position:fixed;inset:0;z-index:2147483003;display:none;overflow:auto;background:#080510f5;color:#f5eeff;padding:12px;box-sizing:border-box;font-family:Tahoma,Arial,sans-serif}'+
 '#bmAllianceModal .bm-al-card{max-width:620px;margin:3vh auto;background:linear-gradient(145deg,#211635,#110d1a);border:1px solid #a98cff;border-radius:17px;padding:14px;box-shadow:0 10px 35px #0008}'+
 '#bmAllianceModal .bm-al-head{display:flex;align-items:center;justify-content:space-between;gap:8px}'+
 '#bmAllianceModal input{box-sizing:border-box;width:100%;margin:6px 0;padding:11px;border:1px solid #5e4a7e;border-radius:9px;background:#100b19;color:#fff;font:inherit}'+
 '#bmAllianceModal button{border:1px solid #a98cff;border-radius:9px;background:#34224f;color:#f5eeff;padding:9px 11px;margin:3px;font:700 12px Tahoma,Arial,sans-serif;cursor:pointer}'+
 '#bmAllianceModal .bm-al-muted{color:#d0c2e9;font-size:12px;line-height:1.9;overflow-wrap:anywhere}'+
 '#bmAllianceModal .bm-al-box{border:1px solid #514066;border-radius:12px;padding:11px;margin:10px 0;background:#171021}'+
 '#bmAllianceModal .bm-al-member{padding:7px 0;border-bottom:1px solid #3d2e50;font-size:13px}'+
 '#bmAllianceModal textarea{box-sizing:border-box;width:100%;min-height:68px;margin:6px 0;padding:10px;border:1px solid #5e4a7e;border-radius:9px;background:#100b19;color:#fff;font:inherit;resize:vertical}'+
 '#bmAllianceChatHistory{max-height:220px;overflow:auto;border:1px solid #3d2e50;border-radius:9px;padding:8px;margin:7px 0;background:#0c0912}'+
 '#bmAllianceChatHistory .bm-al-msg{padding:7px 0;border-bottom:1px solid #30253e;font-size:12px;line-height:1.8;overflow-wrap:anywhere}'+
 '#bmAllianceModal .bm-al-danger{border-color:#f08d9c;background:#542332}'+
 '@media(max-width:520px){#bmAllianceModal .bm-al-card{margin:1vh auto;padding:12px}#bmAllianceButton{width:100%}}';
 document.head.appendChild(css);
 const button=document.createElement('button');button.id='bmAllianceButton';button.type='button';button.textContent='🤝 اتاق اتحاد';
 const modal=document.createElement('div');modal.id='bmAllianceModal';
 modal.innerHTML='<section class="bm-al-card" dir="rtl"><div class="bm-al-head"><h2 style="font-size:18px;margin:0">🤝 اتاق اتحاد</h2><button id="bmAllianceClose">بستن</button></div><p class="bm-al-muted">اتحاد بساز و کدش را به دوستانت بده، یا با کد دعوت وارد اتحاد دیگری شو.</p><div id="bmAllianceStatus" class="bm-al-muted" role="status"></div><div id="bmAllianceCurrent" class="bm-al-box" style="display:none"></div><div id="bmAllianceActions"><div class="bm-al-box"><h3 style="margin:0 0 6px">ساخت اتحاد جدید</h3><input id="bmAllianceName" maxlength="32" placeholder="نام اتحاد (۲ تا ۳۲ نویسه)"><button id="bmAllianceCreate">ساخت اتحاد و دریافت کد</button></div><div class="bm-al-box"><h3 style="margin:0 0 6px">پیوستن به اتحاد</h3><input id="bmAllianceCode" maxlength="6" autocomplete="off" placeholder="کد ۶ حرفی/عددی اتحاد" style="text-transform:uppercase"><button id="bmAllianceJoin">پیوستن با کد</button></div></div></section>';
 document.body.appendChild(button);document.body.appendChild(modal);
 const show=()=>{modal.style.display='block';refresh()};const hide=()=>{modal.style.display='none'};
 button.addEventListener('click',show);$('bmAllianceClose').addEventListener('click',hide);
 modal.addEventListener('click',e=>{if(e.target===modal)hide()});
 function status(t,bad=false){$('bmAllianceStatus').textContent=t;$('bmAllianceStatus').style.color=bad?'#ff9aa9':'#d0c2e9'}
 async function api(method,data){
  const id=uid();if(!id)throw Error('شناسهٔ کاربری پیدا نشد؛ صفحه را دوباره باز کن.');
  const url='/api/alliances'+(method==='GET'?'?uid='+encodeURIComponent(id):'');
  const r=await fetch(url,{method,cache:'no-store',headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify({...data,uid:id}):undefined});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'درخواست اتحاد انجام نشد ('+r.status+')');
  return d;
 }
 function renderMessages(a){
  const host=$('bmAllianceChatHistory');if(!host)return;
  const messages=Object.entries(a&&a.messages||{}).map(([id,m])=>({id,...m})).filter(m=>m&&m.text).sort((a,b)=>Number(a.at||0)-Number(b.at||0)).slice(-40);
  host.innerHTML=messages.map(m=>'<div class="bm-al-msg"><b>'+esc(m.nick||'بازیکن')+'</b><span class="bm-al-muted"> · '+esc(m.at?new Date(Number(m.at)).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}):'')+'</span><div>'+esc(m.text)+'</div></div>').join('')||'<div class="bm-al-muted">هنوز پیامی نیست. اولین پیام را بفرست.</div>';
  host.scrollTop=host.scrollHeight;
 }
 async function loadChat(){
  if(modal.style.display!=='block'||!$('bmAllianceChatHistory'))return;
  try{const d=await api('GET',{});if(d.alliance)renderMessages(d.alliance)}catch(e){}
 }
 async function refresh(){
  try{
   const d=await api('GET',{}),a=d.alliance;
   if(!a){$('bmAllianceCurrent').style.display='none';$('bmAllianceCurrent').innerHTML='';$('bmAllianceActions').style.display='block';status('هنوز عضو هیچ اتحادی نیستی.');return}
   const members=Object.values(a.members||{}).filter(Boolean);
   $('bmAllianceActions').style.display='none';$('bmAllianceCurrent').style.display='block';
   $('bmAllianceCurrent').innerHTML='<h3 style="margin:0 0 6px">اتحاد شما: '+esc(a.name)+'</h3><div class="bm-al-muted">کد دعوت: <b style="font-size:18px;letter-spacing:2px;color:#e5d6ff">'+esc(a.code)+'</b></div><button id="bmAllianceCopy">کپی کد دعوت</button><button id="bmAllianceLeave" class="bm-al-danger">خروج از اتحاد</button><div class="bm-al-muted">سازنده: '+esc(a.ownerName||'—')+' · تعداد اعضا: '+members.length+'</div><div style="margin-top:8px"><b>اعضای اتحاد</b>'+members.map(m=>'<div class="bm-al-member">'+esc(m.nick||'بازیکن')+(m.uid===a.ownerUid?' — سازنده':'')+'</div>').join('')+'</div><div class="bm-al-box"><h3 style="margin:0 0 5px">گفت‌وگوی اتحاد</h3><div id="bmAllianceChatHistory" aria-live="polite"></div><textarea id="bmAllianceMessage" maxlength="500" rows="2" placeholder="پیام به اعضای اتحاد…"></textarea><button id="bmAllianceSend">ارسال پیام</button></div>';
   renderMessages(a);
   $('bmAllianceSend').addEventListener('click',async()=>{
    const input=$('bmAllianceMessage'),message=String(input.value||'').trim();if(!message){status('اول پیام را بنویس.');return}
    $('bmAllianceSend').disabled=true;
    try{await api('POST',{action:'message',message});input.value='';await loadChat();status('پیام ارسال شد.')}
    catch(e){status(e.message,true)}
    finally{$('bmAllianceSend').disabled=false}
   });
   $('bmAllianceCopy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(String(a.code||''));status('کد اتحاد کپی شد.')}
    catch(e){const input=document.createElement('input');input.value=String(a.code||'');document.body.appendChild(input);input.select();try{document.execCommand('copy');status('کد اتحاد کپی شد.')}catch(_){status('کد اتحاد: '+a.code)}input.remove()}
   });
   $('bmAllianceLeave').addEventListener('click',async()=>{
    if(!confirm('از این اتحاد خارج شوی؟'))return;
    try{await api('POST',{action:'leave'});status('از اتحاد خارج شدی.');await refresh()}catch(e){status(e.message,true)}
   });
   status('اطلاعات اتحاد دریافت شد.');
  }catch(e){status(e.message,true)}
 }
 $('bmAllianceCreate').addEventListener('click',async()=>{
  const name=$('bmAllianceName').value.trim();if(name.length<2||name.length>32){status('نام اتحاد باید بین ۲ تا ۳۲ نویسه باشد.',true);return}
  $('bmAllianceCreate').disabled=true;
  try{const d=await api('POST',{action:'create',name});$('bmAllianceName').value='';status('اتحاد ساخته شد. کد دعوت: '+d.alliance.code);await refresh()}
  catch(e){status(e.message,true)}
  finally{$('bmAllianceCreate').disabled=false}
 });
 $('bmAllianceJoin').addEventListener('click',async()=>{
  const code=$('bmAllianceCode').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)){status('کد اتحاد باید ۶ حرف یا عدد باشد.',true);return}
  $('bmAllianceJoin').disabled=true;
  try{const d=await api('POST',{action:'join',code});$('bmAllianceCode').value='';status('با موفقیت به اتحاد «'+(d.alliance.name||code)+'» پیوستی.');await refresh()}
  catch(e){status(e.message,true)}
  finally{$('bmAllianceJoin').disabled=false}
 });
 function placeButton(){
  const running=$('bmRunningGamesBtn');
  if(running&&running.parentElement){if(button.parentElement!==running.parentElement||button.previousElementSibling!==running)running.insertAdjacentElement('afterend',button);button.style.position='relative';button.style.right='auto';button.style.bottom='auto';button.style.width='100%';button.style.margin='7px 0';button.style.zIndex='10'}
  else {if(!button.isConnected)document.body.appendChild(button);button.style.position='fixed';button.style.left='12px';button.style.bottom='12px';button.style.zIndex='2147482990';button.style.width='auto';button.style.maxWidth='calc(100vw - 24px)'}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',placeButton,{once:true});else placeButton();
 new MutationObserver(placeButton).observe(document.documentElement,{childList:true,subtree:true});
 setInterval(placeButton,1500);
 setInterval(loadChat,5000);
})();