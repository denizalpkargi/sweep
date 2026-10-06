// Günlük mumlarda strateji aileleri, 2020-01 → 2026-09 (BTC, ETH, SOL, BNB).
// Veri: tests/data/daily/<SYM>.csv (open_time,open,high,low,close,quoteVol) — kullanıcının PC'sindeki tests/data/fic aylık CSV'lerinden birleştirilir (repoya girmez).
// Maliyet: işlem başına taker %0,05 + kayma %0,03; long pozisyon fonlama öder (günde %0,03 ≈ 8 saatte %0,01), short alır.
// Çalıştırma: node tests/research-daily.js  → tests/backtest-daily.json
const fs=require('fs'); const path=require('path');
const DIR=path.join(__dirname,'data','daily'); const SYMS=['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'];
const COST=0.0008, FUND=0.0003, DAY=864e5;
const load=s=>fs.readFileSync(path.join(DIR,s+'.csv'),'utf8').trim().split('\n').map(l=>{const a=l.split(',').map(Number);return{t:a[0],o:a[1],h:a[2],l:a[3],c:a[4]};});
const D={}; for(const s of SYMS) D[s]=load(s);
const T0=Date.UTC(2020,0,1), T1=Date.UTC(2026,9,1), TM=(T0+T1)/2; // iki yarı: 2020-01 → 2023-05 / 2023-05 → 2026-09
const sma=(a,i,n)=>{ if(i<n-1) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=a[k].c; return s/n; };
const atr=(a,i,n)=>{ if(i<n) return NaN; let s=0; for(let k=i-n+1;k<=i;k++) s+=Math.max(a[k].h-a[k].l,Math.abs(a[k].h-a[k-1].c),Math.abs(a[k].l-a[k-1].c)); return s/n; };
const vol=(a,i,n)=>{ if(i<n) return NaN; const r=[]; for(let k=i-n+1;k<=i;k++) r.push(Math.log(a[k].c/a[k-1].c)); const m=r.reduce((x,y)=>x+y,0)/n; return Math.sqrt(r.reduce((x,y)=>x+(y-m)**2,0)/(n-1)); };
const hh=(a,i,n)=>{ let m=-Infinity; for(let k=i-n+1;k<=i;k++) m=Math.max(m,a[k].h); return m; };
const ll=(a,i,n)=>{ let m=Infinity; for(let k=i-n+1;k<=i;k++) m=Math.min(m,a[k].l); return m; };

// Portföy: her gün ağırlık w (özsermayeye göre kaldıraçsız pozisyon), getiri = Σ w·r − maliyet·|Δw| − fonlama.
function portfolio(sigFn,{tv=0.4,cap=2,short=false}={}){
  const days=[]; for(let t=T0;t<T1;t+=DAY) days.push(t);
  const idx={}; for(const s of SYMS){ idx[s]={}; D[s].forEach((b,i)=>idx[s][b.t]=i); }
  const W={}; SYMS.forEach(s=>W[s]=0); const eq=[1]; const rets=[];
  for(let d=0;d<days.length-1;d++){
    const t=days[d]; let r=0; const act=SYMS.filter(s=>idx[s][t]!=null&&idx[s][t]>=60);
    const nw={}; for(const s of SYMS){ nw[s]=0; }
    for(const s of act){ const a=D[s], i=idx[s][t]; let sg=sigFn(a,i); if(!short&&sg<0) sg=0; const v=vol(a,i,30)*Math.sqrt(365); nw[s]=sg*Math.min(cap,tv/v)/act.length; }
    for(const s of SYMS){ const i=idx[s][t]; if(i==null||i+1>=D[s].length) { r-=Math.abs(W[s])*COST; W[s]=0; continue; }
      r-=Math.abs(nw[s]-W[s])*COST; W[s]=nw[s]; const ret=D[s][i+1].c/D[s][i].c-1; r+=W[s]*ret - (W[s]>0?W[s]*FUND:W[s]<0?W[s]*FUND:0); }
    rets.push({t,r}); eq.push(eq[eq.length-1]*(1+r));
  }
  const st=statsP(rets,eq); st.double=dbl(eq); return st;
}
// 2 katına çıkma: her 30 günde başlayan pencerede 90/180/365 gün içinde 2× görülme oranı ve aynı pencerede −%50 görme oranı
function dbl(eq){ const o={}; for(const H of [90,180,365]){ let n=0,k=0,b=0; for(let s=0;s+H<eq.length;s+=30){ n++; let hit=0,bust=0; for(let i=s;i<=s+H;i++){ if(eq[i]/eq[s]>=2){hit=1;break;} if(eq[i]/eq[s]<=0.5){bust=1;break;} } k+=hit; b+=bust; } o['d'+H]=+(k/n).toFixed(2); o['b'+H]=+(b/n).toFixed(2); } return o; }
function statsP(rets,eq){
  const yr=rets.length/365, cagr=eq[eq.length-1]**(1/yr)-1; const m=rets.reduce((x,y)=>x+y.r,0)/rets.length; const sd=Math.sqrt(rets.reduce((x,y)=>x+(y.r-m)**2,0)/rets.length);
  let pk=1, dd=0; for(const e of eq){ pk=Math.max(pk,e); dd=Math.min(dd,e/pk-1); }
  const half=f=>{ const x=rets.filter(f); return x.length? x.reduce((p,y)=>p*(1+y.r),1)**(365/x.length)-1 : null; };
  const years={}; for(const x of rets){ const y=new Date(x.t).getUTCFullYear(); years[y]=(years[y]||1)*(1+x.r); }
  for(const y in years) years[y]=+(years[y]-1).toFixed(3);
  return {cagr:+cagr.toFixed(3),sharpe:+(m/sd*Math.sqrt(365)).toFixed(2),maxDD:+dd.toFixed(3),h1:+half(x=>x.t<TM).toFixed(3),h2:+half(x=>x.t>=TM).toFixed(3),years};
}

