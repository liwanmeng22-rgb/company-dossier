const TAVILY_ENDPOINT = "https://api.tavily.com/search";

async function tavilySearch(apiKey, query, { topic = "general", maxResults = 4 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  let res;
  try {
    res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        query,
        search_depth: "basic",
        topic,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Tavily请求失败（${res.status}）：${await res.text()}`);
  }

  return res.json();
}

function formatResults(label, data) {
  const results = data?.results || [];
  if (!results.length) return `【${label}】未检索到相关结果。\n`;

  const lines = results
    .slice(0, 4)
    .map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   来源：${r.url}\n   摘要：${(r.content || "").slice(0, 220)}`
    )
    .join("\n");

  return `【${label}】\n${lines}\n`;
}

/**
 * 针对目标公司跑两组搜索：最新动态（新闻类）+ 行业与竞争格局（综合类），
 * 拼成一段文本作为DeepSeek生成报告时的联网上下文。
 * 任何一组搜索失败都不会中断整体流程，只是该部分退化为"无检索结果"。
 */
export async function gatherSearchContext(companyName) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      contextText: "",
      searched: false,
      note: "未配置TAVILY_API_KEY，本次报告未联网检索，完全基于模型训练知识生成。",
    };
  }

  const queries = [
    { label: "最新财报与新闻动态", query: `${companyName} 最新 财报 新闻 风险`, topic: "news" },
    { label: "行业与竞争格局", query: `${companyName} 行业 竞争对手 市场份额`, topic: "general" },
  ];

  const settled = await Promise.allSettled(
    queries.map((q) => tavilySearch(apiKey, q.query, { topic: q.topic }))
  );

  let contextText = "";
  let anySucceeded = false;

  settled.forEach((result, i) => {
    const label = queries[i].label;
    if (result.status === "fulfilled") {
      anySucceeded = true;
      contextText += formatResults(label, result.value) + "\n";
    } else {
      contextText += `【${label}】检索失败：${result.reason?.message || "未知错误"}\n\n`;
    }
  });

  return {
    contextText,
    searched: anySucceeded,
    note: anySucceeded
      ? "本次报告结合了联网检索到的最新信息，具体检索时间见各条目来源。"
      : "联网检索未返回有效结果，本次报告主要基于模型训练知识生成，请注意时效性。",
  };
}
