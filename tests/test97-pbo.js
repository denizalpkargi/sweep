// Test #97: seçim aşırı uyumu olasılığı (PBO, CSCV; Bailey, Borwein, López de Prado, Zhu 2015) — Kaplumbağa ayar ızgarası.
// research-daily-wide.js'in işlem ve portföy kodu aynen yüklenir (kaynak metni; yalnız portföy günlük getiri dizisini de döndürür).
// Izgara (sonuca bakmadan): long + BTC SMA200 süzgeci, piramitsiz, giriş N ∈ {10,15,20,30,40,55} × çıkış N ∈ {5,10,15,20} = 24 ayar;
// portföy canlı sepet gibi %0,5 risk, en çok 10 pozisyon, nominal ≤ 2×, ilk 50 coin.
// CSCV: günlük getiri matrisi 16 parçaya bölünür; 8'li her seçimde (12.870) örneklem içi en iyi Sharpe'lı ayarın örneklem dışı sırası;
// PBO = o sıranın medyanın altında kaldığı bölünme oranı. Canlı ayarın (20/10) da sırası verilir. Ichimoku verisi bulutta yok.
// Kullanım: node tests/test97-pbo.js → tests/test97-pbo-report.md
const fs=require('fs'), path=require('path');
let src=fs.readFileSync(path.join(__dirname,'research-daily-wide.js'),'utf8');
src=src.slice(0,src.indexOf('const fx=')).replace("return {cagr:","return {daily,cagr:");
process.argv.push('--top','50','--risk','0.005','--maxpos','10','--lev','2');
const E=new Function('require','__dirname','process',src+'\nreturn {SYS,D,trades,portfolio,btcAbove,DAY};')(require,__dirname,process);
const {SYS,D,trades,portfolio,btcAbove,DAY}=E; const T0=Date.UTC(2020,5,1);
const EN=[10,15,20,30,40,55], EX=[5,10,15,20], cfgs=[];
for(const a of EN) for(const b of EX) cfgs.push([a,b]);
const M=[]; let days=null; const summ=[];
for(const [a,b] of cfgs){ const name=`T_${a}_${b}`; SYS[name]={entryN:a,exitN:b};
  let all=[]; for(const s of Object.keys(D)){ const k=D[s]; delete k._N; all=all.concat(trades(s,name,1,false)); }
  const tr=all.filter(x=>x.ti>=T0).filter(x=>{ const u=btcAbove(x.ti-DAY); return u===true; });
  const pf=portfolio(tr); M.push(pf.daily.map(x=>x.r)); days=pf.daily.map(x=>x.t); summ.push({a,b,n:tr.length,cagr:pf.cagr,mdd:pf.mdd,sh:pf.sharpe});
  console.log(name,tr.length,(pf.cagr*100).toFixed(0),(pf.mdd*100).toFixed(0),pf.sharpe.toFixed(2)); }
const S=16, T=days.length, blk=Math.floor(T/S), N=cfgs.length;
const sharpe=(r,idx)=>{ let s=0,q=0,n=0; for(const i of idx){ s+=r[i]; q+=r[i]*r[i]; n++; } const m=s/n, sd=Math.sqrt(q/n-m*m); return sd>0?m/sd:0; };
const blocks=[...Array(S).keys()].map(k=>[...Array(k===S-1?T-k*blk:blk).keys()].map(j=>k*blk+j));
const live=cfgs.findIndex(([a,b])=>a===20&&b===10);
let below=0, total=0, liveBelow=0; const lam=[];
function* comb(n,k,st=0,acc=[]){ if(acc.length===k){ yield acc.slice(); return; } for(let i=st;i<n;i++){ acc.push(i); yield* comb(n,k,i+1,acc); acc.pop(); } }
for(const c of comb(S,S/2)){ const set=new Set(c); const IS=[], OS=[]; for(let k=0;k<S;k++) (set.has(k)?IS:OS).push(...blocks[k]);
  const si=M.map(r=>sharpe(r,IS)), so=M.map(r=>sharpe(r,OS)); let best=0; for(let i=1;i<N;i++) if(si[i]>si[best]) best=i;
  const rk=x=>so.filter(v=>v<so[x]).length/(N-1); const w=rk(best); lam.push(Math.log((w+1e-9)/(1-w+1e-9)));
  if(w<0.5) below++; if(rk(live)<0.5) liveBelow++; total++; }
const f=(x,d=2)=>(x>=0?'+':'')+x.toFixed(d).replace('.',',');
const L=['# Test #97: Kaplumbağa ayar ızgarasında seçim aşırı uyumu (PBO)','',
 `Long + BTC SMA200, piramitsiz, ilk 50 coin, %0,5 risk · 10 pozisyon · 2×, ${new Date(days[0]).toISOString().slice(0,10)} → ${new Date(days[T-1]).toISOString().slice(0,10)}. CSCV: ${S} parça, ${total} bölünme, ölçü günlük Sharpe.`,'',
 `**PBO = ${(below/total*100).toFixed(0)} %** (örneklem içi en iyi ayarın örneklem dışında medyanın altında kalma oranı; > %50 = seçim şanstan ayırt edilemez). Canlı ayar 20/10'un örneklem dışında medyanın altında kaldığı bölünme: %${(liveBelow/total*100).toFixed(0)}.`,'',
 '| Giriş N | Çıkış N | İşlem | Yıllık % | Düşüş % | Sharpe |','|---|---|---|---|---|---|',
 ...summ.map(s=>`| ${s.a} | ${s.b} | ${s.n} | ${f(s.cagr*100,0)} | −${(s.mdd*100).toFixed(0)} | ${f(s.sh)} |`)];
fs.writeFileSync(path.join(__dirname,'test97-pbo-report.md'),L.join('\n')+'\n'); console.log(L.slice(0,6).join('\n'));
