/**
 * AI Reconnaissance Detection Logger
 *
 * Logs API requests and detects autonomous AI scanning patterns.
 * Used by middleware to identify Mythos-class AI activity.
 */

import { classifyUserAgent } from './ua-class';

export interface RequestLog {
  timestamp: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  params: Record<string, string>;
  responseStatus: number;
}

// Request history for pattern detection (in-memory)
// For production: use Redis
const requestHistory: RequestLog[] = [];
const MAX_HISTORY = 10000;
const HISTORY_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Append a request log entry, capping history to MAX_HISTORY entries.
 */
export function logRequest(entry: RequestLog): void {
  requestHistory.push(entry);
  if (requestHistory.length > MAX_HISTORY) {
    requestHistory.splice(0, requestHistory.length - MAX_HISTORY);
  }
}

/**
 * Check if User-Agent indicates an AI/agent
 */
export function isAIUserAgent(userAgent: string, agentId?: string | null): boolean {
  const cls = classifyUserAgent(userAgent, { agentId });
  return cls === 'ai_crawler' || cls === 'declared_ai_client';
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