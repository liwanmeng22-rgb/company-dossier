import { fetchTextWithTimeout } from "./request.js";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

function safeSource(result) {
  if (!result || typeof result.url !== "string") return null;
  try {
    const url = new URL(result.url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    return {
      title: typeof result.title === "string" ? result.title.slice(0, 200) : url.hostname,
      url: url.href,
      content: typeof result.content === "string" ? result.content.slice(0, 1800) : "",
      publishedAt: typeof result.published_date === "string" ? result.published_date : null,
    };
  } catch { return null; }
}

async function tavilySearch(apiKey, query, topic, fetchImpl) {
  const { response, text } = await fetchTextWithTimeout(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, topic, search_depth: "basic", max_results: 4,
      include_answer: false, include_raw_content: false }),
  }, 7000, fetchImpl);
  if (!response.ok) throw new Error("搜索服务暂时不可用");
  const data = JSON.parse(text);
  if (!Array.isArray(data?.results)) throw new Error("搜索结果格式异常");
  return data.results.slice(0, 4).map(safeSource).filter(Boolean);
}

// Options support deterministic tests without network calls or real credentials.
export async function gatherSearchContext(companyName, options = {}) {
  const apiKey = options.apiKey ?? process.env.TAVILY_API_KEY;
  if (!apiKey?.trim()) return { contextText: "", searched: false, sources: [],
    note: "本次未启用联网检索，报告基于模型已有知识，需核查时效性。" };
  const years = [1,2,3].map(offset=>new Date().getUTCFullYear()-offset).join(' ');
  const queries = [
    { label: "年度财务与现金流", query: `${companyName} 年报 最近三年 营业收入 归母净利润 经营现金流 ${years}`, topic: "general" },
    { label: "上市主体与集团关系", query: `${companyName} 股票代码 交易所 母公司 子公司 品牌 官网`, topic: "general" },
    { label: "可比公司", query: `${companyName} 竞争对手 产品 客户 对比`, topic: "general" },
    { label: "最新财报与新闻动态", query: `${companyName} 最新 财报 新闻 风险`, topic: "news" },
    { label: "公司主体、产品与商业模式", query: `${companyName} 官网 主营产品 客户 商业模式 收入`, topic: "general" },
    { label: "本土与海外业务", query: `${companyName} 年报 国内 本土 海外 业务 地区 渠道 international markets`, topic: "general" },
  ];
  const settled = await Promise.allSettled(queries.map(q =>
    tavilySearch(apiKey.trim(), q.query, q.topic, options.fetchImpl)));
  const sources = [];
  const seen = new Set();
  const blocks = [];
  settled.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const unique = result.value.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      source.id = `S${sources.length + 1}`;
      sources.push({ ...source, retrievedAt: new Date().toISOString() });
      return true;
    });
    if (unique.length) blocks.push(`【${queries[index].label}】\n${unique.map(source =>
      `编号：${source.id}\n标题：${source.title}\n来源：${source.url}\n发布日期：${source.publishedAt || '未提供'}\n摘要：${source.content}`).join("\n\n")}`);
  });
  const searched = sources.length > 0;
  const failed = settled.filter(result => result.status === "rejected").length;
  return { contextText: blocks.join("\n\n"), searched, sources,
    note: searched
      ? `${failed ? "部分检索失败；" : ""}已取得 ${sources.length} 条搜索来源；来源相关性与报告结论仍需逐项核查。`
      : failed === queries.length
        ? "联网检索暂时失败，报告基于模型已有知识，需核查时效性。"
        : "联网检索未取得有效来源，报告基于模型已有知识，需核查时效性。" };
}
