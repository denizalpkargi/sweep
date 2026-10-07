const {app,BrowserWindow,shell,Menu,powerSaveBlocker,powerMonitor,session,crashReporter,dialog}=require('electron');
const path=require('path');
const fs=require('fs');

/* ---- günlük dosyası: %APPDATA%/SWEEP/logs/sweep-YYYY-MM-DD.log (14 gün tutulur) ---- */
// Uygulama bir daha kendi kendine kapanırsa nedeni burada görünsün: çökme, donma, bellek, Windows kapanışı/oturum sonu, uyku.
let logDir=null;
function logLine(level,msg){
  try{
    if(!logDir){ logDir=path.join(app.getPath('userData'),'logs'); fs.mkdirSync(logDir,{recursive:true}); }
    const d=new Date(); const f=path.join(logDir,'sweep-'+d.toISOString().slice(0,10)+'.log');
    fs.appendFileSync(f,d.toISOString()+' ['+level+'] '+String(msg).replace(/\s+$/,'')+'\n');
  }catch(e){}
}
const log=(...a)=>logLine('info',a.join(' '));
// Botun 10 dk'lık durum özeti (ui.js botDigest): logs/bot-YYYY-MM-DD.jsonl satırları + son hali logs/bot-status.json; uzaktan izleme için.
function botStatus(json){ try{ if(!logDir){ logDir=path.join(app.getPath('userData'),'logs'); fs.mkdirSync(logDir,{recursive:true}); } const d=new Date(); fs.appendFileSync(path.join(logDir,'bot-'+d.toISOString().slice(0,10)+'.jsonl'),json+'\n'); fs.writeFileSync(path.join(logDir,'bot-status.json'),json); }catch(e){} }
const logErr=(...a)=>logLine('error',a.map(x=>x&&x.stack?x.stack:String(x)).join(' '));
function pruneLogs(){ try{ const cut=Date.now()-14*864e5; for(const f of fs.readdirSync(logDir)){ const p=path.join(logDir,f); if(fs.statSync(p).mtimeMs<cut) fs.unlinkSync(p); } }catch(e){} }

// Ana süreçte yakalanmamış hata uygulamayı düşürmesin: kaydet ve devam et.
process.on('uncaughtException',e=>logErr('uncaughtException',e));
process.on('unhandledRejection',e=>logErr('unhandledRejection',e));
// Çökme dökümleri yerelde kalır (gönderilmez): %APPDATA%/SWEEP/Crashpad
try{ crashReporter.start({uploadToServer:false}); }catch(e){}

// Tek kopya: ikinci kez açılırsa iki bot aynı kayda yazmasın, mevcut pencere öne gelsin.
if(!app.requestSingleInstanceLock()){ app.exit(0); }

// Pencere arka plandayken / simge durumundayken bot ve tarama yavaşlamasın.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// Binance kopya trader (lider portföy) uç noktaları tarayıcıya CORS izni vermez; masaüstünde başlıkları düzeltiyoruz. Salt okunur, herkese açık veri.
function corsBridge(){
  // Electron'da her webRequest olayına tek dinleyici bağlanabilir: Binance lider uç noktaları ve yerel LLM (Ollama 11434, LM Studio 1234) aynı süzgeçte.
  const LOCAL=['http://localhost:11434/*','http://127.0.0.1:11434/*','http://localhost:1234/*','http://127.0.0.1:1234/*'];
  const F={urls:['https://www.binance.com/bapi/*',...LOCAL]}; const ses=session.defaultSession; const isLocal=u=>/^http:\/\/(localhost|127\.0\.0\.1):(11434|1234)\//.test(u);
  ses.webRequest.onBeforeSendHeaders(F,(d,cb)=>{ const h=d.requestHeaders||{};
    if(isLocal(d.url)){ delete h['Origin']; delete h['origin']; } // file:// sayfasının Origin'i ("null") Ollama'da 403 alır
    else { h['Origin']='https://www.binance.com'; h['Referer']='https://www.binance.com/en/copy-trading'; }
    cb({requestHeaders:h}); });
  ses.webRequest.onHeadersReceived(F,(d,cb)=>{ const h=Object.assign({},d.responseHeaders||{}); for(const k of Object.keys(h)) if(/^access-control-/i.test(k)) delete h[k]; h['Access-Control-Allow-Origin']=['*']; h['Access-Control-Allow-Headers']=['*']; h['Access-Control-Allow-Methods']=['GET, POST, OPTIONS']; cb({responseHeaders:h,statusLine:d.method==='OPTIONS'?'HTTP/1.1 200 OK':d.statusLine}); });
}

