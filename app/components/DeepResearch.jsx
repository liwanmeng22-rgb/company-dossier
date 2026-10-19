import { useState } from 'react';
import { Section } from './DossierParts';

export function CitedClaim({value,sources=[]}) {
  if(!value) return <span>未取得可核查数据</span>;
  const source=value.citation_valid && sources.find(s=>s.id===value.source_id);
  return <div className="cited-claim"><span>{value.text || '待核查'}</span>{source ? <details className="claim-proof"><summary>查看依据 · {source.id}</summary><blockquote>{value.quote}</blockquote><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><p>发布日期：{source.publishedAt || '来源未提供'} · 摘要匹配通过，结论仍需对照原文核查</p></details> : <small className="claim-pending">{value.text?.includes('合理假设')?'分析假设 · 非事实结论':'暂无匹配来源 · 待核查'}</small>}</div>;
}
function PriceChart({market}) {
  const [active,setActive]=useState(null);
  const points=market.points; const values=points.map(p=>p.close);
  const low=Math.min(...values),high=Math.max(...values),spread=high-low||1;
  const xy=(p,i)=>[55+i/(points.length-1)*650,175-(p.close-low)/spread*145];
  const selected=points[active??points.length-1];
  return <div className="price-chart"><div className="chart-readout">{selected.date} <strong>{selected.close.toFixed(2)} {market.currency}</strong></div><svg viewBox="0 0 740 210" role="img" aria-label={`近三个月日线价格，从${points[0].date}至${market.asOf}`} onMouseLeave={()=>setActive(null)}>
    {[0,0.5,1].map(t=><g key={t}><line x1="55" x2="705" y1={175-t*145} y2={175-t*145} stroke="#334155"/><text x="4" y={180-t*145} fill="#94a3b8" fontSize="11">{(low+t*spread).toFixed(1)}</text></g>)}
    <polyline fill="none" stroke="#73c7bb" strokeWidth="2.5" points={points.map((p,i)=>xy(p,i).join(',')).join(' ')}/>
    {points.map((p,i)=><circle key={i} cx={xy(p,i)[0]} cy={xy(p,i)[1]} r="7" fill="transparent" onMouseEnter={()=>setActive(i)}><title>{p.date}: {p.close.toFixed(2)} {market.currency}</title></circle>)}
    <text x="55" y="202" fill="#94a3b8" fontSize="11">{points[0].date}</text><text x="705" y="202" textAnchor="end" fill="#94a3b8" fontSize="11">{market.asOf}</text>
  </svg><details><summary>查看每日数据</summary><div className="price-data">{points.map(p=><div key={p.date}><time>{p.date}</time><span>{p.close.toFixed(2)} {market.currency}</span></div>)}</div></details></div>;
}
export function DeepResearch({data,sources,market}) {
  if(!data)return null;
  const claim=value=><CitedClaim value={value} sources={sources}/>;
  const investment=data.investment;
  return <>
    <Section idx="07" title="公司关系"><div className="research-grid">{data.entities.length?data.entities.map((e,i)=><article className="card" key={i}><h3>{e.name}</h3>{claim(e.relationship)}</article>):<div className="card">暂无可核查的母子公司与品牌关系资料。</div>}</div></Section>
    <Section idx="08" title="财务趋势"><div className="card"><p className="field-note">近三个完整年度；按各行注明的币种、单位和合并口径阅读。空缺不补估算，不把季度当全年。</p><div className="table-scroll"><table className="research-table"><thead><tr><th>报告期 / 单位</th><th>营业收入</th><th>归母净利润</th><th>经营现金流</th></tr></thead><tbody>{data.financials.map((r,i)=><tr key={i}><th>{r.period}<small>{r.currency_unit}</small></th><td>{claim(r.revenue)}</td><td>{claim(r.profit)}</td><td>{claim(r.operating_cash_flow)}</td></tr>)}</tbody></table></div>{!data.financials.length&&<p>未取得可核查的年度财务数据。</p>}</div></Section>
    <Section idx="09" title="重要事件"><div className="event-list">{data.events.map((e,i)=><article className="card event-card" key={i}><time>{e.date}</time><div>{claim(e.event)}<div className="event-impact"><strong>可能影响</strong>{claim(e.impact)}</div></div></article>)}{!data.events.length&&<div className="card">暂无有依据的事件记录。</div>}</div></Section>
    <Section idx="10" title="同业对比"><div className="card"><p className="field-note">按产品与客户场景比较，差异分析不等于市场排名。</p><div className="table-scroll"><table className="research-table"><thead><tr><th>可比公司</th><th>产品</th><th>客户</th><th>与查询公司的差异</th></tr></thead><tbody>{data.peers.map((p,i)=><tr key={i}><th>{p.name}</th><td>{claim(p.products)}</td><td>{claim(p.customers)}</td><td>{claim(p.difference)}</td></tr>)}</tbody></table></div>{!data.peers.length&&<p>暂无足够资料建立可比组。</p>}</div></Section>
    <Section idx="11" title="股票与投资观察">
      {market?.status==='available'?<div className="card market-card"><div className="market-heading"><div><span className="index-label">MARKET SNAPSHOT</span><h3>{market.symbol} · {market.name}</h3><p>{market.exchange} · {market.currency} · 最新完整日线 {market.asOf}</p></div><a href={market.sourceUrl} target="_blank" rel="noopener noreferrer">Yahoo Finance ↗</a></div><p className="field-note">请核对上方证券名称与查询主体。行情可能延迟；此处采用供应商 Close 序列，不含股息再投资，不是总回报。</p>{market.stale&&<p className="market-warning">行情距今超过7天，可能停牌或数据滞后，不能视为当前价格。</p>}<div className="market-metrics"><div><small>最新完整日线价格</small><strong>{market.latest.toFixed(2)}</strong></div><div><small>所示区间涨跌</small><strong>{market.changePct.toFixed(2)}%</strong></div><div><small>区间最大回撤</small><strong>{market.maxDrawdownPct.toFixed(2)}%</strong></div><div><small>20个交易日均价</small><strong>{market.ma20?.toFixed(2)||'样本不足'}</strong></div></div><PriceChart market={market}/><p className="field-note">{market.ma20?`区间末价格${market.latest>=market.ma20?'高于':'低于'}20日均价，仅描述历史状态，不预测未来涨跌。`: '交易日样本不足，不计算均线。'} 数据获取：{market.retrievedAt}</p></div>:<div className="card"><h3>{market?.status==='not_listed'?'非上市主体':'行情暂不可用'}</h3><p>{market?.reason||'尚未取得行情'}</p></div>}
      {investment.status==='listed'?<><div className="research-grid investment-grid">{[['看好逻辑与条件',investment.bull_case],['下行情景与失效信号',investment.bear_case],['估值与价格是否匹配',investment.valuation],['下一步投资研究建议',investment.action]].map(([title,value])=><article className="card" key={title}><h3>{title}</h3>{claim(value)}</article>)}</div><p className="field-note">上述为公开信息基础上的一般投资研究，不了解你的资产、期限或风险承受能力。历史涨跌不保证未来表现；资料不足时先核查，不据此直接交易。</p></>:<p className="field-note">上市状态未确认或该主体未上市，不生成股票买卖建议。</p>}
    </Section>
  </>;
}
