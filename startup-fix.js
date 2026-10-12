/* BLACK MAFIA v27 startup failsafe: do not wait for window.load (large media can stall it). */
(()=> {
 'use strict';
 if(window.__bmStartupFailsafe)return;window.__bmStartupFailsafe=true;
 const start=()=>{
  const splash=document.getElementById('bpSplash'),percent=document.getElementById('bpPercent');
  if(!splash)return;
  let p=0;
  if(window.__bmStartupProgressTimer)clearInterval(window.__bmStartupProgressTimer);
  window.__bmStartupProgressTimer=setInterval(()=>{
   p=Math.min(100,p+Math.max(5,Math.floor((100-p)*0.22)));
   if(percent)percent.textContent=p+'%';
   const bar=splash.querySelector('.bpProgress i');
   if(bar)bar.style.width=p+'%';
   if(p>=100){clearInterval(window.__bmStartupProgressTimer);window.__bmStartupProgressTimer=null}
  },65);
  const dismiss=()=>{
   splash.classList.add('hide');
   splash.style.setProperty('display','none','important');
   splash.setAttribute('aria-hidden','true');
  };
  // Give the art a brief moment, then always hand control to the actual game UI.
  setTimeout(dismiss,1800);
  // If another legacy script accidentally reopens the old splash, close it again.
  setTimeout(()=>{
   if(splash.style.display!=='none'&&!splash.classList.contains('hide'))dismiss();
  },2600);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 // This fallback also runs when an external resource prevents the window load event.
 setTimeout(start,120);
})();
