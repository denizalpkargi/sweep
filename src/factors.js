/* ---------- Faktör kütüphanesi ve faktör analisti Kaan (masanın on üçüncü üyesi, 6 Ekim 2026) ----------
   Araştırma ekibinin (strateji taraması: /arastirma/strateji-taramasi/test-listesi.md) bulduğu kuralların puan faktörü hâli.
   Her faktör TEK BİR YERDE tanımlanır: FACTORS listesine {id, ad, kaynak, veri, fn} eklemek yeterlidir. fn(x, dir) şunu döndürür:
     {v: −1..+1 (bu yön için), c: 0..1 (güven), txt} ya da null (koşul yok / veri yok → çekimser, puana girmez).
   x = facCtx(A): {k: 15 dk mumlar, d: günlük mumlar (bugünün açık mumu dahil), btcD: BTC günlük, btc: BTC 15 dk, now, px, fund, fundHist, oi5}.
   Canlıda x committee() içinde A'dan kurulur; geriye dönük testte tests/research-factors.js aynı x'i geçmiş mumlardan kurar (bakış ileri yok).
   Ölçüm: node tests/research-factors.js → her faktörün iki yarıda bilgi katsayısı (IC: v·c ile 4 saatte önce ±1 ATR sonucu), "evet"
   dediğinde isabet ve botun planıyla R'si; sonuç tests/factor-fit.json ve FAC_FIT. Durum:
     aktif     iki yarıda da IC > 0 ve evet isabeti tabanın üstünde → Kaan'ın oyuna girer, ağırlık 1 + 40·IC (0,5–2)
     izlemede  ölçüldü ama tutmadı ya da geçmiş verisi yok (fonlama, OI) → oy vermez; tahmin defterine yine yazılır
   Tahmin defteri (forecast.js) her faktörün görüşünü "f:<id>" adıyla kaydeder; ≥200 canlı tahminde beceri artıysa izlemedeki faktör de
   küçük ağırlıkla (fcMult − 1) oya girer, aktif faktörün ağırlığı fcMult ile çarpılır. Yeni faktör: FACTORS'a ekle, research-factors.js'i
   çalıştır, FAC_FIT'e sonucunu yaz; tests/factor-test.js her faktörün çekimser/oy sözleşmesini sınar. */
