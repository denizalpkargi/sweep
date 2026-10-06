// Yüksek kazanma oranı araştırması: trend içinde geri çekilme alımı (günlük, BTC·ETH·SOL·BNB, 2020-01 → 2026-09).
// Soru: %80–90 kazanma oranı, bakiye korunarak, yılda ~2×; fitil avına (stop avı) yakalanmadan.
// Kural ailesi: rejim (BTC > SMA50 ve coin puanı ≥ eşik) → limit alım (önceki kapanışın p altında) → kâr al (+tp) →
//   çıkış: kapanış bazlı stop (gün sonu kapanışı girişin s altında ya da SMA50 altında; gün içi fitil saymaz) / zaman stopu / felaket stopu (gün içi −%25).
// Karşılaştırma: aynı stopu gün içi (fitille) uygulamak. Aynı gün hem kâr hem gün içi stop → stop sayılır; giriş günü kâr alınmaz.
// Maliyet: giriş maker %0,02, çıkış taker %0,05 + kayma %0,03, fonlama günde %0,03.
// Çalıştırma: node tests/research-highwr.js → tests/backtest-highwr.json
const fs=require('fs'); const path=require('path');
const DIR=path.join(__dirname,'data','daily'); const SYMS=['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'];
const MAK=0.0002, TAK=0.0005, SLIP=0.0003, FUND=0.0003, DAY=864e5;
const load=s=>fs.readFileSync(path.join(DIR,s+'.csv'),'utf8').trim().split('\n').map(l=>{const a=l.split(',').map(Number);return{t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]};});
const D={}; for(const s of SYMS) D[s]=load(s);
const TM=Date.UTC(2023,4,15);
const sma=(a,i,n)=>{ if(i<n-1) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=a[k].c; return s/n; };
const atr=(a,i,n)=>{ if(i<n) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=Math.max(a[k].h-a[k].l,Math.abs(a[k].h-a[k-1].c),Math.abs(a[k].l-a[k-1].c)); return s/n; };
const score=(a,i)=>{ let k=0; for(const n of [10,20,50,100]){ const m=sma(a,i,n); if(!isFinite(m)) return null; if(a[i].c>m) k++; } return k/4; };
const btcIdx={}; D.BTCUSDT.forEach((b,i)=>btcIdx[b.t]=i);
const btcOk=t=>{ const i=btcIdx[t]; if(i==null||i<60) return false; const b=D.BTCUSDT; return b[i].c>sma(b,i,50); };

