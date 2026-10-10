// Test listesi #18 (8 Ekim 2026): öncü iz araştırmasının tek tutarlı kuralı ("haftalık dipte + hacim patlaması + kalabalık long → short")
// gerçek işlem gibi: stoplu, aynı coinde üst üste binmeyen, eşikler yalnız ilk yarıdan. Ek olarak masaya "sakin saatte girme" süzgeci.
// A) Kural: saat başı, 7 günlük aralıkta yer ≤ eşik (ilk yarının %10'u), 1 sa hacim / 30 gün ≥ eşik (%80), tüm hesaplar long/short z ≥ eşik (%70).
//    Giriş sonraki mumun açılışı (taker + kayma, gidiş-dönüş %0,16), stop = giriş + k × 4 sa oynaklık (mum içi tepe), çıkış süre sonunda kapanış.
//    Aynı coinde açık işlem varken yeni sinyal alınmaz. Basamaklar: yalnız dip, + hacim, + kalabalık (kural kendisi), stop ve süre çeşitleri.
// B) Masa: bugünkü giriş kuralını geçen arşiv kararlarında (samples-*.jsonl) son 4 sa aralık / 30 gün ve 1 sa hacim oranı beşlikleri → R.
// Kullanım: node tests/test-haftalik-dip.js [--top 30] [--out dosya.md]
const fs=require('fs'), path=require('path'), readline=require('readline');
const ARCH=path.join(__dirname,'data','arch'); const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const TOP=+arg('top',30), OUT=arg('out',path.join(__dirname,'test-haftalik-dip-report.md')), M15=9e5, H=36e5, L=Math.log, COST=0.0016;
const csv=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number)):[];
const U=JSON.parse(fs.readFileSync(path.join(ARCH,'universe.json'),'utf8')).months;
const monthsOf={}; for(const m in U) for(const s of U[m].slice(0,TOP)) (monthsOf[s]=monthsOf[s]||new Set()).add(m);
const fx=(v,d=2)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
const out=[`# Test #18 · haftalık dip + hacim + kalabalık long → short, ve masada sakin saat süzgeci · ${new Date().toISOString().slice(0,10)}\n`];

// ---------- A) olay listesi (saat başı, özellikler ham) ----------
const C={}; const EV=[]; // {s,i,t,pos7,vq1,globZ,sd4}
for(const s of Object.keys(monthsOf)){ const f=path.join(ARCH,'15m',s+'.csv'); if(!fs.existsSync(f)) continue; const k=csv(f); if(k.length<4000) continue; C[s]=k;
  const M=csv(path.join(ARCH,'metrics',s+'.csv')); const n=k.length;
  const cs=c=>{ const a=new Float64Array(n+1); for(let i=0;i<n;i++) a[i+1]=a[i]+c(i); return a; }; const sum=(A,a,b)=>A[b+1]-A[a];
  const Cq=cs(i=>k[i][7]), Cr2=cs(i=>i?L(k[i][4]/k[i-1][4])**2:0);
  const LG=M.map(r=>r[5]>0?L(r[5]):NaN); let mj=0;
  const z7=j=>{ if(j<500||!Number.isFinite(LG[j])) return NaN; let s1=0,s2=0,c=0; for(let x=Math.max(0,j-2016);x<j;x+=12) if(Number.isFinite(LG[x])){ s1+=LG[x]; s2+=LG[x]**2; c++; } if(c<50) return NaN; const m=s1/c; return (LG[j]-m)/Math.sqrt(Math.max(1e-12,s2/c-m*m)); };
  for(let i=2900;i<n-1;i++){ const t=k[i][0]+M15; if(t%H) continue; if(!monthsOf[s].has(new Date(k[i][0]).toISOString().slice(0,7))) continue;
    const sd15=Math.sqrt(sum(Cr2,i-2879,i)/2880); if(!(sd15>0)) continue; const px=k[i][4];
    let h7=-1e18,l7=1e18; for(let j=i-671;j<i-3;j++){ if(k[j][2]>h7) h7=k[j][2]; if(k[j][3]<l7) l7=k[j][3]; }
    const pos7=(px-l7)/Math.max(1e-12,h7-l7), vq1=(sum(Cq,i-3,i)/4)/(sum(Cq,i-2879,i)/2880);
    let g=NaN; if(M.length){ while(mj+1<M.length&&M[mj+1][0]<=t) mj++; if(M[mj][0]<=t&&t-M[mj][0]<=9e5) g=z7(mj); }
    EV.push({s,i,t,pos7,vq1,g,sd4:sd15*4}); } }
