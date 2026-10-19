const claim = { text: 'string', source_id: 'string', quote: 'string' };
export const researchSchema = {
  entities: [{ name: 'string', relationship: claim }],
  financials: [{ period: 'string', currency_unit: 'string', revenue: claim, profit: claim, operating_cash_flow: claim }],
  events: [{ date: 'string', event: claim, impact: claim }],
  peers: [{ name: 'string', products: claim, customers: claim, difference: claim }],
  investment: { status: 'listed|private|unknown', symbol: claim, exchange: claim, bull_case: claim, bear_case: claim, valuation: claim, action: claim },
};
export const researchRules = `新增research必须完整输出。entities给出母子公司/品牌关系和主体歧义，最多3条；financials给最近三个已披露完整年度，最多3行，不把季度与年度混排，period写年份和报告口径，currency_unit写币种及单位。收入、归母净利润、经营现金流没有来源原文明确支持就写“未取得可核查数据”，不得估算或拼接不同主体数据。events最多3条按发生日期倒序，日期不明写“日期待核查”，区分事件和影响推断。peers提供2家相同场景竞品的产品、客户、差异，不伪造量化排名。
每个claim含text/source_id/quote：事实必须引用本次检索S编号，quote从该摘要逐字摘录10至100字；推断以[合理假设]开头，source_id和quote可为空；无法确认的内容写[待验证]。引用存在不等于结论已核实。每条text最多70字。investment.status只有listed/private/unknown，非上市不推荐股票。symbol只有证据确认的当前上市股票Yahoo代码（深市.SZ、沪市.SS、港股.HK、美股原代码），无法确认写空字符串；exchange对应交易所。不可把子公司的股票当作母公司或把待IPO当作已上市。bull_case/bear_case分情景说明未来6至12月经营催化与失效条件；valuation必须解释估值口径和缺失数据，没有同期股价与财务数据不可判定便宜/昂贵。action给非个性化投资研究建议（观察/补充核查/满足条件后再评估），不编造现价、走势、目标价、止损位、保证收益或仓位。不依据股价单独推荐买卖。`;

function shapeMatches(value, shape) {
  if (typeof shape === 'string') return typeof value === 'string' && value.length <= 3000;
  if (Array.isArray(shape)) return Array.isArray(value) && value.length <= 4 && value.every(v => shapeMatches(v, shape[0]));
  return value && typeof value === 'object' && !Array.isArray(value) && Object.entries(shape).every(([k,s]) => shapeMatches(value[k],s));
}
export function validateResearch(value) {
  return !!shapeMatches(value,researchSchema) && ['listed','private','unknown'].includes(value.investment.status);
}
const normalize = s => s.replace(/\s+/g,'');
export function bindResearchEvidence(research, sources) {
  const byId = new Map(sources.map(s=>[s.id,s]));
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.text === 'string' && 'source_id' in value) {
      const source=byId.get(value.source_id);
      const quote=normalize(value.quote || '');
      value.citation_valid=!!(source && quote.length>=10 && normalize(source.content||'').includes(quote));
      if (!value.citation_valid) {value.source_id='';value.quote='';}
    } else Object.values(value).forEach(visit);
  };
  visit(research);
  for(const row of research.financials) {
    for(const key of ['revenue','profit','operating_cash_flow']) {
      const value=row[key];
      // Do not let a valid excerpt lend authority to extra, unsupported numbers.
      // Unit conversions are deliberately not inferred by this display layer.
      const numbers=s=>(s.replace(/,/g,'').match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
      const quoted=numbers(value.quote);
      const supported=numbers(value.text).every(n=>quoted.includes(n));
      if(!value.citation_valid || !supported) {
        value.text='未取得可核查数据';value.citation_valid=false;value.source_id='';value.quote='';
      }
    }
  }
  return research;
}