const FAC_UTC_H=t=>new Date(t).getUTCHours();
function facCtx(A, opts){
  opts=opts||{}; const k=A&&A.src&&A.src.k15L||[]; const last=k[k.length-1];
  const now=opts.now||(last?Math.min(Date.now(),last.t+9e5):Date.now());
  const bc=(typeof btcCache!=="undefined"&&btcCache)?btcCache:null;
  return {k,d:A&&A.src&&A.src.k1d||[],btcD:opts.btcD||(bc&&bc.d)||null,btc:A&&A.src&&A.src.btc15||null,now,px:A?A.px:NaN,fund:A?A.fund:NaN,fundHist:A&&A.fundHist||[],oi5:A&&A.oi5||null};
}
// yardımcılar: kapanmış günler (bugün hariç) ve bugünün mumu
function facDays(x){ const day0=Math.floor(x.now/864e5-1e-9)*864e5; const d=x.d||[]; const closed=d.filter(c=>c.t<day0); const today=d.find(c=>c.t===day0)||null; return {closed,today,day0}; }
const FACTORS=[
  {id:"night",ad:"Gece saati",kaynak:"test listesi #7 (Quantpedia: BTC 22–00 UTC)",veri:"15 dk",
    fn(x,dir){ const h=FAC_UTC_H(x.now); if(h!==22&&h!==23) return null; const v=dir==="long"?0.6:-0.6; return {v,c:0.6,txt:`saat ${h}:00 UTC, gece penceresi (long eğilimi)`}; }},
  {id:"monday",ad:"Pazartesi Asya açılışı",kaynak:"test listesi #8 (Concretum)",veri:"15 dk",
    fn(x,dir){ const t=x.now; const wd=new Date(t).getUTCDay(), h=FAC_UTC_H(t); const s=wd===1&&h<23?Math.floor(t/864e5)*864e5-3600e3:wd===0&&h>=23?Math.floor(t/864e5)*864e5+23*3600e3:null; if(s==null) return null;
      const k=x.k; let i0=k.findIndex(c=>c.t>=s); if(i0<0||k.length-i0<4) return null; const atr=atrAt(k,k.length,14); if(!(atr>0)) return null; const m=(x.px-k[i0].o)/atr; if(Math.abs(m)<0.5) return null;
      const v=(dir==="long"?1:-1)*Math.sign(m)*Math.min(1,Math.abs(m)/3)*0.8; return {v,c:0.5,txt:`pazartesi penceresi: açılıştan bu yana ${m>0?"+":""}${fx(m,1)} ATR (yön devam eder)`}; }},
  {id:"hi10",ad:"10 günlük kapanış kırılımı",kaynak:"test listesi #9",veri:"günlük",
    fn(x,dir){ const {closed}=facDays(x); if(closed.length<11) return null; const c=closed.slice(-10).map(z=>z.c); const hi=Math.max(...c), lo=Math.min(...c);
      const s=x.px>hi?1:x.px<lo?-1:0; if(!s) return null; return {v:(dir==="long"?s:-s)*0.7,c:0.6,txt:s>0?`fiyat 10 günlük en yüksek kapanışın (${fmtP(hi)}) üstünde`:`fiyat 10 günlük en düşük kapanışın (${fmtP(lo)}) altında`}; }},
  {id:"btc200",ad:"BTC 200 günlük ortalama",rejim:true,kaynak:"test listesi #3 (Tudor Jones)",veri:"BTC günlük",
    fn(x,dir){ const b=x.btcD; if(!b||!x.btc||!x.btc.length) return null; const day0=Math.floor(x.now/864e5-1e-9)*864e5; const cl=b.filter(c=>c.t<day0).map(c=>c.c); if(cl.length<200) return null;
      const m=sma(cl,200), bp=x.btc[x.btc.length-1].c; const s=bp>m?1:-1; return {v:(dir==="long"?s:-s)*0.5,c:0.5,txt:`BTC ${fmtP(bp)} 200 günlük ortalamanın (${fmtP(m)}) ${s>0?"üstünde":"altında"}`}; }},
  {id:"wvb",ad:"Williams volatilite kırılımı",kaynak:"test listesi #4 (Larry Williams)",veri:"günlük",
    fn(x,dir){ const {closed,today}=facDays(x); if(!today||closed.length<2) return null; const p=closed[closed.length-1]; const R=p.h-p.l; if(!(R>0)) return null;
      const s=x.px>today.o+0.5*R?1:x.px<today.o-0.5*R?-1:0; if(!s) return null; return {v:(dir==="long"?s:-s)*0.7,c:0.6,txt:`gün açılışından ${s>0?"yukarı":"aşağı"} dünkü aralığın yarısından fazla gitti`}; }},
  {id:"nr7",ad:"Sıkışma kırılımı (NR7)",kaynak:"test listesi #5 (Kovner)",veri:"günlük",
    fn(x,dir){ const {closed}=facDays(x); if(closed.length<8) return null; const L=closed.slice(-7); const r=L.map(c=>c.h-c.l); const p=L[6]; if(r[6]>Math.min(...r)) return null;
      const s=x.px>p.h?1:x.px<p.l?-1:0; if(!s) return null; return {v:(dir==="long"?s:-s)*0.7,c:0.6,txt:`dün 7 günün en dar günüydü, fiyat ${s>0?"tepesini":"dibini"} kırdı`}; }},
  {id:"rev4",ad:"4 saatlik aşırı uzama",kaynak:"zaman-dilimi-hacim araştırması (artan hacimli hareketler 4 saatte geri veriyor)",veri:"15 dk",
    fn(x,dir){ const k=x.k; const n=k.length; if(n<40) return null; const atr=atrAt(k,n,14); if(!(atr>0)) return null; const r=(x.px-k[n-17].c)/atr; if(Math.abs(r)<3) return null;
      const s=-Math.sign(r); return {v:(dir==="long"?s:-s)*Math.min(1,(Math.abs(r)-2)/3)*0.7,c:0.5,txt:`son 4 saatte ${r>0?"+":""}${fx(r,1)} ATR: aşırı uzama, geri verme beklenir`}; }},
  {id:"btclead",ad:"BTC öncülüğü",kaynak:"araştırma ekibi (BTC hareketi, coin geride)",veri:"15 dk + BTC 15 dk",
    fn(x,dir){ const k=x.k, b=x.btc; if(!b||b.length<40||k.length<40) return null; const n=k.length, m=b.length; const ba=atrAt(b,m,14), ca=atrAt(k,n,14); if(!(ba>0&&ca>0)) return null;
      const bR=(b[m-1].c-b[m-5].c)/ba, cR=(k[n-1].c-k[n-5].c)/ca; const s=bR>=1.5&&cR<0.5?1:bR<=-1.5&&cR>-0.5?-1:0; if(!s) return null;
      return {v:(dir==="long"?s:-s)*0.6,c:0.5,txt:`BTC son 1 saatte ${bR>0?"+":""}${fx(bR,1)} ATR, coin ${cR>0?"+":""}${fx(cR,1)} ATR: coin geride, yetişmesi beklenir`}; }},
  {id:"rng24",ad:"24 saatlik aralıkta yer",kaynak:"Burak'ın kaçınılacak kalıbı (aralığın ucunda kovalama)",veri:"15 dk",
    fn(x,dir){ const k=x.k; const n=k.length; if(n<100) return null; const w=k.slice(n-96); const hi=Math.max(...w.map(c=>c.h)), lo=Math.min(...w.map(c=>c.l)); if(!(hi>lo)) return null;
      const pos=(x.px-lo)/(hi-lo); if(Math.abs(pos-0.5)<0.35) return null; const s=pos>0.5?-1:1; return {v:(dir==="long"?s:-s)*0.5,c:0.5,txt:`fiyat 24 saatlik aralığın ${pos>0.5?"tepesinde":"dibinde"} (%${Math.round(pos*100)}): ucu kovalamak yerine ters yön`}; }},
  {id:"liqwave",ad:"Likidasyon dalgası",kaynak:"test listesi #10",veri:"canlı OI (5 dk)",
    fn(x,dir){ const o=(x.oi5||[]).map(z=>+(z&&z.sumOpenInterestValue!=null?z.sumOpenInterestValue:z)).filter(v=>v>0); if(o.length<7) return null; const now=o[o.length-1], mx=Math.max(...o.slice(-7));
      const dd=now/mx-1; if(dd>-0.05) return null; return {v:-0.6,c:0.8,txt:`OI 30 dakikada ${pct(dd*100)}: likidasyon dalgası, 30 dk giriş yok`}; }},
  {id:"fundz",ad:"Aşırı fonlama (±2σ)",kaynak:"test listesi #11",veri:"canlı fonlama geçmişi",
    fn(x,dir){ const h=(x.fundHist||[]).filter(isFinite); if(h.length<6||!isFinite(x.fund)) return null; const m=h.reduce((a,b)=>a+b,0)/h.length; const sd=Math.sqrt(h.reduce((a,b)=>a+(b-m)**2,0)/h.length); if(!(sd>0)) return null;
      const z=(x.fund-m)/sd; if(Math.abs(z)<2) return null; const s=-Math.sign(z); return {v:(dir==="long"?s:-s)*0.6,c:0.5,txt:`fonlama ${fx(x.fund*100,4)}% (son 9 dönemin ${z>0?"+":""}${fx(z,1)}σ): kalabalığın tersi`}; }}
];
/* tests/research-factors.js sonucu (6 Ekim 2026, 24 coin, 1 Nis–6 Eki 2026, saatte bir, iki yönde; ölçü: 4 saatte önce ±1 ATR).
   ic1/ic2: iki yarının bilgi katsayısı; st: aktif | izlemede; w: oy ağırlığı. Yeniden ölçünce bu tablo güncellenir. */
