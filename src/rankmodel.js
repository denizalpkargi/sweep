/* ---------- Sıralama modeli · Ozan (masanın 14. üyesi, 9 Ekim 2026) ----------
   Kullanıcı "sıralama modelini masaya yeni üye olarak ekle" dedi (Denklem 4: LightGBM lambdarank, coinler arası sıralama, 4 sa IC +0,058).
   Ozan coinin önümüzdeki 4 / 12 saatte evrenin geri kalanına göre nerede olacağını sıralar; yön tahmini değil, göreli sıra.
   Eğitimle canlı aynı kodu kullanır: rkFeat burada; tests/rank-ozellik.js arşivden aynı fonksiyonla satır üretir, tests/rank-model.py lambdarank eğitir
   ve ağaçları src/rankmodel-data.js'e (RK_MODEL) yazar; rkTree burada değerlendirir (tests/rank-test.js Python tahminiyle birebir karşılaştırır).
   Değişkenler yalnız tarama satırında zaten çekilen veriden: 15 dk (son 100), 1 sa (60), 4 sa (60), 1 g (120), BTC 15 dk, OI 5 dk (24),
   büyük trader ve hesap long/short oranları (8), fonlama. Kapanmamış mum kullanılmaz.
   Canlıda her coinin değişkenleri ve puanı rkCache'e yazılır; coinler arası yüzdelik dilim son 60 dk'da görülen coinlerden 24 sa hacimce ilk 30'a göre
   (eğitim evreni: ayın ilk 30 coini). Oy: long için dilim < %10 → −1, < %20 → −0,5, > %80 → +0,2, > %90 → +0,4; short tersi; arası çekimser.
   Gölge: tahmin defterinde (forecast.js) ≥ 200 sonuç ve çarpan > 1 olana kadar oyu yazılır ama puana girmez. */
const RK_FEATS=["z15","z1","z4","z24","rv","rvR","vwD24","vwD4","tk1","tk4","tk24","vq1","vq4","pos24","rng24","rsi15","bb15","jump","body1","lq24",
  "z48h","rsi1h","pos48h","z3d","z9d","rv4h","pos9d","tk9d","vqD","z14d","z30d","z90d","dS20","dS50","dS100","pos30d","vq7","ddHi90","rvD",
  "rel1","rel4","rel24","beta","corr","oi1","oi2","oiTurn","tp","tpCh","gl","glCh","fr"];
// coinler arası yüzdelik dilim (aynı saatteki evren içinde) hesaplanan değişkenler: eğitimde pandas rank(pct) ile aynı tanım (rkPct)
const RK_XS=["z1","z4","z24","vwD24","tk24","vq1","z9d","z30d","fr","oi1","lq24","rv"];
const RK_CFG={top:30,maxAgeMin:60,minN:15,c:0.7,gateN:200};
const rkCache={};
function rkSd(a,i0,i1,f){ let s=0,ss=0,n=0; for(let i=i0;i<i1;i++){ const r=f(i); if(!isFinite(r)) continue; s+=r; ss+=r*r; n++; } return n>2?Math.sqrt(Math.max(0,ss/n-(s/n)*(s/n))):NaN; }
function rkRsi(a,e,p){ if(e<p+1) return NaN; let up=0,dn=0; for(let i=e-p;i<e;i++){ const d=a[i].c-a[i-1].c; if(d>0) up+=d; else dn-=d; } return up+dn>0?up/(up+dn):0.5; }
function rkPos(a,e,w,c){ let H=-Infinity,Lo=Infinity; for(let i=e-w;i<e;i++){ if(a[i].h>H) H=a[i].h; if(a[i].l<Lo) Lo=a[i].l; } return H>Lo?(c-Lo)/(H-Lo):0.5; }
function rkSum(a,e,w,k){ let s=0; for(let i=e-w;i<e;i++) s+=a[i][k]; return s; }
/* S: {k15,e15, k1h,e1h, k4h,e4h, k1d,e1d, btc,eb, oi:[değer], tp:[oran], gl:[oran], fr}; e* = kapanmış mum sayısı (dizinin o kadarı kullanılır).
   Mum {t,o,h,l,c,v,q,tb} (engine K biçimi). Dönen dizi RK_FEATS sırasında, eksik değer NaN. */
