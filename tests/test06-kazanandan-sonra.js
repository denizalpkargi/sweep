// Test #6 (10 Ekim 2026): Turtle "kazanandan sonra atla" süzgeci masada.
// Girdi: tests/data/arch/_t16-islemler.jsonl (önce node tests/test16-iz-stop.js): giriş kuralını geçen masa kararları (veto yok,
//   puan ≥ 0,35, evet ≥ 3), her biri 15 dk mumlarla bugünkü bot planıyla oynatılmış (R fonlama dahil, bitiş zamanı).
// Kuramsal işlem dizisi: her coinde zaman sırasıyla, açık işlem bitmeden gelen sinyal alınmaz (aynı anda iki yön geçerse puanı yüksek olan).
// Süzgeç (Turtle S1 kuralı gibi kuramsal diziye bakar, atlanan işlemin sonucu da "önceki işlem" sayılır):
//   coin       : aynı coindeki önceki işlem kazandıysa (R > 0) bu işlemi atla
//   coin+yön   : aynı coin ve aynı yöndeki önceki işlem kazandıysa atla
// Pencere: önceki işlem sınırsız / son 24 sa / son 7 g içinde bitmişse sayılır. Karşılaştırma: "kaybedenden sonra atla" (ayna).
// Kullanım: node tests/test06-kazanandan-sonra.js → tests/test06-kazanandan-sonra-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const M15=9e5, DAY=864e5;
const F=path.join(ARCH,'_t16-islemler.jsonl'); if(!fs.existsSync(F)){ console.error('önce: node tests/test16-iz-stop.js'); process.exit(1); }
const D=fs.readFileSync(F,'utf8').split('\n').filter(Boolean).map(l=>{ const o=JSON.parse(l); return {sym:o.sym,t:o.t,dir:o.dir,score:o.score,R:o.bugun_8[0],end:o.bugun_8[1]}; });
const by={}; for(const d of D) (by[d.sym]=by[d.sym]||[]).push(d);
const seq=[]; let overl=0, both=0;
for(const s in by){ const a=by[s].sort((x,y)=>x.t-y.t||y.score-x.score); let last=-Infinity, lastT=null;
  for(const d of a){ if(d.t===lastT){ both++; continue; } if(d.t+M15<last){ overl++; continue; } seq.push(d); last=d.end; lastT=d.t; } }
