/* ---------- Hacim analisti Serkan (masanın on birinci üyesi, 6 Ekim 2026) ----------
   15 dk kapanmış mumlardan ölçülebilir hacim okumaları: hacim oranı (son 1 saat ÷ son 24 saatin medyan saati), hacim eğilimi (son 24 mumda
   log hacmin eğimi: artıyor / azalıyor), fiyat-hacim uyumu, 4 saatlik delta (taker alış − satış), günün gelişen profili (POC, VAH/VAL),
   dünkü değer alanına göre yer, en yakın çıplak POC.
   Oy yalnızca geçmişte iki yarıda da aynı işareti veren okumalardan (tests/research-mtf-volume.js, 24 coin × 6 ay, saatte bir, 107 bin örnek):
   - düşüşten sonra artan hacim → tepki yükselişi (kapitülasyon/emilim): IC +0,039 / +0,028
   - fiyat, günün gelişen POC'sinin altındaysa yukarı, üstündeyse aşağı çekilir: IC +0,038 / +0,012
   Tutmayanlar (oy vermez, yalnız söylenir): "yükseliş artan hacimle teyitli" (IC −0,012 / +0,002; artan hacimli hareketler 4 saatte geri
   veriyor), delta (−0,010 / −0,002), dünkü değer alanının dışı (−0,033 / +0,005), çıplak POC (−0,015 / +0,009).
   Puan long yönüne göre s ∈ [−1,1]; short için −s. Verisi yetmezse (< 60 kapanmış mum) ya da |s| < 0,1 ise çekimser. */
const VOL_CFG={wCap:0.6,wPoc:0.4,capR:1,pocAtr:3,minBars:60,minS:0.1};
function volRead(k, now){
  if(!k||k.length<VOL_CFG.minBars) return null; now=now||Date.now();
  let n=k.length; if(k[n-1].t+9e5>now) n--; if(n<VOL_CFG.minBars) return null; // açık mum hariç
  const c=k.slice(Math.max(0,n-200),n); const L=c.length, last=c[L-1], px=last.c; const atr=atrAt(c,L,14); if(!(atr>0)) return null;
  const lq=c.map(x=>Math.log(x.q+1)); let sx=0,sy=0,sxy=0,sxx=0; for(let j=0;j<24;j++){ const y=lq[L-24+j]; sx+=j; sy+=y; sxy+=j*y; sxx+=j*j; }
  const slope=(24*sxy-sx*sy)/(24*sxx-sx*sx)*24; // 24 mumda log hacim değişimi (0,69 ≈ iki katına çıktı)
  const q4=c.slice(L-4).reduce((s,x)=>s+x.q,0); const base=[]; for(let j=L-96;j<L-3;j+=4) if(j>=0) base.push(c.slice(j,j+4).reduce((s,x)=>s+x.q,0)); base.sort((a,b)=>a-b);
  const rel=base.length?q4/(base[base.length>>1]||q4):1;
  const r24=(px-c[L-25].c)/atr, r4=(px-c[L-5].c)/atr; let dq=0,qq=0; for(let j=L-16;j<L;j++){ dq+=2*c[j].tb-c[j].q; qq+=c[j].q; } const delta=qq?dq/qq:0;
  // günün gelişen profili (UTC), en az 4 mum; yoksa son 24 saat
  let d0=L-1; const day=Math.floor(last.t/864e5); while(d0>0&&Math.floor(c[d0-1].t/864e5)===day) d0--; const curP=L-d0>=4?volProfile(c,d0,L-1,{bins:48}):volProfile(c,Math.max(0,L-96),L-1,{bins:48});
  const days=sessionProfiles(c,L,{bins:48}); const pd=days.filter(p=>!p.current).slice(-1)[0]||null;
  const naked=days.filter(p=>!p.current&&p.naked).map(p=>p.poc).sort((a,b)=>Math.abs(a-px)-Math.abs(b-px))[0];
  // oy: long yönüne göre
  const cap=r24<=-VOL_CFG.capR?clamp(slope/2,-1,1):0; const poc=clamp((curP.poc-px)/atr/VOL_CFG.pocAtr,-1,1);
  const s=clamp(VOL_CFG.wCap*cap+VOL_CFG.wPoc*poc,-1,1);
  return {s,slope,rel,r24,r4,delta,cap,poc,atr,px,curPoc:curP.poc,curVah:curP.vah,curVal:curP.val,curDay:L-d0>=4,pd:pd?{poc:pd.poc,vah:pd.vah,val:pd.val}:null,naked:isFinite(naked)?naked:null};
}
// masadaki görüş (committee içinden): v, c ve konuşma metni; okuma zayıfsa (|s| < minS) çekimser, puanı sulandırmaz
function volMember(A, dir){
  const k=A&&A.src&&A.src.k15L; const R=volRead(k); if(!R) return {v:0,c:0.2,abst:true,txt:"15 dk hacim verisi yetmiyor · çekimser",say:"Hacim geçmişi yetmiyor, bu turda çekimserim."};
  const isL=dir==="long", v=isL?R.s:-R.s; const weak=Math.abs(R.s)<VOL_CFG.minS; const trendTxt=R.slope>0.35?"artıyor":R.slope<-0.35?"azalıyor":"yatay"; const relTxt=`son 1 sa hacmi ×${fx(R.rel,1)} (24 sa medyanına göre)`;
  const where=R.pd?(R.px>R.pd.vah?"dünkü değer alanının üstünde":R.px<R.pd.val?"dünkü değer alanının altında":"dünkü değer alanının içinde"):"dünkü profil yok";
  const pocD=(R.curPoc-R.px)/R.atr; const pocTxt=`${R.curDay?"günün":"24 saatin"} POC'si ${fmtP(R.curPoc)} (${pocD>=0?"+":""}${fx(pocD,1)} ATR)`;
  const nk=R.naked?` · çıplak POC ${fmtP(R.naked)} (${fx((R.naked-R.px)/R.atr,1)} ATR)`:"";
  const dl=`4 sa delta ${R.delta>=0?"+":""}${fx(R.delta*100,1)}%`;
  const txt=`hacim ${trendTxt} (${fx(R.slope,2)}) · ${relTxt} · ${where} · ${pocTxt}${nk} · ${dl}`;
  const why=[]; if(R.cap>0.15) why.push("düşüşte hacim artıyor: satıcılar boşalıyor, tepki gelir"); else if(R.cap<-0.15) why.push("düşüş azalan hacimle sürüyor, dip için erken");
  if(Math.abs(R.poc)>0.15) why.push(R.poc>0?"fiyat günün POC'sinin altında, POC yukarı çeker":"fiyat günün POC'sinin üstünde, POC aşağı çeker");
  const movTxt=Math.abs(R.r4)>0.5&&R.slope>0.35?` Son saatteki ${R.r4>0?"yükseliş":"düşüş"} artan hacimle geldi; geçmişte bu hareketler 4 saatte devam etmedi, teyit saymıyorum.`:"";
  const c=clamp(0.45+0.4*Math.abs(R.s),0.45,0.85);
  const say=`Hacim ${trendTxt}, ${relTxt}. Fiyat ${where}; ${pocTxt}${nk}. ${dl}.${movTxt} ${why.length?why.join("; ")+". ":""}${v>0.15?`Hacim tablosu ${dir} tarafını destekliyor.`:v<-0.15?`Hacim ${dir} için karşı.`:"Hacimden net bir yön çıkmıyor."}`;
  return {v,c,abst:weak,txt:txt+(weak?" · net yön yok, çekimser":""),say,R};
}
