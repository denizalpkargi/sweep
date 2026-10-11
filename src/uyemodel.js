/* ---------- Eğitilmiş üyeler (11 Ekim 2026) ----------
   Kullanıcı "direkt masayı bunlarla güncelleyelim" dedi. Masa denetiminde (arastirma/masa-denetimi/masa-ve-tarayici-2026-10-11.md §8) Emre, Baran, Serkan, Mert,
   Arda ve Can'ın kural oylarının bilgisi ≈ 0 çıktı; aynı üyeler Ozan'ın değişkenlerinin kendi alanlarına düşen kısmıyla, Ozan'ın yöntemiyle (LightGBM lambdarank,
   coinin önümüzdeki 4 / 12 saatte ayın en hacimli 30 coini içindeki yeri) eğitilince ileriye yürüyen testte beş pencerenin hepsinde artı:
   4 sa / 12 sa IC Arda +0,050/+0,052, Serkan +0,043/+0,044, Baran +0,042/+0,043, Mert +0,035/+0,042, Can +0,036/+0,042, Emre +0,031/+0,041
   (Ozan +0,059/+0,070; altısının eşit ortalaması +0,057/+0,064). tests/uye-lambdarank.py → tests/uye-lambdarank-report.md.
   Model tests/uye-model-export.py ile src/uyemodel-data.js'e (UYE_MODEL) yazılır; değişkenler ve evren Ozan'la ortak (rankmodel.js rkScore → R.fam).
   Oy: dilim p (iki ufkun ortalaması; short için 1 − p) → v = 2,5·(p − 0,5) (−1…+1'e kırpılır), güven 0,8, katsayı 1 (eski kural katsayıları kural oyu içindi).
   Coin evren dışındaysa (hacimce ilk 30 değil) ya da model yoksa üye kural oyuyla konuşur. Can'ın vetosu kural olarak kalır.
   Uyarı: model yön değil göreli sıra bilir; üyeler Ozan'ın parçaları olduğu için birbirine ve Ozan'a benzer (sıra korelasyonu 0,1–0,7).
   Evren genişliği (12 Ekim 2026; kullanıcı "model oyları tüm coinlerde devreye girmesin mi", sonra "ölçüp masayı güncelle" dedi): her ailenin `top` alanı
   (varsayılan 30) coinin hangi evrende sıralandığını söyler; top 100 olan aile ayın ilk 100 coiniyle eğitilmiştir (tests/uye-evren100.py → uye-evren100-report.md),
   x_ dilimleri ve sıra da canlıda 24 sa hacimce ilk 100 içinde hesaplanır. Ozan (RK_MODEL) ilk 30'da kalır. */
const UYE_CFG={c:0.8,gain:2.5,w:1};
const UYE_LBL={trend:"trend",mom:"kısa momentum",vol:"hacim",flow:"akış, OI, fonlama",macro:"BTC'ye göre",risk:"oynaklık"};
function uyeOn(){ return typeof UYE_MODEL!=="undefined"&&!!UYE_MODEL&&!!UYE_MODEL.fams; }
function uyeTop(id){ const F=uyeOn()&&UYE_MODEL.fams[id]; return F&&F.top>0?F.top:30; }
function uyeTopMax(){ return uyeOn()?Math.max(30,...Object.keys(UYE_MODEL.fams).map(uyeTop)):30; }
// rkScore0 içinden: fresh = [[sym,{raw}]] 24 sa hacme göre sıralı; her aile kendi evren genişliğinde (uyeTop) coinin dilimini verir, coin o evrende değilse aile yok
function uyeScores(fresh,sym){ if(!uyeOn()) return null; const out={}; const byTop={};
  for(const id of Object.keys(UYE_MODEL.fams)){ const t=uyeTop(id); (byTop[t]=byTop[t]||[]).push(id); }
  for(const top of Object.keys(byTop)){ const uni=fresh.slice(0,+top); const me=uni.findIndex(([k])=>k===sym); if(me<0||uni.length<RK_CFG.minN) continue;
    const cols={}; for(const k of RK_XS){ const i=RK_FEATS.indexOf(k); cols[k]=uni.map(([,x])=>x.raw[i]); }
    const rows=uni.map(([,x])=>{ const xs={}; for(const k of RK_XS) xs["x_"+k]=rkPct(x.raw[RK_FEATS.indexOf(k)],cols[k]); return {raw:x.raw,xs}; });
    for(const id of byTop[top]){ const F=UYE_MODEL.fams[id]; const o={n:uni.length,top:+top,rank:me+1}; const ps=[];
      for(const h of Object.keys(F.models)){ const M=F.models[h]; const sc=rows.map(r=>rkPredict(M,rkRow(M,r.raw,r.xs))); o["p"+h]=rkPct(sc[me],sc); if(isFinite(o["p"+h])) ps.push(o["p"+h]); }
      o.p=ps.length?ps.reduce((s,v)=>s+v,0)/ps.length:NaN; out[id]=o; } }
  return out; }
// masadaki oy: {v,c,txt,say,p} ya da null (kural oyu kullanılır)
function uyeVote(id,dir,sym,A,now){ if(!uyeOn()||!UYE_MODEL.fams[id]||!sym||typeof rkScore!=="function") return null;
  const R=rkScore(sym,A,now); const f=R&&R.fam&&R.fam[id]; if(!f||!isFinite(f.p)) return null;
  const isL=dir==="long"; const p=isL?f.p:1-f.p; const v=clamp(UYE_CFG.gain*(p-0.5),-1,1); const pr=x=>isFinite(x)?"%"+Math.round(x*100):"—";
  const where=`4 sa ${pr(f.p4)} · 12 sa ${pr(f.p12)}, ${f.n} coin içinde`;
  const txt=`model (${UYE_LBL[id]||id}): sıra ${pr(f.p)} (${where})`;
  const say=`Eğitilmiş modelime göre (${UYE_LBL[id]||id} verisi) bu coin önümüzdeki saatlerde evrenin ${pr(f.p)} diliminde (${where}). `+(v>0.3?`${isL?"Long":"Short"} tarafını destekliyorum.`:v<-0.3?`${isL?"Long":"Short"} için karşıyım.`:"Ortalarda, güçlü bir görüşüm yok.");
  return {v,c:UYE_CFG.c,txt,say,p:f.p}; }
