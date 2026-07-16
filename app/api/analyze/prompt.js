export function buildPrompt(companyName, searchContext) {
  const hasSearch = searchContext && searchContext.trim().length > 0;

  const searchBlock = hasSearch
    ? `以下是联网检索到的关于「${companyName}」的最新公开信息，请优先参考其中的时效性内容
（如财务数据、近期新闻、行业动态），并在对应字段的confidence里合理判断：
如果某条数据能在下面的检索结果中找到明确支持，标注为"disclosed"（并可在note里注明来源类型，
如"据近期新闻报道"）；如果检索结果只能支撑一个大致方向、需要你结合行业常识推算，标注"estimated"；
如果检索结果完全没有覆盖到、只能依赖你自身训练知识推断，标注"inferred"。

——— 检索结果开始 ———
${searchContext}
——— 检索结果结束 ———

`
    : `注意：本次没有联网检索结果，你只能基于自己训练时学到的知识回答，请对所有数据更保守地
标注confidence（大概率应为"estimated"或"inferred"），并在meta.as_of_note里明确提醒用户
这份报告未经联网核实、可能存在明显的时效性滞后。

`;

  return `你是一名专业的行业与公司分析师。请对「${companyName}」进行结构化拆解分析，
严格按照下面的JSON Schema输出一个JSON对象，不要输出JSON以外的任何文字，
不要加代码块标记，不要加开头结尾的解释。

${searchBlock}规则：
1. 每一个具体数字/结论都必须在对应字段里带上 confidence 字段，取值只能是
   "disclosed"（已披露，有公开财报/公告支持，含检索结果中的近期报道）、
   "estimated"（行业估算，基于同业对标推算）、"inferred"（AI推测，缺乏直接依据）三者之一。
2. 如果某项数据完全不可得（如非上市公司无财报），value填null，并在
   note字段里说明数据未披露及建议的查证渠道。
3. 所有数值型字段尽量给区间而不是单一精确值（除非是disclosed级别）。
4. meta.as_of_note 里注明：本报告是否结合了联网检索信息，以及数据的大致时效性。
5. 输出必须是合法JSON，字段名与下方Schema完全一致，不能省略字段
   （数组可以为空数组，字符串可以为空字符串，但字段本身必须存在）。

Schema:
{
  "meta": {
    "company_name": "string",
    "analysis_date": "string",
    "as_of_note": "string"
  },
  "industry_positioning": {
    "analogy": { "text": "string", "confidence": "string" },
    "pest": {
      "political": { "text": "string", "confidence": "string" },
      "economic": { "text": "string", "confidence": "string" },
      "social": { "text": "string", "confidence": "string" },
      "technological": { "text": "string", "confidence": "string" }
    },
    "lifecycle_stage": {
      "stage": "初创期|成长期|成熟期|衰退期",
      "reasoning": "string",
      "confidence": "string"
    },
    "market_size": {
      "current_size": { "value": "string|null", "unit": "string", "confidence": "string" },
      "growth_rate": { "value": "string|null", "confidence": "string" },
      "forecast_3_5yr": { "value": "string|null", "confidence": "string" },
      "growth_drivers": ["string"]
    },
    "porters_five_forces": {
      "supplier_power": { "level": "高|中|低", "reasoning": "string" },
      "buyer_power": { "level": "高|中|低", "reasoning": "string" },
      "new_entrants": { "level": "高|中|低", "reasoning": "string" },
      "substitutes": { "level": "高|中|低", "reasoning": "string" },
      "industry_rivalry": { "level": "高|中|低", "reasoning": "string" }
    }
  },
  "business_model": {
    "core_product": {
      "description": "string",
      "advantages": ["string"],
      "disadvantages": ["string"]
    },
    "target_customers": {
      "segments": ["string"],
      "key_accounts": ["string"]
    },
    "revenue_model": {
      "revenue_streams": ["string"],
      "cost_structure": ["string"],
      "margin_trend": { "text": "string", "confidence": "string" }
    },
    "business_map": [
      {
        "business_line": "string",
        "sold_to": "string",
        "who_pays": "string",
        "revenue_share": { "value": "string|null", "confidence": "string" },
        "growth_trend": "string"
      }
    ],
    "largest_revenue_line": "string",
    "fastest_growing_line": "string"
  },
  "moat_analysis": {
    "real_moats": [
      { "name": "string", "strength": "强|中|弱", "reasoning": "string" }
    ],
    "fake_moats": [
      { "name": "string", "risk_note": "string" }
    ],
    "most_vulnerable_moat": { "name": "string", "reasoning": "string" },
    "qualitative_scores": {
      "customer_stickiness": { "level": "强|中|弱", "reasoning": "string" },
      "brand_trust": { "level": "强|中|弱", "reasoning": "string" },
      "ecosystem_partnership": { "level": "强|中|弱", "reasoning": "string" },
      "growth_speed": { "level": "强|中|弱", "reasoning": "string" }
    },
    "competitive_landscape": {
      "market_leaders": [
        { "name": "string", "market_share": "string|null", "confidence": "string" }
      ],
      "tier2_comparison": [
        { "name": "string", "gap_description": "string" }
      ]
    }
  },
  "risk_analysis": {
    "financial_health": {
      "balance_sheet": { "text": "string", "confidence": "string", "note": "string" },
      "cash_flow": { "text": "string", "confidence": "string", "note": "string" },
      "income_statement": { "text": "string", "confidence": "string", "note": "string" },
      "red_flags": ["string"]
    },
    "top_risks": [
      {
        "category": "资源瓶颈|收入质量|市场竞争",
        "description": "string",
        "probability": "高|中|低",
        "impact": "致命|严重|一般",
        "trigger_scenario": "string",
        "time_window": "string"
      }
    ],
    "governance_risk": {
      "management_background": "string",
      "ownership_structure": "string",
      "culture_efficiency": "string",
      "key_person_risk": "string"
    }
  },
  "verdict": {
    "biggest_advantage": "string",
    "biggest_challenge": "string",
    "summary": "string"
  }
}`;
}
