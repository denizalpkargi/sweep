// Araştırma (6 Ekim 2026): (1) "15 dk'da işlem yaparken 4 saate, 1 saatte işlem yaparken günlüğe bak" kuralı veride tutuyor mu?
// (2) Hacim okumaları (hacim artıyor/azalıyor, fiyat-hacim uyumu, delta, değer alanı, POC uzaklığı, çıplak POC) yönü tahmin ediyor mu?
// Veri: tests/data/*.json (24 coin, 15 dk × 18000 ≈ 6 ay, 1 g × 400). Çalıştırma: node tests/research-mtf-volume.js [mtf|vol|all]
// Sonuç: komisyonlu R (stop 1 ATR, hedef 1,5 ATR, 16 mum, aynı mumda ikisi = stop) ve tahmin defteri isabeti (önce ±1 ATR), iki yarı ayrı.
const fs=require('fs'), path=require('path');
const {loadEngine}=require('./engine-node.js'); const {loadData}=require('./bt-lib.js');
const E=loadEngine(); const mode=process.argv[2]||'all'; const COST=0.0005*2+0.0003;
const agg=(k,n,al)=>{ const out=[]; let s=0; if(al) while(s<k.length&&k[s].t%al) s++; for(let i=s;i+n<=k.length;i+=n){ const g=k.slice(i,i+n); out.push({t:g[0].t,o:g[0].o,h:Math.max(...g.map(x=>x.h)),l:Math.min(...g.map(x=>x.l)),c:g[n-1].c,v:g.reduce((a,x)=>a+x.v,0),q:g.reduce((a,x)=>a+x.q,0),tb:g.reduce((a,x)=>a+x.tb,0),te:g[n-1].t}); } return out; };
const atrArr=(k,n=14)=>{ const a=new Array(k.length).fill(NaN); let s=0; for(let i=1;i<k.length;i++){ const p=k[i-1].c; const tr=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-p),Math.abs(k[i].l-p)); s+=tr; if(i>n) s-=Math.max(k[i-n].h-k[i-n].l,Math.abs(k[i-n].h-k[i-n-1].c),Math.abs(k[i-n].l-k[i-n-1].c)); if(i>=n) a[i]=s/n; } return a; };
const ema=(xs,n)=>{ const a=[]; let e=xs[0]; const k=2/(n+1); for(const x of xs){ e=x*k+e*(1-k); a.push(e); } return a; };
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN;
const corr=(a,b)=>{ const n=a.length; if(n<3) return 0; const ma=mean(a), mb=mean(b); let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; } return saa&&sbb?sab/Math.sqrt(saa*sbb):0; };
// yön (htf): kapanmış mumlarla; +1: kapanış > EMA20 ve EMA20 5 mum öncesinden yüksek; −1 tersi; 0 karışık
function htfDir(k){ const e=ema(k.map(x=>x.c),20); return k.map((x,i)=>i<25?0:(x.c>e[i]&&e[i]>e[i-5]?1:x.c<e[i]&&e[i]<e[i-5]?-1:0)); }
// kapanmış htf mumu: t anında (ltf mumu kapandığında) bitişi ≤ t olan son htf mumunun yönü
function dirAt(H,D,tEnd){ let lo=0,hi=H.length-1,b=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(H[m].te<tEnd){ b=m; lo=m+1; } else hi=m-1; } return b<0?0:D[b]; }
// sonuç: i mumunun kapanışında giriş, stop 1 ATR, hedef 1,5 ATR, 16 mum
function outcome(k,atr,i,sg,N=16){ const px=k[i].c, a=atr[i]; if(!(a>0)) return null; const st=px-sg*a, tg=px+sg*1.5*a, up=px+sg*a; let R=null,y=0.5;
  for(let j=i+1;j<=i+N&&j<k.length;j++){ const c=k[j]; const adv=sg>0?c.l:c.h, fav=sg>0?c.h:c.l;
    if(y===0.5){ if(sg>0?adv<=st:adv>=st) y=0; else if(sg>0?fav>=up:fav<=up) y=1; }
    if(R==null){ if(sg>0?adv<=st:adv>=st) R=-1; else if(sg>0?fav>=tg:fav<=tg) R=1.5; }
    if(R!=null&&y!==0.5) break; }
  if(R==null){ const j=Math.min(k.length-1,i+N); R=sg*(k[j].c-px)/a; }
  return {R:R-COST*px/a, y, fwd:sg*((k[Math.min(k.length-1,i+N)].c-px)/a)}; }
