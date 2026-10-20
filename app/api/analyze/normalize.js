import { schema, REGION_FIELDS } from './validate.js';
import { researchSchema } from './research.js';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const unknown = '[待验证] 本次未取得该项资料';

// Detect omitted regional sections before placeholder padding hides the omission.
export function missingRegions(report) {
  return ['domestic', 'international'].filter(region => !REGION_FIELDS.some(key => {
    const value = report?.business_analysis?.[region]?.[key];
    return typeof value === 'string' && value.replace(/\[[^\]]+\]/g, '').trim().length > 3 &&
      !/^(?:\[待验证\]\s*)?(本次未取得该项资料|暂无足够公开资料|待验证|未知|未披露|string)\s*$/.test(value.trim());
  }));
}

// Repair missing data, not arbitrary structural errors. Wrong objects/arrays
// remain wrong and are rejected by the existing validators.
function fill(value, shape, path, warnings) {
  const missing = value === null || value === undefined || (typeof value === 'string' && !value.trim());
  if (typeof shape === 'string') {
    if (missing) {
      if (shape === 'nullable') return null;
      const key=path.split('.').at(-1);
      if (['note','source_id','quote','analysis_date'].includes(key)) return '';
      warnings.push(path);
      if (shape === 'confidence') return 'inferred';
      if (key === 'status') return 'unknown';
      return unknown;
    }
    if (typeof value === 'number' && Number.isFinite(value) && shape !== 'confidence') {
      warnings.push(path);return String(value);
    }
    return value;
  }
  if (Array.isArray(shape)) {
    if (missing) {warnings.push(path);return [];}
    if (!Array.isArray(value)) return value;
    return value.filter((v,i)=>{if(v===null){warnings.push(`${path}.${i}`);return false;}return true;})
      .map((v,i)=>fill(v,shape[0],`${path}.${i}`,warnings));
  }
  if (missing) {warnings.push(path);value={};}
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(shape).map(([k,s])=>[k,fill(value[k],s,`${path}.${k}`,warnings)]));
}

export function normalizeReport(input) {
  if(!object(input)) return {report:input,warnings:[]};
  // Require substantive content in multiple expected sections. Never turn an
  // empty object or an unrelated JSON response into a successful report.
  const meaningful = v => typeof v==='string' ? v.trim().length>=4 :
    object(v)||Array.isArray(v) ? Object.values(v).some(meaningful) : false;
  const sections=Object.keys(schema).filter(k=>k!=='meta' && meaningful(input[k]));
  if(sections.length<2) return {report:input,warnings:[]};
  const warnings=[];
  const report=fill(input,schema,'report',warnings);
  report.research=fill(input.research,researchSchema,'research',warnings);
  if(object(report.business_analysis) && Array.isArray(report.business_analysis.research_questions) && !report.business_analysis.research_questions.length) {
    report.business_analysis.research_questions=['[待验证] 资料不足，请对照公司官网与公告继续核查'];
  }
  if(object(report.research?.investment) && !['listed','private','unknown'].includes(report.research.investment.status)) {
    report.research.investment.status='unknown';warnings.push('research.investment.status');
  }
  return {report,warnings:[...new Set(warnings)]};
}
