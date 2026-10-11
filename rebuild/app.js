(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DB = String(window.MAFIA_DB_URL || '/api/db').replace(/\/$/, '');
  const state = { room: null, code: '', id: '', name: '', host: false, ready: false, roomData: null, poll: null, chatKeys: new Set(), voice: null, localStream: null, voicePeers: new Map(), pendingCandidates: new Map(), seenSignals: new Set(), signalBusy: false, lastUpdated: 0 };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = value => String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  const setStatus = (message, type = '') => { const el = $('connection'); el.textContent = message; el.className = 'pill ' + (type ? 'status-' + type : ''); };
  const path = (tail = '') => 'roomsV23/' + state.code + (tail ? '/' + tail : '');
  async function db(dbPath, method = 'GET', value) {
    const res = await fetch(DB + '/' + dbPath + '.json', {
      method, cache: 'no-store',
      headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: value === undefined ? undefined : JSON.stringify(value)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error('دیتابیس (' + res.status + ')' + (detail ? ': ' + detail.slice(0,100) : ''));
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  function id() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,'').slice(0,60); }
  function newCode() { return String(Math.floor(10000 + Math.random() * 90000)); }
  function showLobby() {
    $('welcome').classList.add('hidden'); $('lobby').classList.remove('hidden');
    $('roomCodeLabel').textContent = state.code;
    $('hostTools').classList.toggle('hidden', !state.host);
    $('startBtn').classList.toggle('hidden', !state.host);
  }
  function showRules() {
    try { if (!localStorage.getItem('bm-rules-accepted-v1')) $('rules').classList.remove('hidden'); }
    catch (_) { $('rules').classList.remove('hidden'); }
  }
  $('rules').classList.add('hidden');
  $('acceptRules').addEventListener('click', () => {
    try { localStorage.setItem('bm-rules-accepted-v1','1'); } catch (_) {}
    $('rules').classList.add('hidden');
  });
  showRules();

  async function createRoom() {
    state.name = $('playerName').value.trim().slice(0,24);
    if (!state.name) return alert('اول نام بازیکن را بنویس.');
    state.id = id(); state.code = newCode(); state.host = true; state.ready = true;
    const room = { code:state.code, hostId:state.id, phase:'lobby', createdAt:Date.now(), updatedAt:Date.now(),
      players:{ [state.id]:{ id:state.id, name:state.name, host:true, ready:true, seatType:'human', joinedAt:Date.now(), online:true } },
      chat:{}, testSeats:{} };
    try {
      await db(path(), 'PUT', room);
      await enterRoom(room);
    } catch (e) { setStatus('اتصال ناموفق','error'); alert('ساخت اتاق انجام نشد. اتصال اینترنت و مسیر سرور را بررسی کن.\n' + e.message); }
  }
  async function joinRoom() {
    state.name = $('playerName').value.trim().slice(0,24);
    state.code = $('roomCode').value.replace(/\D/g,'').slice(0,5);
    if (!state.name) return alert('اول نام بازیکن را بنویس.');
    if (!/^\d{5}$/.test(state.code)) return alert('کد اتاق باید پنج رقم باشد.');
    state.id = id(); state.host = false; state.ready = false;
    try {
      const room = await db(path());
      if (!room || !room.players) throw new Error('این اتاق پیدا نشد یا هنوز آماده نیست.');
      const players = Object.values(room.players);
      if (players.filter(p => p && p.seatType === 'human').length >= 12) throw new Error('ظرفیت ۱۲ بازیکن واقعی تکمیل است.');
      await db(path('players/' + state.id), 'PUT', {id:state.id,name:state.name,host:false,ready:false,seatType:'human',joinedAt:Date.now(),online:true});
      await enterRoom(room);
    } catch (e) { setStatus('اتصال ناموفق','error'); alert('ورود به اتاق انجام نشد.\n' + e.message); }
  }
  async function enterRoom(room) {
    state.roomData = room; state.lastUpdated = Date.now(); showLobby(); setStatus('متصل به اتاق','ok');
    await renderRoom(room);
    if (state.poll) clearInterval(state.poll);
    state.poll = setInterval(refreshRoom, 1600);
    window.addEventListener('beforeunload', leavePresence, {once:true});
  }
  async function refreshRoom() {
    if (!state.code) return;
    try {
      const room = await db(path());
      if (!room) { setStatus('اتاق حذف شده','error'); return; }
      state.roomData = room; state.lastUpdated = Date.now();
      setStatus('متصل · همگام','ok');
      await renderRoom(room);
      if (state.voice) await ensureVoicePeers(room);
    } catch (_) { setStatus('تلاش برای اتصال دوباره…','error'); }
  }
  async function renderRoom(room) {
    const players = Object.values(room.players || {}).filter(Boolean);
    const testSeats = Object.values(room.testSeats || {}).filter(Boolean);
    $('playerCount').textContent = players.filter(p => p.seatType === 'human').length + ' نفر واقعی' + (testSeats.length ? ' · ' + testSeats.length + ' صندلی آزمایشی' : '');
    $('players').innerHTML = players.map(p => '<li><span class="avatar">' + (p.host?'👑':'🎭') + '</span><div class="player-meta"><div class="player-name">' + esc(p.name) + (p.id===state.id?' (شما)':'') + '</div><div class="player-tag">' + (p.host?'گرداننده':p.ready?'آماده':'در انتظار') + ' · ' + (p.seatType==='human'?'بازیکن واقعی':'آزمایشی') + '</div></div><span>' + (p.ready?'✅':'⏳') + '</span></li>').join('') +
      testSeats.map(p => '<li><span class="avatar">🪑</span><div class="player-meta"><div class="player-name">' + esc(p.name) + '</div><div class="player-tag">صندلی آزمایشی · فقط برای تمرین</div></div></li>').join('');
    $('phase').textContent = room.phase === 'started' ? 'بازی شروع شده' : 'انتظار';
    $('gameNotice').textContent = room.phase === 'started' ? 'گرداننده بازی را شروع کرده است. همهٔ دستگاه‌ها وضعیت یکسان اتاق را دریافت کرده‌اند.' : 'همه در همین اتاق هستند. گرداننده می‌تواند پس از آماده‌شدن بازیکنان شروع کند.';
    $('startBtn').disabled = players.filter(p=>p.seatType==='human').length < 2;
    $('readyBtn').textContent = state.ready ? 'لغو آمادگی' : 'آماده‌ام ✓';
    $('startBtn').textContent = room.phase === 'started' ? 'بازی شروع شد' : '🎬 شروع بازی';
    $('startBtn').disabled = !state.host || room.phase === 'started' || players.filter(p=>p.seatType==='human').length < 2;
    const messages = Object.entries(room.chat || {}).map(([key,m])=>({...m,key})).filter(m=>m && m.text).sort((a,b)=>(a.at||0)-(b.at||0)).slice(-100);
    const newMessages = messages.filter(m=>!state.chatKeys.has(m.key));
    for (const m of newMessages) state.chatKeys.add(m.key);
    if (newMessages.length || !$('chatMessages').children.length) {
      $('chatMessages').innerHTML = messages.map(m=>'<div class="message"><div class="sender">'+esc(m.name||'بازیکن')+'<span class="time">'+new Date(m.at||Date.now()).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+'</span></div><div class="body">'+esc(m.text)+'</div></div>').join('');
      $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
    }
  }
  async function setReady() {
    if (!state.code) return;
    try { state.ready = !state.ready; await db(path('players/'+state.id+'/ready'),'PUT',state.ready); await refreshRoom(); }
    catch(e) { state.ready=!state.ready; alert('ثبت آمادگی انجام نشد: '+e.message); }
  }
  async function startGame() {
    if (!state.host || !state.roomData) return;
    const humans = Object.values(state.roomData.players||{}).filter(p=>p && p.seatType==='human');
    const testSeats = Object.values(state.roomData.testSeats||{}).filter(Boolean);
    if (humans.length + testSeats.length < 2) return alert('برای شروع، دست‌کم دو جایگاه لازم است. می‌توانی برای تست از صندلی آزمایشی استفاده کنی.');
    try { await db(path(),'PATCH',{phase:'started',startedAt:Date.now(),startedBy:state.id,updatedAt:Date.now()}); await refreshRoom(); }
    catch(e) { alert('شروع بازی ثبت نشد: '+e.message); }
  }
  async function addTestSeat() {
    if (!state.host) return;
    const key = id();
    try { await db(path('testSeats/'+key),'PUT',{id:key,name:'صندلی تمرینی '+(Object.keys(state.roomData?.testSeats||{}).length+1),seatType:'test',createdAt:Date.now()}); await refreshRoom(); }
    catch(e) { alert('افزودن صندلی آزمایشی انجام نشد: '+e.message); }
  }
  async function removeTestSeats() {
    if (!state.host) return;
    try { await db(path('testSeats'),'DELETE'); await refreshRoom(); }
    catch(e) { alert('حذف صندلی‌ها انجام نشد: '+e.message); }
  }
  async function sendChat(text) {
    const value = String(text||'').trim().slice(0,500);
    if (!value || !state.code) return;
    try { await db(path('chat'),'POST',{id:state.id,name:state.name,text:value,at:Date.now()}); $('chatInput').value=''; await refreshRoom(); }
    catch(e) { alert('پیام ارسال نشد: '+e.message); }
  }
  $('createRoom').addEventListener('click',createRoom);
  $('joinRoom').addEventListener('click',joinRoom);
  $('copyRoom').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.code);$('copyRoom').textContent='کپی شد ✓';setTimeout(()=>$('copyRoom').textContent='کپی کد',1300)}catch(_){prompt('کد اتاق را کپی کن:',state.code)}});
  $('readyBtn').addEventListener('click',setReady);
  $('startBtn').addEventListener('click',startGame);
  $('addTestSeat').addEventListener('click',addTestSeat);
  $('removeTestSeats').addEventListener('click',removeTestSeats);
  $('chatForm').addEventListener('submit',e=>{e.preventDefault();sendChat($('chatInput').value)});
  document.querySelectorAll('[data-emoji]').forEach(b=>b.addEventListener('click',()=>{$('chatInput').value += b.dataset.emoji;$('chatInput').focus()}));

  // Lightweight WebRTC mesh. Each pair uses Firebase only for short-lived signaling;
  // audio itself travels peer-to-peer. A pair is initiated by the lexically smaller ID.
  async function startVoice() {
    if (!state.code) return alert('اول وارد اتاق شو.');
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) return alert('این مرورگر از تماس صوتی پشتیبانی نمی‌کند.');
    try {
      state.localStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      state.voice = {id:state.code+'-'+String(Math.floor(100000+Math.random()*899999)), room:state.code};
      const own = 'voiceSignals/'+state.code+'/'+state.voice.id;
      const old = await db(own+'/presence');
      if (old && Number(old.expires||0)>Date.now()) throw new Error('شناسهٔ صوتی تکراری شد؛ دوباره تلاش کن.');
      await db(own+'/presence','PUT',{owner:state.id,expires:Date.now()+25000});
      await db(path('players/'+state.id+'/voiceId'),'PUT',state.voice.id);
      await refreshRoom();
      state.voice.heartbeat=setInterval(async()=>{try{await db(own+'/presence','PUT',{owner:state.id,expires:Date.now()+25000})}catch(_){}},7000);
      state.voice.poll=setInterval(pollSignals,650);
      $('voiceBtn').textContent='🔇 قطع میکروفن';
      $('voiceStatus').textContent='میکروفن فعال؛ در انتظار اتصال صوتی…';
      await ensureVoicePeers(state.roomData);
      pollSignals();
    } catch(e) {
      stopVoice();
      $('voiceStatus').textContent='خطای میکروفن/صدا';
      alert('فعال‌سازی صدا انجام نشد. اجازهٔ میکروفن را بررسی کن.\n'+e.message);
    }
  }
  function stopVoice() {
    if(state.voice){clearInterval(state.voice.poll);clearInterval(state.voice.heartbeat);db('voiceSignals/'+state.code+'/'+state.voice.id+'/presence','DELETE').catch(()=>{});if(state.id)db(path('players/'+state.id+'/voiceId'),'DELETE').catch(()=>{});}
    for(const v of state.voicePeers.values()){try{v.pc.close()}catch(_){} if(v.audio) v.audio.remove();}
    state.voicePeers.clear();
    if(state.localStream)state.localStream.getTracks().forEach(t=>t.stop());
    state.localStream=null;state.voice=null;
    $('voiceBtn').textContent='🎙️ فعال‌کردن میکروفن';$('voiceStatus').textContent='صدا خاموش است';$('audioPeers').innerHTML='';
  }
  function signalPath(peerId){return 'voiceSignals/'+state.code+'/'+peerId;}
  async function signal(peerId,message){
    const presence=await db(signalPath(peerId)+'/presence');
    if(!presence||Number(presence.expires||0)<=Date.now())return;
    await db(signalPath(peerId)+'/messages','POST',{...message,from:state.voice.id,at:Date.now()});
  }
  async function ensureVoicePeers(room){
    if(!state.voice||!room)return;
    const peers=Object.values(room.players||{}).filter(p=>p&&p.id!==state.id&&p.seatType==='human');
    for(const p of peers){
      if(!p.voiceId) continue;
      if(state.voicePeers.has(p.id))continue;
      const initiator=state.voice.id.localeCompare(p.voiceId)<0;
      await makeVoicePeer(p,initiator);
    }
  }
  async function makeVoicePeer(player,initiator){
    if(state.voicePeers.has(player.id)||!player.voiceId)return;
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},...(Array.isArray(window.MAFIA_TURN)?window.MAFIA_TURN:[])]});
    const item={pc,player,remoteCandidates:[],ready:false,audio:null};state.voicePeers.set(player.id,item);
    if(state.localStream)state.localStream.getTracks().forEach(track=>pc.addTrack(track,state.localStream));
    pc.onicecandidate=e=>{if(e.candidate)signal(player.voiceId,{type:'candidate',candidate:e.candidate.toJSON()}).catch(()=>{});};
    pc.ontrack=e=>{
      let audio=document.querySelector('audio[data-peer="'+player.id+'"]');
      if(!audio){audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;audio.dataset.peer=player.id;$('audioPeers').appendChild(audio);item.audio=audio;}
      audio.srcObject=e.streams[0];audio.play().catch(()=>{$('voiceStatus').textContent='برای شنیدن صدا، یک بار صفحه را لمس کن.';});
      $('voiceStatus').textContent='اتصال صوتی برقرار شد';
    };
    pc.onconnectionstatechange=()=>{
      if(pc.connectionState==='connected')$('voiceStatus').textContent='صدا وصل است';
      if(pc.connectionState==='failed')$('voiceStatus').textContent='اتصال صدا ناموفق؛ شبکه یا TURN را بررسی کن';
    };
    if(initiator){
      try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);await signal(player.voiceId,{type:'offer',sdp:pc.localDescription.toJSON(),fromId:state.id});}catch(e){console.warn(e);}
    }
  }
  async function pollSignals(){
    if(!state.voice||state.signalBusy)return;
    state.signalBusy=true;
    try{
      const root=await db('voiceSignals/'+state.code+'/'+state.voice.id+'/messages');
      if(root&&typeof root==='object'){
        for(const [key,msg] of Object.entries(root)){
          if(state.seenSignals.has(key))continue;state.seenSignals.add(key);
          try{
            const sender=Object.values(state.roomData?.players||{}).find(p=>p.id===msg.fromId||p.voiceId===msg.from);
            if(!sender)continue;
            let item=state.voicePeers.get(sender.id);
            if(msg.type==='offer'&&!item){await makeVoicePeer({...sender,voiceId:msg.from},false);item=state.voicePeers.get(sender.id);}
            if(!item && msg.type==='candidate'){const list=state.pendingCandidates.get(sender.id)||[];if(list.length<64)list.push(msg.candidate);state.pendingCandidates.set(sender.id,list);continue;}
            if(!item)continue;
            if(msg.type==='offer'){
              await item.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const queued=state.pendingCandidates.get(sender.id)||[];state.pendingCandidates.delete(sender.id);
              for(const c of [...item.remoteCandidates.splice(0),...queued]){try{await item.pc.addIceCandidate(new RTCIceCandidate(c))}catch(_){}}
              const answer=await item.pc.createAnswer();await item.pc.setLocalDescription(answer);
              await signal(msg.from,{type:'answer',sdp:item.pc.localDescription.toJSON(),fromId:state.id});
            }else if(msg.type==='answer'){
              await item.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              for(const c of item.remoteCandidates.splice(0)){try{await item.pc.addIceCandidate(new RTCIceCandidate(c))}catch(_){}}
            }else if(msg.type==='candidate'){
              if(item.pc.remoteDescription)await item.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              else item.remoteCandidates.push(msg.candidate);
            }
          }catch(e){console.warn('signal',e);}
          finally{db('voiceSignals/'+state.code+'/'+state.voice.id+'/messages/'+safe(key),'DELETE').catch(()=>{});}
        }
      }
    }catch(e){console.warn('voice signaling',e);}
    finally{state.signalBusy=false;}
  }
  $('voiceBtn').addEventListener('click',async()=>{if(state.voice)stopVoice();else await startVoice();});
  async function leavePresence(){
    if(state.poll)clearInterval(state.poll);
    stopVoice();
    if(state.code&&state.id)db(path('players/'+state.id),'DELETE').catch(()=>{});
  }
})();