const rsiArr=(k,n=14)=>{ const r=new Array(k.length).fill(50); let g=0,l=0; for(let i=1;i<k.length;i++){ const d=k[i].c-k[i-1].c; const G=Math.max(0,d), L=Math.max(0,-d); if(i<=n){ g+=G/n; l+=L/n; } else { g=(g*(n-1)+G)/n; l=(l*(n-1)+L)/n; } if(i>=n) r[i]=l?100-100/(1+g/l):100; } return r; };

const data=loadData().filter(d=>d&&d.k15);
let MID=0; { const ts=[]; for(const d of data){ const k=d.k15; ts.push(k[0][0],k[k.length-1][0]); } MID=(Math.min(...ts)+Math.max(...ts))/2; }

if(mode==='mtf'||mode==='all'){
  // ltf sinyalleri: rastgele (her saat, iki yön), kırılım (20 mum tepe/dip kapanışla), geri çekilme (RSI 14 < 35 long, > 65 short)
  const rows={}; const add=(key,h,o)=>{ const r=rows[key]||(rows[key]={R:[[],[]],y:[[],[]]}); r.R[h].push(o.R); r.y[h].push(o.y); };
  const SETS={"15m":{ltf:1,htfs:{"1h":4,"4h":16,"1d":96},step:4},"1h":{ltf:4,htfs:{"4h":4,"1d":24,"1w":168},step:1}};
  for(const d of data){ const k15=E.K(d.k15); const d1=E.K(d.k1d).map(x=>({...x,te:x.t+864e5-1}));
    for(const tfName in SETS){ const S=SETS[tfName]; const k=S.ltf===1?k15.map(x=>({...x,te:x.t+9e5-1})):agg(k15,S.ltf,S.ltf*9e5).map(x=>({...x,te:x.t+S.ltf*9e5-1}));
      const atr=atrArr(k), rsi=rsiArr(k);
      const H={}; for(const hn in S.htfs){ const m=S.htfs[hn]*(S.ltf); let hk; if(hn==="1d") hk=d1; else if(hn==="1w") hk=agg(d1,7,0).map(x=>({...x,te:x.t+7*864e5-1})); else hk=agg(k15,m,m*9e5).map(x=>({...x,te:x.t+m*9e5-1})); H[hn]={k:hk,D:htfDir(hk)}; }
      const own=htfDir(k);
      for(let i=60;i<k.length-17;i+=S.step){ const h=k[i].t<MID?0:1; let hi=-Infinity,lo=Infinity; for(let j=i-20;j<i;j++){ hi=Math.max(hi,k[j].h); lo=Math.min(lo,k[j].l); }
        const sigs=[["rastgele",1],["rastgele",-1]]; if(k[i].c>hi) sigs.push(["kırılım",1]); if(k[i].c<lo) sigs.push(["kırılım",-1]); if(rsi[i]<35) sigs.push(["geri çekilme",1]); if(rsi[i]>65) sigs.push(["geri çekilme",-1]);
        for(const [nm,sg] of sigs){ const o=outcome(k,atr,i,sg); if(!o) continue; add(tfName+"|"+nm+"|hepsi",h,o);
          add(tfName+"|"+nm+"|kendi tf "+(own[i]===sg?"aynı":own[i]===-sg?"ters":"yatay"),h,o);
          for(const hn in H){ const dd=dirAt(H[hn].k,H[hn].D,k[i].te+1); add(tfName+"|"+nm+"|"+hn+" "+(dd===sg?"aynı":dd===-sg?"ters":"yatay"),h,o); } } } } }
  const out=[]; for(const key of Object.keys(rows).sort()){ const r=rows[key]; const [tf,sig,flt]=key.split("|"); out.push({tf,sinyal:sig,süzgeç:flt,n1:r.R[0].length,R1:+mean(r.R[0]).toFixed(3),y1:+mean(r.y[0]).toFixed(3),n2:r.R[1].length,R2:+mean(r.R[1]).toFixed(3),y2:+mean(r.y[1]).toFixed(3)}); }
  console.table(out); fs.writeFileSync(path.join(__dirname,'data','_mtf-result.json'),JSON.stringify(out,null,1));
}