EV.sort((a,b)=>a.t-b.t); const MID=EV[EV.length>>1].t, END=EV[EV.length-1].t, Y12=END-365*864e5;
const q=(key,p)=>{ const a=EV.filter(e=>e.t<MID&&Number.isFinite(e[key])).map(e=>e[key]).sort((x,y)=>x-y); return a[Math.floor(a.length*p)]; };
const TH={pos7:q('pos7',0.1), vq1:q('vq1',0.8), g:q('g',0.7)};
console.log('gözlem',EV.length,'eşik',TH);

// ---------- işlem simülasyonu ----------
function sim(flt,{k=2,hold=96,dir=-1}={}){ const busy={}; const T=[];
  for(const e of EV){ if(!flt(e)) continue; if(busy[e.s]>e.i) continue; const K=C[e.s]; const i0=e.i+1; if(i0+hold>=K.length) continue;
    const en=K[i0][1], stop=dir<0?en*Math.exp(k*e.sd4):en*Math.exp(-k*e.sd4), sd=Math.abs(stop/en-1); let ex=null, j=i0;
    for(;j<i0+hold;j++){ if(dir<0?K[j][2]>=stop:K[j][3]<=stop){ ex=stop; break; } } if(ex==null){ j=i0+hold-1; ex=K[j][4]; }
    const pnl=dir*(ex/en-1)-COST; busy[e.s]=j+1; T.push({t:e.t,s:e.s,pnl,R:pnl/sd,stop:ex===stop}); }
  return T; }
const per={'1. yarı':x=>x.t<MID,'2. yarı':x=>x.t>=MID,'son 12 ay':x=>x.t>=Y12};
const avg=a=>a.length?a.reduce((p,x)=>p+x,0)/a.length:NaN;
function row(nm,T){ const c=Object.values(per).map(f=>{ const a=T.filter(f); return `${a.length} · ${fx(100*avg(a.map(x=>x.pnl)))}% · ${fx(avg(a.map(x=>x.R)))}R`; });
  const s=T.map(x=>x.R).sort((a,b)=>a-b); const trim=avg(s.slice(0,Math.floor(s.length*0.95)));
  const days=new Set(T.map(x=>new Date(x.t).toISOString().slice(0,10))).size;
  return `| ${nm} | ${T.length} | %${fx(100*T.filter(x=>x.pnl>0).length/T.length,0)} | ${c.join(' | ')} | ${fx(trim)}R | ${days} |`; }
const HEAD=['| Deneme | İşlem | Kazanma | 1. yarı (n · ort. % · R) | 2. yarı | Son 12 ay | En iyi %5 hariç R | Farklı gün |','|---|---|---|---|---|---|---|---|'];
const dip=e=>e.pos7<=TH.pos7, vol=e=>e.vq1>=TH.vq1, crowd=e=>e.g>=TH.g, rule=e=>dip(e)&&vol(e)&&crowd(e);
out.push(`## A) Kural gerçek işlem gibi\n`,`${Object.keys(C).length} coin (ayın ilk ${TOP}'u), ${EV.length.toLocaleString('tr-TR')} saat başı, ${new Date(EV[0].t).toISOString().slice(0,7)} → ${new Date(END).toISOString().slice(0,7)}. Eşikler yalnız ilk yarıdan: 7 gün aralıkta yer ≤ ${fx(TH.pos7)}, 1 sa hacim / 30 gün ≥ ${fx(TH.vq1)}, tüm hesaplar long/short z ≥ ${fx(TH.g)}. Short, giriş sonraki mumun açılışı, gidiş-dönüş %0,16 maliyet düşülmüş, aynı coinde açık işlem varken yeni sinyal yok. Ana ayar: stop 2 × 4 sa oynaklık, 24 sa tutuş (önceden seçildi, sonuca bakılmadan).\n`,...HEAD);
const MAIN=sim(rule);
const tries=[['Ana: kural, stop 2σ, 24 sa',MAIN],['Basamak: yalnız haftalık dip',sim(dip)],['Basamak: dip + hacim',sim(e=>dip(e)&&vol(e))],['Basamak: dip + kalabalık long',sim(e=>dip(e)&&crowd(e))],
  ['Kural, stop 1,5σ, 24 sa',sim(rule,{k:1.5})],['Kural, stop 3σ, 24 sa',sim(rule,{k:3})],['Kural, stop 2σ, 4 sa',sim(rule,{hold:16})],['Kural, stop 2σ, 48 sa',sim(rule,{hold:192})],
  ['Plasebo: her saat short (aynı stop/süre)',sim(e=>e.t%(4*H)===0)],['Ters: kural ama long',sim(rule,{dir:1})]];
