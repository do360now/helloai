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
  | 'other_bot'
  | 'programmatic'
  | 'browser'
  | 'tool'
  | 'empty';

const SEARCH_BOTS = [/googlebot/i, /bingbot/i, /duckduckbot/i, /baiduspider/i, /yandex(bot)?/i, /applebot/i];

const AI_CRAWLERS = [
  /gptbot/i, /chatgpt-user/i, /oai-searchbot/i, /claudebot/i, /claude-user/i, /anthropic-ai/i,
  /perplexitybot/i, /perplexity-user/i, /bytespider/i, /ccbot/i, /amazonbot/i,
  /claude-searchbot/i, /meta-external(agent|fetcher)/i, /mistralai-user/i, /duckassistbot/i, /cohere-ai/i, /diffbot/i,
];

// Link previews and other self-declared bots that are neither search nor AI crawlers.
// Kept separate so /go/ redirect requests from previews can be filtered out.
const OTHER_BOTS = [/headless/i, /bot\b/i, /crawler/i, /spider/i, /externalhit/i, /preview/i];

const DECLARED_AI_CLIENTS = [
  /^(anthropic|openai)\/(js|node|python|go|java|ruby)/i, /langchain/i, /llama-?index/i, /openai[-/ ]?python/i, /anthropic[-/ ]?(sdk|python)/i, /\bmcp\b/i, /ai-agent/i,
];

const PROGRAMMATIC = [
  /python-requests/i, /python-urllib/i, /aiohttp/i, /httpx/i, /axios/i, /node-fetch/i, /undici/i,
  /go-http-client/i, /okhttp/i, /java\//i, /apache-httpclient/i, /libwww-perl/i,
];

const any = (list: RegExp[], ua: string) => list.some((re) => re.test(ua));

export function classifyUserAgent(ua: string, opts: { agentId?: string | null } = {}): UaClass {
  if (opts.agentId) return 'declared_ai_client'; // self-declared even with an empty UA
  if (!ua.trim()) return 'empty';
  // Crawlers send "Mozilla/5.0 (compatible; ...)", so check them before "browser".
  if (any(SEARCH_BOTS, ua)) return 'search_bot';
  if (any(AI_CRAWLERS, ua)) return 'ai_crawler';
  if (any(DECLARED_AI_CLIENTS, ua)) return 'declared_ai_client';
  if (any(OTHER_BOTS, ua)) return 'other_bot';
  if (/Mozilla\//.test(ua) && /(Chrome|Safari|Firefox|Edg)/.test(ua)) return 'browser';
  if (any(PROGRAMMATIC, ua)) return 'programmatic';
  // curl, wget, httpie, Postman and anything unrecognised.
  return 'tool';
}
