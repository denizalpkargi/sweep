// Test #99: Trend sepetinde BTC kapısı SMA50 (bugün) ↔ SMA200 ↔ sıçrama modeli ↔ rastgele. Canlı kod (src/trend.js), arşiv 1g.
// Kapı dışarıdan verilir: trendTargets puan ve oynaklığı hesaplar, ağırlık = puan × min(cap, tv/oynaklık) ÷ coin sayısı yalnız kapı açıkken.
// Sıçrama kapısı tests/test99-sicrama-kapisi.py → tests/data/arch/test99-kapi.csv. Rastgele: sıçrama kapısıyla aynı açık gün payı ve aynı
// yıllık yön değişimi sayısında iki durumlu Markov kapısı, 200 tekrar. Dönem 2021-01-01 (sıçrama kapısının ilk örneklem dışı günü) → arşiv sonu.
// Ek: kapının BTC'de tek başına 0/1 sonucu (1 gün gecikmesiz, gün başında kapı; geçişte %0,10).
// Geçme (önceden): sıçrama kapısı iki yarıda ve son 12 ayda SMA50'den yüksek Sharpe, tam dönemde düşüş daha kötü değil, rastgelelerin %95'inden iyi.
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js'); const E=loadEngine();
const SYMS=E.TREND_DEF.syms, DAY=864e5, A=path.join(__dirname,'data','arch');
const D={}; for(const s of SYMS) D[s]=fs.readFileSync(path.join(A,'1d',s+'.csv'),'utf8').trim().split('\n').map(l=>{ const a=l.split(',').map(Number); return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]}; });
const ix={}; for(const s of SYMS) ix[s]=new Map(D[s].map((b,i)=>[b.t,i]));
const K=fs.readFileSync(path.join(A,'test99-kapi.csv'),'utf8').trim().split('\n'); const kh=K[0].split(',');
const J={}; for(const h of kh.slice(1)) J[h]=new Map(); for(const l of K.slice(1)){ const a=l.split(','); for(let k=1;k<kh.length;k++) J[kh[k]].set(+a[0],+a[k]); }
const T0=Math.min(...J.j.keys()), T1=D.BTCUSDT[D.BTCUSDT.length-1].t+DAY, TM=Math.round((T0+T1)/2/DAY)*DAY, L12=T1-365*DAY;
function smaGate(n){ const b=D.BTCUSDT; const m=new Map(); for(let i=n;i<=b.length;i++){ let s=0; for(let k=i-n;k<i;k++) s+=b[k].c; const t=b[i-1].t+DAY; m.set(t,b[i-1].c>s/n?1:0); } return m; }
const days=[]; for(let t=T0;t<T1;t+=DAY) days.push(t);
function run(gate,from,to){ const s=E.trendNew({}); const rows=[];
  for(const t of days){ if(t<from||t>=to) continue; const data={}, px={}, close={};
    for(const k of SYMS){ const a=D[k]; let i=ix[k].get(t); if(i==null){ i=a.findIndex(b=>b.t>=t); if(i<0) i=a.length; } data[k]=a.slice(Math.max(0,i-130),i); if(a[i]&&a[i].t===t){ px[k]=a[i].o; close[k]=a[i].c; } }
    const e0=E.trendEq(s,px); E.trendMark(s,px,t,null); const tg=E.trendTargets(data,Object.assign({},s.cfg,{btcSma:1e9}));  // btcSma çok büyük → iç kapı hesaplanamaz, puan/oynaklık kalır
    const on=gate.get(t)?1:0; const act=SYMS.filter(k=>tg.w[k].score!=null).length;
    for(const k of SYMS){ const w=tg.w[k]; w.w=on&&w.score!=null?w.score*Math.min(s.cfg.cap,s.cfg.tv/w.vol)/act:0; }
    E.trendRebalance(s,tg,px,t); E.trendMark(s,close,t+DAY-1,null); const e=E.trendEq(s,close); rows.push({t,ret:e/e0-1}); }
  return rows; }
function st(rows){ let eq=1,pk=1,dd=0; for(const r of rows){ eq*=1+r.ret; pk=Math.max(pk,eq); dd=Math.min(dd,eq/pk-1); }
  const m=rows.reduce((a,r)=>a+r.ret,0)/rows.length, sd=Math.sqrt(rows.reduce((a,r)=>a+(r.ret-m)**2,0)/rows.length);
  return {cagr:(eq**(365/rows.length)-1)*100,dd:dd*100,sh:sd>0?m/sd*Math.sqrt(365):0}; }
function gstat(g){ let on=0,sw=0,p=null; for(const t of days){ const v=g.get(t)?1:0; on+=v; if(p!=null&&v!==p) sw++; p=v; } return {on:on/days.length,sw:sw/days.length*365}; }
// BTC 0/1: gün t başında kapı → gün t açılış→kapanış... sade tutmak için kapanıştan kapanışa (t−1 → t) getiri, kapı t başında
const bc=new Map(D.BTCUSDT.map(b=>[b.t,b.c]));
function btc01(g,from,to){ const rows=[]; let p=0; for(const t of days){ if(t<from||t>=to) continue; const c0=bc.get(t-DAY), c1=bc.get(t); const v=g.get(t)?1:0;
  rows.push({t,ret:(c0&&c1?v*(c1/c0-1):0)-0.001*Math.abs(v-p)}); p=v; } return rows; }
