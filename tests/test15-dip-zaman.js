// Test listesi #15: Geri çekilme sepetinde zaman stopu 7–10 gün (ve "+%3 ya da 7 gün").
// Canlı kod (src/dip.js: dipIntraday → dipFund → dipClose) arşivin günlük mumlarıyla oynatılır (replay-dip.js akışı); src değişmez.
// Veri: tests/data/arch/1d (BTC, ETH, SOL, BNB), fonlama arşivden 8 saatte bir (08/16 fiyatı 1 sa açılışı).
// Varyantlar (DIP_DEF üzerinde yalnız hold / tp / stop değişir; felaket stopu −%25 hepsinde):
//   20 gün (canlı) · 10 · 9 · 8 · 7 gün (tp +%3, kapanış stopu −%10 aynı) ·
//   "+%3 ya da 7 gün" (kapanış stopu yok) · "+%3 ya da 10 gün" (kapanış stopu yok) · "yalnız 7 gün" (kâr hedefi ve kapanış stopu yok).
// İşlem istatistiği giriş tarihine göre pencerelere bölünür; özkaynak ölçüleri tek koşunun eğrisinden.
// Kullanım: node tests/test15-dip-zaman.js → tests/test15-dip-zaman-report.md
const fs=require('fs'), path=require('path');
const {stats,years,pc,nf,dstr,T0,T1,TM,L24,L12,E,D,IDX,H1,frAt}=require('./test02-trend-fren.js'); const DAY=864e5, H8=8*3600e3;
const SY=E.DIP_DEF.syms;
function runDip(cfg){
  const s=E.dipNew(cfg); const eq=[]; const TR=[]; // canlı kod son 1000 işlemi tutar: her gün boşaltılır
  for(let t=T0;t<T1;t+=DAY){ const px={}, cl={};
    for(const k of SY){ const i=IDX[k].get(t); if(i!=null){ px[k]=D[k][i].o; cl[k]=D[k][i].c; } }
    E.dipFund(s,px,t,frAt(t));
    for(const k of SY){ const i=IDX[k].get(t); if(i==null) continue; E.dipIntraday(s,k,D[k][i],t+DAY/2); }
    for(const h of [H8,2*H8]){ const p2={}; for(const k of SY){ const o=H1[k].get(t+h); p2[k]=o>0?o:cl[k]; } E.dipFund(s,p2,t+h,frAt(t+h)); }
    for(const k of SY){ const i=IDX[k].get(t); if(i==null) continue; const data={}; for(const q of [...SY,'BTCUSDT']){ const j=IDX[q].get(t); if(j!=null) data[q]=D[q].slice(Math.max(0,j-130),j+1); }
      E.dipClose(s,k,D[k][i],data,t+DAY-1); }
    TR.push(...s.trades); s.trades.length=0; eq.push([t,E.dipEq(s,cl)]); }
  s.trades=TR; return {s,eq};
}
const tstat=a=>{ const n=a.length; if(!n) return {n:0}; const m=a.reduce((x,y)=>x+y,0)/n; const sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/Math.max(1,n-1));
  return {n,wr:a.filter(r=>r>0).length/n,avg:m,t:sd>0?m/sd*Math.sqrt(n):0,worst:Math.min(...a)}; };
const V=[['20 gün (canlı)',{}],['10 gün',{hold:10}],['9 gün',{hold:9}],['8 gün',{hold:8}],['7 gün',{hold:7}],
  ['+%3 ya da 7 gün (kapanış stopu yok)',{hold:7,stop:0.99}],['+%3 ya da 10 gün (kapanış stopu yok)',{hold:10,stop:0.99}],['yalnız 7 gün',{hold:7,stop:0.99,tp:10}]];
