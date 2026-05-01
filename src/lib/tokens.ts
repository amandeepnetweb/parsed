// Approximate tokenisation — 1 token ≈ 4 English characters.
// Accurate enough for context-window budget checks without a heavy tokeniser dependency.
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Filters an ordered list of matches down to those that fit within a token budget.
 * Preserves order — best matches (already ranked) are kept, later ones dropped if
 * the budget is exceeded.
 */
export function trimToTokenLimit<T extends { content: string }>(
  matches: T[],
  maxTokens: number,
): T[] {
  let used = 0;
  return matches.filter((m) => {
    const t = estimateTokens(m.content);
    if (used + t > maxTokens) return false;
    used += t;
    return true;
  });
}
