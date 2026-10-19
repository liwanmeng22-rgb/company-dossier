import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReport} from './normalize.js';
import {validateReport} from './validate.js';
import {validateResearch,bindResearchEvidence} from './research.js';
const partial = () => ({meta:{company_name:'长鑫存储',as_of_note:null},
 company_overview:{identity:'[待验证] 长鑫存储',home_market:'中国',what_it_does:'[待验证] 存储芯片研发',listing_status:null},
 business_analysis:{domestic:{products:'[待验证] DRAM芯片'},international:null,research_questions:[]},
 risk_analysis:{financial_health:{cash_flow:{text:null,confidence:null,note:null}}},
 research:{entities:null,financials:null,events:[],peers:[],investment:{status:'unknown',symbol:null}}});
test('missing private-company data preserves useful report without inventing finances or a stock',()=>{
 const {report,warnings}=normalizeReport(partial());
 assert.equal(validateReport(report),true);assert.equal(validateResearch(report.research),true);
 assert.equal(report.company_overview.identity,'[待验证] 长鑫存储');
 assert.match(report.business_analysis.international.footprint,/待验证/);
 assert.equal(report.research.investment.status,'unknown');assert.deepEqual(report.research.financials,[]);
 assert.equal(report.risk_analysis.financial_health.cash_flow.confidence,'inferred');assert.ok(warnings.length>0);
 assert.doesNotThrow(()=>bindResearchEvidence(report.research,[]));
});
test('unrelated or empty JSON is not padded into a successful report',()=>{
 for(const input of [{},[],null,{meta:{company_name:'长鑫存储'}},{other:'data'}]) assert.equal(validateReport(normalizeReport(input).report),false);
});
test('unexpected objects in text and strings in array fields remain errors',()=>{
 const a=partial();a.company_overview.identity={wrong:'shape'};assert.equal(validateReport(normalizeReport(a).report),false);
 const b=partial();b.risk_analysis.top_risks='wrong';assert.equal(validateReport(normalizeReport(b).report),false);
});
test('numeric display values normalize without inventing evidence',()=>{
 const r=partial();r.industry_positioning={market_size:{current_size:{value:120,confidence:'estimated'}}};
 const {report}=normalizeReport(r);assert.equal(report.industry_positioning.market_size.current_size.value,'120');assert.equal(report.industry_positioning.market_size.current_size.confidence,'estimated');
});
test('missing claim citation fields remain empty and numeric gate still removes unsupported numbers',()=>{
 const r=partial();r.research.financials=[{period:'2025年度',currency_unit:'人民币亿元',revenue:{text:'100亿元'},profit:null,operating_cash_flow:null}];
 const {report}=normalizeReport(r);assert.equal(validateResearch(report.research),true);
 bindResearchEvidence(report.research,[]);assert.equal(report.research.financials[0].revenue.text,'未取得可核查数据');
});
