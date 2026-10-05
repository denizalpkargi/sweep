/* ---------- Kurulum 2: konsolidasyon kırılımı → momentum mumunun FVG'sine geri test (Brad Goh / Trading Geek modeli) ---------- */
// k: 15 dk mumlar. dir: long/short. bias: günlük yön. nowIdx: geriye dönük test için "şimdi".
function breakoutRetest(k, med15, dir, bias, nowIdx){
  const isL=dir==="long"; const n=nowIdx??k.length; const res={dir,stage:"noBox",grade:"C"};
  if(n<80) return res;
  const bodies=k.slice(Math.max(0,n-96),n).map(c=>Math.abs(c.c-c.o)/c.c).sort((a,b)=>a-b); const bodyMed=bodies[Math.floor(bodies.length/2)]||1e-9;
  const avgQ=k.slice(Math.max(0,n-96),n).reduce((a,c)=>a+c.q,0)/Math.min(96,n);
  const tol=Math.max(0.012,2.5*med15);
  // en yeni kırılım mumu: öncesinde 16–60 mumluk dar kutu, gövde ≥1,5× medyan, kapanış kutunun dışında
  let best=null;
  for(let b=n-2;b>=Math.max(20,n-72);b--){
    const c=k[b]; const body=Math.abs(c.c-c.o)/c.c; if(body<1.5*bodyMed) continue;
    let lo=Infinity,hi=-Infinity,len=0; for(let i=b-1;i>=Math.max(0,b-60);i--){ const nlo=Math.min(lo,k[i].l), nhi=Math.max(hi,k[i].h); if((nhi-nlo)/((nhi+nlo)/2)>tol) break; lo=nlo; hi=nhi; len++; }
    if(len<16) continue;
    const broke = isL ? (c.c>hi && c.o<=hi*1.002) : (c.c<lo && c.o>=lo*0.998);
    if(!broke) continue;
    best={b,lo,hi,len}; break;
  }
  if(!best){ res.stage="noBox"; return res; }
  const {b,lo,hi,len}=best; Object.assign(res,{box:[lo,hi],boxLen:len,bo:b,boPx:isL?k[b].h:k[b].l,aligned:bias===(isL?"up":"down"),volX:k[b].q/avgQ,kz:killZone(k[b].t)});
  if(b+1>=n){ res.stage="waitNext"; return res; }
  // dengesizlik (FVG): önceki mumun tepesi ile sonraki mumun dibi arasındaki boşluk (long); short için tersi
  const fLo = isL ? k[b-1].h : k[b+1].h, fHi = isL ? k[b+1].l : k[b-1].l;
  if(!(fHi>fLo)){ res.stage="noFVG"; return res; }
  res.fvg=[fLo,fHi]; res.fvgMid=(fLo+fHi)/2;
  res.entry = isL ? fHi : fLo;            // limit emir dengesizliğin kenarına
  res.entry50 = res.fvgMid;               // daha derin ikinci emir: %50 (adil değer)
  res.stop = isL ? k[b].l*(1-0.001) : k[b].h*(1+0.001);   // momentum mumunun arkası
  const risk=Math.abs(res.entry-res.stop); res.r2 = isL ? res.entry+2*risk : res.entry-2*risk; res.r3 = isL ? res.entry+3*risk : res.entry-3*risk; res.t1=res.r2; res.rr1=2;
  res.sd=risk/res.entry;
  // geri test: kırılımdan sonra fiyat FVG'nin kenarına döner mi? (24 mum içinde)
  let touched=-1; for(let j=b+2;j<n;j++){ const c=k[j]; if(isL? c.l<=fHi : c.h>=fLo){ touched=j; break; } if(isL? c.c<fLo*0.998 : c.c>fHi*1.002){ res.stage="failed"; res.failAt=j; return res; } if(j-b>24){ res.stage="expired"; return res; } }
  let g=0; if(res.aligned) g++; if(len>=20) g++; if((fHi-fLo)/res.entry>=0.3*med15) g++; if(res.kz) g++; if(res.volX>=1.5) g++; res.gradePts=g; res.grade = g>=4&&res.aligned ? "A" : g>=3&&res.aligned ? "B" : "C";
  const px=k[n-1].c;
  if(touched<0){ res.stage="waitRetest"; return res; }
  res.touched=touched;
  for(let j=touched;j<n;j++){ const c=k[j]; if(isL? c.l<=res.stop : c.h>=res.stop){ res.stage="stopped"; res.endAt=j; return res; } if(isL? c.h>=res.t1 : c.l<=res.t1){ res.stage="done"; res.endAt=j; return res; } }
  const inZone = isL ? (px>=fLo*0.998 && px<=fHi*1.004) : (px<=fHi*1.002 && px>=fLo*0.996);
  res.stage = inZone ? "entry" : "afterTouch";
  return res;
}
function breakoutStats(k, med15, dir){
  const out={A:{n:0,win:0,rr:0},B:{n:0,win:0,rr:0},C:{n:0,win:0,rr:0},trades:[]}; const seen=new Set(); let i=100;
  while(i<k.length-40){
    const bias=(()=>{ const c=k.slice(i-96,i).map(x=>x.c); const a=c.slice(-20).reduce((x,y)=>x+y,0)/20, b=c.slice(-60,-40).reduce((x,y)=>x+y,0)/20; return a>b*1.005?"up":a<b*0.995?"down":"flat"; })();
    const r=breakoutRetest(k,med15,dir,bias,i);
    if(!r.fvg || seen.has(r.bo) || r.stage==="failed" || r.stage==="expired"){ i+=3; continue; }
    seen.add(r.bo);
    const rr=breakoutRetest(k,med15,dir,bias,Math.min(k.length,r.bo+40));
    if(!rr || rr.bo!==r.bo || rr.touched==null){ i=Math.max(i+3,r.bo+2); continue; }
    const res = rr.stage==="done"?"win":rr.stage==="stopped"?"lose":"open";
    if(res!=="open"){ out[r.grade].n++; out[r.grade].rr+=2; if(res==="win") out[r.grade].win++; out.trades.push({g:r.grade,res,rr:2,kz:r.kz||null,t:k[r.bo].t}); }
    i=Math.max(i+3,rr.touched+1);
  }
  return out;
}