function rkFeat(S){
  const a=S.k15, n=S.e15; if(!a||n<98) return null; const L=Math.log, c=a[n-1].c; if(!(c>0)) return null;
  const o={}; const r15=i=>L(a[i].c/a[i-1].c);
  const rv=rkSd(a,n-96,n,r15); if(!(rv>0)) return null; const s96=Math.sqrt(96);
  o.z15=r15(n-1)/rv; o.z1=L(c/a[n-5].c)/(rv*2); o.z4=L(c/a[n-17].c)/(rv*4); o.z24=L(c/a[n-97].c)/(rv*s96); o.rv=rv; o.rvR=rkSd(a,n-16,n,r15)/rv;
  const q96=rkSum(a,n,96,"q"), v96=rkSum(a,n,96,"v"), q16=rkSum(a,n,16,"q"), v16=rkSum(a,n,16,"v"), q4=rkSum(a,n,4,"q");
  o.vwD24=v96>0&&q96>0?L(c/(q96/v96))/(rv*s96):NaN; o.vwD4=v16>0&&q16>0?L(c/(q16/v16))/(rv*4):NaN;
  o.tk1=q4>0?rkSum(a,n,4,"tb")/q4:NaN; o.tk4=q16>0?rkSum(a,n,16,"tb")/q16:NaN; o.tk24=q96>0?rkSum(a,n,96,"tb")/q96:NaN;
  o.vq1=q96>0?(q4/4)/(q96/96):NaN; o.vq4=q96>0?(q16/16)/(q96/96):NaN;
  let H=-Infinity,Lo=Infinity,jmp=0; for(let i=n-96;i<n;i++){ if(a[i].h>H) H=a[i].h; if(a[i].l<Lo) Lo=a[i].l; const r=Math.abs(r15(i)); if(r>jmp) jmp=r; }
  o.pos24=H>Lo?(c-Lo)/(H-Lo):0.5; o.rng24=H>Lo?L(H/Lo)/(rv*s96):0; o.rsi15=rkRsi(a,n,14);
  let m20=0; for(let i=n-20;i<n;i++) m20+=a[i].c; m20/=20; let s20=0; for(let i=n-20;i<n;i++) s20+=(a[i].c-m20)**2; s20=Math.sqrt(s20/20); o.bb15=s20>0?(c-m20)/s20:0;
  o.jump=jmp/rv; let h4=-Infinity,l4=Infinity; for(let i=n-4;i<n;i++){ if(a[i].h>h4) h4=a[i].h; if(a[i].l<l4) l4=a[i].l; } o.body1=h4>l4?(c-a[n-4].o)/(h4-l4):0; o.lq24=q96>0?L(q96):NaN;
  // 1 sa
  const b=S.k1h, m=S.e1h||0; if(b&&m>=50){ const rb=i=>L(b[i].c/b[i-1].c); const r1h=rkSd(b,m-48,m,rb); o.z48h=r1h>0?L(c/b[m-49].c)/(r1h*Math.sqrt(48)):NaN; o.rsi1h=rkRsi(b,m,14); o.pos48h=rkPos(b,m,48,c); }
  // 4 sa
  const g=S.k4h, e4=S.e4h||0; if(g&&e4>=56){ const rg=i=>L(g[i].c/g[i-1].c); const r4h=rkSd(g,e4-54,e4,rg); o.rv4h=r4h; o.z3d=r4h>0?L(c/g[e4-19].c)/(r4h*Math.sqrt(18)):NaN; o.z9d=r4h>0?L(c/g[e4-55].c)/(r4h*Math.sqrt(54)):NaN;
    o.pos9d=rkPos(g,e4,54,c); const q54=rkSum(g,e4,54,"q"); o.tk9d=q54>0?rkSum(g,e4,54,"tb")/q54:NaN; o.vqD=q54>0?(rkSum(g,e4,6,"q")/6)/(q54/54):NaN; }
  // 1 g
  const d=S.k1d, ed=S.e1d||0; if(d&&ed>=32){ const rd=i=>L(d[i].c/d[i-1].c); const rD=rkSd(d,ed-30,ed,rd); o.rvD=rD;
    o.z14d=rD>0?L(c/d[ed-15].c)/(rD*Math.sqrt(14)):NaN; o.z30d=rD>0?L(c/d[ed-31].c)/(rD*Math.sqrt(30)):NaN; o.z90d=rD>0&&ed>=92?L(c/d[ed-91].c)/(rD*Math.sqrt(90)):NaN;
    const sma=w=>{ if(ed<w) return NaN; let s=0; for(let i=ed-w;i<ed;i++) s+=d[i].c; return L(c/(s/w)); }; o.dS20=sma(20); o.dS50=sma(50); o.dS100=sma(100);
    o.pos30d=rkPos(d,ed,30,c); const q30=rkSum(d,ed,30,"q"); o.vq7=q30>0?(rkSum(d,ed,7,"q")/7)/(q30/30):NaN;
    if(ed>=90){ let hh=-Infinity; for(let i=ed-90;i<ed;i++) if(d[i].h>hh) hh=d[i].h; o.ddHi90=L(Math.min(1,c/hh)); } }
  // BTC'ye göre: ortak son kapanmış 15 dk mum
  const bt=S.btc, eb=S.eb||0; if(bt&&eb>=98){ const tc=Math.min(a[n-1].t,bt[eb-1].t); let ic=n-1; while(ic>0&&a[ic].t>tc) ic--; let jb=eb-1; while(jb>0&&bt[jb].t>tc) jb--;
    if(a[ic].t===tc&&bt[jb].t===tc&&ic>=97&&jb>=97){ let sx=0,sy=0,sxx=0,syy=0,sxy=0; for(let k=0;k<96;k++){ const x=L(bt[jb-k].c/bt[jb-k-1].c), y=L(a[ic-k].c/a[ic-k-1].c); sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; }
      const cv=sxy/96-sx*sy/9216, vx=sxx/96-sx*sx/9216, vy=syy/96-sy*sy/9216; o.beta=vx>0?cv/vx:NaN; o.corr=vx>0&&vy>0?cv/Math.sqrt(vx*vy):NaN;
      const rel=w=>(L(a[ic].c/a[ic-w].c)-L(bt[jb].c/bt[jb-w].c))/(rv*Math.sqrt(w)); o.rel1=rel(4); o.rel4=rel(16); o.rel24=rel(96); } }
  // OI (5 dk, değer) ve kalabalık
  const oi=S.oi||[]; const on=oi.length; if(on>=13&&oi[on-1]>0){ o.oi1=L(oi[on-1]/oi[on-13]); o.oi2=on>=24&&oi[on-24]>0?L(oi[on-1]/oi[on-24]):NaN; o.oiTurn=q96>0?L(oi[on-1]/q96):NaN; }
  const tp=S.tp||[], gl=S.gl||[]; if(tp.length&&tp[tp.length-1]>0){ o.tp=L(tp[tp.length-1]); if(tp.length>=7&&tp[tp.length-7]>0) o.tpCh=L(tp[tp.length-1]/tp[tp.length-7]); }
  if(gl.length&&gl[gl.length-1]>0){ o.gl=L(gl[gl.length-1]); if(gl.length>=7&&gl[gl.length-7]>0) o.glCh=L(gl[gl.length-1]/gl[gl.length-7]); }
  if(isFinite(S.fr)) o.fr=S.fr*1e4;
  return RK_FEATS.map(k=>isFinite(o[k])?o[k]:NaN);
}
// pandas rank(pct=True, method="average") ile aynı: (küçükler + (eşitler+1)/2) / n; NaN → NaN
function rkPct(x,arr){ if(!isFinite(x)) return NaN; let lt=0,eq=0,n=0; for(const y of arr){ if(!isFinite(y)) continue; n++; if(y<x) lt++; else if(y===x) eq++; } return n?(lt+(eq+1)/2)/n:NaN; }
// LightGBM ağacı (dump_model'den sıkıştırılmış): s bölen değişken, t eşik, m bayrak (1 default_left, 2 missing Zero, 4 missing NaN), l/r çocuk (≥0 düğüm, <0 yaprak ~i), v yapraklar
function rkTree(T,x){ if(!T.s.length) return T.v[0]; let i=0; for(;;){ let f=x[T.s[i]]; const m=T.m[i]; const mt=m&6; if(!(f===f)&&mt!==4) f=0;
    const miss=(mt===2&&Math.abs(f)<=1e-35)||(mt===4&&!(f===f)); const left=miss?!!(m&1):f<=T.t[i]; const nx=left?T.l[i]:T.r[i]; if(nx<0) return T.v[~nx]; i=nx; } }
