const {app,BrowserWindow,shell,Menu,powerSaveBlocker}=require('electron');
const path=require('path');
// Pencere arka plandayken / simge durumundayken bot ve tarama yavaşlamasın.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
function create(){
  const win=new BrowserWindow({width:1480,height:920,minWidth:900,minHeight:600,backgroundColor:'#0a0e13',title:'SWEEP · Likidite Terminali',icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{ shell.openExternal(url); return {action:'deny'}; });
}
app.whenReady().then(()=>{
  // Bilgisayar uyku moduna geçince bot durmasın (ekran kapanabilir).
  powerSaveBlocker.start('prevent-app-suspension');
  create();
  app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) create(); });
});
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