seq.sort((a,b)=>a.t-b.t);
// önceki işlemler
const prevC={}, prevCD={};
const bySym={}; for(const d of seq) (bySym[d.sym]=bySym[d.sym]||[]).push(d);
for(const s in bySym){ const a=bySym[s]; let p=null; const pd={long:null,short:null}; for(const d of a){ d.pc=p; d.pcd=pd[d.dir]; p=d; pd[d.dir]=d; } }
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const sdev=a=>{ const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,a.length-1)); };
const fx=(v,d=3)=>!Number.isFinite(v)?'—':(v>=0?'+':'')+v.toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
const ny=n=>n.toLocaleString('tr-TR');
const T0=seq[0].t, T1=seq[seq.length-1].t, MID=(T0+T1)/2, L12=T1-365*DAY, L24=T1-730*DAY;
const P={'tümü':d=>true,'1. yarı':d=>d.t<MID,'2. yarı':d=>d.t>=MID,'son 24 ay':d=>d.t>=L24,'son 12 ay':d=>d.t>=L12};
const iso=t=>new Date(t).toISOString().slice(0,10);
const W={'sınırsız':Infinity,'24 sa':DAY,'7 g':7*DAY};
let md=`# Test #6 · Turtle "kazanandan sonra atla" süzgeci masada\n\n10 Ekim 2026 · \`node tests/test06-kazanandan-sonra.js\` (girdi \`node tests/test16-iz-stop.js\`)\n\n`;
md+=`## Ne yapıldı\n\nMasa örneklerinde (ayın ilk 30 coini, 4 saatte bir iki yön) bugünkü giriş kuralını geçen ${ny(D.length)} karar (${iso(T0)} → ${iso(T1)}) bugünkü bot planıyla 15 dk mumlarda oynatıldı (market giriş, 1,5R'de yarısı + stop girişe, 3R'de %60 + iz, 8 sa; taker %0,05 + kayma %0,03, fonlama dahil). Her coinde işlemler çakışmasın diye önceki işlem bitmeden gelen sinyal alınmadı (${ny(overl)} karar), aynı anda iki yön geçtiyse puanı yüksek olan alındı (${ny(both)}). Kalan **${ny(seq.length)} işlem** kuramsal dizi.\n\n`;
md+=`Süzgeç Turtle'ın 20 günlük sistemindeki gibi kuramsal diziye bakar: bir işlem atlandığında onun sonucu da "önceki işlem" olarak sayılır. "coin": aynı coindeki bir önceki işlem; "coin+yön": aynı coin ve aynı yöndeki bir önceki işlem. Pencere: önceki işlem son 24 sa / 7 g içinde bitmişse ya da sınırsız. Ayna kural (kaybedenden sonra atla) aynı sayıda işlemi rastgele olmayan başka bir yoldan attığı için kıyas olarak verildi.\n\n`;
md+=`Kuramsal dizinin ortalaması: ${Object.entries(P).map(([k,f])=>k+' '+fx(mean(seq.filter(f).map(d=>d.R)))+'R').join(' · ')}.\n\n`;
const res=[];
for(const key of ['pc','pcd']) for(const [wn,w] of Object.entries(W)){
  md+=`## ${key==='pc'?'Aynı coin':'Aynı coin + yön'} · pencere ${wn}\n\n| | ${Object.keys(P).join(' | ')} |\n|---|${Object.keys(P).map(()=>'---:').join('|')}|\n`;
  const win=d=>d[key]&&d.t+M15-d[key].end<=w&&d[key].R>0, los=d=>d[key]&&d.t+M15-d[key].end<=w&&d[key].R<=0;
  const line=(nm,fn)=>{ md+=`| ${nm} | ${Object.values(P).map(f=>{ const a=seq.filter(f).filter(fn).map(d=>d.R); return fx(mean(a))+' ('+ny(a.length)+')'; }).join(' | ')} |\n`; };
  line('alınan (önceki kazanan değil)',d=>!win(d)); line('atlanan (önceki kazanan)',win); line('önceki kaybeden',los); line('önceki yok / pencere dışı',d=>!win(d)&&!los(d));
  md+=`| fark: alınan − kuramsal | ${Object.values(P).map(f=>{ const a=seq.filter(f); return fx(mean(a.filter(d=>!win(d)).map(d=>d.R))-mean(a.map(d=>d.R))); }).join(' | ')} |\n`;
  md+=`| t (atlanan − önceki kaybeden) | ${Object.values(P).map(f=>{ const a=seq.filter(f).filter(win).map(d=>d.R), b=seq.filter(f).filter(los).map(d=>d.R); const t=(mean(a)-mean(b))/Math.sqrt(sdev(a)**2/a.length+sdev(b)**2/b.length); return fx(t,1); }).join(' | ')} |\n\n`;
  res.push({key,wn,d:Object.values(P).map(f=>{ const a=seq.filter(f); return mean(a.filter(d=>!win(d)).map(d=>d.R))-mean(a.map(d=>d.R)); })});
}
// yıl yıl, coin, sınırsız
const yrs=[...new Set(seq.map(d=>new Date(d.t).getUTCFullYear()))].sort();
md+=`## Yıl yıl (aynı coin, sınırsız pencere)\n\n| yıl | işlem | kuramsal | önceki kazanan (atlanan) | önceki kaybeden | alınan − kuramsal |\n|---|---:|---:|---:|---:|---:|\n`;
for(const y of yrs){ const a=seq.filter(d=>new Date(d.t).getUTCFullYear()===y); const w=a.filter(d=>d.pc&&d.pc.R>0), l=a.filter(d=>!(d.pc&&d.pc.R>0));
  md+=`| ${y} | ${ny(a.length)} | ${fx(mean(a.map(d=>d.R)))} | ${fx(mean(w.map(d=>d.R)))} (${ny(w.length)}) | ${fx(mean(a.filter(d=>d.pc&&d.pc.R<=0).map(d=>d.R)))} | ${fx(mean(l.map(d=>d.R))-mean(a.map(d=>d.R)))} |\n`; }
// önceki işlemin R'sine göre sonraki işlem (kalıcılık), coin
md+=`\n## Önceki işlemin sonucuna göre sonraki işlem (aynı coin, sınırsız)\n\n| önceki R | işlem | sonraki ort. R | sonraki kazanma |\n|---|---:|---:|---:|\n`;
for(const [nm,f] of [['≤ −0,9 (tam stop)',r=>r<=-0.9],['−0,9…0',r=>r>-0.9&&r<=0],['0…1',r=>r>0&&r<=1],['> 1',r=>r>1]]){ const a=seq.filter(d=>d.pc&&f(d.pc.R)); md+=`| ${nm} | ${ny(a.length)} | ${fx(mean(a.map(d=>d.R)))} | %${(100*a.filter(d=>d.R>0).length/a.length).toFixed(1)} |\n`; }
md+=`\nKazanma tanımı R > 0 (maliyet ve fonlama sonrası).\n`;
md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test06-kazanandan-sonra-report.md'),md); console.log(md);