for(const [nm,T] of tries) out.push(row(nm,T));
// yıllara göre ve aylık R toplamı
const yr={}; for(const x of MAIN){ const y=new Date(x.t).getUTCFullYear(); (yr[y]=yr[y]||[]).push(x); }
out.push('',`Ana denemenin yılları: ${Object.keys(yr).map(y=>`${y} ${yr[y].length} işlem ${fx(avg(yr[y].map(x=>x.R)))}R`).join(' · ')}.`);
const stops=MAIN.filter(x=>x.stop).length; out.push(`Stopla kapanan: ${stops} / ${MAIN.length}. En iyi 5 işlem: ${MAIN.slice().sort((a,b)=>b.R-a.R).slice(0,5).map(x=>`${x.s} ${new Date(x.t).toISOString().slice(0,10)} ${fx(x.R)}R`).join(', ')}.`);
// aynı güne yığılma: günlük ortalama R ile (her gün tek oy)
const byDay={}; for(const x of MAIN){ const d=new Date(x.t).toISOString().slice(0,10); (byDay[d]=byDay[d]||[]).push(x.R); }
const dayR=Object.entries(byDay).map(([d,a])=>({t:Date.parse(d),R:avg(a)}));
out.push(`Gün başına tek oy (aynı gün işlemlerinin ortalaması): ${Object.entries(per).map(([n,f])=>`${n} ${fx(avg(dayR.filter(f).map(x=>x.R)))}R (${dayR.filter(f).length} gün)`).join(' · ')}.`);

// ---------- B) masa + sakin saat ----------
(async()=>{
  const S=[]; for(const f of fs.readdirSync(ARCH).filter(f=>/^samples-\d+\.jsonl$/.test(f))){
    const rl=readline.createInterface({input:fs.createReadStream(path.join(ARCH,f))}); for await(const l of rl){ if(!l.includes('"veto":0')) continue; const o=JSON.parse(l); if(o.score>=0.35&&o.yes>=3) S.push({s:o.sym,t:o.t,R:o.R,vq:o.x.vq}); } }
  const bySym={}; for(const o of S) (bySym[o.s]=bySym[o.s]||[]).push(o);
  for(const s in bySym){ const k=C[s]||csv(path.join(ARCH,'15m',s+'.csv')); if(!k.length) continue; const ix=new Map(k.map((r,i)=>[r[0],i]));
    const rg=k.map(r=>L(r[2]/r[3])); const cr=new Float64Array(k.length+1); for(let i=0;i<k.length;i++) cr[i+1]=cr[i]+rg[i];
    for(const o of bySym[s]){ const i=ix.get(o.t); if(i==null||i<2880) continue; o.rng4=((cr[i+1]-cr[i-15])/16)/((cr[i+1]-cr[i-2879])/2880); } }
  const D=S.filter(o=>Number.isFinite(o.rng4)).sort((a,b)=>a.t-b.t); const mid=D[D.length>>1].t, y12=D[D.length-1].t-365*864e5;
  const pd={'1. yarı':x=>x.t<mid,'2. yarı':x=>x.t>=mid,'son 12 ay':x=>x.t>=y12};
  out.push('','## B) Masa kararları ve sakin saat',`Bugünkü giriş kuralını geçen ${D.length.toLocaleString('tr-TR')} arşiv kararı (veto yok, puan ≥ 35, evet ≥ 3). Beşlik sınırları ilk yarıdan. Hücre: karar sayısı · ortalama R.\n`);
  for(const [key,nm] of [['rng4','son 4 sa aralık / 30 gün ortalaması'],['vq','son 1 sa hacim / 30 gün ortalaması']]){
    const h=D.filter(x=>x.t<mid&&Number.isFinite(x[key])).map(x=>x[key]).sort((a,b)=>a-b); const ed=[0.2,0.4,0.6,0.8].map(p=>h[Math.floor(h.length*p)]);
    const b=v=>ed.filter(e=>v>=e).length;
    out.push(`**${nm}** (sınırlar ${ed.map(e=>fx(e)).join(' / ')})\n`,'| Beşlik | '+Object.keys(pd).join(' | ')+' |','|---|---|---|---|');
    for(let j=0;j<5;j++) out.push(`| ${j+1}${j==0?' (en sakin)':j==4?' (en hareketli)':''} | ${Object.values(pd).map(f=>{ const a=D.filter(x=>f(x)&&Number.isFinite(x[key])&&b(x[key])===j); return `${a.length} · ${fx(avg(a.map(x=>x.R)))}`; }).join(' | ')} |`);
    const keep=x=>b(x[key])>0; out.push('',`Sakin beşliği atlarsak: ${Object.entries(pd).map(([n,f])=>`${n} ${fx(avg(D.filter(f).map(x=>x.R)))} → ${fx(avg(D.filter(x=>f(x)&&keep(x)).map(x=>x.R)))}R`).join(' · ')}.\n`); }
  fs.writeFileSync(OUT,out.join('\n')+'\n'); console.log(out.join('\n'));
})();
