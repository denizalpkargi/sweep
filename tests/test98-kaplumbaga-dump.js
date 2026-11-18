// Test #98 yardımcısı: Kaplumbağa (research-daily-wide.js T1 long + BTC SMA200, %0,5 · 10 · 2×) günlük getirisini yazar.
// Kullanım: node tests/test98-kaplumbaga-dump.js $PWD/tests tests/data/arch/test98-kaplumbaga-gunluk.csv
const fs=require('fs'), path=require('path'); const T=process.argv[2];
let src=fs.readFileSync(path.join(T,'research-daily-wide.js'),'utf8');
src=src.slice(0,src.indexOf('const fx=')).replace("return {cagr:","return {daily,cagr:");
process.argv.push('--top','50','--risk','0.005','--maxpos','10','--lev','2');
const E=new Function('require','__dirname','process',src+'\nreturn {D,trades,portfolio,btcAbove,DAY};')(require,T,process);
let all=[]; for(const s of Object.keys(E.D)) all=all.concat(E.trades(s,'T1',1,false));
const tr=all.filter(x=>x.ti>=Date.UTC(2020,5,1)&&E.btcAbove(x.ti-E.DAY)===true); const pf=E.portfolio(tr);
fs.writeFileSync(process.argv[3],'t,r\n'+pf.daily.map(x=>new Date(x.t).toISOString().slice(0,10)+','+x.r).join('\n'));
console.log(tr.length,pf.cagr,pf.mdd);
