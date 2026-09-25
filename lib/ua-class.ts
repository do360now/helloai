/**
 * User-Agent classifier. Labels traffic; it does not prove intent.
 * "declared_ai_client" means the request NAMES an AI SDK/product (or sends
 * X-Agent-Id): still self-declared and spoofable. Generic HTTP clients are
 * "programmatic" and are never counted as agents.
 */
export type UaClass =
  | 'search_bot'
  | 'ai_crawler'
  | 'declared_ai_client'
  | 'programmatic'
  | 'browser'
  | 'tool'
  | 'empty';

const SEARCH_BOTS = [/googlebot/i, /bingbot/i, /duckduckbot/i, /baiduspider/i, /yandex(bot)?/i, /applebot/i];

const AI_CRAWLERS = [
  /gptbot/i, /chatgpt-user/i, /oai-searchbot/i, /claudebot/i, /claude-user/i, /anthropic-ai/i,
  /perplexitybot/i, /google-extended/i, /bytespider/i, /ccbot/i, /amazonbot/i,
];

const DECLARED_AI_CLIENTS = [
  /langchain/i, /llama-?index/i, /openai[-/ ]?python/i, /anthropic[-/ ]?(sdk|python)/i, /\bmcp\b/i, /ai-agent/i,
];

const PROGRAMMATIC = [
  /python-requests/i, /python-urllib/i, /aiohttp/i, /httpx/i, /axios/i, /node-fetch/i, /undici/i,
  /go-http-client/i, /okhttp/i, /java\//i, /apache-httpclient/i, /libwww-perl/i,
];

const any = (list: RegExp[], ua: string) => list.some((re) => re.test(ua));

export function classifyUserAgent(ua: string, opts: { agentId?: string | null } = {}): UaClass {
  if (!ua.trim()) return 'empty';
  // Crawlers send "Mozilla/5.0 (compatible; ...)", so check them before "browser".
  if (any(SEARCH_BOTS, ua)) return 'search_bot';
  if (any(AI_CRAWLERS, ua)) return 'ai_crawler';
  if (opts.agentId || any(DECLARED_AI_CLIENTS, ua)) return 'declared_ai_client';
  if (/Mozilla\//.test(ua) && /(Chrome|Safari|Firefox|Edg)/.test(ua)) return 'browser';
  if (any(PROGRAMMATIC, ua)) return 'programmatic';
  // curl, wget, httpie, Postman and anything unrecognised.
  return 'tool';
}
