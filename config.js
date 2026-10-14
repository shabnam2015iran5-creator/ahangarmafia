/* اتصال دیتابیس از مسیر واسط Cloudflare انجام می‌شود تا مرورگر مستقیماً به Firebase نیاز نداشته باشد.
   این کار فقط وقتی مفید است که دامنه Worker روی اینترنت بازیکن قابل دسترسی باشد. */
const MAFIA_WORKER_HOST = 'mafia-game-server.nova-d9d04c.workers.dev';
const MAFIA_DB_PROXY = 'https://' + MAFIA_WORKER_HOST + '/api/db';
window.MAFIA_DB_URL = (location.hostname === MAFIA_WORKER_HOST)
  ? '/api/db'
  : MAFIA_DB_PROXY;

// TURN servers Open Relay:
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
window.MAFIA_ROOM_NAME='main';
window.MAFIA_ONE_ROOM_ALL=true;
