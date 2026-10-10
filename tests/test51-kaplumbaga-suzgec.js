// Test #51 (10 Ekim 2026 gecesi, #50 yan bulgusu): canlı Kaplumbağa sepeti kodu (src/turtle.js ttClose/ttIntraday/ttExit) ile BTC SMA200 süzgeci
// üç biçimde: (a) bugünkü (BTC < SMA200 → yeni giriş yok), (b) süzgeçsiz, (c) BTC < SMA200 iken yarı risk. Arşiv 1g, ayın ilk 50 coini, 2020-06 → bugün.
// turtle-test.js --replay ile aynı döngü (fonlama yok, ücret taker %0,05 + kayma %0,03). Özsermaye her gün piyasaya göre değerlenir (ttEq).
// Süzgeçsiz ve yarı risk varyantı için motora her gün yükselen yapay BTC dizisi verilir (ttBtcOk hep geçer); gerçek BTC SMA200 burada hesaplanır.
// Kullanım: node tests/test51-kaplumbaga-suzgec.js → tests/test51-kaplumbaga-suzgec-report.md
const path=require('path'), fs=require('fs');
const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const DAY=864e5, ARCH=path.join(__dirname,'data','arch'), TOP=50;
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const syms=[...new Set(Object.values(U).flatMap(v=>v.slice(0,TOP)).concat(['BTCUSDT']))];
const D={}; for(const sym of syms){ const f=path.join(ARCH,'1d',sym+'.csv'); if(!fs.existsSync(f)) continue; D[sym]=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{ const a=l.split(','); return {t:+a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],q:+a[7]}; }).filter(b=>b.q>0); }
const idx={}; for(const k in D) idx[k]=new Map(D[k].map((b,i)=>[b.t,i]));
const btc=D.BTCUSDT, fake=Array.from({length:210},(_,i)=>({t:i,o:1+i,h:1+i,l:1+i,c:1+i,q:1}));
const above=t=>{ const i=idx.BTCUSDT.get(t); if(i==null||i<199) return null; let s=0; for(let j=i-199;j<=i;j++) s+=btc[j].c; return btc[i].c>s/200; };
function run(mode){
  const s=E.ttNew({fee:0.0005,slip:0.0003}); const t0=Date.UTC(2020,5,1), t1=btc[btc.length-1].t; let peak=100, mdd=0; const eqs=[];
  for(let t=t0;t<t1;t+=DAY){
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) E.ttIntraday(s,k,D[k][i],t); }
    const m=new Date(t).toISOString().slice(0,7); const univ=(U[m]||[]).slice(0,TOP).filter(k=>idx[k]&&idx[k].has(t));
    const need=new Set([...univ,...Object.keys(s.pos),'BTCUSDT']); const data={}, px={};
    for(const k of need){ const i=idx[k]&&idx[k].get(t); if(i==null||i<130) continue; data[k]=D[k].slice(Math.max(0,i-215),i+1); const nx=D[k][i+1]; if(nx) px[k]=nx.o; }
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null&&i===D[k].length-1) E.ttExit(s,k,D[k][i].c,'listeden çıktı',t); }
    const up=above(t);
    if(mode!=='a'){ data.BTCUSDT=fake; s.cfg.risk=mode==='c'&&up===false?0.0025:0.005; }
    E.ttClose(s,data,univ,px,t+DAY);
    for(const k of Object.keys(s.pos)){ const i=idx[k]&&idx[k].get(t); if(i!=null) s.pos[k].px=D[k][i].c; }
    const eq=E.ttEq(s,null); peak=Math.max(peak,eq); mdd=Math.max(mdd,1-eq/peak); eqs.push({t,eq,up});
  }
  return {s,eqs,mdd,t0,t1};
}
const fx=(x,d=2)=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(d).replace('.',','):'–', pc=x=>Number.isFinite(x)?(x>=0?'+':'')+(100*x).toFixed(0)+'%':'–';
const NAMES={a:'bugünkü: BTC < SMA200 → giriş yok',b:'süzgeçsiz',c:'BTC < SMA200 → yarı risk'};
const L=['# Test #51 · Kaplumbağa sepetinde BTC SMA200 süzgeci (canlı kod)','',`10 Ekim 2026 · \`node tests/test51-kaplumbaga-suzgec.js\``,'',
  'Canlı `src/turtle.js` (ttClose / ttIntraday / ttExit), turtle-test.js --replay döngüsü: arşiv 1g, ayın ilk 50 coini, %0,5 risk, en çok 10 pozisyon, nominal ≤ 2x, taker %0,05 + kayma %0,03, fonlama yok. Özsermaye her gün piyasaya göre. "Süzgeç dışı girişler": BTC < SMA200 iken açılan işlemler.','',
  '| Varyant | İşlem | Ort. R | 1. yarı R | 2. yarı R | Son 24 ay R | İlk %5 hariç R | 100 $ → | Yıllık | 1. yarı / 2. yarı yıllık | Son 24 ay yıllık | En büyük düşüş | Süzgeç dışı girişler: n / R |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---|'];
