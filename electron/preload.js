// Sayfa betikleri çalışmadan önce: kayıt (localStorage) kaybolduysa ya da İndirilenler'de geri yükleme dosyası varsa ana süreçteki yedeği yaz.
// 8 Ekim 2026: Windows SWEEP'i yazarken zorla kapatınca Chromium kayıt veritabanını sıfırladı; bot 100 $'dan, kapalı başladı.
const {ipcRenderer}=require('electron');
try{
  const r=ipcRenderer.sendSync('sweep-restore',{hasBot:localStorage.getItem('st-bot')!==null});
  if(r&&r.data){ let n=0; for(const [k,v] of Object.entries(r.data)){ if(typeof v==='string'){ localStorage.setItem(k,v); n++; } } ipcRenderer.send('sweep-restored',{n,from:r.from}); }
}catch(e){ try{ ipcRenderer.send('sweep-restored',{err:String(e&&e.message||e)}); }catch(_){} }
