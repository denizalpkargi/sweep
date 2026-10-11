/* ---------- Eğitilmiş üyeler (11 Ekim 2026) ----------
   Kullanıcı "direkt masayı bunlarla güncelleyelim" dedi. Masa denetiminde (arastirma/masa-denetimi/masa-ve-tarayici-2026-10-11.md §8) Emre, Baran, Serkan, Mert,
   Arda ve Can'ın kural oylarının bilgisi ≈ 0 çıktı; aynı üyeler Ozan'ın değişkenlerinin kendi alanlarına düşen kısmıyla, Ozan'ın yöntemiyle (LightGBM lambdarank,
   coinin önümüzdeki 4 / 12 saatte ayın en hacimli 30 coini içindeki yeri) eğitilince ileriye yürüyen testte beş pencerenin hepsinde artı:
   4 sa / 12 sa IC Arda +0,050/+0,052, Serkan +0,043/+0,044, Baran +0,042/+0,043, Mert +0,035/+0,042, Can +0,036/+0,042, Emre +0,031/+0,041
   (Ozan +0,059/+0,070; altısının eşit ortalaması +0,057/+0,064). tests/uye-lambdarank.py → tests/uye-lambdarank-report.md.
   Model tests/uye-model-export.py ile src/uyemodel-data.js'e (UYE_MODEL) yazılır; değişkenler ve evren Ozan'la ortak (rankmodel.js rkScore → R.fam).
   Oy: dilim p (iki ufkun ortalaması; short için 1 − p) → v = 2,5·(p − 0,5) (−1…+1'e kırpılır), güven 0,8, katsayı 1 (eski kural katsayıları kural oyu içindi).
   Coin evren dışındaysa (hacimce ilk 30 değil) ya da model yoksa üye kural oyuyla konuşur. Can'ın vetosu kural olarak kalır.
   Uyarı: model yön değil göreli sıra bilir; üyeler Ozan'ın parçaları olduğu için birbirine ve Ozan'a benzer (sıra korelasyonu 0,1–0,7). */
const UYE_CFG={c:0.8,gain:2.5,w:1};
const UYE_LBL={liq:"likidite",check:"zaman dilimi uyumu",trend:"trend",mom:"kısa momentum",vol:"hacim",flow:"akış, OI, fonlama",macro:"BTC'ye göre",risk:"oynaklık"};
function uyeOn(){ return typeof UYE_MODEL!=="undefined"&&!!UYE_MODEL&&!!UYE_MODEL.fams; }
/* Kerem (likidite) ve Yusuf (zaman dilimi uyumu) değişkenleri (11 Ekim 2026 gecesi; kullanıcı "daha umutlu yolları yapalım" dedi). Eğitimle canlı aynı kod:
   tests/uye-ek-ozellik.js arşivden bu fonksiyonla satır üretir. S: {k15, k1h, k4h, k1d} (engine K biçimi), now; yalnız kapanmış mumlar; mesafeler 15 dk ATR (96 mum).
   Kerem canlıdaki AMD dizisinin yaklaşığı: süpürme = fitil son 96 mumun ucunu ≥%0,05 geçip aynı mumda içeri kapanış; MSS = süpürmeden sonra gövdenin
   süpürmeden önceki 12 mumun karşı ucunu geçmesi; eşit tepe/dip = iki 3'lü swing ucu tolerans içinde ve henüz alınmamış. 15 dk'da en az 192 kapanmış mum ister.
   Yusuf: EMA20'ye göre yer ve 5 mumluk eğim; EMA canlının çektiği pencerede başlar (1 sa ve 4 sa son 59, günlük son 119 kapanmış mum), eğitim de aynı pencereyi kullanır.
   Onur'un değişkenleri (coinin 90 günlük kendi sonuçları) canlıda 15 dk × 90 gün ister; canlıya bağlanmadı. */
