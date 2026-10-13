/* تنظیمات دیتابیس: روی Cloudflare Worker از پراکسی هم‌مبدأ استفاده کن؛
   روی GitHub Pages و هاست‌های ایستا، مستقیم به Firebase وصل شو تا /api/db به 404 نخورد. */
const mafiaHost = String(window.location && window.location.hostname || '').toLowerCase();
const mafiaWorkerHost = mafiaHost.endsWith('.workers.dev');
window.MAFIA_DB_URL = mafiaWorkerHost
  ? '/api/db'
  : 'https://black-mafia-online-default-rtdb.firebaseio.com';
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