function run(o){
  o=Object.assign({minScore:0.75,pull:0.03,pullAtr:0,tp:0.03,tpAtr:0,stop:0.08,closeStop:true,smaExit:false,hold:20,cat:0.25,btc:true},o);
  const tr=[];
  for(const s of SYMS){ const a=D[s]; let p=null, ord=null;
    for(let i=101;i<a.length;i++){ const b=a[i];
      if(p){ let ex=null, why=null; const age=i-p.i;
        const tpPx=p.e*(1+p.tp), stPx=p.e*(1-o.stop), catPx=p.e*(1-o.cat);
        if(b.l<=catPx){ ex=Math.min(b.o,catPx); why='felaket'; }
        else if(!o.closeStop&&b.l<=stPx){ ex=Math.min(b.o,stPx); why='stop'; }
        else if(age>0&&b.h>=tpPx){ ex=Math.max(b.o,tpPx); why='tp'; }
        else if(o.closeStop&&b.c<=stPx){ ex=b.c; why='stop'; }
        else if(o.smaExit&&b.c<sma(a,i,50)){ ex=b.c; why='trend'; }
        else if(age>=o.hold){ ex=b.c; why='zaman'; }
        if(ex!=null){ const g=ex/p.e-1 - MAK - TAK - (why==='tp'?0:SLIP) - FUND*Math.max(1,age);
          const wick=why==='stop'&&!o.closeStop&&b.c>stPx; tr.push({s,t:p.t,r:g,why,age,wick,mae:p.mae}); p=null; }
        else p.mae=Math.min(p.mae,b.l/p.e-1);
        if(p) continue; }
      // bekleyen limit: bir gün geçerli
      if(ord){ if(b.l<=ord.px){ const e=Math.min(b.o,ord.px); p={e,t:b.t,i,tp:ord.tp,mae:b.l/e-1}; ord=null; if(b.c<=e*(1-o.stop)&&o.closeStop){ /* aynı gün kapanış stopu: ertesi gün değerlendirilir */ } continue; } ord=null; }
      const sc=score(a,i); if(sc==null||sc<o.minScore) continue; if(o.btc&&!btcOk(b.t)) continue;
      const x=atr(a,i,14); const px=o.pullAtr? b.c-o.pullAtr*x : b.c*(1-o.pull); const tp=o.tpAtr? o.tpAtr*x/px : o.tp;
      ord={px,tp};
    }
  }
  return tr;
}
function stats(tr,lev){
  const n=tr.length; if(!n) return {n:0}; const m=tr.reduce((x,y)=>x+y.r,0)/n; const sd=Math.sqrt(tr.reduce((x,y)=>x+(y.r-m)**2,0)/n);
  const h=f=>{ const x=tr.filter(f); return x.length? +(100*x.reduce((p,y)=>p+y.r,0)/x.length).toFixed(2):null; };
  const why={}; for(const x of tr) why[x.why]=(why[x.why]||0)+1;
  // hesap: 4 yuva, yuva başına bakiyenin 1/4'ü × kaldıraç; işlemler sırayla bileşik (çakışanlar aynı anda açık olabilir, yaklaşık)
  const acct=L=>{ let eq=1, pk=1, dd=0; const byT=tr.slice().sort((u,v)=>u.t-v.t); for(const x of byT){ eq*=1+x.r*L/4; pk=Math.max(pk,eq); dd=Math.min(dd,eq/pk-1); } const yrs=(byT[byT.length-1].t-byT[0].t)/DAY/365; return {mult:+eq.toFixed(2),cagr:+((eq**(1/yrs)-1)*100).toFixed(0),maxDD:+(dd*100).toFixed(0)}; };
  const yr={}; for(const x of tr){ const y=new Date(x.t).getUTCFullYear(); (yr[y]=yr[y]||[]).push(x.r); }
  return {n,wr:+(tr.filter(x=>x.r>0).length/n*100).toFixed(1),avgPct:+(m*100).toFixed(2),t:+(m/sd*Math.sqrt(n)).toFixed(1),h1:h(x=>x.t<TM),h2:h(x=>x.t>=TM),
    worstPct:+(Math.min(...tr.map(x=>x.r))*100).toFixed(1),why,wicks:tr.filter(x=>x.wick).length,
    yrWr:Object.fromEntries(Object.entries(yr).map(([y,a])=>[y,+(a.filter(r=>r>0).length/a.length*100).toFixed(0)])),
    yrAvg:Object.fromEntries(Object.entries(yr).map(([y,a])=>[y,+(100*a.reduce((p,r)=>p+r,0)/a.length).toFixed(2)])),
    acct1:acct(1),acct2:acct(2),acct3:acct(3)};
}
const out={};
const grid=[];
for(const pull of [0,0.02,0.03,0.05]) for(const tp of [0.02,0.03,0.05,0.08]) for(const stop of [0.06,0.10,0.15]) for(const hold of [10,20]) for(const ms of [0.5,0.75,1])
  grid.push({pull,tp,stop,hold,minScore:ms});
const rows=grid.map(g=>({g,st:stats(run(g))}));
// seçim kuralı: iki yarıda artı, kazanma ≥ %80, n ≥ 150; en yüksek t
const ok=rows.filter(r=>r.st.n>=150&&r.st.wr>=80&&r.st.h1>0&&r.st.h2>0).sort((a,b)=>b.st.t-a.st.t);
out.gridN=rows.length; out.passN=ok.length;
out.top=ok.slice(0,12).map(r=>({...r.g,...r.st}));
out.allPositiveShare=+(rows.filter(r=>r.st.h1>0&&r.st.h2>0).length/rows.length).toFixed(2);
// varsayılan aday ve karşılaştırmalar
const base={pull:0.03,tp:0.03,stop:0.10,hold:20,minScore:0.75};
out.base_close=stats(run(base));
out.base_intraday=stats(run({...base,closeStop:false}));
out.base_noBtc=stats(run({...base,btc:false}));
out.base_smaExit=stats(run({...base,smaExit:true}));
out.base_noStop=stats(run({...base,stop:0.99}));
fs.writeFileSync(path.join(__dirname,'backtest-highwr.json'),JSON.stringify(out,null,1));
console.log('grid',out.gridN,'geçen',out.passN,'iki yarıda artı oranı',out.allPositiveShare);
for(const r of out.top) console.log(JSON.stringify({pull:r.pull,tp:r.tp,stop:r.stop,hold:r.hold,ms:r.minScore,n:r.n,wr:r.wr,avg:r.avgPct,t:r.t,h1:r.h1,h2:r.h2,worst:r.worstPct,a2:r.acct2,a3:r.acct3}));
for(const k of ['base_close','base_intraday','base_noBtc','base_smaExit','base_noStop']) console.log(k,JSON.stringify(out[k]));
// yıllara göre: seçilen ilk 4 ayar ve sıkı rejim (BTC > SMA100 ve SMA50 yükseliyor)
if(process.argv.includes('--years')){
  for(const r of out.top.slice(0,4)) console.log('yıl',JSON.stringify({pull:r.pull,tp:r.tp,stop:r.stop,hold:r.hold,ms:r.minScore}),JSON.stringify(r.yrAvg),JSON.stringify(r.yrWr));
}