const UK_KER=["kPdh","kPdl","kPosD","kAsH","kAsL","kAsW","kSwUp","kSwDn","kMssUp","kMssDn","kEqH","kEqL","kSwNet"];
const UK_YUS=["yD","yDs","y4","y4s","y1","y1s","yAlign","yAlign2","yD4"];
const UK_FEATS=[...UK_KER,...UK_YUS]; const UK_WIN={h1:59,h4:59,d:119};
function ukFeat(S,now){
  const a=S.k15; if(!a) return null; let n=a.length; while(n>0&&a[n-1].t+9e5>now) n--; const i=n-1; if(i<191) return null;
  const T=a[i].t+9e5, c=a[i].c, L=Math.log; let atr=0; for(let k=i-95;k<=i;k++) atr+=a[k].h-a[k].l; atr/=96; if(!(c>0)||!(atr>0)) return null; const o={};
  const cl=(b,iv)=>{ if(!b) return 0; let e=b.length; while(e>0&&b[e-1].t+iv>T) e--; return e; };
  const d=S.k1d, pd=cl(d,864e5), h1=S.k1h, p1=cl(h1,36e5), h4=S.k4h, p4=cl(h4,144e5);
  // Kerem
  if(pd>=1){ const pdh=d[pd-1].h, pdl=d[pd-1].l; o.kPdh=(c-pdh)/atr; o.kPdl=(c-pdl)/atr; o.kPosD=pdh>pdl?(c-pdl)/(pdh-pdl):0.5; }
  const day0=Math.floor(T/864e5)*864e5; if(T>=day0+7*36e5){ let ah=-Infinity,al=Infinity; for(let k=i;k>=0&&a[k].t>=day0;k--) if(a[k].t<day0+7*36e5){ if(a[k].h>ah) ah=a[k].h; if(a[k].l<al) al=a[k].l; } if(ah>al){ o.kAsH=(c-ah)/atr; o.kAsL=(c-al)/atr; o.kAsW=(ah-al)/atr; } }
  const sw=(j,up)=>{ let hh=-Infinity,ll=Infinity; for(let k=j-96;k<j;k++){ if(a[k].h>hh) hh=a[k].h; if(a[k].l<ll) ll=a[k].l; } return up?a[j].h>=hh*1.0005&&a[j].c<hh:a[j].l<=ll*0.9995&&a[j].c>ll; };
  let up=99,dn=99; for(let k=0;k<48;k++){ if(up===99&&sw(i-k,true)) up=k; if(dn===99&&sw(i-k,false)) dn=k; } o.kSwUp=up; o.kSwDn=dn; o.kSwNet=(dn<99?1-dn/48:0)-(up<99?1-up/48:0);
  const mss=(j,isUp)=>{ if(j>=99) return 0; const js=i-j; let lv=isUp?-Infinity:Infinity; for(let k=js-12;k<js;k++) lv=isUp?Math.max(lv,a[k].h):Math.min(lv,a[k].l); for(let k=js+1;k<=i;k++) if(isUp?a[k].c>lv:a[k].c<lv) return 1; return 0; };
  o.kMssUp=mss(dn,true); o.kMssDn=mss(up,false);
  const tol=Math.max(c*0.001,0.25*atr); const swH=[],swL=[]; for(let k=i-190;k<i-1;k++){ if(a[k].h>a[k-1].h&&a[k].h>=a[k+1].h) swH.push(k); if(a[k].l<a[k-1].l&&a[k].l<=a[k+1].l) swL.push(k); }
  let eqH=NaN,eqL=NaN; for(let x=0;x<swH.length;x++) for(let z=x+1;z<swH.length;z++){ const p=a[swH[x]].h, q=a[swH[z]].h; if(Math.abs(p-q)>tol) continue; const lv=Math.max(p,q); let taken=false; for(let k=swH[z]+1;k<=i;k++) if(a[k].h>lv*1.0005){ taken=true; break; } if(!taken&&lv>c){ const dd=(lv-c)/atr; if(!(dd>=eqH)) eqH=dd; } }
  for(let x=0;x<swL.length;x++) for(let z=x+1;z<swL.length;z++){ const p=a[swL[x]].l, q=a[swL[z]].l; if(Math.abs(p-q)>tol) continue; const lv=Math.min(p,q); let taken=false; for(let k=swL[z]+1;k<=i;k++) if(a[k].l<lv*0.9995){ taken=true; break; } if(!taken&&lv<c){ const dd=(c-lv)/atr; if(!(dd>=eqL)) eqL=dd; } }
  o.kEqH=eqH; o.kEqL=eqL;
  // Yusuf
  const ema=(b,e,w)=>{ const s=Math.max(0,e-w); const k=2/21; const out=[]; let m=NaN; for(let j=s;j<e;j++){ m=isFinite(m)?m+k*(b[j].c-m):b[j].c; out.push(m); } return out; };
  const sg=x=>x>0?1:x<0?-1:0; const pl=(b,e,w,pre)=>{ if(e<26) return; const m=ema(b,e,w); const z=m.length; o[pre]=L(c/m[z-1]); o[pre+"s"]=L(m[z-1]/m[z-6]); };
  pl(d,pd,UK_WIN.d,"yD"); pl(h4,p4,UK_WIN.h4,"y4"); pl(h1,p1,UK_WIN.h1,"y1");
  if(isFinite(o.yD)&&isFinite(o.y4)&&isFinite(o.y1)){ o.yAlign=sg(o.yD)+sg(o.y4)+sg(o.y1); o.yAlign2=sg(o.yDs)+sg(o.y4s)+sg(o.y1s); o.yD4=sg(o.yD)===sg(o.y4)?sg(o.yD):0; }
  return UK_FEATS.map(k=>isFinite(o[k])?o[k]:NaN); }
