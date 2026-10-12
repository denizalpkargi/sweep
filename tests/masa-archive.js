// Masa toplantılarını Binance arşivindeki geniş veride yeniden oynatır (Adım 4b'nin girdisi).
// Veri: node tests/fetch-archive.js → tests/data/arch/{15m,1d,funding}/<SYM>.csv ve universe.json.
// Her ay o ayın evrenindeki (önceki 30 günün hacmine göre ilk --top coin, TradFi hariç, delist dahil) coinlerde, --step 15 dk mumda bir
// (varsayılan 16 = 4 saat) her iki yön için committee() çalışır. Örnek başına: üyelerin açılış oyları (v, c, çekimser), puan, evet, veto,
// botun planıyla sonuç R (backtest-masa simBot), tahmin defteri ölçüsü y ve modele girecek ham özellikler (yöne göre işaretli) ile
// 4 saat sonraki hareket ÷ ATR (f4). Fonlama arşivden gelir; OI, kalabalık, liderler yine nötr.
// Kullanım: node tests/masa-archive.js [parça=0] [parça sayısı=1] [--step 16] [--top 30] [--from 2020-06] [--to 2026-11] [--oos dosya.csv | --rule] [--tag ad]
//   → tests/data/arch/samples-<parça>.jsonl  (4 çekirdekte: 0..3 ayrı süreçler; --tag ile samples-<ad>-<parça>.jsonl)
// Eğitilmiş üyeler (12 Ekim 2026): committee'ye karar anı (now = mumun kapanışı) verilir. Canlıdaki model (src/uyemodel-data.js) arşivin tamamıyla
// eğitildiği için arşivde onunla oynatmak örneklem içidir; ayrıca coin coin oynatmada rkCache başka coinlerin başka tarihlerdeki satırlarını karıştırıyordu.
//   --oos: ileriye yürüyen eğitimin örneklem dışı dilimleri (t_saat_ms,sym,üye id,p4,p12; tests/uye-oos-csv.py) → rkScore yerine (rkOverride).
//          Karar anında bilinen son saatlik tahmin (en çok 59 dk eski, canlıdaki gibi); coin o saatte evrende değilse üye kural oyuyla konuşur.
//   --rule: model hiç yok (eski kural masası; Ozan çekimser) — aynı dönemde kıyas için.
const fs=require('fs'), path=require('path');
const {loadEngine}=require('./engine-node.js'); const {inputsAt,simBot,fcY}=require('./backtest-masa.js');
const ARCH=path.join(__dirname,'data','arch');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const SH=+(process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:0), NSH=+(process.argv[3]&&!process.argv[3].startsWith('--')?process.argv[3]:1);
const STEP=+arg('step',16), TOP=+arg('top',30), FROM=String(arg('from','2020-06')), TO=String(arg('to','9999')), OOS=arg('oos',null), RULE=process.argv.includes('--rule'), TAG=arg('tag',null);
const E=loadEngine(); const M15=9e5, DAY=864e5;
const csvK=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m of Object.keys(U)) if(m>=FROM&&m<TO) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const syms=Object.keys(monthsOf).sort().filter((s,i)=>i%NSH===SH);
const btc=E.K(csvK(path.join(ARCH,'15m','BTCUSDT.csv'))), btcD=E.K(csvK(path.join(ARCH,'1d','BTCUSDT.csv')));
// örneklem dışı dilimler: saat → sym → {id:[p4,p12]}
const H=36e5; let OOSM=null;
if(OOS){ OOSM=new Map(); const ok=new Set(syms); let n=0;
  for(const l of fs.readFileSync(OOS,'utf8').split('\n')){ if(!l||l[0]==='t') continue; const [t,s,id,p4,p12]=l.split(','); if(!ok.has(s)) continue;
    let h=OOSM.get(+t); if(!h) OOSM.set(+t,h=new Map()); let o=h.get(s); if(!o) h.set(s,o={}); o[id]=[+p4,+p12]; n++; }
  console.log('örneklem dışı dilim',n,'saat',OOSM.size); }
const pAvg=(a,b)=>{ const v=[a,b].filter(Number.isFinite); return v.length?v.reduce((x,y)=>x+y,0)/v.length:NaN; };
if(OOSM) E.setRkOverride((sym,now)=>{ const h=OOSM.get(Math.floor(now/H)*H); const o=h&&h.get(sym); if(!o) return {sym,out:true,n:0,fam:{}};
  const fam={}; for(const id in o){ if(id==='rank') continue; const [p4,p12]=o[id]; fam[id]={p4,p12,p:pAvg(p4,p12),n:30}; }
  const r=o.rank; return r?{sym,n:30,p4:r[0],p12:r[1],p:pAvg(r[0],r[1]),fam}:{sym,out:true,n:30,fam}; });
