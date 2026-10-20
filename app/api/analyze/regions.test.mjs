import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {normalizeReport,missingRegions} from './normalize.js';
const base={meta:{company_name:'测试公司'},company_overview:{identity:'测试公司',home_market:'中国',what_it_does:'测试产品制造'},business_model:{core_product:{description:'测试芯片制造'}}};
test('padding does not hide missing regions; explicit evidence gaps remain useful',()=>{
 const {report}=normalizeReport(base);
 assert.deepEqual(missingRegions(report),['domestic','international']);
 report.business_analysis.domestic.products='[外部观察] 测试芯片';
 report.business_analysis.international.footprint='[待验证] 未找到海外销售地区的公开披露';
 assert.deepEqual(missingRegions(report),[]);
});
test('regional retry restores missing content and retains first report on failure',()=>{
 const script=`
 import assert from 'node:assert/strict';
 import {POST} from './app/api/analyze/route.js';
 import {normalizeReport} from './app/api/analyze/normalize.js';
 process.env.DEEPSEEK_API_KEY='fixture';process.env.TAVILY_API_KEY='fixture';
 const first=normalizeReport(${JSON.stringify(base)}).report;
 const repaired=structuredClone(first);
 repaired.business_analysis.domestic.products='[外部观察] 测试芯片';
 repaired.business_analysis.international.footprint='[待验证] 未找到海外业务公开披露';
 for(const mode of ['success','malformed','http','timeout']){
 let attempts=0;
 globalThis.fetch=async url=>{
 if(String(url).includes('tavily'))return {ok:true,text:async()=>JSON.stringify({results:[{title:'产品',url:'https://example.com/product',content:'测试芯片'}]})};
 attempts++;
 if(attempts===2&&mode==='timeout')throw new DOMException('timeout','AbortError');
 if(attempts===2&&mode==='http')return {ok:false,status:503,text:async()=>''};
 return {ok:true,text:async()=>JSON.stringify({choices:[{message:{content:attempts===1?JSON.stringify(first):mode==='malformed'?'{':JSON.stringify(repaired)}}]})};
 };
 const res=await POST(new Request('https://example.com/api/analyze',{method:'POST',body:JSON.stringify({companyName:'测试公司'})}));
 assert.equal(res.status,200,mode);assert.equal(attempts,2,mode);
 const data=await res.json();
 assert.equal(data.report.business_analysis.domestic.products,mode==='success'?repaired.business_analysis.domestic.products:first.business_analysis.domestic.products);
 }
 `;
 execFileSync(process.execPath,['--input-type=module','-e',script],{env:{},stdio:'pipe'});
});
