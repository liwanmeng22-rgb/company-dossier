import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { gatherSearchContext } from "./search.js";
import { buildPrompt } from "./prompt.js";
import { validateReport, applyEvidenceBoundary, REGION_FIELDS } from "./validate.js";
import { fetchTextWithTimeout } from "./request.js";
import { POST } from "./route.js";

const result = (url = "https://example.com/product") => ({ title: "产品资料", url, content: "产品与客户公开信息" });
const jsonResponse = value => ({ ok: true, text: async () => JSON.stringify(value) });
const search = fetchImpl => gatherSearchContext("测试公司", { apiKey: "test-placeholder", fetchImpl });

test("successful search deduplicates sources and rejects unsafe URL schemes", async () => {
  const topics = [];
  const report = await search(async (_url, init) => {
    topics.push(JSON.parse(init.body).topic);
    return jsonResponse({ results: [result(), result("https://example.com/product#section"),
      result("javascript:alert(1)"), result("https://user:password@example.com/")] });
  });
  assert.equal(report.searched, true);
  assert.equal(report.sources[0].url, "https://example.com/product");
  assert.equal(report.sources[0].id, 'S1');
  assert.equal(report.sources[0].content, '产品与客户公开信息');
  assert.match(report.contextText, /产品与客户公开信息/);
  assert.ok(!report.contextText.includes("javascript:"));
  assert.deepEqual(topics.sort(), ["general", "general", "general", "general", "general", "general", "news"]);
});

test("empty searches provide no context and no claim of retrieved evidence", async () => {
  const value = await search(async () => jsonResponse({ results: [] }));
  assert.equal(value.searched, false);
  assert.equal(value.contextText, "");
  assert.deepEqual(value.sources, []);
  assert.match(value.note, /未取得有效来源/);
});

test("one failed query retains successful evidence with a partial failure note", async () => {
  const value = await search(async (_url, init) => {
    if (JSON.parse(init.body).topic === "news") throw new Error("private upstream details");
    return jsonResponse({ results: [result()] });
  });
  assert.equal(value.searched, true);
  assert.equal(value.sources.length, 1);
  assert.match(value.note, /部分检索失败/);
  assert.ok(!JSON.stringify(value).includes("private upstream details"));
});

test("all failed queries return safe fallback without upstream error content", async () => {
  const value = await search(async () => { throw new Error("private upstream details"); });
  assert.equal(value.searched, false);
  assert.equal(value.contextText, "");
  assert.deepEqual(value.sources, []);
  assert.match(value.note, /暂时失败/);
  assert.ok(!JSON.stringify(value).includes("private upstream details"));
});

test("missing search configuration skips network", async () => {
  const value = await gatherSearchContext("测试", { apiKey: "", fetchImpl: async () => { throw new Error("must not call"); } });
  assert.equal(value.searched, false);
  assert.equal(value.contextText, "");
  assert.match(value.note, /未启用/);
});

test("malformed search result degrades to safe no-evidence state", async () => {
  const value = await search(async () => jsonResponse({ results: "wrong shape" }));
  assert.equal(value.searched, false);
  assert.equal(value.contextText, "");
});

test("prompt covers both markets without career fields and uses explicit search state", () => {
  const prompt = buildPrompt("测试", "PRIVATE_UNUSED_CONTEXT", false);
  assert.match(prompt, /本次没有联网检索结果/);
  assert.ok(!prompt.includes("PRIVATE_UNUSED_CONTEXT"));
  const schema = JSON.parse(prompt.split("Schema:\n")[1]);
  assert.deepEqual(Object.keys(schema.business_analysis.domestic), REGION_FIELDS);
  assert.deepEqual(Object.keys(schema.business_analysis.international), REGION_FIELDS);
  assert.equal(schema.overseas_sales, undefined);
  assert.ok(!JSON.stringify(schema).includes("career_value"));
  assert.ok(!JSON.stringify(schema).includes("interview_questions"));
  assert.match(prompt, /不固定指中国/);
  assert.match(buildPrompt("测试", "公开信息", true), /检索结果开始/);
  assert.match(prompt, /不超过60个汉字/);
  assert.match(prompt, /不超过45个汉字/);
  assert.match(prompt, /5500个token/);
  assert.match(prompt, /key_accounts只能填写检索来源明确提及的真实客户/);
  assert.match(prompt, /禁止使用"disclosed"/);
});

function validReport() {
  return { meta: { company_name: "测试", as_of_note: "未经核实" },
    research: { entities: [], financials: [], events: [], peers: [], investment: { status:'unknown', ...Object.fromEntries(['symbol','exchange','bull_case','bear_case','valuation','action'].map(k=>[k,{text:'',source_id:'',quote:''}])) } },
    company_overview: { identity: "[待验证] 测试", home_market: "中国", listing_status: "[待验证] 未知", what_it_does: "[待验证] 测试产品" },
    business_analysis: { value_chain: "[待验证] 待查", research_questions: ["[待验证] 待查"],
      domestic: Object.fromEntries(REGION_FIELDS.map(key => [key, "[待验证] 本土待查"])),
      international: Object.fromEntries(REGION_FIELDS.map(key => [key, "[待验证] 海外待查"])) },
    industry_positioning: {}, business_model: {}, moat_analysis: {}, risk_analysis: {}, verdict: {} };
}

