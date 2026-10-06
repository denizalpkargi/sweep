/* ---------- Strateji doğrulayıcı Yusuf (masanın on ikinci üyesi, 6 Ekim 2026) ----------
   İki iş: (1) zaman dilimi eşleşmesi: masa 15 dk mumla işlem açar; üst zaman diliminin yönü işlemle aynı mı?
   (2) kurulum strateji tanımına uyuyor mu: Kerem bir süpürme kurulumunu destekliyorsa kuralın kendi şartlarını tek tek denetler.
   Ölçüm (tests/research-mtf-volume.js mtf, 24 coin × 6 ay, iki yarı; stop 1 ATR, hedef 1,5 ATR, 16 mum, komisyon dahil):
   - "15 dk'da işlem → 4 saate bak" kuralı zayıf: rastgele girişte 4 sa yönüyle aynı − ters = +0,031R / +0,001R (ikinci yarıda yok).
   - Günlük yön her iki zaman diliminde en tutarlı süzgeç: 15 dk +0,049R / +0,016R, isabet %50,7 vs %48,7 / %50,0 vs %49,3;
     1 sa işlemde +0,043R / +0,051R, isabet %50,5 vs %48,7 iki yarıda da. 1 sa işlem → 4 sa +0,056R / −0,009R; haftalık +0,014 / +0,019R.
   - Etki küçük: 15 dk'da komisyon+kayma işlem başına ≈0,28R yer, süzgeç bunu kapatmaz. 1 sa mumda aynı rastgele giriş −0,14R (15 dk −0,30R).
   Yön tanımı (kapanmış mumlarla): kapanış > EMA20 ve EMA20 5 mum öncesinden yüksek → yukarı; tersi aşağı; arası karışık.
   Oy: 0,5 × günlük + 0,15 × 4 sa − 0,25 × (kurulum hatası sayısı); günlük veri yoksa ya da günlük karışık ve hata yoksa çekimser. Katsayı geriye dönük IC'den (bkz. DESK). */
const TFC_CFG={wD:0.5,w4:0.15,wIssue:0.25,costMax:0.12};
function htfDirOf(k){ if(!k||k.length<26) return null; const a=2/21; let e=k[0].c; const E=[]; for(const x of k){ e=x.c*a+e*(1-a); E.push(e); } const n=k.length-1;
  const d=k[n].c>E[n]&&E[n]>E[n-5]?1:k[n].c<E[n]&&E[n]<E[n-5]?-1:0; return {d,ema:E[n],px:k[n].c}; }
// "şimdi": canlıda saat, geriye dönük testte son 15 dk mumunun kapanışı (açık günlük/saatlik mum sayılmaz)
function tfRead(A, now){
  const s=A&&A.src||{}; const kl=s.k15L&&s.k15L[s.k15L.length-1]; now=now||Math.min(Date.now(),kl?kl.t+9e5:Infinity); const closed=(k,ms)=>k?k.filter(x=>x.t+ms<=now):null;
  const d1=closed(s.k1d,864e5); const h1=closed(s.k1h,36e5); let h4=null;
  if(h1&&h1.length>=8){ h4=[]; let i=0; while(i<h1.length&&h1[i].t%144e5) i++; for(;i+4<=h1.length;i+=4){ const g=h1.slice(i,i+4); h4.push({t:g[0].t,o:g[0].o,h:Math.max(...g.map(x=>x.h)),l:Math.min(...g.map(x=>x.l)),c:g[3].c}); } }
  return {d1:htfDirOf(d1),h4:htfDirOf(h4),h1:htfDirOf(h1)};
}
// ctx: committee içinden {r: A.amd[dir], lv: Kerem'in oyu, sd: stop oranı, costR, q: A.rs[dir]}
function tfMember(A, dir, ctx){
  ctx=ctx||{}; const T=tfRead(A); const isL=dir==="long", sg=isL?1:-1; const D=isL?"long":"short";
  const nm=x=>!x?"veri yok":x.d>0?"yukarı":x.d<0?"aşağı":"karışık";
  const issues=[]; const r=ctx.r;
  if(ctx.lv>0.5&&r){ // Kerem kurulumu destekliyor: tanımın şartları
    if(A.trend==="flat") issues.push("günlük yön yatay: strateji tanımında model geçersiz");
    else if(A.trend!==(isL?"up":"down")&&!(ctx.q&&ctx.q.rsOk)) issues.push("kurulum günlük yöne ters (Kurulum 1 yönle işlem ister)");
    if(!r.kz&&!(ctx.q&&ctx.q.rsOk)) issues.push("süpürme kill zone dışında");
    if(!(r.ofScore>=1)) issues.push("süpürmede emir akışı teyidi yok (en az 1 gerekir)");
    if(isFinite(r.rr1)&&r.rr1<1.5) issues.push(`hedefe oran ${fx(r.rr1,2)}R, kural en az 1,5R`);
    if(r.stageLive&&r.stage==="entry"&&r.stageLive!=="entry") issues.push("aşama eski: fiyat OTE bölgesinden çıkmış");
  }
  if(isFinite(ctx.costR)&&ctx.costR>TFC_CFG.costMax) issues.push(`15 dk'da maliyet ${fx(ctx.costR,2)}R: stop bu zaman dilimi için dar`);
  if(!T.d1) return {v:0,c:0.2,abst:true,issues,T,txt:"günlük veri yetmiyor · çekimser",say:"Günlük mum geçmişi yetmiyor; üst zaman dilimini denetleyemem, çekimserim."};
  const d1=T.d1.d*sg, h4=T.h4?T.h4.d*sg:0;
  const v=clamp(TFC_CFG.wD*d1+TFC_CFG.w4*h4-TFC_CFG.wIssue*issues.length,-1,1); const c=issues.length?0.75:d1?0.6:0.4;
  const txt=`işlem 15 dk · günlük ${nm(T.d1)}${d1>0?" (aynı)":d1<0?" (ters)":""} · 4 sa ${nm(T.h4)} · 1 sa ${nm(T.h1)}${issues.length?" · "+issues.length+" kural hatası: "+issues.join("; "):""}`;
  const say=`Biz 15 dakikalık mumla işlem açıyoruz. Ölçtüğüm kadarıyla bu işlemler için en anlamlı üst zaman dilimi günlük; 4 saatlik süzgeç iki yarıdan yalnız birinde işe yaradı. Günlük ${nm(T.d1)}, 4 saat ${nm(T.h4)}, 1 saat ${nm(T.h1)}: ${d1>0?`${D} günlük yönle uyumlu.`:d1<0?`${D} günlük yöne karşı; bu, ortalamada işlem başına yaklaşık 0,03R kaybettiriyor.`:"günlük karışık, ne destek ne engel."}${issues.length?` Kurulumu strateji tanımıyla karşılaştırdım: ${issues.join("; ")}. ${issues.length>=3?"Bu haliyle kurulum kitaba uymuyor.":"Bunlar düzelmeden boyu büyütmeyin."}`:ctx.lv>0.5?" Kurulum strateji tanımının şartlarını karşılıyor.":""}`;
  const idle=!d1&&!issues.length; // günlük karışık ve kural hatası yok: söyleyecek sözü yok, çekimser
  return {v,c,abst:idle,issues,T,txt:txt+(idle?" · çekimser":""),say};
}
