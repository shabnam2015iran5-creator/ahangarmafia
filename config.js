/* تنظیمات بازی؛ تا زمان انتشار واسط Cloudflare از نشانی اصلی دیتابیس استفاده می‌شود. */
const mafiaHost = String(location.hostname || '');
window.MAFIA_DB_URL = mafiaHost.endsWith('.workers.dev')
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

// حالت «فقط یک اتاق»: همهٔ بازیکن‌ها با ورود از در، مستقیم وارد یک اتاق مشترک می‌شوند.
window.MAFIA_SINGLE_ROOM=true;
window.MAFIA_ROOM_NAME='main';
window.MAFIA_ONE_ROOM_ALL=true;