// İşlem bazlı: Donchian kırılımı, giriş ertesi açılış, ilk stop 2 ATR, iz 3 ATR, çıkış 10 günlük dip (long) / tepe (short). Sonuç R.
function donchian(nIn,nOut,{short=false,trend=false}={}){
  const tr=[];
  for(const s of SYMS){ const a=D[s]; let p=null;
    for(let i=60;i<a.length-1;i++){
      if(p){ const b=a[i]; const L=p.dir>0;
        const hit=L? b.l<=p.stop : b.h>=p.stop;
        if(hit){ const px=L?Math.min(b.o,p.stop):Math.max(b.o,p.stop); end(px,b.t); }
        else { const x=atr(a,i,20); if(L){ p.stop=Math.max(p.stop,b.c-3*x,ll(a,i,nOut)); } else { p.stop=Math.min(p.stop,b.c+3*x,hh(a,i,nOut)); } p.days++; p.fund+=FUND; }
        if(p) continue; }
      const up=a[i].c>hh(a,i-1,nIn), dn=a[i].c<ll(a,i-1,nIn); const ok=!trend||true;
      const tL=!trend||a[i].c>sma(a,i,100), tS=!trend||a[i].c<sma(a,i,100);
      if(up&&tL||short&&dn&&tS){ const dir=up?1:-1; const e=a[i+1].o, x=atr(a,i,20); p={s,dir,e,t:a[i+1].t,stop:e-dir*2*x,risk:2*x,days:0,fund:0}; }
    }
    function end(px,t){ const g=p.dir*(px-p.e)/p.risk; const c=(2*COST*p.e)/p.risk; const f=p.dir*p.fund*p.e/p.risk; tr.push({s,t:p.t,r:g-c-f,days:p.days,dir:p.dir}); p=null; }
  }
  return statsT(tr);
}
function statsT(tr){
  const n=tr.length; if(!n) return {n:0}; const m=tr.reduce((x,y)=>x+y.r,0)/n; const sd=Math.sqrt(tr.reduce((x,y)=>x+(y.r-m)**2,0)/n);
  const h=f=>{ const x=tr.filter(f); return x.length? +(x.reduce((p,y)=>p+y.r,0)/x.length).toFixed(3):null; };
  const pos=tr.filter(x=>x.r>0).reduce((p,y)=>p+y.r,0), neg=-tr.filter(x=>x.r<0).reduce((p,y)=>p+y.r,0);
  return {n,avgR:+m.toFixed(3),t:+(m/sd*Math.sqrt(n)).toFixed(2),wr:+(tr.filter(x=>x.r>0).length/n).toFixed(2),pf:+(pos/neg).toFixed(2),h1:h(x=>x.t<TM),h2:h(x=>x.t>=TM),long:h(x=>x.dir>0),short:h(x=>x.dir<0),medDays:tr.map(x=>x.days).sort((a,b)=>a-b)[n>>1]};
}

