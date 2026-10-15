// Sayfa betikleri çalışmadan önce: kayıt (localStorage) kaybolduysa ya da İndirilenler'de geri yükleme dosyası varsa ana süreçteki yedeği yaz.
// 8 Ekim 2026: Windows SWEEP'i yazarken zorla kapatınca Chromium kayıt veritabanını sıfırladı; bot 100 $'dan, kapalı başladı.
// 9 Ekim 2026: aynı şey st-bot silinmeden oldu (kayıt eski hâline döndü); yedeği seçmek için kayıttaki son fiyat zamanı (lastTick) da gönderilir.
const {ipcRenderer,webFrame,contextBridge}=require('electron');
try{
  const raw=localStorage.getItem('st-bot'); let botTick=0; try{ botTick=+JSON.parse(raw).lastTick||0; }catch(_){}
  const r=ipcRenderer.sendSync('sweep-restore',{hasBot:raw!==null,botTick});
  if(r&&r.data){ let n=0; for(const [k,v] of Object.entries(r.data)){ if(typeof v==='string'){ localStorage.setItem(k,v); n++; } } ipcRenderer.send('sweep-restored',{n,from:r.from}); }
}catch(e){ try{ ipcRenderer.send('sweep-restored',{err:String(e&&e.message||e)}); }catch(_){} }
// Ana süreç sayfada kod çalıştırmak istediğinde (kayıt yedeği, kapanış sorusu, canlı panel; 13 Ekim 2026): webContents.executeJavaScript
// sayfa yükleniyor görünürken takılıyordu. webFrame.executeJavaScript sayfanın kendi dünyasında hemen çalışır.
ipcRenderer.on('sweep-eval',(e,q)=>{
  const id=q&&q.id; const done=r=>{ try{ ipcRenderer.send('sweep-eval-res',Object.assign({id},r)); }catch(_){} };
  try{ Promise.resolve(webFrame.executeJavaScript(String(q.js),true)).then(out=>done({out}),err=>done({err:String(err&&err.message||err)})); }
  catch(err){ done({err:String(err&&err.message||err)}); }
});
// Gerçek hesap emir katmanı (trade.js): sayfa yalnız niyet gönderir, anahtar ve imza ana süreçte.
try{ const inv=n=>a=>ipcRenderer.invoke('trade-'+n,a);
  contextBridge.exposeInMainWorld('sweepTrade',{state:inv('state'),open:inv('open'),reduce:inv('reduce'),setStop:inv('setStop'),close:inv('close'),kill:inv('kill'),rearm:inv('rearm'),checks:inv('checks')}); }catch(e){}
