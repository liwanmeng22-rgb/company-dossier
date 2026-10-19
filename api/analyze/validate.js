export const REGION_FIELDS = ["footprint", "products", "customers", "channels", "growth_drivers", "constraints"];

const text = "text";
const confidence = "confidence";
const field = { text, confidence, note: text };
const level = { level: text, reasoning: text };
const metric = { value: "nullable", unit: text, confidence, note: text };
export const schema = {
  meta: { company_name: text, analysis_date: text, as_of_note: text },
  company_overview: { identity: text, home_market: text, listing_status: text, what_it_does: text },
  business_analysis: {
    value_chain: text,
    domestic: Object.fromEntries(REGION_FIELDS.map(key => [key, text])),
    international: Object.fromEntries(REGION_FIELDS.map(key => [key, text])),
    research_questions: [text],
  },
  industry_positioning: {
    analogy: field,
    pest: Object.fromEntries(["political", "economic", "social", "technological"].map(key => [key, field])),
    lifecycle_stage: { stage: text, reasoning: text, confidence },
    market_size: { current_size: metric, growth_rate: metric, forecast_3_5yr: metric, growth_drivers: [text] },
    porters_five_forces: Object.fromEntries(["supplier_power", "buyer_power", "new_entrants", "substitutes", "industry_rivalry"].map(key => [key, level])),
  },
  business_model: {
    core_product: { description: text, advantages: [text], disadvantages: [text] },
    target_customers: { segments: [text], key_accounts: [text] },
    revenue_model: { revenue_streams: [text], cost_structure: [text], margin_trend: field },
    business_map: [{ business_line: text, sold_to: text, who_pays: text, revenue_share: metric, growth_trend: text }],
    largest_revenue_line: text, fastest_growing_line: text,
  },
  moat_analysis: {
    real_moats: [{ name: text, strength: text, reasoning: text }],
    fake_moats: [{ name: text, risk_note: text }],
    most_vulnerable_moat: { name: text, reasoning: text },
    qualitative_scores: Object.fromEntries(["customer_stickiness", "brand_trust", "ecosystem_partnership", "growth_speed"].map(key => [key, level])),
    competitive_landscape: { market_leaders: [{ name: text, market_share: "nullable", confidence }], tier2_comparison: [{ name: text, gap_description: text }] },
  },
  risk_analysis: {
    financial_health: { balance_sheet: field, cash_flow: field, income_statement: field, red_flags: [text] },
    top_risks: [{ category: text, description: text, probability: text, impact: text, trigger_scenario: text, time_window: text }],
    governance_risk: { management_background: text, ownership_structure: text, culture_efficiency: text, key_person_risk: text },
  },
  verdict: { biggest_advantage: text, biggest_challenge: text, summary: text },
};

function matches(value, shape) {
  if (shape === text) return typeof value === "string" && value.length <= 20000;
  if (shape === "nullable") return value === null || matches(value, text);
  if (shape === confidence) return ["disclosed", "estimated", "inferred"].includes(value);
  if (Array.isArray(shape)) return Array.isArray(value) && value.length <= 40 && value.every(item => matches(item, shape[0]));
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  // Validate every supplied display field. Missing noncritical fields remain compatible
  // with existing reports and render as unavailable instead of crashing the page.
  return Object.entries(shape).every(([key, child]) => !(key in value) || matches(value[key], child));
}

export function validateReport(report) {
  if (!matches(report, schema)) return false;
  if (!Object.keys(schema).every(key => report[key] && typeof report[key] === "object" && !Array.isArray(report[key]))) return false;
  if (!["company_name", "as_of_note"].every(key => typeof report.meta[key] === "string" && report.meta[key].trim())) return false;
  if (!["identity", "home_market", "listing_status", "what_it_does"].every(key => typeof report.company_overview[key] === "string" && report.company_overview[key].trim())) return false;
  return typeof report.business_analysis.value_chain === "string" &&
    Array.isArray(report.business_analysis.research_questions) && report.business_analysis.research_questions.length > 0 &&
    ["domestic", "international"].every(region => REGION_FIELDS.every(key =>
      typeof report.business_analysis[region]?.[key] === "string" && report.business_analysis[region][key].trim()));
}

export function applyEvidenceBoundary(report, searched) {
  if (searched) return report;
  const pending = [report];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    if (value.confidence === "disclosed") value.confidence = "inferred";
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string") value[key] = child.replace(/^\[外部观察\]/, "[待验证]");
      if (child && typeof child === "object") pending.push(child);
    }
  }
  // Without retrieval, no named account can be represented as source-backed.
  if (report.business_model?.target_customers) report.business_model.target_customers.key_accounts = [];
  return report;
}