test("report requires a company overview and both usable geographic markets", () => {
  assert.equal(validateReport(validReport()), true);
  for (const invalid of [null, [], "text", {}, { ...validReport(), company_overview: {} }, { ...validReport(), business_analysis: {} }]) assert.equal(validateReport(invalid), false);
  const missingMarket = validReport();
  delete missingMarket.business_analysis.domestic;
  assert.equal(validateReport(missingMarket), false);
});

test("report rejects wrong arrays, null entries and objects that React cannot render", () => {
  const cases = [
    report => { report.risk_analysis.top_risks = "wrong"; },
    report => { report.risk_analysis.top_risks = [null]; },
    report => { report.moat_analysis.real_moats = {}; },
    report => { report.moat_analysis.fake_moats = ["wrong"]; },
    report => { report.business_model.business_map = "wrong"; },
    report => { report.business_model.business_map = [{ sold_to: {} }]; },
    report => { report.verdict.summary = {}; },
    report => { report.business_analysis.domestic.customers = [{}]; },
    report => { report.business_analysis.international.channels = {}; },
    report => { report.industry_positioning.analogy = { text: "说明", confidence: "certain" }; },
  ];
  for (const mutate of cases) { const report = validReport(); mutate(report); assert.equal(validateReport(report), false); }
});

test("no-search evidence boundary downgrades disclosure claims and named accounts", () => {
  const report = validReport();
  report.industry_positioning.analogy = { text: "说明", confidence: "disclosed" };
  report.business_model.business_map = [{ revenue_share: { value: "10%", confidence: "estimated" } }];
  report.business_model.target_customers = { key_accounts: ["未经检索证实的客户"] };
  report.business_analysis.domestic.customers = "[外部观察] 客户";
  report.business_analysis.international.footprint = "[外部观察] 地区";
  report.business_analysis.research_questions = ["[外部观察] 待查", "[合理假设] 待查"];
  const withSources = structuredClone(report);
  applyEvidenceBoundary(withSources, true);
  assert.equal(withSources.industry_positioning.analogy.confidence, "disclosed");
  assert.equal(withSources.business_model.target_customers.key_accounts.length, 1);
  applyEvidenceBoundary(report, false);
  assert.equal(report.industry_positioning.analogy.confidence, "inferred");
  assert.equal(report.business_model.business_map[0].revenue_share.confidence, "estimated");
  assert.deepEqual(report.business_model.target_customers.key_accounts, []);
  assert.equal(report.business_analysis.domestic.customers, "[待验证] 客户");
  assert.equal(report.business_analysis.international.footprint, "[待验证] 地区");
  assert.deepEqual(report.business_analysis.research_questions, ["[待验证] 待查", "[合理假设] 待查"]);
});

test("timeout remains active while response body is pending", async () => {
  await assert.rejects(fetchTextWithTimeout("https://example.com", {}, 15, async (_url, { signal }) => ({
    text: () => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
  })), { name: "AbortError" });
});

test("API rejects overlong and malformed input before contacting any service", async () => {
  for (const companyName of ["a".repeat(81), "", "line\nbreak", 123]) {
    const response = await POST(new Request("https://example.com/api/analyze", {
      method: "POST", body: JSON.stringify({ companyName }),
    }));
    assert.equal(response.status, 400);
  }
  const response = await POST(new Request("https://example.com/api/analyze", { method: "POST", body: "{" }));
  assert.equal(response.status, 400);
});

test("API returns server metadata and hides upstream response bodies", () => {
  // A separate process with an empty environment ensures no real key can be read
  // or used. All upstream responses below are fixtures, not live API traffic.
  const script = `
    import assert from 'node:assert/strict';
    import { POST } from './app/api/analyze/route.js';
    process.env.DEEPSEEK_API_KEY = 'test-placeholder';
    const report = ${JSON.stringify(validReport())};
    report.meta.as_of_note = '已实时联网核实全部资料';
    const request = () => new Request('https://example.com/api/analyze', { method: 'POST', body: JSON.stringify({ companyName: '测试' }) });
    globalThis.fetch = async (_url, init) => {
      assert.equal(JSON.parse(init.body).max_tokens, 12000);
      return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(report) } }] }) };
    };
    let response = await POST(request());
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.searched, false);
    assert.deepEqual(data.sources, []);
    assert.equal(Number.isNaN(Date.parse(data.generatedAt)), false);
    assert.equal(data.report.meta.analysis_date, data.generatedAt.slice(0, 10));
    assert.match(data.searchNote, /未启用/);
    assert.equal(data.report.meta.as_of_note, data.searchNote);
    assert.equal(data.report.meta.as_of_note.includes('已实时联网核实'), false);
    let attempts = 0;
    globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: ++attempts === 1 ? '{truncated' : JSON.stringify(report) } }] }) });
    response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
    globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'PRIVATE_UPSTREAM_ERROR' });
    response = await POST(request());
    assert.equal(response.status, 502);
    assert.equal((await response.text()).includes('PRIVATE_UPSTREAM_ERROR'), false);
    globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(report) } }] }) });
    response = await POST(request());
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /未能完整生成/);
    globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...report, risk_analysis: { top_risks: 'wrong' } }) } }] }) });
    response = await POST(request());
    assert.equal(response.status, 502);
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: {}, stdio: "pipe" });
});
