// Test #52 portföy (11 Ekim 2026, kullanıcı "evet" dedi): test52-ozan-kalite-72sa.js işlemlerinden (72 sa, stop 2 × sd) bileşik bakiye eğrisi.
// Kural: 100 $ ile başla; karar geldiğinde (karar + 15 dk) açık işlem sayısı < N ve toplam nominal + yeni ≤ kaldıraç sınırı × bakiye ise gir;
// risk = r × gerçekleşmiş bakiye (o an), nominal = risk ÷ (2 × sd) (R birimi 2 × sd × giriş); kapanışta kâr = risk × R (komisyon, kayma, fonlama R'de).
// Düşüş kapanan işlemlerle ölçülür (açık pozisyonların anlık zararı sayılmaz; gerçek düşüş daha büyük olabilir).
// Kullanım: node tests/test52-portfoy.js → tests/test52-portfoy-report.md
const fs=require('fs'), path=require('path');
const L=require('./test40-lib.js'); const {M15,DAY,fx,ny,mean}=L;
const D=JSON.parse(fs.readFileSync(path.join(L.ARCH,'_t52-trades.json'),'utf8'));
const AD={'m_s|72|sd2':'masa short (hepsi)','m_s_k30|72|sd2':'masa short ∧ kalite en kötü %30 değil','m_s_k50|72|sd2':'masa short ∧ kalite en kötü %50 değil','m_s_b30|72|sd2':'masa short ∧ en kötü %30 değil (yalnız B)','r_s|72|sd2':'rastgele short'};
const RS=[0.005,0.01,0.02], NS=[5,10,20], LEV=3;
function run(tr,r,N){
  const ev=tr.map(x=>({...x,t0:x.t+M15})).sort((a,b)=>a.t0-b.t0); let eq=100, peak=100, dd=0; const open=[]; const taken=[]; const curve=[[ev.length?ev[0].t0:0,100]];
  const closeUpTo=T=>{ open.sort((a,b)=>a.endT-b.endT); while(open.length&&open[0].endT<=T){ const o=open.shift(); eq+=o.risk*o.R; curve.push([o.endT,eq]); if(eq>peak) peak=eq; dd=Math.max(dd,1-eq/peak); } };
  for(const x of ev){ closeUpTo(x.t0); if(eq<=1) break; if(open.length>=N) continue; const risk=r*eq, notl=risk/(2*x.sd); const used=open.reduce((p,o)=>p+o.notl,0); if(used+notl>LEV*eq) continue;
    open.push({...x,risk,notl}); taken.push(x); }
  closeUpTo(Infinity);
  return {eq,dd,taken,curve};
}
const yrs=[2022,2023,2024,2025,2026];
const yearRet=c=>yrs.map(y=>{ const a=Date.UTC(y,0,1), b=Date.UTC(y+1,0,1); let e0=null,e1=null; for(const [t,e] of c){ if(t<a) e0=e; if(t<b) e1=e; } if(e0==null) e0=c[0][1]; return e1==null?NaN:e1/e0-1; });
const months=c=>{ const g={}; let prev=c[0][1]; const last={}; for(const [t,e] of c){ const d=new Date(t); last[d.getUTCFullYear()*12+d.getUTCMonth()]=e; } const ks=Object.keys(last).map(Number).sort((a,b)=>a-b); const out=[]; for(const k of ks){ out.push(last[k]/prev-1); prev=last[k]; } return out; };
let md=`# Test #52 · portföy: masa short + 72 sa + kalite süzgeci\n\n11 Ekim 2026 · \`node tests/test52-portfoy.js\` (önce test52-ozan-kalite-72sa.js)\n\n`;
md+=`100 $'dan bileşik; risk = r × gerçekleşmiş bakiye, aynı anda en çok N işlem, toplam nominal ≤ ${LEV} × bakiye; işlem sonucu test #52'nin simülatöründen (72 sa, stop 2 × sd, VWAP, taker, kayma, fonlama). Düşüş kapanan işlemlerle (açık pozisyonun anlık zararı sayılmaz → gerçek düşüş daha büyük). Dönem 2022-01 → 2026-10.\n\n`;
md+=`| küme | risk | N | alınan işlem | ort. R | son bakiye $ | yıllık | en büyük düşüş | en kötü ay | ${yrs.join(' | ')} |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|${yrs.map(()=>'---:').join('|')}|\n`;
for(const key in AD){ const tr=D[key]; if(!tr||!tr.length) continue; const T0=Math.min(...tr.map(x=>x.t)), T1=Math.max(...tr.map(x=>x.endT)); const Y=(T1-T0)/(365.25*DAY);
  for(const r of RS) for(const N of NS){ const o=run(tr,r,N); const yr=yearRet(o.curve); const m=months(o.curve);
    md+=`| ${AD[key]} | %${(r*100).toFixed(1)} | ${N} | ${ny(o.taken.length)} | ${fx(mean(o.taken.map(x=>x.R)))} | ${o.eq.toLocaleString('tr-TR',{maximumFractionDigits:0})} | ${fx(100*(Math.pow(Math.max(o.eq,0.01)/100,1/Y)-1),0)} % | −%${(100*o.dd).toFixed(0)} | ${fx(100*Math.min(...m),1)} % | ${yr.map(v=>Number.isFinite(v)?fx(100*v,0)+' %':'—').join(' | ')} |\n`; } }
md=md.replace(/%(\d+)\.(\d)/g,'%$1,$2'); fs.writeFileSync(path.join(__dirname,'test52-portfoy-report.md'),md); console.log(md);
