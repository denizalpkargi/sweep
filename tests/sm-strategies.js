// Sosyal medyada en çok anlatılan kural tabanlı stratejiler (11 Ekim 2026) · her biri videodaki/gönderideki en yaygın hâliyle.
// gen(d) → sinyaller {i, dir, stop, tp, maxBars, exit, trail}. Sinyal i mumunun kapanışında; giriş i+1 açılışı (sm-lib).
const L=require('./sm-lib');
const {ema,sma,rsi,macd,atr,boll,supertrend,adx,heikin,psar,cci,vwapDay,fractals,smma,ichimoku,cross,lowest,highest,stochRsi,hma,hh,ll,rma,stdev}=L;
const H=3600e3;
const utcH=t=>new Date(t).getUTCHours(), utcM=t=>new Date(t).getUTCMinutes();
// ortak: swing stop + sabit R hedef
const rr=(d,i,dir,stop,R)=>({i,dir,stop,tp:d.c[i]+dir*R*Math.abs(d.c[i]-stop)});

const S={};
// 1) 200 EMA + MACD (Trading Rush, "MACD 100 kez test", %62 kazanma iddiası): fiyat EMA200 üstünde, MACD sinyali sıfırın ALTINDA yukarı keser → long; stop EMA200 (ya da son 10 mum dibi, hangisi yakınsa değil: video EMA200 diyor), hedef 1,5R
S.ema200macd=d=>{ const e=ema(d.c,200),M=macd(d.c),o=[]; for(let i=201;i<d.n;i++){
  if(d.c[i]>e[i]&&M.m[i]<0&&cross(M.m,M.sig,i)){ const st=Math.min(e[i],lowest(d,i,10)); if(st<d.c[i]) o.push(rr(d,i,1,st,1.5)); }
  if(d.c[i]<e[i]&&M.m[i]>0&&cross(M.sig,M.m,i)){ const st=Math.max(e[i],highest(d,i,10)); if(st>d.c[i]) o.push(rr(d,i,-1,st,1.5)); } } return o; };
// 2) EMA 9/21 kesişimi, stop son 10 mum ucu, hedef 2R
S.ema921=d=>{ const a=ema(d.c,9),b=ema(d.c,21),o=[]; for(let i=30;i<d.n;i++){ if(cross(a,b,i)) o.push(rr(d,i,1,lowest(d,i,10),2)); if(cross(b,a,i)) o.push(rr(d,i,-1,highest(d,i,10),2)); } return o; };
// 3) SuperTrend(10,3) dönüşü: girişte stop = SuperTrend çizgisi, çizgi izler, ters dönüşte çık
S.supertrend=d=>{ const st=supertrend(d,10,3),o=[]; for(let i=20;i<d.n;i++){ if(st.dir[i]!==st.dir[i-1]&&st.dir[i-1]!==0){ const dir=st.dir[i];
  o.push({i,dir,stop:st.line[i],trail:(j)=>st.line[j],exit:(j)=>st.dir[j]!==dir}); } } return o; };
// 4) RSI 30/70 + 200 EMA (Trading Rush, ~%49): trend yönünde RSI 30'u (long) / 70'i (short) geri keser; stop son 10 mum ucu, hedef 1,5R
S.rsi200=d=>{ const r=rsi(d.c,14),e=ema(d.c,200),o=[]; for(let i=201;i<d.n;i++){ if(d.c[i]>e[i]&&r[i-1]<30&&r[i]>=30) o.push(rr(d,i,1,lowest(d,i,10),1.5)); if(d.c[i]<e[i]&&r[i-1]>70&&r[i]<=70) o.push(rr(d,i,-1,highest(d,i,10),1.5)); } return o; };
// 5) RSI uyumsuzluğu: pivot (5/5) dipler, fiyat daha düşük dip + RSI daha yüksek dip, ilk dip RSI<30; onay pivotun bilindiği mumda; stop yeni dip, hedef 2R
S.rsiDiv=d=>{ const r=rsi(d.c,14),o=[],k=5; let lastL=null,lastH=null; for(let i=2*k+20;i<d.n;i++){ const p=i-k; let isL=true,isH=true; for(let j=1;j<=k;j++){ if(!(d.l[p]<d.l[p-j]&&d.l[p]<=d.l[p+j])) isL=false; if(!(d.h[p]>d.h[p-j]&&d.h[p]>=d.h[p+j])) isH=false; }
  if(isL){ if(lastL&&p-lastL.p<=60&&d.l[p]<lastL.l&&r[p]>lastL.r&&lastL.r<30) o.push(rr(d,i,1,d.l[p]*0.999,2)); lastL={p,l:d.l[p],r:r[p]}; }
  if(isH){ if(lastH&&p-lastH.p<=60&&d.h[p]>lastH.h&&r[p]<lastH.r&&lastH.r>70) o.push(rr(d,i,-1,d.h[p]*1.001,2)); lastH={p,h:d.h[p],r:r[p]}; } } return o; };
