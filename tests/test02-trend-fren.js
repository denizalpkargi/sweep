// Test listesi #2: Trend sepetinde düşüşte boy kısma ("her %10 düşüşte %20 küçült").
// Canlı kod (src/trend.js: trendTargets → trendRebalance → trendMark → trendTrade) arşivin günlük mumlarıyla oynatılır; src değişmez.
// Veri: tests/data/arch/1d/<SYM>.csv (Binance kline), fonlama tests/data/arch/funding/<SYM>.csv (8 saatte bir, gerçek oran),
//   08:00 ve 16:00 fonlama anındaki fiyat tests/data/arch/1h/<SYM>.csv açılışından.
// Gün akışı (replay-trend.js ile aynı): gün açılışında işaretle + fonlama → önceki günlere kadar kapanmış mumlarla hedef → açılış fiyatından dengeleme
//   (kayma + taker) → 08/16 fonlama → kapanışla işaretle. Hedef modu (200 $'da tv 0,8) burada yok: sabit tv.
// Fren varyantları (düşüş = 1 − özkaynak ÷ tüm zamanların zirvesi, dengeleme anında):
//   yok · mevcut basamak (brakeDD 0,1/0,2/0,3 → ×0,5, canlı kodun kendi alanı) ·
//   kademeli çarpımsal (her tam %10 düşüşte ×0,8: %10 → 0,8, %20 → 0,64 …) · kademeli doğrusal (her %10'da −0,2, taban 0,2).
// Kademeli frenler betikte hedef ağırlıkları çarparak uygulanır (canlı kodda yok).
// Dönem 2020-06-01 → arşivin son günü; iki yarı dönem ortasından, son 24 / 12 ay; hepsi tek koşunun özkaynak eğrisinden (fren durumu yol bağımlı).
// Kullanım: node tests/test02-trend-fren.js → tests/test02-trend-fren-report.md
const fs=require('fs'), path=require('path'); const {loadEngine}=require('./engine-node.js');
const ARCH=path.join(__dirname,'data','arch'); const DAY=864e5, H8=8*3600e3;
const E=loadEngine(); const SYMS=E.TREND_DEF.syms;
const D={}, IDX={}, H1={}, FR={};
for(const s of SYMS){
  D[s]=fs.readFileSync(path.join(ARCH,'1d',s+'.csv'),'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0);
  IDX[s]=new Map(D[s].map((b,i)=>[b.t,i]));
  H1[s]=new Map(); for(const l of fs.readFileSync(path.join(ARCH,'1h',s+'.csv'),'utf8').split('\n')){ if(!l) continue; const a=l.split(','); H1[s].set(+a[0],+a[1]); }
  FR[s]=new Map(); for(const l of fs.readFileSync(path.join(ARCH,'funding',s+'.csv'),'utf8').split('\n')){ if(!l) continue; const [t,r]=l.split(','); FR[s].set(Math.round(+t/3600e3)*3600e3,+r); }
}
const T0=Date.UTC(2020,5,1); const T1=Math.min(...SYMS.map(s=>D[s][D[s].length-1].t))+DAY; // son tam günün sonu
const TM=T0+Math.floor((T1-T0)/2/DAY)*DAY, L24=T1-730*DAY, L12=T1-365*DAY;
const frAt=t=>{ const o={}; for(const s of SYMS){ const r=FR[s].get(t); if(r!=null&&isFinite(r)) o[s]=r; } return o; };
// günlük ATR (basit, n gün), i günü dahil
const atrAt=(a,i,n)=>{ if(i<n) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=Math.max(a[k].h-a[k].l,Math.abs(a[k].h-a[k-1].c),Math.abs(a[k].l-a[k-1].c)); return s/n; };

// opts: {tv, cap, brake:{type:'none'|'step'|'mul'|'lin', dd, mult}, trail:{k, n, mode:'gun'|'kapanis', re:'sifir'|'zirve'}}
function runTrend(opts){
  const cfg={tv:opts.tv,cap:opts.cap!=null?opts.cap:opts.tv*5,band:0.2};
  const br=opts.brake||{type:'none'}; if(br.type==='step'){ cfg.brakeDD=br.dd; cfg.brakeMult=br.mult; }
  const s=E.trendNew(cfg); const eq=[]; const tr=opts.trail; const TS={}, LOCK={}, PEND={}; let stops=0, brakeDays=0, sumMult=0;
  const trailLog=[];
  for(let t=T0;t<T1;t+=DAY){
    const px={}, close={}, bar={}; for(const k of SYMS){ const i=IDX[k].get(t); if(i!=null){ bar[k]=D[k][i]; px[k]=bar[k].o; close[k]=bar[k].c; } }
    E.trendMark(s,px,t,frAt(t));
    // iz stop: dün kapanışta tetiklenen çıkış bugün açılışta
    if(tr) for(const k in PEND){ if(s.pos[k]&&px[k]>0){ const p=s.pos[k]; const ev=E.trendTrade(s,k,0,px[k],t,'iz stop (kapanış)'); trailLog.push({k,t,r:ev?ev.pnl/(Math.abs(ev.qty)*p.avg):0}); stops++; } delete PEND[k]; delete TS[k]; }
    const data={}; for(const k of SYMS){ const i=IDX[k].has(t)?IDX[k].get(t):(()=>{ let j=D[k].findIndex(b=>b.t>=t); return j<0?D[k].length:j; })(); data[k]=D[k].slice(Math.max(0,i-130),i); }
    const tg=E.trendTargets(data,s.cfg); const w={}; for(const k in tg.w) w[k]=Object.assign({},tg.w[k]);
    if(tr) for(const k of SYMS){ if(LOCK[k]){ const raw=w[k]?w[k].w:0;
        if(tr.re==='sifir'&&!(raw>0)) delete LOCK[k];                                   // sinyal sıfırlandı: sonraki pozitif sinyal yeni giriş
        else if(tr.re==='zirve'&&data[k].length&&data[k][data[k].length-1].c>LOCK[k].hc) delete LOCK[k]; // stop öncesi en yüksek kapanış aşıldı
        if(LOCK[k]&&w[k]) w[k].w=0; } }
    let m=1; if(br.type==='mul'||br.type==='lin'){ const e=E.trendEq(s,px); const dd=s.peak>0?Math.max(0,1-e/s.peak):0; const st=Math.floor(dd/0.1+1e-9);
      m=br.type==='mul'?Math.pow(0.8,st):Math.max(0.2,1-0.2*st); for(const k in w) w[k].w*=m; }
    else if(br.type==='step'){ const e=E.trendEq(s,px); const dd=s.peak>0?1-e/s.peak:0; if(dd>=br.dd) m=br.mult; }
    if(m<1) brakeDays++; sumMult+=m;
    E.trendRebalance(s,{w,btcOk:tg.btcOk,btc:tg.btc},px,t);
    if(tr) for(const k of SYMS){ const p=s.pos[k]; if(!p){ delete TS[k]; continue; } const b=bar[k]; if(!b) continue; const i=IDX[k].get(t);
      if(!TS[k]){ const a=atrAt(D[k],i-1,tr.n); TS[k]={stop:b.o-tr.k*a,hc:b.o}; }
      if(tr.mode==='gun'&&b.l<=TS[k].stop){ const x=Math.min(b.o,TS[k].stop); const pq=p; const ev=E.trendTrade(s,k,0,x,t+DAY/2,'iz stop'); trailLog.push({k,t,r:ev?ev.pnl/(Math.abs(ev.qty)*pq.avg):0}); stops++; LOCK[k]={hc:TS[k].hc,t}; delete TS[k]; } }
    for(const h of [H8,2*H8]){ const p2={}; for(const k of SYMS){ const o=H1[k].get(t+h); p2[k]=o>0?o:px[k]; } E.trendMark(s,p2,t+h,frAt(t+h)); }
    E.trendMark(s,close,t+DAY-1,null);
    if(tr) for(const k of SYMS){ if(!s.pos[k]||!TS[k]||!bar[k]) continue; const i=IDX[k].get(t); const a=atrAt(D[k],i,tr.n); const c=bar[k].c;
      TS[k].hc=Math.max(TS[k].hc,c); if(isFinite(a)) TS[k].stop=Math.max(TS[k].stop,c-tr.k*a);
      if(tr.mode==='kapanis'&&c<=TS[k].stop){ PEND[k]=1; LOCK[k]={hc:TS[k].hc,t}; } }
    eq.push([t,E.trendEq(s,close)]);
  }
  return {eq,s,stops,brakeDays,avgMult:sumMult/eq.length,trailLog};
}
// pencere ölçüleri: [a,b) aralığında, a'dan önceki kapanış başlangıç
function stats(eq,a,b,start){
  let e0=start, pts=[]; for(const [t,e] of eq){ if(t<a) e0=e; else if(t<b) pts.push(e); }
  if(!pts.length) return null; let pk=e0, dd=0, prev=e0; const r=[];
  for(const e of pts){ pk=Math.max(pk,e); dd=Math.min(dd,e/pk-1); r.push(e/prev-1); prev=e; }
  const n=r.length, m=r.reduce((x,y)=>x+y,0)/n, sd=Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/(n-1));
  const end=pts[pts.length-1]; return {cagr:(end/e0)**(365/n)-1,dd,sharpe:sd>0?m/sd*Math.sqrt(365):0,ret:end/e0-1};
}
function years(eq,start){ const y={}; let prev=start; for(const [t,e] of eq){ const k=new Date(t).getUTCFullYear(); if(!(k in y)) y[k]={a:prev}; y[k].b=e; prev=e; } const o={}; for(const k in y) o[k]=y[k].b/y[k].a-1; return o; }
const WIN=[['Tüm dönem',T0,T1],['1. yarı',T0,TM],['2. yarı',TM,T1],['Son 24 ay',L24,T1],['Son 12 ay',L12,T1]];
function summarize(r){ const out={}; for(const [n,a,b] of WIN) out[n]=stats(r.eq,a,b,r.s.start); out.yr=years(r.eq,r.s.start); out.end=r.eq[r.eq.length-1][1]; out.trades=r.s.trades; out.fees=r.s.fees; out.funding=r.s.funding; out.stops=r.stops; out.brakeDays=r.brakeDays; out.avgMult=r.avgMult; return out; }
const pc=(x,d=0)=>x==null||!isFinite(x)?'–':(x>=0?'+':'−')+'%'+Math.abs(x*100).toFixed(d).replace('.',',');
const nf=(x,d=2)=>x==null||!isFinite(x)?'–':(x<0?'−':'')+Math.abs(x).toFixed(d).replace('.',',');
const dstr=t=>new Date(t).toISOString().slice(0,10);
function tables(rows){ // rows: [{name, S}]
  let md='| Varyant | Yıllık | Düşüş | Sharpe | 1. yarı yıllık / düşüş | 2. yarı yıllık / düşüş | Son 24 ay yıllık / düşüş | Son 12 ay getiri / düşüş |\n|---|---|---|---|---|---|---|---|\n';
  for(const {name,S} of rows){ const A=S['Tüm dönem'], h1=S['1. yarı'], h2=S['2. yarı'], l24=S['Son 24 ay'], l12=S['Son 12 ay'];
    md+=`| ${name} | ${pc(A.cagr)} | ${pc(A.dd)} | ${nf(A.sharpe)} | ${pc(h1.cagr)} / ${pc(h1.dd)} | ${pc(h2.cagr)} / ${pc(h2.dd)} | ${pc(l24.cagr)} / ${pc(l24.dd)} | ${pc(l12.ret)} / ${pc(l12.dd)} |\n`; }
  const ys=Object.keys(rows[0].S.yr); md+='\n| Varyant | '+ys.join(' | ')+' |\n|---|'+ys.map(()=>'---').join('|')+'|\n';
  for(const {name,S} of rows) md+=`| ${name} | `+ys.map(y=>pc(S.yr[y])).join(' | ')+' |\n';
  return md; }
