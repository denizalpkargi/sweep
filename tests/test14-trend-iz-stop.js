// Test listesi #14: Trend sepetine 2,5 × günlük ATR iz süren stop; stop sonrası o coin yeni sinyale kadar nakit.
// Oynatma tests/test02-trend-fren.js runTrend (canlı src/trend.js fonksiyonları, arşiv 1g + gerçek fonlama); src değişmez.
// İz stop: pozisyon açıldığında stop = açılış − 2,5 × ATR(14, önceki gün); her kapanışta stop = max(stop, kapanış − 2,5 × ATR(14)) (yalnız yukarı).
//   Uygulama: "gün içi" (gün içi en düşük ≤ stop → min(açılış, stop) − kayma) ya da "kapanış" (kapanış ≤ stop → ertesi açılışta çık).
//   Yeni sinyal: "sıfırlama" = coinin hedef ağırlığı bir kez 0'a inip (tüm SMA'ların altı ya da BTC SMA50 altı) yeniden artıya dönmesi;
//   "zirve" = stoptan önceki en yüksek kapanışın üstünde kapanış.
// Fren yok, hedef modu yok; tv 1,4 (canlı varsayılan) ve 0,8.
// Kullanım: node tests/test14-trend-iz-stop.js → tests/test14-trend-iz-stop-report.md
const fs=require('fs'), path=require('path');
const {runTrend,summarize,tables,pc,nf,dstr,T0,T1,TM}=require('./test02-trend-fren.js'); const DAY=864e5;
const V=[['iz stop yok',null],['gün içi, sıfırlama',{k:2.5,n:14,mode:'gun',re:'sifir'}],['gün içi, zirve',{k:2.5,n:14,mode:'gun',re:'zirve'}],
  ['kapanış, sıfırlama',{k:2.5,n:14,mode:'kapanis',re:'sifir'}],['kapanış, zirve',{k:2.5,n:14,mode:'kapanis',re:'zirve'}]];
let md=`# Test #14 · Trend sepetine 2,5 × günlük ATR iz süren stop\n\nBetik \`tests/test14-trend-iz-stop.js\` (oynatma \`tests/test02-trend-fren.js\`, canlı \`src/trend.js\`). Dönem ${dstr(T0)} → ${dstr(T1-DAY)}; 1. yarı → ${dstr(TM)}. ATR 14 gün, k 2,5 (kaynakta verilen değer, veriye bakılarak seçilmedi). Fren yok, bant %20, taker %0,05 + kayma %0,03, gerçek fonlama.\n\n`;
const all={};
for(const tv of [1.4,0.8]){ const rows=[];
  for(const [n,tr] of V){ const r=runTrend({tv,trail:tr}); const S=summarize(r); S.trailN=r.trailLog.length; S.trailAvg=r.trailLog.length?r.trailLog.reduce((a,x)=>a+x.r,0)/r.trailLog.length:null;
    rows.push({name:n,S}); all[`tv${tv} ${n}`]=S;
    console.log(`tv ${tv} ${n.padEnd(20)}`,['Tüm dönem','1. yarı','2. yarı','Son 24 ay','Son 12 ay'].map(w=>`${w}: ${pc(S[w].cagr)} ${pc(S[w].dd)} sh ${nf(S[w].sharpe)}`).join(' | '),`stop ${S.stops}`); }
  md+=`## tv ${String(tv).replace('.',',')}\n\n`+tables(rows)+'\n\n| Varyant | İz stop sayısı | Stopla kapanan kısmın ort. fiyat getirisi | İşlem | Komisyon $ | Fonlama $ | Son özkaynak $ |\n|---|---|---|---|---|---|---|\n'+
    rows.map(({name,S})=>`| ${name} | ${S.stops} | ${S.trailAvg==null?'–':pc(S.trailAvg,1)} | ${S.trades} | ${nf(S.fees,0)} | ${nf(S.funding,0)} | ${nf(S.end,0)} |`).join('\n')+'\n\n'; }
fs.writeFileSync(path.join(__dirname,'test14-trend-iz-stop-report.md'),md);
console.log('yazıldı tests/test14-trend-iz-stop-report.md');
