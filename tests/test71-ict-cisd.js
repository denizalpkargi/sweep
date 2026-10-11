// Test #71 · ICT akışı: HTF bias → (IRL>ERL | ERL>IRL) → stop hunt → CISD → 2R (11 Ekim 2026; kullanıcı smokegtrades reel şemasını sordu).
// Mekanik yorum (long; short aynası):
//  HTF bias (günlük, yalnız kapanmış günler):
//    "ict"  : dün önceki günün tepesinin üstünde kapandıysa long, dibinin altında kapandıysa short, arası bias yok (ICT günlük bias anlatımı)
//    "sma"  : dünkü kapanış günlük SMA50'nin üstünde → long, altında → short
//    "yok"  : bias yok, iki yön de (bias'ın katkısını ölçmek için)
//  Stop hunt: bias yönüne ters likiditenin alınması, yürütme zaman diliminde (15 dk ya da 1 sa).
//    ERL (dış likidite): önceki UTC günün dibi ya da son 192 mumda onaylı (3+3) swing dibi; seviye alınmamış olmalı; mumun dibi seviyenin altına iner.
//    IRL (iç likidite): fiyat 1 sa'lik doldurulmamış yükseliş FVG'sinin içindeyken (iskontodaki iç bölge) son 48 mumdaki onaylı 2+2 swing dibi alınır.
//    Şemadaki iki kol: ERL>IRL = dış likidite alınır, fiyat içeri döner; IRL>ERL = iç bölgede (FVG) stop alınıp dışa (karşı tepeye) gidilir.
//  CISD (teslimat durumunun değişmesi): süpürme dibine götüren ardışık düşüş mumları dizisinin ilk mumunun açılışı; bir mum bunun üstünde kapanınca onay.
//    Süpürmeden sonra en çok 16 mum; bu sürede daha derin dip olursa uç ve CISD seviyesi yeniden hesaplanır.
//  Giriş: "market" = CISD mumundan sonraki mumun açılışı (taker + kayma); "limit" = CISD seviyesine geri dönüş, fiyat limiti %0,05 geçmeli, 16 mum açık,
//    dolumdan önce 2R görülürse iptal (maker).
//  Stop: süpürme ucu − %0,1. Hedef: 2R (varyant 1R / 3R). Zaman çıkışı 96 mum. Aynı mumda stop + hedef → stop. Taker %0,05 + kayma %0,03, maker %0,02, fonlama.
//  Rastgele kıyas: aynı coin, aynı yön, ±30 günde rastgele mum, aynı stop ve hedef uzaklığı, aynı süre sınırı (sm-lib randomTwin, 3 çekiliş).
// Veri: tests/data/sm/15m (tests/sm-fetch.js: 20 uzun ömürlü likit perp, 2020-01 → bugün; hayatta kalanlar, delist yok).
// Kullanım: node tests/test71-ict-cisd.js → tests/test71-ict-cisd-report.md
const fs=require('fs'), path=require('path');
const S=require('./sm-lib');
const SYMS=(process.env.SYMS||'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,LINKUSDT,LTCUSDT,DOTUSDT,AVAXUSDT,BCHUSDT,ETCUSDT,TRXUSDT,XLMUSDT,ATOMUSDT,FILUSDT,UNIUSDT,NEARUSDT,AAVEUSDT').split(',');
// sm-lib'den (dışa aktarılmıyor): rastgele kıyas
function rng(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
function randomTwin(d,tr0,sig,R,k=3,opt={}){ const res=[]; const span=Math.round(30*864e5/(d.t[1]-d.t[0]));
  for(let a=0;a<k;a++){ for(let tries=0;tries<10;tries++){ const i=Math.max(60,Math.min(d.n-3,tr0.ei-1+Math.round((R()*2-1)*span))); const raw=d.o[i+1]; const sd=Math.abs(sig.entryRef-sig.stop)/sig.entryRef;
      const tpd=sig.tp!=null?Math.abs(sig.tp-sig.entryRef)/sig.entryRef:null; const s={i,dir:tr0.dir,stop:raw*(1-tr0.dir*sd),tp:tpd!=null?raw*(1+tr0.dir*tpd):null,maxBars:Math.max(1,tr0.bars+1)};
      const r=S.runTrade(d,s,i+1,opt); if(r){ res.push(r.R); break; } } }
  return res; }
const DAY=864e5, THRU=0.0005, BUF=0.001;

function agg(d,P){ const n=d.n, o=[]; let cur=null; for(let i=0;i<n;i++){ const b=Math.floor(d.t[i]/P)*P;
    if(!cur||cur.t!==b){ if(cur) o.push(cur); cur={t:b,o:d.o[i],h:d.h[i],l:d.l[i],c:d.c[i],v:d.v[i],q:d.q[i],tb:d.tb[i]}; }
    else { if(d.h[i]>cur.h) cur.h=d.h[i]; if(d.l[i]<cur.l) cur.l=d.l[i]; cur.c=d.c[i]; cur.v+=d.v[i]; cur.q+=d.q[i]; cur.tb+=d.tb[i]; } }
  if(cur) o.push(cur);
  const m=o.length, x={sym:d.sym,n:m,t:new Float64Array(m),o:new Float64Array(m),h:new Float64Array(m),l:new Float64Array(m),c:new Float64Array(m),v:new Float64Array(m),q:new Float64Array(m),tb:new Float64Array(m),fund:d.fund};
  o.forEach((b,i)=>{ x.t[i]=b.t; x.o[i]=b.o; x.h[i]=b.h; x.l[i]=b.l; x.c[i]=b.c; x.v[i]=b.v; x.q[i]=b.q; x.tb[i]=b.tb; }); return x; }
// fiyatları −1 ile çevir (short = long uzayında ayna)
function mirror(d){ const n=d.n, m={...d,o:new Float64Array(n),h:new Float64Array(n),l:new Float64Array(n),c:new Float64Array(n)};
  for(let i=0;i<n;i++){ m.o[i]=-d.o[i]; m.h[i]=-d.l[i]; m.l[i]=-d.h[i]; m.c[i]=-d.c[i]; } return m; }

// günlük bias dizisi: her yürütme mumu için +1/−1/0 (yalnız kapanmış günler)
function biasOf(d,D,mode){ const dayIdx=new Map(); for(let i=0;i<D.n;i++) dayIdx.set(D.t[i],i);
  const sma=S.sma(Array.from(D.c),50); const out=new Int8Array(d.n);
  for(let i=0;i<d.n;i++){ const di=dayIdx.get(Math.floor(d.t[i]/DAY)*DAY); if(di==null||di<2){ continue; } const y=di-1, p=di-2;
    if(mode==='yok') out[i]=2; // iki yön
    else if(mode==='ict') out[i]=D.c[y]>D.h[p]?1:D.c[y]<D.l[p]?-1:0;
    else out[i]=isNaN(sma[y])?0:(D.c[y]>sma[y]?1:-1); }
  return out; }

// long uzayında kurulumlar. allow[i] true ise o mumda long kurulum aranır.
function setups(k,allow,H1,k15PerH){
  const n=k.n, out=[];
  // önceki gün dibi
  const dayLow=new Float64Array(n).fill(NaN); { let curD=-1, prevLow=NaN, low=Infinity; for(let i=0;i<n;i++){ const dd=Math.floor(k.t[i]/DAY); if(dd!==curD){ if(curD>=0) prevLow=low; low=Infinity; curD=dd; } dayLow[i]=prevLow; if(k.l[i]<low) low=k.l[i]; } }
  // 1 sa yükseliş FVG'leri (long uzayında): mum b-2 tepesi < mum b dibi; aktif [top,bot]; fiyat altına kapanınca biter
  const fvgAt=new Uint8Array(n); { const act=[]; let hi=0; const hT=H1.t;
    for(let i=0;i<n;i++){ const hb=Math.floor(k.t[i]/k15PerH)*k15PerH; // bu 15 dk mumu hangi saatte; o saatten önce kapanmış FVG'ler bilinir
      while(hi<H1.n&&hT[hi]+k15PerH<=hb){ if(hi>=2&&H1.h[hi-2]<H1.l[hi]) act.push({lo:H1.h[hi-2],hi:H1.l[hi],h:hi}); hi++; }
      for(let z=act.length-1;z>=0;z--){ if(k.c[i]<act[z].lo||hi-act[z].h>500) act.splice(z,1); }
      for(const f of act){ if(k.l[i]<=f.hi&&k.l[i]>=f.lo){ fvgAt[i]=1; break; } } } }
  // swing dipleri: 3+3 (ERL) ve 2+2 (IRL)
  const sw=(kk)=>{ const s=[]; for(let i=kk;i<n-kk;i++){ let ok=true; for(let j=1;j<=kk;j++) if(!(k.l[i]<k.l[i-j]&&k.l[i]<=k.l[i+j])){ ok=false; break; } if(ok) s.push(i); } return s; };
  const s3=sw(3), s2=sw(2);
  let busy=-1, p3=0, p2=0; const act3=[], act2=[];
  for(let i=200;i<n-2;i++){
    while(p3<s3.length&&s3[p3]+3<i){ act3.push(s3[p3]); p3++; } while(p2<s2.length&&s2[p2]+2<i){ act2.push(s2[p2]); p2++; }
    // alınmış ya da eski seviyeleri at
    for(let z=act3.length-1;z>=0;z--){ const j=act3[z]; if(i-j>192||k.l[i-1]<k.l[j]) act3.splice(z,1); }
    for(let z=act2.length-1;z>=0;z--){ const j=act2[z]; if(i-j>48||k.l[i-1]<k.l[j]) act2.splice(z,1); }
    if(i<=busy||!allow[i]) continue;
    // süpürme türü
    let kind=null, lvl=NaN;
    const pdl=dayLow[i]; let pdlTaken=false; if(!isNaN(pdl)){ for(let j=i-1;j>=0&&Math.floor(k.t[j]/DAY)===Math.floor(k.t[i]/DAY);j--) if(k.l[j]<pdl){ pdlTaken=true; break; } }
    if(!isNaN(pdl)&&!pdlTaken&&k.l[i]<pdl){ kind='ERL'; lvl=pdl; }
    if(!kind){ for(const j of act3) if(k.l[i]<k.l[j]){ kind='ERL'; lvl=k.l[j]; break; } }
    if(!kind&&fvgAt[i]){ for(const j of act2) if(k.l[i]<k.l[j]){ kind='IRL'; lvl=k.l[j]; break; } }
    if(!kind) continue;
    // CISD
    let low=k.l[i], lowI=i, cis=-1, lvlC=NaN;
    const cisdLevel=(li)=>{ let j=li; // dibi yapan mum ya da hemen öncesindeki düşüş dizisi
      while(j>0&&!(k.c[j]<k.o[j])&&li-j<3) j--; if(!(k.c[j]<k.o[j])) return NaN; while(j>0&&k.c[j-1]<k.o[j-1]) j--; return k.o[j]; };
    lvlC=cisdLevel(lowI);
    for(let j=i+1;j<Math.min(n-1,i+17);j++){
      if(k.l[j]<low){ low=k.l[j]; lowI=j; lvlC=cisdLevel(lowI); }
      if(!isNaN(lvlC)&&k.c[j]>lvlC&&k.c[j]>k.o[j]){ cis=j; break; } }
    if(cis<0) { continue; }
    out.push({i:cis,kind,lvl,low,lowI,cisd:lvlC,sweepI:i}); busy=cis+16;
  }
  return out;
}

function runAll(iv,biasMode,entry,tpR){
  const trades=[]; const R=rng(777);
  for(const sym of SYMS){
    const d0=S.load(sym,'15m'); if(!d0) continue;
    const d=iv==='15m'?d0:agg(d0,36e5); const D=agg(d0,DAY); const H1=iv==='15m'?agg(d0,36e5):d;
    const bias=biasOf(d,D,biasMode);
    for(const dir of [1,-1]){
      const k=dir>0?d:mirror(d); const Hk=dir>0?H1:mirror(H1);
      const allow=new Uint8Array(d.n); for(let i=0;i<d.n;i++) allow[i]=bias[i]===2||bias[i]===dir?1:0;
      const per=iv==='15m'?36e5:36e5;
      const ss=setups(k,allow,Hk,per);
      let busy=-1;
      for(const s of ss){ if(s.i<=busy) continue;
        // gerçek fiyat uzayına çevir
        const sg=dir; const stopL=s.low-Math.abs(s.low)*BUF; // long uzayında
        let sig, ei;
        if(entry==='market'){ ei=s.i+1; if(ei>=d.n) continue; const e=Math.abs(k.o[ei]); const st=Math.abs(stopL); const r=Math.abs(e-st);
          sig={i:s.i,dir,stop:st,tp:e+dir*tpR*r,maxBars:96};
          if(dir>0?!(st<e):!(st>e)) continue;
        } else { // limit CISD seviyesine
          const L=s.cisd, thr=L-Math.abs(L)*THRU; const r=L-stopL; if(!(r>0)) continue; const tp=L+tpR*r; ei=-1;
          for(let j=s.i+1;j<Math.min(d.n,s.i+17);j++){ if(k.l[j]<=thr){ ei=j; break; } if(k.h[j]>=tp) break; }
          if(ei<0) continue;
          sig={i:ei-1,dir,stop:Math.abs(stopL),tp:Math.abs(tp),maxBars:96,fixEntry:Math.abs(L),limitBar:ei};
        }
        const tr=limitTrade(d,sig,ei); if(!tr) continue;
        sig.entryRef=sig.fixEntry??d.o[ei];
        const rr=randomTwin(d,tr,{...sig,entryRef:sig.fixEntry??d.o[ei]},R,3,{makerTp:false});
        tr.rnd=rr.length?rr.reduce((a,b)=>a+b,0)/rr.length:NaN; tr.kind=s.kind; tr.stopPct=Math.abs(sig.stop-sig.entryRef)/sig.entryRef;
        // brüt (maliyetsiz)
        const g=limitTrade(d,sig,ei,{cost:1e-9}); tr.gross=g?g.R:NaN;
        trades.push(tr); busy=tr.xi;
      }
    }
  }
  trades.sort((a,b)=>a.t-b.t); return trades;
}
// limit girişte, dolum mumunda stop görüldüyse stop (kötümser); aksi runTrade
function limitTrade(d,sig,ei,opt={}){
  if(sig.fixEntry!=null){ const cm=opt.cost??1; const e=sig.fixEntry, dir=sig.dir;
    if(dir>0?d.l[ei]<=sig.stop:d.h[ei]>=sig.stop){ const px=sig.stop*(1-dir*0.0003*cm); const R=(dir*(px-e)/e-0.0002*cm-0.0005*cm)/(Math.abs(e-sig.stop)/e);
      return {sym:d.sym,t:d.t[ei],tx:d.t[ei],ei,xi:ei,dir,R,ret:R*Math.abs(e-sig.stop)/e,risk:Math.abs(e-sig.stop)/e,why:'stop',bars:0}; }
    if(ei+1>=d.n) return null; const r=S.runTrade(d,{...sig},ei+1,{...opt,cost:cm,makerTp:true}); if(r){ r.ei=ei; r.t=d.t[ei]; r.bars+=1; } return r; }
  return S.runTrade(d,sig,ei,{cost:opt.cost??1});
}

const SPLIT=Date.UTC(2023,4,15), L12=Date.UTC(2025,9,11);
const f3=x=>isNaN(x)?'—':(x>=0?'+':'')+x.toFixed(3).replace('.',',');
function st(ts,key='R'){ return S.stats(ts,key); }
function row(name,T){ const a=st(T),h1=st(T.filter(t=>t.t<SPLIT)),h2=st(T.filter(t=>t.t>=SPLIT)),l=st(T.filter(t=>t.t>=L12)),r=st(T,'rnd'),g=st(T,'gross');
  const win=T.filter(t=>t.R>0).length/(T.length||1); const diff=T.map(t=>({t:t.t,R:t.R-t.rnd})).filter(x=>!isNaN(x.R)); const dd=S.stats(diff);
  return `| ${name} | ${T.length} | ${(win*100).toFixed(0)} % | ${f3(a.m)} | ${f3(h1.m)} | ${f3(h2.m)} | ${f3(l.m)} | ${f3(r.m)} | ${f3(dd.m)} (t ${isNaN(dd.t)?'—':dd.t.toFixed(1).replace('.',',')}) | ${f3(g.m)} |`; }
const HDR='| Varyant | İşlem | Kazanma | R | 1. yarı | 2. yarı | Son 12 ay | Rastgele | Fark (aylık t) | Brüt R |\n|---|---|---|---|---|---|---|---|---|---|';

(async()=>{
  const lines=['# Test #71 · ICT: HTF bias → stop hunt → CISD → 2R','',`Üretildi ${new Date().toISOString().slice(0,16)} UTC. 20 likit perp (hayatta kalanlar), 15 dk 2020-01 → bugün, maliyet + fonlama dahil. Rastgele = aynı coin/yön, ±30 gün rastgele giriş, aynı stop/hedef uzaklığı.`,''];
  const runs=[]; const main={};
  const plan=[]; for(const iv of ['15m','1h']) for(const b of ['ict','sma','yok']) for(const e of ['market','limit']) plan.push([iv,b,e,2]);
  plan.push(['15m','ict','market',1],['15m','ict','market',3],['1h','ict','market',1],['1h','ict','market',3]);
  lines.push('## Ana tablo (hedef 2R)','',HDR);
  const extra=['','## Hedef 1R / 3R (ICT bias, market)','',HDR];
  for(const [iv,b,e,tp] of plan){ const t0=Date.now(); const T=runAll(iv,b,e,tp); const name=`${iv} · bias ${b} · ${e} · ${tp}R`; main[name]=T;
    (tp===2?lines:extra).push(row(name,T)); console.log(name,T.length,((Date.now()-t0)/1000).toFixed(0)+'sn'); }
  lines.push(...extra);
  // kırılımlar ana varyantlarda
  for(const key of ['15m · bias ict · market · 2R','1h · bias ict · market · 2R']){ const T=main[key];
    lines.push('',`## Kırılım: ${key}`,'',HDR);
    lines.push(row('ERL > IRL (dış likidite süpürmesi)',T.filter(t=>t.kind==='ERL')), row('IRL > ERL (FVG içinde iç süpürme)',T.filter(t=>t.kind==='IRL')));
    lines.push(row('long',T.filter(t=>t.dir>0)), row('short',T.filter(t=>t.dir<0)));
    for(const [a,b,nm] of [[0,0.005,'stop < %0,5'],[0.005,0.01,'stop %0,5–1'],[0.01,0.02,'stop %1–2'],[0.02,1,'stop ≥ %2']]) lines.push(row(nm,T.filter(t=>t.stopPct>=a&&t.stopPct<b)));
    const years={}; for(const t of T){ const y=new Date(t.t).getUTCFullYear(); (years[y]=years[y]||[]).push(t); }
    for(const y of Object.keys(years).sort()) lines.push(row(String(y),years[y]));
    const coins={}; for(const t of T) (coins[t.sym]=coins[t.sym]||[]).push(t); const cm=Object.entries(coins).map(([s,a])=>[s,st(a).m]); const pos=cm.filter(x=>x[1]>0).length;
    lines.push('',`Coin coin: ${pos}/${cm.length} artı; ${cm.sort((a,b)=>b[1]-a[1]).map(([s,m])=>s.replace('USDT','')+' '+f3(m)).join(', ')}`);
  }
  fs.writeFileSync(path.join(__dirname,'test71-ict-cisd-report.md'),lines.join('\n')+'\n'); console.log('rapor yazıldı');
})();