// canlı: tarama satırının uzun 15 dk dizisi (A.src.k15x, 200 mum) ya da ana ekranın k15L'si, hangisi uzunsa
function ukFeatA(A,now){ const s=A&&A.src; if(!s) return null; const x=s.k15x, y=s.k15L; const k15=x&&(!y||x.length>y.length)?x:y; return ukFeat({k15,k1h:s.k1h,k4h:s.k4h,k1d:s.k1d},now||Date.now()); }
// model satırı: Ozan'ın ham değişkenleri, yüzdelik dilimleri ve Kerem/Yusuf değişkenleri (M.feats sırasında)
function ukRow(M,r){ if(!M._uk) M._uk=M.feats.map(k=>UK_FEATS.indexOf(k)); if(!M._uk.some(i=>i>=0)) return rkRow(M,r.raw,r.xs);
  const base=rkRow(M,r.raw,r.xs); return base.map((v,j)=>{ const i=M._uk[j]; return i<0?v:(r.ex?r.ex[i]:NaN); }); }
// rkScore0 içinden: evrendeki her coin için ailelerin tahmini ve coinin dilimi; rows[i] = {raw, xs, ex}
function uyeScores(uni,rows,me){ if(!uyeOn()) return null; const out={};
  for(const id of Object.keys(UYE_MODEL.fams)){ const F=UYE_MODEL.fams[id]; const o={}; const ps=[];
    for(const h of Object.keys(F.models)){ const M=F.models[h]; const sc=rows.map(r=>rkPredict(M,ukRow(M,r))); o["p"+h]=rkPct(sc[me],sc); if(isFinite(o["p"+h])) ps.push(o["p"+h]); }
    o.p=ps.length?ps.reduce((s,v)=>s+v,0)/ps.length:NaN; out[id]=o; }
  return out; }
// masadaki oy: {v,c,txt,say,p} ya da null (kural oyu kullanılır)
function uyeVote(id,dir,sym,A,now){ if(!uyeOn()||!UYE_MODEL.fams[id]||!sym||typeof rkScore!=="function") return null;
  const R=rkScore(sym,A,now); const f=R&&R.fam&&R.fam[id]; if(!f||!isFinite(f.p)) return null;
  const isL=dir==="long"; const p=isL?f.p:1-f.p; const v=clamp(UYE_CFG.gain*(p-0.5),-1,1); const pr=x=>isFinite(x)?"%"+Math.round(x*100):"—";
  const where=`4 sa ${pr(f.p4)} · 12 sa ${pr(f.p12)}, ${R.n} coin içinde`;
  const txt=`model (${UYE_LBL[id]||id}): sıra ${pr(f.p)} (${where})`;
  const say=`Eğitilmiş modelime göre (${UYE_LBL[id]||id} verisi) bu coin önümüzdeki saatlerde evrenin ${pr(f.p)} diliminde (${where}). `+(v>0.3?`${isL?"Long":"Short"} tarafını destekliyorum.`:v<-0.3?`${isL?"Long":"Short"} için karşıyım.`:"Ortalarda, güçlü bir görüşüm yok.");
  return {v,c:UYE_CFG.c,txt,say,p:f.p}; }