if(mode==='vol'||mode==='all'){
  // hacim okumaları (15 dk, saatte bir), long yönüne göre işaretli. Sonuç: 16 mum (4 sa) sonra ATR cinsinden getiri (±5'e kırpılır) ve önce ±1 ATR isabeti
  const F=["hacimOranı","hacimEğilimi","fiyatHacimUyumu","hacimliHareket","delta16","deltaUyumsuzluk","dünDeğerAlanı","dünPOCyön","bugünPOCyön","24saDeğerAlanı","çıplakPOCyön"];
  const X={}; for(const f of F) X[f]=[[],[]]; const Y=[[],[]], YY=[[],[]]; const BUCK={};
  for(const d of data){ const k=E.K(d.k15); const atr=atrArr(k); const days=E.sessionProfiles(k,k.length,{bins:48});
    const firstHit=days.map(p=>{ for(let j=p.s1+1;j<k.length;j++) if(k[j].l<=p.poc&&k[j].h>=p.poc) return j; return Infinity; });
    const lq=k.map(x=>Math.log(x.q+1)); let di=0;
    for(let i=200;i<k.length-17;i+=4){ const a=atr[i], px=k[i].c; if(!(a>0)) continue; const h=k[i].t<MID?0:1;
      const q4=k.slice(i-3,i+1).reduce((s,x)=>s+x.q,0); const base=[]; for(let j=i-96;j<i-3;j+=4) base.push(k.slice(j,j+4).reduce((s,x)=>s+x.q,0)); base.sort((x,y)=>x-y); const vr=Math.log(q4/(base[base.length>>1]||q4));
      // eğilim: son 24 mumda log hacmin eğimi (mum başına) × 24
      let sx=0,sy=0,sxy=0,sxx=0; for(let j=0;j<24;j++){ const y=lq[i-23+j]; sx+=j; sy+=y; sxy+=j*y; sxx+=j*j; } const slope=(24*sxy-sx*sy)/(24*sxx-sx*sx)*24;
      const r4=(px-k[i-4].c)/a, r24=(px-k[i-24].c)/a; let dq=0,qq=0; for(let j=i-15;j<=i;j++){ dq+=2*k[j].tb-k[j].q; qq+=k[j].q; } const delta=dq/qq; const r16=(px-k[i-16].c)/a;
      while(di<days.length&&days[di].s1<i) di++; const prev=days.slice(0,di).filter(p=>p.s1<i); const pd=prev[prev.length-1];
      let dayStart=i; while(dayStart>0&&Math.floor(k[dayStart-1].t/864e5)===Math.floor(k[i].t/864e5)) dayStart--; const cur=i-dayStart>=4?E.volProfile(k,dayStart,i,{bins:48}):null; const r24p=E.volProfile(k,i-95,i,{bins:48});
      const naked=prev.slice(-10).map((p,z)=>({p,fh:firstHit[days.indexOf(p)]})).filter(x=>x.fh>i&&x.p.s1<i).map(x=>x.p.poc); let np=0; if(naked.length){ const nn=naked.sort((u,v)=>Math.abs(u-px)-Math.abs(v-px))[0]; np=Math.max(-5,Math.min(5,(nn-px)/a)); }
      const x={hacimOranı:vr,hacimEğilimi:slope,fiyatHacimUyumu:Math.sign(r24)*slope,hacimliHareket:Math.max(-3,Math.min(3,r4))*Math.max(0,vr),delta16:delta,deltaUyumsuzluk:Math.sign(delta)!==Math.sign(r16)?Math.sign(delta):0,
        dünDeğerAlanı:pd?(px>pd.vah?1:px<pd.val?-1:0):0,dünPOCyön:pd?Math.max(-5,Math.min(5,(pd.poc-px)/a)):0,bugünPOCyön:cur?Math.max(-5,Math.min(5,(cur.poc-px)/a)):0,"24saDeğerAlanı":px>r24p.vah?1:px<r24p.val?-1:0,çıplakPOCyön:np};
      const o=outcome(k,atr,i,1); for(const f of F) X[f][h].push(x[f]); Y[h].push(Math.max(-5,Math.min(5,o.fwd))); YY[h].push(2*o.y-1);
      // kova: momentum (r4 yönü) devam ediyor mu, hacim yüksekken ve düşükken
      const bk=(vr>0.4?"hacim yüksek":vr<-0.4?"hacim düşük":"hacim normal")+" · "+(slope>0.5?"artıyor":slope<-0.5?"azalıyor":"yatay"); const B=BUCK[bk]||(BUCK[bk]={n:[0,0],cont:[[],[]]}); if(Math.abs(r4)>0.5){ B.n[h]++; const s=Math.sign(r4); B.cont[h].push(s*Math.max(-5,Math.min(5,o.fwd))); } } }
  const rows=F.map(f=>({okuma:f,IC_getiri1:+corr(X[f][0],Y[0]).toFixed(4),IC_getiri2:+corr(X[f][1],Y[1]).toFixed(4),IC_isabet1:+corr(X[f][0],YY[0]).toFixed(4),IC_isabet2:+corr(X[f][1],YY[1]).toFixed(4)}));
  console.log('örnek',Y[0].length+Y[1].length); console.table(rows);
  const br=Object.entries(BUCK).map(([k,B])=>({kova:k,n1:B.n[0],devam1:+mean(B.cont[0]).toFixed(3),n2:B.n[1],devam2:+mean(B.cont[1]).toFixed(3)})); console.log('4 mumluk hareket (>0,5 ATR) sonraki 4 saatte devam ediyor mu (ATR, + = devam):'); console.table(br);
  fs.writeFileSync(path.join(__dirname,'data','_vol-result.json'),JSON.stringify({rows,br},null,1));
}