// 6) Bollinger ortaya dönüş: kapanış alt bandın altında, sonraki kapanış içeride → long; hedef orta bant, stop son 5 mum dibi
S.bbRevert=d=>{ const b=boll(d.c,20,2),o=[]; for(let i=25;i<d.n;i++){ if(d.c[i-1]<b.l[i-1]&&d.c[i]>b.l[i]&&b.m[i]>d.c[i]){ const st=lowest(d,i,5); o.push({i,dir:1,stop:st,tp:b.m[i]}); }
  if(d.c[i-1]>b.u[i-1]&&d.c[i]<b.u[i]&&b.m[i]<d.c[i]){ const st=highest(d,i,5); o.push({i,dir:-1,stop:st,tp:b.m[i]}); } } return o; };
// 7) TRADE PRO 3 EMA (8/14/50) + Stoch RSI + ATR ("%76, 100 işlemle kanıtlı"): EMA8>14>50 ve kapanış üstte, Stoch RSI (3,3,14,14) K D'yi yukarı keser → long; stop 3 ATR, hedef 2 ATR
S.stochEma=d=>{ const e8=ema(d.c,8),e14=ema(d.c,14),e50=ema(d.c,50),s=stochRsi(d.c),a=atr(d,14),o=[]; for(let i=60;i<d.n;i++){
  if(e8[i]>e14[i]&&e14[i]>e50[i]&&d.c[i]>e8[i]&&s.k[i-1]<=s.d[i-1]&&s.k[i]>s.d[i]) o.push({i,dir:1,stop:d.c[i]-3*a[i],tp:d.c[i]+2*a[i]});
  if(e8[i]<e14[i]&&e14[i]<e50[i]&&d.c[i]<e8[i]&&s.k[i-1]>=s.d[i-1]&&s.k[i]<s.d[i]) o.push({i,dir:-1,stop:d.c[i]+3*a[i],tp:d.c[i]-2*a[i]}); } return o; };
// 8) VWAP geri dönüşü (gün içi): günlük VWAP üstünde trend (EMA50 > VWAP), fiyat VWAP'a iner (dip VWAP altına), kapanış üstte → long; stop mum dibi −0,1 ATR, hedef 2R. 06–20 UTC.
S.vwapBounce=d=>{ const v=vwapDay(d),e=ema(d.c,50),a=atr(d,14),o=[]; for(let i=60;i<d.n;i++){ const h=utcH(d.t[i]); if(h<6||h>=20||utcH(d.t[i])<2) continue;
  if(e[i]>v[i]&&d.l[i]<v[i]&&d.c[i]>v[i]&&d.c[i-1]>v[i-1]) o.push(rr(d,i,1,d.l[i]-0.1*a[i],2));
  if(e[i]<v[i]&&d.h[i]>v[i]&&d.c[i]<v[i]&&d.c[i-1]<v[i-1]) o.push(rr(d,i,-1,d.h[i]+0.1*a[i],2)); } return o; };
// 9) New York açılış aralığı kırılımı (ORB): 13:30–14:00 UTC'nin ilk 30 dk aralığı (15 dk'da iki mum; kışın 14:30); kapanış dışarıda → giriş; stop aralığın karşı ucu, hedef 2R, gün sonu (21:00 UTC) çık
S.nyOrb=d=>{ const o=[]; for(let i=2;i<d.n;i++){ const t=d.t[i]; const day=Math.floor(t/864e5); const mo=new Date(t).getUTCMonth(); const dst=mo>=2&&mo<=9; const oh=dst?13:14;
  if(utcH(t)===oh&&utcM(t)===45){ const H0=Math.max(d.h[i],d.h[i-1]),L0=Math.min(d.l[i],d.l[i-1]); let done=false;
    for(let j=i+1;j<d.n&&j<=i+20&&!done;j++){ if(Math.floor(d.t[j]/864e5)!==day) break;
      const end=(k)=>utcH(d.t[k])>=21||Math.floor(d.t[k+1]/864e5)!==day;
      if(d.c[j]>H0){ o.push({i:j,dir:1,stop:L0,tp:d.c[j]+2*(d.c[j]-L0),exit:end}); done=true; }
      else if(d.c[j]<L0){ o.push({i:j,dir:-1,stop:H0,tp:d.c[j]-2*(H0-d.c[j]),exit:end}); done=true; } } } } return o; };
// 10) Londra'da Asya aralığı kırılımı (00–07 UTC aralığı; 07–12 UTC kapanış dışarıda) → kırılım yönünde; stop aralığın ortası, hedef 2R, 20:00 UTC çık
S.asiaLondon=d=>{ const o=[]; let day=-1,aH=0,aL=0,used=false; for(let i=1;i<d.n;i++){ const t=d.t[i],h=utcH(t),dd=Math.floor(t/864e5);
  if(dd!==day){ day=dd; aH=-Infinity; aL=Infinity; used=false; } if(h<7){ aH=Math.max(aH,d.h[i]); aL=Math.min(aL,d.l[i]); continue; }
  if(used||h>=12) continue; const mid=(aH+aL)/2, end=k=>utcH(d.t[k])>=20||Math.floor(d.t[k+1]/864e5)!==day;
  if(d.c[i]>aH){ o.push({i,dir:1,stop:mid,tp:d.c[i]+2*(d.c[i]-mid),exit:end}); used=true; } else if(d.c[i]<aL){ o.push({i,dir:-1,stop:mid,tp:d.c[i]-2*(mid-d.c[i]),exit:end}); used=true; } } return o; };