const W=[['Tüm dönem',T0,T1],['1. yarı',T0,TM],['2. yarı',TM,T1],['Son 24 ay',L24,T1],['Son 12 ay',L12,T1]];
let md=`# Test #15 · Geri çekilme sepetinde zaman stopu 7–10 gün\n\nBetik \`tests/test15-dip-zaman.js\` (canlı \`src/dip.js\`, arşiv 1g + gerçek fonlama). Dönem ${dstr(T0)} → ${dstr(T1-DAY)}; 1. yarı → ${dstr(TM)}. 4 yuva × özkaynağın ¼'ü × 1x. İşlem getirisi = fiyat hareketi cinsinden net (komisyon + kayma + fonlama dahil). Zaman stopu değerleri kaynakta verilen 7–10 gün aralığı; veriye bakılarak seçilmedi.\n\n`;
md+='## İşlem başına (giriş tarihine göre)\n\n| Varyant | '+W.map(w=>w[0]+' n / kazanma / ort.').join(' | ')+' |\n|---|'+W.map(()=>'---').join('|')+'|\n';
const res=[];
for(const [n,c] of V){ const r=runDip(c); const tr=r.s.trades; const S={}; for(const [w,a,b] of W) S[w]=tstat(tr.filter(x=>x.t>=a&&x.t<b).map(x=>x.r));
  const Q={}; for(const [w,a,b] of W) Q[w]=stats(r.eq,a,b,r.s.start); const why={}; for(const x of tr) why[x.why]=(why[x.why]||0)+1;
  const yr={}; for(const x of tr){ const y=new Date(x.t).getUTCFullYear(); (yr[y]=yr[y]||[]).push(x.r); }
  res.push({n,S,Q,why,yr,yrEq:years(r.eq,r.s.start),days:tr.reduce((a,x)=>a+(x.days||0),0)/tr.length});
  console.log(n.padEnd(38),W.map(([w])=>`${w}: ${S[w].n} ${pc(S[w].wr)} ${pc(S[w].avg,2)} t${nf(S[w].t,1)}`).join(' | '),'| yıllık',pc(Q['Tüm dönem'].cagr),'düşüş',pc(Q['Tüm dönem'].dd),JSON.stringify(why)); }
for(const r of res) md+=`| ${r.n} | `+W.map(([w])=>`${r.S[w].n} / ${pc(r.S[w].wr)} / ${pc(r.S[w].avg,2)}`).join(' | ')+' |\n';
md+='\n## Özkaynak (1x)\n\n| Varyant | Yıllık | Düşüş | Sharpe | 1. yarı yıllık / düşüş | 2. yarı yıllık / düşüş | Son 24 ay yıllık / düşüş | Son 12 ay getiri / düşüş | t (tüm) | En kötü işlem | Ort. gün |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
for(const r of res){ const Q=r.Q; md+=`| ${r.n} | ${pc(Q['Tüm dönem'].cagr)} | ${pc(Q['Tüm dönem'].dd)} | ${nf(Q['Tüm dönem'].sharpe)} | ${pc(Q['1. yarı'].cagr)} / ${pc(Q['1. yarı'].dd)} | ${pc(Q['2. yarı'].cagr)} / ${pc(Q['2. yarı'].dd)} | ${pc(Q['Son 24 ay'].cagr)} / ${pc(Q['Son 24 ay'].dd)} | ${pc(Q['Son 12 ay'].ret)} / ${pc(Q['Son 12 ay'].dd)} | ${nf(r.S['Tüm dönem'].t,1)} | ${pc(r.S['Tüm dönem'].worst,1)} | ${nf(r.days,1)} |\n`; }
const ys=Object.keys(res[0].yr);
md+='\n## Yıl yıl işlem başı ortalama (kazanma)\n\n| Varyant | '+ys.join(' | ')+' |\n|---|'+ys.map(()=>'---').join('|')+'|\n';
for(const r of res) md+=`| ${r.n} | `+ys.map(y=>{ const a=r.yr[y]||[]; const st=tstat(a); return st.n?`${pc(st.avg,2)} (${pc(st.wr)})`:'–'; }).join(' | ')+' |\n';
md+='\n## Yıl yıl özkaynak getirisi\n\n| Varyant | '+ys.join(' | ')+' |\n|---|'+ys.map(()=>'---').join('|')+'|\n';
for(const r of res) md+=`| ${r.n} | `+ys.map(y=>pc(r.yrEq[y])).join(' | ')+' |\n';
md+='\n## Çıkış nedenleri\n\n'+res.map(r=>`- ${r.n}: `+Object.entries(r.why).map(([k,v])=>`${k} ${v}`).join(', ')).join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'test15-dip-zaman-report.md'),md);
console.log('yazıldı tests/test15-dip-zaman-report.md');
