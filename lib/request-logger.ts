/**
 * AI Reconnaissance Detection Logger
 *
 * Logs API requests and detects autonomous AI scanning patterns.
 * Used by middleware to identify Mythos-class AI activity.
 */

export interface RequestLog {
  timestamp: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  params: Record<string, string>;
  responseStatus: number;
}

// AI-related User-Agent patterns
const AI_PATTERNS = [
  /anthropic/i,
  /claude/i,
  /openai/i,
  /gpt/i,
  /google/i,
  /gemini/i,
  /meta/i,
  /ai21/i,
  /cohere/i,
  /mistral/i,
  /xai/i,
  /perplexity/i,
  /embedding/i,
  /bot/i,
  /crawler/i,
  /spider/i,
  /ai-agent/i,
  /langchain/i,
  /llama/i,
];

// Request history for pattern detection (in-memory)
// For production: use Redis
const requestHistory: RequestLog[] = [];
const MAX_HISTORY = 10000;
const HISTORY_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if User-Agent indicates an AI/agent
 */
export function isAIUserAgent(userAgent: string): boolean {
  return AI_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Detect anomalous access patterns
 * Returns true if the IP shows suspicious activity
 */
export function detectAnomalousPattern(ip: string): { isAnomalous: boolean; reason: string } {
  const now = Date.now();
  const windowStart = now - HISTORY_WINDOW_MS;

  const recentRequests = requestHistory.filter(
    (r) => r.ip === ip && new Date(r.timestamp).getTime() > windowStart
  );

  const requestCount = recentRequests.length;

  // High frequency: >20 requests/minute from single IP
  if (requestCount > 20) {
    return { isAnomalous: true, reason: `High frequency: ${requestCount}/min` };
  }

  // Check for sequential endpoint probing
  const endpoints = recentRequests.map((r) => r.endpoint);
  const uniqueEndpoints = new Set(endpoints);
  if (requestCount >= 5 && uniqueEndpoints.size >= 5) {
    return { isAnomalous: true, reason: 'Sequential endpoint probing' };
  }

  // Check for parameter fuzzing (same endpoint, varied params)
  const paramVariation = recentRequests.filter((r) => {
    const params = Object.keys(r.params).length;
    return params > 2;
  });
  if (paramVariation.length > 10) {
    return { isAnomalous: true, reason: 'Parameter fuzzing detected' };
  }

  return { isAnomalous: false, reason: '' };
}