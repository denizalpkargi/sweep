const {app,BrowserWindow,shell,Menu}=require('electron');
const path=require('path');
function create(){
  const win=new BrowserWindow({width:1480,height:920,minWidth:900,minHeight:600,backgroundColor:'#0a0e13',title:'SWEEP · Likidite Terminali',icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{ shell.openExternal(url); return {action:'deny'}; });
}
app.whenReady().then(()=>{ create(); app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) create(); }); });
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
