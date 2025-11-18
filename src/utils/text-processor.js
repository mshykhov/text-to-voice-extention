export function cleanText(text) {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function findOriginalPosition(original, normalized, normalizedPos) {
  let origPos = 0;
  let normPos = 0;

  while (normPos < normalizedPos && origPos < original.length) {
    const origChar = original[origPos];
    const normChar = origChar.replace(/\s+/g, ' ').toLowerCase();

    if (normChar === normalized[normPos]) {
      normPos++;
    }

    origPos++;
  }

  return origPos;
}