const FAC_FIT={
  night:{st:"izlemede",w:0,ic1:-0.0177,ic2:0.0231,y1:0.466,y2:0.537,n:7248},
  monday:{st:"izlemede",w:0,ic1:-0.0163,ic2:0.0071,y1:0.474,y2:0.506,n:9213},
  hi10:{st:"aktif",w:1.55,ic1:0.0205,ic2:0.0071,y1:0.516,y2:0.503,n:22601},
  btc200:{st:"aktif",w:1,ic1:0.0631,ic2:0.0224,y1:0.528,y2:0.508,n:86760},
  wvb:{st:"izlemede",w:0,ic1:-0.0218,ic2:0.0144,y1:0.474,y2:0.512,n:18947},
  nr7:{st:"izlemede",w:0,ic1:-0.0053,ic2:0.0013,y1:0.486,y2:0.5,n:5224},
  rev4:{st:"izlemede",w:0,ic1:0.0135,ic2:0.0012,y1:0.512,y2:0.496,n:12643},
  btclead:{st:"izlemede",w:0,ic1:-0.0075,ic2:-0.005,y1:0.477,y2:0.485,n:4470},
  rng24:{st:"izlemede",w:0,ic1:0.004,ic2:-0.0054,y1:0.5,y2:0.49,n:20850},
  liqwave:{st:"izlemede",w:0,ic1:0,ic2:0,y1:null,y2:null,n:0},
  fundz:{st:"izlemede",w:0,ic1:0,ic2:0,y1:null,y2:null,n:0}};