// Lider tarzı: günlük trend yukarıyken (kapanış > SMA20) 24 sa tepeden %3 geri çekilmede alım, −%3 ve −%6'da ekleme (1:1:2), ortalama +%1,2'de kâr, stop yok.
// Günlük mumla yaklaşık: limitler gün içi düşükle, hedef gün içi yüksekle dolar; aynı gün ikisi de olursa kötü sıra (önce ekleme, kâr ertesi gün).
function dca(lev,{stopPct=0,trendN=20}={}){
  const tr=[]; const M=4/lev; // planın tamamı (4 birim nominal) için ayrılan teminat; ROI bu teminata göre
  for(const s of SYMS){ const a=D[s]; let p=null;
    for(let i=30;i<a.length;i++){ const b=a[i];
      if(p){
        for(const lv of p.adds) if(!lv.done&&b.l<=lv.px){ lv.done=1; p.avg=(p.avg*p.q+lv.px*lv.w)/(p.q+lv.w); p.q+=lv.w; }
        const liqPx=p.avg*(1-M*0.9/p.q); // bakım teminatı payı: teminatın %90'ı erince tasfiye
        const stopPx=stopPct? p.avg*(1-stopPct):0;
        if(b.l<=Math.max(liqPx,stopPx)){ const liq=liqPx>=stopPx; const px=Math.max(liqPx,stopPx); const roi=liq? -1 : (p.q*(px/p.avg-1)-p.q*COST*2-p.q*FUND*(i-p.i))/M; tr.push({s,t:p.t,r:roi*100,liq,days:i-p.i}); p=null; continue; }
        if(i>p.i&&b.h>=p.avg*1.012){ const roi=(p.q*(0.012-COST*2)-p.q*FUND*(i-p.i))/M; tr.push({s,t:p.t,r:roi*100,days:i-p.i}); p=null; }
        continue; }
      const hi=Math.max(a[i-1].h,b.o); const e=hi*0.97; const up=a[i-1].c>sma(a,i-1,trendN);
      if(up&&b.l<=e) p={t:b.t,i,avg:e,q:1,adds:[{px:e*0.97,w:1},{px:e*0.94,w:2}]};
    }
  }
  const n=tr.length; const m=tr.reduce((x,y)=>x+y.r,0)/n; const sd=Math.sqrt(tr.reduce((x,y)=>x+(y.r-m)**2,0)/n);
  const h=f=>{ const x=tr.filter(f); return x.length? +(x.reduce((p,y)=>p+y.r,0)/x.length).toFixed(2):null; };
  // hesap: her işlemde bakiyenin %25'i teminat (lider gibi), sırayla bileşik
  let eq=1, pk=1, dd=0; for(const x of tr.slice().sort((u,v)=>u.t-v.t)){ eq*=1+0.25*x.r/100; pk=Math.max(pk,eq); dd=Math.min(dd,eq/pk-1); }
  return {n,avgRoiPct:+m.toFixed(2),t:+(m/sd*Math.sqrt(n)).toFixed(2),wr:+(tr.filter(x=>x.r>0).length/n).toFixed(3),liq:tr.filter(x=>x.liq).length,worst:+Math.min(...tr.map(x=>x.r)).toFixed(1),h1:h(x=>x.t<TM),h2:h(x=>x.t>=TM),acct25:+eq.toFixed(2),acctDD:+dd.toFixed(2),
    years:Object.fromEntries([...new Set(tr.map(x=>new Date(x.t).getUTCFullYear()))].map(y=>[y,h(x=>new Date(x.t).getUTCFullYear()===y)]))};
}

const out={};
const bh=(a,i)=>1; out.buyHold=portfolio(bh,{tv:9,cap:1});
out.tsmom_sma50_long=portfolio((a,i)=>a[i].c>sma(a,i,50)?1:0);
out.tsmom_sma50_ls=portfolio((a,i)=>a[i].c>sma(a,i,50)?1:-1,{short:true});
out.tsmom_ret28_long=portfolio((a,i)=>a[i].c>a[i-28].c?1:0);
out.tsmom_ret28_ls=portfolio((a,i)=>a[i].c>a[i-28].c?1:-1,{short:true});
out.tsmom_ens_long=portfolio((a,i)=>{ let k=0; for(const n of [10,20,50,100]) k+=a[i].c>sma(a,i,n)?1:0; return k/4; }); // 4 ortalamanın oranı
out.btcFilter_ens_long=portfolio((a,i)=>{ const b=D.BTCUSDT; const j=b.findIndex(x=>x.t===a[i].t); if(j<100) return 0; if(b[j].c<sma(b,j,50)) return 0; let k=0; for(const n of [10,20,50,100]) k+=a[i].c>sma(a,i,n)?1:0; return k/4; });
out.donch20_10_long=donchian(20,10); out.donch20_10_ls=donchian(20,10,{short:true}); out.donch55_20_long=donchian(55,20); out.donch20_10_trend_ls=donchian(20,10,{short:true,trend:true});
out.dca_3x=dca(3); out.dca_5x=dca(5); out.dca_10x=dca(10); out.dca_20x=dca(20); 
const ensB=(a,i)=>{ const b=D.BTCUSDT; const j=b.findIndex(x=>x.t===a[i].t); if(j<100) return 0; if(b[j].c<sma(b,j,50)) return 0; let k=0; for(const n of [10,20,50,100]) k+=a[i].c>sma(a,i,n)?1:0; return k/4; };
for(const tv of [0.8,1.2,1.6]) out['btcFilter_ens_tv'+tv]=portfolio(ensB,{tv,cap:tv*5});
fs.writeFileSync(path.join(__dirname,'backtest-daily.json'),JSON.stringify(out,null,1));
for(const k in out) console.log(k.padEnd(22),JSON.stringify(out[k]));
