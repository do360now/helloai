import { classifyUserAgent } from '@/lib/ua-class';
import { isAIUserAgent } from '@/lib/request-logger';

describe('classifyUserAgent', () => {
  const cases: Array<[string, string, ReturnType<typeof classifyUserAgent>]> = [
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'search_bot'],
    ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'search_bot'],
    ['GPTBot (Mozilla prefix, not a browser)', 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)', 'ai_crawler'],
    ['ClaudeBot', 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', 'ai_crawler'],
    ['Chrome desktop', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'browser'],
    ['curl', 'curl/8.5.0', 'tool'],
    ['wget', 'Wget/1.21', 'tool'],
    ['empty', '', 'empty'],
    ['langchain', 'langchain/0.2 python', 'declared_ai_client'],
    ['openai-python', 'OpenAI/Python 1.30', 'declared_ai_client'],
    ['Anthropic JS SDK', 'Anthropic/JS 0.52.0', 'declared_ai_client'],
    ['OpenAI JS SDK', 'OpenAI/JS 4.60.0', 'declared_ai_client'],
    ['anthropic-sdk-python', 'anthropic-sdk-python/0.40', 'declared_ai_client'],
    ['Claude-SearchBot', 'Mozilla/5.0 (compatible; Claude-SearchBot/1.0)', 'ai_crawler'],
    ['Perplexity-User', 'Mozilla/5.0 (compatible; Perplexity-User/1.0)', 'ai_crawler'],
    ['meta-externalagent', 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)', 'ai_crawler'],
    ['MistralAI-User', 'Mozilla/5.0 (compatible; MistralAI-User/1.0)', 'ai_crawler'],
    ['DuckAssistBot', 'DuckAssistBot/1.2', 'ai_crawler'],
    ['Slack link preview', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'other_bot'],
    ['Twitterbot', 'Twitterbot/1.0', 'other_bot'],
    ['Facebook preview', 'facebookexternalhit/1.1', 'other_bot'],
    ['node-fetch', 'node-fetch/1.0', 'programmatic'],
    ['undici', 'undici/6.0', 'programmatic'],
    ['python-requests', 'python-requests/2.31.0', 'programmatic'],
    ['Go-http-client', 'Go-http-client/2.0', 'programmatic'],
  ];
  test.each(cases)('%s', (_name, ua, expected) => {
    expect(classifyUserAgent(ua)).toBe(expected);
  });

  it('marks a request with X-Agent-Id as declared_ai_client', () => {
    expect(classifyUserAgent('curl/8.5.0', { agentId: 'my-agent' })).toBe('declared_ai_client');
  });

  it('X-Agent-Id wins over an empty User-Agent', () => {
    expect(classifyUserAgent('', { agentId: 'my-agent' })).toBe('declared_ai_client');
  });

  it('never counts generic HTTP clients as declared AI clients', () => {
    for (const ua of ['node-fetch/1.0', 'undici/6', 'python-requests/2.31', 'axios/1.6']) {
      expect(classifyUserAgent(ua)).not.toBe('declared_ai_client');
    }
  });
});

describe('isAIUserAgent (alert)', () => {
  it('no longer fires on Googlebot or other search bots', () => {
    expect(isAIUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(false);
  });
  it('still fires on AI crawlers and declared AI clients', () => {
    expect(isAIUserAgent('Mozilla/5.0 (compatible; GPTBot/1.0)')).toBe(true);
    expect(isAIUserAgent('langchain/0.2')).toBe(true);
  });
});

describe('headless browsers', () => {
  it('are not counted as browsers', () => {
    expect(classifyUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/126.0 Safari/537.36')).toBe('other_bot');
  });
});