function rkPredict(M,x){ let s=0; for(const T of M.trees) s+=rkTree(T,x); return s; }
// model girdisi: ham değişkenler + yüzdelik dilimler (M.feats sırasında)
function rkRow(M,raw,xs){ if(!M._ix) M._ix=M.feats.map(k=>k.startsWith("x_")?-1:RK_FEATS.indexOf(k)); return M.feats.map((k,j)=>{ const i=M._ix[j]; return i<0?(k.startsWith("x_")?xs[k]:NaN):raw[i]; }); }
// canlı: A'dan değişkenler (analyze çıktısı; A.src.* tarama ya da ana ekran verisi)
function rkFeatA(A,now){ now=now||Date.now(); const s=A&&A.src; if(!s||!s.k15L) return null; const ce=(a,iv)=>{ if(!a) return 0; let e=a.length; while(e>0&&a[e-1].t+iv>now) e--; return e; };
  const bt=s.btc15||null; const ts=(arr,k)=>(arr||[]).filter(x=>x&&(x.timestamp==null||+x.timestamp<=now)).map(x=>+x[k]);
  return rkFeat({k15:s.k15L,e15:ce(s.k15L,9e5),k1h:s.k1h,e1h:ce(s.k1h,36e5),k4h:s.k4h,e4h:ce(s.k4h,144e5),k1d:s.k1d,e1d:ce(s.k1d,864e5),btc:bt,eb:ce(bt,9e5),
    oi:ts(s.oi5raw,"sumOpenInterestValue"),tp:ts(s.tp5,"longShortRatio"),gl:ts(s.gl5,"longShortRatio"),fr:isFinite(s.fr)?s.fr:A.fund}); }
