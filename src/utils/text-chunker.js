const MIN_CHUNK_LENGTH = 10;
const DEFAULT_SENTENCES_PER_CHUNK = 3;
const MAX_CHUNK_LENGTH = 500;

export function chunkTextBySentences(text, options = {}) {
  const {
    minLength = MIN_CHUNK_LENGTH,
    defaultSentences = DEFAULT_SENTENCES_PER_CHUNK,
    maxLength = MAX_CHUNK_LENGTH
  } = options;

  const chunks = [];
  const positions = [];

  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) {
    return { chunks: [text], positions: [{ start: 0, end: text.length }] };
  }

  let currentChunk = '';
  let currentSentences = [];
  let chunkStartPos = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (currentSentences.length === 0) {
      chunkStartPos = text.indexOf(sentence, chunkStartPos);
    }

    currentSentences.push(sentence);
    const testChunk = currentSentences.join('');

    const shouldFinishChunk =
      currentSentences.length >= defaultSentences &&
      testChunk.trim().length >= minLength;

    const isLastSentence = i === sentences.length - 1;

    if (shouldFinishChunk || isLastSentence) {
      if (testChunk.trim().length > maxLength) {
        const adjusted = splitLongChunk(testChunk.trim(), maxLength);

        for (let j = 0; j < adjusted.length; j++) {
          const chunk = adjusted[j];
          chunks.push(chunk);
          const start = j === 0 ? chunkStartPos : chunkStartPos + currentChunk.length;
          positions.push({
            start,
            end: start + chunk.length
          });
          currentChunk += chunk;
        }
      } else {
        const chunk = testChunk.trim();
        chunks.push(chunk);
        positions.push({
          start: chunkStartPos,
          end: chunkStartPos + testChunk.length
        });
        currentChunk = testChunk;
      }

      chunkStartPos += currentChunk.length;
      currentSentences = [];
      currentChunk = '';
    }
  }

  if (currentSentences.length > 0) {
    const chunk = currentSentences.join('').trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
      positions.push({
        start: chunkStartPos,
        end: chunkStartPos + currentSentences.join('').length
      });
    }
  }

  if (chunks.length === 0) {
    return { chunks: [text], positions: [{ start: 0, end: text.length }] };
  }

  return { chunks, positions };
}

function splitIntoSentences(text) {
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const matches = text.match(sentenceRegex);

  if (!matches) {
    return [text];
  }

  return matches;
}

function splitLongChunk(chunk, maxLength) {
  const words = chunk.split(/(\s+)/);
  const result = [];
  let current = '';

  for (const word of words) {
    const test = current + word;

    if (test.length > maxLength && current.length > 0) {
      result.push(current.trim());
      current = word;
    } else {
      current = test;
    }
  }

  if (current.trim().length > 0) {
    result.push(current.trim());
  }

  return result.length > 0 ? result : [chunk];
}

export function findLogicalStart(text, position, maxLookback = 100) {
  if (position <= 0) return 0;

  const lookbackStart = Math.max(0, position - maxLookback);
  const searchText = text.substring(lookbackStart, position);

  const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  let lastSentenceEnd = -1;

  for (const ending of sentenceEndings) {
    const pos = searchText.lastIndexOf(ending);
    if (pos > lastSentenceEnd) {
      lastSentenceEnd = pos;
    }
  }

  if (lastSentenceEnd !== -1) {
    let actualPos = lookbackStart + lastSentenceEnd + 2;

    while (actualPos < text.length && /\s/.test(text[actualPos])) {
      actualPos++;
    }

    return Math.min(actualPos, text.length);
  }

  let wordStart = position;
  while (wordStart > 0 && /\S/.test(text[wordStart - 1])) {
    wordStart--;
  }

  return wordStart;
}
