// Chromium localStorage leveldb dosyalarından (.ldb, .log) son st-*/rp-* değerlerini çıkarır ve SWEEP'in geri yükleme dosyasını yazar.
// 8 Ekim 2026: zorla kapatma sonrası veritabanı sıfırlandı ama eski dosyalar klasörde kaldı; bot kaydı buradan kurtarıldı.
// Kullanım: node electron/recover-ldb.js "<...\SWEEP\Local Storage\leveldb>" <çıktı.json> [dosya ön eki, örn. 0031]
// Çıktıyı İndirilenler'e sweep-geri-yukle.json adıyla koyup SWEEP'i açın (preload.js bir kez uygular). Hesap/LLM anahtarı yazılmaz.
const fs=require('fs'), path=require('path');
const [dir,out,pre='']=process.argv.slice(2);
function varint(b,i){ let r=0,s=0; for(;;){ const x=b[i++]; r+=(x&0x7f)*2**s; s+=7; if(x<0x80) return [r,i]; } }
function snappy(b){ let [n,i]=varint(b,0); const o=Buffer.alloc(n); let p=0;
  while(i<b.length){ const t=b[i++], k=t&3; let l,off;
    if(k===0){ l=t>>2; if(l>=60){ const nb=l-59; l=b.readUIntLE(i,nb); i+=nb; } l++; b.copy(o,p,i,i+l); i+=l; p+=l; continue; }
    if(k===1){ l=((t>>2)&7)+4; off=((t>>5)<<8)|b[i++]; } else if(k===2){ l=(t>>2)+1; off=b.readUInt16LE(i); i+=2; } else { l=(t>>2)+1; off=b.readUInt32LE(i); i+=4; }
    for(let j=0;j<l;j++,p++) o[p]=o[p-off]; }
  return o; }
function logRecs(d){ const recs=[]; let cur=null;
  for(let bs=0;bs<d.length;bs+=32768){ const blk=d.subarray(bs,bs+32768); let p=0;
    while(p+7<=blk.length){ const ln=blk.readUInt16LE(p+4), ty=blk[p+6]; if(ty===0&&ln===0) break; const data=blk.subarray(p+7,p+7+ln); p+=7+ln;
      if(ty===1) recs.push(data); else if(ty===2) cur=[data]; else if(ty===3&&cur) cur.push(data); else if(ty===4&&cur){ cur.push(data); recs.push(Buffer.concat(cur)); cur=null; } } }
  const kv=[]; for(const r of recs){ if(r.length<12) continue; const seq=Number(r.readBigUInt64LE(0)), cnt=r.readUInt32LE(8); let i=12;
    try{ for(let c=0;c<cnt;c++){ const tag=r[i++]; let kl; [kl,i]=varint(r,i); const k=r.subarray(i,i+kl); i+=kl; let v=null; if(tag===1){ let vl; [vl,i]=varint(r,i); v=r.subarray(i,i+vl); i+=vl; } kv.push([seq,k,v]); } }catch(e){} }
  return kv; }
function blockEnts(b){ const nres=b.readUInt32LE(b.length-4), end=b.length-4-4*nres; let i=0, last=Buffer.alloc(0); const e=[];
  while(i<end){ let sh,ns,vl; [sh,i]=varint(b,i); [ns,i]=varint(b,i); [vl,i]=varint(b,i); const k=Buffer.concat([last.subarray(0,sh),b.subarray(i,i+ns)]); i+=ns; e.push([k,b.subarray(i,i+vl)]); i+=vl; last=k; }
  return e; }
function ldbRecs(d){ const foot=d.subarray(d.length-48); let i=0,x,io,isz; [x,i]=varint(foot,i); [x,i]=varint(foot,i); [io,i]=varint(foot,i); [isz,i]=varint(foot,i);
  const rd=(o,s)=>{ const raw=d.subarray(o,o+s); return d[o+s]===1?snappy(raw):raw; }; const kv=[];
  for(const [,h] of blockEnts(rd(io,isz))){ let o,s,j; [o,j]=varint(h,0); [s,j]=varint(h,j);
    for(const [ik,v] of blockEnts(rd(o,s))){ const tag=ik[ik.length-8], seq=ik.readUIntLE(ik.length-7,6)+ik[ik.length-1]*2**48; kv.push([seq,ik.subarray(0,ik.length-8),tag===1?v:null]); } }
  return kv; }
const best=new Map();
for(const f of fs.readdirSync(dir).filter(f=>/\.(ldb|log)$/.test(f)&&f.startsWith(pre))){ const d=fs.readFileSync(path.join(dir,f));
  let kv; try{ kv=f.endsWith('.log')?logRecs(d):ldbRecs(d); }catch(e){ console.log(f,'okunamadı',e.message); continue; }
  for(const [seq,k,v] of kv){ const ks=k.toString('latin1'); const b=best.get(ks); if(!b||seq>b.seq) best.set(ks,{seq,v,f}); } }
const data={}; for(const [k,{v,f,seq}] of best){ const m=k.match(/^_file:\/\/\x00\x01(.*)$/s); if(!m||!v) continue; const key=m[1];
  if(!/^(st|rp)-/.test(key)||key==='st-acct'||key==='st-llm-key') continue;
  data[key]=v[0]===1?v.subarray(1).toString('latin1'):v.subarray(1).toString('utf16le'); console.log(key,seq,f,data[key].length); }
if(!data['st-bot']){ console.log('st-bot bulunamadı; dosya yazılmadı'); process.exit(1); }
const b=JSON.parse(data['st-bot']); console.log('bot: açık',b.on,'bakiye',(+b.bal).toFixed(2),'pozisyon',(b.positions||[]).map(p=>p.sym+' '+p.dir).join(', '),'son',new Date(b.lastTick||0).toISOString());
fs.writeFileSync(out,JSON.stringify({t:Date.now(),why:'leveldb kurtarma',data}));
console.log('yazıldı',out);
