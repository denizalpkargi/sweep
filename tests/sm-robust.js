// Sosyal medya stratejileri: ilk süzgeçten geçenlerin sağlamlık testi (11 Ekim 2026) → tests/sm-robust-report.md
// (1) evren dışı 30 coin (aynı kurallar, 4s/1g), (2) parametre komşuları (hedef R, stop geriye bakış) ana 20 coinde
const fs=require('fs'),path=require('path'); const L=require('./sm-lib'); const {S}=require('./sm-strategies');
const {ema,sma,rsi,macd,lowest,highest,ichimoku,cross,atr}=L;
const MAIN='BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,LINKUSDT,LTCUSDT,DOTUSDT,AVAXUSDT,BCHUSDT,ETCUSDT,TRXUSDT,XLMUSDT,ATOMUSDT,FILUSDT,UNIUSDT,NEARUSDT,AAVEUSDT'.split(',');
const OUT='MATICUSDT,EOSUSDT,XTZUSDT,THETAUSDT,VETUSDT,ALGOUSDT,ICPUSDT,SANDUSDT,MANAUSDT,AXSUSDT,GALAUSDT,APEUSDT,OPUSDT,ARBUSDT,INJUSDT,SUIUSDT,APTUSDT,RUNEUSDT,CRVUSDT,SNXUSDT,COMPUSDT,KAVAUSDT,EGLDUSDT,HBARUSDT,ZECUSDT,DASHUSDT,NEOUSDT,IOTAUSDT,SUSHIUSDT,1INCHUSDT'.split(',');
const rr=(d,i,dir,stop,R)=>({i,dir,stop,tp:d.c[i]+dir*R*Math.abs(d.c[i]-stop)});
// parametreli kopyalar
const dataTrader=(R,lb)=>d=>{ const K=L.smaN(L.stoch(d,14),3),D=L.smaN(K,3),r=rsi(d.c,14),M=macd(d.c),o=[]; let lastL=-99,lastS=-99;
  for(let i=40;i<d.n;i++){ let sl=false,ss=false; for(let k=0;k<3;k++){ const j=i-k; if(K[j]<20&&D[j]<20) sl=true; if(K[j]>80&&D[j]>80) ss=true; }
    const a=sl&&r[i]>50&&M.m[i]>M.sig[i], b=ss&&r[i]<50&&M.m[i]<M.sig[i];
    if(a&&i-lastL>3) o.push(rr(d,i,1,lowest(d,i,lb),R)); if(a) lastL=i; if(b&&i-lastS>3) o.push(rr(d,i,-1,highest(d,i,lb),R)); if(b) lastS=i; } return o; };
const ichi=(R,kijExit)=>d=>{ const I=ichimoku(d),o=[]; for(let i=80;i<d.n;i++){ const top=Math.max(I.spanA[i],I.spanB[i]),bot=Math.min(I.spanA[i],I.spanB[i]);
  if(d.c[i]>top&&cross(I.ten,I.kij,i)&&d.c[i]>d.c[i-26]){ const st=Math.min(I.kij[i],bot); if(st<d.c[i]) o.push({...(R?rr(d,i,1,st,R):{i,dir:1,stop:st}),...(kijExit?{exit:j=>d.c[j]<I.kij[j]}:{})}); }
  if(d.c[i]<bot&&cross(I.kij,I.ten,i)&&d.c[i]<d.c[i-26]){ const st=Math.max(I.kij[i],top); if(st>d.c[i]) o.push({...(R?rr(d,i,-1,st,R):{i,dir:-1,stop:st}),...(kijExit?{exit:j=>d.c[j]>I.kij[j]}:{})}); } } return o; };
const rsi200=(R,lb)=>d=>{ const r=rsi(d.c,14),e=ema(d.c,200),o=[]; for(let i=201;i<d.n;i++){ if(d.c[i]>e[i]&&r[i-1]<30&&r[i]>=30) o.push(rr(d,i,1,lowest(d,i,lb),R)); if(d.c[i]<e[i]&&r[i-1]>70&&r[i]<=70) o.push(rr(d,i,-1,highest(d,i,lb),R)); } return o; };
const T=[];
const run=(grp,ad,syms,iv,g)=>{ const s=L.summarize(L.runStrategy(ad,syms,iv,g)); s.grp=grp; T.push(s); console.log(grp,ad,iv,s.n,s.R?.toFixed(3),s.h1?.toFixed(3),s.h2?.toFixed(3),s.l12?.toFixed(3),s.diff?.toFixed(3)); };
for(const iv of ['4h','1d']){ run('evren dışı 30 coin','Stoch + RSI + MACD',OUT,iv,S.dataTrader); run('evren dışı 30 coin','Ichimoku',OUT,iv,S.ichimoku); run('evren dışı 30 coin','RSI 30/70 + 200 EMA',OUT,iv,S.rsi200); run('evren dışı 30 coin','Altın kesişim 50/200',OUT,iv,S.golden); }
for(const R of [1,1.5,2,3]) for(const lb of [5,10,20]) run('komşu (ana 20)',`Stoch + RSI + MACD · ${R}R · stop ${lb} mum`,MAIN,'4h',dataTrader(R,lb));
for(const R of [0,1.5,2,3]) for(const kx of [true,false]) if(R||kx) run('komşu (ana 20)',`Ichimoku · ${R?R+'R':'hedefsiz'} · ${kx?'Kijun çıkışı':'yalnız stop/hedef'}`,MAIN,'4h',ichi(R,kx));
for(const R of [1,1.5,2,3]) for(const lb of [5,10,20]) run('komşu (ana 20)',`RSI 30/70 + 200 EMA · ${R}R · stop ${lb} mum`,MAIN,'4h',rsi200(R,lb));
const f=(x,k=3)=>x==null||isNaN(x)?'–':x.toFixed(k).replace('.',',');
let md='# Sağlamlık: ilk süzgeçten geçen stratejiler\n\nAynı simülatör (sm-lib). Evren dışı: ana 20 coinde olmayan 30 perp (MATIC, EOS, XTZ, THETA, VET, ALGO, ICP, SAND, MANA, AXS, GALA, APE, OP, ARB, INJ, SUI, APT, RUNE, CRV, SNX, COMP, KAVA, EGLD, HBAR, ZEC, DASH, NEO, IOTA, SUSHI, 1INCH; delist edilen MATIC dahil). Komşular: hedef R ve stop geriye bakışı değiştirilir.\n\n| Grup | Strateji | Zaman | İşlem | Kazanma | Ort. R | 1. yarı | 2. yarı | Son 12 ay | Rastgele | Fark | Fark t |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n';
for(const s of T) md+=`| ${s.grp} | ${s.name} | ${s.iv} | ${s.n} | ${(100*s.win).toFixed(0)} % | **${f(s.R)}** | ${f(s.h1)} | ${f(s.h2)} | ${f(s.l12)} | ${f(s.rnd)} | ${f(s.diff)} | ${f(s.tDiff,1)} |\n`;
fs.writeFileSync(path.join(__dirname,'sm-robust-report.md'),md+'\n_node tests/sm-robust.js_\n');
