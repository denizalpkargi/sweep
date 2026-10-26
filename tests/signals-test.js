// Tek sinyal ekranı (src/signals.js) testi: masa/kalite short/sepet satırları, alınmayan sinyal, yaklaşan açılım, karne.
const {loadEngine}=require('./engine-node.js');
const mem={}; const E=loadEngine({localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}}});
const errors=[]; const ok=(c,m)=>{ if(!c){ errors.push(m); console.log('HATA',m); } };
const H=3600e3, D=24*H, now=Date.UTC(2026,9,26,12);
const bot={positions:[{sym:'AUSDT',dir:'long',entry:10,entry0:10,stop:9,t1:11.5,openT:now-H,score:0.5,yes:6},{sym:'BUSDT',dir:'short',side:'ks',model:'KALİTE',entry:5,entry0:5,stop:5.2,t1:null,openT:now-2*H}],
  trades:[{sym:'CUSDT',dir:'short',entry:3,openT:now-D,closeT:now-20*H,r:1.5,pnl:4,exits:['tp1','time']},{sym:'DUSDT',dir:'long',side:'ks',entry:2,openT:now-3*D,closeT:now-D,r:-1,pnl:-1,exits:['stop']}]};
const S={tt:{pos:{EUSDT:{e:1,t:now-5*D,stop:0.8}},trades:[{sym:'FUSDT',t:now-20*D,closeT:now-10*D,e:1,x:1.3,R:1.5,pnl:0.7,why:'kapanış 10 gün dibi'}]},
  ic:{pos:{GUSDT:{dir:-1,e:4,t:now-D,stop:4.4,tp:3.2}},trades:[]},
  ks:{pos:{},trades:[],log:[{t:now-30*60e3,type:'signal',sym:'HUSDT',px:7,sd:0.02},{t:now-2*H+60e3,type:'signal',sym:'BUSDT',px:5,sd:0.02}]},
  ul:{cfg:{minSize:0.025,maxSize:1,preDays:7},pos:{},trades:[]},
  dip:{pos:{},trades:[{sym:'ETHUSDT',t:now-30*D,closeT:now-20*D,e:100,x:103,r:0.03,pnl:0.75,why:'kâr'}]},kov:{pos:{},trades:[]},trend:{bal:90,start:100}};
const ulEv=[{sym:'IUSDT',day:now+10*D,size:0.05,name:'Iota'},{sym:'JUSDT',day:now+30*D,size:0.05},{sym:'KUSDT',day:now+9*D,size:0.01}];
const px={AUSDT:10.5,BUSDT:4.9,EUSDT:1.1,GUSDT:3.8};
const d=E.sigCollect({bot,S,ulEv,px:s=>px[s]||NaN,now});
const by=(k,sym)=>d.rows.find(x=>x.k===k&&x.sym===sym);
ok(by('masa','AUSDT')&&by('masa','AUSDT').st==='açık'&&Math.abs(by('masa','AUSDT').R-0.5)<1e-9,'masa açık pozisyon, anlık R');
ok(by('ks','BUSDT')&&by('ks','BUSDT').st==='açık'&&by('ks','BUSDT').acct==='masa'&&Math.abs(by('ks','BUSDT').R-0.5)<1e-9,'kalite short masanın hesabında, short R');
ok(by('masa','CUSDT').st==='kapandı'&&by('masa','CUSDT').R===1.5&&by('ks','DUSDT').R===-1,'kapanan masa ve kalite short işlemleri ayrılır');
ok(by('ks','HUSDT')&&by('ks','HUSDT').st==='alınmadı'&&!d.rows.some(x=>x.k==='ks'&&x.sym==='BUSDT'&&x.st==='alınmadı'),'alınmayan kalite short sinyali, alınan değil');
ok(by('tt','EUSDT').dir===1&&by('ic','GUSDT').dir===-1&&Math.abs(by('ic','GUSDT').R-0.5)<1e-9,'sepet pozisyonları, ichimoku short');
ok(by('dip','ETHUSDT').pct===0.03&&by('dip','ETHUSDT').R==null,'R yoksa yüzde');
ok(by('ul','IUSDT')&&by('ul','IUSDT').st==='yaklaşan'&&!by('ul','JUSDT')&&!by('ul','KUSDT'),'yaklaşan açılım: yalnız 7 gün içinde ve büyüklük şartında');
ok(d.rows.every((x,i,a)=>!i||a[i-1].t>=x.t),'satırlar yeniden eskiye');
const c=k=>d.cards.find(x=>x.k===k).live;
ok(c('masa').open===1&&c('masa').n===1&&c('masa').avgR===1.5&&c('masa').pnl===4,'masa karnesi');
ok(c('ks').open===1&&c('ks').n===1&&c('ks').miss===1,'kalite short karnesi, alınmayan sayısı');
ok(Math.abs(c('trend').roi+0.1)<1e-9,'trend sepeti özkaynak');
ok(E.SIG_RULES.every(r=>r.arsiv&&r.ad),'her kuralın arşiv satırı var');
const seen=new Set(d.rows.map(E.sigKey)); ok(E.sigFresh(d.rows,seen).length===0,'görülenler yeni değil');
bot.positions.push({sym:'LUSDT',dir:'long',entry:1,stop:0.9,openT:now}); const d2=E.sigCollect({bot,S,ulEv,px:()=>NaN,now});
const fr=E.sigFresh(d2.rows,seen); ok(fr.length===1&&fr[0].sym==='LUSDT','yeni pozisyon yeni sinyal');
console.log('signals-test errors',errors); if(errors.length) process.exit(1);
