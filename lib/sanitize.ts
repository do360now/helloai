export const MAX_TASK_LEN = 64;

// SOL-002 / SOL-005: input sanitization + cache-key safety.
//
// The raw `task` query param is reflected into JSON response bodies. While no
// client sink renders it unescaped today, reflecting unsanitized user input is
// a latent XSS / cache-poisoning chain. sanitizeTask() strips the scaffolding
// characters (angle brackets, quotes, ampersand, control chars) and caps
// length. Callers additionally mark parameterized responses
// `Cache-Control: private, no-store` so a poisoned URL can never be cached.
//
// Returns null when the input is absent or sanitizes to empty, so callers can
// treat "no useful task" uniformly (the no-task scoring path applies).
export function sanitizeTask(raw: string | null): string | null {
  if (raw === null) return null;
  const cleaned = raw
    .replace(/[<>"'&]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_TASK_LEN);
  return cleaned.length > 0 ? cleaned : null;
}