module.exports={runTrend,summarize,tables,stats,years,pc,nf,dstr,WIN,T0,T1,TM,L24,L12,SYMS,E,D,IDX,H1,FR,frAt};

if(require.main===module){
  const BR=[['fren yok',{type:'none'}],['basamak %10 → ×0,5',{type:'step',dd:0.1,mult:0.5}],['basamak %20 → ×0,5',{type:'step',dd:0.2,mult:0.5}],['basamak %30 → ×0,5',{type:'step',dd:0.3,mult:0.5}],
    ['kademeli ×0,8 / %10',{type:'mul'}],['kademeli −0,2 / %10 (taban 0,2)',{type:'lin'}]];
  let md=`# Test #2 · Trend sepetinde düşüşte boy kısma\n\nBetik \`tests/test02-trend-fren.js\` (canlı \`src/trend.js\` fonksiyonları, arşiv 1g mumları + gerçek fonlama). Dönem ${dstr(T0)} → ${dstr(T1-DAY)}; 1. yarı ${dstr(T0)} → ${dstr(TM)}, 2. yarı ${dstr(TM)} → ${dstr(T1-DAY)}. Hedef modu kapalı (sabit tv), bant %20, taker %0,05 + kayma %0,03.\n\n`;
  const all={};
  for(const tv of [1.4,0.8]){ const rows=[];
    const list=BR.slice(); const Sm=summarize(runTrend({tv,brake:{type:'mul'}})); const tvEq=+(tv*Sm.avgMult).toFixed(2);
    list.push([`fren yok, tv ${String(tvEq).replace('.',',')} (kademeli ×0,8 ile aynı ort. boy)`,{type:'none'},tvEq]);
    for(const [n,b,tvx] of list){ const S=summarize(runTrend({tv:tvx||tv,cap:(tvx||tv)*5,brake:b})); rows.push({name:n,S}); all[`tv${tv} ${n}`]=S;
      console.log(`tv ${tv} ${n.padEnd(34)}`,['Tüm dönem','1. yarı','2. yarı','Son 24 ay','Son 12 ay'].map(w=>`${w}: ${pc(S[w].cagr)} ${pc(S[w].dd)} sh ${nf(S[w].sharpe)}`).join(' | '),`frenli gün ${S.brakeDays} ort. çarpan ${nf(S.avgMult)}`); }
    md+=`## tv ${String(tv).replace('.',',')} (üst sınır ${String(tv*5).replace('.',',')})\n\n`+tables(rows)+'\n\n| Varyant | Frenli gün | Ort. çarpan | İşlem | Komisyon $ | Fonlama $ | Son özkaynak $ |\n|---|---|---|---|---|---|---|\n'+
      rows.map(({name,S})=>`| ${name} | ${S.brakeDays} | ${nf(S.avgMult)} | ${S.trades} | ${nf(S.fees,0)} | ${nf(S.funding,0)} | ${nf(S.end,0)} |`).join('\n')+'\n\n'; }
  fs.writeFileSync(path.join(__dirname,'test02-trend-fren-report.md'),md);
  console.log('yazıldı tests/test02-trend-fren-report.md');
}