// 11) ICT Silver Bullet (basit): NY 10–11 (14–15 UTC yaz, 15–16 kış); pencerede o günün Londra (07–12 UTC) tepesi/dibi süpürülür, sonra ters yönde FVG oluşur → FVG'nin yakın kenarına limit; stop süpürme ucu, hedef 2R; 60 dk dolmazsa iptal (5 dk / 15 dk)
S.silverBullet=d=>{ const o=[], dt=d.t[1]-d.t[0]; let day=-1,lH=-Infinity,lL=Infinity,sweptH=null,sweptL=null,used=false;
  for(let i=3;i<d.n;i++){ const t=d.t[i],h=utcH(t),dd=Math.floor(t/864e5); const mo=new Date(t).getUTCMonth(); const w0=(mo>=2&&mo<=9)?14:15;
    if(dd!==day){ day=dd; lH=-Infinity; lL=Infinity; sweptH=null; sweptL=null; used=false; }
    if(h>=7&&h<12){ lH=Math.max(lH,d.h[i]); lL=Math.min(lL,d.l[i]); continue; }
    if(h!==w0||used) continue;
    if(d.h[i]>lH) sweptH=Math.max(sweptH??-Infinity,d.h[i]); if(d.l[i]<lL) sweptL=Math.min(sweptL??Infinity,d.l[i]);
    // aşağı FVG (mum i-2 dibi > mum i tepesi) süpürülmüş tepeden sonra → short limit FVG alt kenarına (d.h[i]) değil üst kenara yakın: giriş = mum i-2 dibi
    if(sweptH!==null&&d.l[i-2]>d.h[i]&&d.c[i-1]<d.o[i-1]){ const ent=d.l[i-2],st=sweptH*1.0005; const s=limitFill(d,i,-1,ent,st,2,Math.round(36e5/dt)); if(s){ o.push(s); used=true; } }
    else if(sweptL!==null&&d.h[i-2]<d.l[i]&&d.c[i-1]>d.o[i-1]){ const ent=d.h[i-2],st=sweptL*0.9995; const s=limitFill(d,i,1,ent,st,2,Math.round(36e5/dt)); if(s){ o.push(s); used=true; } } }
  return o; };
// limit dolum: fiyat limiti %0,05 GEÇERSE dolmuş sayılır (proje kuralı); dolum mumunun kapanışını sinyal mumu yapıp girişi limit fiyatı kabul etmek için 'fixEntry'
function limitFill(d,i,dir,ent,st,R,wait){ if(dir>0?!(st<ent):!(st>ent)) return null; for(let j=i+1;j<d.n&&j<=i+wait;j++){
    if(dir>0?d.l[j]<=ent*(1-0.0005):d.h[j]>=ent*(1+0.0005)) return {i:j-1,dir,stop:st,tp:ent+dir*R*Math.abs(ent-st),fixEntry:ent,fillBar:j}; } return null; }
// 12) Heikin Ashi + EMA (yaygın "HA + 50 EMA"): HA mumu yeşile döner ve alt fitilsiz, kapanış EMA50 üstünde → long; stop son 5 mum dibi (geri çekilme dibi), hedef 2R
S.heikinEma=d=>{ const x=heikin(d),e=ema(d.c,50),o=[]; for(let i=55;i<d.n;i++){ const g=x.c[i]>x.o[i],gp=x.c[i-1]>x.o[i-1];
  if(g&&!gp&&Math.abs(x.l[i]-Math.min(x.o[i],x.c[i]))<1e-12*d.c[i]+1e-9&&d.c[i]>e[i]) o.push(rr(d,i,1,lowest(d,i,5),2));
  if(!g&&gp&&Math.abs(x.h[i]-Math.max(x.o[i],x.c[i]))<1e-12*d.c[i]+1e-9&&d.c[i]<e[i]) o.push(rr(d,i,-1,highest(d,i,5),2)); } return o; };
// 13) Ichimoku: fiyat bulutun üstünde, Tenkan Kijun'u yukarı keser, Chikou (kapanış) 26 mum önceki fiyatın üstünde → long; stop Kijun ya da bulut alt ucu (uzak olan), hedef 2R (TRADE PRO "%70"), kapanış Kijun altına inince erken çık
S.ichimoku=d=>{ const I=ichimoku(d),o=[]; for(let i=80;i<d.n;i++){ const top=Math.max(I.spanA[i],I.spanB[i]),bot=Math.min(I.spanA[i],I.spanB[i]);
  if(d.c[i]>top&&cross(I.ten,I.kij,i)&&d.c[i]>d.c[i-26]){ const st=Math.min(I.kij[i],bot); if(st<d.c[i]) o.push({...rr(d,i,1,st,2),exit:j=>d.c[j]<I.kij[j]}); }
  if(d.c[i]<bot&&cross(I.kij,I.ten,i)&&d.c[i]<d.c[i-26]){ const st=Math.max(I.kij[i],top); if(st>d.c[i]) o.push({...rr(d,i,-1,st,2),exit:j=>d.c[j]>I.kij[j]}); } } return o; };