// coinin değişkenlerini önbelleğe yazar ve evren içinde puanlar; dönen {p4,p12,p,n} yüzdelik dilimler (0–1) ya da null
const rkMemo=new WeakMap(); // aynı analiz (A) için long ve short toplantısı bir kez hesaplar
function rkScore(sym,A,now){
  if(typeof RK_MODEL==="undefined"||!RK_MODEL||!sym||!A) return null; const mm=rkMemo.get(A); if(mm&&mm.sym===sym) return mm.res; const res=rkScore0(sym,A,now); rkMemo.set(A,{sym,res}); return res; }
function rkScore0(sym,A,now){
  now=now||Date.now(); const raw=rkFeatA(A,now); if(!raw) return null;
  rkCache[sym]={t:now,raw,lq:raw[RK_FEATS.indexOf("lq24")]};
  const fresh=Object.entries(rkCache).filter(([k,x])=>now-x.t<=RK_CFG.maxAgeMin*6e4&&isFinite(x.lq)).sort((p,q)=>q[1].lq-p[1].lq);
  for(const [k,x] of Object.entries(rkCache)) if(now-x.t>RK_CFG.maxAgeMin*6e4*6) delete rkCache[k];
  const uni=fresh.slice(0,RK_CFG.top); const inU=uni.some(([k])=>k===sym); if(!inU) return {sym,out:true,n:uni.length,rank:fresh.findIndex(([k])=>k===sym)+1};
  if(uni.length<RK_CFG.minN) return {sym,few:true,n:uni.length};
  const col=k=>{ const i=RK_FEATS.indexOf(k); return uni.map(([,x])=>x.raw[i]); }; const cols={}; for(const k of RK_XS) cols[k]=col(k);
  const xsOf=raw=>{ const o={}; for(const k of RK_XS) o["x_"+k]=rkPct(raw[RK_FEATS.indexOf(k)],cols[k]); return o; };
  const out={sym,n:uni.length};
  for(const h of Object.keys(RK_MODEL.models)){ const M=RK_MODEL.models[h]; const sc=uni.map(([k,x])=>rkPredict(M,rkRow(M,x.raw,xsOf(x.raw)))); const me=uni.findIndex(([k])=>k===sym); out["s"+h]=sc[me]; out["p"+h]=rkPct(sc[me],sc); }
  const ps=Object.keys(RK_MODEL.models).map(h=>out["p"+h]).filter(isFinite); out.p=ps.length?ps.reduce((s,v)=>s+v,0)/ps.length:NaN; return out;
}
// tahmin defterinde kanıt: ≥ 200 sonuç ve çarpan > 1 → oy puana girer; o zamana dek gölge
function rkGate(){ const L=(typeof FC!=="undefined"&&FC&&FC.learn&&FC.learn.agents)?FC.learn.agents.rank:null; return !!(L&&L.n>=RK_CFG.gateN&&L.m>1); }
// masadaki görüş: {v,c,txt,say,abst,shadow,idle}
function rkMember(A,dir,opts){ opts=opts||{}; const isL=dir==="long"; const D=isL?"long":"short";
  const R=opts.sym?rkScore(opts.sym,A,opts.now):null; const gate=rkGate();
  if(!R) return {v:0,c:0,abst:true,idle:true,txt:"model verisi yok",say:"Bu coin için değişkenlerim eksik, bu turda çekimserim."};
  if(R.out) return {v:0,c:0,abst:true,idle:true,txt:`evren dışında (hacimce ${R.rank||"?"}.)`,say:`Model ayın en hacimli 30 coininde eğitildi; bu coin şu an hacimce ${R.rank||"?"}. sırada, yorum yapmam.`};
  if(R.few) return {v:0,c:0,abst:true,idle:true,txt:`evren eksik (${R.n} coin)`,say:`Sıralamak için son bir saatte en az ${RK_CFG.minN} coin görmem lazım, şu an ${R.n}. Çekimserim.`};
  const p=isL?R.p:1-R.p; let v=0; if(p<0.1) v=-1; else if(p<0.2) v=-0.5; else if(p>0.9) v=0.4; else if(p>0.8) v=0.2;
  const pr=x=>isFinite(x)?"%"+Math.round(x*100):"—"; const where=`4 sa ${pr(R.p4)} · 12 sa ${pr(R.p12)} (${R.n} coin içinde)`;
  const txt=`sıralama dilimi ${pr(R.p)}: ${where}${gate?"":" · gölge oy"}`;
  const say=(v<0?`Önümüzdeki saatlerde bu coin evrenin ${isL?"en zayıf":"en güçlü"} dilimlerinde: ${where}. ${D} için karşıyım.`:v>0?`Bu coin ${isL?"en güçlü":"en zayıf"} dilimde: ${where}. ${D} tarafını destekliyorum ama modelin asıl işi kötüleri elemek.`:`Coin ortalarda: ${where}. Sıralamadan bir şey çıkmıyor.`)+(gate?"":" Oyum tahmin defterinde kanıtlanana kadar puana girmiyor.");
  return {v,c:v?RK_CFG.c:0,abst:!v||!gate,idle:!v,shadow:!!v&&!gate,txt,say,p:R.p,p4:R.p4,p12:R.p12};
}
