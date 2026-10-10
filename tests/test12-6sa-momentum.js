// Test listesi #12: 6 sa momentum + 2,5 ATR iz süren stop, sabit parametre (AdaptiveTrend, arXiv 2602.11708'in sabit parametreli sürümü).
// Veri: tests/data/arch/1h/<SYM>.csv → 6 saatlik mumlar (00/06/12/18 UTC; 6 saatin en az 5'i geçerli olmalı, hacmi 0 olan saat ölü veri),
//   evren tests/data/arch/universe.json months[YYYY-MM] ilk TOP coin (önceki 30 günün hacmine göre, TradFi hariç, delist dahil),
//   fonlama tests/data/arch/funding (8 saatte bir; yoksa %0,01).
// Kural (sinyal 6 sa kapanışında, coin o ay evrendeyken):
//   long: kapanış > N mum önceki kapanış ve pozisyon yok → sonraki 6 sa mumun ilk saatinin VWAP'ında (q/v, [düşük, yüksek] içine sınırlı) gir.
//   short (ayrı): kapanış < N mum önceki kapanış.
//   Çıkış yalnız iz süren stop: başlangıç giriş ∓ 2,5 × ATR(14, 6 sa); her 6 sa kapanışında stop = max(stop, kapanış − 2,5 × ATR) (short tersi).
//   Stop 1 sa mumlarla izlenir (giriş saatinden sonraki saatten itibaren): düşük ≤ stop → min(açılış, stop) ile çık. Veri biterse son kapanışta çık.
//   Stoptan sonra aynı coinde yeniden giriş için sinyalin bir kez kapanması gerekir.
// Maliyet: taraf başına taker %0,05 + kayma %0,03; fonlama gerçek oran, long öder / short alır. Getiri basit (fiyat oranı) + fonlama.
// Portföy: TOP yuva, yuva başına girişteki özkaynağın 1/TOP'u (bacak başına brüt ≤ 1x), yuva doluysa sinyal atlanır; günlük kapanışla değerlenir.
//   long+short birlikte: her bacak 1/(2·TOP).
// Parametreler sabit: N 8 (ana), 4 / 12 duyarlılık; TOP 24 (ana), 30 duyarlılık; k 2,5, ATR 14 (kaynaktaki değerler, veriye bakılarak seçilmedi).
// Kıyas: Trend sepeti (tests/test02-trend-fren.js, canlı src/trend.js, tv 1,4 ve 0,8) aynı pencerelerde.
// Kullanım: node tests/test12-6sa-momentum.js → tests/test12-6sa-momentum-report.md
const fs=require('fs'), path=require('path');
const ARCH=path.join(__dirname,'data','arch'); const H=3600e3, B6=6*H, DAY=864e5;
const SIDE_FEE=0.0005, SLIP=0.0003, FDEF=0.0001, K_ATR=2.5, N_ATR=14;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const mon=t=>new Date(t).toISOString().slice(0,7);
const T0=Date.UTC(2020,5,1);
const TOPS=[24,30];
const SYMS=[...new Set(Object.entries(U).filter(([m])=>m>='2020-06').flatMap(([,v])=>v.slice(0,Math.max(...TOPS))))].sort();
const inU={}; for(const top of TOPS){ inU[top]={}; for(const m in U) inU[top][m]=new Set(U[m].slice(0,top)); }
// 1 sa veri: yoğun dizi (saat ızgarası), geçersiz saat NaN
const CO={}; let TEND=0;
for(const s of SYMS){ const f=path.join(ARCH,'1h',s+'.csv'); if(!fs.existsSync(f)) continue;
  const L=fs.readFileSync(f,'utf8').split('\n').filter(Boolean); if(L.length<200) continue;
  const t0=+L[0].split(',')[0], t1=+L[L.length-1].split(',')[0]; const n=Math.round((t1-t0)/H)+1;
  const o=new Float64Array(n).fill(NaN), h=new Float64Array(n).fill(NaN), l=new Float64Array(n).fill(NaN), c=new Float64Array(n).fill(NaN), vw=new Float64Array(n).fill(NaN);
  for(const ln of L){ const a=ln.split(','); const i=Math.round((+a[0]-t0)/H); const v=+a[5], q=+a[7]; if(!(v>0)||!(q>0)) continue;
    o[i]=+a[1]; h[i]=+a[2]; l[i]=+a[3]; c[i]=+a[4]; let w=q/v; if(!(w>=l[i]&&w<=h[i])) w=c[i]; vw[i]=w; }
  const fr=new Map(); const ff=path.join(ARCH,'funding',s+'.csv');
  if(fs.existsSync(ff)) for(const ln of fs.readFileSync(ff,'utf8').split('\n')){ if(!ln) continue; const [t,r]=ln.split(','); if(isFinite(+r)) fr.set(Math.round(+t/H)*H,+r); }
  CO[s]={t0,n,o,h,l,c,vw,fr}; TEND=Math.max(TEND,t1+H); }
