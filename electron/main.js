const {app,BrowserWindow,shell,Menu,powerSaveBlocker,session}=require('electron');
const path=require('path');
// Pencere arka plandayken / simge durumundayken bot ve tarama yavaşlamasın.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// Binance kopya trader (lider portföy) uç noktaları tarayıcıya CORS izni vermez; masaüstünde başlıkları düzeltiyoruz. Salt okunur, herkese açık veri.
function corsBridge(){
  const F={urls:['https://www.binance.com/bapi/*']}; const ses=session.defaultSession;
  ses.webRequest.onBeforeSendHeaders(F,(d,cb)=>{ const h=d.requestHeaders||{}; h['Origin']='https://www.binance.com'; h['Referer']='https://www.binance.com/en/copy-trading'; cb({requestHeaders:h}); });
  ses.webRequest.onHeadersReceived(F,(d,cb)=>{ const h=Object.assign({},d.responseHeaders||{}); for(const k of Object.keys(h)) if(/^access-control-/i.test(k)) delete h[k]; h['Access-Control-Allow-Origin']=['*']; h['Access-Control-Allow-Headers']=['*']; h['Access-Control-Allow-Methods']=['GET, POST, OPTIONS']; cb({responseHeaders:h,statusLine:d.method==='OPTIONS'?'HTTP/1.1 200 OK':d.statusLine}); });
}
function create(){
  const win=new BrowserWindow({width:1480,height:920,minWidth:900,minHeight:600,backgroundColor:'#0a0e13',title:'SWEEP · Likidite Terminali',icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{ shell.openExternal(url); return {action:'deny'}; });
}
app.whenReady().then(()=>{
  // Bilgisayar uyku moduna geçince bot durmasın (ekran kapanabilir).
  powerSaveBlocker.start('prevent-app-suspension');
  corsBridge();
  create();
  app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) create(); });
});
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
