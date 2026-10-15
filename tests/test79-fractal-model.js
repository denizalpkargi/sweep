// Test listesi #79 (15 Ekim 2026): "Simple Fractals" / TTrades Fractal Model (ICT ailesi), kullanıcı "teste alalım" dedi.
// Kural (TTrades'in herkese açık anlatımından mekanikleştirildi; Simple Fractals'ın kendi kuralları ücretli içerikte):
//   Üst zaman dilimi (ÜZD: 1 sa, 4 sa ya da 1 g, 15 dk mumlardan UTC hizalı) — C1, C2, C3 ardışık mumlar.
//   Long kurulumu (short tersi): C2 C1'in dibini süpürür (C2 dip < C1 dip) ve C1 aralığının içine kapanır (C1 dip < C2 kapanış ≤ C1 tepe).
//   C3 süresince 15 dk'da CISD beklenir: C3 başından beri en düşük dibi yapan mumdan geriye ardışık düşüş mumlarının ilk açılışı = CISD seviyesi;
//   bir 15 dk kapanış bu seviyenin üstüne çıkınca sonraki mumun VWAP'ından long. Girişten önce fiyat C2 dibinin altına inerse kurulum iptal.
//   Stop: "swing" = CISD'yi yapan 15 dk dip − %0,15 (en az 0,8 ATR(14, 15 dk)); "C2" = C2 dibi − %0,15; "swing+%1,5" = swing, en az %1,5.
//   Hedef: C1 tepesi (ÜZD aralığının karşı ucu), tam kapanış; hedef/giriş oranı < 1 ise işlem yok. Zaman stopu C3 sonu (ya da C4 sonu), çıkış o mumun VWAP'ı.
//   Aynı mumda stop ve hedef → stop; giriş mumunda yalnız stop sayılır.
//   Günlük yön (isteğe bağlı): önceki UTC günün kapanışı açılışının üstündeyse yalnız long, altındaysa yalnız short.
//   NY penceresi (isteğe bağlı, 1 sa): giriş 12:00–16:00 UTC arasında.
// Kontroller: (a) "CISD'siz" = C3'ün ilk 15 dk mumunun VWAP'ından gir, C2 stopuyla; (b) "süpürmesiz" = C2 C1'in içinde kalan iç mum (inside bar),
//   iki yön de, aynı CISD/stop/hedef kuralı → süpürmenin katkısı; (c) stopsuz: giriş VWAP → zaman stopu VWAP getirisi.
// Maliyet R cinsinden: taker+kayma gidiş-dönüş %0,16 ÷ stop yüzdesi (girişler market). Fonlama yok (≤ 8 sa).
// Veri: tests/data/sm/15m/<SYM>.csv (tests/sm-fetch.js; S3 arşivi buluttan 403), sabit 20 likit perp → hayatta kalan seçimi, kanıt değil.
// Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay; yıl yıl ayrıca.
// Kullanım: node tests/test79-fractal-model.js [--dir tests/data/sm/15m] → tests/test79-fractal-model-report.md
const fs=require('fs'), path=require('path');
const arg=(k,d)=>{ const i=process.argv.indexOf('--'+k); return i<0?d:process.argv[i+1]; };
const DIR=arg('dir',path.join(__dirname,'data','sm','15m'));
const DAY=864e5, M15=9e5, T0=Date.parse('2020-06-01T00:00Z'), MID=Date.parse('2023-06-01T00:00Z'), Y12=Date.now()-365*DAY, CT=0.0016;
const csv=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>l.split(',').map(Number));
const ST={}, REF={};
const bump=(key,o,rt)=>{ const x=ST[key]||(ST[key]={n:0,s:0,st:0,st2:0,w:0,pos:0,neg:0,stop:0,hedef:0,zaman:0,sp:0,rr:0});
  x.n++; x.s+=o.r; x.st+=rt; x.st2+=rt*rt; if(rt>0){ x.w++; x.pos+=rt; } else x.neg+=rt; x[o.exit]++; x.sp+=o.sp; x.rr+=o.rr; };