const T1=Math.floor(TEND/DAY)*DAY; // son tam gün sonu
console.log('coin',Object.keys(CO).length,'dönem',new Date(T0).toISOString().slice(0,10),'→',new Date(T1-DAY).toISOString().slice(0,10));
const hi=(C,t)=>Math.round((t-C.t0)/H);
// 6 sa mumlar
function bars6(C){ const out=[]; const b0=Math.ceil(C.t0/B6)*B6;
  for(let T=b0;T+B6<=C.t0+C.n*H;T+=B6){ const i0=hi(C,T); let o=NaN,h=-Infinity,l=Infinity,c=NaN,k=0;
    for(let i=i0;i<i0+6;i++){ if(!(C.o[i]>0)) continue; if(!(o>0)) o=C.o[i]; h=Math.max(h,C.h[i]); l=Math.min(l,C.l[i]); c=C.c[i]; k++; }
    if(k>=5) out.push({t:T,o,h,l,c}); }
  return out; }
for(const s in CO) CO[s].b=bars6(CO[s]);
// bir coinde işlemler (side 1 long, −1 short)
function coinTrades(s,N,side,top){
  const C=CO[s], b=C.b; const tr=[]; const atr=new Float64Array(b.length).fill(NaN);
  let sum=0; const TR=i=>Math.max(b[i].h-b[i].l,Math.abs(b[i].h-b[i-1].c),Math.abs(b[i].l-b[i-1].c));
  for(let i=1;i<b.length;i++){ sum+=TR(i); if(i>N_ATR) sum-=TR(i-N_ATR); if(i>=N_ATR) atr[i]=sum/N_ATR; }
  let pos=null, blocked=false;
  for(let k=0;k<b.length;k++){ const bar=b[k];
    if(pos){ // saat saat stop
      const i0=hi(C,bar.t);
      for(let i=i0;i<i0+6&&pos;i++){ const ti=C.t0+i*H; if(ti<=pos.t0h||!(C.o[i]>0)) continue;
        if(side>0?C.l[i]<=pos.stop:C.h[i]>=pos.stop){ const px=side>0?Math.min(C.o[i],pos.stop):Math.max(C.o[i],pos.stop); close(pos,px,ti+H/2,'stop'); pos=null; blocked=true; } } }
    const sig=k>=N&&(side>0?bar.c>b[k-N].c:bar.c<b[k-N].c);
    if(pos){ const a=atr[k]; if(isFinite(a)){ const ns=bar.c-side*K_ATR*a; pos.stop=side>0?Math.max(pos.stop,ns):Math.min(pos.stop,ns); } }
    if(blocked&&!sig) blocked=false;
    const tEnd=bar.t+B6;
    if(!pos&&!blocked&&sig&&isFinite(atr[k])&&inU[top][mon(tEnd)]&&inU[top][mon(tEnd)].has(s)&&tEnd>=T0&&tEnd<T1){
      // giriş: sonraki mumun ilk geçerli saati (6 saat içinde) VWAP
      let i=hi(C,tEnd), e=null; for(let j=0;j<6;j++){ if(C.vw[i+j]>0){ e=i+j; break; } }
      if(e!=null){ const px=C.vw[e]; const fill=px*(1+side*SLIP); pos={sym:s,side,t0:C.t0+e*H+H/2,t0h:C.t0+e*H,ep:fill,raw:px,stop:px-side*K_ATR*atr[k],risk:K_ATR*atr[k]/px}; } }
  }
  if(pos){ let i=C.n-1; while(i>0&&!(C.c[i]>0)) i--; close(pos,C.c[i],C.t0+i*H+H,'veri sonu'); }
  return tr;
  function close(p,px,t,why){ const xf=px*(1-side*SLIP); const qty=1/p.ep; // 1 $ nominal başına
    let fund=0; for(let ft=Math.ceil(p.t0/(8*H))*8*H;ft<=t;ft+=8*H){ const r=C.fr.has(ft)?C.fr.get(ft):FDEF; const ii=hi(C,ft); const sp=C.o[ii]>0?C.o[ii]:p.ep; fund+=qty*sp*r; }
    const gross=side*(px-p.raw)/p.raw; const ret=side*(xf-p.ep)/p.ep-SIDE_FEE-SIDE_FEE*xf/p.ep-side*fund;
    tr.push({sym:s,side,t0:p.t0,t1:t,ep:p.ep,xp:xf,ret,gross,fund:side*fund,r:ret/p.risk,why,days:(t-p.t0)/DAY}); }
}
// günlük kapanış fiyatı (son geçerli saat)
function pxAt(s,t){ const C=CO[s]; let i=Math.min(C.n-1,hi(C,t)-1); for(let k=0;k<24&&i>=0;k++,i--) if(C.c[i]>0) return C.c[i]; return NaN; }
function portfolio(trades,slots,frac){
  const ev=[]; trades.forEach((x,id)=>{ if(x.t0>=T0&&x.t0<T1){ ev.push([x.t0,1,id]); ev.push([x.t1,0,id]); } }); ev.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  let cash=1, lastEq=1, ei=0; const open=new Map(); const eq=[]; const taken=[]; let skipped=0;
  for(let d=T0;d<T1;d+=DAY){ const de=d+DAY;
    while(ei<ev.length&&ev[ei][0]<de){ const [t,typ,id]=ev[ei++]; const x=trades[id];
      if(typ===1){ if(open.size>=slots){ skipped++; continue; } const nom=lastEq*frac; open.set(id,nom); taken.push(x); }
      else if(open.has(id)){ cash+=open.get(id)*x.ret; open.delete(id); } }
    let u=0; for(const [id,nom] of open){ const x=trades[id]; const p=pxAt(x.sym,de); if(p>0) u+=nom*(x.side*(p-x.ep)/x.ep); }
    lastEq=cash+u; eq.push([d,lastEq]); }
  return {eq,taken,skipped};
}
const {runTrend,stats,years,pc,nf,dstr}=require('./test02-trend-fren.js');
const TM=T0+Math.floor((T1-T0)/2/DAY)*DAY, L24=T1-730*DAY, L12=T1-365*DAY;
const W=[['Tüm dönem',T0,T1],['1. yarı',T0,TM],['2. yarı',TM,T1],['Son 24 ay',L24,T1],['Son 12 ay',L12,T1]];
const tstat=a=>{ const n=a.length; if(!n) return {n:0}; const m=a.reduce((x,y)=>x+y,0)/n; const sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/Math.max(1,n-1)); return {n,m,t:sd>0?m/sd*Math.sqrt(n):0,wr:a.filter(v=>v>0).length/n}; };
const runs=[]; const yAll={};
const CFG=[[8,24],[4,24],[12,24],[8,30]];
for(const [N,top] of CFG){
  const legs={}; for(const side of [1,-1]){ let tr=[]; for(const s in CO) tr=tr.concat(coinTrades(s,N,side,top)); tr.sort((a,b)=>a.t0-b.t0); legs[side]=tr; }
  for(const [name,trades,slots,frac] of [['long',legs[1],top,1/top],['short',legs[-1],top,1/top],['long+short',[...legs[1],...legs[-1]].sort((a,b)=>a.t0-b.t0),2*top,1/(2*top)]]){
    const P=portfolio(trades,slots,frac); const T=P.taken; const S={}, Q={};
    for(const [w,a,b] of W){ const sub=T.filter(x=>x.t0>=a&&x.t0<b); S[w]={ret:tstat(sub.map(x=>x.ret)),r:tstat(sub.map(x=>x.r)),gross:tstat(sub.map(x=>x.gross)),fund:tstat(sub.map(x=>x.fund))}; Q[w]=stats(P.eq,a,b,1); }
    const yr={}; for(const x of T){ const y=new Date(x.t0).getUTCFullYear(); (yr[y]=yr[y]||[]).push(x.ret); }
    const row={N,top,name,S,Q,yrT:Object.fromEntries(Object.entries(yr).map(([y,a])=>[y,tstat(a)])),yrE:years(P.eq,1),skipped:P.skipped,days:T.reduce((a,x)=>a+x.days,0)/T.length};
    runs.push(row);
    console.log(`N${N} top${top} ${name.padEnd(10)}`,W.map(([w])=>`${w}: n${S[w].ret.n} ${pc(S[w].ret.m,2)} ${nf(S[w].r.m)}R t${nf(S[w].ret.t,1)} | ${pc(Q[w].cagr)} ${pc(Q[w].dd)} sh${nf(Q[w].sharpe)}`).join(' ‖ '),'atlanan',P.skipped,'gün',nf(row.days,1)); }
}
// Trend sepeti kıyası (aynı pencereler)
const trendRows=[]; for(const tv of [1.4,0.8]){ const r=runTrend({tv}); const Q={}; for(const [w,a,b] of W) Q[w]=stats(r.eq,a,b,r.s.start); trendRows.push({name:`Trend sepeti tv ${String(tv).replace('.',',')}`,Q,yrE:years(r.eq,r.s.start)}); }
// rapor
let md=`# Test #12 · 6 sa momentum + 2,5 ATR iz süren stop (sabit parametre)\n\nBetik \`tests/test12-6sa-momentum.js\`. Dönem ${dstr(T0)} → ${dstr(T1-DAY)}; 1. yarı → ${dstr(TM)}; son 24 ay ${dstr(L24)} →; son 12 ay ${dstr(L12)} →. Evren her ay hacimce ilk TOP (delist dahil, TradFi hariç), ${Object.keys(CO).length} coin. Giriş sinyalden sonraki 6 sa mumun ilk saatinin VWAP'ı; stop 1 sa mumlarla; taraf başına %0,08; gerçek fonlama; basit getiri. Portföy: yuva başına özkaynağın 1/TOP'u (bacak brüt ≤ 1x). N, TOP, k, ATR sabit (veriye bakılarak seçilmedi).\n\n`;
md+='## İşlem başına (net, giriş tarihine göre)\n\n| Kurulum | '+W.map(w=>w[0]+' n / ort. / R / t').join(' | ')+' | Kazanma (tüm) | Ort. gün |\n|---|'+W.map(()=>'---').join('|')+'|---|---|\n';
for(const r of runs) md+=`| N${r.N} ilk${r.top} ${r.name} | `+W.map(([w])=>`${r.S[w].ret.n} / ${pc(r.S[w].ret.m,2)} / ${nf(r.S[w].r.m)} / ${nf(r.S[w].ret.t,1)}`).join(' | ')+` | ${pc(r.S['Tüm dönem'].ret.wr)} | ${nf(r.days,1)} |\n`;
md+='\nBrüt (maliyet ve fonlama öncesi) ve fonlama, işlem başı, tüm dönem:\n\n| Kurulum | Brüt | Fonlama | Maliyet | Net |\n|---|---|---|---|---|\n';
for(const r of runs){ const A=r.S['Tüm dönem']; md+=`| N${r.N} ilk${r.top} ${r.name} | ${pc(A.gross.m,2)} | ${pc(-A.fund.m,2)} | −%0,16 | ${pc(A.ret.m,2)} |\n`; }
md+='\n## Özkaynak (bacak brüt ≤ 1x)\n\n| Kurulum | Yıllık | Düşüş | Sharpe | 1. yarı yıllık / düşüş / Sharpe | 2. yarı | Son 24 ay | Son 12 ay getiri / düşüş / Sharpe |\n|---|---|---|---|---|---|---|---|\n';
const qrow=(name,Q)=>`| ${name} | ${pc(Q['Tüm dönem'].cagr)} | ${pc(Q['Tüm dönem'].dd)} | ${nf(Q['Tüm dönem'].sharpe)} | `+['1. yarı','2. yarı','Son 24 ay'].map(w=>`${pc(Q[w].cagr)} / ${pc(Q[w].dd)} / ${nf(Q[w].sharpe)}`).join(' | ')+` | ${pc(Q['Son 12 ay'].ret)} / ${pc(Q['Son 12 ay'].dd)} / ${nf(Q['Son 12 ay'].sharpe)} |\n`;
for(const r of runs) md+=qrow(`N${r.N} ilk${r.top} ${r.name}`,r.Q);
for(const r of trendRows) md+=qrow(r.name,r.Q);
const ys=Object.keys(trendRows[0].yrE);
md+='\n## Yıl yıl özkaynak getirisi\n\n| Kurulum | '+ys.join(' | ')+' |\n|---|'+ys.map(()=>'---').join('|')+'|\n';
for(const r of runs) md+=`| N${r.N} ilk${r.top} ${r.name} | `+ys.map(y=>pc(r.yrE[y])).join(' | ')+' |\n';
for(const r of trendRows) md+=`| ${r.name} | `+ys.map(y=>pc(r.yrE[y])).join(' | ')+' |\n';
md+='\n## Yıl yıl işlem başı net ortalama (n)\n\n| Kurulum | '+ys.join(' | ')+' |\n|---|'+ys.map(()=>'---').join('|')+'|\n';
for(const r of runs) md+=`| N${r.N} ilk${r.top} ${r.name} | `+ys.map(y=>r.yrT[y]?`${pc(r.yrT[y].m,2)} (${r.yrT[y].n})`:'–').join(' | ')+' |\n';
md+='\nAtlanan sinyal (yuva dolu): '+runs.map(r=>`N${r.N} ilk${r.top} ${r.name} ${r.skipped}`).join(', ')+'\n';
fs.writeFileSync(path.join(__dirname,'test12-6sa-momentum-report.md'),md);
console.log('yazıldı tests/test12-6sa-momentum-report.md');