else if(RULE) E.setRkOverride(()=>null);
const lb=(a,t)=>{ let lo=0,hi=a.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(a[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r; };
const smaC=(a,i,n)=>{ if(i+1<n) return NaN; let s=0; for(let j=i-n+1;j<=i;j++) s+=a[j].c; return s/n; };
const L=Math.log, r4=x=>Number.isFinite(x)?+x.toFixed(4):null;
// yönden bağımsız ham özellikler (t anında kapanmış mumlarla); yön işareti örneğe yazılırken uygulanır
function feats(k,i,d1,fund){
  const px=k[i].c, atr=E.atrAt(k,i+1,14); const d=lb(d1,k[i].t-DAY); // son kapanmış gün
  const bi=lb(btc,k[i].t), bd=lb(btcD,k[i].t-DAY);
  let q4=0,q96=0; for(let j=i-3;j<=i;j++) q4+=k[j].q; for(let j=i-95;j<=i;j++) q96+=k[j].q;
  let tb=0,qq=0; for(let j=i-3;j<=i;j++){ tb+=k[j].tb; qq+=k[j].q; }
  let hi=-Infinity,lo=Infinity; for(let j=i-95;j<=i;j++){ if(k[j].h>hi) hi=k[j].h; if(k[j].l<lo) lo=k[j].l; }
  let fr=null; if(fund&&fund.length){ let lo2=0,hi2=fund.length-1,r=-1; while(lo2<=hi2){ const m=(lo2+hi2)>>1; if(fund[m][0]<=k[i].t+M15){ r=m; lo2=m+1; } else hi2=m-1; } if(r>=0) fr=fund[r][1]; }
  const dc=d>=0?d1[d].c:NaN;
  return { atrp:atr/px, r1:L(px/k[i-4].c), r4:L(px/k[i-16].c), r24:L(px/k[i-96].c), r7d:d>=7?L(px/d1[d-7].c):NaN, r30d:d>=30?L(px/d1[d-30].c):NaN,
    s20:L(px/smaC(d1,d,20)), s50:L(px/smaC(d1,d,50)), s200:L(px/smaC(d1,d,200)), pos24:(px-lo)/Math.max(1e-12,hi-lo), vq:q4/(q96/24), tk:qq>0?tb/qq:0.5,
    vol30:d>=30?(()=>{ let s=0,s2=0; for(let j=d-29;j<=d;j++){ const x=L(d1[j].c/d1[j-1].c); s+=x; s2+=x*x; } return Math.sqrt(Math.max(0,s2/30-(s/30)**2)); })():NaN,
    b4:bi>=16?L(btc[bi].c/btc[bi-16].c):NaN, b24:bi>=96?L(btc[bi].c/btc[bi-96].c):NaN, bs200:L(btc[bi].c/smaC(btcD,bd,200)), bs50:L(btc[bi].c/smaC(btcD,bd,50)),
    fr, hr:new Date(k[i].t+M15).getUTCHours(), dow:new Date(k[i].t+M15).getUTCDay(), atr, dc };
}
const SIGNED=['r1','r4','r24','r7d','r30d','s20','s50','s200','b4','b24','bs200','bs50','fr']; // long için olduğu gibi, short için eksi
const out=path.join(ARCH,TAG?`samples-${TAG}-${SH}.jsonl`:`samples-${SH}.jsonl`); const W=fs.createWriteStream(out); const cfg=E.BOT_CFG_DEF; const t0=Date.now(); let tot=0;
for(const s of syms){
  const k=E.K(csvK(path.join(ARCH,'15m',s+'.csv'))), d1=E.K(csvK(path.join(ARCH,'1d',s+'.csv'))); if(k.length<4000){ console.log(s,'az veri',k.length); continue; }
  const fund=csvK(path.join(ARCH,'funding',s+'.csv')).map(r=>[+r[0],+r[1]]);
  if(E.setPoolCache) E.setPoolCache(new Map()); let n=0;
  // adım saat ızgarasına hizalı (kapanış saat başına düşsün: örneklem dışı dilimler saat başı)
  let i0=3500; while(i0<k.length&&(k[i0].t+M15)%(STEP*M15)) i0++;
  for(let i=i0;i<k.length-40;i+=STEP){ const m=new Date(k[i].t).toISOString().slice(0,7); if(!monthsOf[s].has(m)) continue;
    let inp,A,F; try{ inp=inputsAt(k,i,d1,btc,s); A=E.analyze(inp.f,inp.s); F=feats(k,i,d1,fund); }catch(e){ if(!n) console.error(s,e.message); continue; }
    const f4=(k[i+16].c-k[i].c)/F.atr;
    for(const dir of ['long','short']){ const sg=dir==='long'?1:-1; let c; try{ c=E.committee(A,dir,inp.c24,{sym:s,raw:true,lf:false,l24:false,now:k[i].t+M15,uye:!RULE}); }catch(e){ continue; }
      const pre=c.pre||c.agents; const plan=c.plan||{sd:c.feat.sd,rr2:c.feat.runR,holdH:null}; const sim=simBot(k,i,dir,plan,cfg);
      const x={}; for(const key in F){ if(key==='atr'||key==='dc') continue; x[key]=r4(SIGNED.includes(key)&&F[key]!=null?sg*F[key]:F[key]); }
      W.write(JSON.stringify({sym:s,t:k[i].t,dir,veto:c.veto?1:0,score:r4(c.score),yes:c.yes,sd:r4(plan.sd),a:Object.fromEntries(pre.map(z=>[z.id,[r4(+z.v),r4(+z.c),z.abst?1:0]])),
        uye:c.feat.uye||undefined,x,stage:c.feat.stage,kz:c.feat.kz?1:0,R:r4(sim.R),y:fcY(k,i,dir),f4:r4(sg*f4)})+'\n'); tot++; }
    n++; }
  console.log(s,n,'an',tot,'örnek',((Date.now()-t0)/1000).toFixed(0)+' sn');
}
W.end(()=>console.log('yazıldı',tot,'→',out));
