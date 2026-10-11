// Test #52 birleşik (11 Ekim 2026, kullanıcı "a" dedi): Kaplumbağa sepeti (canlı kod, src/turtle.js) + kalite süzgeçli masa short sepeti (72 sa) birlikte.
// Kaplumbağa: turtle-test.js --replay ile aynı döngü (2020-06'dan, ilk 50, gün sonu değerlemesi ttEq). Short sepeti: test52-ozan-kalite-72sa.js işlemleri
// (_t52-trades.json), 100 $'dan bileşik, risk r × gerçekleşmiş bakiye, aynı anda en çok N, nominal ≤ 3 × bakiye; gün sonu açık shortlar o günün kapanışıyla
// değerlenir (anlık zarar dahil). Birleşim günlük getirilerden: 50/50 (her gün dengelenir) ve "ikisi tam" (iki sepet aynı bakiyeyi tam kullanır, getiriler toplanır).
// Dönem 2022-01 → (short tahminlerinin başladığı yer). Kullanım: node tests/test52-birlesik.js → tests/test52-birlesik-report.md
const fs=require('fs'), path=require('path');
const {loadEngine}=require('./engine-node.js'); const L=require('./test40-lib.js'); const {M15,DAY,fx}=L;
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const ARCH=L.ARCH, T22=Date.UTC(2022,0,1);
const d1={}; const day1=sym=>{ if(d1[sym]!==undefined) return d1[sym]; const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) return d1[sym]=null;
  const m=new Map(); for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; const a=l.split(','); m.set(+a[0],+a[4]); } return d1[sym]=m; };
// --- Kaplumbağa: günlük özkaynak (gün t'nin kapanışında, anahtar t+DAY)
function turtleCurve(){
  const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months; const TOP=50;
  const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)))];
  const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
  const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
  const s=E.ttNew({fee:0.0005,slip:0.0003}); const t0=Date.UTC(2020,5,1), t1=D.BTCUSDT[D.BTCUSDT.length-1].t; const cv=new Map();
  for(let t=t0;t<t1;t+=DAY){
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
    const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
    const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
    for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
    E.ttClose(s,data,univ,px,t+DAY);
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
    cv.set(t+DAY,E.ttEq(s,null));
  }
  return cv;
}
// --- short sepeti: günlük özkaynak (anlık değerleme)
function shortCurve(tr,r,N,LEV=3){
  const ev=tr.map(x=>({...x,t0:x.t+M15})).sort((a,b)=>a.t0-b.t0); if(!ev.length) return new Map();
  let cash=100; const open=[]; const cv=new Map(); let ei=0; const dStart=Math.floor(ev[0].t0/DAY)*DAY, dEnd=Math.max(...ev.map(x=>x.endT));
  const closeUpTo=T=>{ open.sort((a,b)=>a.endT-b.endT); while(open.length&&open[0].endT<=T){ const o=open.shift(); cash+=o.risk*o.R; } };
  for(let D0=dStart; D0<=dEnd+DAY; D0+=DAY){ const D1=D0+DAY;
    while(ei<ev.length&&ev[ei].t0<D1){ const x=ev[ei++]; closeUpTo(x.t0); if(cash<=1||open.length>=N) continue; const risk=r*cash, notl=risk/(2*x.sd); if(open.reduce((p,o)=>p+o.notl,0)+notl>LEV*cash) continue; open.push({...x,risk,notl}); }
    closeUpTo(D1);
    let u=0; for(const o of open){ const m=day1(o.sym); const c=m&&m.get(D0); if(c>0&&o.e>0) u+=(o.notl/o.e)*(o.e-c); } // short: giriş − kapanış (maliyet ve fonlama kapanışta R'de)
    cv.set(D1,cash+u);
  }
  return cv;
}
// --- ölçüler
const rets=(cv,keys)=>{ const out=[]; let prev=null; for(const k of keys){ const v=cv.get(k); if(v==null){ out.push(0); continue; } out.push(prev!=null&&prev>0?v/prev-1:0); prev=v; } return out; };
function stats(keys,r){ let e=100, pk=100, dd=0; const eqs=[]; for(const x of r){ e*=1+x; if(e<0) e=0; pk=Math.max(pk,e); dd=Math.max(dd,pk>0?1-e/pk:1); eqs.push(e); }
  const Y=(keys[keys.length-1]-keys[0])/(365.25*DAY); const yr={}, mo={};
  keys.forEach((k,i)=>{ const d=new Date(k-1); const y=d.getUTCFullYear(), m=y*12+d.getUTCMonth(); yr[y]=yr[y]||{a:i?eqs[i-1]:100}; yr[y].b=eqs[i]; mo[m]=mo[m]||{a:i?eqs[i-1]:100}; mo[m].b=eqs[i]; });
  const worstM=Math.min(...Object.values(mo).map(o=>o.b/o.a-1));
  return {end:e,cagr:Math.pow(Math.max(e,0.01)/100,1/Y)-1,dd,worstM,yr:Object.fromEntries(Object.entries(yr).map(([y,o])=>[y,o.b/o.a-1]))}; }