const bref=(key,v)=>{ const o=REF[key]||(REF[key]={n:0,s:0,s2:0}); o.n++; o.s+=v; o.s2+=v*v; };
const perKeys=t=>[t<MID?'1':'2', ...(t>=Y12?['Y']:[]), 'y'+new Date(t).getUTCFullYear()];
const HTFS=[['1 sa',4],['4 sa',16],['1 g',96]], STOPS=['swing','C2','swing+%1,5'];
let coins=0; const NS={};
for(const f of fs.readdirSync(DIR).filter(x=>x.endsWith('.csv')).sort()){
  const k=csv(path.join(DIR,f)).filter(r=>r[0]>=T0-40*DAY); if(k.length<5000) continue; coins++;
  const n=k.length, t=k.map(r=>r[0]), o=k.map(r=>r[1]), h=k.map(r=>r[2]), l=k.map(r=>r[3]), c=k.map(r=>r[4]);
  const vw=j=>{ if(!(k[j][5]>0)) return c[j]; const v=k[j][6]/k[j][5]; return v>=l[j]&&v<=h[j]?v:c[j]; };
  const atr=new Float64Array(n); { let acc=0; const q=[]; for(let i=1;i<n;i++){ const tr=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])); q.push(tr); acc+=tr; if(q.length>14) acc-=q.shift(); atr[i]=q.length===14?acc/14:NaN; } }
  // günlük yön: her 15 dk mum için önceki UTC günün yönü
  const dayDir=new Map(); { let cur=-1,op=0,cl=0; for(let i=0;i<n;i++){ const d=Math.floor(t[i]/DAY); if(d!==cur){ if(cur>=0) dayDir.set(cur+1, cl>op?1:cl<op?-1:0); cur=d; op=o[i]; } cl=c[i]; } }
  for(const [hn,L] of HTFS){
    // ÜZD mumları: başlangıç indeksi, eksiksiz (L ardışık 15 dk)
    const bars=[]; for(let i=0;i+L<=n;i++){ if(t[i]%(L*M15)!==0) continue; if(t[i+L-1]-t[i]!==(L-1)*M15) continue;
      let hi=-1e18,lo=1e18; for(let j=i;j<i+L;j++){ if(h[j]>hi) hi=h[j]; if(l[j]<lo) lo=l[j]; } bars.push({i,o:o[i],h:hi,l:lo,c:c[i+L-1]}); }
    for(let b=1;b+2<bars.length;b++){ const C1=bars[b-1], C2=bars[b], C3=bars[b+1], C4=bars[b+2];
      if(C2.i-C1.i!==L||C3.i-C2.i!==L||C4.i-C3.i!==L) continue; const t3=t[C3.i]; if(t3<T0) continue;
      const pk=perKeys(t3), dd=dayDir.get(Math.floor(t3/DAY))||0;
      const sweptL=C2.l<C1.l&&C2.c>C1.l&&C2.c<=C1.h, sweptS=C2.h>C1.h&&C2.c<C1.h&&C2.c>=C1.l, inside=C2.h<=C1.h&&C2.l>=C1.l;
      const cases=[]; if(sweptL) cases.push(['süpürme',1]); if(sweptS) cases.push(['süpürme',-1]); if(inside){ cases.push(['süpürmesiz',1]); cases.push(['süpürmesiz',-1]); }
      for(const [kind,dir] of cases){
        const tgt=dir>0?C1.h:C1.l, c2x=dir>0?C2.l:C2.h, s0=C3.i, e3=C3.i+L-1, e4=C4.i+L-1;
        // CISD araması
        let m=-1, ent=-1; for(let j=s0;j<=e3-1;j++){
          if(dir>0?l[j]<c2x:h[j]>c2x){ ent=-1; break; } // C2 ucu kırıldı → iptal
          if(m<0||(dir>0?l[j]<l[m]:h[j]>h[m])) m=j;
          if(j>m){ let a=m; const bear=x=>dir>0?c[x]<o[x]:c[x]>o[x]; if(!bear(a)&&a>s0&&bear(a-1)) a--; let lev; if(bear(a)){ while(a>s0&&bear(a-1)) a--; lev=o[a]; } else lev=dir>0?h[m]:l[m];
            if(dir>0?c[j]>lev:c[j]<lev){ ent=j+1; break; } } }
        const variants=[];
        if(ent>0&&ent<=e3) for(const sv of STOPS) variants.push(['CISD',sv,ent,m]);
        if(kind==='süpürme') variants.push(['CISD\'siz','C2',s0,-1]);
        for(const [mode,sv,ei,mi] of variants){ const e=vw(ei), a=atr[ei-1]; if(!(e>0&&a>0)) continue;
          const ext=sv==='C2'||mi<0?c2x:(dir>0?l[mi]:h[mi]); let d=dir>0?e-ext*(1-0.0015):ext*(1+0.0015)-e;
          d=Math.max(d,0.8*a,sv==='swing+%1,5'?0.015*e:0); const rr=dir*(tgt-e)/d; if(!(rr>=1)) continue;
          const stop=e-dir*d; const ny=new Date(t[ei]).getUTCHours(); const inNY=ny>=12&&ny<16;
          for(const [tsn,E] of [['C3',e3],['C4',e4]]){ if(E>=n) continue;
            let res=null; for(let i=ei;i<=E;i++){ if(dir>0?l[i]<=stop:h[i]>=stop){ res={r:-1,exit:'stop'}; break; } if(i>ei&&(dir>0?h[i]>=tgt:l[i]<=tgt)){ res={r:rr,exit:'hedef'}; break; } }
            if(!res) res={r:dir*(vw(E)-e)/d,exit:'zaman'}; res.sp=d/e; res.rr=rr; const rt=res.r-CT/res.sp;
            const filt=['hepsi']; if(dd===dir) filt.push('günlük yön'); if(hn==='1 sa'&&inNY) filt.push('NY 12–16'); if(hn==='1 sa'&&inNY&&dd===dir) filt.push('günlük + NY');
            for(const fl of filt) for(const p of pk){ bump([hn,kind,mode,sv,tsn,fl,p].join('|'),res,rt); }
            if(sv==='swing'&&tsn==='C3'&&mode==='CISD') for(const p of pk) bref([hn,kind,p].join('|'), dir*(vw(E)/e-1));
          }
        }
        NS[hn+'|'+kind]=(NS[hn+'|'+kind]||0)+1;
      }
    }
  }
  console.log(f, 'tamam');
}
const fx=(v,d=2)=>Number.isFinite(v)?(v>=0?'+':'')+v.toFixed(d).replace('.',','):'—', f0=(v,d=0)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
const cell=o=>{ if(!o||!o.n) return '—'; const m=o.s/o.n, mt=o.st/o.n, sd=Math.sqrt(Math.max(0,o.st2/o.n-mt*mt)), tt=sd>0?mt/sd*Math.sqrt(o.n):NaN;
  return `n ${o.n} · ${fx(m)} / **${fx(mt)}** R · t ${fx(tt,1)} · kazanma %${f0(100*o.w/o.n)} · hedef %${f0(100*o.hedef/o.n)} stop %${f0(100*o.stop/o.n)} · stop %${f0(100*o.sp/o.n,2)} · oran ${f0(o.rr/o.n,1)}`; };