const YR=[], ys=[2020,2021,2022,2023,2024,2025,2026];
for(const mode of ['a','b','c']){
  const {s,eqs,mdd,t0,t1}=run(mode); const tr=s.trades, mid=(t0+t1)/2, l24=t1-730*DAY, yrs=(t1-t0)/365/DAY;
  const mR=a=>a.length?a.reduce((x,y)=>x+y.R,0)/a.length:NaN;
  const off=tr.filter(x=>above(Math.floor(x.t/DAY)*DAY-DAY)===false);
  const srt=tr.map(x=>x.R).sort((a,b)=>b-a), ex=srt.slice(Math.ceil(srt.length*0.05));
  const eqAt=t=>{ let e=100; for(const x of eqs){ if(x.t>t) break; e=x.eq; } return e; }, end=eqs[eqs.length-1].eq, em=eqAt(mid), e24=eqAt(l24);
  let pk=e24, dd24=0; for(const x of eqs) if(x.t>=l24){ pk=Math.max(pk,x.eq); dd24=Math.max(dd24,1-x.eq/pk); }
  L.push(`| ${NAMES[mode]} | ${tr.length} | ${fx(mR(tr))} | ${fx(mR(tr.filter(x=>x.t<mid)))} | ${fx(mR(tr.filter(x=>x.t>=mid)))} | ${fx(mR(tr.filter(x=>x.t>=l24)))} | ${fx(ex.reduce((a,b)=>a+b,0)/ex.length)} | ${end.toFixed(0)} $ | ${pc(Math.pow(end/100,1/yrs)-1)} | ${pc(Math.pow(em/100,2/yrs)-1)} / ${pc(Math.pow(end/em,2/yrs)-1)} | ${pc(Math.pow(end/e24,0.5)-1)} (düşüş −${(100*dd24).toFixed(0)}%) | −${(100*mdd).toFixed(0)}% | ${off.length} / ${fx(mR(off))} |`);
  const by={}; let last=100; for(const x of eqs){ const y=new Date(x.t).getUTCFullYear(); by[y]=by[y]||{s:last}; by[y].e=x.eq; last=x.eq; }
  YR.push(`| ${NAMES[mode]} | `+ys.map(y=>by[y]?pc(by[y].e/by[y].s-1):'–').join(' | ')+' |');
  console.log(mode,tr.length,fx(mR(tr)),end.toFixed(0),(100*mdd).toFixed(0),'off',off.length,fx(mR(off)));
}
L.push('','## Yıl yıl','','| Varyant | '+ys.join(' | ')+' |','|---|'+'---:|'.repeat(ys.length),...YR);
fs.writeFileSync(path.join(__dirname,'test51-kaplumbaga-suzgec-report.md'),L.join('\n')+'\n'); console.log(L.join('\n'));