// 14) Altın kesişim 50/200 (günlük): long kesişimde, ölüm kesişiminde çık; felaket stopu 3 ATR (yalnız R ölçüsü için)
S.golden=d=>{ const a=sma(d.c,50),b=sma(d.c,200),A=atr(d,14),o=[]; for(let i=201;i<d.n;i++){ if(cross(a,b,i)) o.push({i,dir:1,stop:d.c[i]-3*A[i],exit:j=>a[j]<b[j]}); if(cross(b,a,i)) o.push({i,dir:-1,stop:d.c[i]+3*A[i],exit:j=>a[j]>b[j]}); } return o; };
// 15) Williams fraktal + 3 EMA (Trading Rush "en iyi scalping", 20/50/100): EMA20>50>100, fiyat 20–50 arasına çekilir, dip fraktalı (onaylı) → long; stop 50 EMA altında ise 50, değilse 100 EMA; hedef 1,5R
S.fractalEma=d=>{ const e20=ema(d.c,20),e50=ema(d.c,50),e100=ema(d.c,100),F=fractals(d,2),o=[]; for(let i=105;i<d.n;i++){
  if(!isNaN(F.dn[i])&&e20[i]>e50[i]&&e50[i]>e100[i]){ const fl=F.dn[i]; if(fl<e20[i]&&fl>e100[i]){ const st=fl>e50[i]?e50[i]:e100[i]; if(st<d.c[i]) o.push(rr(d,i,1,st,1.5)); } }
  if(!isNaN(F.up[i])&&e20[i]<e50[i]&&e50[i]<e100[i]){ const fh=F.up[i]; if(fh>e20[i]&&fh<e100[i]){ const st=fh<e50[i]?e50[i]:e100[i]; if(st>d.c[i]) o.push(rr(d,i,-1,st,1.5)); } } } return o; };
// 16) Parabolic SAR + EMA200 (Trading Rush): fiyat EMA200 üstünde, SAR alta döner → long; stop SAR, hedef 1,5R (100 işlem %43, 200 işlem %52)
S.psar200=d=>{ const p=psar(d),e=ema(d.c,200),o=[]; for(let i=201;i<d.n;i++){ if(p.dir[i]===1&&p.dir[i-1]===-1&&d.c[i]>e[i]&&p.sar[i]<d.c[i]) o.push(rr(d,i,1,p.sar[i],1.5)); if(p.dir[i]===-1&&p.dir[i-1]===1&&d.c[i]<e[i]&&p.sar[i]>d.c[i]) o.push(rr(d,i,-1,p.sar[i],1.5)); } return o; };
// 17) Squeeze Momentum (LazyBear): BB(20,2) Keltner(20,1,5) içinden çıkar (sıkışma biter), momentum (doğrusal regresyon) > 0 ve artıyor → long; stop 2 ATR; momentum düşmeye başlayınca çık
S.squeeze=d=>{ const n=d.n,b=boll(d.c,20,2),m=sma(d.c,20),r=rma(L.tr(d),20),H20=hh(d.h,20),L20=ll(d.l,20),A=atr(d,14),sq=new Int8Array(n),val=new Float64Array(n).fill(NaN);
  for(let i=20;i<n;i++){ const ku=m[i]+1.5*r[i],kl=m[i]-1.5*r[i]; sq[i]=(b.l[i]>kl&&b.u[i]<ku)?1:0; }
  const src=new Float64Array(n); for(let i=20;i<n;i++) src[i]=d.c[i]-((H20[i]+L20[i])/2+m[i])/2;
  for(let i=40;i<n;i++){ let sx=0,sy=0,sxy=0,sxx=0; for(let j=0;j<20;j++){ const y=src[i-19+j]; sx+=j; sy+=y; sxy+=j*y; sxx+=j*j; } const sl=(20*sxy-sx*sy)/(20*sxx-sx*sx); val[i]=(sy-sl*sx)/20+sl*19; }
  const o=[]; for(let i=45;i<n;i++){ if(sq[i-1]===1&&sq[i]===0){ if(val[i]>0&&val[i]>val[i-1]) o.push({i,dir:1,stop:d.c[i]-2*A[i],exit:j=>val[j]<val[j-1]}); else if(val[i]<0&&val[i]<val[i-1]) o.push({i,dir:-1,stop:d.c[i]+2*A[i],exit:j=>val[j]>val[j-1]}); } } return o; };
// 18) UT Bot (anahtar 1, ATR 10): ATR iz stopu kesişimi = al/sat; ters sinyalde çık (stop = iz çizgisi)
S.utbot=d=>{ const a=atr(d,10),n=d.n,ts=new Float64Array(n),pos=new Int8Array(n),o=[]; ts[0]=d.c[0];
  for(let i=1;i<n;i++){ const nl=1*(a[i]||0),c=d.c[i],p=d.c[i-1],t=ts[i-1]; ts[i]=c>t&&p>t?Math.max(t,c-nl):c<t&&p<t?Math.min(t,c+nl):c>t?c-nl:c+nl; pos[i]=p<t&&c>ts[i]?1:p>t&&c<ts[i]?-1:pos[i-1]; }
  for(let i=20;i<n;i++){ if(pos[i]!==pos[i-1]&&pos[i]!==0){ const dir=pos[i]; o.push({i,dir,stop:ts[i],trail:j=>ts[j],exit:j=>pos[j]!==dir}); } } return o; };
