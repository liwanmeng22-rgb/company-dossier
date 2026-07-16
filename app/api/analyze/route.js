import { buildPrompt } from "./prompt";
import { gatherSearchContext } from "./search";

export const runtime = "nodejs";

export async function POST(req) {
  const { companyName } = await req.json();

  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    return Response.json({ error: "请输入公司名称" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "服务端未配置 DEEPSEEK_API_KEY，请检查环境变量" },
      { status: 500 }
    );
  }

  const trimmedName = companyName.trim();

  // 第一步：联网检索最新信息（Tavily），检索失败不阻断，只是退化为无检索结果
  let searchResult;
  try {
    searchResult = await gatherSearchContext(trimmedName);
  } catch (err) {
    searchResult = {
      contextText: "",
      searched: false,
      note: `联网检索出现异常：${err.message}，本次报告未结合联网信息。`,
    };
  }

  // 第二步：把检索结果拼进prompt，调用DeepSeek生成结构化报告
  const prompt = buildPrompt(trimmedName, searchResult.contextText);

  let deepseekRes;
  try {
    deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content:
              "你是严谨的行业与公司分析师，只输出合法JSON，不输出任何JSON以外的文字。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
  } catch (err) {
    return Response.json(
      { error: `请求DeepSeek失败：${err.message}` },
      { status: 502 }
    );
  }

  if (!deepseekRes.ok) {
    const errText = await deepseekRes.text();
    return Response.json(
      { error: `DeepSeek接口返回错误（${deepseekRes.status}）：${errText}` },
      { status: 502 }
    );
  }

  const data = await deepseekRes.json();
  const rawContent = data?.choices?.[0]?.message?.content;

  if (!rawContent) {
    return Response.json(
      { error: "DeepSeek返回内容为空，请重试" },
      { status: 502 }
    );
  }

  let report;
  try {
    report = JSON.parse(rawContent);
  } catch (err) {
    return Response.json(
      {
        error: "返回内容不是合法JSON，请重试（模型偶尔会输出格式错误）",
        raw: rawContent,
      },
      { status: 502 }
    );
  }

  return Response.json({ report, searched: searchResult.searched });
}
