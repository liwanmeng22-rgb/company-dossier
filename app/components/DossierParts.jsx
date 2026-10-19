const CONFIDENCE_LABEL = {
  disclosed: "公开资料线索",
  estimated: "行业估算",
  inferred: "AI推测",
};

export function ConfidenceBadge({ level }) {
  if (!level || !CONFIDENCE_LABEL[level]) return null;
  return (
    <span className={`badge ${level}`} title="模型判断的证据类别，不代表人工核实；请对照报告来源阅读。">
      <span className="dot" />
      {CONFIDENCE_LABEL[level]}
    </span>
  );
}

export function Section({ idx, title, children }) {
  const id = title.toLowerCase();
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <span className="idx">{idx}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function FieldRow({ label, value, confidence, note }) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <div className="field-value">
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <span>{value || "—"}</span>
          <ConfidenceBadge level={confidence} />
        </div>
        {note && <div className="field-note">{note}</div>}
      </div>
    </div>
  );
}

const LEVEL_WIDTH = { 高: 90, 中: 55, 低: 25, 强: 90, 中等: 55, 弱: 25 };

export function LevelBar({ label, level, reasoning }) {
  const width = LEVEL_WIDTH[level] ?? 50;
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="bar-row">
        <span className="bar-label">{label}</span>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${width}%` }} />
        </div>
        <span className="bar-level">{level || "—"}</span>
      </div>
      {reasoning && (
        <div className="field-note" style={{ marginLeft: 102 }}>
          {reasoning}
        </div>
      )}
    </div>
  );
}

export function BusinessMapTable({ rows }) {
  if (!rows?.length) return <p className="card-body">暂无数据</p>;
  return (
    <table className="dossier-table">
      <thead>
        <tr>
          <th>业务线</th>
          <th>卖给谁</th>
          <th>谁付钱</th>
          <th>收入占比</th>
          <th>趋势</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.business_line}</td>
            <td>{r.sold_to}</td>
            <td>{r.who_pays}</td>
            <td>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span>{r.revenue_share?.value ?? "—"}</span>
                <ConfidenceBadge level={r.revenue_share?.confidence} />
              </div>
            </td>
            <td>{r.growth_trend}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MoatColumns({ real, fake }) {
  return (
    <div className="moat-grid">
      <div>
        <h3>真护城河</h3>
        {(real || []).map((m, i) => (
          <div className="moat-item" key={i}>
            <div className="moat-item-name">
              {m.name}
              <span className="tag">{m.strength}</span>
            </div>
            <div className="moat-item-reason">{m.reasoning}</div>
          </div>
        ))}
      </div>
      <div>
        <h3>假护城河 / 需警惕</h3>
        {(fake || []).map((m, i) => (
          <div className="moat-item" key={i}>
            <div className="moat-item-name">{m.name}</div>
            <div className="moat-item-reason">{m.risk_note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RiskCard({ risk }) {
  const isHigh = risk.probability === "高" || risk.impact === "致命";
  return (
    <div className="card risk-card">
      <div className="risk-meta">
        <span className={`tag ${isHigh ? "high" : ""}`}>概率：{risk.probability}</span>
        <span className={`tag ${risk.impact === "致命" ? "high" : ""}`}>
          影响：{risk.impact}
        </span>
        {risk.time_window && <span className="tag">{risk.time_window}</span>}
      </div>
      <div className="card-title">{risk.category}</div>
      <div className="card-body">{risk.description}</div>
      {risk.trigger_scenario && (
        <div className="card-body" style={{ marginTop: 8 }}>
          <strong style={{ color: "var(--text-muted)" }}>触发情景：</strong>
          {risk.trigger_scenario}
        </div>
      )}
    </div>
  );
}