// 19) ADX + DI: ADX > 25 ve +DI −DI'yı keser → long; stop 2 ATR, hedef 3 ATR (1,5R)
S.adxDi=d=>{ const X=adx(d,14),A=atr(d,14),o=[]; for(let i=40;i<d.n;i++){ if(X.adx[i]>25&&cross(X.pdi,X.mdi,i)) o.push({i,dir:1,stop:d.c[i]-2*A[i],tp:d.c[i]+3*A[i]}); if(X.adx[i]>25&&cross(X.mdi,X.pdi,i)) o.push({i,dir:-1,stop:d.c[i]+2*A[i],tp:d.c[i]-3*A[i]}); } return o; };
// 20) Hull MA (55) yön değişimi: HMA yukarı döner → long; stop 2 ATR; ters dönüşte çık
S.hull=d=>{ const h=hma(d.c,55),A=atr(d,14),o=[]; for(let i=70;i<d.n;i++){ const up=h[i]>h[i-1],upp=h[i-1]>h[i-2]; if(up&&!upp) o.push({i,dir:1,stop:d.c[i]-2*A[i],exit:j=>h[j]<h[j-1]}); if(!up&&upp) o.push({i,dir:-1,stop:d.c[i]+2*A[i],exit:j=>h[j]>h[j-1]}); } return o; };
// 21) MACD + RSI birlikte: MACD sinyali yukarı keser ve RSI(14) 50'yi aynı 3 mumda yukarı geçer → long; stop son 10 mum dibi, hedef 2R
S.macdRsi=d=>{ const M=macd(d.c),r=rsi(d.c,14),o=[]; for(let i=40;i<d.n;i++){ let mx=false,mn=false,rx=false,rn=false; for(let k=0;k<3;k++){ const j=i-k; if(cross(M.m,M.sig,j)) mx=true; if(cross(M.sig,M.m,j)) mn=true; if(r[j-1]<50&&r[j]>=50) rx=true; if(r[j-1]>50&&r[j]<=50) rn=true; }
  if(mx&&rx&&(cross(M.m,M.sig,i)||(r[i-1]<50&&r[i]>=50))) o.push(rr(d,i,1,lowest(d,i,10),2)); if(mn&&rn&&(cross(M.sig,M.m,i)||(r[i-1]>50&&r[i]<=50))) o.push(rr(d,i,-1,highest(d,i,10),2)); } return o; };
// 22) Yutan mum + 20 mumluk destek/direnç: son 20 mumun dibine ±0,3 ATR yakın boğa yutan → long; stop yutan mumun dibi, hedef 2R
S.engulf=d=>{ const A=atr(d,14),o=[]; for(let i=25;i<d.n;i++){ const bull=d.c[i]>d.o[i]&&d.c[i-1]<d.o[i-1]&&d.c[i]>=d.o[i-1]&&d.o[i]<=d.c[i-1], bear=d.c[i]<d.o[i]&&d.c[i-1]>d.o[i-1]&&d.c[i]<=d.o[i-1]&&d.o[i]>=d.c[i-1];
  const lo=lowest(d,i-2,20),hi=highest(d,i-2,20); const ml=Math.min(d.l[i],d.l[i-1]),mh=Math.max(d.h[i],d.h[i-1]);
  if(bull&&ml<=lo+0.3*A[i]) o.push(rr(d,i,1,ml,2)); if(bear&&mh>=hi-0.3*A[i]) o.push(rr(d,i,-1,mh,2)); } return o; };
// 23) CCI ±100 (Woodie tarzı basit): CCI(20) −100'ün altından yukarı keser ve fiyat EMA200 üstünde → long; stop 2 ATR, hedef 2R
S.cci=d=>{ const c=cci(d,20),e=ema(d.c,200),A=atr(d,14),o=[]; for(let i=201;i<d.n;i++){ if(c[i-1]<-100&&c[i]>=-100&&d.c[i]>e[i]) o.push({i,dir:1,stop:d.c[i]-2*A[i],tp:d.c[i]+4*A[i]}); if(c[i-1]>100&&c[i]<=100&&d.c[i]<e[i]) o.push({i,dir:-1,stop:d.c[i]+2*A[i],tp:d.c[i]-4*A[i]}); } return o; };
// 24) Donchian 20 kırılımı (Kaplumbağa, test #1/#53 ile kıyas için): kapanış önceki 20 mum tepesini geçer → long; stop 2 ATR; kapanış önceki 10 mum dibinin altına inince çık
S.donchian=d=>{ const H20=hh(d.h,20),L20=ll(d.l,20),H10=hh(d.h,10),L10=ll(d.l,10),A=atr(d,20),o=[]; for(let i=30;i<d.n;i++){ if(d.c[i]>H20[i-1]) o.push({i,dir:1,stop:d.c[i]-2*A[i],exit:j=>d.c[j]<L10[j-1]}); if(d.c[i]<L20[i-1]) o.push({i,dir:-1,stop:d.c[i]+2*A[i],exit:j=>d.c[j]>H10[j-1]}); } return o; };