let win=null, quitting=false, crashes=[], hangTimer=null, sysEndAt=0, asking=false;
const MEM_RELOAD_MB=2500; // sayfa bu kadar belleğe ulaşırsa kontrollü yeniden yükle (bot durumu localStorage'da)

function reloadSafe(why){
  log('sayfa yeniden yükleniyor:',why);
  if(!win||win.isDestroyed()){ create(); return; }
  try{ win.webContents.reload(); }catch(e){ logErr('reload',e); try{ win.destroy(); }catch(_){} win=null; create(); }
}

function create(){
  win=new BrowserWindow({width:1480,height:920,minWidth:900,minHeight:600,backgroundColor:'#0a0e13',title:'SWEEP · Likidite Terminali',icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{ shell.openExternal(url); return {action:'deny'}; });
  const wc=win.webContents;

  // Sayfadaki hata ve uyarılar da günlüğe düşsün.
  wc.on('console-message',(e,...a)=>{ const lv=e.level!==undefined?e.level:a[0], msg=e.message!==undefined?e.message:a[1], line=e.lineNumber!==undefined?e.lineNumber:a[2]; if(typeof msg==='string'&&msg.startsWith('SWEEP · durum ')){ botStatus(msg.slice(14)); return; } const err=lv==='error'||lv===3, warn=lv==='warning'||lv===2; if(err||warn) logLine(err?'page-error':'page-warn',msg+(line?' @'+line:'')); });
  wc.on('did-fail-load',(e,code,desc)=>logErr('did-fail-load',code,desc));

  // Sayfa süreci çökerse (bellek, GPU, Windows) pencere boş kalmasın: kaydet ve yeniden yükle; arka arkaya çökerse bekleyip pencereyi baştan kur.
  wc.on('render-process-gone',(e,d)=>{
    logErr('render-process-gone',d.reason,'exitCode='+d.exitCode);
    if(quitting||d.reason==='clean-exit') return;
    const now=Date.now(); crashes=crashes.filter(t=>now-t<10*60e3); crashes.push(now);
    if(crashes.length<=3) setTimeout(()=>reloadSafe('çökme sonrası ('+d.reason+')'),1500);
    else { log('10 dakikada',crashes.length,'çökme; pencere 30 sn sonra yeniden kurulacak'); setTimeout(()=>{ try{ win&&!win.isDestroyed()&&win.destroy(); }catch(_){} win=null; create(); },30000); }
  });
  // Donma: 60 sn yanıt vermezse yeniden yükle.
  win.on('unresponsive',()=>{ log('pencere yanıt vermiyor'); clearTimeout(hangTimer); hangTimer=setTimeout(()=>reloadSafe('60 sn donma'),60000); });
  win.on('responsive',()=>{ log('pencere yeniden yanıt veriyor'); clearTimeout(hangTimer); });

  // Yanlışlıkla kapatmaya karşı: bot çalışıyorsa sor.
  win.on('close',e=>{
    if(quitting) return;
    e.preventDefault();
    // Windows (güncelleme/yükleyici, oturum sonu) kapatmak istiyorsa soru açma: eşzamanlı pencere ana süreci kilitliyor, günlük ve kayıt duruyordu (7 Ekim 00:17).
    // Gerçek kapanışta session-end gelir ve uygulama kapanır; gelmezse pencere açık kalır.
    if(Date.now()-sysEndAt<120e3){ log('Windows pencereyi kapatmak istedi; bot için açık kalıyor'); return; }
    if(asking) return;
    // sayfa çökmüş/donmuşsa yanıt gelmeyebilir: 1,5 sn sonra sormadan devam
    Promise.race([wc.executeJavaScript('(()=>{try{const b=JSON.parse(localStorage.getItem("st-bot")||"{}");return {on:!!b.on,n:(b.positions||[]).length};}catch(e){return {on:false,n:0};}})()',true),new Promise(r=>setTimeout(()=>r({on:false,n:0}),1500))])
      .catch(()=>({on:false,n:0}))
      .then(s=>{
        if(!s.on&&!s.n) return 0;
        // Eşzamansız soru: yanıt beklenirken ana süreç (günlük, durum dosyası, localStorage) çalışmaya devam eder.
        asking=true;
        return dialog.showMessageBox(win,{type:'question',buttons:['Kapat','Açık kalsın'],defaultId:1,cancelId:1,title:'SWEEP',message:'Bot çalışıyor'+(s.n?' ('+s.n+' açık pozisyon)':'')+'. Kapatılsın mı?',detail:'Pencere kapanınca bot durur; pozisyonlar kayıtlı kalır.'}).then(r=>r.response).finally(()=>{ asking=false; });
      })
      .then(r=>{
        if(r!==0){ log('kapatma iptal edildi'); return; }
        log('kullanıcı pencereyi kapattı'); quitting=true; if(win&&!win.isDestroyed()) win.close();
      });
  });
  // Windows kapanışı / oturum kapatma: soru sorup kapanışı engelleme, nedeni kaydet.
  win.on('query-session-end',()=>{ sysEndAt=Date.now(); log('Windows oturumu/kapanışı soruyor (query-session-end)'); });
  win.on('session-end',()=>{ quitting=true; log('Windows oturumu kapanıyor veya bilgisayar kapanıyor (session-end)'); });
  win.on('closed',()=>{ win=null; });
}

// Bellek ve süreç durumu: 10 dakikada bir günlüğe; sayfa çok şişerse kontrollü yeniden yükleme.
function memWatch(){
  try{
    const m=app.getAppMetrics(); const parts=m.map(p=>p.type+':'+Math.round((p.memory&&p.memory.workingSetSize||0)/1024)+'MB');
    log('bellek',parts.join(' '));
    if(win&&!win.isDestroyed()){ const pid=win.webContents.getOSProcessId(); const r=m.find(p=>p.pid===pid); const mb=r&&r.memory?r.memory.workingSetSize/1024:0; if(mb>MEM_RELOAD_MB) reloadSafe('bellek '+Math.round(mb)+' MB'); }
  }catch(e){ logErr('memWatch',e); }
}

app.on('second-instance',()=>{ if(win){ if(win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.on('child-process-gone',(e,d)=>logErr('child-process-gone',d.type,d.reason,'exitCode='+d.exitCode,d.name||''));
app.on('before-quit',()=>{ quitting=true; log('uygulama kapanıyor (before-quit)'); });
app.on('will-quit',()=>log('uygulama kapandı'));

app.whenReady().then(()=>{
  log('--- SWEEP başladı · sürüm',app.getVersion(),'· Electron',process.versions.electron,'· günlük',path.join(app.getPath('userData'),'logs'));
  pruneLogs();
  // Bilgisayar uyku moduna geçince bot durmasın (ekran kapanabilir).
  powerSaveBlocker.start('prevent-app-suspension');
  // Windows güncelleme / yeniden başlatma sonrası uygulama kendiliğinden açılsın (Görev Yöneticisi > Başlangıç'tan kapatılabilir).
  try{ if(app.isPackaged&&process.platform!=='linux') app.setLoginItemSettings({openAtLogin:true}); }catch(e){ logErr('loginItem',e); }
  // Windows kapanışı, oturum sonu, uyku: bir sonraki kapanmada neden görülsün.
  for(const ev of ['suspend','resume','shutdown','lock-screen','unlock-screen','on-ac','on-battery']) powerMonitor.on(ev,()=>log('güç olayı:',ev));
  corsBridge();
  create();
  setInterval(memWatch,10*60e3); setTimeout(memWatch,60e3);
  app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) create(); });
});
app.on('window-all-closed',()=>{
  if(quitting){ if(process.platform!=='darwin') app.quit(); return; }
  // Kullanıcı kapatmadan pencere kaybolduysa uygulama arka planda penceresiz kalmasın: yeniden aç.
  log('pencere beklenmedik şekilde kapandı; yeniden açılıyor');
  setTimeout(()=>{ if(!quitting&&BrowserWindow.getAllWindows().length===0) create(); },3000);
});
