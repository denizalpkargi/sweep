// Strateji aileleri karşılaştırması (6 Ekim 2026): neden kaybediyoruz, ne kazandırır?
// Veri: tests/data/*.json (24 coin, 15 dk × 18000 ≈ 6 ay) ve isteğe bağlı tests/data/_leader-trades.json (Binance kopya liderlerinin kapanmış işlemleri, uygulamanın st-lab deposundan).
// Aileler: A) lider tarzı ortalama düşürme (stopsuz, küçük hedef) · B) 4 saatlik Donchian trend takibi · C) günlük zaman serisi momentumu · D) liderleri gecikmeyle kopyalama.
// Maliyet: taker %0,05 + kayma %0,03 her yönde (gidiş-dönüş %0,16). Her ailede iki yarı ayrı. Parametreler önceden seçildi, veriye uydurulmadı.
const fs=require('fs'); const path=require('path');
const DIR=path.join(__dirname,'data'); const COST=0.0016;
const K=a=>a.map(r=>({t:+r[0],o:+r[1],h:+r[2],l:+r[3],c:+r[4],q:+r[7]}));
const coins=fs.readdirSync(DIR).filter(f=>/USDT\.json$/.test(f)).map(f=>{ const d=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8')); return {sym:d.sym,k15:K(d.k15),k1d:K(d.k1d)}; });
const agg=(k,n)=>{ const out=[]; for(let i=0;i+n<=k.length;i+=n){ const s=k.slice(i,i+n); out.push({t:s[0].t,o:s[0].o,h:Math.max(...s.map(x=>x.h)),l:Math.min(...s.map(x=>x.l)),c:s[n-1].c}); } return out; };
const atr=(k,i,n=14)=>{ let s=0; for(let j=i-n+1;j<=i;j++) s+=Math.max(k[j].h-k[j].l,Math.abs(k[j].h-k[j-1].c),Math.abs(k[j].l-k[j-1].c)); return s/n; };
const sma=(a,i,n)=>{ let s=0; for(let j=i-n+1;j<=i;j++) s+=a[j].c; return s/n; };
const T0=Math.min(...coins.map(c=>c.k15[0].t)), T1=Math.max(...coins.map(c=>c.k15[c.k15.length-1].t)), MID=T0+(T1-T0)/2;
const fmt=(v,d=2)=>isFinite(v)?(v>=0?"+":"")+v.toFixed(d):"—";
function summ(name,tr,unit){ const n=tr.length; if(!n){ console.log(name.padEnd(46),'işlem yok'); return; }
  const avg=a=>a.length?a.reduce((x,y)=>x+y.r,0)/a.length:NaN; const h1=tr.filter(x=>x.t<MID), h2=tr.filter(x=>x.t>=MID); const w=tr.filter(x=>x.r>0).length;
  const sd=Math.sqrt(tr.reduce((a,x)=>a+(x.r-avg(tr))**2,0)/Math.max(1,n-1)); const t=avg(tr)/(sd/Math.sqrt(n)); const worst=Math.min(...tr.map(x=>x.r));
  console.log(name.padEnd(46),String(n).padStart(5),('%'+Math.round(w/n*100)).padStart(5),(fmt(avg(tr))+unit).padStart(9),fmt(t,1).padStart(6),(fmt(avg(h1))+' / '+fmt(avg(h2))).padStart(15),(fmt(worst)+unit).padStart(9)); return {n,wr:w/n,avg:avg(tr),t,h1:avg(h1),h2:avg(h2),worst}; }
const head=()=>console.log('Strateji'.padEnd(46),'işlem'.padStart(5),'kaz.'.padStart(5),'ort.'.padStart(9),'t'.padStart(6),'1. / 2. yarı'.padStart(15),'en kötü'.padStart(9));
const OUT={};
console.log(`Dönem ${new Date(T0).toISOString().slice(0,10)} → ${new Date(T1).toISOString().slice(0,10)} · ${coins.length} coin · gidiş-dönüş maliyet %${COST*100}\n`);

/* A) lider tarzı: günlük trend yönünde 24 sa tepesinden %3 geri çekilmede al, −%3 ve −%6'da ekle (1:1:2), ortalamaya +%1,2'de kâr al, stop yok.
   Getiri pozisyonun teminatına göre (kaldıraç L): likidasyon ≈ ortalamaya göre ters hareket ≥ 1/L − %0,5 → teminatın tamamı gider. */
console.log('A) Lider tarzı ortalama düşürme (stopsuz, +%1,2 hedef) · birim: teminata göre % (ROI)'); head();
function leaderStyle(L,stopPct){ const tr=[];
  for(const c of coins){ if(c.sym==='BTCUSDT'&&false) continue; const k=c.k15, d=c.k1d; let di=0; let pos=null;
    for(let i=96;i<k.length;i++){ while(di+1<d.length&&d[di+1].t+864e5<=k[i].t) di++; const up=di>=20&&d[di].c>sma(d,di,20);
      if(pos){ const b=k[i]; const adv=(pos.avg-b.l)/pos.avg; pos.mae=Math.max(pos.mae,adv);
        if(adv>=1/L-0.005){ tr.push({t:pos.t0,r:-100,hold:(b.t-pos.t0)/36e5,liq:true,adds:pos.n}); pos=null; continue; }
        if(stopPct&&adv>=stopPct){ tr.push({t:pos.t0,r:(-stopPct-COST)*L*100*pos.sz/4,hold:(b.t-pos.t0)/36e5,adds:pos.n}); pos=null; continue; }
        for(const [lv,sz] of [[0.03,1],[0.06,2]]){ if(pos.n<(lv===0.03?2:3)&&b.l<=pos.e0*(1-lv)){ const px=pos.e0*(1-lv); pos.avg=(pos.avg*pos.sz+px*sz)/(pos.sz+sz); pos.sz+=sz; pos.n++; } }
        if(b.h>=pos.avg*1.012){ tr.push({t:pos.t0,r:(0.012-COST)*L*100*pos.sz/4,hold:(b.t-pos.t0)/36e5,adds:pos.n,mae:pos.mae}); pos=null; }
        continue; }
      if(!up) continue; let hi=0; for(let j=i-96;j<i;j++) hi=Math.max(hi,k[j].h); if(k[i].c<=hi*0.97){ pos={t0:k[i].t,e0:k[i].c,avg:k[i].c,sz:1,n:1,mae:0}; } } }
  return tr; }
for(const L of [3,10,20]){ const tr=leaderStyle(L,0); const s=summ(`  ${L}x, stopsuz`,tr,'%'); if(s){ s.liq=tr.filter(x=>x.liq).length; console.log('   ','likidasyon',s.liq,'· kazananların medyan tutuşu',(tr.filter(x=>x.r>0).map(x=>x.hold).sort((a,b)=>a-b)[Math.floor(tr.filter(x=>x.r>0).length/2)]||0).toFixed(1),'sa'); OUT['A'+L]=s; } }
{ const s=summ('  10x, ortalamadan −%8 stop',leaderStyle(10,0.08),'%'); OUT.A10s=s; }

/* B) 4 saatlik Donchian: 20 mumluk kırılımda gir (yön serbest), ilk stop 2 ATR, karşı 10 mumluk kanal ya da 3 ATR iz süren stopla çık. R cinsinden. */
console.log('\nB) 4 saatlik Donchian trend takibi · birim: R (ilk risk 2 ATR)'); head();
function donchian(nIn,nOut,dirs){ const tr=[];
  for(const c of coins){ const k=agg(c.k15,16); let pos=null;
    for(let i=Math.max(nIn,20)+1;i<k.length;i++){ const b=k[i];
      if(pos){ const isL=pos.dir==='long'; let lo=Infinity,hi=-Infinity; for(let j=i-nOut;j<i;j++){ lo=Math.min(lo,k[j].l); hi=Math.max(hi,k[j].h); }
        const a=atr(k,i-1); pos.best=isL?Math.max(pos.best,b.h):Math.min(pos.best,b.l); const trail=isL?Math.max(lo,pos.best-3*a,pos.stop):Math.min(hi,pos.best+3*a,pos.stop);
        if(isL?b.l<=trail:b.h>=trail){ const px=isL?Math.min(b.o,trail):Math.max(b.o,trail); tr.push({t:pos.t,r:((isL?px-pos.e:pos.e-px)-COST*pos.e)/pos.risk,dir:pos.dir,hold:(b.t-pos.t)/36e5}); pos=null; }
        continue; }
      let hh=-Infinity,ll=Infinity; for(let j=i-nIn;j<i;j++){ hh=Math.max(hh,k[j].h); ll=Math.min(ll,k[j].l); } const a=atr(k,i-1);
      if(dirs.includes('long')&&b.h>hh){ const e=Math.max(b.o,hh); pos={dir:'long',e,stop:e-2*a,risk:2*a,best:e,t:b.t}; }
      else if(dirs.includes('short')&&b.l<ll){ const e=Math.min(b.o,ll); pos={dir:'short',e,stop:e+2*a,risk:2*a,best:e,t:b.t}; } } }
  return tr; }
{ const tr=donchian(20,10,['long','short']); OUT.B=summ('  20/10, iki yön',tr,'R'); summ('    yalnız longlar',tr.filter(x=>x.dir==='long'),'R'); summ('    yalnız shortlar',tr.filter(x=>x.dir==='short'),'R'); }
OUT.BL=summ('  20/10, yalnız long (ayrı koşu)',donchian(20,10,['long']),'R');
summ('  55/20, iki yön (Turtle 2)',donchian(55,20,['long','short']),'R');

/* C) günlük zaman serisi momentumu: her gün kapanışta, coin 20 günlük SMA üstündeyse long, altındaysa short, ertesi gün tut. Birim: günlük % (kaldıraçsız). */
console.log('\nC) Günlük zaman serisi momentumu (SMA20 üstü long / altı short) · birim: günlük %'); head();
{ const tr=[], trL=[]; for(const c of coins){ const d=c.k1d.filter(x=>x.t>=T0-30*864e5); for(let i=21;i<d.length-1;i++){ const s=d[i].c>sma(d,i,20)?1:-1; const r=s*(d[i+1].c/d[i].c-1)*100-(i>21&&((d[i-1].c>sma(d,i-1,20)?1:-1)!==s)?COST*100:0); if(d[i+1].t<T0) continue; tr.push({t:d[i+1].t,r}); if(s>0) trL.push({t:d[i+1].t,r}); } }
  OUT.C=summ('  iki yön',tr,'%'); summ('  yalnız long günleri',trL,'%'); }

/* D) liderleri kopyalama: lider işlemine 15 dk (bir mum) ve 60 dk gecikmeyle aynı yönde gir, liderin kapanış anında çık. Birim: kaldıraçsız fiyat hareketi %. */
const LT=path.join(DIR,'_leader-trades.json');
if(fs.existsSync(LT)){ const lt=JSON.parse(fs.readFileSync(LT,'utf8')); const by={}; for(const c of coins) by[c.sym]=c.k15;
  console.log('\nD) Liderleri kopyalama (aynı coin, aynı yön, liderin kapanışında çık) · birim: kaldıraçsız %'); head();
  const at=(k,t)=>{ let lo=0,hi=k.length-1; while(lo<hi){ const m=(lo+hi)>>1; if(k[m].t<t) lo=m+1; else hi=m; } return lo; };
  const lead=[], d15=[], d60=[];
  for(const x of lt){ const k=by[x.sym]; if(!k||x.open<k[0].t||x.close>k[k.length-1].t+9e5) continue; const sg=x.dir==='long'?1:-1;
    lead.push({t:x.open,r:sg*(x.exit/x.entry-1)*100});
    for(const [arr,dl] of [[d15,9e5],[d60,36e5]]){ const i=at(k,x.open+dl), j=at(k,x.close); if(i>=k.length||j<=i) continue; arr.push({t:x.open,r:sg*(k[j].o/k[i].o-1)*100-COST*100}); } }
  OUT.Dlead=summ('  liderin kendi sonucu (maliyetsiz)',lead,'%'); OUT.D15=summ('  15 dk gecikmeyle kopya',d15,'%'); OUT.D60=summ('  60 dk gecikmeyle kopya',d60,'%'); }
fs.writeFileSync(path.join(__dirname,'backtest-families.json'),JSON.stringify(OUT,null,1));