const refCell=o=>{ if(!o||!o.n) return '—'; const m=o.s/o.n, sd=Math.sqrt(Math.max(0,o.s2/o.n-m*m)); return `n ${o.n} · ${fx(m*100,3)} % · t ${fx(sd>0?m/sd*Math.sqrt(o.n):NaN,1)}`; };
const P=(...a)=>ST[a.join('|')];
const out=[`# Test #79 · Fractal Model (Simple Fractals / TTrades), arşiv testi · ${new Date().toISOString().slice(0,10)}`,'',
  `Sabit ${coins} likit perp (tests/data/sm, www.binance.com/fapi; hayatta kalan seçimi), 15 dk mumlar, 2020-06 → bugün. Kural dosyanın başında. Hücre: n · brüt / **taker** R (gidiş-dönüş %0,16 ÷ stop) · t (taker) · kazanma · hedef/stop payı · ortalama stop % · ortalama hedef oranı. Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay. Önceden seçilen ana varyant: CISD, swing stop, zaman stopu C3 sonu, filtresiz.`,'',
  `Kurulum sayısı: `+Object.entries(NS).map(([k,v])=>`${k} ${v.toLocaleString('tr-TR')}`).join(' · '),''];
for(const [hn] of HTFS){ out.push(`## ÜZD ${hn}`,'',`Stopsuz (CISD girişi VWAP → C3 sonu VWAP, maliyetsiz): süpürme 1: ${refCell(REF[[hn,'süpürme','1'].join('|')])} · 2: ${refCell(REF[[hn,'süpürme','2'].join('|')])} · Y: ${refCell(REF[[hn,'süpürme','Y'].join('|')])}; süpürmesiz 1: ${refCell(REF[[hn,'süpürmesiz','1'].join('|')])} · 2: ${refCell(REF[[hn,'süpürmesiz','2'].join('|')])}`,'',
  '| Kurulum | Giriş | Stop | Zaman | Süzgeç | 1. dönem | 2. dönem | Son 12 ay |','|---|---|---|---|---|---|---|---|');
  const fls=hn==='1 sa'?['hepsi','günlük yön','NY 12–16','günlük + NY']:['hepsi','günlük yön'];
  for(const kind of ['süpürme','süpürmesiz']) for(const mode of kind==='süpürme'?['CISD','CISD\'siz']:['CISD']) for(const sv of mode==='CISD'?STOPS:['C2']) for(const ts of ['C3','C4']) for(const fl of fls){
    if(kind==='süpürmesiz'&&fl!=='hepsi') continue; if(mode!=='CISD'&&fl!=='hepsi') continue; if(sv!=='swing'&&fl!=='hepsi') continue;
    out.push(`| ${kind} | ${mode} | ${sv} | ${ts} | ${fl} | ${cell(P(hn,kind,mode,sv,ts,fl,'1'))} | ${cell(P(hn,kind,mode,sv,ts,fl,'2'))} | ${cell(P(hn,kind,mode,sv,ts,fl,'Y'))} |`); }
  out.push(''); }
const YRS=[2020,2021,2022,2023,2024,2025,2026];
out.push('## Yıl yıl · taker R','','| Varyant | '+YRS.join(' | ')+' |','|---|'+'---|'.repeat(YRS.length));
for(const v of [['1 sa','süpürme','CISD','swing','C3','hepsi'],['1 sa','süpürme','CISD','swing','C3','günlük + NY'],['1 sa','süpürme','CISD','swing+%1,5','C4','hepsi'],['4 sa','süpürme','CISD','swing','C3','hepsi'],['4 sa','süpürme','CISD','swing+%1,5','C4','hepsi'],['4 sa','süpürme','CISD','swing','C3','günlük yön'],['1 g','süpürme','CISD','swing','C3','hepsi'],['1 g','süpürme','CISD','swing+%1,5','C4','hepsi']])
  out.push(`| ${v.join(' · ')} | `+YRS.map(y=>{ const o=P(...v,'y'+y); return o?`${o.n} · ${fx(o.st/o.n)}`:'—'; }).join(' | ')+' |');
out.push('');
fs.writeFileSync(path.join(__dirname,'test79-fractal-model-report.md'),out.join('\n')+'\n'); console.log(out.join('\n'));
