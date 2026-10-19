import { fetchTextWithTimeout } from './request.js';
export function calculateMarket(result, now=Date.now()) {
  const meta=result?.meta;
  if(!meta || meta.instrumentType!=='EQUITY' || !meta.currency) throw Error('Invalid instrument');
  const closes=result.indicators?.quote?.[0]?.close || [];
  const points=(result.timestamp||[]).map((t,i)=>({time:t,close:closes[i]})).filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.close)&&p.close>0&&p.time*1000<=now);
  // Exclude the unfinished current session; do not label an intraday quote as a closing price.
  const regular=meta.currentTradingPeriod?.regular;
  const completed=points.filter(p=>!regular || p.time<regular.start || now>=regular.end*1000);
  if(completed.length<2) throw Error('Insufficient history');
  const values=completed.map(p=>p.close);const latest=values.at(-1);
  let peak=values[0], drawdown=0;
  for(const p of values){peak=Math.max(peak,p);drawdown=Math.min(drawdown,(p/peak-1)*100);}
  const date=t=>new Intl.DateTimeFormat('sv-SE',{timeZone:meta.exchangeTimezoneName||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t*1000));
  return {status:'available',symbol:meta.symbol,name:meta.longName||meta.shortName||meta.symbol,exchange:meta.fullExchangeName||meta.exchangeName,currency:meta.currency,
    points:completed.map(p=>({date:date(p.time),close:p.close})),asOf:date(completed.at(-1).time),latest,
    changePct:(latest/values[0]-1)*100,maxDrawdownPct:drawdown,ma20:values.length>=20?values.slice(-20).reduce((a,b)=>a+b,0)/20:null,
    stale:(now-completed.at(-1).time*1000)>7*86400000,
    sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(meta.symbol)}/history/`,retrievedAt:new Date(now).toISOString()};
}
export async function getMarket(investment, sources, fetchImpl=fetch) {
  const unavailable=reason=>({status:'unavailable',reason});
  if(investment.status==='private') return {status:'not_listed',reason:'未确认该主体有公开交易股票，不生成股价走势。'};
  const symbol=investment.symbol.text.trim().toUpperCase();
  const source=sources.find(s=>s.id===investment.symbol.source_id);
  const base=symbol.split('.')[0];
  if(investment.status!=='listed'||!investment.symbol.citation_valid||!investment.exchange.citation_valid||!/^([A-Z][A-Z0-9-]{0,9}|\d{4,6})(\.(SZ|SS|HK|L|T))?$/.test(symbol)||!source?.content?.toUpperCase().includes(base)) return unavailable('股票主体或交易代码缺少可核查依据，暂不展示行情。');
  try {
    const {response,text}=await fetchTextWithTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`,{headers:{Accept:'application/json'}},7000,fetchImpl);
    if(!response.ok) return unavailable('行情服务暂时不可用，请稍后重新查询。');
    const result=JSON.parse(text).chart?.result?.[0];
    if(result?.meta?.symbol?.toUpperCase()!==symbol) return unavailable('返回的股票代码不匹配，已隐藏行情。');
    return calculateMarket(result);
  } catch { return unavailable('未取得有效历史行情；不使用模型猜测价格。'); }
}