// ---------- ikinci tur: kaynak taramasından (TRADE PRO, Trading Rush, Data Trader, My Trading Journey, Big Daddy Max, EliteTrader) ----------
// 25) TRADE PRO 200 EMA + MACD, 3:1 (S.ema200macd ile aynı giriş, hedef 3R)
S.ema200macd3=d=>S.ema200macd(d).map(s=>({...s,tp:d.c[s.i]+s.dir*3*Math.abs(d.c[s.i]-s.stop)}));
// 26) Trading Rush SuperTrend + 200 EMA: SuperTrend (10,3) yeşile döner ve fiyat EMA200 üstünde → long; stop SuperTrend çizgisi, hedef 1,5R (100/200 işlem %46)
S.st200=d=>{ const st=supertrend(d,10,3),e=ema(d.c,200),o=[]; for(let i=201;i<d.n;i++){ if(st.dir[i]!==st.dir[i-1]&&st.dir[i-1]!==0){ const dir=st.dir[i]; if(dir>0?d.c[i]>e[i]:d.c[i]<e[i]) o.push(rr(d,i,dir,st.line[i],1.5)); } } return o; };
// 27) TRADE PRO üçlü SuperTrend (10,1)(11,2)(12,3) + Stoch RSI + 200 EMA ("en yüksek kâr, %76"): kapanış EMA200 üstünde, Stoch RSI K 20 altından yukarı keser, en az 2 SuperTrend fiyatın altında → long; stop ikinci SuperTrend çizgisi (alttan ikinci), hedef 1,5R
S.tripleSt=d=>{ const A=[supertrend(d,10,1),supertrend(d,11,2),supertrend(d,12,3)],e=ema(d.c,200),s=stochRsi(d.c),o=[]; for(let i=201;i<d.n;i++){
  const kx=s.k[i-1]<20&&s.k[i-1]<=s.d[i-1]&&s.k[i]>s.d[i], kd=s.k[i-1]>80&&s.k[i-1]>=s.d[i-1]&&s.k[i]<s.d[i];
  const below=A.filter(x=>x.dir[i]===1).map(x=>x.line[i]).sort((a,b)=>b-a), above=A.filter(x=>x.dir[i]===-1).map(x=>x.line[i]).sort((a,b)=>a-b);
  if(kx&&d.c[i]>e[i]&&below.length>=2) o.push(rr(d,i,1,below[1],1.5)); if(kd&&d.c[i]<e[i]&&above.length>=2) o.push(rr(d,i,-1,above[1],1.5)); } return o; };
// 28) Data Trader Stoch + RSI + MACD ("kanıtlı 100 işlem"): Stoch(14,3,3) K ve D 20 altında, RSI(14) > 50, MACD > sinyal → long (son 3 mumda üçü birden ilk kez); stop son 10 mum dibi, hedef 1,5R
S.dataTrader=d=>{ const n=d.n,K0=L.stoch(d,14),K=L.smaN(K0,3),D=L.smaN(K,3),r=rsi(d.c,14),M=macd(d.c),o=[]; let lastL=-99,lastS=-99;
  for(let i=40;i<n;i++){ let sl=false,ss=false; for(let k=0;k<3;k++){ const j=i-k; if(K[j]<20&&D[j]<20) sl=true; if(K[j]>80&&D[j]>80) ss=true; }
    const L1=sl&&r[i]>50&&M.m[i]>M.sig[i], S1=ss&&r[i]<50&&M.m[i]<M.sig[i];
    if(L1&&i-lastL>3) o.push(rr(d,i,1,lowest(d,i,10),1.5)); if(L1) lastL=i; if(S1&&i-lastS>3) o.push(rr(d,i,-1,highest(d,i,10),1.5)); if(S1) lastS=i; } return o; };
// 29) Trading Rush Bollinger + RSI + 200 MA: 200 MA yönünde, kapanış alt bandın dışında sonra içeride ve RSI < 40 (long) → stop son 5 mum dibi, hedef 1,5R
S.bbRsi200=d=>{ const b=boll(d.c,20,2),r=rsi(d.c,14),m=sma(d.c,200),o=[]; for(let i=201;i<d.n;i++){
  if(d.c[i]>m[i]&&d.c[i-1]<b.l[i-1]&&d.c[i]>b.l[i]&&Math.min(r[i],r[i-1])<40) o.push(rr(d,i,1,lowest(d,i,5),1.5));
  if(d.c[i]<m[i]&&d.c[i-1]>b.u[i-1]&&d.c[i]<b.u[i]&&Math.max(r[i],r[i-1])>60) o.push(rr(d,i,-1,highest(d,i,5),1.5)); } return o; };
