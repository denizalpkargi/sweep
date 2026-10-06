// Faktör kütüphanesinin ölçümü (src/factors.js). Her coin, saatte bir, iki yönde: faktörün görüşü (v·c) ile
//   y = 4 saatte önce +1 ATR mi −1 ATR mi (tahmin defteri ölçüsü, rastgele ≈ %50)
//   R = botun planı (market giriş, stop max(%1,5; 1,2 ATR), 1,5R'de yarısı + stop girişe, 3R'de %60 + iz, 8 sa; komisyon + kayma)
// Zaman ortasından iki yarı. Faktör "aktif": iki yarıda da IC > 0 ve "evet" (v>0,3) isabeti tabanın üstünde; ağırlık 1 + 40·IC (0,5–2).
// Çalıştırma: node tests/research-factors.js [adım=4] [--lab tests/data/lab-rules.json]  → tests/factor-fit.json (FAC_FIT'e yazılacak tablo ekrana basılır)
// Veri: tests/data/*.json (fetch-history.js; Binance bulut IP'lerine 403 döner, kendi makinende indir).
const fs=require('fs'), path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData}=require('./bt-lib.js'); const {simBot,fcY}=require('./backtest-masa.js');
const E=loadEngine(); const M15=9e5; const argv=process.argv.slice(2); const li=argv.indexOf('--lab'); const step=+(argv.find((a,i)=>/^\d+$/.test(a)&&i!==li+1)||4);
// --lab <lab-rules.json>: Burak'ın adayları ve Selim'in hipotezleri (research-node.js --real ya da ekransız bot research/lab-rules.json yazar) aynı ölçüye girer
if(li>=0){ const R=JSON.parse(fs.readFileSync(argv[li+1],'utf8')); console.log('lider kuralları:',E.facSyncDyn(R.rules||[])); }
const all=loadData().filter(d=>d&&d.k15); const btcD=all.find(d=>d.sym==="BTCUSDT"); const btc=E.K(btcD.k15), btc1d=E.K(btcD.k1d);
const cfg=E.BOT_CFG_DEF; const S=[];
function agg(g){ return {t:g[0].t,o:g[0].o,h:Math.max(...g.map(x=>x.h)),l:Math.min(...g.map(x=>x.l)),c:g[g.length-1].c,v:g.reduce((a,x)=>a+x.v,0),q:g.reduce((a,x)=>a+x.q,0),tb:g.reduce((a,x)=>a+x.tb,0)}; }
for(const d of all){ const k=E.K(d.k15), d1=E.K(d.k1d); let bi=0;
  for(let i=3500;i<k.length-40;i+=step){ const now=k[i].t+M15; const day0=Math.floor(now/864e5-1e-9)*864e5;
    let j0=i; while(j0>0&&k[j0-1].t>=day0) j0--; const dd=d1.filter(x=>x.t<day0).slice(-149); dd.push(agg(k.slice(j0,i+1)));
    while(bi+1<btc.length&&btc[bi+1].t<=k[i].t) bi++; const b15=btc.slice(Math.max(0,bi-1499),bi+1);
    const x={k:k.slice(i-599,i+1),d:dd,btcD:btc1d.filter(z=>z.t<day0),btc:b15,now,px:k[i].c,fund:NaN,fundHist:[],oi5:null};
    const atrRel=E.atrAt(k,i+1,14)/k[i].c; const sd=Math.max(0.015,1.2*atrRel);
    for(const dir of ["long","short"]){ const R=E.facRead(x,dir); const f={}; for(const id in R) f[id]=+(R[id].v*R[id].c).toFixed(3);
      S.push({sym:d.sym,t:k[i].t,dir,f,y:fcY(k,i,dir),R:+simBot(k,i,dir,{sd,rr2:3,holdH:null},cfg).R.toFixed(3)}); } }
  process.stdout.write(d.sym+' '); }
console.log('\nörnek',S.length);
const T=S.map(x=>x.t).sort((a,b)=>a-b), MID=T[T.length>>1]; const H=[S.filter(x=>x.t<MID),S.filter(x=>x.t>=MID)];
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN;
const corr=(a,b)=>{ const n=a.length; if(n<3) return 0; const ma=mean(a), mb=mean(b); let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; } return saa&&sbb?sab/Math.sqrt(saa*sbb):0; };
const base=H.map(h=>({y:mean(h.map(x=>x.y)),R:mean(h.map(x=>x.R))}));
console.log('taban isabet',base.map(b=>b.y.toFixed(3)).join(' / '),'· taban R',base.map(b=>b.R.toFixed(3)).join(' / '));
const rows=[], fit={};
for(const F of E.FACTORS){ const r={id:F.id,ad:F.ad};
  for(let h=0;h<2;h++){ const xs=H[h].map(x=>x.f[F.id]||0); const n=h+1;
    r['ic'+n]=+corr(xs,H[h].map(x=>2*x.y-1)).toFixed(4);
    const on=H[h].filter(x=>x.f[F.id]!=null); r['kapsam'+n]=+(on.length/H[h].length).toFixed(3);
    const yes=H[h].filter(x=>(x.f[F.id]||0)>0.15); r['evet'+n]=yes.length; r['y'+n]=+mean(yes.map(x=>x.y)).toFixed(3); r['R'+n]=+mean(yes.map(x=>x.R)).toFixed(3); }
  const ok=r.ic1>0&&r.ic2>0&&r.y1>base[0].y&&r.y2>base[1].y&&r.evet1>=100&&r.evet2>=100;
  const ic=(r.ic1+r.ic2)/2; r.st=r.evet1+r.evet2===0?"izlemede":ok?"aktif":"izlemede"; r.w=ok?+Math.max(0.5,Math.min(F.rejim?1:2,1+40*ic)).toFixed(2):0; // rejim faktörü (BTC 200 gün) 6 ayda bir-iki kez yön değiştirir: kanıt tek rejim, ağırlık en çok 1
  if(r.evet1+r.evet2===0) r.not="geçmişte veri yok (canlı)"; rows.push(r);
  fit[F.id]={st:r.st,w:r.w,ic1:r.ic1,ic2:r.ic2,y1:r.y1,y2:r.y2,R1:r.R1,R2:r.R2,n:r.evet1+r.evet2};
}
console.table(rows);
fs.writeFileSync(path.join(__dirname,'factor-fit.json'),JSON.stringify({at:Date.now(),n:S.length,MID,base,fit},null,1));
console.log('FAC_FIT =',JSON.stringify(fit));
