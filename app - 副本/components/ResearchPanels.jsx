const REGION_LABELS = { footprint: "市场布局", products: "主要产品", customers: "客户与需求", channels: "销售与渠道", growth_drivers: "增长动力", constraints: "经营挑战" };

export function EvidenceText({ value }) {
  const raw = typeof value === "string" && value.trim() ? value : "[待验证] 暂无足够公开资料";
  const match = raw.match(/^\[(外部观察|合理假设|待验证)\]\s*/);
  const label = match?.[1] || "待核查";
  const tone = label === "外部观察" ? "observed" : label === "合理假设" ? "assumed" : "unknown";
  return <div className="evidence-text"><span className={`evidence-tag ${tone}`}>{label === "外部观察" ? "资料线索" : label}</span><span>{raw.replace(/^\[(外部观察|合理假设|待验证)\]\s*/, "")}</span></div>;
}

export function CompanyOverview({ overview, summary, sourcesCount }) {
  return <>
    <div className="card company-brief">
      <div className="panel-eyebrow">THE COMPANY AT A GLANCE</div>
      <div className="brief-lead"><EvidenceText value={overview?.what_it_does} /></div>
      <div className="brief-facts">
        <div><span className="fact-label">公司主体</span><EvidenceText value={overview?.identity} /></div>
        <div><span className="fact-label">本土市场</span><p>{overview?.home_market || "待确认"}</p></div>
        <div><span className="fact-label">上市状态</span><EvidenceText value={overview?.listing_status} /></div>
      </div>
    </div>
    <div className="card reading-note"><span className="note-marker">i</span><div><strong>先读全貌，再看证据</strong><p>{summary || "资料不足时保留未知，不用推测填满报告。"}</p><small>{sourcesCount} 条检索来源 · 标签为模型判断，具体结论仍需核查</small></div></div>
  </>;
}

export function BusinessAnalysis({ data, homeMarket }) {
  return <>
    <div className="card business-intro"><div><span className="panel-eyebrow">BUSINESS FOOTPRINT</span><h3>同一家公司，两种市场视角</h3><p>国内指总部所在国的本土市场：{homeMarket || "待确认"}。缺少海外资料不等于没有海外业务。</p></div><div className="market-key"><span><i />本土市场</span><span><i />国际市场</span></div></div>
    <div className="region-grid">
      {[{key:"domestic", title:"国内业务", label:"HOME MARKET", code:"01"}, {key:"international", title:"海外业务", label:"INTERNATIONAL", code:"02"}].map(region => <article className={`card region-card ${region.key}`} id={region.key === "domestic" ? "国内业务" : "海外业务"} key={region.key}>
        <header className="region-header"><div><span className="panel-eyebrow">{region.label}</span><h3>{region.title}</h3></div><span className="region-symbol" aria-hidden="true">{region.code}</span></header>
        <div className="region-footprint"><EvidenceText value={data?.[region.key]?.footprint} /></div>
        <dl className="region-details">{Object.entries(REGION_LABELS).filter(([key])=>key !== "footprint").map(([key,label])=><div key={key}><dt>{label}</dt><dd><EvidenceText value={data?.[region.key]?.[key]} /></dd></div>)}</dl>
      </article>)}
    </div>
    <div className="card value-chain"><span className="panel-eyebrow">VALUE CHAIN</span><h3>它在产业链中，创造什么价值？</h3><EvidenceText value={data?.value_chain} /></div>
    <div className="card research-gaps"><span className="panel-eyebrow">OPEN QUESTIONS</span><h3>继续了解前，值得查清的事</h3><div className="question-grid">{(data?.research_questions || []).map((item,index)=><div key={index}><span className="question-index">{String(index+1).padStart(2,"0")}</span><EvidenceText value={item} /></div>)}</div></div>
  </>;
}
