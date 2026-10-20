"use client";

import { useState, useRef, useEffect } from "react";
import { CompanyOverview, BusinessAnalysis } from "./components/ResearchPanels";
import { DeepResearch } from './components/DeepResearch';
import "./components/dossier.css";
import { exportReportToPDF } from "./lib/exportPdf";
import {
  Section,
  FieldRow,
  LevelBar,
  BusinessMapTable,
  MoatColumns,
  RiskCard,
} from "./components/DossierParts";

const NAV = [{ id: "00", title: "公司速览", group: "先看全貌" },
  { id: "01", title: "行业定位" },
  { id: "02", title: "商业模式" },
  { id: "03", title: "护城河", group: "理解竞争力" },
  { id: "04", title: "风险与隐患" },
  { id: "05", title: "最终判断" },
  { id: "06", title: "业务版图", group: "深入业务" },
  { id: "07", title: "公司关系", group: "深入研究" },
  { id: "08", title: "财务趋势" },
  { id: "09", title: "重要事件" },
  { id: "10", title: "同业对比" },
  { id: "11", title: "股票与投资观察" },
  { id: "12", title: "来源与核查" },
];

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [report, setReport] = useState(null);
  const [market, setMarket] = useState(null);
  const [searched, setSearched] = useState(false);
  const [sources, setSources] = useState([]);
  const [searchNote, setSearchNote] = useState("");
  const [completenessNote, setCompletenessNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const reportRef = useRef(null);
  const [activeSection, setActiveSection] = useState("公司速览");
  useEffect(() => {
    if (!report) return;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const sections = Array.from(document.querySelectorAll("section.section"));
      const current = sections.filter(section => section.getBoundingClientRect().top <= 160).at(-1) || sections[0];
      if (current) setActiveSection(current.id);
    };
    const onScroll = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [report]);

  async function runAnalysis() {
    if (!companyName.trim() || loading) return;
    setLoading(true);
    setError("");
    setReport(null);
    setMarket(null);
    setSources([]);
    setSearchNote("");
    setCompletenessNote('');
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!data) {
        throw new Error(
          res.status === 504
            ? "分析时间过长，请稍后重试"
            : `服务器返回异常（${res.status}），请稍后重试`
        );
      }
      if (!res.ok) {
        setError(data.error || "生成失败，请重试");
      } else {
        setReport(data.report);
        setMarket(data.market);
        setSearched(Boolean(data.searched));
        setSources(data.sources || []);
        setSearchNote(data.searchNote || "");
        setCompletenessNote(data.completenessNote || '');
      }
    } catch (err) {
      setError(`请求出错：${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    setError("");
    try {
      await exportReportToPDF(
        reportRef.current,
        `${report?.meta?.company_name || companyName}-拆解报告`
      );
    } catch (err) {
      setError(`导出PDF失败：${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const p = report?.industry_positioning;
  const b = report?.business_model;
  const m = report?.moat_analysis;
  const r = report?.risk_analysis;
  const v = report?.verdict;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Company Dossier
          <strong>{report?.meta?.company_name || "公司研究档案"}</strong>
        </div>
          <div className="index-label">阅读索引 <span>INDEX</span></div>
          <nav className="sidebar-nav" aria-label="报告索引">
            {NAV.map((n) => (
              <div key={n.id}>
              {n.group && <div className="nav-group">{n.group}</div>}
              <a href={report ? `#${n.title.toLowerCase()}` : undefined} aria-disabled={!report} aria-current={report && activeSection === n.title ? "location" : undefined}>
                <span className="idx">{n.id}</span>
                {n.title}
              </a>
              {n.id === "06" && report && <div className="nav-children"><a href="#国内业务">国内业务</a><a href="#海外业务">海外业务</a></div>}
              </div>
            ))}
          </nav>
          <div className="sidebar-foot">了解公司，也了解信息的边界。<br /><span>公开资料 · 结构化研究</span></div>
      </aside>

      <main className="main">
        <div className="hero">
          <div className="hero-eyebrow"><span className="brand-dot" />Company Dossier / Research Desk</div>
          <h1>看懂一家公司，<br /><span>从全貌到细节。</span></h1>
          <p className="hero-description">产品、赚钱方式、竞争力与国内外业务，一份有据可查的公司研究档案。</p>
          <div className="search-row">
            <input
              aria-label="公司名称" maxLength={80} placeholder="请输入公司全称"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
            />
            <button onClick={runAnalysis} disabled={loading || !companyName.trim()}>
              {loading ? "生成中…" : "生成报告"}
            </button>
          </div>
          {report && <details className="mobile-index"><summary>阅读目录 · {activeSection}</summary><nav aria-label="移动阅读索引">{NAV.map(n=><a key={n.id} href={`#${n.title}`} onClick={e=>{e.currentTarget.closest('details').open=false;}} aria-current={activeSection === n.title ? "location" : undefined}><span>{n.id}</span>{n.title}</a>)}<a href="#国内业务">国内业务</a><a href="#海外业务">海外业务</a></nav></details>}
          {report && (
            <div className="as-of">
              {report.meta?.as_of_note}
              {"　"}
              <span style={{ color: searched ? "var(--verified)" : "var(--inferred)" }}>
                {searched ? "● 已取得搜索摘要，结论仍需核查" : "○ 未取得有效检索资料"}
              </span>
              {"　"}
              <button className="export-btn" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? "导出中…" : "导出PDF"}
              </button>
            </div>
          )}
          {loading && (
            <div className="loading-line">
              &gt; 正在检索资料并整理 {companyName} 的研究档案，通常需要数十秒…
            </div>
          )}
          {error && <div className="error-box" role="alert">{error}</div>}
        </div>

        {!report && !loading && (
          <div className="empty-state">
            <div className="empty-cards">{[["01","它是谁","先确认公司主体与主营产品"],["02","怎么赚钱","理解客户、收入与竞争优势"],["03","业务在哪","对照国内与海外市场布局"]].map(([number,title,detail])=><div key={number}><span>{number}</span><h3>{title}</h3><p>{detail}</p></div>)}</div>
            <p className="evidence-legend">资料线索、合理假设与待验证内容分别标注。检索命中不代表每条结论都已核实。</p>
          </div>
        )}

        {report && (
          <div ref={reportRef}>
            <div className="pdf-header">
              <h2>{report.meta?.company_name}</h2>
              <p>{report.meta?.as_of_note}</p>
            </div>
            <Section idx="00" title="公司速览">
              <CompanyOverview overview={report.company_overview} summary={v?.summary} sourcesCount={sources.length} />
            </Section>
<Section idx="01" title="行业定位">
              <div className="card">
                <div className="card-title">一句话类比</div>
                <div className="card-body">{p?.analogy?.text}</div>
              </div>
              <div className="card">
                <FieldRow label="政治" value={p?.pest?.political?.text} confidence={p?.pest?.political?.confidence} />
                <FieldRow label="经济" value={p?.pest?.economic?.text} confidence={p?.pest?.economic?.confidence} />
                <FieldRow label="社会" value={p?.pest?.social?.text} confidence={p?.pest?.social?.confidence} />
                <FieldRow label="技术" value={p?.pest?.technological?.text} confidence={p?.pest?.technological?.confidence} />
              </div>
              <div className="card">
                <FieldRow
                  label="生命周期"
                  value={`${p?.lifecycle_stage?.stage} — ${p?.lifecycle_stage?.reasoning || ""}`}
                  confidence={p?.lifecycle_stage?.confidence}
                />
                <FieldRow
                  label="市场规模"
                  value={p?.market_size?.current_size?.value ? `${p.market_size.current_size.value} ${p.market_size.current_size.unit || ""}` : null}
                  confidence={p?.market_size?.current_size?.confidence}
                />
                <FieldRow
                  label="增速"
                  value={p?.market_size?.growth_rate?.value}
                  confidence={p?.market_size?.growth_rate?.confidence}
                />
                <FieldRow
                  label="3-5年预测"
                  value={p?.market_size?.forecast_3_5yr?.value}
                  confidence={p?.market_size?.forecast_3_5yr?.confidence}
                />
              </div>
              <div className="card">
                <div className="card-title">波特五力</div>
                <LevelBar label="供应商议价权" level={p?.porters_five_forces?.supplier_power?.level} reasoning={p?.porters_five_forces?.supplier_power?.reasoning} />
                <LevelBar label="购买者议价权" level={p?.porters_five_forces?.buyer_power?.level} reasoning={p?.porters_five_forces?.buyer_power?.reasoning} />
                <LevelBar label="潜在进入者" level={p?.porters_five_forces?.new_entrants?.level} reasoning={p?.porters_five_forces?.new_entrants?.reasoning} />
                <LevelBar label="替代品威胁" level={p?.porters_five_forces?.substitutes?.level} reasoning={p?.porters_five_forces?.substitutes?.reasoning} />
                <LevelBar label="行业内竞争" level={p?.porters_five_forces?.industry_rivalry?.level} reasoning={p?.porters_five_forces?.industry_rivalry?.reasoning} />
              </div>
            </Section>

            <Section idx="02" title="商业模式">
              <div className="card">
                <div className="card-title">核心产品</div>
                <div className="card-body">{b?.core_product?.description}</div>
              </div>
              <div className="card">
                <div className="card-title">收入结构</div>
                <div className="table-scroll"><BusinessMapTable rows={b?.business_map} /></div>
                <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
                  收入最大：<strong style={{ color: "var(--text)" }}>{b?.largest_revenue_line}</strong>
                  {"　"}增长最快：<strong style={{ color: "var(--text)" }}>{b?.fastest_growing_line}</strong>
                </div>
              </div>
              <div className="card revenue-detail"><FieldRow label="收入来源" value={b?.revenue_model?.revenue_streams?.join("；")} /><FieldRow label="主要成本" value={b?.revenue_model?.cost_structure?.join("；")} /><FieldRow label="利润趋势" value={b?.revenue_model?.margin_trend?.text} confidence={b?.revenue_model?.margin_trend?.confidence} /></div>
            </Section>

            <Section idx="03" title="护城河">
              <div className="card"><div className="card-title">主要竞争者</div>{(m?.competitive_landscape?.market_leaders || []).map((competitor,index)=><FieldRow key={index} label={competitor.name} value={competitor.market_share ? `市场份额：${competitor.market_share}` : "市场份额未披露或待核查"} confidence={competitor.confidence} />)}{(m?.competitive_landscape?.tier2_comparison || []).map((competitor,index)=><FieldRow key={index} label={competitor.name} value={competitor.gap_description} />)}</div>
              <div className="card">
                <MoatColumns real={m?.real_moats} fake={m?.fake_moats} />
              </div>
              <div className="card">
                <div className="card-title">最脆弱的一环</div>
                <div className="card-body">
                  {m?.most_vulnerable_moat?.name} — {m?.most_vulnerable_moat?.reasoning}
                </div>
              </div>
              <div className="card">
                <LevelBar label="用户粘性" level={m?.qualitative_scores?.customer_stickiness?.level} reasoning={m?.qualitative_scores?.customer_stickiness?.reasoning} />
                <LevelBar label="品牌信任" level={m?.qualitative_scores?.brand_trust?.level} reasoning={m?.qualitative_scores?.brand_trust?.reasoning} />
                <LevelBar label="生态合作" level={m?.qualitative_scores?.ecosystem_partnership?.level} reasoning={m?.qualitative_scores?.ecosystem_partnership?.reasoning} />
                <LevelBar label="增长速度" level={m?.qualitative_scores?.growth_speed?.level} reasoning={m?.qualitative_scores?.growth_speed?.reasoning} />
              </div>
            </Section>

            <Section idx="04" title="风险与隐患">
              <div className="card">
                <FieldRow label="资产负债表" value={r?.financial_health?.balance_sheet?.text} confidence={r?.financial_health?.balance_sheet?.confidence} note={r?.financial_health?.balance_sheet?.note} />
                <FieldRow label="现金流" value={r?.financial_health?.cash_flow?.text} confidence={r?.financial_health?.cash_flow?.confidence} note={r?.financial_health?.cash_flow?.note} />
                <FieldRow label="利润表" value={r?.financial_health?.income_statement?.text} confidence={r?.financial_health?.income_statement?.confidence} note={r?.financial_health?.income_statement?.note} />
              </div>
              {(r?.top_risks || []).map((risk, i) => (
                <RiskCard key={i} risk={risk} />
              ))}
              <div className="card">
                <div className="card-title">治理与团队</div>
                <FieldRow label="管理层" value={r?.governance_risk?.management_background} />
                <FieldRow label="股权结构" value={r?.governance_risk?.ownership_structure} />
                <FieldRow label="核心人物风险" value={r?.governance_risk?.key_person_risk} />
              </div>
            </Section>

            <Section idx="05" title="最终判断">
              <div className="verdict">
                <div className="verdict-row">
                  <div className="verdict-label">最大优势</div>
                  <div className="verdict-text">{v?.biggest_advantage}</div>
                </div>
                <div className="verdict-row">
                  <div className="verdict-label">最致命挑战</div>
                  <div className="verdict-text">{v?.biggest_challenge}</div>
                </div>
                <div className="verdict-row">
                  <div className="verdict-label">总结</div>
                  <div className="verdict-text">{v?.summary}</div>
                </div>
              </div>
            </Section>
            <Section idx="06" title="业务版图">
              <BusinessAnalysis data={report.business_analysis} homeMarket={report.company_overview?.home_market} />
            </Section>
            <DeepResearch data={report.research} sources={sources} market={market}/>
            {completenessNote && <p className="field-note" role="status">{completenessNote}</p>}
            <Section idx="12" title="来源与核查">
              <div className="card">
                <p>{searchNote || (searched ? "本次取得了搜索摘要。" : "本次未取得有效检索资料。")}</p>
                <p className="field-note">以下是生成时参考的检索资料，不表示每条结论均已得到对应来源支持。请核对主体、原文与发布日期。报告生成于 {report.meta?.analysis_date || "未记录"}，不等于所有资料更新于该日。</p>
                {sources.length ? <ol className="source-list">{sources.filter(source => /^https?:\/\//i.test(source.url || "")).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.url}</a><div className="field-note">{source.url}</div></li>)}</ol> : <p>暂无可用来源，内容应视为待核查的分析假设。</p>}
              </div>
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}