const corr=(a,b)=>{ const n=a.length; const ma=a.reduce((p,q)=>p+q,0)/n, mb=b.reduce((p,q)=>p+q,0)/n; let s=0,sa=0,sb=0; for(let i=0;i<n;i++){ s+=(a[i]-ma)*(b[i]-mb); sa+=(a[i]-ma)**2; sb+=(b[i]-mb)**2; } return s/Math.sqrt(sa*sb); };
const wk=(keys,r)=>{ const g={}; keys.forEach((k,i)=>{ const w=Math.floor(k/(7*DAY)); g[w]=(g[w]||1)*(1+r[i]); }); return Object.values(g).map(v=>v-1); };
(async()=>{
  const t0=Date.now(); const TT=turtleCurve(); console.log('kaplumbağa',((Date.now()-t0)/1e3).toFixed(0)+' sn');
  const TR=JSON.parse(fs.readFileSync(path.join(ARCH,'_t52-trades.json'),'utf8'));
  const SH={'kalite %0,5 · N 5':shortCurve(TR['m_s_k30|72|sd2'],0.005,5),'kalite %0,5 · N 10':shortCurve(TR['m_s_k30|72|sd2'],0.005,10),'kalite %1 · N 5':shortCurve(TR['m_s_k30|72|sd2'],0.01,5),'süzgeçsiz masa %0,5 · N 5':shortCurve(TR['m_s|72|sd2'],0.005,5)};
  const keys=[...TT.keys()].filter(k=>k>T22).sort((a,b)=>a-b); const rT=rets(TT,keys); const yrs=[2022,2023,2024,2025,2026];
  let md=`# Test #52 · Kaplumbağa + kalite süzgeçli short sepeti birlikte\n\n11 Ekim 2026 · \`node tests/test52-birlesik.js\` (önce test52-ozan-kalite-72sa.js)\n\n`;
  md+=`Kaplumbağa: canlı kod (turtle-test.js --replay döngüsü, ilk 50, %0,5 risk, en çok 10, nominal ≤ 2×), gün sonu değerlemesi. Short sepeti: masa short ∧ kalite en kötü %30 değil, 72 sa, stop 2 × sd, 100 $'dan bileşik, nominal ≤ 3×; gün sonu açık shortlar günlük kapanışla değerlenir. Her ikisi de anlık değerlemeli günlük eğri, dönem ${new Date(keys[0]).toISOString().slice(0,10)} → ${new Date(keys[keys.length-1]).toISOString().slice(0,10)}. 50/50 = her gün yarı yarıya dengelenmiş; "ikisi tam" = iki sepet aynı bakiyeyi tam kullanır (günlük getiriler toplanır, toplam nominal ≤ 5×).\n\n`;
  md+=`| portföy | son bakiye $ | yıllık | en büyük düşüş | en kötü ay | ${yrs.join(' | ')} |\n|---|---:|---:|---:|---:|${yrs.map(()=>'---:').join('|')}|\n`;
  const row=(ad,r)=>{ const s=stats(keys,r); md+=`| ${ad} | ${s.end.toLocaleString('tr-TR',{maximumFractionDigits:0})} | ${fx(100*s.cagr,0)} % | −%${(100*s.dd).toFixed(0)} | ${fx(100*s.worstM,1)} % | ${yrs.map(y=>s.yr[y]!=null?fx(100*s.yr[y],0)+' %':'—').join(' | ')} |\n`; };
  row('Kaplumbağa tek başına',rT); const cs=[];
  for(const ad in SH){ const rS=rets(SH[ad],keys); row(`short (${ad}) tek başına`,rS); row(`50/50 Kaplumbağa + short (${ad})`,rT.map((x,i)=>0.5*x+0.5*rS[i])); row(`ikisi tam: Kaplumbağa + short (${ad})`,rT.map((x,i)=>x+rS[i])); cs.push([ad,corr(rT,rS),corr(wk(keys,rT),wk(keys,rS))]); }
  md+=`\n## Korelasyon (Kaplumbağa ↔ short sepeti)\n\n| short sepeti | günlük | haftalık |\n|---|---:|---:|\n`+cs.map(([a,d,w])=>`| ${a} | ${fx(d,2)} | ${fx(w,2)} |`).join('\n')+'\n';
  md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test52-birlesik-report.md'),md); console.log(md);
})().catch(e=>{ console.error(e); process.exit(1); });