// Schaff Trend Cycle (12/26 yerine viral ayar 23/50, döngü 10)
function stc(x,f=23,sl=50,cyc=10){ const a=ema(x,f),b=ema(x,sl),n=x.length,m=new Float64Array(n).fill(NaN); for(let i=0;i<n;i++) m[i]=a[i]-b[i];
  const st=(src)=>{ const o=new Float64Array(n).fill(NaN); let prev=NaN; for(let i=cyc-1;i<n;i++){ let lo=Infinity,hi=-Infinity,ok=true; for(let j=i-cyc+1;j<=i;j++){ if(isNaN(src[j])){ok=false;break;} lo=Math.min(lo,src[j]); hi=Math.max(hi,src[j]); } if(!ok) continue; const v=hi>lo?100*(src[i]-lo)/(hi-lo):(isNaN(prev)?50:prev); prev=isNaN(prev)?v:prev+0.5*(v-prev); o[i]=prev; } return o; };
  return st(st(m)); }
// 30) My Trading Journey "UT Bot + STC + Hull, %98,3" (1–5 dk): UT Bot (1,10) al sinyali, STC yeşil ve yükseliyor (> önceki, < 75 değil şartı yok), kapanış HMA(200) üstünde → long; stop UT çizgisi, hedef 1,5R
S.utStcHull=d=>{ const a=atr(d,10),n=d.n,ts=new Float64Array(n),pos=new Int8Array(n); ts[0]=d.c[0];
  for(let i=1;i<n;i++){ const nl=a[i]||0,c=d.c[i],p=d.c[i-1],t=ts[i-1]; ts[i]=c>t&&p>t?Math.max(t,c-nl):c<t&&p<t?Math.min(t,c+nl):c>t?c-nl:c+nl; pos[i]=p<t&&c>ts[i]?1:p>t&&c<ts[i]?-1:pos[i-1]; }
  const S0=stc(d.c),h=hma(d.c,200),o=[]; for(let i=220;i<n;i++){ if(pos[i]===pos[i-1]) continue;
    if(pos[i]===1&&S0[i]>S0[i-1]&&d.c[i]>h[i]&&ts[i]<d.c[i]) o.push(rr(d,i,1,ts[i],1.5)); if(pos[i]===-1&&S0[i]<S0[i-1]&&d.c[i]<h[i]&&ts[i]>d.c[i]) o.push(rr(d,i,-1,ts[i],1.5)); } return o; };
// ZLSMA (sıfır gecikmeli doğrusal regresyon)
function linreg(x,p){ const n=x.length,o=new Float64Array(n).fill(NaN); for(let i=p-1;i<n;i++){ let sx=0,sy=0,sxy=0,sxx=0; for(let j=0;j<p;j++){ const y=x[i-p+1+j]; sx+=j; sy+=y; sxy+=j*y; sxx+=j*j; } const sl=(p*sxy-sx*sy)/(p*sxx-sx*sx); o[i]=(sy-sl*sx)/p+sl*(p-1); } return o; }
function zlsma(x,p=50){ const a=linreg(x,p),b=linreg(a.map(v=>isNaN(v)?0:v),p),o=new Float64Array(x.length).fill(NaN); for(let i=2*p;i<x.length;i++) o[i]=2*a[i]-b[i]; return o; }
// 31) Chandelier Exit (ATR 1, ×2, kapanışla) + ZLSMA 50 (TikTok/YouTube 1 dk scalping): CE al sinyali ve kapanış ZLSMA üstünde → long; stop CE çizgisi, hedef 1,5R
S.ceZlsma=d=>{ const n=d.n,a=L.tr(d),z=zlsma(d.c,50),ls=new Float64Array(n),ss=new Float64Array(n),dir=new Int8Array(n); dir[0]=1; ls[0]=d.c[0]; ss[0]=d.c[0];
  for(let i=1;i<n;i++){ let l=d.c[i]-2*a[i], s=d.c[i]+2*a[i]; if(d.c[i-1]>ls[i-1]) l=Math.max(l,ls[i-1]); if(d.c[i-1]<ss[i-1]) s=Math.min(s,ss[i-1]); ls[i]=l; ss[i]=s; dir[i]=d.c[i]>ss[i-1]?1:d.c[i]<ls[i-1]?-1:dir[i-1]; }
  const o=[]; for(let i=110;i<n;i++){ if(dir[i]===dir[i-1]) continue; if(dir[i]===1&&d.c[i]>z[i]&&ls[i]<d.c[i]) o.push(rr(d,i,1,ls[i],1.5)); if(dir[i]===-1&&d.c[i]<z[i]&&ss[i]>d.c[i]) o.push(rr(d,i,-1,ss[i],1.5)); } return o; };
// 32) Big Daddy Max ORB: ABD nakit açılışından (13:30 UTC yaz / 14:30 kış) sonraki ilk 15 dk aralığı; 5 dk kapanış dışarıda → giriş, günde bir; stop aralığın karşı ucu, hedef 1R / 2R (iki varyant); 20:00 UTC'de kapat
function orb(R){ return d=>{ const o=[], dt=d.t[1]-d.t[0], nb=Math.round(9e5/dt); for(let i=nb;i<d.n;i++){ const t=d.t[i]; const mo=new Date(t).getUTCMonth(); const dst=mo>=2&&mo<=9; const oh=dst?13:14;
    if(!(utcH(t)===oh&&utcM(t)===45-(dt/6e4))) continue; const day=Math.floor(t/864e5); let H0=-Infinity,L0=Infinity; for(let k=0;k<nb;k++){ H0=Math.max(H0,d.h[i-k]); L0=Math.min(L0,d.l[i-k]); }
    const end=k=>utcH(d.t[k])>=20||k+1>=d.n||Math.floor(d.t[k+1]/864e5)!==day;
    for(let j=i+1;j<d.n&&utcH(d.t[j])<20;j++){ if(Math.floor(d.t[j]/864e5)!==day) break;
      if(d.c[j]>H0){ o.push({i:j,dir:1,stop:L0,tp:d.c[j]+R*(d.c[j]-L0),exit:end}); break; } if(d.c[j]<L0){ o.push({i:j,dir:-1,stop:H0,tp:d.c[j]-R*(H0-d.c[j]),exit:end}); break; } } } return o; }; }
