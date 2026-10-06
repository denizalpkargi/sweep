// Ekransız bot uçtan uca: sahte Binance ile bir tarama → masa girişleri → fiyat adımları (hedef 1, iz süren stop, stop) → yeniden başlatmada 1 dk mumlarla boşluk doldurma.
// Çalıştırma: node tests/headless-scenario.js  (çıktıda "errors []" beklenir)
const fs=require('fs'); const path=require('path'); const os=require('os');
const {main}=require('../headless/run.js'); const mock=require('./mock-binance.js');
const errors=[]; const ok=(c,m)=>{ if(!c) errors.push(m); };
const readJsonl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];

(async()=>{
  const day=new Date().toISOString().slice(0,10);
  // 0. tur (varsayılan ayarlar): aşamalı giriş · aynı yönde ikinci long 15 dk aralık kuralına takılmalı; 200 $'a ulaşınca masa her şeyi kapatıp kilitlemeli
  { const d0=fs.mkdtempSync(path.join(os.tmpdir(),'sweep-headless0-')); const r0=await main({dir:d0,minVol:1e6,every:300000,votes:'deep',once:true,quiet:true},{fetch:mock.fetch,WebSocket:null}); const b0=r0.B.bot;
    const ev0=readJsonl(path.join(d0,'logs',`events-${day}.jsonl`));
    ok(b0.positions.length===1&&b0.positions[0].sym==='ENAUSDT','aşamalı girişte tek long beklenirdi: '+b0.positions.map(p=>p.sym).join(','));
    ok(ev0.some(e=>e.type==='stages'&&e.sym==='NEARUSDT'&&!e.ok&&e.stages.some(s=>s.k==='korelasyon'&&s.st==='fail')),'NEAR korelasyon aşamasında kalmadı');
    const p0=b0.positions[0]; ok(p0&&Array.isArray(p0.stages)&&p0.stages.length===5&&p0.quality,'pozisyonda giriş aşamaları yok');
    if(p0){ b0.bal=197; r0.B.onPrice('ENAUSDT',p0.entry*1.02,Date.now()); ok(!b0.positions.length&&b0.goalHit,'200 $ kilidi çalışmadı');
      const tr0=b0.trades[b0.trades.length-1]; ok(tr0&&tr0.decs&&tr0.decs.some(d=>d.k==='goal'),'200 $ kilidi karar kaydı yok');
      ok(readJsonl(path.join(d0,'logs',`events-${day}.jsonl`)).some(e=>e.type==='goal'),'hedef olayı günlükte yok'); }
    fs.rmSync(d0,{recursive:true,force:true}); }
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sweep-headless-')); const logs=path.join(dir,'logs');
  // aşağıdaki akış iki long ister: aynı yön aralığı kapalı
  fs.writeFileSync(path.join(dir,'config.json'),JSON.stringify({dirGapMin:0}));
  const opts={dir,minVol:1e6,every:300000,votes:'deep',once:true,quiet:true};
  // 1. tur: tarama ve giriş
  const r1=await main(opts,{fetch:mock.fetch,WebSocket:null}); const B=r1.B, bot=B.bot;
  const votes=readJsonl(path.join(logs,`votes-${day}.jsonl`));
  ok(votes.length>=2,'oy satırı yok'); ok(votes.every(v=>v.feat&&v.agents&&isFinite(v.score)),'oy satırında özellik eksik');
  ok(bot.positions.length>=1,'masa giriş açmadı'); const p=bot.positions.find(x=>x.sym==='ENAUSDT'); ok(p&&p.dir==='long','ENA long yok');
  if(p){
    // yönetim: masa gözden geçirmesi JSONL'ye düşmeli
    p.lastMan=1; await B.manage(); ok(readJsonl(path.join(logs,`reviews-${day}.jsonl`)).some(x=>x.id===p.id),'gözden geçirme yazılmadı');
    if(bot.positions.includes(p)){
      // hedef 1 → stop girişe; hemen altındaki fiyat kalanı KAPATMAMALI (iz süren stop ilk riskle ölçülür)
      const R=p.risk0; B.onPrice('ENAUSDT',p.t1,Date.now()); ok(p.stage==='tp1'&&p.stop===p.entry,'hedef 1 sonrası stop girişte değil');
      B.onPrice('ENAUSDT',p.t1+0.2*R,Date.now()); B.onPrice('ENAUSDT',p.t1,Date.now());
      ok(bot.positions.includes(p),'hedef 1 sonrası kalan hemen kapandı (iz süren stop hatası)');
      ok(Math.abs(p.stop-(p.t1+0.2*R-R))<1e-12,'iz süren stop 1R geride değil');
      B.onPrice('ENAUSDT',p.t2,Date.now()); ok(p.stage==='tp2','hedef 2 alınmadı');
      B.onPrice('ENAUSDT',p.t2-0.8*R,Date.now()); ok(!bot.positions.includes(p),'iz süren stop kapatmadı');
    }
    const tr=readJsonl(path.join(logs,'trades.jsonl')).find(t=>t.id===p.id);
    ok(tr&&tr.r>1&&tr.exits.length===3&&tr.feat&&tr.agents,'ENA işlem kaydı eksik ya da yanlış: '+JSON.stringify(tr&&{r:tr.r,exits:tr.exits.length}));
  }
  const near=bot.positions.find(x=>x.sym==='NEARUSDT'); B.save(true);
  // 2. tur: yeniden başlatma; NEAR stopu kapalıyken 1 dk mumda vurulmuş olsun
  if(near){
    mock.ctl.k1m=(sym,u)=>{ if(sym!=='NEARUSDT') return []; const t=Math.floor(Date.now()/6e4)*6e4-5*6e4; const lo=near.stop*0.995;
      return [[t,String(near.entry),String(near.entry*1.001),String(lo),String(lo*1.001),"1",t+59999,"1","1","1","1","0"]]; };
    const r2=await main(opts,{fetch:mock.fetch,WebSocket:null});
    const tr=readJsonl(path.join(logs,'trades.jsonl')).find(t=>t.id===near.id);
    ok(tr&&tr.exits[0].k==='stop'&&tr.r<-0.9&&tr.r>-1.3,'boşluk doldurmada stop işlenmedi: '+JSON.stringify(tr&&{r:tr.r,ex:tr.exits}));
    ok(!r2.B.bot.positions.some(x=>x.id===near.id),'NEAR hâlâ açık');
  } else errors.push('NEAR pozisyonu yok (senaryo değişti mi?)');
  const ev=readJsonl(path.join(logs,`events-${day}.jsonl`)); ok(ev.some(e=>e.type==='scan')&&ev.some(e=>e.type==='fill')&&ev.some(e=>e.type==='close'),'olay günlüğü eksik');
  ok(fs.existsSync(path.join(dir,'status.json'))&&fs.existsSync(path.join(dir,'bot.json')),'durum dosyaları yok');
  // denetçi: kapanan işlemler girişteki oylarla saklanır, durum dosyasında özet var
  { const b2=JSON.parse(fs.readFileSync(path.join(dir,'bot.json'),'utf8')); const t0=(b2.trades||[])[0]; ok(t0&&t0.snap&&isFinite(t0.snap.v.liq)&&Array.isArray(t0.exits)&&typeof t0.exits[0]==='string'&&isFinite(t0.mfe),'denetçi kaydı eksik: '+JSON.stringify(t0&&{snap:!!t0.snap,ex:t0.exits,mfe:t0.mfe}));
    const st=JSON.parse(fs.readFileSync(path.join(dir,'status.json'),'utf8')); ok(st.audit&&st.audit.n>=1,'status.json denetçi özeti yok'); ok(st.trend&&st.trend.on===true&&isFinite(st.trend.eq),'status.json trend sepeti özeti yok'); }
  console.log('votes',votes.length,'events',ev.length,'trades',readJsonl(path.join(logs,'trades.jsonl')).length);
  console.log('errors',JSON.stringify(errors));
  fs.rmSync(dir,{recursive:true,force:true});
  process.exit(errors.length?1:0);
})().catch(e=>{ console.error(e); console.log('errors',JSON.stringify([String(e)])); process.exit(1); });