const FAC_ST=id=>(FAC_FIT[id]&&FAC_FIT[id].st)||"izlemede";
// canlı ağırlık: ölçüm × tahmin defteri. İzlemedeki faktör ≥200 canlı tahminde beceri artıysa küçük ağırlıkla oya girer.
function facWeight(id){ const f=FAC_FIT[id]; const L=(typeof FC!=="undefined"&&FC&&FC.learn)?FC.learn.agents["f:"+id]:null; const m=L?L.m:1;
  if(f&&f.st==="aktif") return +(f.w*m).toFixed(3); if(L&&L.n>=200&&m>1) return +(m-1).toFixed(3); return 0; }
// tüm faktörler: {id:{v,c,txt,w}} (yalnız oy verenler), oy ve güven; çekimserse null
function facRead(x, dir){ const out={}; for(const F of FACTORS){ let r=null; try{ r=F.fn(x,dir); }catch(e){ r=null; } if(r&&isFinite(r.v)) out[F.id]={v:clamp(r.v,-1,1),c:clamp(r.c,0,1),txt:r.txt,w:facWeight(F.id)}; } return out; }
function facMember(A, dir, opts){
  const x=facCtx(A,opts); const R=facRead(x,dir); const ids=Object.keys(R); const nm=id=>(FACTORS.find(f=>f.id===id)||{}).ad||id;
  let num=0,den=0,nAct=0; for(const id of ids){ const r=R[id]; if(!(r.w>0)) continue; num+=r.w*r.v*r.c; den+=r.w*r.c; nAct++; }
  const watch=ids.filter(id=>!(R[id].w>0));
  if(!nAct){ return {abst:true,v:0,c:0,f:R,txt:ids.length?`yalnız izlemedeki faktörler: ${ids.map(nm).join(", ")} · çekimser`:"faktörlerin hiçbiri koşulda değil · çekimser",
    say:ids.length?`Faktörlerden ${ids.map(nm).join(", ")} koşulda ama hiçbiri geçmişte iki yarıda tutmadı; kayda geçiyorum, oy vermiyorum.`:`Kütüphanedeki ${FACTORS.length} faktörün hiçbiri şu an koşulda değil; çekimserim.`}; }
  const v=clamp(num/den,-1,1), c=clamp(0.35+0.15*nAct,0,0.9); const act=ids.filter(id=>R[id].w>0);
  const parts=act.map(id=>`${nm(id)} ${R[id].v>0?"lehte":"karşı"} (${R[id].txt})`);
  return {abst:false,v,c,f:R,txt:act.map(id=>`${nm(id)} ${R[id].v>0?"+":"−"}`).join(" · ")+(watch.length?` · izlemede: ${watch.map(nm).join(", ")}`:""),
    say:`Ölçülmüş faktörlerden ${parts.join("; ")}.${watch.length?` İzlemede olup oy vermeyen: ${watch.map(nm).join(", ")}.`:""} ${v>0.3?"Faktörler bizimle.":v<-0.3?"Faktörler karşı.":"Faktörler bölünmüş."}`};
}
