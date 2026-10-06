// Hacim profili denetimi (engine.js volProfile/sessionProfiles), 24 coin × 6 ay 15 dk (tests/data/*.json):
// 1) Çözünürlük: günlük POC/VAH/VAL 15 dk mumlardan ve aynı mumların 1 saate toplanmışından; fark gün aralığının yüzdesi olarak.
//    (Doğru olan alt zaman dilimi; 1 sa → 15 dk farkı küçükse 15 dk → 1 dk farkı da küçüktür. 1 dk karşılaştırması: tests/audit-vp-1m.js, PC'de.)
// 2) Tepki: önceki günün VAL/VAH/POC'una ve çıplak POC'lara gün içi ilk dokunuşta önce +1 ATR mi −1 ATR mi (16 mum); taban her 4. mum.
// 3) %80 kuralı (Dalton): gün önceki değer alanının dışında açılır, sonra iki ardışık 30 dk kapanışı içeride → aynı gün karşı kenara gider mi?
const {loadEngine}=require('./engine-node.js'); const {loadData}=require('./bt-lib.js'); const E=loadEngine();
const data=loadData().filter(d=>d&&d.k15); const H=16;
function atrS(k){ const a=new Array(k.length).fill(NaN); for(let i=14;i<k.length;i++){ let s=0; for(let j=i-13;j<=i;j++) s+=Math.max(k[j].h-k[j].l,Math.abs(k[j].h-k[j-1].c),Math.abs(k[j].l-k[j-1].c)); a[i]=s/14; } return a; }
function fw(k,b,isL,atr){ const e=k[b].c, up=isL?e+atr:e-atr, dn=isL?e-atr:e+atr; for(let j=b+1;j<Math.min(k.length,b+1+H);j++){ const c=k[j]; if(isL? c.l<=dn : c.h>=dn) return 0; if(isL? c.h>=up : c.l<=up) return 1; } return 0.5; }
const agg={}; const add=(g,r,t)=>{ const a=agg[g]||(agg[g]={n:0,w:0,l:0,t:[]}); a.n++; if(r===1) a.w++; else if(r===0) a.l++; a.t.push([t,r]); };
const res={pocDiff:[],vahDiff:[],valDiff:[]}; let r80={n:0,hit:0,up:0,dn:0};
for(const d of data){
  const k=E.K(d.k15); const atr=atrS(k);
  // 1 saatlik toplama (UTC saat sınırı)
  const h=[]; for(const c of k){ const t=Math.floor(c.t/3600e3)*3600e3; const l=h[h.length-1]; if(l&&l.t===t){ l.h=Math.max(l.h,c.h); l.l=Math.min(l.l,c.l); l.c=c.c; l.q+=c.q; l.tb+=c.tb; } else h.push({t,o:c.o,h:c.h,l:c.l,c:c.c,q:c.q,tb:c.tb}); }
  const P=E.sessionProfiles(k,k.length), PH=E.sessionProfiles(h,h.length); const byDay=Object.fromEntries(PH.map(p=>[p.day,p]));
  for(const p of P){ const q=byDay[p.day]; if(!q) continue; const rng=Math.max(...k.slice(p.s0,p.s1+1).map(c=>c.h))-Math.min(...k.slice(p.s0,p.s1+1).map(c=>c.l)); if(!(rng>0)) continue;
    res.pocDiff.push(Math.abs(p.poc-q.poc)/rng); res.vahDiff.push(Math.abs(p.vah-q.vah)/rng); res.valDiff.push(Math.abs(p.val-q.val)/rng); }
  // 2) tepki
  for(let di=1;di<P.length;di++){ const pr=P[di-1], cur=P[di]; const lv=[["önceki gün VAL","long",pr.val],["önceki gün VAH","short",pr.vah],["önceki gün POC (üstten)","long",pr.poc],["önceki gün POC (alttan)","short",pr.poc]];
    // o güne kadar çıplak kalan eski POC'lar (en fazla 10 gün geri)
    for(let dj=Math.max(0,di-10);dj<di-1;dj++){ const o=P[dj]; let hit=false; for(let j=o.s1+1;j<cur.s0;j++){ if(k[j].l<=o.poc&&k[j].h>=o.poc){ hit=true; break; } } if(!hit){ const side=k[cur.s0].o>o.poc?"long":"short"; lv.push(["çıplak POC",side,o.poc]); } }
    for(const [g,dir,L] of lv){ const isL=dir==="long"; if(isL? k[cur.s0].o<=L : k[cur.s0].o>=L) continue; // seviyenin doğru tarafında açılmalı
      for(let j=cur.s0;j<=cur.s1&&j<k.length-H;j++){ if(isL? k[j].l<=L : k[j].h>=L){ if(atr[j]>0){ // dokunuş mumunun kapanışı seviyenin doğru tarafındaysa (tutunma) giriş
          const held=isL?k[j].c>L:k[j].c<L; add(g+(held?" · tutundu":" · kırıldı"),fw(k,j,isL,atr[j]),k[j].t); } break; } } }
    // 3) %80 kuralı
    const o=k[cur.s0].o; const below=o<pr.val, above=o>pr.vah; if(!(below||above)) continue;
    let inside=0, trig=-1; for(let j=cur.s0+1;j<=cur.s1;j+=2){ const c=k[j]; const inn=c.c>pr.val&&c.c<pr.vah; inside=inn?inside+1:0; if(inside>=2){ trig=j; break; } }
    if(trig<0) continue; r80.n++; if(above) r80.dn++; else r80.up++; let hit=false; for(let j=trig+1;j<=cur.s1;j++){ if(above? k[j].l<=pr.val : k[j].h>=pr.vah){ hit=true; break; } } if(hit) r80.hit++;
  }
  for(let i=200;i<k.length-H;i+=4) if(atr[i]>0){ add("taban long",fw(k,i,true,atr[i]),k[i].t); add("taban short",fw(k,i,false,atr[i]),k[i].t); }
}
const q=(a,p)=>{ const s=[...a].sort((x,y)=>x-y); return s[Math.floor(p*(s.length-1))]; };
console.log('1) 1 sa ↔ 15 dk günlük profil farkı, gün aralığına oranla · gün: '+res.pocDiff.length);
for(const key of ["pocDiff","vahDiff","valDiff"]) console.log('  ',key.replace('Diff','').toUpperCase(),'medyan yüzde '+(q(res[key],0.5)*100).toFixed(1),'· p75 yüzde '+(q(res[key],0.75)*100).toFixed(1),'· p90 yüzde '+(q(res[key],0.9)*100).toFixed(1));
const all=Object.values(agg).flatMap(a=>a.t.map(x=>x[0])).sort((a,b)=>a-b); const MID=all[all.length>>1];
const rows=Object.entries(agg).map(([g,a])=>{ const h1=a.t.filter(x=>x[0]<MID), h2=a.t.filter(x=>x[0]>=MID); const wr=x=>x.length?+(x.filter(y=>y[1]===1).length/x.length*100).toFixed(1):null; return {grup:g,n:a.n,'+1ATR önce %':+(a.w/a.n*100).toFixed(1),y1:wr(h1),y2:wr(h2)}; }).sort((a,b)=>a.grup.localeCompare(b.grup));
console.log('2) seviyeye ilk dokunuşta yön (16 mum, ±1 ATR)'); console.table(rows);
console.log('3) %80 kuralı: tetik',r80.n,'gün (yukarıdan',r80.dn,'/ aşağıdan',r80.up,') · aynı gün karşı kenar yüzde '+(r80.hit/r80.n*100).toFixed(1));
require('fs').writeFileSync(require('path').join(__dirname,'audit-vp.json'),JSON.stringify({res:{poc:q(res.pocDiff,0.5),vah:q(res.vahDiff,0.5),val:q(res.valDiff,0.5)},rows,r80},null,1));
