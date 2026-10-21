#!/usr/bin/env node
// Ekransız botun bot-data klasöründen Electron state.json biçiminde canlı kayıt üretir (stdout).
// {t, kaynak:"headless", data:{"st-bot": bot.json, ...store.json (st-fc, st-lab, st-sel, ...)}}; tests/hata-orneklem.js --live okur.
// Anahtarlar (st-acct, st-llm-key) yazılmaz.
const fs=require('fs'); const path=require('path');
const dir=process.argv[2]||'bot-data';
const read=f=>{ try{ return fs.readFileSync(path.join(dir,f),'utf8'); }catch(e){ return null; } };
const data={};
try{ Object.assign(data,JSON.parse(read('store.json')||'{}')); }catch(e){}
for(const k of Object.keys(data)) if(!/^(st|rp)-/.test(k)||k==='st-acct'||k==='st-llm-key') delete data[k];
const bot=read('bot.json'); if(bot) data['st-bot']=bot;
let t=Date.now(); try{ t=JSON.parse(read('status.json')).t||t; }catch(e){}
process.stdout.write(JSON.stringify({t,kaynak:'headless',data}));
