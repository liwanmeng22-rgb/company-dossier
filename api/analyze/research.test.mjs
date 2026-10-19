import test from 'node:test';
import assert from 'node:assert/strict';
import {bindResearchEvidence,validateResearch} from './research.js';
import {calculateMarket,getMarket} from './market.js';
const claim=(text,source_id='',quote='')=>({text,source_id,quote});
const research=()=>({entities:[],financials:[],events:[],peers:[],investment:{status:'unknown',...Object.fromEntries(['symbol','exchange','bull_case','bear_case','valuation','action'].map(k=>[k,claim('待验证')]))}});
test('rejects missing research fields and malformed claims',()=>{
 assert.equal(validateResearch(research()),true);
 assert.equal(validateResearch({}),false);
 const r=research();r.events=[{date:'2025',event:42,impact:claim('未知')}];assert.equal(validateResearch(r),false);
});
test('citation must refer to retrieved source and exact excerpt; unsupported financial values are removed',()=>{
 const r=research();r.financials=[{revenue:claim('100亿元','S1','本年度营业收入达到100亿元'),profit:claim('20亿','S9','伪造的来源引用应该被屏蔽'),operating_cash_flow:claim('30亿','S1','原文没有的长摘要不可以通过')}];
 bindResearchEvidence(r,[{id:'S1',content:'公告显示本年度营业收入达到100亿元。'}]);
 assert.equal(r.financials[0].revenue.citation_valid,true);
 assert.equal(r.financials[0].profit.text,'未取得可核查数据');
 assert.equal(r.financials[0].operating_cash_flow.source_id,'');
});
test('price metrics handle nulls and exclude unfinished trading day',()=>{
 const now=Date.UTC(2026,9,19,4);const start=now/1000-100;
 const result={meta:{symbol:'TEST',currency:'USD',instrumentType:'EQUITY',exchangeTimezoneName:'UTC',currentTradingPeriod:{regular:{start,end:start+200}}},timestamp:[start-300000,start-200000,start-100000,start],indicators:{quote:[{close:[100,null,80,999]}]}};
 const value=calculateMarket(result,now);
 assert.equal(value.latest,80);assert.equal(value.points.length,2);assert.ok(Math.abs(value.changePct+20)<0.0001);assert.ok(Math.abs(value.maxDrawdownPct+20)<0.0001);assert.equal(value.ma20,null);
});
test('matching excerpt cannot support additional invented financial numbers',()=>{
 const r=research();r.financials=[{revenue:claim('收入100亿元，同比增长30%','S1','本年度营业收入达到100亿元'),profit:claim('未披露'),operating_cash_flow:claim('未披露')}];
 bindResearchEvidence(r,[{id:'S1',content:'本年度营业收入达到100亿元'}]);
 assert.equal(r.financials[0].revenue.text,'未取得可核查数据');
 assert.equal(r.financials[0].revenue.citation_valid,false);
});
test('unknown symbols and private companies never request market data',async()=>{
 const noFetch=()=>{throw Error('network must not be called');};
 assert.equal((await getMarket(research().investment,[],noFetch)).status,'unavailable');
 assert.equal((await getMarket({...research().investment,status:'private'},[],noFetch)).status,'not_listed');
});
test('provider failure is safe and never falls back to invented prices',async()=>{
 const inv={status:'listed',symbol:{text:'AAPL',source_id:'S1',citation_valid:true},exchange:{citation_valid:true}};
 const r=await getMarket(inv,[{id:'S1',content:'AAPL'}],async()=>({ok:false,text:async()=>'private upstream error'}));
 assert.equal(r.status,'unavailable');assert.equal(JSON.stringify(r).includes('private upstream'),false);
});
