(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DB = String(window.MAFIA_DB_URL || '/api/db').replace(/\/$/, '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function db(path) {
    const response = await fetch(DB + '/' + path + '.json', {cache:'no-store',headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('پاسخ سرور: ' + response.status);
    return response.json();
  }
  async function refresh() {
    $('adminStatus').textContent = 'در حال دریافت اتاق‌ها…';
    try {
      const all = await db('roomsV23');
      const now = Date.now();
      const rooms = Object.entries(all || {}).map(([code, room]) => {
        const players = Object.values(room?.players || {}).filter(Boolean);
        const activity = Math.max(Number(room?.updatedAt || 0), Number(room?.createdAt || 0), ...players.map(p => Number(p.joinedAt || 0)));
        return {code,room,players,activity};
      }).filter(x => /^\d{5}$/.test(x.code) && x.players.length && now - x.activity < 86400000).sort((a,b)=>b.activity-a.activity);
      $('adminRoomCount').textContent = String(rooms.length);
      $('adminPlayerCount').textContent = String(rooms.reduce((n,r)=>n+r.players.filter(p=>p.seatType==='human').length,0));
      $('adminGameCount').textContent = String(rooms.filter(r=>r.room.phase==='started').length);
      $('adminStatus').textContent = 'اتاق‌های دارای فعالیت در ۲۴ ساعت اخیر؛ فهرست هر ۱۰ ثانیه تازه می‌شود.';
      $('adminRooms').innerHTML = rooms.length ? rooms.map(({code,room,players}) => {
        const god = players.find(p=>p.id===room.hostId) || players.find(p=>p.host);
        const tests = Object.values(room.testSeats || {}).filter(Boolean).length;
        return '<article class="admin-room"><div class="admin-room-head"><span class="admin-room-title">اتاق '+esc(code)+'</span><span class="pill">'+(room.phase==='started'?'🎮 بازی شروع‌شده':'⏳ در انتظار')+'</span></div><div class="room-meta">گاد / گرداننده: <span class="god">'+esc(god?.name || 'مشخص نیست')+'</span> · '+players.filter(p=>p.seatType==='human').length+' بازیکن واقعی'+(tests?' · '+tests+' صندلی آزمایشی':'')+'</div><ul>'+players.map(p=>'<li>'+esc(p.name||'بدون نام')+(p.id===room.hostId?' — 👑 گاد':'')+(p.ready?' — آماده':'')+'</li>').join('')+'</ul></article>';
      }).join('') : '<div class="admin-empty">در ۲۴ ساعت اخیر اتاق فعالی پیدا نشد.</div>';
    } catch (error) {
      $('adminStatus').textContent = 'فهرست دریافت نشد: '+error.message+'؛ مسیر دیتابیس را بررسی کن.';
      $('adminRooms').innerHTML = '';
    }
  }
  let timer = null;
  $('adminOpen').addEventListener('click', async () => {
    $('adminPanel').classList.remove('hidden');
    await refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(refresh,10000);
    $('adminPanel').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('adminRefresh').addEventListener('click',refresh);
  $('adminClose').addEventListener('click',() => {
    $('adminPanel').classList.add('hidden');
    if (timer) clearInterval(timer);
    timer = null;
  });
})();