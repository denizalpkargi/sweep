// Araştırma ekibi (src/research.js) uçtan uca testi, DOM'suz.
//   node tests/research-node.js          → yapay veri: içine gömülü bir kalıbı (geri çekilmede + BTC lehte long kazanır, kovalama kaybeder) bulmalı
//   node tests/research-node.js --real   → tests/data/leaders-real.json (tests/record-leaders.js ile kendi makinende kaydedilir) üzerinde gerçek analiz
// İki modda da veri, Binance yanıt biçimindeki sahte fetch'ten geçer: toplama (position-history) → zenginleştirme (1 sa mumlar) → analiz → canlı eşleşme → ileri test.
const fs=require('fs'); const {loadEngine}=require('./engine-node.js');
const REAL=process.argv.includes('--real'); const H=36e5;
let rnd=7; const rand=()=>{ rnd=(rnd*16807)%2147483647; return rnd/2147483647; };
function walk(n,p0,vol,drift){ const out=[]; let p=p0; const t0=Math.floor(Date.now()/H)*H-(n-1)*H; for(let i=0;i<n;i++){ const o=p; const c=p*(1+(rand()-0.5)*2*vol+(drift||0)*Math.sin(i/90)); const h=Math.max(o,c)*(1+rand()*vol*0.6), l=Math.min(o,c)*(1-rand()*vol*0.6); const q=1e6*(0.6+rand()*0.8); out.push([t0+i*H,String(o),String(h),String(l),String(c),"1000",t0+(i+1)*H-1,String(q),"50",String(q/2),String(q/2),"0"]); p=c; } return out; }
let data;
if(REAL){ const f=__dirname+'/data/leaders-real.json'; if(!fs.existsSync(f)){ console.log('tests/data/leaders-real.json yok. Önce kendi makinende: node tests/record-leaders.js'); process.exit(1); } data=JSON.parse(fs.readFileSync(f,'utf8')); }
else {
  const E0=loadEngine(); const K=E0.K;
  const syms=['AAAUSDT','BBBUSDT','CCCUSDT','DDDUSDT','EEEUSDT','FFFUSDT','GGGUSDT','HHHUSDT']; const kl={BTCUSDT:walk(1500,60000,0.006,0.002)}; for(const s of syms) kl[s]=walk(1500,1+rand()*50,0.012,0.003);
  const KK={}; for(const s in kl) KK[s]=K(kl[s]);
  const leaders=[]; const hist={};
  for(let L=0;L<8;L++){ const id=String(1000+L); leaders.push({leadPortfolioId:id,nickname:'Lider'+L,roi:100+L*10,pnl:5000,aum:50000,mdd:20,winRate:60,currentCopyCount:100}); const list=[];
    for(let n=0;n<160;n++){ const s=syms[Math.floor(rand()*syms.length)]; const k=KK[s]; const i=80+Math.floor(rand()*(k.length-120)); const t=k[i].t+Math.floor(rand()*H); const dir=rand()<0.5?'long':'short';
      const f=E0.labFeat(k,KK.BTCUSDT,t,dir); if(!f) continue; const entry=k[i].c; const sg=dir==='long'?1:-1;
      // gömülü kalıp: geri çekilmede + BTC lehte → ort +1,2 ATR; kovalama → ort −0,9 ATR; gerisi gürültü (ort 0)
      let m=(rand()-0.5)*2.4; if(f.yer==='geri'&&f.btc==='lehte') m=1.2+(rand()-0.5)*1.6; else if(f.yer==='kova') m=-0.9+(rand()-0.5)*1.6;
      const exit=entry*(1+sg*m*f.atr); const hold=1+rand()*10; list.push({symbol:s,side:dir==='long'?'Long':'Short',opened:t,closed:t+hold*H,avgCost:entry,avgClosePrice:exit,closingPnl:(m>0?1:-1)*50,roi:m*f.atr*20*100,leverage:'20'}); }
    hist[id]=list.sort((a,b)=>b.closed-a.closed); }
  data={leaders,hist,klines:kl};
}
// Binance yanıt biçiminde sahte fetch
const resp=o=>Promise.resolve({ok:true,status:200,headers:{get:()=>null},json:()=>Promise.resolve(o),text:()=>Promise.resolve(JSON.stringify(o))});
globalThis.fetch=(u,opt)=>{ if(u.includes('/copy-trade/')){ const b=opt&&opt.body?JSON.parse(opt.body):{};
    if(u.includes('position-history')){ const all=data.hist[b.portfolioId]||[]; const ps=b.pageSize||50; return resp({code:'000000',data:{list:all.slice((b.pageNumber-1)*ps,b.pageNumber*ps)}}); }
    return resp({code:'000000',data:{list:[]}}); }
  const sym=(u.match(/symbol=(\w+)/)||[])[1]; const k=data.klines[sym]; if(!k) return Promise.resolve({ok:false,status:400,headers:{get:()=>null},text:()=>Promise.resolve('bad symbol')});
  const st=+(u.match(/startTime=(\d+)/)||[])[1]; const lim=+(u.match(/limit=(\d+)/)||[])[1]||500; const rows=st?k.filter(x=>x[0]>=st).slice(0,lim):k.slice(-lim); return resp(rows); };
