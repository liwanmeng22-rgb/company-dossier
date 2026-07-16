"use client";

import { useState, useRef } from "react";
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

const NAV = [
  { id: "01", title: "行业定位" },
  { id: "02", title: "商业模式" },
  { id: "03", title: "护城河" },
  { id: "04", title: "风险与隐患" },
  { id: "05", title: "最终判断" },
];

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [report, setReport] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const reportRef = useRef(null);

  async function runAnalysis() {
    if (!companyName.trim() || loading) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "生成失败，请重试");
      } else {
        setReport(data.report);
        setSearched(Boolean(data.searched));
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
          <strong>{report?.meta?.company_name || "拆解档案"}</strong>
        </div>
        {report && (
          <nav className="sidebar-nav">
            {NAV.map((n) => (
              <a href={`#${n.title.toLowerCase()}`} key={n.id}>
                <span className="idx">{n.id}</span>
                {n.title}
              </a>
            ))}
          </nav>
        )}
      </aside>

      <main className="main">
        <div className="hero">
          <div className="hero-eyebrow">Structured Company Teardown</div>
          <h1>输入一家公司，生成带置信度标记的拆解档案</h1>
          <div className="search-row">
            <input
              placeholder="例如：长鑫存储"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
            />
            <button onClick={runAnalysis} disabled={loading}>
              {loading ? "生成中…" : "生成报告"}
            </button>
          </div>
          {report?.meta?.as_of_note && (
            <div className="as-of">
              {report.meta.as_of_note}
              {"　"}
              <span style={{ color: searched ? "var(--verified)" : "var(--inferred)" }}>
                {searched ? "● 本次已联网检索" : "○ 本次未使用联网检索"}
              </span>
              {"　"}
              <button className="export-btn" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? "导出中…" : "导出PDF"}
              </button>
            </div>
          )}
          {loading && (
            <div className="loading-line">
              &gt; 正在联网检索 {companyName} 的最新信息，再交给 DeepSeek 生成报告…
            </div>
          )}
          {error && <div className="error-box">{error}</div>}
        </div>

        {!report && !loading && (
          <div className="empty-state">
            报告会按「已披露 / 行业估算 / AI推测」三级标注每条数据的可信度——
            <span style={{ color: "var(--verified)" }}>绿色</span>代表有公开依据，
            <span style={{ color: "var(--estimated)" }}>黄色</span>是同业推算，
            <span style={{ color: "var(--inferred)" }}>灰色斜体</span>是AI的合理推测，
            仅供参考、需自行核实。
          </div>
        )}

        {report && (
          <div ref={reportRef}>
            <div className="pdf-header">
              <h2>{report.meta?.company_name}</h2>
              <p>{report.meta?.as_of_note}</p>
            </div>
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
                <div className="card-title">业务版图</div>
                <BusinessMapTable rows={b?.business_map} />
                <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
                  收入最大：<strong style={{ color: "var(--text)" }}>{b?.largest_revenue_line}</strong>
                  {"　"}增长最快：<strong style={{ color: "var(--text)" }}>{b?.fastest_growing_line}</strong>
                </div>
              </div>
            </Section>

            <Section idx="03" title="护城河">
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
          </div>
        )}
      </main>
    </div>
  );
}