if(mode==='uye'||mode==='all'){
  // masadaki iki yeni üyenin oyu (gerçek kod: volRead / tfRead) × güven ile sonucun bilgi katsayısı, iki yarı; Emre'nin günlük yönü sabitken de
  const P={vol:[[],[]],check:[[],[]],checkRes:[[],[]]}; const Yg=[[],[]], Yy=[[],[]], YR=[[],[]];
  for(const d of data){ const k=E.K(d.k15); const atr=atrArr(k); const d1=E.K(d.k1d); const h1all=agg(k,4,36e5);
    for(let i=400;i<k.length-17;i+=4){ const h=k[i].t<MID?0:1; const now=k[i].t+9e5; const w=k.slice(i-199,i+1);
      const V=E.volRead(w,now); const h1=h1all.filter(x=>x.t+36e5<=now).slice(-200); const T=E.tfRead({src:{k1d:d1.filter(x=>x.t<now).slice(-150),k1h:h1,k15L:w}},now); if(!V||!T.d1) continue;
      const bias=require('./bt-lib.js').dailyBiasAt(d1,now,k[i].c); const em=bias==="up"?1:bias==="down"?-1:0;
      for(const sg of [1,-1]){ const o=outcome(k,atr,i,sg); if(!o) continue; const vv=sg*V.s, vc=0.45+0.4*Math.abs(V.s); const tv=Math.max(-1,Math.min(1,E.TFC_CFG.wD*T.d1.d*sg+E.TFC_CFG.w4*(T.h4?T.h4.d:0)*sg)); const tc=T.d1.d?0.6:0.4;
        P.vol[h].push(vv*vc); P.check[h].push(tv*tc); P.checkRes[h].push(tv*tc-0.5*em*sg*0.6); Yg[h].push(Math.max(-5,Math.min(5,o.fwd))); Yy[h].push(2*o.y-1); YR[h].push(Math.max(-1.5,Math.min(3,o.R))); } } }
  const rows=Object.keys(P).map(id=>({üye:id,IC_getiri1:+corr(P[id][0],Yg[0]).toFixed(4),IC_getiri2:+corr(P[id][1],Yg[1]).toFixed(4),IC_isabet1:+corr(P[id][0],Yy[0]).toFixed(4),IC_isabet2:+corr(P[id][1],Yy[1]).toFixed(4),IC_R1:+corr(P[id][0],YR[0]).toFixed(4),IC_R2:+corr(P[id][1],YR[1]).toFixed(4),w:+Math.max(0.25,Math.min(2,1+40*(corr(P[id][0],Yy[0])+corr(P[id][0],YR[0]))/2)).toFixed(2)}));
  console.log('örnek',Yy[0].length+Yy[1].length,'(coin × saat × 2 yön)'); console.table(rows); fs.writeFileSync(path.join(__dirname,'data','_uye-result.json'),JSON.stringify(rows,null,1));
}