const E=loadEngine(); const fails=[]; const ok=(c,msg)=>{ if(!c) fails.push(msg); console.log((c?'✓ ':'✗ ')+msg); };
(async()=>{
  E.ld.list=data.leaders.map(x=>({id:String(x.leadPortfolioId),nick:x.nickname,roi:+x.roi,aum:+x.aum,copiers:+x.currentCopyCount,mdd:+x.mdd}));
  const t0=Date.now(); await E.labHarvest(99); console.log(`toplama: ${E.lab.trades.length} işlem, ${((Date.now()-t0)/1000).toFixed(1)} sn`);
  while(E.lab.trades.some(x=>x.f===null)) await E.labEnrich(50);
  E.labAnalyze(); const B=E.lab.base;
  const fmt=c=>`${c.dir.toUpperCase().padEnd(5)} ${c.name.padEnd(62)} n=${String(c.n).padStart(4)} lider=${c.leaders} kazanma=%${Math.round(c.wr*100)} ort=${c.mean.toFixed(2)} ATR yarılar ${c.h1.toFixed(2)}/${c.h2.toFixed(2)} t=${c.t} tutuş=${c.hold}sa`;
  console.log(`zenginleşen ${B?B.featured:0}/${E.lab.trades.length} · lider ${B?B.leaders:0} · taban long ${B?B.long.mean:'-'} ATR, short ${B?B.short.mean:'-'} ATR`);
  console.log('\nADAYLAR'); E.lab.cands.forEach(c=>console.log('  '+fmt(c)));
  console.log('KAÇIN'); E.lab.avoid.forEach(c=>console.log('  '+fmt(c)));
  console.log('STİLLER'); Object.values(E.lab.styles).slice(0,REAL?30:4).forEach(s=>console.log(`  ${s.nick.padEnd(22)} n=${s.n} kazanma=%${Math.round(s.wr*100)} ort=${s.mean.toFixed(2)} tutuş=${s.hold.toFixed(1)}sa ${s.tags.join(' · ')}`));
  if(REAL){ console.log('\nNOTLAR'); E.lab.notes.forEach(n=>console.log('  '+n.who+': '+n.text)); return; }
  ok(E.lab.trades.length>=1000,'position-history sayfaları toplanıp tekilleştirildi');
  ok(E.lab.cands.some(c=>c.conds.some(x=>x[1]==='geri')),'gömülü kalıp (geri çekilme) aday olarak bulundu');
  ok(E.lab.cands.length&&['yer=geri','btc=lehte'].every(k=>E.lab.cands[0].conds.some(x=>x.join('=')===k)),'en güçlü aday tam olarak gömülü kalıp (geri çekilme + BTC lehte)');
  ok(E.lab.avoid.some(c=>c.conds.some(x=>x.join('=')==='yer=kova')),'kovalama kaçınılacak kalıp olarak bulundu');
  ok(!E.lab.cands.some(c=>c.conds.some(x=>x[0]==='ses')&&c.conds.length===1),'gürültü faktörü (seans) tek başına aday olmadı');
  // ikinci toplama aynı işlemleri çoğaltmamalı
  const n0=E.lab.trades.length; for(const id in E.lab.harvestAt) E.lab.harvestAt[id]=1; await E.labHarvest(99); ok(E.lab.trades.length===n0,'tekrar toplama çift kayıt üretmedi');
  // canlı eşleşme: adayın koşullarını sağlayan bir an bul, masaya giden labMatch onu görmeli ve gölge sinyal yazmalı
  const c0=E.lab.cands[0]; let hit=null; const KK={}; for(const s in data.klines) KK[s]=E.K(data.klines[s]);
  const btc15=[]; for(const b of KK.BTCUSDT){ for(let q=0;q<4;q++) btc15.push({t:b.t+q*9e5,o:b.o,h:b.h,l:b.l,c:b.c,v:b.v/4,q:b.q/4,tb:b.tb/4}); }
  outer: for(const s of Object.keys(KK).filter(x=>x!=='BTCUSDT')) for(let i=200;i<KK[s].length;i+=7){ const k=KK[s].slice(0,i); const b15=btc15.filter(x=>x.t<k[k.length-1].t+H); const A={px:k[k.length-1].c,src:{k1h:k,btc15:b15}}; const m=E.labMatch(A,c0.dir,s); if(m&&m.hits.some(h=>h.key===c0.key)){ hit={s,m,A}; break outer; } }
  ok(!!hit,'canlı veride aday eşleşmesi bulundu (labMatch)');
  ok(E.lab.shadows.length>0,'eşleşme gölge sinyal olarak ileri teste yazıldı');
  if(hit){ const k=KK[hit.s].slice(0,KK[hit.s].length); const A={px:hit.m.f?k[k.length-1].c:1,trendScore:2,st:1,trend:'up',tk30:1.05,oiCase:'flat',fund:0.0001,score:10,volRel:1.2,med15:0.004,src:hit.A.src}; A.px=hit.A.px;
    const c=E.committee(A,c0.dir,1,{sym:hit.s}); const s=c.agents.find(a=>a.id==='lab'); console.log('  Burak:',c.talk.filter(t=>t.id==='lab').map(t=>t.text).join(' | '));
    ok(s&&s.v>0,'masada Burak eşleşen adayla artı oy verdi'); ok(c.plan&&c.plan.holdH>=2,'Burak zaman stopu önerdi ('+(c.plan&&c.plan.holdH)+' sa)'); }
  { const av=E.lab.avoid.find(c=>c.conds.length===1&&c.conds[0].join('=')==='yer=kova'); let done=false;
    for(const s of Object.keys(KK).filter(x=>x!=='BTCUSDT')){ if(done) break; for(let i=200;i<KK[s].length&&!done;i+=5){ const k=KK[s].slice(0,i); const A={px:k[k.length-1].c,trendScore:2,st:1,trend:'up',tk30:1.05,oiCase:'flat',fund:0.0001,score:30,volRel:1.2,med15:0.004,src:{k1h:k,btc15:btc15.filter(x=>x.t<k[k.length-1].t+H)}};
      const m=E.labMatch(A,av.dir,null); if(!m||!m.avoid.some(c=>c.key===av.key)) continue; done=true; const c=E.committee(A,av.dir,1,{sym:s}); const sel=c.agents.find(a=>a.id==='lab');
      console.log('  Burak:',c.talk.filter(t=>t.id==='lab').map(t=>t.text).join(' | ')); ok(sel.v<0,'kaçınılacak kalıpta Burak eksi oy verdi'); ok(c.talk.some(t=>t.id==='lab'&&t.stage==='tartışma'&&/Baran/.test(t.text)),'Burak tartışmada Baran\'ı kovalamaya karşı uyardı'); } }
    ok(done,'kovalama kalıbı canlı veride eşleşti'); }
  // ileri test: gölge sinyallerin vaktini geri al, sonucu ölçsün
  for(const s of E.lab.shadows){ s.t=KK[s.sym][KK[s.sym].length-30].t; s.px=KK[s.sym][KK[s.sym].length-30].c; }
  const ev=await E.labEvalShadows(50); ok(ev>0&&Object.values(E.lab.fwd).some(f=>f.n>0),'ileri test sonucu ölçüldü');
  const di=process.argv.indexOf('--dump'); if(di>0){ E.lab.notes.push({t:Date.now(),who:'Onur',text:'örnek not'}); fs.writeFileSync(process.argv[di+1],JSON.stringify({v:1,trades:E.lab.trades,snaps:{},harvestAt:E.lab.harvestAt,fwd:E.lab.fwd,shadows:E.lab.shadows,notes:E.lab.notes})); }
  console.log(fails.length?`\n${fails.length} başarısız`:'\ntamam');
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
