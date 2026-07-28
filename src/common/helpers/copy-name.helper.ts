const COPY_MARKER = ' copy (';
const COPY_LEGACY = ' copy';

/** Only digits - no alternation or unbounded backtracking, safe from ReDoS */
function isOnlyDigits(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 48 || s.charCodeAt(i) > 57) return false;
  }
  return s.length > 0;
}

export function getNextCopyName(name: string | null | undefined): string {
  if (name == null || name === '') return ' copy (1)';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // Check for " copy (N)" at end (string-based, no regex)
  const lastCopyOpen = lower.lastIndexOf(COPY_MARKER.toLowerCase());
  if (lastCopyOpen !== -1) {
    const afterOpen = trimmed.slice(lastCopyOpen + COPY_MARKER.length);
    const closeParen = afterOpen.indexOf(')');
    if (closeParen !== -1) {
      const between = afterOpen.slice(0, closeParen).trim();
      const trailing = afterOpen.slice(closeParen + 1).trim();
      if (isOnlyDigits(between) && trailing === '') {
        const next = parseInt(between, 10) + 1;
        const base = trimmed.slice(0, lastCopyOpen).trim();
        return `${base} copy (${next})`;
      }
    }
  }

  // Legacy " copy" at end (no number)
  if (lower.endsWith(COPY_LEGACY)) {
    const base = trimmed.slice(0, trimmed.length - COPY_LEGACY.length).trim();
    return `${base} copy (1)`;
  }

  return `${trimmed} copy (1)`;
}
