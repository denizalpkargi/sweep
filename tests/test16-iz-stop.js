// Test #16 (10 Ekim 2026): masa koşucusunda iz süren stop = 2,5 × ATR(6 sa karşılığı) ↔ bugünkü risk0 izi.
// Girdi: tests/data/arch/samples-*.jsonl (masa-archive.js) içinde bugünkü giriş kuralını geçen kararlar (veto yok, puan ≥ 0,35, evet ≥ 3)
//   + tests/data/arch/15m/<SYM>.csv + funding/<SYM>.csv.
// Her karar 15 dk mumlarla yeniden oynatılır (backtest-masa simBot ile aynı adım sırası: ters uç, lehte uç, kapanış; market giriş
// taker %0,05 + kayma %0,03; hedef 1 = 1,5R'de %50 maker + stop girişe; hedef 2 = runR (3R, karşı trendde 2R) %60 maker; zaman stopu 8 sa)
// ve her fonlama anında kalan miktar × fiyat × oran (long öder) düşülür. Çıkış kuralları:
//   bugun   : paperStep (hedef 1 sonrası iz = tepe − 1 × risk0, hedef 2 sonrası 0,7 × risk0)
//   atr6s   : hedef 1 sonrası (ve hedef 2 sonrası) iz = tepe − 2,5 × ATR15(14) × √24 (6 sa karşılığı, strateji-taramasi/2026-10-08 önerisi)
//   atr6h   : iz = tepe − 2,5 × ATR(14) gerçek 6 sa mumlarından (00/06/12/18 UTC, kapanmış)
//   iziyok  : hedef 1 sonrası stop girişte kalır, iz yok (mekanizmayı görmek için)
// Ek: aynı dört kural 24 sa zaman stopuyla (iz geniş olunca 8 sa onu bağlar mı diye).
// Ayrıca tests/data/arch/_t16-islemler.jsonl yazar (test06 bitiş zamanlarını buradan okur).
// Kullanım: node tests/test16-iz-stop.js  → tests/test16-iz-stop-report.md
const fs=require('fs'), path=require('path'), readline=require('readline');
const {loadEngine}=require('./engine-node.js');
const E=loadEngine(); const cfg=E.BOT_CFG_DEF; const M15=9e5, H=3600e3, DAY=864e5;
const ARCH=path.join(__dirname,'data','arch'); const THR=0.35, MINYES=3;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];

// paperStep kopyası, iz uzaklığı parametreli (trail1/trail2: fiyat birimi; null → risk0 tabanlı bugünkü kural)
function step(p,px,now,tr){
  const isL=p.dir==="long"; const out=[]; p.hi=Math.max(p.hi,px); p.lo=Math.min(p.lo,px); const risk=p.risk0;
  if(isL? px<=p.stop : px>=p.stop){ out.push({part:1,price:isL?p.stop*(1-cfg.slip):p.stop*(1+cfg.slip),k:"stop",taker:true,final:true}); return out; }
  if(p.stage==="open" && (isL? px>=p.t1 : px<=p.t1)){ out.push({part:0.5,price:p.t1,k:"tp1",taker:false}); p.stage="tp1"; if(isL? p.entry>p.stop : p.entry<p.stop) p.stop=p.entry; return out; }
  if(p.stage==="tp1"){ if(p.t2 && (isL? px>=p.t2 : px<=p.t2)){ out.push({part:0.6,price:p.t2,k:"tp2",taker:false}); p.stage="tp2"; }
    const d=tr.mode==="bugun"?1*risk:tr.d; if(d!=null){ const trail=isL?p.hi-d:p.lo+d; if(isL? trail>p.stop : trail<p.stop) p.stop=trail; } }
  if(p.stage==="tp2"){ const d=tr.mode==="bugun"?0.7*risk:tr.d; if(d!=null){ const trail=isL?p.hi-d:p.lo+d; if(isL? trail>p.stop : trail<p.stop) p.stop=trail; } }
  if(p.expiresAt && now>p.expiresAt){ out.push({part:1,price:isL?px*(1-cfg.slip):px*(1+cfg.slip),k:"time",taker:true,final:true}); }
  return out;
}
// tek işlem; fund: [[t,rate]] sıralı; fi: ilk fonlama indeksi araması için
function sim(k,i,dir,sd,rr2,holdH,tr,fund,useEngine){
  const isL=dir==="long"; const e0=k[i].c, entry=isL?e0*(1+cfg.slip):e0*(1-cfg.slip);
  const stop=isL?entry*(1-sd):entry*(1+sd), risk=Math.abs(entry-stop);
  const p={dir,entry,stop,t1:isL?entry+1.5*risk:entry-1.5*risk,t2:isL?entry+rr2*risk:entry-rr2*risk,risk0:risk,stop0:stop,stage:"open",hi:entry,lo:entry,expiresAt:k[i].t+M15+holdH*H};
  let qty=1, pnl=-entry*cfg.feeTaker, fpnl=0; const hold=holdH*4+1;
  let fi=0; if(fund){ let lo=0,hi=fund.length; while(lo<hi){ const m=(lo+hi)>>1; if(fund[m][0]<=k[i].t+M15) lo=m+1; else hi=m; } fi=lo; }
  const fin=(j,how)=>({R:(pnl+fpnl)/risk,Rnf:pnl/risk,end:j,how,stage:p.stage});
  for(let j=i+1;j<Math.min(k.length,i+1+hold);j++){ const c=k[j];
    // bu mumun içinde (açılışında) düşen fonlama: kalan miktar × açılış fiyatı × oran
    while(fund&&fi<fund.length&&fund[fi][0]<c.t+M15){ if(fund[fi][0]>=c.t){ fpnl-=(isL?1:-1)*qty*c.o*fund[fi][1]; } fi++; }
    const seq=isL?[c.l,c.h,c.c]:[c.h,c.l,c.c];
    for(let z=0;z<3;z++){ const now=z===2?c.t+M15:c.t+1; const out=useEngine?E.paperStep(p,seq[z],now,cfg):step(p,seq[z],now,tr);
      for(const o of out){ if(o.part==null) continue; const q=o.final?qty:Math.min(qty,qty*o.part); const px=o.price; pnl+=q*(isL?px-entry:entry-px)-q*px*(o.taker?cfg.feeTaker:cfg.feeMaker); qty-=q; if(o.final||qty<=1e-9) return fin(j,o.k); } } }
  const j=Math.min(k.length-1,i+hold); const c=k[j]; pnl+=qty*(isL?c.c-entry:entry-c.c)-qty*c.c*cfg.feeTaker; return fin(j,"son");
}

