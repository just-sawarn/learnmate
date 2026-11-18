export const MAX_PAGES = 40;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const TARGET_CHARS = 2400;

/** Merges the smallest neighbours until at most `limit` sections remain. */
function capSections(sections: string[], limit: number): string[] {
  const out = [...sections];
  while (out.length > limit) {
    let best = 0;
    let bestLen = Infinity;
    for (let i = 0; i < out.length - 1; i++) {
      const len = out[i].length + out[i + 1].length;
      if (len < bestLen) {
        bestLen = len;
        best = i;
      }
    }
    out.splice(best, 2, `${out[best]}\n\n${out[best + 1]}`);
  }
  return out;
}

/**
 * Splits pasted text into numbered sections that act as pages: on horizontal rules if present,
 * else on headings, else by length at paragraph boundaries. Never more than 20.
 */
export function splitPastedText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  let sections = normalized.split(/\n\s*(?:-{3,}|\*{3,}|_{3,})\s*\n/);
  if (sections.length < 2) sections = normalized.split(/\n(?=#{1,3} )/);
  if (sections.length < 2) {
    sections = [];
    let current = "";
    for (const paragraph of normalized.split(/\n{2,}/)) {
      if (current && current.length + paragraph.length > TARGET_CHARS) {
        sections.push(current);
        current = "";
      }
      current += (current ? "\n\n" : "") + paragraph;
    }
    if (current) sections.push(current);
  }
  return capSections(sections.map((s) => s.trim()).filter(Boolean), MAX_PAGES);
}
