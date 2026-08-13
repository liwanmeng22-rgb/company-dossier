import { buildPrompt } from "./prompt";
import { gatherSearchContext } from "./search";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message, status = 500) {
  return Response.json({ error: message }, { status });
}

function safeError(error) {
  if (error?.name === "AbortError") return "分析超时，请稍后重试";
  return error instanceof Error ? error.message : "未知错误";
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError("请求内容格式不正确", 400);
    }

    const companyName = body?.companyName;
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return jsonError("请输入公司名称", 400);
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) return jsonError("服务端未配置 DEEPSEEK_API_KEY，请检查环境变量");

    const trimmedName = companyName.trim().slice(0, 80);
    let searchResult = { contextText: "", searched: false };
    try {
      searchResult = await gatherSearchContext(trimmedName);
    } catch (error) {
      console.warn("联网检索已跳过：", safeError(error));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    let deepseekRes;
    try {
      const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
      deepseekRes = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages: [
            { role: "system", content: "你是严谨的行业与公司分析师，只输出合法JSON，不输出JSON以外的文字。" },
            { role: "user", content: buildPrompt(trimmedName, searchResult.contextText) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 6000,
        }),
      });
    } catch (error) {
      return jsonError(`请求 DeepSeek 失败：${safeError(error)}`, error?.name === "AbortError" ? 504 : 502);
    } finally {
      clearTimeout(timer);
    }

    const responseText = await deepseekRes.text();
    if (!deepseekRes.ok) {
      let detail = responseText.slice(0, 300);
      try { detail = JSON.parse(responseText)?.error?.message || detail; } catch { /* keep text */ }
      return jsonError(`DeepSeek 接口返回错误（${deepseekRes.status}）：${detail || "无详细信息"}`, 502);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return jsonError("DeepSeek 返回了空内容或异常格式，请重试", 502);
    }

    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) return jsonError("DeepSeek 返回内容为空，请重试", 502);

    let report;
    try {
      report = JSON.parse(rawContent);
    } catch {
      return jsonError("报告格式不完整，请重新生成一次", 502);
    }

    return Response.json({ report, searched: searchResult.searched });
  } catch (error) {
    console.error("分析接口异常：", safeError(error));
    return jsonError(`服务器处理失败：${safeError(error)}`, 500);
  }
}
