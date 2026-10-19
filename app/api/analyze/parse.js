// Strip only transport/presentation wrappers. Never synthesize missing values,
// brackets or quotes in a truncated report.
export function parseModelReport(content) {
  let text=content.replace(/^\uFEFF/,'').trim();
  if(text.startsWith('```')) text=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  return JSON.parse(text);
}
