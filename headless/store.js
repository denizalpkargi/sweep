// Ekransız bot için dosya tabanlı depolama: localStorage taklidi (motorun önbellekleri, liderler) ve günlük JSONL yazıcı.
const fs=require('fs'); const path=require('path');

function atomicWrite(file,text){ const tmp=file+'.tmp'; fs.writeFileSync(tmp,text); fs.renameSync(tmp,file); }

// localStorage arayüzü, tek bir JSON dosyasına yazar (motor: rp-cons, rp-journal, st-leaders)
function fileStorage(file){
  let data={}; try{ data=JSON.parse(fs.readFileSync(file,'utf8'))||{}; }catch(e){ data={}; }
  let timer=null; const flush=()=>{ timer=null; try{ atomicWrite(file,JSON.stringify(data)); }catch(e){ console.error('depo yazılamadı',e.message); } };
  return {
    getItem:k=>Object.prototype.hasOwnProperty.call(data,k)?data[k]:null,
    setItem:(k,v)=>{ data[k]=String(v); if(!timer) timer=setTimeout(flush,1000); },
    removeItem:k=>{ delete data[k]; if(!timer) timer=setTimeout(flush,1000); },
    flush:()=>{ if(timer){ clearTimeout(timer); flush(); } }
  };
}

// JSONL: her satır bir JSON nesnesi; ad-YYYY-MM-DD.jsonl (UTC gün) ya da sabit ad
function jsonl(dir){
  fs.mkdirSync(dir,{recursive:true});
  return (name,obj,daily=true)=>{
    const f=path.join(dir,daily?`${name}-${new Date(obj.t||Date.now()).toISOString().slice(0,10)}.jsonl`:`${name}.jsonl`);
    try{ fs.appendFileSync(f,JSON.stringify(obj)+'\n'); }catch(e){ console.error('günlük yazılamadı',f,e.message); }
  };
}

module.exports={fileStorage,jsonl,atomicWrite};