const G={'SMA50 (bugün)':smaGate(50),'SMA200':smaGate(200),'sıçrama (λ seçimli)':J.j};
for(const lam of ['10','30','100']) G[`sıçrama λ ${lam} (sabit, bilgi)`]=J['j'+lam];
const per=[['tümü',T0,T1],['1. yarı',T0,TM],['2. yarı',TM,T1],['son 12 ay',L12,T1]];
const f=(x,d=0)=>(x>=0?'+':'')+x.toFixed(d).replace('.',','); const L=[];
L.push('# Test #99: Trend sepetinde BTC rejim kapısı (SMA50, SMA200, sıçrama modeli, rastgele)\n',
 `Canlı kod (src/trend.js, tv ${String(E.TREND_DEF.tv).replace('.',',')}), BTC·ETH·SOL·BNB arşiv 1g, ${new Date(T0).toISOString().slice(0,10)} → ${new Date(T1-DAY).toISOString().slice(0,10)}, yarı ${new Date(TM).toISOString().slice(0,10)}. Yalnız kapı değişir; taker + kayma, fonlama yok (replay-trend.js gibi). Sıçrama modeli: \`tests/test99-sicrama-kapisi.py\` (örneklem dışı, 6 ayda bir yeniden kurulur, λ ayda bir geçmiş örneklem dışı Sharpe ile seçilir).\n`,
 '## Trend sepeti: yıllık % / en büyük düşüş % / Sharpe\n','| Kapı | açık gün | yılda yön değişimi | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|---|---|');
const R={};
for(const [nm,g] of Object.entries(G)){ const gs=gstat(g); R[nm]=per.map(([,a,b])=>st(run(g,a,b)));
  L.push(`| ${nm} | %${Math.round(gs.on*100)} | ${gs.sw.toFixed(1).replace('.',',')} | ${R[nm].map(x=>`${f(x.cagr)} / ${f(x.dd)} / ${x.sh.toFixed(2).replace('.',',')}`).join(' | ')} |`); console.log(nm); }
// rastgele Markov kapısı
const gj=gstat(J.j); const pOff=gj.sw/365/2/gj.on, pOn=gj.sw/365/2/(1-gj.on); let seed=99; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
const RS=per.map(()=>[]);
for(let k=0;k<200;k++){ const g=new Map(); let v=rnd()<gj.on?1:0; for(const t of days){ g.set(t,v); if(v&&rnd()<pOff) v=0; else if(!v&&rnd()<pOn) v=1; }
  per.forEach(([,a,b],i)=>RS[i].push(st(run(g,a,b)))); }
const q=(a,p)=>{ const s=[...a].sort((x,y)=>x-y); return s[Math.floor(p*(s.length-1))]; };
L.push(`| rastgele (200, aynı açık pay ve değişim) medyan | %${Math.round(gj.on*100)} | ${gj.sw.toFixed(1).replace('.',',')} | ${RS.map(a=>`${f(q(a.map(x=>x.cagr),0.5))} / ${f(q(a.map(x=>x.dd),0.5))} / ${q(a.map(x=>x.sh),0.5).toFixed(2).replace('.',',')}`).join(' | ')} |`);
L.push(`| rastgele %95 Sharpe | | | ${RS.map(a=>q(a.map(x=>x.sh),0.95).toFixed(2).replace('.',',')).join(' | ')} |`);
L.push('\n## Kapı BTC\'de tek başına (0/1, geçişte %0,10): yıllık % / düşüş % / Sharpe\n','| Kapı | tümü | 1. yarı | 2. yarı | son 12 ay |','|---|---|---|---|---|');
const al=new Map(days.map(t=>[t,1])); for(const [nm,g] of Object.entries(Object.assign({'al-tut':al},G))) L.push(`| ${nm} | ${per.map(([,a,b])=>{ const x=st(btc01(g,a,b)); return `${f(x.cagr)} / ${f(x.dd)} / ${x.sh.toFixed(2).replace('.',',')}`; }).join(' | ')} |`);
const j=R['sıçrama (λ seçimli)'], s50=R['SMA50 (bugün)'];
const ok=[1,2,3].every(i=>j[i].sh>s50[i].sh)&&j[0].dd>=s50[0].dd&&j[0].sh>q(RS[0].map(x=>x.sh),0.95);
L.push('',`Geçme (önceden): sıçrama kapısı iki yarıda ve son 12 ayda SMA50'den yüksek Sharpe, tam dönemde düşüş daha kötü değil ve rastgelelerin %95'inden iyi → **${ok?'evet':'hayır'}**.`);
fs.writeFileSync(path.join(__dirname,'test99-sicrama-kapisi-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
