// Motoru (yamalı engine + strat2 + strat3) DOM'suz Node ortamında yükler; geriye dönük test araçları ve ekransız bot (headless/) bunu kullanır.
// opts.localStorage: kalıcı depo (verilmezse boş taklit), opts.fetch: test için sahte fetch (verilmezse Node'un fetch'i).
const {patchedEngine}=require('../src/build.js');
function loadEngine(opts){
  opts=opts||{};
  const src=patchedEngine()+`\nreturn {K,analyze,poolsAt,amdDetect,amdStats,breakoutRetest,breakoutStats,regimeSweep,regimeStats,simTrade,atrAt,btcRegimeAt,RS_CFG,SIM_FEE,liqDist,HC_MAX_LEV,consistencyOf,killZone,state,setPoolCache:m=>{ _poolCache=m; },
  j,rest,universe,scanOne,scanDeep,DEEP_STAGES,scan,committee,positionReview,paperStep,COM_DEF,DESK,BOT_CFG_DEF,ld,ldRefresh,dayKey,fmtP,fx,pct};`;
  const stub={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const doc={getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),addEventListener:()=>{}};
  const fn=new Function('window','document','localStorage','navigator','fetch','"use strict";\n'+src);
  return fn({},doc,opts.localStorage||stub,{},opts.fetch||((...a)=>globalThis.fetch(...a)));
}
module.exports={loadEngine};