S.orb1=orb(1); S.orb2=orb(2);
// 33) Londra sahte kırılımı (TJR tarzı Asya süpürmesi): 07–12 UTC'de Asya (00–07) tepesi süpürülür, sonra kapanış Asya aralığına geri döner ve son 3 mumun dibini kırar (yapı kırılımı) → short; stop süpürme tepesi, hedef Asya'nın karşı ucu (en az 1R değilse işlem yok); 20:00 UTC kapat
S.asiaFakeout=d=>{ const o=[]; let day=-1,aH=0,aL=0,sH=null,sL=null,used=false; for(let i=3;i<d.n;i++){ const t=d.t[i],h=utcH(t),dd=Math.floor(t/864e5);
  if(dd!==day){ day=dd; aH=-Infinity; aL=Infinity; sH=null; sL=null; used=false; } if(h<7){ aH=Math.max(aH,d.h[i]); aL=Math.min(aL,d.l[i]); continue; } if(used||h>=12) continue;
  if(d.h[i]>aH) sH=Math.max(sH??-Infinity,d.h[i]); if(d.l[i]<aL) sL=Math.min(sL??Infinity,d.l[i]); const end=k=>utcH(d.t[k])>=20||k+1>=d.n||Math.floor(d.t[k+1]/864e5)!==day;
  if(sH!==null&&d.c[i]<aH&&d.c[i]<Math.min(d.l[i-1],d.l[i-2],d.l[i-3])){ const st=sH*1.0005; if(st>d.c[i]&&(d.c[i]-aL)>=(st-d.c[i])){ o.push({i,dir:-1,stop:st,tp:aL,exit:end}); used=true; continue; } }
  if(sL!==null&&d.c[i]>aL&&d.c[i]>Math.max(d.h[i-1],d.h[i-2],d.h[i-3])){ const st=sL*0.9995; if(st<d.c[i]&&(aH-d.c[i])>=(d.c[i]-st)){ o.push({i,dir:1,stop:st,tp:aH,exit:end}); used=true; } } } return o; };
// 34) EMA şeridi 8/13/21 geri çekilme: EMA 8>13>21>50, dip EMA21'e değer, sonra kapanış EMA8 üstüne çıkar (2 mum içinde) → long; stop çekilme dibi, hedef 2R
S.emaRibbon=d=>{ const a=ema(d.c,8),b=ema(d.c,13),c=ema(d.c,21),e=ema(d.c,50),o=[]; for(let i=60;i<d.n;i++){
  if(a[i]>b[i]&&b[i]>c[i]&&c[i]>e[i]&&(d.l[i-1]<=c[i-1]||d.l[i-2]<=c[i-2])&&d.c[i]>a[i]&&d.c[i-1]<=a[i-1]) o.push(rr(d,i,1,Math.min(d.l[i-1],d.l[i-2],d.l[i]),2));
  if(a[i]<b[i]&&b[i]<c[i]&&c[i]<e[i]&&(d.h[i-1]>=c[i-1]||d.h[i-2]>=c[i-2])&&d.c[i]<a[i]&&d.c[i-1]>=a[i-1]) o.push(rr(d,i,-1,Math.max(d.h[i-1],d.h[i-2],d.h[i]),2)); } return o; };
// 35) EliteTrader'ın 37 stratejiden tek sağ kalanı: 1 sa trend yönünde (5 dk'da EMA 600 ≈ 1 sa EMA50), NY seansı (13:30–20 UTC), 20 EMA'ya geri çekilip üstünde kapanış → long; stop 1,5 ATR, hedef 0,75R
S.ema20pb=d=>{ const e20=ema(d.c,20),big=ema(d.c,Math.round(50*36e5/(d.t[1]-d.t[0]))),A=atr(d,14),o=[]; for(let i=700;i<d.n;i++){ const h=utcH(d.t[i])+utcM(d.t[i])/60; if(h<13.5||h>=20) continue;
  if(d.c[i]>big[i]&&e20[i]>big[i]&&d.l[i]<=e20[i]&&d.c[i]>e20[i]){ const st=d.c[i]-1.5*A[i]; o.push({i,dir:1,stop:st,tp:d.c[i]+0.75*1.5*A[i]}); }
  if(d.c[i]<big[i]&&e20[i]<big[i]&&d.h[i]>=e20[i]&&d.c[i]<e20[i]){ const st=d.c[i]+1.5*A[i]; o.push({i,dir:-1,stop:st,tp:d.c[i]-0.75*1.5*A[i]}); } } return o; };

module.exports={S,limitFill};
