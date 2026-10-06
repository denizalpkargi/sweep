// Motoru (yamalı engine + strat2 + strat3) DOM'suz Node ortamında yükler; geriye dönük test araçları ve ekransız bot (headless/) bunu kullanır.
// opts.localStorage: kalıcı depo (verilmezse boş taklit), opts.fetch: test için sahte fetch (verilmezse Node'un fetch'i).
const {patchedEngine}=require('../src/build.js');
function loadEngine(opts){
  opts=opts||{};
  const src=patchedEngine()+`\nreturn {K,analyze,poolsAt,amdDetect,amdStats,breakoutRetest,breakoutStats,regimeSweep,regimeStats,simTrade,atrAt,btcRegimeAt,RS_CFG,SIM_FEE,liqDist,HC_MAX_LEV,consistencyOf,killZone,state,setPoolCache:m=>{ _poolCache=m; },
  j,rest,universe,scanOne,scanDeep,DEEP_STAGES,scan,committee,positionReview,paperStep,COM_DEF,DESK,BOT_CFG_DEF,ld,ldRefresh,lab,LAB_CFG,LAB_FEATS,labIngest,labHarvest,labEnrich,labAnalyze,labMatch,labFeat,labTick,labEvalShadows,labAgg1h,dayKey,fmtP,fx,pct,auditRun,audTagsOf,audVoteFor,audBackfill,AUD_TAGS,goalState,goalRisk,entryStages,freePlan,deskAdjust,deskApply,deskNote,deskFill,goalTick,stagesTxt,GOAL_DEF,DEC_KIND,audDecisions,TREND_DEF,trendLoad,trendSave,trendNew,trendTargets,trendRebalance,trendMark,trendTrade,trendTick,trendEq,trendSummary,trendClosed,trendScore,trendCache,trendData,DIP_DEF,dipNew,dipLoad,dipSave,dipIntraday,dipClose,dipTick,dipEq,dipSummary,dipFund,setAud:x=>{ AUD=x; },getAud:()=>AUD};`;
  const stub={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const doc={getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),addEventListener:()=>{}};
  const fn=new Function('window','document','localStorage','navigator','fetch','"use strict";\n'+src);
  return fn({},doc,opts.localStorage||stub,{},opts.fetch||((...a)=>globalThis.fetch(...a)));
}
module.exports={loadEngine};