async function loadDecisions(){
  const by={}; let all=0, n=0;
  for(const f of fs.readdirSync(ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f)).sort()){
    const rl=readline.createInterface({input:fs.createReadStream(path.join(ARCH,f))});
    for await(const l of rl){ if(!l) continue; all++; const s=JSON.parse(l); if(s.veto||s.score==null||s.score<THR||s.yes<MINYES||s.R==null) continue;
      const rr2=(s.a.trend[0]<-0.3&&s.a.liq[0]>0.5)?2:3; (by[s.sym]=by[s.sym]||[]).push({sym:s.sym,t:s.t,dir:s.dir,score:s.score,yes:s.yes,sd:s.sd,rr2,R0:s.R}); n++; } }
  return {by,all,n};
}
const VARS=[['bugun',8],['atr6s',8],['atr6h',8],['iziyok',8],['bugun',24],['atr6s',24],['atr6h',24],['iziyok',24]];
const vk=([m,h])=>m+'_'+h;

async function main(){
  const t0=Date.now(); const {by,all,n}=await loadDecisions(); console.log('karar',n,'/',all,((Date.now()-t0)/1e3).toFixed(0)+' sn');
  const W=fs.createWriteStream(path.join(ARCH,'_t16-islemler.jsonl')); const rows=[]; let chk=0, chkBad=0, chkEng=0;
  const syms=Object.keys(by).sort(); let si=0;
  for(const s of syms){ si++;
    const k=E.K(csv(path.join(ARCH,'15m',s+'.csv'))); if(!k.length){ console.log(s,'mum yok'); continue; }
    const fund=csv(path.join(ARCH,'funding',s+'.csv')).map(r=>[r[0],r[1]]).filter(r=>Number.isFinite(r[1])).sort((a,b)=>a[0]-b[0]);
    // 6 sa mumları (kapanmış), ATR14
    const h6=[]; for(const c of k){ const b=Math.floor(c.t/(6*H))*6*H; const L=h6[h6.length-1]; if(L&&L.t===b){ L.h=Math.max(L.h,c.h); L.l=Math.min(L.l,c.l); L.c=c.c; L.n++; } else h6.push({t:b,o:c.o,h:c.h,l:c.l,c:c.c,n:1}); }
    const idx=new Map(); k.forEach((c,i)=>idx.set(c.t,i));
    for(const d of by[s]){ const i=idx.get(d.t); if(i==null||i<20) continue;
      const atr15=E.atrAt(k,i+1,14); const now=k[i].t+M15;
      let lo=0,hi=h6.length; while(lo<hi){ const m=(lo+hi)>>1; if(h6[m].t+6*H<=now) lo=m+1; else hi=m; } const n6=lo; const atr6=n6>=15?E.atrAt(h6,n6,14):NaN;
      const res={};
      for(const v of VARS){ const [m,hh]=v; const tr={mode:m,d:m==='atr6s'?2.5*atr15*Math.sqrt(24):m==='atr6h'?2.5*atr6:null}; if(m==='atr6h'&&!Number.isFinite(atr6)) tr.d=2.5*atr15*Math.sqrt(24);
        res[vk(v)]=sim(k,i,d.dir,d.sd,d.rr2,hh,tr,fund,false); }
      // doğrulama: kopya adım = motorun paperStep'i, fonlamasız R = örnekteki R
      if(chk<3000){ chk++; const e=sim(k,i,d.dir,d.sd,d.rr2,8,null,null,true); if(Math.abs(e.Rnf-res.bugun_8.Rnf)>1e-6) chkEng++; if(Math.abs(e.Rnf-d.R0)>0.01) chkBad++; }
      const o={sym:s,t:d.t,dir:d.dir,score:d.score,yes:d.yes,sd:d.sd,R0:d.R0,atr15:atr15/k[i].c,atr6:atr6/k[i].c};
      for(const key in res) o[key]=[+res[key].R.toFixed(4),k[res[key].end].t+M15,res[key].how,res[key].stage,+res[key].Rnf.toFixed(4)];
      W.write(JSON.stringify(o)+'\n'); rows.push(o); }
    if(si%20===0) console.log(si,'/',syms.length,s,rows.length,((Date.now()-t0)/1e3).toFixed(0)+' sn');
  }
  await new Promise(r=>W.end(r));
  console.log('doğrulama: motor farkı',chkEng,'/',chk,'· örnek R farkı (>0,01R)',chkBad,'/',chk);
  report(rows,{chk,chkBad,chkEng,all,n});
}

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const sdev=a=>{ const m=mean(a); return Math.sqrt(mean(a.map(x=>(x-m)**2))); };
const fx=(v,d=3)=>v==null||!Number.isFinite(v)?'—':(v>=0&&d>0?'+':'')+v.toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
const ny=v=>v.toLocaleString('tr-TR');
function report(rows,meta){
  rows.sort((a,b)=>a.t-b.t); const T0=rows[0].t, T1=rows[rows.length-1].t, MID=(T0+T1)/2, L12=T1-365*DAY, L24=T1-730*DAY;
  const P={'tümü':r=>true,'1. yarı':r=>r.t<MID,'2. yarı':r=>r.t>=MID,'son 24 ay':r=>r.t>=L24,'son 12 ay':r=>r.t>=L12};
  const iso=t=>new Date(t).toISOString().slice(0,10);
  let md=`# Test #16 · Masa koşucusunda iz stop = 2,5 × ATR (6 sa karşılığı)\n\n10 Ekim 2026 · \`node tests/test16-iz-stop.js\`\n\n`;
  md+=`## Ne yapıldı\n\nMasa örneklerinden (\`tests/data/arch/samples-*.jsonl\`, ${ny(meta.all)} toplantı, 4 saatte bir iki yön, ayın ilk 30 coini) bugünkü giriş kuralını geçen **${ny(rows.length)} karar** (veto yok, puan ≥ 0,35, evet ≥ 3; ${iso(T0)} → ${iso(T1)}) 15 dk mumlarla yeniden oynatıldı. Giriş market (taker %0,05 + kayma %0,03), stop örnekteki masa stopu (\`sd\`), hedef 1 = 1,5R'de %50 (maker) + stop girişe, hedef 2 = 3R (karşı trendde 2R) %60 (maker), zaman stopu 8 sa; her fonlama anında kalan miktar düşülür/eklenir. Mum içinde önce ters uç, sonra lehte uç, sonra kapanış (backtest-masa \`simBot\` ile aynı).\n\n`;
  md+=`Doğrulama: kopya adım fonksiyonu ${meta.chk} kararda motorun \`paperStep\`'iyle ${meta.chkEng} farklı; fonlamasız R örnekteki R'den >0,01 farklı ${meta.chkBad}/${meta.chk}.\n\n`;
  md+=`Çıkış kuralları (hepsi hedef 1'den sonraki kalan pozisyona uygulanır):\n\n- **bugün**: iz = tepe − 1 × risk0 (hedef 2'den sonra 0,7 × risk0)\n- **ATR √24**: iz = tepe − 2,5 × ATR15(14) × √24 (test listesindeki "6 sa karşılığı")\n- **ATR 6 sa**: iz = tepe − 2,5 × ATR(14), gerçek 6 sa mumlarından\n- **iz yok**: stop girişte kalır\n\nATR uzaklığının risk cinsinden boyu: medyan ${fx(med(rows.map(r=>2.5*r.atr15*Math.sqrt(24)/r.sd)),2)}R (√24), ${fx(med(rows.filter(r=>Number.isFinite(r.atr6)).map(r=>2.5*r.atr6/r.sd)),2)}R (6 sa mumu). Yani 8 saatlik pozisyonda iz neredeyse hiç devreye girmiyor.\n\n`;
  const names={bugun:'bugün (1R / 0,7R iz)',atr6s:'2,5 × ATR √24',atr6h:'2,5 × ATR 6 sa mumu',iziyok:'iz yok'};
  for(const hh of [8,24]){
    md+=`## Ortalama R (fonlama dahil), zaman stopu ${hh} sa\n\n| kural | ${Object.keys(P).join(' | ')} |\n|---|${Object.keys(P).map(()=>'---:').join('|')}|\n`;
    for(const m of ['bugun','atr6s','atr6h','iziyok']){ const key=m+'_'+hh; md+=`| ${names[m]} | ${Object.values(P).map(f=>{ const a=rows.filter(f).map(r=>r[key][0]); return fx(mean(a)); }).join(' | ')} |\n`; }
    md+=`| fark ATR √24 − bugün | ${Object.values(P).map(f=>{ const a=rows.filter(f).map(r=>r['atr6s_'+hh][0]-r['bugun_'+hh][0]); return fx(mean(a))+` (t ${fx(mean(a)/sdev(a)*Math.sqrt(a.length),1)})`; }).join(' | ')} |\n`;
    md+=`| fark ATR 6 sa − bugün | ${Object.values(P).map(f=>{ const a=rows.filter(f).map(r=>r['atr6h_'+hh][0]-r['bugun_'+hh][0]); return fx(mean(a))+` (t ${fx(mean(a)/sdev(a)*Math.sqrt(a.length),1)})`; }).join(' | ')} |\n`;
    md+=`| işlem | ${Object.values(P).map(f=>ny(rows.filter(f).length)).join(' | ')} |\n\n`;
  }
  // hedef 1'e ulaşanlar (yalnız onlarda kural farkı var)
  const tp=rows.filter(r=>r.bugun_8[3]!=='open');
  md+=`## Yalnız hedef 1'e ulaşan işlemler (kuralın değdiği yer, 8 sa)\n\nHedef 1'e ulaşan pay: %${(100*tp.length/rows.length).toFixed(1)} (${ny(tp.length)} işlem).\n\n| kural | ${Object.keys(P).join(' | ')} |\n|---|${Object.keys(P).map(()=>'---:').join('|')}|\n`;
  for(const m of ['bugun','atr6s','atr6h','iziyok']){ md+=`| ${names[m]} | ${Object.values(P).map(f=>fx(mean(tp.filter(f).map(r=>r[m+'_8'][0])))).join(' | ')} |\n`; }
  md+=`\n## Çıkış nedenleri (8 sa, tümü)\n\n| kural | stop | hedef 1 sonrası stop/iz | zaman | hedef 2 sonrası iz | veri sonu |\n|---|---:|---:|---:|---:|---:|\n`;
  for(const m of ['bugun','atr6s','atr6h','iziyok']){ const a=rows.map(r=>r[m+'_8']); const c=(f)=>'%'+(100*a.filter(f).length/a.length).toFixed(1);
    md+=`| ${names[m]} | ${c(x=>x[2]==='stop'&&x[3]==='open')} | ${c(x=>x[2]==='stop'&&x[3]==='tp1')} | ${c(x=>x[2]==='time')} | ${c(x=>x[2]==='stop'&&x[3]==='tp2')} | ${c(x=>x[2]==='son')} |\n`; }
  // yıl yıl
  const yrs=[...new Set(rows.map(r=>new Date(r.t).getUTCFullYear()))].sort();
  md+=`\n## Yıl yıl (8 sa)\n\n| yıl | işlem | bugün | ATR √24 | ATR 6 sa | iz yok |\n|---|---:|---:|---:|---:|---:|\n`;
  for(const y of yrs){ const a=rows.filter(r=>new Date(r.t).getUTCFullYear()===y); md+=`| ${y} | ${ny(a.length)} | ${['bugun','atr6s','atr6h','iziyok'].map(m=>fx(mean(a.map(r=>r[m+'_8'][0])))).join(' | ')} |\n`; }
  md+=`\nFonlamanın payı (bugün, 8 sa): ortalama ${fx(mean(rows.map(r=>r.bugun_8[0]-r.bugun_8[4])),4)}R.\n`;
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test16-iz-stop-report.md'),md); console.log(md);
}
function med(a){ const b=a.filter(Number.isFinite).sort((x,y)=>x-y); return b.length?b[b.length>>1]:NaN; }
main().catch(e=>{ console.error(e); process.exit(1); });
